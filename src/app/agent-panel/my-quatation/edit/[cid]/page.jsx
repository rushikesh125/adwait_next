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
import { getLeadsByAgent } from "@/firebase/leadsService";

const EditQuotationPage = () => {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, loading: authLoading } = useSelector((state) => state.auth);

  // ────────────────────────────────────────────────
  // State
  // ────────────────────────────────────────────────
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(true);
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
  const [saveAsLeadId, setSaveAsLeadId] = useState("");
  const [agentLeads, setAgentLeads] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // ────────────────────────────────────────────────
  // Helper Functions
  // ────────────────────────────────────────────────

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
            pricing.extraChild > 0 ||
            pricing.cnb > 0)
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
      numDouble = 0,
      numExtraAdult = 0,
      numExtraChild = 0,
      numCNB = 0,
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
    if (!pricing) return 0;

    const doublePrice = (pricing.double || 0) * numDouble;
    const adultPrice = (pricing.extraAdult || 0) * numExtraAdult;
    const childPrice = (pricing.extraChild || 0) * numExtraChild;
    const cnbPrice   = (pricing.cnb   || 0) * numCNB;

    return (doublePrice + adultPrice + childPrice + cnbPrice) * nights;
  }, []);

 const recalculateGrandTotal = useCallback((data) => {

  let hotelTotal =
    data.hotelSummary?.reduce((sum, h) => sum + (h.hotelTotal || 0), 0) || 0;

  let transportTotal =
    data.transportSummary?.totalTransportCost || 0;

  const activityTotal =
    data.activitySummary?.reduce((sum, a) => sum + (a.totalPrice || 0), 0) || 0;

  const markup = data.markup || 0;

  return hotelTotal + transportTotal + activityTotal + markup;

}, []);

  // ────────────────────────────────────────────────
  // Fetch Logic
  // ────────────────────────────────────────────────

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
          const quotationData = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data(),
          };
          setEditingQuotation(quotationData);

          if (quotationData.hotelSummary?.length > 0) {
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
  }, [params.cid, user?.uid, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelsSnap, destSnap, transSnap] = await Promise.all([
          getDocs(collection(db, "hotels")),
          getDocs(collection(db, "locations")),
          getDocs(collection(db, "transport")),
        ]);

        setAllHotels(hotelsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAllDestinations(destSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTransportStates(transSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching supporting data:", err);
      }
    };

    fetchData();
  }, []);


 const fetchTransportPackages = async (stateId) => {
  try {
    const ref = collection(db, "transport", stateId, "packages");
    const snap = await getDocs(ref);

    setAvailableTransportPackagesForSelectedState(
      snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
    );
  } catch (err) {
    console.error("Transport packages fetch error:", err);
  }
}; 
useEffect(() => {
  if (!editingQuotation) return;

  if (isFirstEdit) {
    setSelectedTransportStateId(editingQuotation?.transportSummary?.state || "");
    setToggleValue(editingQuotation?.transportSummary?.isCustom || false);
    setisFirstEdit(false);
  }

  // Fetch activities
  const currentState = SelectedDestination;

  if (currentState && currentState !== "N/A") {
    const fetchActs = async () => {
      setIsFetchingActivities(true);
      try {
        const q = query(collection(db, "activities"), where("state", "==", currentState));
        const snap = await getDocs(q);
        setAvailableActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Activities fetch error:", err);
      } finally {
        setIsFetchingActivities(false);
      }
    };

    fetchActs();
  } else {
    setAvailableActivities([]);
  }

  // Fetch transport packages
  if (selectedTransportStateId) {
    fetchTransportPackages(selectedTransportStateId);
  }

}, [editingQuotation, SelectedDestination, selectedTransportStateId, isFirstEdit]);

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingQuotation((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
setToggleValue(prev => !prev)
}

  const handleAddHotel = () => {
    if (!selectedHotelToAdd) {
      toast.error("Please select a hotel.");
      return;
    }

    const newHotel = allHotels.find((h) => h.id === selectedHotelToAdd);
    if (!newHotel) return;

    const alreadyAdded = editingQuotation.hotelSummary?.some(
      (h) => h.hotel === newHotel.name,
    );
    if (alreadyAdded) {
      toast.error(`${newHotel.name} is already added.`);
      return;
    }

    const entry = {
      hotel: newHotel.name,
      city: newHotel.city,
      state: newHotel.state,
      nights: 1,
      numDouble: 1,
      numExtraAdult: 0,
      numExtraChild: 0,
      numCNB: 0,
      checkInDate: new Date().toISOString().split("T")[0],
      selectedRoomCategory: newHotel.rooms?.[0]?.categoryName || "",
      selectedMealPlan: "EP",
      hotelTotal: 0,
    };

    entry.hotelTotal = calculateHotelPrice(entry, newHotel);

    setEditingQuotation((prev) => {
      const hotels = [...(prev.hotelSummary || []), entry];
      const updated = { ...prev, hotelSummary: hotels };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });

    setSelectedHotelToAdd("");
  };

  const handleRemoveHotel = (idx) => {
    if (editingQuotation.hotelSummary.length <= 1) {
      toast.error("Quotation must have at least one hotel.");
      return;
    }

    setEditingQuotation((prev) => {
      const hotels = prev.hotelSummary.filter((_, i) => i !== idx);
      const updated = { ...prev, hotelSummary: hotels };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleHotelChange = (index, hotelId) => {
    const hotel = allHotels.find((h) => h.id === hotelId);
    if (!hotel) return;

    setEditingQuotation((prev) => {
      const hotels = [...prev.hotelSummary];
      const old = hotels[index];

      const updatedEntry = {
        ...old,
        hotel: hotel.name,
        city: hotel.city,
        state: hotel.state,
        selectedRoomCategory: hotel.rooms?.[0]?.categoryName || "",
        selectedMealPlan: "EP",
        numDouble: 1,
        numExtraAdult: 0,
        numExtraChild: 0,
        numCNB: 0,
      };

      updatedEntry.hotelTotal = calculateHotelPrice(updatedEntry, hotel);
      hotels[index] = updatedEntry;

      const updated = { ...prev, hotelSummary: hotels };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleHotelSummaryChange = (index, field, value) => {
    setEditingQuotation((prev) => {
      const hotels = JSON.parse(JSON.stringify(prev.hotelSummary));

      const numericFields = [
        "nights",
        "numDouble",
        "numExtraAdult",
        "numExtraChild",
        "numCNB",
      ];

      hotels[index][field] = numericFields.includes(field)
        ? parseInt(value, 10) || 0
        : value;

      // Handle check-in / nights chain update
      if (field === "nights" || field === "checkInDate") {
        for (let i = index; i < hotels.length; i++) {
          let checkIn = hotels[i].checkInDate;
          if (i > index) {
            checkIn = hotels[i - 1].checkOutDate;
            hotels[i].checkInDate = checkIn;
          }

          const nights = parseInt(hotels[i].nights, 10) || 1;
          const out = new Date(checkIn);
          out.setDate(out.getDate() + nights);
          hotels[i].checkOutDate = out.toISOString().split("T")[0];
        }
      }

      // Meal plan fallback
      if (field === "selectedRoomCategory") {
        const entry = hotels[index];
        const hData = allHotels.find(
          (h) => h.name === entry.hotel && h.city === entry.city,
        );
        if (hData) {
          const plans = getAvailableMealPlans(entry);
          if (!plans.includes(entry.selectedMealPlan)) {
            entry.selectedMealPlan = plans[0] || "EP";
          }
        }
      }

      // Recalculate all prices
      const updatedHotels = hotels.map((entry) => {
        const data = allHotels.find(
          (h) =>
            h.name === entry.hotel &&
            h.city === entry.city &&
            h.state === entry.state,
        );
        const price = data ? calculateHotelPrice(entry, data) : 0;
        return { ...entry, hotelTotal: price };
      });

      const updated = { ...prev, hotelSummary: updatedHotels };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleTransportSummaryChange = (field, value) => {
  setEditingQuotation((prev) => {

    const updatedTransport = {
      ...prev.transportSummary,
      [field]: value
    };

    const isPerKmPricing = updatedTransport.pricingType === "perKm";
    const total = isPerKmPricing
      ? (updatedTransport.vehicleCost || 0) +
        (updatedTransport.driverAllowance || 0) +
        (updatedTransport.tollCharges || 0) +
        (updatedTransport.permitCharges || 0) +
        (updatedTransport.otherCharges || 0)
      : (updatedTransport.vehicleCost || 0);

    if (!isPerKmPricing) {
      updatedTransport.driverAllowance = 0;
      updatedTransport.tollCharges = 0;
      updatedTransport.permitCharges = 0;
      updatedTransport.otherCharges = 0;
    }

    updatedTransport.totalTransportCost = total;

    const updated = {
      ...prev,
      transportSummary: updatedTransport
    };

    return {
      ...updated,
      grandTotal: recalculateGrandTotal(updated)
    };
  });
};

  const handlePackageChange = (e) => {
    const pkgId = e.target.value;
    const pkg = availableTransportPackagesForSelectedState.find((p) => p.id === pkgId);
    if (!pkg || !pkg.vehicles?.length) {
      toast.error("Invalid package or no vehicles.");
      return;
    }

    const vehicle = pkg.vehicles[0];

    setEditingQuotation((prev) => {
      const trans = {
        ...prev.transportSummary,
        id: pkg.id,
        packageName: pkg.name || "Unnamed Package",
        pricingType: pkg.pricingType,
        vehicles: pkg.vehicles,
        isCustom: false,
        selectedVehicle: vehicle,
        vehicleName: vehicle.type,
        price: vehicle.price ?? 0,
        perKmprice: vehicle.perKmprice ?? 0,
        ac: vehicle.ac ?? false,
        totalPrice: vehicle.price ?? vehicle.perKmprice ?? 0,
        state: selectedTransportStateId,
      };

      if (pkg.pricingType !== "perKm") {
        trans.vehicleCost = vehicle.price ?? 0;
        trans.driverAllowance = 0;
        trans.tollCharges = 0;
        trans.permitCharges = 0;
        trans.otherCharges = 0;
        trans.totalTransportCost = vehicle.price ?? 0;
      }

      const updated = { ...prev, transportSummary: trans };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleVehicleChange = (vehicle) => {
    setEditingQuotation((prev) => {
      const trans = {
        ...prev.transportSummary,
        selectedVehicle: vehicle,
        vehicleName: vehicle.type,
        price: vehicle.price ?? 0,
        perKmprice: vehicle.perKmprice ?? 0,
        ac: vehicle.ac ?? false,
        totalPrice:
  prev.transportSummary.pricingType === "perKm"
    ? vehicle.perKmprice ?? 0
    : vehicle.price ?? 0  
      };

      if (prev.transportSummary.pricingType !== "perKm") {
        trans.vehicleCost = vehicle.price ?? 0;
        trans.driverAllowance = 0;
        trans.tollCharges = 0;
        trans.permitCharges = 0;
        trans.otherCharges = 0;
        trans.totalTransportCost = vehicle.price ?? 0;
      }

      const updated = { ...prev, transportSummary: trans };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleAddActivity = () => {
    if (!selectedActivityToAdd) {
      toast.error("Please select an activity.");
      return;
    }

    const already = editingQuotation.activitySummary?.some(
      (a) => a.name === selectedActivityToAdd,
    );
    if (already) {
      toast.error("Activity already added.");
      return;
    }

    const act = availableActivities.find((a) => a.name === selectedActivityToAdd);
    if (!act) return;

    const newAct = {
      name: act.name,
      city: act.city,
      state: act.state,
      fitRatePerPerson: act.fitRatePerPerson || 0,
      groupRatePerPerson: act.groupRatePerPerson || 0,
      participants: 1,
      totalPrice:
        act.fitRatePerPerson || act.groupRatePerPerson || 0,
    };

    setEditingQuotation((prev) => {
      const acts = [...(prev.activitySummary || []), newAct];
      const updated = { ...prev, activitySummary: acts };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });

    setSelectedActivityToAdd("");
  };

  const handleRemoveActivity = (idx) => {
    setEditingQuotation((prev) => {
      const acts = prev.activitySummary.filter((_, i) => i !== idx);
      const updated = { ...prev, activitySummary: acts };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleActivitySummaryChange = (index, field, value) => {
    setEditingQuotation((prev) => {
      const acts = [...prev.activitySummary];
      const act = { ...acts[index] };

      if (field === "participants") {
        const count = parseInt(value, 10) || 0;
        act.participants = count;
        const rate =
          count > 10 ? act.groupRatePerPerson : act.fitRatePerPerson;
        act.totalPrice = (rate || 0) * count;
      }

      acts[index] = act;

      const updated = { ...prev, activitySummary: acts };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleMarkupInputChange = (value) => {
    const markup = parseFloat(value) || 0;
    setEditingQuotation((prev) => {
      const updated = { ...prev, markup };
      return {
        ...updated,
        grandTotal: recalculateGrandTotal(updated),
      };
    });
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return toast.error("No quotation to update.");

    const agentId = user?.uid;
    if (!agentId) return toast.error("Not logged in.");

    try {
      const ref = doc(
        db,
        "saved_packages_by_agents",
        agentId,
        "packages",
        editingQuotation.id,
      );
      await updateDoc(ref, editingQuotation);
      toast.success("Quotation updated!");
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    }
  };

  const handleSaveAs = () => {
    setNewPackageName(`Copy of ${editingQuotation.packageName || "Quotation"}`);
    setNewCustomerName(editingQuotation.customerName || editingQuotation.leadName || "");
    setSaveAsLeadId(editingQuotation.leadId || "");
    if (user?.uid) {
      setIsLoadingLeads(true);
      getLeadsByAgent(user.uid)
        .then(setAgentLeads)
        .catch(() => {})
        .finally(() => setIsLoadingLeads(false));
    }
    setShowSaveAsModal(true);
  };

  const handleConfirmSaveAs = async () => {
    if (!newPackageName.trim() || !newCustomerName.trim()) {
      return toast.error("Name fields required.");
    }

    const agentId = user?.uid;
    if (!agentId) return toast.error("Not logged in.");

    const copy = { ...editingQuotation };
    delete copy.id;
    copy.packageName = newPackageName.trim();
    copy.customerName = newCustomerName.trim();
    copy.createdAt = new Date();

    if (saveAsLeadId) {
      const lead = agentLeads.find((l) => l.id === saveAsLeadId);
      copy.leadId = saveAsLeadId;
      copy.leadName = lead?.name || newCustomerName.trim();
      if (lead?.customerId) copy.customerId = lead.customerId;
    } else {
      delete copy.leadId;
      delete copy.leadName;
    }

    try {
      await addDoc(
        collection(db, "saved_packages_by_agents", agentId, "packages"),
        copy,
      );
      toast.success("New quotation saved!");
      setShowSaveAsModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Save failed.");
    }
  };

  if (isLoadingQuotation || !editingQuotation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-theme-primary"></div>
          <p className="mt-6 text-lg text-slate-600">Loading quotation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-theme-muted pb-20">
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow border border-slate-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/agent-panel/my-quatation")}
                className="rounded-xl hover:bg-slate-100"
              >
                <ArrowLeft className="h-5 w-5 text-theme-primary" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Edit Quotation
                </h1>
                <p className="text-slate-600 mt-1">
                  {editingQuotation.customerName || editingQuotation.leadName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleSaveAs}
                className="border-slate-300 hover:bg-slate-50"
              >
                <Copy className="mr-2 h-4 w-4" />
                Save As New
              </Button>
              <Button
                onClick={handleUpdateQuotation}
                className="bg-theme-primary hover:bg-theme-primary/90 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Customer Info */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-3">
                <User className="h-5 w-5 text-theme-primary" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    name="customerName"
                    value={
                      editingQuotation?.customerName ||
                      editingQuotation?.leadName ||
                      ""
                    }
                    onChange={handleEditChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingQuotation?.status || "Draft"}
                    onValueChange={(v) =>
                      handleEditChange({ target: { name: "status", value: v } })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Tabs defaultValue="hotels" className="w-full">
              {/* Tab Headers */}
              <div className="border-b bg-white px-4 sm:px-6 overflow-x-auto">
                <TabsList className="bg-transparent h-14 p-0 gap-2 inline-flex">
                  <TabsTrigger
                    value="hotels"
                    className="relative px-6 py-3 text-sm font-medium transition-all data-[state=active]:text-theme-primary data-[state=active]:shadow-sm rounded-t-lg hover:text-theme-primary"
                  >
                    Hotels
                    {editingQuotation?.hotelSummary?.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs rounded-full">
                        {editingQuotation.hotelSummary.length}
                      </span>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="transport"
                    className="relative px-6 py-3 text-sm font-medium transition-all data-[state=active]:text-theme-primary data-[state=active]:shadow-sm rounded-t-lg hover:text-theme-primary"
                  >
                    Transport
                    {editingQuotation?.transportSummary?.vehicleName && (
                      <span className="ml-2 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="activities"
                    className="relative px-6 py-3 text-sm font-medium transition-all data-[state=active]:text-theme-primary data-[state=active]:shadow-sm rounded-t-lg hover:text-theme-primary"
                  >
                    Activities
                    {editingQuotation?.activitySummary?.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs rounded-full">
                        {editingQuotation.activitySummary.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ─── HOTELS TAB ─── */}
              <TabsContent value="hotels" className="p-6 sm:p-8 space-y-8">
                {/* Add Hotel Section */}
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Destination</Label>
                          <Select
                            value={SelectedDestination}
                            onValueChange={setSelectedDestination}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                            <SelectContent>
                              {AllDestinations.map((d) => (
                                <SelectItem key={d.name} value={d.name}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Hotel</Label>
                          <div className="flex gap-2">
                            <Select
                              value={selectedHotelToAdd}
                              onValueChange={setSelectedHotelToAdd}
                              disabled={!SelectedDestination}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select hotel" />
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
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hotels Table */}
                {editingQuotation?.hotelSummary?.length > 0 ? (
                  <div className="border rounded-2xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="pl-6">Hotel</TableHead>
                          <TableHead>Room Type</TableHead>
                          <TableHead>Nights</TableHead>
                          <TableHead>Rooms</TableHead>
                          <TableHead>Extra Adults</TableHead>
                          <TableHead>Extra Children</TableHead>
                          <TableHead>CNB</TableHead>
                          <TableHead>Meal Plan</TableHead>
                          <TableHead className="text-right pr-6">Price</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingQuotation.hotelSummary.map((hotel, idx) => {
                          const data = allHotels.find(
                            (h) => h.name === hotel.hotel && h.state === hotel.state,
                          );
                          return (
                            <TableRow key={idx}>
                              <TableCell className="pl-6">
                                <Select
                                  value={data?.id || ""}
                                  onValueChange={(v) => handleHotelChange(idx, v)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allHotels
                                      .filter((h) => h.state === hotel.state)
                                      .map((h) => (
                                        <SelectItem key={h.id} value={h.id}>
                                          {h.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={hotel.selectedRoomCategory || ""}
                                  onValueChange={(v) =>
                                    handleHotelSummaryChange(idx, "selectedRoomCategory", v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {data?.rooms?.map((r) => (
                                      <SelectItem key={r.categoryName} value={r.categoryName}>
                                        {r.categoryName}
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
                                    handleHotelSummaryChange(idx, "nights", e.target.value)
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numDouble || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(idx, "numDouble", e.target.value)
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numExtraAdult || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(idx, "numExtraAdult", e.target.value)
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numExtraChild || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(idx, "numExtraChild", e.target.value)
                                  }
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  value={hotel.numCNB || 0}
                                  onChange={(e) =>
                                    handleHotelSummaryChange(idx, "numCNB", e.target.value)
                                  }
                                  className="w-20"
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={hotel.selectedMealPlan || "EP"}
                                  onValueChange={(v) =>
                                    handleHotelSummaryChange(idx, "selectedMealPlan", v)
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailableMealPlans(hotel).map((p) => (
                                      <SelectItem key={p} value={p}>
                                        {p}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right pr-6 font-medium">
                                ₹{(hotel.hotelTotal || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveHotel(idx)}
                                  disabled={editingQuotation.hotelSummary.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed">
                    <Hotel className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-medium text-slate-900">
                      No hotels added yet
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Add your first hotel using the section above.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ─── TRANSPORT TAB ─── */}
       
                          <TabsContent value="transport" className="p-6 sm:p-8 space-y-6">

                          {/* TRANSPORT SUMMARY CARD */}
                          <Card className="border-slate-200 shadow-sm">
                          <CardHeader className="bg-slate-50 border-b">
                          <CardTitle>Transport Summary</CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-4">

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                          <div>
                          <Label className="text-xs text-slate-500">Vehicle</Label>
                          <p className="font-medium mt-1">
                          {editingQuotation?.transportSummary?.vehicleName || "-"}
                          {editingQuotation?.transportSummary?.ac ? " (AC)" : ""}
                          </p>
                          </div>

                          <div>
                          <Label className="text-xs text-slate-500">Total Transport Cost</Label>
                          <p className="font-bold text-theme-primary text-lg mt-1">
                          ₹{editingQuotation?.transportSummary?.totalTransportCost || 0}
                          </p>
                          </div>

                          <div>
                          <Label className="text-xs text-slate-500">Package</Label>
                          <p className="font-medium mt-1">
                          {editingQuotation?.transportSummary?.packageName || "Custom"}
                          </p>
                          </div>

                          </div>

                          </CardContent>
                          </Card>


                          {/* EDIT TRANSPORT CARD */}
                          <Card className="border-slate-200 shadow-sm">
                          <CardHeader className="bg-slate-50 border-b">
                          <CardTitle>Add / Edit Transport</CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-6">

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          <div>
                          <Label>Vehicle Name</Label>
                          <Input
                          value={editingQuotation?.transportSummary?.vehicleName || ""}
                          onChange={(e)=>
                          handleTransportSummaryChange("vehicleName", e.target.value)
                          }
                          />
                          </div>

                          <div className="flex items-center gap-2 pt-6">
                          <Switch
                          checked={editingQuotation?.transportSummary?.ac || false}
                          onCheckedChange={(val)=>handleTransportSummaryChange("ac", val)}
                          />
                          <Label>AC Vehicle</Label>
                          </div>

                          </div>


                          {editingQuotation?.transportSummary?.pricingType === "perKm" ? (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">

                          <div>
                          <Label className="text-xs">Vehicle Cost</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.vehicleCost || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("vehicleCost", Number(e.target.value) || 0)
                          }
                          />
                          </div>

                          <div>
                          <Label className="text-xs">Driver Allowance</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.driverAllowance || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("driverAllowance", Number(e.target.value) || 0)
                          }
                          />
                          </div>

                          <div>
                          <Label className="text-xs">Toll Charges</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.tollCharges || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("tollCharges", Number(e.target.value) || 0)
                          }
                          />
                          </div>

                          <div>
                          <Label className="text-xs">Permit Charges</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.permitCharges || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("permitCharges", Number(e.target.value) || 0)
                          }
                          />
                          </div>

                          <div>
                          <Label className="text-xs">Other Charges</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.otherCharges || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("otherCharges", Number(e.target.value) || 0)
                          }
                          />
                          </div>

                          </div>
                          ) : (
                          <div>
                          <Label className="text-xs">Total Transport Cost</Label>
                          <Input
                          type="number"
                          value={editingQuotation?.transportSummary?.vehicleCost || editingQuotation?.transportSummary?.totalTransportCost || 0}
                          onChange={(e)=>
                          handleTransportSummaryChange("vehicleCost", Number(e.target.value) || 0)
                          }
                          />
                          </div>
                          )}

                          </CardContent>
                          </Card>

                          </TabsContent>

              {/* ─── ACTIVITIES TAB ─── */}
              <TabsContent value="activities" className="p-4 sm:p-8 space-y-8">
                {/* Add Activity Form */}
                <div className="bg-white border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-theme-primary/10 rounded-2xl">
                      <Plus className="h-6 w-6 text-theme-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Add Activity</h3>
                      <p className="text-sm text-slate-500">
                        Enhance the trip with local experiences
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select
                        value={SelectedDestination}
                        onValueChange={setSelectedDestination}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {AllDestinations.map((d) => (
                            <SelectItem key={d.name} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Activity</Label>
                      <div className="flex gap-3">
                        <Select
                          value={selectedActivityToAdd}
                          onValueChange={setSelectedActivityToAdd}
                          disabled={!SelectedDestination || isFetchingActivities}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue
                              placeholder={
                                isFetchingActivities
                                  ? "Loading activities..."
                                  : "Select activity"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableActivities.map((a) => (
                              <SelectItem key={a.name} value={a.name}>
                                {a.name} ({a.city}) – ₹
                                {a.fitRatePerPerson || a.groupRatePerPerson}/person
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          onClick={handleAddActivity}
                          disabled={!selectedActivityToAdd}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activities List */}
                {editingQuotation?.activitySummary?.length > 0 ? (
                  <div className="border rounded-2xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="pl-6">Activity</TableHead>
                          <TableHead>Participants</TableHead>
                          <TableHead className="text-right pr-6">Total</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingQuotation.activitySummary.map((act, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="pl-6">
                              <div className="font-medium">{act.name}</div>
                              <div className="text-sm text-slate-500">{act.city}</div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={act.participants || 1}
                                onChange={(e) =>
                                  handleActivitySummaryChange(idx, "participants", e.target.value)
                                }
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium pr-6">
                              ₹{act.totalPrice?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveActivity(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed">
                    <ActivitySquare className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-medium">No activities added</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Use the form above to add local experiences.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Pricing Summary */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="flex items-center gap-3">
                <IndianRupee className="h-5 w-5 text-amber-600" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label>Markup (₹)</Label>
                  <Input
                    type="number"
                    value={editingQuotation?.markup || 0}
                    onChange={(e) => handleMarkupInputChange(e.target.value)}
                  />
                </div>

                <div className="flex flex-col items-end justify-center">
                  <p className="text-sm text-slate-500">Grand Total</p>
                  <p className="text-4xl font-bold text-theme-primary mt-2">
                    ₹{editingQuotation?.grandTotal?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 pt-6 border-t">
                <div>
                  <p className="text-sm text-slate-500">Hotels</p>
                  <p className="text-xl font-bold mt-1">
                    ₹
                    {editingQuotation?.hotelSummary
                      ?.reduce((s, h) => s + (h.hotelTotal || 0), 0)
                      ?.toLocaleString() || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Transport</p>
                  <p className="text-xl font-bold mt-1">
                    ₹
                   { (editingQuotation?.transportSummary?.totalTransportCost || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Activities</p>
                  <p className="text-xl font-bold mt-1">
                    ₹
                    {editingQuotation?.activitySummary
                      ?.reduce((s, a) => s + (a.totalPrice || 0), 0)
                      ?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save As Modal */}
        <Dialog open={showSaveAsModal} onOpenChange={setShowSaveAsModal}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Save as New Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>New Package Name</Label>
                <Input
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  placeholder="Summer Special Goa 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Lead <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
                <Select value={saveAsLeadId || "none"} onValueChange={(v) => setSaveAsLeadId(v === "none" ? "" : v)} disabled={isLoadingLeads}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingLeads ? "Loading leads..." : "Select a lead..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No lead —</SelectItem>
                    {agentLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}{lead.destination ? ` · ${lead.destination}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Linking associates this quotation with a lead for tracking.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveAsModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmSaveAs}>Save New Quotation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EditQuotationPage;
