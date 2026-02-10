"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/firebase/config";
import {
  collection,getDocs,query,where, orderBy, doc, deleteDoc, updateDoc, addDoc,
} from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useDispatch, useSelector } from "react-redux";
import { setLoading } from "@/store/authSlice";
import "@/app/globals.css";
import QuotationsTable from "./QuotationsTable";
import { useSearchParams , searchParams} from "next/navigation";
import QuotationModals from "./QuotationModals";
const MyQuotations = () => {
  // --- 1. STATE HOOKS ---
  const [quotations, setQuotations] = useState([]);
  const [isFirstEdit, setisFirstEdit] = useState(true);
  const [allHotels, setAllHotels] = useState([]);
  const [toggleValue, setToggleValue] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [selectedHotelToAdd, setSelectedHotelToAdd] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user, loading } = useSelector((state) => state.auth);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);
  const [selectedActivityToAdd, setSelectedActivityToAdd] = useState("");
  const dispatch = useDispatch();
  const [AllDestinations, setAllDestinations] = useState([]);
  const [SelectedDestination, setSelectedDestination] = useState("");
  const [transportStates, setTransportStates] = useState([]);
  const [selectedTransportStateId, setSelectedTransportStateId] = useState("");
  const [availableTransportPackagesForSelectedState, setAvailableTransportPackagesForSelectedState] = useState([]);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
