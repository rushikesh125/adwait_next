"use client";
import React, { useEffect, useState, useCallback } from "react";
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
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/agent-panel/my-quatation")}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Edit Quotation
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {editingQuotation?.status || "Draft"}
                </span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                <span className="font-medium">
                  {editingQuotation.customerName || editingQuotation.leadName}
                </span>
                {editingQuotation.createdAt && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm">
                      Created{" "}
                      {new Date(
                        editingQuotation.createdAt.seconds * 1000
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveAs}
              className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save As New
            </Button>
            <Button
              onClick={handleUpdateQuotation}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Customer Info */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-700 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label
                  htmlFor="customerName"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Customer Name
                </Label>
                <Input
                  id="customerName"
                  name="customerName"
                  value={
                    editingQuotation?.customerName ||
                    editingQuotation?.leadName ||
                    ""
                  }
                  onChange={handleEditChange}
                  className="border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="status"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Status
                </Label>
                <Select
                  name="status"
                  value={editingQuotation?.status || "Draft"}
                  onValueChange={(value) =>
                    handleEditChange({ target: { name: "status", value } })
                  }
                >
                  <SelectTrigger className="border-gray-300 dark:border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                        Draft
                      </span>
                    </SelectItem>
                    <SelectItem value="Sent">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        Sent
                      </span>
                    </SelectItem>
                    <SelectItem value="Accepted">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Accepted
                      </span>
                    </SelectItem>
                    <SelectItem value="Rejected">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Rejected
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="shadow-sm border-gray-200 dark:border-gray-700">
          <Tabs defaultValue="hotels" className="w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6">
              <TabsList className="bg-transparent h-auto p-0 space-x-8">
                <TabsTrigger
                  value="hotels"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-t-lg px-4 py-3 -mb-px data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <Hotel className="h-4 w-4 mr-2" />
                  Hotels
                  {editingQuotation?.hotelSummary?.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      {editingQuotation.hotelSummary.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="transport"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-t-lg px-4 py-3 -mb-px data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <Car className="h-4 w-4 mr-2" />
                  Transport
                  {editingQuotation?.transportSummary?.vehicleName && (
                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-t-lg px-4 py-3 -mb-px data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <ActivitySquare className="h-4 w-4 mr-2" />
                  Activities
                  {editingQuotation?.activitySummary?.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                      {editingQuotation.activitySummary.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* HOTELS TAB */}
            <TabsContent value="hotels" className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Add New Hotel
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select State
                        </Label>
                        <Select
                          value={SelectedDestination}
                          onValueChange={setSelectedDestination}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {AllDestinations.map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select Hotel
                        </Label>
                        <div className="flex gap-3">
                          <Select
                            value={selectedHotelToAdd}
                            onValueChange={setSelectedHotelToAdd}
                            disabled={!SelectedDestination}
                          >
                            <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                              <SelectValue placeholder="Choose hotel..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allHotels
                                .filter((h) => h.state === SelectedDestination)
                                .map((h) => (
                                  <SelectItem key={h.id} value={h.id}>
                                    {h.name} ({h.city})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddHotel}
                            disabled={!selectedHotelToAdd}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {editingQuotation?.hotelSummary?.length > 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Hotel
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Room Type
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Nights
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Rooms
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Adults
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Children
                          </TableHead>
                          <TableHead className="font-semibold text-gray-900 dark:text-white">
                            Meal Plan
                          </TableHead>
                          <TableHead className="text-right font-semibold text-gray-900 dark:text-white">
                            Price
                          </TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingQuotation.hotelSummary.map((hotel, index) => {
                          const currentHotelData = allHotels.find(
                            (h) =>
                              h.name === hotel.hotel && h.state === hotel.state
                          );
                          return (
                            <TableRow
                              key={index}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              <TableCell className="font-medium">
                                <Select
                                  value={
                                    allHotels.find(
                                      (h) =>
                                        h.name === hotel.hotel &&
                                        h.state === hotel.state
                                    )?.id || ""
                                  }
                                  onValueChange={(val) =>
                                    handleHotelChange(index, val)
                                  }
                                >
                                  <SelectTrigger className="w-[220px] border-gray-300 dark:border-gray-600">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allHotels
                                      .filter((h) => h.state === hotel.state)
                                      .map((h) => (
                                        <SelectItem key={h.id} value={h.id}>
                                          {h.name} ({h.city})
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
                                      val
                                    )
                                  }
                                >
                                  <SelectTrigger className="border-gray-300 dark:border-gray-600">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {currentHotelData?.rooms?.map((room) => (
                                      <SelectItem
                                        key={room.categoryName}
                                        value={room.categoryName}
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
                                      e.target.value
                                    )
                                  }
                                  className="w-20 border-gray-300 dark:border-gray-600"
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
                                      e.target.value
                                    )
                                  }
                                  className="w-20 border-gray-300 dark:border-gray-600"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numExtraAdult || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(
                                      index,
                                      "numExtraAdult",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 border-gray-300 dark:border-gray-600"
                                />
                              </TableCell>

                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numExtraChild || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(
                                      index,
                                      "numExtraChild",
                                      e.target.value
                                    )
                                  }
                                  className="w-20 border-gray-300 dark:border-gray-600"
                                />
                              </TableCell>

                              <TableCell>
                                <Select
                                  value={hotel.selectedMealPlan || "EP"}
                                  onValueChange={(val) =>
                                    handleHotelSummaryChange(
                                      index,
                                      "selectedMealPlan",
                                      val
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-32 border-gray-300 dark:border-gray-600">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableMealPlans(hotel).map(
                                      (plan) => (
                                        <SelectItem key={plan} value={plan}>
                                          {plan}
                                        </SelectItem>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              <TableCell className="text-right">
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  ₹{(hotel.hotelTotal || 0).toFixed(0)}
                                </span>
                              </TableCell>

                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveHotel(index)}
                                  disabled={
                                    editingQuotation.hotelSummary.length <= 1
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Hotel className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    No hotels added yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Add your first hotel using the form above
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TRANSPORT TAB */}
            <TabsContent value="transport" className="p-6 space-y-6">
              <Card className="border-gray-200 dark:border-gray-700 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      Transportation Details
                    </CardTitle>
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Custom
                      </span>
                      <Switch
                        checked={toggleValue}
                        onCheckedChange={handleToggle}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Package
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {!toggleValue ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                              e.target.value
                            )
                          }
                          placeholder="e.g., Innova Crysta"
                          className="border-gray-300 dark:border-gray-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0"
                          className="border-gray-300 dark:border-gray-600"
                        />
                      </div>

                      <div className="flex items-end">
                        <div className="flex items-center space-x-2 h-10 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                          <input
                            type="checkbox"
                            id="ac"
                            checked={!!editingQuotation?.transportSummary?.ac}
                            onChange={(e) =>
                              handleTransportSummaryChange(
                                "ac",
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label
                            htmlFor="ac"
                            className="text-sm font-medium cursor-pointer text-gray-700 dark:text-gray-300"
                          >
                            AC Vehicle
                          </Label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select State
                          </Label>
                          <Select
                            value={selectedTransportStateId}
                            onValueChange={setSelectedTransportStateId}
                          >
                            <SelectTrigger className="border-gray-300 dark:border-gray-600">
                              <SelectValue placeholder="Select transport state" />
                            </SelectTrigger>
                            <SelectContent>
                              {transportStates.map((state) => (
                                <SelectItem key={state.id} value={state.id}>
                                  {toTitleCase(state.id)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedTransportStateId && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Change Package
                            </Label>
                            <Select
                              value={
                                editingQuotation?.transportSummary?.id || ""
                              }
                              onValueChange={(val) => {
                                const e = { target: { value: val } };
                                handlePackageChange(e);
                              }}
                            >
                              <SelectTrigger className="border-gray-300 dark:border-gray-600">
                                <SelectValue placeholder="Select package" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTransportPackagesForSelectedState.map(
                                  (pkg) => (
                                    <SelectItem key={pkg.id} value={pkg.id}>
                                      {pkg.name || pkg.packageName || pkg.id}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {editingQuotation?.transportSummary?.vehicles?.length >
                        0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select Vehicle
                          </Label>
                          <Select
                            value={
                              editingQuotation?.transportSummary
                                ?.selectedVehicle?.type || ""
                            }
                            onValueChange={(val) => {
                              const vehicle =
                                editingQuotation.transportSummary.vehicles.find(
                                  (v) => v.type === val
                                );
                              if (vehicle) handleVehicleChange(vehicle);
                            }}
                          >
                            <SelectTrigger className="border-gray-300 dark:border-gray-600">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {editingQuotation.transportSummary.vehicles.map(
                                (v, i) => (
                                  <SelectItem key={i} value={v.type}>
                                    {v.type} - ₹{v.price ?? v.perKmprice}{" "}
                                    {v.ac ? "(AC)" : "(Non-AC)"}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {selectedTransportStateId && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Current Package
                            </Label>
                            <p className="font-semibold text-gray-900 dark:text-white mt-2">
                              {editingQuotation?.transportSummary
                                ?.packageName || "—"}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                            <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              AC Status
                            </Label>
                            <p className="font-semibold text-gray-900 dark:text-white mt-2 flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  editingQuotation?.transportSummary?.ac
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                              ></span>
                              {editingQuotation?.transportSummary?.ac
                                ? "Available"
                                : "Not Available"}
                            </p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                              Vehicle Cost
                            </Label>
                            <p className="font-bold text-2xl text-blue-600 dark:text-blue-400 mt-2">
                              ₹
                              {editingQuotation?.transportSummary?.totalPrice ||
                                0}
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
            <TabsContent value="activities" className="p-6 space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Add New Activity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select State
                        </Label>
                        <Select
                          value={SelectedDestination}
                          onValueChange={setSelectedDestination}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {AllDestinations.map((state) => (
                              <SelectItem key={state.name} value={state.name}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Select Activity
                        </Label>
                        <div className="flex gap-3">
                          <Select
                            value={selectedActivityToAdd}
                            onValueChange={setSelectedActivityToAdd}
                            disabled={
                              !SelectedDestination || isFetchingActivities
                            }
                          >
                            <SelectTrigger className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                              <SelectValue
                                placeholder={
                                  isFetchingActivities
                                    ? "Loading..."
                                    : "Choose activity..."
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableActivities.map((act) => (
                                <SelectItem key={act.name} value={act.name}>
                                  {act.name} ({act.city}) - ₹
                                  {act.fitRatePerPerson ||
                                    act.groupRatePerPerson}
                                  /person
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            onClick={handleAddActivity}
                            disabled={!selectedActivityToAdd}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {editingQuotation?.activitySummary?.length > 0 ? (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableHead className="font-semibold text-gray-900 dark:text-white">
                          Activity
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900 dark:text-white">
                          Participants
                        </TableHead>
                        <TableHead className="text-right font-semibold text-gray-900 dark:text-white">
                          Total Price
                        </TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingQuotation.activitySummary.map(
                        (activity, index) => (
                          <TableRow
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              <div>
                                <p className="text-gray-900 dark:text-white">
                                  {activity.name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {activity.city}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={activity.participants || 1}
                                onChange={(e) =>
                                  handleActivitySummaryChange(
                                    index,
                                    "participants",
                                    e.target.value
                                  )
                                }
                                className="w-24 border-gray-300 dark:border-gray-600"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-purple-600 dark:text-purple-400">
                                ₹{(activity.totalPrice || 0).toFixed(0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveActivity(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <ActivitySquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    No activities added yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Add activities to enhance the travel experience
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Pricing Summary */}
        <Card className="shadow-lg border-gray-200 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <IndianRupee className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label
                  htmlFor="markup"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Add Markup (₹)
                </Label>
                <Input
                  id="markup"
                  type="number"
                  placeholder="e.g. 5000"
                  value={editingQuotation?.markup || 0}
                  onChange={(e) => handleMarkupInputChange(e.target.value)}
                  className="text-lg border-gray-300 dark:border-gray-600"
                />
              </div>

              <div className="flex flex-col justify-center items-end bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                  Grand Total
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  ₹
                  {(editingQuotation?.grandTotal || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Inclusive of all charges
                </p>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Hotel Cost
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ₹
                  {editingQuotation?.hotelSummary
                    ?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0)
                    ?.toLocaleString("en-IN") || "0"}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Transport Cost
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  ₹
                  {(editingQuotation?.transportSummary?.pricingType === "perKm"
                    ? (editingQuotation.transportSummary?.perKmprice || 0) *
                      (editingQuotation.transportSummary?.kms || 0)
                    : editingQuotation?.transportSummary?.price ||
                      0
                  ).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Activities Cost
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Save as New Quotation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="newPackageName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Package Name
              </Label>
              <Input
                id="newPackageName"
                value={newPackageName}
                onChange={(e) => setNewPackageName(e.target.value)}
                placeholder="Summer Special Goa 2025"
                className="border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="newCustomerName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Customer Name
              </Label>
              <Input
                id="newCustomerName"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="John Doe"
                className="border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveAsModal(false)}
              className="border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveAs}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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
