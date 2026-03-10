"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { useSelector } from "react-redux";

export function useQuotationState() {
  // `loading` here is the auth loading state — managed automatically by Redux/auth slice.
  // We never touch it manually; it reflects whether Firebase auth is still resolving.
  const { user, loading } = useSelector((state) => state.auth);

  // ─── Core data ───────────────────────────────────────────────────────────
  const [quotations, setQuotations] = useState([]);
  const [isFetchingQuotations, setIsFetchingQuotations] = useState(false);
  const [allHotels, setAllHotels] = useState([]);
  const [AllDestinations, setAllDestinations] = useState([]);
  const [transportStates, setTransportStates] = useState([]);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ─── Edit modal state ─────────────────────────────────────────────────────
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFirstEdit, setisFirstEdit] = useState(true);

  // ─── View modal state ─────────────────────────────────────────────────────
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState(null);

  // ─── Add‑hotel state ──────────────────────────────────────────────────────
  const [selectedHotelToAdd, setSelectedHotelToAdd] = useState("");
  const [SelectedDestination, setSelectedDestination] = useState("");

  // ─── Transport state ──────────────────────────────────────────────────────
  const [toggleValue, setToggleValue] = useState(false);
  const [selectedTransportStateId, setSelectedTransportStateId] = useState("");
  const [
    availableTransportPackagesForSelectedState,
    setAvailableTransportPackagesForSelectedState,
  ] = useState([]);

  // ─── Activity state ───────────────────────────────────────────────────────
  const [availableActivities, setAvailableActivities] = useState([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);
  const [selectedActivityToAdd, setSelectedActivityToAdd] = useState("");

  // ─── Save-as modal state ──────────────────────────────────────────────────
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  // ─── Markup mode ─────────────────────────────────────────────────────────
  const [markupMode, setMarkupMode] = useState("amount"); // "amount" | "percentage"

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .replace(/-/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const displayMessageBox = (message, type) => {
    const messageBox = document.createElement("div");
    messageBox.className = `message-box ${type}`;
    messageBox.textContent = message;
    document.body.appendChild(messageBox);
    setTimeout(() => {
      if (document.body.contains(messageBox)) document.body.removeChild(messageBox);
    }, 3000);
  };

  const formatPdfDate = (dateData) => {
    if (!dateData) return "N/A";
    const date = dateData.seconds
      ? new Date(dateData.seconds * 1000)
      : new Date(dateData);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDestinationOfpkg = useCallback((Quote) => {
    let resultString = "";
    if (
      !Quote ||
      !Array.isArray(Quote.hotelSummary) ||
      Quote.hotelSummary.length === 0
    ) {
      if (Quote?.transportSummary?.state) {
        return `${Quote.transportSummary.state} (Transport) \n`;
      }
      if (Array.isArray(Quote?.activitySummary) && Quote.activitySummary.length > 0) {
        const activityStatesCitiesMap = new Map();
        Quote.activitySummary.forEach((activity) => {
          const state = activity.state;
          const city = activity.city;
          if (state && city) {
            if (!activityStatesCitiesMap.has(state))
              activityStatesCitiesMap.set(state, new Set());
            activityStatesCitiesMap.get(state).add(city);
          }
        });
        let activityDestinations = "";
        activityStatesCitiesMap.forEach((citiesSet, stateName) => {
          const citiesList = Array.from(citiesSet).sort().join(", ");
          activityDestinations += `${stateName} (${citiesList}) \n`;
        });
        return activityDestinations.trim() || "N/A";
      }
      return "N/A";
    }
    const stateCityMap = new Map();
    Quote.hotelSummary.forEach((hotel) => {
      const stateName = hotel.state;
      const cityName = hotel.city;
      if (stateName && cityName) {
        if (!stateCityMap.has(stateName)) stateCityMap.set(stateName, new Set());
        stateCityMap.get(stateName).add(cityName);
      }
    });
    stateCityMap.forEach((citiesSet, stateName) => {
      const citiesList = Array.from(citiesSet).sort().join(", ");
      resultString += `${stateName} (${citiesList}) \n`;
    });
    return resultString;
  }, []);

  // ─── Price calculations ───────────────────────────────────────────────────
  const calculateHotelPrice = useCallback((hotelEntry, fullHotelData) => {
    if (!hotelEntry || !fullHotelData) return 0;
    const {
      checkInDate,
      selectedRoomCategory,
      selectedMealPlan,
      numDouble,
      numExtraAdult,
      numExtraChild,
      numCNB,
      nights = 1,
    } = hotelEntry;

    const roomData = fullHotelData.rooms?.find(
      (r) => r.categoryName === selectedRoomCategory,
    );
    if (!roomData || !Array.isArray(roomData.seasons)) return 0;

    const checkInDateObj = checkInDate?.seconds
      ? new Date(checkInDate.seconds * 1000)
      : new Date(checkInDate);
    if (isNaN(checkInDateObj.getTime())) return 0;
    checkInDateObj.setHours(0, 0, 0, 0);

    const applicableSeason = roomData.seasons.find((season) => {
      const start = new Date(season.start);
      const end = new Date(season.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return checkInDateObj >= start && checkInDateObj <= end;
    });

    if (!applicableSeason?.pricing || !selectedMealPlan) return 0;
    const pricing = applicableSeason.pricing[selectedMealPlan.toLowerCase()];
    if (!pricing) return 0;

    const doublePrice = (pricing.double || 0) * (numDouble || 0);
    const adultPrice = (pricing.extraAdult || 0) * (numExtraAdult || 0);
    const childPrice = (pricing.extraChild || 0) * (numExtraChild || 0);
    const cnbPrice = (pricing.cnb || 0) * (numCNB || 0);
    return (doublePrice + adultPrice + childPrice + cnbPrice) * nights;
  }, []);

  const recalculateGrandTotal = useCallback((data) => {
    const hotelTotal = data.hotelSummary?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0) || 0;
    let transportTotal = 0;
    if (data.transportSummary) {
      if (data.transportSummary.pricingType === "perKm") {
        transportTotal =
          (data.transportSummary.kms || 0) * (data.transportSummary.perKmprice || 0);
      } else {
        transportTotal = data.transportSummary.price || 0;
      }
    }
    const activityTotal =
      data.activitySummary?.reduce((sum, a) => sum + (a.totalPrice || 0), 0) || 0;
    const markup = data.markup || 0;
    return hotelTotal + transportTotal + activityTotal + markup;
  }, []);

  const getAvailableMealPlans = useCallback(
    (hotelSummaryEntry) => {
      if (!allHotels.length) return ["EP", "CP", "MAP", "AP"];
      const fullHotelData = allHotels.find(
        (h) =>
          h.name === hotelSummaryEntry.hotel &&
          h.city === hotelSummaryEntry.city &&
          h.state === hotelSummaryEntry.state,
      );
      if (!fullHotelData || !Array.isArray(fullHotelData.rooms)) return ["EP", "CP", "MAP", "AP"];
      const roomCategoryData = fullHotelData.rooms.find(
        (r) => r.categoryName === hotelSummaryEntry.selectedRoomCategory,
      );
      if (!roomCategoryData || !Array.isArray(roomCategoryData.seasons))
        return ["EP", "CP", "MAP", "AP"];
      const checkInDateStr = hotelSummaryEntry.checkInDate;
      if (!checkInDateStr) return ["EP", "CP", "MAP", "AP"];
      const checkInDateObj = checkInDateStr.seconds
        ? new Date(checkInDateStr.seconds * 1000)
        : new Date(checkInDateStr);
      if (isNaN(checkInDateObj.getTime())) return ["EP", "CP", "MAP", "AP"];
      checkInDateObj.setHours(0, 0, 0, 0);
      const applicableSeason = roomCategoryData.seasons.find((season) => {
        const start = new Date(season.start);
        const end = new Date(season.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return checkInDateObj >= start && checkInDateObj <= end;
      });
      if (!applicableSeason?.pricing) return ["EP", "CP", "MAP", "AP"];
      const mealPlanOptions = [];
      ["EP", "CP", "MAP", "AP"].forEach((plan) => {
        const pricing = applicableSeason.pricing[plan.toLowerCase()];
        if (
          pricing &&
          (pricing.double > 0 || pricing.extraAdult > 0 || pricing.extraChild > 0 || pricing.cnb > 0)
        ) {
          mealPlanOptions.push(plan);
        }
      });
      return mealPlanOptions.length > 0 ? mealPlanOptions : ["EP"];
    },
    [allHotels],
  );

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    const agentId = user?.uid;
    if (!agentId) return;
    setIsFetchingQuotations(true);
    try {
      const packagesRef = collection(db, "saved_packages_by_agents", agentId, "packages");
      const q = query(packagesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const total = snapshot.docs.length;
      const list = snapshot.docs
        .map((d, idx) => ({ id: d.id, quoteNumber: total - idx, ...d.data() }))
        .filter((qt) => qt.packageName !== null);
      setQuotations(list);
    } catch (err) {
      console.error("Error fetching quotations:", err);
    } finally {
      setIsFetchingQuotations(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    const fetchAllHotels = async () => {
      try {
        const snap = await getDocs(collection(db, "hotels"));
        setAllHotels(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    const fetchAllTransportStates = async () => {
      try {
        const snap = await getDocs(collection(db, "transport"));
        setTransportStates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    const fetchAllDestinations = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        setAllDestinations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    fetchAllHotels();
    fetchAllTransportStates();
    fetchAllDestinations();
  }, []);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  // Activities & transport packages based on edit modal context
  useEffect(() => {
    if (!isEditModalOpen || !editingQuotation) {
      setAvailableActivities([]);
      setSelectedTransportStateId("");
      setAvailableTransportPackagesForSelectedState([]);
      return;
    }
    if (isFirstEdit) {
      if (editingQuotation?.transportSummary?.state) {
        setSelectedTransportStateId(editingQuotation.transportSummary.state);
        setToggleValue(editingQuotation.transportSummary.isCustom || false);
      } else {
        setSelectedTransportStateId("");
        setToggleValue(false);
      }
      setisFirstEdit(false);
    }
    const currentActivityState = SelectedDestination;
    if (currentActivityState && currentActivityState !== "N/A") {
      const fetchActivities = async () => {
        setIsFetchingActivities(true);
        try {
          const q = query(collection(db, "activities"), where("state", "==", currentActivityState));
          const snap = await getDocs(q);
          setAvailableActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (err) { console.error(err); }
        finally { setIsFetchingActivities(false); }
      };
      fetchActivities();
    } else {
      setAvailableActivities([]);
    }
    if (selectedTransportStateId) {
      const fetchTransportPackages = async () => {
        try {
          const ref = collection(db, "transport", selectedTransportStateId, "packages");
          const snap = await getDocs(ref);
          setAvailableTransportPackagesForSelectedState(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        } catch (err) {
          console.error(err);
          setAvailableTransportPackagesForSelectedState([]);
        }
      };
      fetchTransportPackages();
    } else {
      setAvailableTransportPackagesForSelectedState([]);
    }
  }, [isEditModalOpen, editingQuotation, SelectedDestination, selectedTransportStateId, isFirstEdit]);

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const quotationDate = q.createdAt?.seconds ? new Date(q.createdAt.seconds * 1000) : null;
      const packageDestination = getDestinationOfpkg(q);
      const matchesSearch =
        searchTerm.toLowerCase() === "" ||
        q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `quote ${q.quoteNumber}`.includes(searchTerm.toLowerCase()) ||
        q.packageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        packageDestination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStartDate = !startDate || (quotationDate && quotationDate >= new Date(startDate));
      const matchesEndDate = !endDate || (quotationDate && quotationDate <= new Date(endDate));
      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  }, [quotations, searchTerm, startDate, endDate, getDestinationOfpkg]);

  // ─── Event handlers ───────────────────────────────────────────────────────
  const handleViewClick = (quotation) => {
    setViewingQuotation(quotation);
    setIsViewModalOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditClick = (quotation) => {
    const deepCopy = JSON.parse(JSON.stringify(quotation));
    setEditingQuotation(deepCopy);
    setIsEditModalOpen(true);
    setisFirstEdit(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (deepCopy.hotelSummary?.length > 0) {
      setSelectedDestination(deepCopy.hotelSummary[0].state);
    } else {
      setSelectedDestination("");
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuotation((prev) => ({ ...prev, [name]: value }));
  };

  // Markup: supports both "amount" and "percentage"
  const handleMarkupInputChange = (value, mode, baseTotal) => {
    setEditingQuotation((prev) => {
      let newMarkup = 0;
      if (mode === "percentage") {
        const pct = parseFloat(value) || 0;
        // base = hotelTotal + transportTotal + activityTotal (before markup)
        newMarkup = (baseTotal * pct) / 100;
      } else {
        newMarkup = parseFloat(value) || 0;
      }
      const updatedQuotation = { ...prev, markup: newMarkup, markupValue: parseFloat(value) || 0 };
      return { ...updatedQuotation, grandTotal: recalculateGrandTotal(updatedQuotation) };
    });
  };

  const handleToggle = () => {
    setToggleValue((prev) => {
      const newToggleValue = !prev;
      setEditingQuotation((prevQuot) => {
        const newTransportSummary = { ...prevQuot.transportSummary };
        if (newToggleValue) {
          newTransportSummary.isCustom = true;
          newTransportSummary.packageName = "";
          newTransportSummary.id = "";
          newTransportSummary.vehicles = [];
          newTransportSummary.selectedVehicle = null;
          newTransportSummary.pricingType = "fixed";
          newTransportSummary.price = 0;
          newTransportSummary.perKmprice = 0;
          newTransportSummary.ac = false;
          newTransportSummary.totalPrice = 0;
        } else {
          newTransportSummary.isCustom = false;
        }
        const updated = { ...prevQuot, transportSummary: newTransportSummary };
        return { ...updated, grandTotal: recalculateGrandTotal(updated) };
      });
      return newToggleValue;
    });
  };
const handleTransportSummaryChange = (field, value) => {
  setEditingQuotation((prev) => {
    const updatedTransport = {
      ...prev.transportSummary,
      [field]: value,
    };

    const total =
      (updatedTransport.vehicleCost || 0) +
      (updatedTransport.driverAllowance || 0) +
      (updatedTransport.tollCharges || 0) +
      (updatedTransport.permitCharges || 0) +
      (updatedTransport.otherCharges || 0);

    updatedTransport.totalTransportCost = total;

    const updated = {
      ...prev,
      transportSummary: updatedTransport,
    };

    return {
      ...updated,
      grandTotal: recalculateGrandTotal(updated),
    };
  });
};

  const handlePackageChange = (e) => {
    const newPackageId = e.target.value;
    const newPackage = availableTransportPackagesForSelectedState.find((p) => p.id === newPackageId);
    if (!newPackage?.vehicles?.length) {
      alert("Selected package is invalid or has no vehicles.");
      return;
    }
    const newVehicle = newPackage.vehicles[0];
    setEditingQuotation((prev) => {
      const updatedTransport = {
        ...prev.transportSummary,
        id: newPackage.id,
        packageName: newPackage.name || "Unnamed Package",
        pricingType: newPackage.pricingType,
        vehicles: newPackage.vehicles,
        isCustom: false,
        selectedVehicle: newVehicle,
        vehicleName: newVehicle.type,
        price: newVehicle.price ?? 0,
        perKmprice: newVehicle.perKmprice ?? 0,
        ac: newVehicle.ac ?? false,
        totalPrice: newVehicle.price ?? newVehicle.perKmprice ?? 0,
        state: selectedTransportStateId,
        pickupLocation: prev.transportSummary?.pickupLocation ?? null,
        dropLocation: prev.transportSummary?.dropLocation ?? null,
        days: prev.transportSummary?.days ?? null,
        kms: prev.transportSummary?.kms ?? null,
      };
      const updated = { ...prev, transportSummary: updatedTransport };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleVehicleChange = (newVehicle) => {
    setEditingQuotation((prev) => {
      const updatedTransport = {
        ...prev.transportSummary,
        selectedVehicle: newVehicle,
        vehicleName: newVehicle.type,
        price: newVehicle.price ?? 0,
        perKmprice: newVehicle.perKmprice ?? 0,
        ac: newVehicle.ac ?? false,
        totalPrice: newVehicle.price ?? newVehicle.perKmprice ?? 0,
      };
      const updated = { ...prev, transportSummary: updatedTransport };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  // Hotels
  const handleAddHotel = () => {
    if (!selectedHotelToAdd) { alert("Please select a hotel to add."); return; }
    const newHotelData = allHotels.find((h) => h.id === selectedHotelToAdd);
    if (!newHotelData) return;
    const isAlreadyAdded = editingQuotation.hotelSummary.some((h) => h.hotel === newHotelData.name);
    if (isAlreadyAdded) { alert(`${newHotelData.name} is already in the quotation.`); return; }

    const newHotelEntry = {
      hotel: newHotelData.name,
      city: newHotelData.city,
      state: newHotelData.state,
      nights: 1,
      numDouble: 1,
      numExtraAdult: 0,
      numExtraChild: 0,
      numCNB: 0,
      checkInDate: new Date().toISOString().split("T")[0],
      selectedRoomCategory: newHotelData.rooms[0]?.categoryName || "",
      selectedMealPlan: "EP",
      hotelTotal: 0,
      isCustom: false,
    };
    newHotelEntry.hotelTotal = calculateHotelPrice(newHotelEntry, newHotelData);
    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary, newHotelEntry];
      const updated = {
        ...prev,
        hotelSummary: updatedSummary,
        hotelTotal: updatedSummary.reduce((s, h) => s + (h.hotelTotal || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
    setSelectedHotelToAdd("");
  };

  // Compute per-night price for a custom hotel from its stored pricing table.
  // Mirrors calculateHotelPrice but uses the flat pricing object instead of seasons.
  const calcCustomHotelNightPrice = useCallback((pricing, plan, entry) => {
    if (!pricing || !plan) return 0;
    const p = pricing[plan.toLowerCase()];
    if (!p) return 0;
    return (
      (p.double || 0) * (entry.numDouble || 0) +
      (p.extraAdult || 0) * (entry.numExtraAdult || 0) +
      (p.extraChild || 0) * (entry.numExtraChild || 0) +
      (p.cnb || 0) * (entry.numCNB || 0)
    );
  }, []);

  const handleAddCustomHotel = (customHotelData) => {
    // hotelTotal is already pre-calculated in the form and passed in,
    // but we recalculate here from the pricing table to be consistent.
    const nightPrice = calcCustomHotelNightPrice(
      customHotelData.pricing,
      customHotelData.selectedMealPlan,
      customHotelData,
    );
    const newHotelEntry = {
      ...customHotelData,
      isCustom: true,
      hotelTotal: nightPrice * (parseInt(customHotelData.nights) || 1),
    };

    setEditingQuotation((prev) => {
      const updatedSummary = [...(prev.hotelSummary || []), newHotelEntry];
      const updated = {
        ...prev,
        hotelSummary: updatedSummary,
        hotelTotal: updatedSummary.reduce((s, h) => s + (h.hotelTotal || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleRemoveHotel = (indexToRemove) => {
    if (editingQuotation.hotelSummary.length <= 1) {
      alert("A quotation must have at least one hotel.");
      return;
    }
    setEditingQuotation((prev) => {
      const updatedSummary = prev.hotelSummary.filter((_, i) => i !== indexToRemove);
      const updated = {
        ...prev,
        hotelSummary: updatedSummary,
        hotelTotal: updatedSummary.reduce((s, h) => s + (h.hotelTotal || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleHotelChange = (indexToUpdate, newHotelId) => {
    const newHotelData = allHotels.find((h) => h.id === newHotelId);
    if (!newHotelData) return;
    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary];
      const oldEntry = updatedSummary[indexToUpdate];
      const newEntry = {
        ...oldEntry,
        hotel: newHotelData.name,
        city: newHotelData.city,
        state: newHotelData.state,
        selectedRoomCategory: newHotelData.rooms[0]?.categoryName || "",
        selectedMealPlan: "EP",
        numDouble: 1,
        numExtraAdult: 0,
        numExtraChild: 0,
        numCNB: 0,
        isCustom: false,
      };
      newEntry.hotelTotal = calculateHotelPrice(newEntry, newHotelData);
      updatedSummary[indexToUpdate] = newEntry;
      const updated = {
        ...prev,
        hotelSummary: updatedSummary,
        hotelTotal: updatedSummary.reduce((s, h) => s + (h.hotelTotal || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleHotelSummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      const updatedSummary = JSON.parse(JSON.stringify(prev.hotelSummary));
      const isNumeric = ["nights", "numDouble", "numExtraAdult", "numExtraChild", "numCNB", "pricePerNight"].includes(name);
      updatedSummary[index][name] = isNumeric ? parseFloat(value) || 0 : value;

      if (name === "nights" || name === "checkInDate") {
        for (let i = index; i < updatedSummary.length; i++) {
          const current = updatedSummary[i];
          let checkInDate;
          if (i === index) {
            const raw = current.checkInDate;
            checkInDate = raw?.seconds ? new Date(raw.seconds * 1000) : new Date(raw);
          } else {
            checkInDate = new Date(updatedSummary[i - 1].checkOutDate);
            updatedSummary[i].checkInDate = checkInDate.toISOString().split("T")[0];
          }
          const nights = parseInt(current.nights, 10) || 1;
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + nights);
          updatedSummary[i].checkOutDate = checkOutDate.toISOString().split("T")[0];
        }
      }

      if (name === "selectedRoomCategory") {
        const entry = updatedSummary[index];
        const currentHotelData = allHotels.find(
          (h) => h.name === entry.hotel && h.city === entry.city,
        );
        if (currentHotelData) {
          const availablePlans = getAvailableMealPlans(entry);
          if (!availablePlans.includes(entry.selectedMealPlan)) {
            entry.selectedMealPlan = availablePlans[0] || "EP";
          }
        }
      }

      // Recalculate prices:
      // - Custom hotels: use stored pricing table × guest counts × nights
      // - DB hotels: use calculateHotelPrice (season-based)
      const finalSummary = updatedSummary.map((entry) => {
        if (entry.isCustom) {
          const nightPrice = calcCustomHotelNightPrice(
            entry.pricing,
            entry.selectedMealPlan,
            entry,
          );
          return {
            ...entry,
            hotelTotal: nightPrice * (parseInt(entry.nights) || 1),
          };
        }
        const fullHotelData = allHotels.find(
          (h) => h.name === entry.hotel && h.city === entry.city && h.state === entry.state,
        );
        return {
          ...entry,
          hotelTotal: fullHotelData ? calculateHotelPrice(entry, fullHotelData) : 0,
        };
      });

      const updated = { ...prev, hotelSummary: finalSummary };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  // Activities
  const handleAddActivity = () => {
    if (!selectedActivityToAdd) { alert("Please select an activity to add."); return; }
    let isAlreadyAdded = false;
    try {
      isAlreadyAdded = editingQuotation.activitySummary?.some(
        (a) => a.name === selectedActivityToAdd,
      );
    } catch { isAlreadyAdded = false; }
    if (isAlreadyAdded) { alert("This activity is already in the quotation."); return; }

    const activityData = availableActivities.find((a) => a.name === selectedActivityToAdd);
    if (!activityData) return;

    const newActivity = {
      name: activityData.name,
      city: activityData.city,
      state: activityData.state,
      fitRatePerPerson: activityData.fitRatePerPerson || 0,
      groupRatePerPerson: activityData.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: parseFloat(activityData.fitRatePerPerson || activityData.groupRatePerPerson || 0),
      isCustom: false,
    };
    setEditingQuotation((prev) => {
      const updatedSummary = [...(prev.activitySummary || []), newActivity];
      const updated = {
        ...prev,
        activitySummary: updatedSummary,
        activityTotal: updatedSummary.reduce((s, a) => s + (a.totalPrice || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
    setSelectedActivityToAdd("");
  };

  const handleAddCustomActivity = (customActivityData) => {
    const newActivity = {
      ...customActivityData,
      isCustom: true,
      totalPrice:
        (parseFloat(customActivityData.pricePerPerson) || 0) *
        (parseInt(customActivityData.participants) || 1),
    };
    setEditingQuotation((prev) => {
      const updatedSummary = [...(prev.activitySummary || []), newActivity];
      const updated = {
        ...prev,
        activitySummary: updatedSummary,
        activityTotal: updatedSummary.reduce((s, a) => s + (a.totalPrice || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleRemoveActivity = (indexToRemove) => {
    setEditingQuotation((prev) => {
      const updatedSummary = prev.activitySummary.filter((_, i) => i !== indexToRemove);
      const updated = {
        ...prev,
        activitySummary: updatedSummary,
        activityTotal: updatedSummary.reduce((s, a) => s + (a.totalPrice || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  const handleActivitySummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.activitySummary];
      const act = { ...updatedSummary[index] };
      if (name === "participants") {
        const participants = parseInt(value, 10) || 0;
        act.participants = participants;
        const rate = act.isCustom
          ? act.pricePerPerson || 0
          : participants > 10
          ? act.groupRatePerPerson
          : act.fitRatePerPerson;
        act.totalPrice = rate * participants;
        if (act.isCustom) act.pricePerPerson = act.pricePerPerson || 0;
      } else if (name === "pricePerPerson") {
        act.pricePerPerson = parseFloat(value) || 0;
        act.totalPrice = act.pricePerPerson * (act.participants || 1);
      } else {
        act[name] = value;
      }
      updatedSummary[index] = act;
      const updated = {
        ...prev,
        activitySummary: updatedSummary,
        activityTotal: updatedSummary.reduce((s, a) => s + (a.totalPrice || 0), 0),
      };
      return { ...updated, grandTotal: recalculateGrandTotal(updated) };
    });
  };

  // CRUD
  const handleUpdateQuotation = async () => {
    if (!editingQuotation) { alert("No quotation selected."); return; }
    const agentId = user?.uid;
    if (!agentId) { alert("Must be logged in."); return; }
    const ref = doc(db, "saved_packages_by_agents", agentId, "packages", editingQuotation.id);
    try {
      await updateDoc(ref, editingQuotation);
      alert("Quotation updated successfully! ✅");
      setIsEditModalOpen(false);
      fetchQuotations();
    } catch (err) {
      console.error(err);
      alert("Failed to update quotation.");
    }
  };

  const handleDeleteQuotation = async (quotationId) => {
    const agentId = user?.uid;
    if (!agentId) { alert("Not authenticated."); return; }
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await deleteDoc(doc(db, "saved_packages_by_agents", agentId, "packages", quotationId));
        alert("Quotation deleted successfully!");
        fetchQuotations();
      } catch (err) {
        alert("Failed to delete quotation.");
        console.error(err);
      }
    }
  };

  const handleSaveAs = () => {
    if (!editingQuotation) { alert("No active quotation."); return; }
    setNewPackageName(`Copy of ${editingQuotation.packageName}`);
    setNewCustomerName(`Copy of ${editingQuotation.customerName}`);
    setShowSaveAsModal(true);
    setIsEditModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmSaveAs = async () => {
    if (!newPackageName.trim()) { alert("Quotation name is required."); return; }
    if (!newCustomerName.trim()) { alert("Customer name is required."); return; }
    const agentId = user?.uid;
    if (!agentId) { alert("Must be logged in."); return; }
    const newData = { ...editingQuotation };
    delete newData.id;
    newData.packageName = newPackageName.trim();
    newData.customerName = newCustomerName.trim();
    newData.createdAt = new Date();
    try {
      const ref = collection(db, "saved_packages_by_agents", agentId, "packages");
      await addDoc(ref, newData);
      alert("New quotation saved! ✅");
      setIsEditModalOpen(false);
      setShowSaveAsModal(false);
      fetchQuotations();
    } catch (err) {
      console.error(err);
      alert("Failed to save new quotation.");
    }
  };

  const generatePackageSummary = useCallback(
    (quotationData) => {
      if (!quotationData.hotelSummary?.length) return "Hotel details not available.";
      const firstEntry = quotationData.hotelSummary[0];
      const formatDate = (dateData) => {
        const date = dateData?.seconds ? new Date(dateData.seconds * 1000) : new Date(dateData);
        return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      };
      const startDate = formatDate(firstEntry.checkInDate);
      let summary = `Dear Guests,\n\nGreetings from Adwait Tours!!\n`;
      summary += `Kindly find the best possible rates for your requirement starting ${startDate}\n`;
      summary += `${firstEntry.numDouble || 0} Couple\n`;
      summary += `${firstEntry.numExtraChild || 0} Extra Child With Matress\n`;
      summary += `${firstEntry.numExtraAdult || 0} Extra Adult With Matress\n`;
      if (Number(firstEntry.numCNB) > 0) summary += `${firstEntry.numCNB || 0} Child No Bed\n`;
      summary += `\n *HOTELS*\n`;
      quotationData.hotelSummary.forEach((entry, index) => {
        const hotelFullDetails = allHotels.find(
          (h) => h.name === entry.hotel && h.city === entry.city && h.state === entry.state,
        );
        const hotelCheckIn = formatDate(entry.checkInDate);
        const hotelCheckOut = formatDate(entry.checkOutDate);
        const mealPlan = entry.selectedMealPlan?.toUpperCase() || "MEAL PLAN";
        const mealPlanDescriptions = {
          EP: "Accommodation only",
          CP: "Breakfast Only",
          MAP: "Breakfast and Dinner",
          AP: "Breakfast, Lunch and Dinner",
        };
        const roomCategory = entry.selectedRoomCategory?.toUpperCase() || "ROOM CATEGORY NOT SELECTED";
        summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${hotelFullDetails?.GoogleListingURL || ""}\n`;
        summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
        summary += ` ⇒ Hotel Room Count: ${entry.numDouble || 0} Hotel Room Category: ${roomCategory}\n`;
        summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${entry.nights} Nights, ${mealPlanDescriptions[mealPlan]})\n\n`;
      });
      summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal?.toFixed()}/-*\n\n`;
      summary += `*INCLUDED*\n`;
      let totalBreakfasts = 0, totalLunches = 0, totalDinners = 0;
      quotationData.hotelSummary.forEach((hotel) => {
        switch (hotel.selectedMealPlan) {
          case "CP": totalBreakfasts += hotel.nights; break;
          case "MAP": totalBreakfasts += hotel.nights; totalDinners += hotel.nights; break;
          case "AP": totalBreakfasts += hotel.nights; totalLunches += hotel.nights; totalDinners += hotel.nights; break;
        }
      });
      if (totalBreakfasts > 0) summary += `✅ ${totalBreakfasts} Breakfast(s)\n`;
      if (totalLunches > 0) summary += `✅ ${totalLunches} Lunch(es)\n`;
      if (totalDinners > 0) summary += `✅ ${totalDinners} Dinner(s)\n`;
      if (!totalBreakfasts && !totalLunches && !totalDinners)
        summary += `✅ No meals included (EP Plan for all hotels or unspecified)\n`;
      if (quotationData.transportSummary?.vehicleName) {
        const v = quotationData.transportSummary;
        summary += `✅ ${v.vehicleName || v.type} ${v.ac ? "AC" : "Non AC"} for all sightseeing and transfer as per itinerary\n`;
        summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
      }
      quotationData.activitySummary?.forEach((activity) => {
        summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${activity.participants} Person\n`;
      });
      summary += `\n*EXCLUDED*\n`;
      summary += `❌ Train / Flight Fare\n`;
      summary += `❌ Early check in and late check out as per hotel policy\n`;
      summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
      summary += `❌ Anything not mentioned in included\n`;
      return summary;
    },
    [allHotels],
  );

  const handleCopyToClipboard = (quotationToCopy) => {
    if (!quotationToCopy) { displayMessageBox("No quotation data provided.", "error"); return; }
    const summary = generatePackageSummary(quotationToCopy);
    const textarea = document.createElement("textarea");
    textarea.value = summary;
    textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(textarea);
    try {
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const ok = document.execCommand("copy");
      if (!ok && navigator.clipboard) {
        navigator.clipboard.writeText(summary)
          .then(() => displayMessageBox("Package summary copied to clipboard!", "success"))
          .catch((err) => displayMessageBox("Failed to copy: " + err, "error"));
        return;
      }
      if (ok) displayMessageBox("Package summary copied to clipboard!", "success");
      else displayMessageBox("Failed to copy to clipboard.", "error");
    } catch (err) {
      displayMessageBox("Error copying: " + err, "error");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return {
    // Data
    quotations, allHotels, AllDestinations, transportStates, filteredQuotations,
    // Loading — `loading` is auth-only (read-only, managed by Firebase/Redux auth slice).
    // `isFetchingQuotations` is the local data-fetch indicator for this hook.
    loading, isFetchingQuotations,
    // Filter state
    searchTerm, setSearchTerm, filterDestination, setFilterDestination,
    startDate, setStartDate, endDate, setEndDate,
    // View modal
    isViewModalOpen, setIsViewModalOpen, viewingQuotation,
    // Edit modal
    isEditModalOpen, setIsEditModalOpen, editingQuotation,
    // Hotel
    selectedHotelToAdd, setSelectedHotelToAdd, SelectedDestination, setSelectedDestination,
    // Transport
    toggleValue, selectedTransportStateId, setSelectedTransportStateId,
    availableTransportPackagesForSelectedState,
    // Activities
    availableActivities, isFetchingActivities, selectedActivityToAdd, setSelectedActivityToAdd,
    // Save-as
    showSaveAsModal, setShowSaveAsModal, newPackageName, setNewPackageName,
    newCustomerName, setNewCustomerName,
    // Markup
    markupMode, setMarkupMode,
    // Computed
    recalculateGrandTotal,
    getAvailableMealPlans,
    getDestinationOfpkg,
    toTitleCase,
    calcCustomHotelNightPrice,
    // Handlers
    handleViewClick, handleEditClick, handleEditChange, handleMarkupInputChange,
    handleToggle, handleTransportSummaryChange, handlePackageChange, handleVehicleChange,
    handleAddHotel, handleAddCustomHotel, handleRemoveHotel, handleHotelChange, handleHotelSummaryChange,
    handleAddActivity, handleAddCustomActivity, handleRemoveActivity, handleActivitySummaryChange,
    handleUpdateQuotation, handleDeleteQuotation,
    handleSaveAs, handleConfirmSaveAs,
    handleCopyToClipboard,
  };
}