const searchParams = useSearchParams();
const editId = searchParams.get("editId");
  // --- 2. HELPER FUNCTIONS ---
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

  const getDestinationOfpkg = (Quote) => {
    let resultString = "";
    if (!Quote || !Array.isArray(Quote.hotelSummary) || Quote.hotelSummary.length === 0) {
      if (Quote?.transportSummary?.state) {
        return `${Quote.transportSummary.state} (Transport) \n`;
      }
      if (Array.isArray(Quote?.activitySummary) && Quote.activitySummary.length > 0) {
        const activityStatesCitiesMap = new Map();
        Quote.activitySummary.forEach((activity) => {
          const state = activity.state;
          const city = activity.city;
          if (state && city) {
            if (!activityStatesCitiesMap.has(state)) {
              activityStatesCitiesMap.set(state, new Set());
            }
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
        if (!stateCityMap.has(stateName)) {
          stateCityMap.set(stateName, new Set());
        }
        stateCityMap.get(stateName).add(cityName);
      }
    });
    stateCityMap.forEach((citiesSet, stateName) => {
      const citiesList = Array.from(citiesSet).sort().join(", ");
      resultString += `${stateName} (${citiesList}) \n`;
    });
    return resultString;
  };
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
      if (document.body.contains(messageBox)) {
        document.body.removeChild(messageBox);
      }
    }, 3000);
  };
  // --- 3. useCallback and useMemo Hooks ---
  const getAvailableMealPlans = useCallback(
    (hotelSummaryEntry) => {
      if (!allHotels.length) return ["EP", "CP", "MAP", "AP"];

      const fullHotelData = allHotels.find(
        (h) =>
          h.name === hotelSummaryEntry.hotel &&
          h.city === hotelSummaryEntry.city &&
          h.state === hotelSummaryEntry.state
      );

      if (!fullHotelData || !Array.isArray(fullHotelData.rooms))
        return ["EP", "CP", "MAP", "AP"];

      const roomCategoryData = fullHotelData.rooms.find(
        (r) => r.categoryName === hotelSummaryEntry.selectedRoomCategory
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

      if (!applicableSeason || !applicableSeason.pricing)
        return ["EP", "CP", "MAP", "AP"];

      const mealPlanOptions = [];
      ["EP", "CP", "MAP", "AP"].forEach((plan) => {
        const planKey = plan.toLowerCase();
        const pricing = applicableSeason.pricing[planKey];
        if (
          pricing &&
          (pricing.double > 0 ||
            pricing.extraAdult > 0 ||
            pricing.extraChild > 0 ||
            pricing.cnb > 0)
        ) {
          mealPlanOptions.push(plan);
        }
      });
      return mealPlanOptions.length > 0 ? mealPlanOptions : ["EP"];
    },
    [allHotels]
  );

  const fetchQuotations = useCallback(async () => {
    const agentId = user?.uid;
    if (!agentId) {
      dispatch(setLoading(false));
      return;
    }

    try {
      const packagesRef = collection(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages"
      );
      const q = query(packagesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const totalQuotations = snapshot.docs.length;

      const list = snapshot.docs
        .map((doc, index) => ({
          id: doc.id,
          quoteNumber: totalQuotations - index,
          ...doc.data(),
        }))
        .filter((quotation) => quotation.packageName !== null);

      setQuotations(list);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      dispatch(setLoading(false));
    }
  }, [user?.uid, dispatch]);

  const getDestination = useCallback(() => {
    return SelectedDestination;
  }, [SelectedDestination]);

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

    const roomData = fullHotelData.rooms.find(
      (r) => r.categoryName === selectedRoomCategory
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

    if (!applicableSeason || !applicableSeason.pricing || !selectedMealPlan)
      return 0;

    const pricing = applicableSeason.pricing[selectedMealPlan.toLowerCase()];
    if (!pricing) {
      console.warn(
        `No pricing found for meal plan ${selectedMealPlan} in season for room category ${selectedRoomCategory}`
      );
      return 0;
    }

    const doublePrice = (pricing.double || 0) * (numDouble || 0);
    const adultPrice = (pricing.extraAdult || 0) * (numExtraAdult || 0);
    const childPrice = (pricing.extraChild || 0) * (numExtraChild || 0);
    const cnbPrice = (pricing.cnb || 0) * (numCNB || 0);

    return (doublePrice + adultPrice + childPrice + cnbPrice) * nights;
  }, []);

  const recalculateGrandTotal = useCallback((data) => {
    let hotelTotal =
      data.hotelSummary?.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      ) || 0;
    let transportTotal = 0;

    if (data.transportSummary) {
      if (data.transportSummary.pricingType === "perKm") {
        let kms = data.transportSummary?.kms || 0;
        transportTotal = kms * (data.transportSummary.perKmprice || 0);
      } else {
        transportTotal = data.transportSummary?.price || 0;
      }
    }
    const activityTotal =
      data.activitySummary?.reduce(
        (sum, act) => sum + (act.totalPrice || 0),
        0
      ) || 0;
    const markup = data.markup || 0;
    return hotelTotal + transportTotal + activityTotal + markup;
  }, []);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const quotationDate = q.createdAt?.seconds
        ? new Date(q.createdAt.seconds * 1000)
        : null;

      const matchesSearch =
        searchTerm.toLowerCase() === "" ||
        q.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `quote ${q.quoteNumber}`.includes(searchTerm.toLowerCase()) ||
        q.packageName?.toLowerCase().includes(searchTerm.toLowerCase());

      const packageDestination = getDestinationOfpkg(q);
      const matchesDestination =
        filterDestination === "" ||
        packageDestination.includes(filterDestination);

      const matchesStartDate =
        !startDate || (quotationDate && quotationDate >= new Date(startDate));
      const matchesEndDate =
        !endDate || (quotationDate && quotationDate <= new Date(endDate));

      return (
        matchesSearch &&
        matchesDestination &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [quotations, searchTerm, filterDestination, startDate, endDate, getDestinationOfpkg]);

  const generatePackageSummary = (quotationData) => {
    if (quotationData.hotelSummary.length === 0)
      return "Hotel details not available.";

    const firstEntry = quotationData.hotelSummary[0];
    const formatDate = (dateData) => {
      const date = dateData.seconds
        ? new Date(dateData.seconds * 1000)
        : new Date(dateData);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const startDate = formatDate(firstEntry.checkInDate);

    let summary = "";
    summary += `Dear Guests,\n\n`;
    summary += `Greetings from Adwait Tours!!\n`;
    summary += `Kindly find the best possible rates for your requirement starting ${startDate}\n`;
    summary += `${firstEntry.numDouble || 0} Couple\n`;
    summary += `${firstEntry.numExtraChild || 0} Extra Child With Matress\n`;
    summary += `${firstEntry.numExtraAdult || 0} Extra Adult With Matress\n`;
    if (Number(firstEntry.numCNB) > 0) {
      summary += `${firstEntry.numCNB || 0} Child No Bed\n`;
    }
    summary += `\n *HOTELS*\n`;
    
    quotationData.hotelSummary.forEach((entry, index) => {
      const hotelFullDetails = allHotels.find(
        (h) =>
          h.name === entry.hotel &&
          h.city === entry.city &&
          h.state === entry.state
      );

      const hotelCheckIn = formatDate(entry.checkInDate);
      const hotelCheckOut = formatDate(entry.checkOutDate);
      const hotelNights = entry.nights;
      const mealPlan = entry.selectedMealPlan?.toUpperCase() || "MEAL PLAN";
      const mealPlanDescriptions = {
        EP: "Accommodation only",
        CP: "Breakfast Only",
        MAP: "Breakfast and Dinner",
        AP: "Breakfast, Lunch and Dinner",
      };
      const roomCategory =
        entry.selectedRoomCategory?.toUpperCase() ||
        "ROOM CATEGORY NOT SELECTED";
      const roomCount = entry.numDouble || 0;

      summary += `${index + 1}. ${entry.hotel.toUpperCase()} ${
        hotelFullDetails?.GoogleListingURL || ""
      }\n`;
      summary += ` ⇒ ${entry.city}, ${entry.state}\n`;
      summary += ` ⇒ Hotel Room Count: ${roomCount} Hotel Room Category: ${roomCategory}\n`;
      summary += ` ⇒ ${hotelCheckIn} to ${hotelCheckOut} (${hotelNights} Nights, ${mealPlanDescriptions[mealPlan]})\n\n`;
    });

    const calculateTotalMeals = () => {
      let totalBreakfasts = 0;
      let totalLunches = 0;
      let totalDinners = 0;

      quotationData.hotelSummary.forEach((hotel) => {
        switch (hotel.selectedMealPlan) {
          case "CP":
            totalBreakfasts += hotel.nights;
            break;
          case "MAP":
            totalBreakfasts += hotel.nights;
            totalDinners += hotel.nights;
            break;
          case "AP":
            totalBreakfasts += hotel.nights;
            totalLunches += hotel.nights;
            totalDinners += hotel.nights;
            break;
          default:
            break;
        }
      });
      return { totalBreakfasts, totalLunches, totalDinners };
    };

    summary += `*TOTAL TOUR COST = ₹${quotationData.grandTotal.toFixed()}/-*\n\n`;
    summary += `*INCLUDED*\n`;
    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals();

    if (totalBreakfasts > 0) {
      summary += `✅ ${totalBreakfasts} Breakfast(s)\n`;
    }
    if (totalLunches > 0) {
      summary += `✅ ${totalLunches} Lunch(es)\n`;
    }
    if (totalDinners > 0) {
      summary += `✅ ${totalDinners} Dinner(s)\n`;
    }
    if (totalBreakfasts === 0 && totalLunches === 0 && totalDinners === 0) {
      summary += `✅ No meals included (EP Plan for all hotels or unspecified)\n`;
    }

    if (quotationData.transportSummary?.vehicleName) {
      const vehicle = quotationData.transportSummary;
      const acStatus = vehicle.ac ? "AC" : "Non AC";
      summary += `✅ ${
        vehicle.vehicleName || vehicle.type
      } ${acStatus} for all sightseeing and transfer as per itinerary\n`;
      summary += `✅ Toll, Parking, Driver Allowance, Permits\n`;
    }

    quotationData.activitySummary?.forEach((activity) => {
      summary += `✅ ${activity.name.toUpperCase()} (${activity.city}) - ${
        activity.participants
      } Person\n`;
    });

    summary += `\n*EXCLUDED*\n`;
    summary += `❌ Train / Flight Fare\n`;
    summary += `❌ Early check in and late check out as per hotel policy\n`;
    summary += `❌ Medical, Emergency, Entry Tickets, activities, expenses\n`;
    summary += `❌ Anything not mentioned in included\n`;

    return summary;
  };

  // --- 4. useEffect Hooks ---
  useEffect(() => {
    const fetchAllHotels = async () => {
      try {
        const hotelsSnapshot = await getDocs(collection(db, "hotels"));
        const hotelsList = hotelsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllHotels(hotelsList);
      } catch (error) {
        console.error("Error fetching all hotels:", error);
      }
    };

    const fetchAllTransportStates = async () => {
      try {
        const statesSnapshot = await getDocs(collection(db, "transport"));
        const statesList = statesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransportStates(statesList);
      } catch (error) {
        console.error("Error fetching all transport states:", error);
      }
    };

    const fetchAllDestinations = async () => {
      try {
        const destinationsSnapshot = await getDocs(collection(db, "locations"));
        const destinationsList = destinationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllDestinations(destinationsList);
      } catch (error) {
        console.error("Error fetching all destinations:", error);
      }
    };

    fetchAllDestinations();
    fetchAllTransportStates();
    fetchAllHotels();
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);



    useEffect(() => {
  if (editId && quotations.length > 0) {
    const quoteToEdit = quotations.find(q => q.id === editId);
    if (quoteToEdit) {
      const deepCopy = JSON.parse(JSON.stringify(quoteToEdit));
      setEditingQuotation(deepCopy);
      setIsEditModalOpen(true);
    }
  }
}, [editId, quotations]);

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
          const q = query(
            collection(db, "activities"),
            where("state", "==", currentActivityState)
          );
          const snapshot = await getDocs(q);
          setAvailableActivities(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        } catch (error) {
          console.error("Error fetching activities:", error);
        } finally {
          setIsFetchingActivities(false);
        }
      };
      fetchActivities();
    } else {
      setAvailableActivities([]);
    }

    const fetchTransportPackages = async () => {
      if (selectedTransportStateId) {
        try {
          const transportPackagesRef = collection(
            db,
            "transport",
            selectedTransportStateId,
            "packages"
          );
          const snapshot = await getDocs(transportPackagesRef);
          const fetchedPackages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAvailableTransportPackagesForSelectedState(fetchedPackages);
        } catch (error) {
          console.error(
            `Error fetching transport packages for ${selectedTransportStateId}:`,
            error
          );
          setAvailableTransportPackagesForSelectedState([]);
        }
      } else {
        setAvailableTransportPackagesForSelectedState([]);
      }
    };

    fetchTransportPackages();
  }, [isEditModalOpen, editingQuotation, SelectedDestination, selectedTransportStateId, isFirstEdit]);

  // --- 5. Event Handlers ---
  const handleToggle = () => {
    setToggleValue((prev) => {
      const newToggleValue = !prev;

      setEditingQuotation((prevQuot) => {
        const newTransportSummary = { ...prevQuot.transportSummary };
        if (newToggleValue === true) {
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
        const updatedQuotation = {
          ...prevQuot,
          transportSummary: newTransportSummary,
        };
        const newGrandTotal = recalculateGrandTotal(updatedQuotation);
        return { ...updatedQuotation, grandTotal: newGrandTotal };
      });
      return newToggleValue;
    });
  };

  const handleViewClick = (quotation) => {
    setViewingQuotation(quotation);
    setIsViewModalOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditClick = async (quotation) => {
    const deepCopy = JSON.parse(JSON.stringify(quotation));
    setEditingQuotation(deepCopy);
    setIsEditModalOpen(true);
    setisFirstEdit(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (deepCopy.hotelSummary && deepCopy.hotelSummary.length > 0) {
      setSelectedDestination(deepCopy.hotelSummary[0].state);
    } else {
      setSelectedDestination("");
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuotation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMarkupInputChange = (value) => {
    setEditingQuotation((prev) => {
      const newMarkup = parseFloat(value) || 0;
      const updatedQuotation = { ...prev, markup: newMarkup };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return { ...updatedQuotation, grandTotal: newGrandTotal };
    });
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) {
      alert("No quotation selected for update.");
      return;
    }

    const agentId = user?.uid;
    if (!agentId) {
      alert("Error: You must be logged in to update a quotation.");
      return;
    }

    const quotationRef = doc(
      db,
      "saved_packages_by_agents",
      agentId,
      "packages",
      editingQuotation.id
    );

    try {
      await updateDoc(quotationRef, editingQuotation);
      alert("Quotation updated successfully! ✅");
      setIsEditModalOpen(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error updating quotation: ", error);
      alert("Failed to update quotation. Please check the console for errors.");
    }
  };

  const handleDownloadPDF = (quotation) => {
    if (!quotation || !quotation.hotelSummary || quotation.hotelSummary.length === 0) {
      alert("Cannot generate PDF: Quotation data is incomplete or has no hotels.");
      return;
    }

    const doc = new jsPDF();
    const BRAND_COLOR_BLUE = "#0D47A1";
    const HEADER_TEXT_COLOR = "#444444";
    const FONT_SIZE_NORMAL = 9;
    const FONT_SIZE_SMALL = 8;
    const pageContentWidth = 180;

    const img = new Image();
    img.src = "/adwait-logo.jpg";

    img.onload = () => {
      const addHeader = () => {
        const logoY = 10;
        const companyNameY = logoY + 8;
        const sloganY = companyNameY + 7;

        const logoWidth = 40;
        const logoHeight = (img.height * logoWidth) / img.width;
        doc.addImage(img, "PNG", 15, logoY, logoWidth, logoHeight);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(BRAND_COLOR_BLUE);
        doc.text("Adwait Tours", 60, companyNameY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Travel Package Quotation", 60, sloganY);

        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);

        const contactBlockX = 160;
        let contactLineY = logoY + 4;

        const phoneNumber = "+91 9884798483";
        const phoneLink = `tel:${phoneNumber.replace(/ /g, "")}`;
        const phoneLabel = "Phone: ";
        const phoneText = `${phoneLabel}${phoneNumber}`;

        const phoneTextWidth =
          (doc.getStringUnitWidth(phoneText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;
        const phoneTextHeight =
          (FONT_SIZE_SMALL / doc.internal.scaleFactor) * 1.15;

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "bold");
        doc.text(phoneLabel, contactBlockX, contactLineY, { align: "left" });

        doc.setTextColor(0, 0, 255);
        doc.setFont(undefined, "normal");
        doc.text(
          phoneNumber,
          contactBlockX +
            (doc.getStringUnitWidth(phoneLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );

        doc.link(
          contactBlockX,
          contactLineY - phoneTextHeight + 1,
          phoneTextWidth,
          phoneTextHeight,
          { url: phoneLink }
        );

        contactLineY += 5;
        const emailAddress = "sales@adwaittours.com";
        const emailLink = `mailto:${emailAddress}`;
        const emailLabel = "Email: ";
        const emailText = `${emailLabel}${emailAddress}`;
        const emailTextWidth =
          (doc.getStringUnitWidth(emailText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "bold");
        doc.text(emailLabel, contactBlockX, contactLineY, { align: "left" });

        doc.setTextColor(0, 0, 255);
        doc.setFont(undefined, "normal");
        doc.text(
          emailAddress,
          contactBlockX +
            (doc.getStringUnitWidth(emailLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );
        doc.link(
          contactBlockX - emailTextWidth,
          contactLineY - phoneTextHeight + 1,
          emailTextWidth,
          phoneTextHeight,
          { url: emailLink }
        );

        contactLineY += 5;
        const webAddress = "www.adwaittours.com";
        const webLink = `https://${webAddress}`;
        const webLabel = "Web: ";
        const webText = `${webLabel}${webAddress}`;
        const webTextWidth =
          (doc.getStringUnitWidth(webText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "bold");
        doc.text(webLabel, contactBlockX, contactLineY, { align: "left" });

        doc.setTextColor(0, 0, 255);
        doc.setFont(undefined, "normal");
        doc.text(
          webAddress,
          contactBlockX +
            (doc.getStringUnitWidth(webLabel) * FONT_SIZE_SMALL) /
              doc.internal.scaleFactor,
          contactLineY,
          { align: "left" }
        );
        doc.link(
          contactBlockX - webTextWidth,
          contactLineY - phoneTextHeight + 1,
          webTextWidth,
          phoneTextHeight,
          { url: webLink }
        );

        const finalHeaderBottomY =
          Math.max(logoY + logoHeight, sloganY, contactLineY) + 5;
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, finalHeaderBottomY, 200, finalHeaderBottomY);
      };

      const addFooter = () => {
        doc.setDrawColor("#CCCCCC");
        doc.setLineWidth(0.2);
        doc.line(15, 282, 200, 282);

        doc.setFontSize(FONT_SIZE_SMALL);
        doc.setTextColor(HEADER_TEXT_COLOR);
        doc.text("Thank you for choosing Adwait Tours!", 107, 287, {
          align: "center",
        });

        const linkY = 291;
        const googleLinkText = "For Reviews: Google Page";
        const instagramLinkText = "Follow Us: Instagram";
        const separator = " | ";

        const fullText = googleLinkText + separator + instagramLinkText;
        const fullWidth =
          (doc.getStringUnitWidth(fullText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        const startX = 107 - fullWidth / 2;

        const googleLinkWidth =
          (doc.getStringUnitWidth(googleLinkText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 255);
        doc.text(googleLinkText, startX, linkY);
        doc.setDrawColor(0, 0, 255);
        doc.setLineWidth(0.2);
        doc.line(startX, linkY + 1, startX + googleLinkWidth, linkY + 1);
        doc.link(
          startX,
          linkY - FONT_SIZE_SMALL,
          googleLinkWidth,
          FONT_SIZE_SMALL,
          {
            url: "https://share.google/gpnOuOQxhD49T77Yw",
          }
        );

        doc.setTextColor(HEADER_TEXT_COLOR);
        const sepX = startX + googleLinkWidth;
        doc.text(separator, sepX, linkY);

        const instagramLinkWidth =
          (doc.getStringUnitWidth(instagramLinkText) * FONT_SIZE_SMALL) /
          doc.internal.scaleFactor;

        const instaX =
          sepX +
          (doc.getStringUnitWidth(separator) * FONT_SIZE_SMALL) /
            doc.internal.scaleFactor;

        doc.setTextColor(0, 0, 255);
        doc.text(instagramLinkText, instaX, linkY);
        doc.setDrawColor(0, 0, 255);
        doc.line(instaX, linkY + 1, instaX + instagramLinkWidth, linkY + 1);
        doc.link(
          instaX,
          linkY - FONT_SIZE_SMALL,
          instagramLinkWidth,
          FONT_SIZE_SMALL,
          {
            url: "https://www.instagram.com/adwaittours?igsh=MW11cGRldWR4aGJxdQ==",
          }
        );

        doc.setTextColor(HEADER_TEXT_COLOR);
      };

      addHeader();
      let currentY = 32;
      currentY += 20;

      const firstHotel = quotation.hotelSummary[0];

      let travelStartDate = "";
      let travelEndDate = "";

      if (quotation.hotelSummary && quotation.hotelSummary.length > 0) {
        travelStartDate = formatPdfDate(quotation.hotelSummary[0].checkInDate);
        const lastHotel =
          quotation.hotelSummary[quotation.hotelSummary.length - 1];
        travelEndDate = formatPdfDate(lastHotel.checkOutDate);
      }
      
      autoTable(doc, {
        startY: currentY,
        body: [
          [
            "Customer Name:",
            quotation.customerName || "N/A",
            "Quotation Date:",
            formatPdfDate(new Date()),
          ],
          [
            "Travel Dates:",
            `${travelStartDate} - ${travelEndDate}`,
            "No. of Guests:",
            `${firstHotel.numDouble || 0} Couple(s), ${
              firstHotel.numExtraAdult || 0
            } Adult(s), ${firstHotel.numExtraChild || 0} Child(ren) with mattress${
              Number(firstHotel.numCNB) > 0 ? `, ${firstHotel.numCNB || 0} Child(ren) no bed` : ''
            }`,
            "",
            "",
          ],
          ["Destination:", getDestinationOfpkg(quotation)],
        ],
        theme: "plain",
        styles: { fontSize: FONT_SIZE_NORMAL },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 35 },
          1: { cellWidth: "auto" },
          2: { fontStyle: "bold", cellWidth: 35 },
          3: { cellWidth: "auto" },
        },
        margin: { left: 15, right: 15 },
      });
      currentY = doc.lastAutoTable.finalY;

      const MealPlans = {
        EP: "Accommodation only",
        CP: "Breakfast only",
        MAP: "Breakfast and Dinner",
        AP: "Breakfast, Lunch and Dinner",
      };

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Hotel Details", 15, currentY + 10);
      currentY += 12;

      autoTable(doc, {
        startY: currentY + 5,
        head: [
          ["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"],
        ],
        body: quotation.hotelSummary.map((h) => {
          const fullHotelData = allHotels.find(
            (hotel) =>
              hotel.name === h.hotel &&
              hotel.city === h.city &&
              hotel.state === h.state
          );
          return [
            { content: h.hotel, _fullData: fullHotelData },
            h.city,
            h.selectedRoomCategory,
            `${formatPdfDate(h.checkInDate)} - ${formatPdfDate(
              h.checkOutDate
            )}`,
            h.nights,
            MealPlans[h.selectedMealPlan] || h.selectedMealPlan,
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: BRAND_COLOR_BLUE },
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        columnStyles: {
          4: { halign: "center" },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              data.cell.styles.textColor = [0, 0, 255];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const fullHotelData = data.cell.raw?._fullData;
            if (fullHotelData && fullHotelData.GoogleListingURL) {
              doc.link(
                data.cell.x,
                data.cell.y,
                data.cell.width,
                data.cell.height,
                { url: fullHotelData.GoogleListingURL }
              );
            }
          }
        },
      });
      currentY = doc.lastAutoTable.finalY;

      const totalHotelCost = quotation.hotelSummary.reduce(
        (sum, h) => sum + (h.hotelTotal || 0),
        0
      );

      let totalTransportCost = 0;
      if (quotation.transportSummary) {
        if (quotation.transportSummary.pricingType === "perKm") {
          totalTransportCost =
            (quotation.transportSummary.perKmprice || 0) *
            (quotation.transportSummary.kms || 0);
        } else {
          totalTransportCost = quotation.transportSummary.price || 0;
        }
      }

      const totalActivityCost =
        quotation.activitySummary?.reduce(
          (sum, act) => sum + (act.totalPrice || 0),
          0
        ) || 0;
      const totalMarkup = quotation.markup || 0;
      const calculatedGrandTotal =
        totalHotelCost + totalTransportCost + totalActivityCost + totalMarkup;

      autoTable(doc, {
        startY: currentY + 10,
        body: [
          [
            {
              content: "Grand Total Tour Cost:",
              styles: {
                halign: "left",
                fontStyle: "bold",
                textColor: BRAND_COLOR_BLUE,
              },
            },
            {
              content: `Rs. ${calculatedGrandTotal.toLocaleString("en-IN", {
                maximumFractionDigits: 0,
              })}/-`,
              styles: {
                halign: "right",
                fontStyle: "bold",
                textColor: BRAND_COLOR_BLUE,
              },
            },
          ],
        ],
        theme: "grid",
        styles: { fontSize: FONT_SIZE_NORMAL + 2, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto" } },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
      });
      currentY = doc.lastAutoTable.finalY;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Inclusions & Exclusions", 15, currentY + 10);
      currentY += 12;

      const columnWidth = pageContentWidth / 2 - 5;

      const includedItems = ["• Hotel accommodation as specified."];

      let totalBreakfasts = 0;
      let totalLunches = 0;
      let totalDinners = 0;

      quotation.hotelSummary.forEach((hotel) => {
        const nights = parseInt(hotel.nights) || 1;

        switch (hotel.selectedMealPlan) {
          case "CP":
            totalBreakfasts = totalBreakfasts + nights;
            break;
          case "MAP":
            totalBreakfasts = totalBreakfasts + nights;
            totalDinners = totalDinners + nights;
            break;
          case "AP":
            totalBreakfasts = totalBreakfasts + nights;
            totalLunches = totalLunches + nights;
            totalDinners = totalDinners + nights;
            break;
          default:
            break;
        }
      });

      const mealItems = [];
      if (totalBreakfasts > 0) {
        mealItems.push(`${totalBreakfasts} Breakfast(s)`);
      }
      if (totalLunches > 0) {
        mealItems.push(`${totalLunches} Lunch(es)`);
      }
      if (totalDinners > 0) {
        mealItems.push(`${totalDinners} Dinner(s)`);
      }

      if (mealItems.length > 0) {
        includedItems.push(`• ${mealItems.join(", ")}`);
      }
      if (quotation.transportSummary?.vehicleName) {
        if (quotation.transportSummary?.ac) {
          includedItems.push(
            "• All transfers and sightseeing by private - " +
              quotation.transportSummary.vehicleName +
              " (AC) vehicle."
          );
        } else {
          includedItems.push(
            "• All transfers and sightseeing by private - " +
              quotation.transportSummary.vehicleName +
              " vehicle."
          );
        }
        if (quotation.activitySummary) {
          for (let i = 0; i < quotation.activitySummary.length; i++) {
            includedItems.push(
              "• " +
                quotation.activitySummary[i].name +
                " for  " +
                quotation.activitySummary[i].participants +
                " participants."
            );
          }
        }
        includedItems.push(
          "• Toll, parking fees, driver allowance, and permits."
        );
      }

      const excludedItems = [
        "• Train / Flight Fare.",
        "• Early check-in & late check-out as per hotel policy.",
        '• Any items not mentioned in the "Included" section.',
      ];

      const wrappedIncluded = includedItems.map((item) =>
        doc.splitTextToSize(item)
      );
      const wrappedExcluded = excludedItems.map((item) =>
        doc.splitTextToSize(item)
      );

      const body = [];
      const maxLength = Math.max(
        wrappedIncluded.length,
        wrappedExcluded.length
      );
      for (let i = 0; i < maxLength; i++) {
        body.push([wrappedIncluded[i] || "", wrappedExcluded[i] || ""]);
      }

      autoTable(doc, {
        startY: currentY + 5,
        head: [["INCLUDED", "EXCLUDED"]],
        body: body,
        headStyles: { fillColor: BRAND_COLOR_BLUE, halign: "center" },
        theme: "grid",
        styles: { fontSize: FONT_SIZE_NORMAL, cellPadding: 2 },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
          addHeader();
        },
      });
      currentY = doc.lastAutoTable.finalY;

      addFooter();
      doc.save(`Quotation-${quotation.customerName.replace(/ /g, "_")}.pdf`);
    };

    img.onerror = () =>
      alert("Failed to generate PDF: Could not load company logo.");
  };

  const handleAddHotel = () => {
    if (!selectedHotelToAdd) {
      alert("Please select a hotel to add.");
      return;
    }

    const newHotelData = allHotels.find((h) => h.id === selectedHotelToAdd);
    if (!newHotelData) return;

    const isAlreadyAdded = editingQuotation.hotelSummary.some(
      (h) => h.hotel === newHotelData.name
    );
    if (isAlreadyAdded) {
      alert(`${newHotelData.name} is already in the quotation.`);
      return;
    }

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
    };

    newHotelEntry.hotelTotal = calculateHotelPrice(newHotelEntry, newHotelData);

    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary, newHotelEntry];
      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );
      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });

    setSelectedHotelToAdd("");
  };

  const handleRemoveHotel = (indexToRemove) => {
    if (editingQuotation.hotelSummary.length <= 1) {
      alert("A quotation must have at least one hotel.");
      return;
    }

    setEditingQuotation((prev) => {
      const updatedSummary = prev.hotelSummary.filter(
        (_, index) => index !== indexToRemove
      );
      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );
      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });
  };

  const handleHotelSummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      const updatedSummary = JSON.parse(JSON.stringify(prev.hotelSummary));

      const isNumericField = [
        "nights",
        "numDouble",
        "numExtraAdult",
        "numExtraChild",
        "numCNB",
      ].includes(name);
      updatedSummary[index][name] = isNumericField
        ? parseInt(value, 10) || 0
        : value;

      if (name === "nights" || name === "checkInDate") {
        for (let i = index; i < updatedSummary.length; i++) {
          const currentEntry = updatedSummary[i];
          let checkInDate;

          if (i === index) {
            const rawCheckIn = currentEntry.checkInDate;
            checkInDate = rawCheckIn.seconds
              ? new Date(rawCheckIn.seconds * 1000)
              : new Date(rawCheckIn);
          } else {
            const prevCheckOutString = updatedSummary[i - 1].checkOutDate;
            checkInDate = new Date(prevCheckOutString);
            updatedSummary[i].checkInDate = checkInDate
              .toISOString()
              .split("T")[0];
          }

          const nights = parseInt(currentEntry.nights, 10) || 1;
          const checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + nights);

          updatedSummary[i].checkOutDate = checkOutDate
            .toISOString()
            .split("T")[0];
        }
      }

      if (name === "selectedRoomCategory") {
        const entryToUpdate = updatedSummary[index];
        const currentHotelData = allHotels.find(
          (h) => h.name === entryToUpdate.hotel && h.city === entryToUpdate.city
        );
        if (currentHotelData) {
          const availablePlans = getAvailableMealPlans(entryToUpdate);
          if (!availablePlans.includes(entryToUpdate.selectedMealPlan)) {
            entryToUpdate.selectedMealPlan = availablePlans[0] || "EP";
          }
        }
      }

      const finalSummaryWithPrices = updatedSummary.map((entry) => {
        const fullHotelData = allHotels.find(
          (h) =>
            h.name === entry.hotel &&
            h.city === entry.city &&
            h.state === entry.state
        );
        const newPrice = fullHotelData
          ? calculateHotelPrice(entry, fullHotelData)
          : 0;
        return { ...entry, hotelTotal: newPrice };
      });

      const updatedQuotation = {
        ...prev,
        hotelSummary: finalSummaryWithPrices,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return { ...updatedQuotation, grandTotal: newGrandTotal };
    });
  };

  const handleTransportSummaryChange = (name, value) => {
    setEditingQuotation((prev) => {
      const updatedTransportSummary = prev.transportSummary
        ? { ...prev.transportSummary }
        : {};
      updatedTransportSummary[name] = value;

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleHotelChange = (indexToUpdate, newHotelId) => {
    const newHotelData = allHotels.find((h) => h.id === newHotelId);
    if (!newHotelData) return;

    setEditingQuotation((prev) => {
      const updatedSummary = [...prev.hotelSummary];
      const oldHotelEntry = updatedSummary[indexToUpdate];

      const newHotelEntry = {
        ...oldHotelEntry,
        hotel: newHotelData.name,
        city: newHotelData.city,
        state: newHotelData.state,
        selectedRoomCategory: newHotelData.rooms[0]?.categoryName || "",
        selectedMealPlan: "EP",
        numDouble: 1,
        numExtraAdult: 0,
        numExtraChild: 0,
        numCNB: 0,
      };

      newHotelEntry.hotelTotal = calculateHotelPrice(
        newHotelEntry,
        newHotelData
      );
      updatedSummary[indexToUpdate] = newHotelEntry;

      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0
      );

      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
      };
    });
  };

  const handlePackageChange = (e) => {
    const newPackageId = e.target.value;
    const newPackage = availableTransportPackagesForSelectedState.find(
      (p) => p.id === newPackageId
    );

    if (
      !newPackage ||
      !newPackage.vehicles ||
      newPackage.vehicles.length === 0
    ) {
      alert("Selected package is invalid or has no vehicles.");
      return;
    }

    const newVehicle = newPackage.vehicles[0];

    setEditingQuotation((prev) => {
      const updatedTransportSummary = {
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
        pickupLocation: prev.transportSummary.pickupLocation ?? null,
        dropLocation: prev.transportSummary.dropLocation ?? null,
        days: prev.transportSummary.days ?? null,
        kms: prev.transportSummary.kms ?? null,
      };

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };

      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleVehicleChange = (newVehicle) => {
    setEditingQuotation((prev) => {
      const updatedTransportSummary = {
        ...prev.transportSummary,
        selectedVehicle: newVehicle,
        vehicleName: newVehicle.type,
        price: newVehicle.price ?? 0,
        perKmprice: newVehicle.perKmprice ?? 0,
        ac: newVehicle.ac ?? false,
        totalPrice: newVehicle.price ?? newVehicle.perKmprice ?? 0,
        state: prev.transportSummary.state ?? null,
        pickupLocation: prev.transportSummary.pickupLocation ?? null,
        dropLocation: prev.transportSummary.dropLocation ?? null,
        days: prev.transportSummary.days ?? null,
        kms: prev.transportSummary.kms ?? null,
      };

      const updatedQuotation = {
        ...prev,
        transportSummary: updatedTransportSummary,
      };

      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleActivitySummaryChange = (index, name, value) => {
    setEditingQuotation((prev) => {
      const updatedActivitySummary = [...prev.activitySummary];
      const activityToUpdate = { ...updatedActivitySummary[index] };

      if (name === "participants") {
        const participants = parseInt(value, 10) || 0;
        activityToUpdate.participants = participants;
        let rate = 0;
        if (participants > 10) {
          rate = activityToUpdate.groupRatePerPerson;
        } else {
          rate = activityToUpdate.fitRatePerPerson;
        }
        activityToUpdate.totalPrice = rate * participants;
        updatedActivitySummary[index] = activityToUpdate;
      }

      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };

      updatedQuotation.activityTotal = updatedActivitySummary.reduce(
        (sum, act) => sum + (act.totalPrice || 0),
        0
      );
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleAddActivity = () => {
    if (!selectedActivityToAdd) {
      alert("Please select an activity to add.");
      return;
    }
    let isAlreadyAdded = false;
    try {
      isAlreadyAdded = editingQuotation.activitySummary.some(
        (activity) => activity.name === selectedActivityToAdd
      );
    } catch (error) {
      isAlreadyAdded = false;
    }

    if (isAlreadyAdded) {
      alert("This activity is already in the quotation.");
      return;
    }

    const activityData = availableActivities.find(
      (act) => act.name === selectedActivityToAdd
    );
    if (!activityData) return;

    const newActivity = {
      name: activityData.name,
      city: activityData.city,
      state: activityData.state,
      fitRatePerPerson: activityData.fitRatePerPerson || 0,
      groupRatePerPerson: activityData.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: parseFloat(
        activityData.fitRatePerPerson || activityData.groupRatePerPerson || 0
      ),
    };

    setEditingQuotation((prev) => {
      const updatedActivitySummary = [
        ...(prev.activitySummary || []),
        newActivity,
      ];
      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });

    setSelectedActivityToAdd("");
  };

  const handleRemoveActivity = (indexToRemove) => {
    setEditingQuotation((prev) => {
      const updatedActivitySummary = prev.activitySummary.filter(
        (_, index) => index !== indexToRemove
      );
      const updatedQuotation = {
        ...prev,
        activitySummary: updatedActivitySummary,
      };
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);
      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
  };

  const handleSaveAs = async () => {
    if (!editingQuotation) {
      alert("Cannot perform 'Save As' without an active quotation.");
      return;
    }

    setNewPackageName(`Copy of ${editingQuotation.packageName}`);
    setNewCustomerName(`Copy of ${editingQuotation.customerName}`);
    setShowSaveAsModal(true);
    setIsEditModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmSaveAs = async () => {
    if (!newPackageName.trim()) {
      alert("Quotation name is required.");
      return;
    }
    if (!newCustomerName.trim()) {
      alert("Customer name is required.");
      return;
    }

    const agentId = user?.uid;
    if (!agentId) {
      alert("You must be logged in to save a new quotation.");
      return;
    }

    const newQuotationData = { ...editingQuotation };

    delete newQuotationData.id;
    newQuotationData.packageName = newPackageName.trim();
    newQuotationData.customerName = newCustomerName.trim();
    newQuotationData.createdAt = new Date();

    try {
      const packagesRef = collection(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages"
      );
      await addDoc(packagesRef, newQuotationData);

      alert("New quotation is saved successfully! ✅");
      setIsEditModalOpen(false);
      setShowSaveAsModal(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error saving new quotation:", error);
      alert(
        "Failed to save the new quotation. Please check the console for details."
      );
    }
  };

  const handleDeleteQuotation = async (quotationId) => {
    const agentId = user?.uid;
    if (!agentId) {
      alert("You are not authenticated.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await deleteDoc(
          doc(db, "saved_packages_by_agents", agentId, "packages", quotationId)
        );
        alert("Quotation deleted successfully!");
        fetchQuotations();
      } catch (error) {
        alert("Failed to delete quotation.");
        console.error("Error deleting quotation:", error);
      }
    }
  };

  const handleCopyToClipboard = (quotationToCopy) => {
    if (!quotationToCopy) {
      displayMessageBox("No quotation data provided to copy.", "error");
      return;
    }

    const summary = generatePackageSummary(quotationToCopy);
    let isCopySuccessful = false;

    const textarea = document.createElement("textarea");
    textarea.value = summary;

    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);

    try {
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      isCopySuccessful = document.execCommand("copy");
      if (!isCopySuccessful) {
        console.error("document.execCommand('copy') failed.");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(summary)
            .then(() => {
              displayMessageBox(
                "Package summary copied to clipboard!",
                "success"
              );
            })
            .catch((err) => {
              displayMessageBox("Failed to copy to clipboard: " + err, "error");
              console.error(
                "Failed to copy using navigator.clipboard.writeText:",
                err
              );
            });
          return;
        }
      }
    } catch (err) {
      console.error("Error attempting to copy to clipboard:", err);
      isCopySuccessful = false;
    } finally {
      document.body.removeChild(textarea);
    }

    if (isCopySuccessful) {
      displayMessageBox("Package summary copied to clipboard!", "success");
    } else {
      displayMessageBox(
        "Failed to copy to clipboard. Your browser might not support this feature directly in this context.",
        "error"
      );
    }
  };

  if (loading) return <p>Loading quotations...</p>;
  if (quotations.length === 0) return <p>No quotations found.</p>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <QuotationsTable
        filteredQuotations={filteredQuotations}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterDestination={filterDestination}
        setFilterDestination={setFilterDestination}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        quotations={quotations}
        getDestinationOfpkg={getDestinationOfpkg}
        handleViewClick={handleViewClick}
        handleEditClick={handleEditClick}
        handleDownloadPDF={handleDownloadPDF}
        handleDeleteQuotation={handleDeleteQuotation}
        handleCopyToClipboard={handleCopyToClipboard}
      />

      <QuotationModals
        isViewModalOpen={isViewModalOpen}
        setIsViewModalOpen={setIsViewModalOpen}
        viewingQuotation={viewingQuotation}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingQuotation={editingQuotation}
        handleEditChange={handleEditChange}
        AllDestinations={AllDestinations}
        SelectedDestination={SelectedDestination}
        setSelectedDestination={setSelectedDestination}
        selectedHotelToAdd={selectedHotelToAdd}
        setSelectedHotelToAdd={setSelectedHotelToAdd}
        allHotels={allHotels}
        handleAddHotel={handleAddHotel}
        handleRemoveHotel={handleRemoveHotel}
        handleHotelChange={handleHotelChange}
        handleHotelSummaryChange={handleHotelSummaryChange}
        getAvailableMealPlans={getAvailableMealPlans}
        toggleValue={toggleValue}
        handleToggle={handleToggle}
        handleTransportSummaryChange={handleTransportSummaryChange}
        selectedTransportStateId={selectedTransportStateId}
        setSelectedTransportStateId={setSelectedTransportStateId}
        transportStates={transportStates}
        toTitleCase={toTitleCase}
        handlePackageChange={handlePackageChange}
        availableTransportPackagesForSelectedState={availableTransportPackagesForSelectedState}
        handleVehicleChange={handleVehicleChange}
        isFetchingActivities={isFetchingActivities}
        selectedActivityToAdd={selectedActivityToAdd}
        setSelectedActivityToAdd={setSelectedActivityToAdd}
        availableActivities={availableActivities}
        handleAddActivity={handleAddActivity}
        handleRemoveActivity={handleRemoveActivity}
        handleActivitySummaryChange={handleActivitySummaryChange}
        handleMarkupInputChange={handleMarkupInputChange}
        handleUpdateQuotation={handleUpdateQuotation}
        handleSaveAs={handleSaveAs}
        showSaveAsModal={showSaveAsModal}
        setShowSaveAsModal={setShowSaveAsModal}
        newPackageName={newPackageName}
        setNewPackageName={setNewPackageName}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        handleConfirmSaveAs={handleConfirmSaveAs}
      />
    </div>
  );
};

export default MyQuotations;