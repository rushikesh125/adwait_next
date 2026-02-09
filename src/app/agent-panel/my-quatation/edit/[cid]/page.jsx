"use client";
import React, { useEffect, useState, useCallback, Activity } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  or,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import { setLoading } from "@/store/authSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Hotel,
  Car,
  ActivitySquare,
  Trash2,
  IndianRupee,
  ArrowLeft,
  Save,
  Copy,
  User,
  Info,
  MapPin,
  BedDouble,
  ShieldCheck,
  Thermometer,
  Gauge,
  Ticket,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

const EditQuotationPage = () => {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useSelector((state) => state.auth);

  // State
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(true); // Separate loading state
  const [allHotels, setAllHotels] = useState([]);
  const [AllDestinations, setAllDestinations] = useState([]);
  const [SelectedDestination, setSelectedDestination] = useState("");
  const [selectedHotelToAdd, setSelectedHotelToAdd] = useState("");
  const [transportStates, setTransportStates] = useState([]);
  const [selectedTransportStateId, setSelectedTransportStateId] = useState("");
  const [
    availableTransportPackagesForSelectedState,
    setAvailableTransportPackagesForSelectedState,
  ] = useState([]);
  const [toggleValue, setToggleValue] = useState(false);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);
  const [selectedActivityToAdd, setSelectedActivityToAdd] = useState("");
  const [isFirstEdit, setisFirstEdit] = useState(true);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [newPackageName, setNewPackageName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");

  // Helper Functions
  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .replace(/-/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getAvailableMealPlans = useCallback(
    (hotelSummaryEntry) => {
      if (!allHotels.length) return ["EP", "CP", "MAP", "AP"];

      const fullHotelData = allHotels.find(
        (h) =>
          h.name === hotelSummaryEntry.hotel &&
          h.city === hotelSummaryEntry.city &&
          h.state === hotelSummaryEntry.state,
      );

      if (!fullHotelData || !Array.isArray(fullHotelData.rooms))
        return ["EP", "CP", "MAP", "AP"];

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
            pricing.extraChild > 0)
        ) {
          mealPlanOptions.push(plan);
        }
      });
      return mealPlanOptions.length > 0 ? mealPlanOptions : ["EP"];
    },
    [allHotels],
  );

  const calculateHotelPrice = useCallback((hotelEntry, fullHotelData) => {
    if (!hotelEntry || !fullHotelData) return 0;

    const {
      checkInDate,
      selectedRoomCategory,
      selectedMealPlan,
      numDouble,
      numExtraAdult,
      numExtraChild,
      nights = 1,
    } = hotelEntry;

    const roomData = fullHotelData.rooms.find(
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

    if (!applicableSeason || !applicableSeason.pricing || !selectedMealPlan)
      return 0;

    const pricing = applicableSeason.pricing[selectedMealPlan.toLowerCase()];
    if (!pricing) {
      console.warn(
        `No pricing found for meal plan ${selectedMealPlan} in season for room category ${selectedRoomCategory}`,
      );
      return 0;
    }

    const doublePrice = (pricing.double || 0) * (numDouble || 0);
    const adultPrice = (pricing.extraAdult || 0) * (numExtraAdult || 0);
    const childPrice = (pricing.extraChild || 0) * (numExtraChild || 0);

    return (doublePrice + adultPrice + childPrice) * nights;
  }, []);

  const recalculateGrandTotal = useCallback((data) => {
    let hotelTotal =
      data.hotelSummary?.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0,
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
        0,
      ) || 0;
    const markup = data.markup || 0;
    return hotelTotal + transportTotal + activityTotal + markup;
  }, []);

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      if (!params.cid || !user?.uid) return;

      try {
        setIsLoadingQuotation(true);
        const packagesRef = collection(
          db,
          "saved_packages_by_agents",
          user.uid,
          "packages",
        );
        const q = query(
          packagesRef,
          or(
            where("leadId", "==", params.cid),
            where("customerId", "==", params.cid),
          ),
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Get the first document from the array
          const quotationData = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
          };

          console.log("Quotation data:", quotationData);
          setEditingQuotation(quotationData);

          if (
            quotationData.hotelSummary &&
            quotationData.hotelSummary.length > 0
          ) {
            setSelectedDestination(quotationData.hotelSummary[0].state);
          }
        } else {
          toast.error("Quotation not found");
          router.push("/agent-panel/my-quatation");
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        toast.error("Failed to load quotation");
      } finally {
        setIsLoadingQuotation(false);
      }
    };

    fetchQuotation();
  }, [params.cid, user?.uid]); // Removed router from dependencies

  // Fetch all hotels, destinations, transport states
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelsSnapshot, destinationsSnapshot, statesSnapshot] =
          await Promise.all([
            getDocs(collection(db, "hotels")),
            getDocs(collection(db, "locations")),
            getDocs(collection(db, "transport")),
          ]);

        setAllHotels(
          hotelsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setAllDestinations(
          destinationsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        );
        setTransportStates(
          statesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Handle transport and activities based on selections
  useEffect(() => {
    if (!editingQuotation) return;

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
            where("state", "==", currentActivityState),
          );
          const snapshot = await getDocs(q);
          setAvailableActivities(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
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
            "packages",
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
            error,
          );
          setAvailableTransportPackagesForSelectedState([]);
        }
      } else {
        setAvailableTransportPackagesForSelectedState([]);
      }
    };

    fetchTransportPackages();
  }, [
    editingQuotation,
    SelectedDestination,
    selectedTransportStateId,
    isFirstEdit,
  ]);

  // Event Handlers
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuotation((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  const handleAddHotel = () => {
    if (!selectedHotelToAdd) {
      alert("Please select a hotel to add.");
      return;
    }

    const newHotelData = allHotels.find((h) => h.id === selectedHotelToAdd);
    if (!newHotelData) return;

    const isAlreadyAdded = editingQuotation.hotelSummary.some(
      (h) => h.hotel === newHotelData.name,
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
        0,
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
        (_, index) => index !== indexToRemove,
      );
      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0,
      );
      return {
        ...updatedQuotation,
        grandTotal: recalculateGrandTotal(updatedQuotation),
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
      };

      newHotelEntry.hotelTotal = calculateHotelPrice(
        newHotelEntry,
        newHotelData,
      );
      updatedSummary[indexToUpdate] = newHotelEntry;

      const updatedQuotation = { ...prev, hotelSummary: updatedSummary };
      updatedQuotation.hotelTotal = updatedSummary.reduce(
        (sum, hotel) => sum + (hotel.hotelTotal || 0),
        0,
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
          (h) =>
            h.name === entryToUpdate.hotel && h.city === entryToUpdate.city,
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
            h.state === entry.state,
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

  const handlePackageChange = (e) => {
    const newPackageId = e.target.value;
    const newPackage = availableTransportPackagesForSelectedState.find(
      (p) => p.id === newPackageId,
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

  const handleAddActivity = () => {
    if (!selectedActivityToAdd) {
      alert("Please select an activity to add.");
      return;
    }
    let isAlreadyAdded = false;
    try {
      isAlreadyAdded = editingQuotation.activitySummary.some(
        (activity) => activity.name === selectedActivityToAdd,
      );
    } catch (error) {
      isAlreadyAdded = false;
    }

    if (isAlreadyAdded) {
      alert("This activity is already in the quotation.");
      return;
    }

    const activityData = availableActivities.find(
      (act) => act.name === selectedActivityToAdd,
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
        activityData.fitRatePerPerson || activityData.groupRatePerPerson || 0,
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
        (_, index) => index !== indexToRemove,
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
        0,
      );
      const newGrandTotal = recalculateGrandTotal(updatedQuotation);

      return {
        ...updatedQuotation,
        grandTotal: newGrandTotal,
      };
    });
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
      editingQuotation.id,
    );

    try {
      await updateDoc(quotationRef, editingQuotation);
      alert("Quotation updated successfully! ✅");
      // router.push("/agent-panel/my-quotation");
    } catch (error) {
      console.error("Error updating quotation: ", error);
      alert("Failed to update quotation. Please check the console for errors.");
    }
  };

  const handleSaveAs = async () => {
    if (!editingQuotation) {
      alert("Cannot perform 'Save As' without an active quotation.");
      return;
    }

    setNewPackageName(`Copy of ${editingQuotation.packageName}`);
    setNewCustomerName(`Copy of ${editingQuotation.customerName}`);
    setShowSaveAsModal(true);
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
        "packages",
      );
      await addDoc(packagesRef, newQuotationData);

      alert("New quotation is saved successfully! ✅");
      setShowSaveAsModal(false);
      // router.push("/agent-panel/my-quotation");
    } catch (error) {
      console.error("Error saving new quotation:", error);
      alert(
        "Failed to save the new quotation. Please check the console for details.",
      );
    }
  };

  if (isLoadingQuotation || !editingQuotation) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading quotation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-theme-muted">
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 lg:px-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/agent-panel/my-quatation")}
                className="hover:bg-theme-muted rounded-xl shrink-0 mt-1 sm:mt-0"
              >
                <ArrowLeft className="h-5 w-5 text-theme-primary" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="truncate">Edit Quotation</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-theme-muted text-theme-primary border border-theme-accent/20 shrink-0">
                    {editingQuotation?.status || "Draft"}
                  </span>
                </h1>
                <p className="text-slate-600 mt-1.5 flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span className="font-medium truncate">
                    {editingQuotation.customerName || editingQuotation.leadName}
                  </span>
                  {editingQuotation.createdAt && (
                    <>
                      <span className="text-slate-400 hidden sm:inline">•</span>
                      <span className="text-xs sm:text-sm text-slate-500">
                        Created{" "}
                        {new Date(
                          editingQuotation.createdAt.seconds * 1000,
                        ).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleSaveAs}
                className="border-slate-300 hover:bg-slate-50 hover:border-theme-primary/40 transition-all flex-1 sm:flex-none"
              >
                <Copy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save As New</span>
              </Button>
              <Button
                onClick={handleUpdateQuotation}
                className="bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-secondary hover:to-theme-dark text-white shadow-md hover:shadow-lg transition-all flex-1 sm:flex-none"
              >
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Customer Info */}
          <Card className="shadow-lg shadow-slate-200/50 border-slate-200 overflow-hidden rounded-3xl bg-white transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60">
            <CardHeader className="bg-gradient-to-br from-theme-muted/40 via-white to-white border-b border-slate-100 py-5">
              <CardTitle className="flex items-center gap-4 text-slate-800 text-lg font-semibold tracking-tight">
                <div className="p-2.5 bg-theme-primary/10 rounded-2xl ring-1 ring-theme-primary/20 shadow-sm">
                  <IndianRupee className="h-5 w-5 text-theme-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span>Customer Information</span>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                    Client Details & Status
                  </p>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {/* Customer Name Field */}
                <div className="space-y-2.5">
                  <Label
                    htmlFor="customerName"
                    className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-2"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    CUSTOMER NAME
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    placeholder="John Doe"
                    value={
                      editingQuotation?.customerName ||
                      editingQuotation?.leadName ||
                      ""
                    }
                    onChange={handleEditChange}
                    className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-theme-primary/10 focus:border-theme-primary rounded-2xl transition-all duration-200 placeholder:text-slate-400"
                  />
                </div>

                {/* Status Selection Field */}
                <div className="space-y-2.5">
                  <Label
                    htmlFor="status"
                    className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-2"
                  >
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                    QUOTATION STATUS
                  </Label>
                  <Select
                    name="status"
                    value={editingQuotation?.status || "Draft"}
                    onValueChange={(value) =>
                      handleEditChange({ target: { name: "status", value } })
                    }
                  >
                    <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-theme-primary/10 focus:border-theme-primary rounded-2xl transition-all duration-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1">
                      <SelectItem
                        value="Draft"
                        className="rounded-xl focus:bg-slate-100"
                      >
                        <span className="flex items-center gap-2.5 py-0.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-100" />
                          <span className="font-medium text-slate-700">
                            Draft
                          </span>
                        </span>
                      </SelectItem>
                      <SelectItem
                        value="Sent"
                        className="rounded-xl focus:bg-theme-muted/50"
                      >
                        <span className="flex items-center gap-2.5 py-0.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-theme-primary ring-4 ring-theme-primary/10" />
                          <span className="font-medium text-theme-dark">
                            Sent
                          </span>
                        </span>
                      </SelectItem>
                      <SelectItem
                        value="Accepted"
                        className="rounded-xl focus:bg-green-50"
                      >
                        <span className="flex items-center gap-2.5 py-0.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100" />
                          <span className="font-medium text-green-700">
                            Accepted
                          </span>
                        </span>
                      </SelectItem>
                      <SelectItem
                        value="Rejected"
                        className="rounded-xl focus:bg-red-50"
                      >
                        <span className="flex items-center gap-2.5 py-0.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100" />
                          <span className="font-medium text-red-700">
                            Rejected
                          </span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="shadow-sm border-slate-200 rounded-2xl overflow-hidden">
            <Tabs defaultValue="hotels" className="w-full">
              <div className="border-b border-slate-100 bg-white px-2 sm:px-6 overflow-x-auto no-scrollbar">
                <TabsList className="bg-transparent h-auto p-0 gap-1 sm:gap-2 inline-flex min-w-full sm:min-w-0">
                  {/* Hotels Tab */}
                  <TabsTrigger
                    value="hotels"
                    className="group relative flex items-center justify-center gap-2 rounded-t-2xl px-4 sm:px-6 py-4 text-slate-500 transition-all duration-300
                     data-[state=active]:text-theme-primary data-[state=active]:bg-theme-muted/30 whitespace-nowrap
                     hover:text-theme-primary hover:bg-slate-50"
                  >
                    <Hotel className="h-4 w-4 transition-transform duration-300 group-data-[state=active]:scale-110" />
                    <span className="text-sm font-semibold tracking-wide">
                      Hotels
                    </span>

                    {editingQuotation?.hotelSummary?.length > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-theme-primary text-white rounded-full text-[10px] font-bold shadow-sm shadow-theme-primary/30">
                        {editingQuotation.hotelSummary.length}
                      </span>
                    )}

                    {/* Active Indicator Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100 rounded-full" />
                  </TabsTrigger>

                  {/* Transport Tab */}
                  <TabsTrigger
                    value="transport"
                    className="group relative flex items-center justify-center gap-2 rounded-t-2xl px-4 sm:px-6 py-4 text-slate-500 transition-all duration-300
                     data-[state=active]:text-theme-primary data-[state=active]:bg-theme-muted/30 whitespace-nowrap
                     hover:text-theme-primary hover:bg-slate-50"
                  >
                    <Car className="h-4 w-4 transition-transform duration-300 group-data-[state=active]:scale-110" />
                    <span className="text-sm font-semibold tracking-wide">
                      Transport
                    </span>

                    {editingQuotation?.transportSummary?.vehicleName && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100 rounded-full" />
                  </TabsTrigger>

                  {/* Activities Tab */}
                  <TabsTrigger
                    value="activities"
                    className="group relative flex items-center justify-center gap-2 rounded-t-2xl px-4 sm:px-6 py-4 text-slate-500 transition-all duration-300
                     data-[state=active]:text-theme-primary data-[state=active]:bg-theme-muted/30 whitespace-nowrap
                     hover:text-theme-primary hover:bg-slate-50"
                  >
                    <ActivitySquare className="h-4 w-4 transition-transform duration-300 group-data-[state=active]:scale-110" />
                    <span className="text-sm font-semibold tracking-wide">
                      Activities
                    </span>

                    {editingQuotation?.activitySummary?.length > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-theme-primary text-white rounded-full text-[10px] font-bold shadow-sm">
                        {editingQuotation.activitySummary.length}
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-theme-primary scale-x-0 transition-transform duration-300 group-data-[state=active]:scale-x-100 rounded-full" />
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* HOTELS TAB */}
              <TabsContent
                value="hotels"
                className="p-4 sm:p-8 space-y-8 outline-none focus-visible:ring-0"
              >
                {/* Add New Hotel Section */}
                <div className="relative group overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
                  <div className="absolute top-0 left-0 w-1 h-full bg-theme-primary" />
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="p-3 bg-theme-primary/10 rounded-2xl shadow-inner">
                          <Plus className="h-5 w-5 text-theme-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                            Add New Hotel
                          </h3>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Select destination and stay
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1.5 uppercase">
                            <MapPin className="h-3 w-3" /> State / Destination
                          </Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger className="bg-slate-50/50 border-slate-200 rounded-xl h-11 focus:ring-theme-primary/10">
                              <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                              {AllDestinations.map((state) => (
                                <SelectItem
                                  key={state.name}
                                  value={state.name}
                                  className="rounded-lg"
                                >
                                  {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-500 ml-1 flex items-center gap-1.5 uppercase">
                            <BedDouble className="h-3 w-3" /> Hotel Name
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={selectedHotelToAdd}
                              onValueChange={setSelectedHotelToAdd}
                              disabled={!SelectedDestination}
                            >
                              <SelectTrigger className="flex-1 bg-slate-50/50 border-slate-200 rounded-xl h-11 focus:ring-theme-primary/10">
                                <SelectValue placeholder="Choose hotel..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-2xl border-slate-100 max-h-[300px]">
                                {allHotels
                                  .filter(
                                    (h) => h.state === SelectedDestination,
                                  )
                                  .map((h) => (
                                    <SelectItem
                                      key={h.id}
                                      value={h.id}
                                      className="rounded-lg"
                                    >
                                      {h.name}{" "}
                                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                                        ({h.city})
                                      </span>
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleAddHotel}
                              disabled={!selectedHotelToAdd}
                              className="h-11 px-5 bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-secondary hover:to-theme-dark text-white shadow-lg shadow-theme-primary/20 rounded-xl transition-all active:scale-95"
                            >
                              <Plus className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline font-semibold">
                                Add
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hotel Summary Table */}
                {editingQuotation?.hotelSummary?.length > 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto no-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest pl-6">
                              Hotel Details
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                              Room Type
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                              Nights
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                              Rooms
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest text-center">
                              Occupancy
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                              Meal Plan
                            </TableHead>
                            <TableHead className="py-4 font-bold text-[11px] text-slate-500 uppercase tracking-widest text-right pr-6">
                              Price
                            </TableHead>
                            <TableHead className="w-14"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingQuotation.hotelSummary.map((hotel, index) => {
                            const currentHotelData = allHotels.find(
                              (h) =>
                                h.name === hotel.hotel &&
                                h.state === hotel.state,
                            );
                            return (
                              <TableRow
                                key={index}
                                className="hover:bg-slate-50/40 transition-colors border-b border-slate-100 last:border-0"
                              >
                                <TableCell className="pl-6 py-4">
                                  <Select
                                    value={currentHotelData?.id || ""}
                                    onValueChange={(val) =>
                                      handleHotelChange(index, val)
                                    }
                                  >
                                    <SelectTrigger className="w-full min-w-[200px] border-slate-200 bg-white/50 rounded-xl h-10 shadow-sm focus:ring-theme-primary/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-2xl">
                                      {allHotels
                                        .filter((h) => h.state === hotel.state)
                                        .map((h) => (
                                          <SelectItem
                                            key={h.id}
                                            value={h.id}
                                            className="rounded-lg"
                                          >
                                            {h.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    value={hotel.selectedRoomCategory || ""}
                                    onValueChange={(val) =>
                                      handleHotelSummaryChange(
                                        index,
                                        "selectedRoomCategory",
                                        val,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="min-w-[140px] border-slate-200 bg-white/50 rounded-xl h-10 shadow-sm focus:ring-theme-primary/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-2xl">
                                      {currentHotelData?.rooms?.map((room) => (
                                        <SelectItem
                                          key={room.categoryName}
                                          value={room.categoryName}
                                          className="rounded-lg"
                                        >
                                          {room.categoryName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={hotel.nights || 1}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(
                                        index,
                                        "nights",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 h-10 border-slate-200 rounded-xl text-center font-medium focus:ring-theme-primary/10"
                                  />
                                </TableCell>

                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={hotel.numDouble || 0}
                                    onChange={(e) =>
                                      handleHotelSummaryChange(
                                        index,
                                        "numDouble",
                                        e.target.value,
                                      )
                                    }
                                    className="w-16 h-10 border-slate-200 rounded-xl text-center font-medium focus:ring-theme-primary/10"
                                  />
                                </TableCell>

                                <TableCell>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                                        A
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={hotel.numExtraAdult || 0}
                                        onChange={(e) =>
                                          handleHotelSummaryChange(
                                            index,
                                            "numExtraAdult",
                                            e.target.value,
                                          )
                                        }
                                        className="w-12 h-9 border-slate-200 rounded-lg text-center text-xs focus:ring-theme-primary/10"
                                      />
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                                        C
                                      </span>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={hotel.numExtraChild || 0}
                                        onChange={(e) =>
                                          handleHotelSummaryChange(
                                            index,
                                            "numExtraChild",
                                            e.target.value,
                                          )
                                        }
                                        className="w-12 h-9 border-slate-200 rounded-lg text-center text-xs focus:ring-theme-primary/10"
                                      />
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <Select
                                    value={hotel.selectedMealPlan || "EP"}
                                    onValueChange={(val) =>
                                      handleHotelSummaryChange(
                                        index,
                                        "selectedMealPlan",
                                        val,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-24 border-slate-200 bg-white/50 rounded-xl h-10 shadow-sm focus:ring-theme-primary/10">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-2xl">
                                      {getAvailableMealPlans(hotel).map(
                                        (plan) => (
                                          <SelectItem
                                            key={plan}
                                            value={plan}
                                            className="rounded-lg"
                                          >
                                            {plan}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                <TableCell className="text-right pr-6">
                                  <span className="text-sm font-bold text-theme-primary bg-theme-muted px-3 py-1.5 rounded-full">
                                    ₹{(hotel.hotelTotal || 0).toLocaleString()}
                                  </span>
                                </TableCell>

                                <TableCell className="pr-6">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveHotel(index)}
                                    disabled={
                                      editingQuotation.hotelSummary.length <= 1
                                    }
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <div className="p-5 bg-white rounded-3xl shadow-sm border border-slate-100 mb-5 group-hover:scale-110 transition-transform duration-500">
                      <Hotel className="h-10 w-10 text-slate-300" />
                    </div>
                    <h4 className="text-slate-700 font-bold text-lg">
                      No Hotels Listed
                    </h4>
                    <p className="text-slate-500 text-sm max-w-[280px] mt-2">
                      Start building your itinerary by adding a hotel using the
                      destination selector above.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* TRANSPORT TAB */}
              <TabsContent
                value="transport"
                className="p-4 sm:p-8 space-y-6 outline-none focus-visible:ring-0"
              >
                <Card className="border-slate-200 overflow-hidden rounded-[2rem] shadow-sm bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-theme-primary/10 rounded-2xl shadow-inner">
                          <Car className="h-6 w-6 text-theme-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">
                            Transportation Details
                          </CardTitle>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">
                            Manage vehicle and route pricing
                          </p>
                        </div>
                      </div>

                      {/* Premium Toggle Switch */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                          onClick={() => toggleValue && handleToggle(false)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            !toggleValue
                              ? "bg-white text-theme-primary shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          CUSTOM
                        </button>
                        <Switch
                          checked={toggleValue}
                          onCheckedChange={handleToggle}
                          className="data-[state=checked]:bg-theme-primary"
                        />
                        <button
                          onClick={() => !toggleValue && handleToggle(true)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            toggleValue
                              ? "bg-white text-theme-primary shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          PACKAGE
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8">
                    {!toggleValue ? (
                      /* Custom Vehicle Layout */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">
                            Vehicle Name
                          </Label>
                          <Input
                            value={
                              editingQuotation?.transportSummary?.vehicleName ||
                              ""
                            }
                            onChange={(e) =>
                              handleTransportSummaryChange(
                                "vehicleName",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Innova Crysta"
                            className="h-11 border-slate-200 rounded-xl bg-slate-50/50 focus:ring-theme-primary/10 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">
                            Price (₹)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={
                              editingQuotation?.transportSummary?.price || 0
                            }
                            onChange={(e) =>
                              handleTransportSummaryChange(
                                "price",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            placeholder="0"
                            className="h-11 border-slate-200 rounded-xl bg-slate-50/50 focus:ring-theme-primary/10 font-semibold"
                          />
                        </div>

                        <div className="flex items-end">
                          <label
                            htmlFor="ac"
                            className={`flex items-center justify-between w-full h-11 px-4 rounded-xl border transition-all cursor-pointer ${
                              editingQuotation?.transportSummary?.ac
                                ? "bg-theme-primary/5 border-theme-primary/30 text-theme-primary"
                                : "bg-slate-50/50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span className="text-sm font-bold">
                              AC Vehicle
                            </span>
                            <input
                              type="checkbox"
                              id="ac"
                              checked={!!editingQuotation?.transportSummary?.ac}
                              onChange={(e) =>
                                handleTransportSummaryChange(
                                  "ac",
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 rounded border-slate-300 text-theme-primary focus:ring-theme-primary accent-theme-primary"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Package Layout */
                      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">
                              Select State
                            </Label>
                            <Select
                              value={selectedTransportStateId}
                              onValueChange={setSelectedTransportStateId}
                            >
                              <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-slate-50/50">
                                <SelectValue placeholder="Select transport state" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-2xl">
                                {transportStates.map((state) => (
                                  <SelectItem
                                    key={state.id}
                                    value={state.id}
                                    className="rounded-lg"
                                  >
                                    {toTitleCase(state.id)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedTransportStateId && (
                            <div className="space-y-2">
                              <Label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">
                                Transport Package
                              </Label>
                              <Select
                                value={
                                  editingQuotation?.transportSummary?.id || ""
                                }
                                onValueChange={(val) =>
                                  handlePackageChange({
                                    target: { value: val },
                                  })
                                }
                              >
                                <SelectTrigger className="h-11 border-slate-200 rounded-xl bg-slate-50/50">
                                  <SelectValue placeholder="Select package" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-2xl">
                                  {availableTransportPackagesForSelectedState.map(
                                    (pkg) => (
                                      <SelectItem
                                        key={pkg.id}
                                        value={pkg.id}
                                        className="rounded-lg"
                                      >
                                        {pkg.name || pkg.packageName || pkg.id}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {editingQuotation?.transportSummary?.vehicles?.length >
                          0 && (
                          <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">
                              Available Vehicle Options
                            </Label>
                            <Select
                              value={
                                editingQuotation?.transportSummary
                                  ?.selectedVehicle?.type || ""
                              }
                              onValueChange={(val) => {
                                const vehicle =
                                  editingQuotation.transportSummary.vehicles.find(
                                    (v) => v.type === val,
                                  );
                                if (vehicle) handleVehicleChange(vehicle);
                              }}
                            >
                              <SelectTrigger className="h-12 border-slate-200 rounded-xl bg-white shadow-sm hover:border-theme-primary/30 transition-all">
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-2xl">
                                {editingQuotation.transportSummary.vehicles.map(
                                  (v, i) => (
                                    <SelectItem
                                      key={i}
                                      value={v.type}
                                      className="rounded-lg py-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold">
                                          {v.type}
                                        </span>
                                        <span className="text-slate-400">
                                          •
                                        </span>
                                        <span className="text-theme-primary font-medium">
                                          ₹{v.price ?? v.perKmprice}
                                        </span>
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded-full ${v.ac ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}
                                        >
                                          {v.ac ? "AC" : "Non-AC"}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Summary Infographic Cards */}
                        {selectedTransportStateId && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-full group hover:bg-white hover:shadow-md transition-all">
                              <div className="flex items-center gap-2 text-slate-400 mb-3">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  Active Package
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 line-clamp-2">
                                {editingQuotation?.transportSummary
                                  ?.packageName || "—"}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between h-full group hover:bg-white hover:shadow-md transition-all">
                              <div className="flex items-center gap-2 text-slate-400 mb-3">
                                <Thermometer className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  Climate Control
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full animate-pulse ${editingQuotation?.transportSummary?.ac ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-slate-300"}`}
                                />
                                <p className="font-bold text-slate-800">
                                  {editingQuotation?.transportSummary?.ac
                                    ? "Full Air Conditioning"
                                    : "Non-AC Vehicle"}
                                </p>
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-theme-primary to-theme-secondary rounded-2xl p-5 shadow-lg shadow-theme-primary/20 flex flex-col justify-between h-full">
                              <div className="flex items-center gap-2 text-white/70 mb-3">
                                <Gauge className="h-4 w-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                                  Total Transport Cost
                                </span>
                              </div>
                              <p className="font-black text-2xl text-white">
                                ₹
                                {(
                                  editingQuotation?.transportSummary
                                    ?.totalPrice || 0
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ACTIVITIES TAB */}
              <TabsContent
                value="activities"
                className="p-4 sm:p-8 space-y-8 outline-none animate-in fade-in duration-500"
              >
                {/* Header & Activity Adder Section */}
                <div className="relative overflow-hidden bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Activity size={120} />
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-theme-primary rounded-2xl shadow-lg shadow-theme-muted">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                          Activity Builder
                        </h3>
                        <p className="text-sm text-slate-500">
                          Customize the guest experience with local excursions
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                          Step 1: Choose Location
                        </Label>
                        <Select
                          value={SelectedDestination}
                          onValueChange={setSelectedDestination}
                        >
                          <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-purple-500/10">
                            <SelectValue placeholder="Where are they going?" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {AllDestinations.map((state) => (
                              <SelectItem
                                key={state.name}
                                value={state.name}
                                className="py-3"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-slate-400" />
                                  <span className="font-medium">
                                    {state.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                          Step 2: Select & Add Activity
                        </Label>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <Select
                              value={selectedActivityToAdd}
                              onValueChange={setSelectedActivityToAdd}
                              disabled={
                                !SelectedDestination || isFetchingActivities
                              }
                            >
                              <SelectTrigger className="h-12 bg-slate-50/50 border-slate-200 rounded-xl">
                                <SelectValue
                                  placeholder={
                                    isFetchingActivities
                                      ? "Loading local fun..."
                                      : "Browse activities..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl shadow-xl max-h-[300px]">
                                {availableActivities.map((act) => (
                                  <SelectItem
                                    key={act.name}
                                    value={act.name}
                                    className="py-3"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">
                                        {act.name}
                                      </span>
                                      <span className="text-xs text-theme-primary font-medium">
                                        ₹
                                        {act.fitRatePerPerson ||
                                          act.groupRatePerPerson}{" "}
                                        / person • {act.city}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            onClick={handleAddActivity}
                            disabled={!selectedActivityToAdd}
                            className="h-12 px-6 bg-theme-primary hover:bg-theme-dark text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-100 flex items-center gap-2"
                          >
                            <Ticket className="h-4 w-4" />
                            <span className="font-bold">Add</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activities Summary List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                      Scheduled Activities (
                      {editingQuotation?.activitySummary?.length || 0})
                    </h4>
                  </div>

                  {editingQuotation?.activitySummary?.length > 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/50 border-b border-slate-100">
                              <TableHead className="py-5 px-6 font-bold text-slate-600">
                                Activity & Location
                              </TableHead>
                              <TableHead className="py-5 font-bold text-slate-600">
                                Participants
                              </TableHead>
                              <TableHead className="py-5 text-right font-bold text-slate-600">
                                Investment
                              </TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingQuotation.activitySummary.map(
                              (activity, index) => (
                                <TableRow
                                  key={index}
                                  className="group hover:bg-purple-50/30 transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <TableCell className="py-5 px-6">
                                    <div className="flex items-center gap-4">
                                      <div className="h-10 w-10 rounded-xl bg-theme-muted flex items-center justify-center text-theme-primary font-bold text-xs">
                                        {index + 1}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-900">
                                          {activity.name}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                                          <MapPin className="h-3 w-3" />
                                          {activity.city}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative flex items-center max-w-[120px]">
                                      <Users className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                                      <Input
                                        type="number"
                                        min="1"
                                        value={activity.participants || 1}
                                        onChange={(e) =>
                                          handleActivitySummaryChange(
                                            index,
                                            "participants",
                                            e.target.value,
                                          )
                                        }
                                        className="pl-9 h-10 border-slate-200 rounded-xl focus:ring-theme-primary font-medium"
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-lg font-black text-slate-900">
                                      ₹
                                      {(
                                        activity.totalPrice || 0
                                      ).toLocaleString()}
                                    </span>
                                  </TableCell>
                                  <TableCell className="px-6">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleRemoveActivity(index)
                                      }
                                      className="h-10 w-10 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <Ticket className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="text-slate-600 font-bold">
                        No activities added yet
                      </p>
                      <p className="text-sm text-slate-400 mt-1 max-w-[240px] text-center">
                        Select a destination above to start building the perfect
                        itinerary.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Pricing Summary */}
          <Card className="shadow-lg border-slate-200 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
              <CardTitle className="flex items-center gap-3 text-slate-900 text-lg sm:text-xl">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <IndianRupee className="h-5 w-5 text-amber-600" />
                </div>
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="markup"
                    className="text-sm font-medium text-slate-700"
                  >
                    Add Markup (₹)
                  </Label>
                  <Input
                    id="markup"
                    type="number"
                    placeholder="e.g. 5000"
                    value={editingQuotation?.markup || 0}
                    onChange={(e) => handleMarkupInputChange(e.target.value)}
                    className="text-lg border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex flex-col justify-center items-end bg-gradient-to-br from-theme-muted to-theme-accent/10 rounded-xl p-4 sm:p-6 border-2 border-theme-accent/20">
                  <p className="text-xs sm:text-sm font-medium text-theme-primary uppercase tracking-wider">
                    Grand Total
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-theme-primary mt-2">
                    ₹
                    {(editingQuotation?.grandTotal || 0).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Inclusive of all charges
                  </p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Hotel Cost
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">
                    ₹
                    {editingQuotation?.hotelSummary
                      ?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0)
                      ?.toLocaleString("en-IN") || "0"}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Transport Cost
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">
                    ₹
                    {(editingQuotation?.transportSummary?.pricingType ===
                    "perKm"
                      ? (editingQuotation.transportSummary?.perKmprice || 0) *
                        (editingQuotation.transportSummary?.kms || 0)
                      : editingQuotation?.transportSummary?.price || 0
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Activities Cost
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900">
                    ₹
                    {editingQuotation?.activitySummary
                      ?.reduce((sum, a) => sum + (a.totalPrice || 0), 0)
                      ?.toLocaleString("en-IN") || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save As Modal */}
        <Dialog open={showSaveAsModal} onOpenChange={setShowSaveAsModal}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl text-theme-primary flex items-center gap-2">
                <Copy className="h-5 w-5" />
                Save as New Quotation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="newPackageName"
                  className="text-sm font-medium text-slate-700"
                >
                  New Package Name
                </Label>
                <Input
                  id="newPackageName"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  placeholder="Summer Special Goa 2025"
                  className="border-slate-300 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="newCustomerName"
                  className="text-sm font-medium text-slate-700"
                >
                  New Customer Name
                </Label>
                <Input
                  id="newCustomerName"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowSaveAsModal(false)}
                className="border-slate-300 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSaveAs}
                className="bg-gradient-to-r from-theme-primary to-theme-secondary hover:from-theme-secondary hover:to-theme-dark text-white rounded-xl"
              >
                Save New Quotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EditQuotationPage;
