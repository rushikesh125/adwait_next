"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAgentPermissions } from "@/app/hooks/useAgentPermissions";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedTransport,
  setSelectedActivities,
  setConfirmedMarkup,
  setPackageName,
  setCustomerName,
  setPackageContext,
  setEditingQuotation,
  clearEditingQuotation,
} from "@/store/packageSlice";
import toast from "react-hot-toast";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import { copyPackageSummary } from "@/lib/copyPackageSummary";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Hotel,
  Car,
  Palmtree,
  Plus,
  Trash2,
  Edit3,
  Wallet,
  FileText,
  Copy,
  CheckCircle,
  IndianRupee,
  Save,
  Star,
  PenLine,
  X,
  BedDouble,
  Utensils,
  Users,
  BusFront,
  Moon,
  Sun,
  Activity,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  PackagePlus,
  AlertCircle,
  UserPlus,
  Search,
  Link2,
} from "lucide-react";
import ItinerarySection from "./ItinerarySection";
import { generateQuotationRef } from "@/firebase/quotationRef";
import { getLeadsByAgent } from "@/firebase/leadsService";

import HotelRoomSelector from "@/components/package/HotelRoomSelector";
import CustomHotelForm from "@/components/package/CustomHotelForm";
import TransportSelector from "@/components/package/TransportSelector";
import ActivitySelector from "@/components/package/ActivitySelector";
import TransportSummaryCard from "@/components/package/TransportSummaryCard";
import ActivitySummaryCard from "@/components/package/ActivitySummaryCard";
import HotelItineraryCard from "@/components/package/HotelItineraryCard";
import {
  MEAL_PLANS,
  calcCustomHotelNightPrice,
  formatDate,
  renderStars,
  EMPTY_PRICING,
} from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_OPTIONS = 4;

const createEmptyOption = (id, name = "") => ({
  id,
  name: name || `Option ${id}`,
  hotelEntries: [],
  checkInDate: "",
  checkOutDate: "",
  nights: 1,
  selectedState: "",
  selectedHotelId: null,
  showCustomHotelForm: false,
  isReadyToAddAnother: false,
  editingIndex: null,
  roomCategory: "",
  mealPlan: "",
  currentHotelTotal: 0,
  guests: { numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 },
  saveChanges: false,
  markup: null, // ← per-option resolved markup in ₹ (null = not yet applied)
});

// ─── Validation helpers ───────────────────────────────────────────────────────
const validateOptions = (options) => {
  // Check each option has at least one hotel
  for (const opt of options) {
    if (!opt.hotelEntries || opt.hotelEntries.length === 0) {
      return {
        valid: false,
        error: `"${opt.name}" must have at least one hotel selected.`,
      };
    }
  }

  // Check for duplicate names
  const names = options.map((o) => o.name.trim().toLowerCase());
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    return { valid: false, error: "Option name must be unique." };
  }

  // Check option uniqueness: no two options with same hotels AND same dates
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const a = options[i];
      const b = options[j];
      const aHotels = (a.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}`)
        .sort()
        .join(",");
      const bHotels = (b.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}`)
        .sort()
        .join(",");
      const aDates = (a.hotelEntries || [])
        .map((h) => `${h.checkInDate}|${h.checkOutDate}`)
        .sort()
        .join(",");
      const bDates = (b.hotelEntries || [])
        .map((h) => `${h.checkInDate}|${h.checkOutDate}`)
        .sort()
        .join(",");
      const aMeals = (a.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}|${h.selectedMealPlan}`)
        .sort()
        .join(",");
      const bMeals = (b.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}|${h.selectedMealPlan}`)
        .sort()
        .join(",");
      if (aHotels === bHotels && aDates === bDates && aMeals === bMeals) {
        return {
          valid: false,
          error: `"${a.name}" and "${b.name}": Options must differ in hotel, dates, or meal plan.`,
        };
      }
    }
  }

  return { valid: true };
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Create_new_package = ({
  userData,
  checkInDate: propCheckInDate,
  setCheckInDate: propSetCheckInDate,
  saveChanges: propSaveChanges,
  setSaveChanges: propSetSaveChanges,
  checkOutDate: propCheckOutDate,
  setCheckOutDate: propSetCheckOutDate,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const {
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName: reduxCustomerName,
    editingQuotation,
  } = useSelector((state) => state.package);

  const quotationId = searchParams.get("quotationId");
  const isEditMode = !!quotationId;
  const customerId =
    searchParams.get("customerId") || searchParams.get("customerid");
  const leadId = searchParams.get("leadId");

  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

  // ── Package Options State ───────────────────────────────────────────────────
  const [packageOptions, setPackageOptions] = useState([
    createEmptyOption(1, "Option 1"),
  ]);
  const [activeOptionId, setActiveOptionId] = useState(1);
  const [nextOptionId, setNextOptionId] = useState(2);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Shared State (Transport, Activities, Markup, Itinerary) ───────────────
  const [itineraryData, setItineraryData] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [states, setStates] = useState([]);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [tollCharges, setTollCharges] = useState(0);
  const [permitCharges, setPermitCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [minKm, setMinKm] = useState(300);
  const [editableBaseCost, setEditableBaseCost] = useState(null);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [showSaveModal, _setShowSaveModal] = useState(false);
  const setShowSaveModal = (v) => {
    if (!v) {
      setCustomerSearchText("");
      setShowCustomerDropdown(false);
      setShowInlineCreateCustomer(false);
    }
    if (v && isEditMode && user?.uid) {
      setSaveAsLeadId(leadId || "");
      setIsLoadingLeads(true);
      getLeadsByAgent(user.uid)
        .then(setAgentLeads)
        .catch(() => {})
        .finally(() => setIsLoadingLeads(false));
    }
    _setShowSaveModal(v);
  };
  const [customerName, setCustomerName] = useState("");
  const [optionValidationError, setOptionValidationError] = useState("");
  // ── Customer linking in save modal ────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerLink, setSelectedCustomerLink] = useState(null);
  const [showInlineCreateCustomer, setShowInlineCreateCustomer] =
    useState(false);
  const [newCustomerDraft, setNewCustomerDraft] = useState({
    name: "",
    mobile: "",
    email: "",
  });
  // ── Lead linking in save modal (edit/clone mode) ──────────────────────────
  const [agentLeads, setAgentLeads] = useState([]);
  const [saveAsLeadId, setSaveAsLeadId] = useState("");
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  const { hasPermission, loading: permissionsLoading } = useAgentPermissions(
    user?.uid,
  );
  const canUseItineraryAI =
    !permissionsLoading && hasPermission("itinerary_ai");

  // ── Active Option helpers ──────────────────────────────────────────────────
  const activeOption =
    packageOptions.find((o) => o.id === activeOptionId) || packageOptions[0];

  const updateActiveOption = useCallback(
    (updater) => {
      setPackageOptions((prev) =>
        prev.map((opt) =>
          opt.id === activeOptionId
            ? typeof updater === "function"
              ? updater(opt)
              : { ...opt, ...updater }
            : opt,
        ),
      );
    },
    [activeOptionId],
  );

  // Convenience destructures from active option
  const {
    hotelEntries,
    checkInDate,
    checkOutDate,
    nights,
    selectedState,
    selectedHotelId,
    showCustomHotelForm,
    isReadyToAddAnother,
    editingIndex,
    roomCategory,
    mealPlan,
    currentHotelTotal,
    guests,
  } = activeOption;

  const setCheckInDate = (v) => updateActiveOption({ checkInDate: v });
  const setCheckOutDate = (v) => updateActiveOption({ checkOutDate: v });
  const setNights = (v) => updateActiveOption({ nights: v });
  const setSelectedState = (v) =>
    updateActiveOption({
      selectedState: v,
      selectedHotelId: null,
      showCustomHotelForm: false,
    });
  const setSelectedHotelId = (v) => updateActiveOption({ selectedHotelId: v });
  const setShowCustomHotelForm = (v) =>
    updateActiveOption({ showCustomHotelForm: v });
  const setIsReadyToAddAnother = (v) =>
    updateActiveOption({ isReadyToAddAnother: v });
  const setEditingIndex = (v) => updateActiveOption({ editingIndex: v });
  const setRoomCategory = (v) => updateActiveOption({ roomCategory: v });
  const setMealPlan = (v) => updateActiveOption({ mealPlan: v });
  const setCurrentHotelTotal = (v) =>
    updateActiveOption({ currentHotelTotal: v });
  const setGuests = (v) => updateActiveOption({ guests: v });

  // ── Hotel dispatch-like helpers for per-option storage ─────────────────────
  const addHotelEntryToOption = (entry) => {
    updateActiveOption((opt) => ({
      ...opt,
      hotelEntries: [...opt.hotelEntries, entry],
    }));
  };
  const updateHotelEntryInOption = (index, data) => {
    updateActiveOption((opt) => {
      const updated = [...opt.hotelEntries];
      updated[index] = data;
      return { ...opt, hotelEntries: updated };
    });
  };
  const deleteHotelEntryFromOption = (index) => {
    updateActiveOption((opt) => ({
      ...opt,
      hotelEntries: opt.hotelEntries.filter((_, i) => i !== index),
    }));
  };

  // ── Sync propCheckInDate/propCheckOutDate with active option ───────────────
  useEffect(() => {
    if (propCheckInDate !== undefined && propCheckInDate !== checkInDate) {
      updateActiveOption({ checkInDate: propCheckInDate });
    }
  }, [propCheckInDate]);

  // ── Load customers for linking in save modal ──────────────────────────────
  useEffect(() => {
    getDocs(collection(db, "customers")).then((snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const customerSuggestions = useMemo(() => {
    const term = customerSearchText.trim().toLowerCase();
    if (!term) return [];
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.mobile?.includes(customerSearchText.trim()),
      )
      .slice(0, 8);
  }, [customers, customerSearchText]);

  // Active leads for the selected customer (used in lead selector dropdown)
  const leadsForSelectedCustomer = useMemo(() => {
    if (!selectedCustomerLink) return agentLeads;
    return agentLeads.filter(
      (l) =>
        l.customerId === selectedCustomerLink.id &&
        !["Closed Won", "Closed Lost"].includes(l.status),
    );
  }, [agentLeads, selectedCustomerLink]);

  // Auto-select the latest active lead when customer changes
  useEffect(() => {
    if (!isEditMode || !selectedCustomerLink || agentLeads.length === 0) return;
    const active = agentLeads.filter(
      (l) =>
        l.customerId === selectedCustomerLink.id &&
        !["Closed Won", "Closed Lost"].includes(l.status),
    );
    if (active.length === 0) {
      setSaveAsLeadId("");
      return;
    }
    const latest = [...active].sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    )[0];
    setSaveAsLeadId(latest.id);
  }, [selectedCustomerLink, agentLeads]);

  // ── Init / Load Data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (reduxCustomerName && !customerName) setCustomerName(reduxCustomerName);
  }, [reduxCustomerName]);

  useEffect(() => {
    if (!customerId) return;
    getDoc(doc(db, "customers", customerId)).then((snap) => {
      if (snap.exists()) setCustomerName(snap.data().name);
    });
  }, [customerId]);

  useEffect(() => {
    if (!leadId) return;
    getDoc(doc(db, "leads", leadId)).then((snap) => {
      if (snap.exists()) setCustomerName(snap.data().name);
    });
  }, [leadId]);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isEditMode || !editingQuotation || hydratedRef.current) return;
    hydratedRef.current = true;
    const q = editingQuotation;

    // Hydrate package options
    if (q.packageOptions?.length) {
      const hydrated = q.packageOptions.map((po, idx) => ({
        ...createEmptyOption(idx + 1, po.name || `Option ${idx + 1}`),
        hotelEntries: po.hotelEntries || [],
        checkInDate: po.hotelEntries?.[0]?.checkInDate || "",
        checkOutDate: po.hotelEntries?.[0]?.checkOutDate || "",
      }));
      setPackageOptions(hydrated);
      setNextOptionId(hydrated.length + 1);
    } else if (q.hotelSummary?.length) {
      // Legacy single-option
      setPackageOptions([
        {
          ...createEmptyOption(1, "Option 1"),
          hotelEntries: q.hotelSummary,
          checkInDate: q.hotelSummary[0]?.checkInDate || "",
          checkOutDate: q.hotelSummary[0]?.checkOutDate || "",
        },
      ]);
    }

    if (q.transportSummary) {
      const t = q.transportSummary;
      dispatch(
        setSelectedTransport({
          name: t.packageName || "Custom",
          pricingType: t.pricingType || "fixed",
          isCustom: t.isCustom || false,
          selectedVehicle: {
            type: t.vehicleName || "",
            ac: t.ac ?? false,
            price: t.vehicleCost || 0,
            perKmprice: t.perKmprice || 0,
            isCustom: t.isCustom || false,
            driverAllowance: t.driverAllowance || 0,
          },
        }),
      );
      setMinKm(t.minKm || 300);
      setTollCharges(t.tollCharges || 0);
      setPermitCharges(t.permitCharges || 0);
      setOtherCharges(t.otherCharges || 0);
      if (t.vehicleCost) setEditableBaseCost(t.vehicleCost);
    }
    if (q.activitySummary?.length) {
      const totalPrice = q.activitySummary.reduce(
        (s, a) => s + (a.totalPrice || 0),
        0,
      );
      dispatch(
        setSelectedActivities({ activities: q.activitySummary, totalPrice }),
      );
    }
    if (q.markup) dispatch(setConfirmedMarkup(q.markup));
    dispatch(setPackageName(q.packageName || ""));
    setCustomerName(q.customerName || q.leadName || "");
    if (q.itinerarySummary) setItineraryData(q.itinerarySummary);
    dispatch(clearEditingQuotation());
  }, [isEditMode, editingQuotation]);

  useEffect(() => {
    getDocs(collection(db, "hotels")).then((snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        rooms: d.data().rooms || [],
      }));
      const unique = [
        ...new Map(
          list.map((h) => [
            `${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`,
            h,
          ]),
        ).values(),
      ];
      setHotels(unique);
    });
    getDocs(collection(db, "locations")).then((snap) =>
      setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, []);

  // Auto-calculate checkout date
  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    updateActiveOption({ checkOutDate: d.toISOString().split("T")[0] });
  }, [checkInDate, nights, activeOptionId]);

  // Keep redux context in sync (use all options combined for context)
  useEffect(() => {
    const allHotels = packageOptions.flatMap((o) => o.hotelEntries);
    dispatch(
      setPackageContext({
        hotelEntries: allHotels,
        selectedTransport,
        selectedActivities,
        selectedState,
        checkInDate,
        checkOutDate,
        packageName,
        customerName,
      }),
    );
  }, [
    packageOptions,
    selectedTransport,
    selectedActivities,
    selectedState,
    checkInDate,
    checkOutDate,
    packageName,
    customerName,
  ]);

  // ── Filtered/Grouped Hotels ───────────────────────────────────────────────
  const filteredHotels = useMemo(
    () =>
      hotels.filter(
        (h) => h.state?.toLowerCase() === selectedState.toLowerCase(),
      ),
    [hotels, selectedState],
  );
  const groupedHotels = useMemo(
    () =>
      filteredHotels.reduce((acc, h) => {
        const c = h.city || "Other";
        if (!acc[c]) acc[c] = [];
        acc[c].push(h);
        return acc;
      }, {}),
    [filteredHotels],
  );

  const selectedHotelData = hotels.find((h) => h.id === selectedHotelId);

  // ── Per-option hotel totals ───────────────────────────────────────────────
  const getOptionHotelTotal = (opt) =>
    (opt.hotelEntries || []).reduce((s, e) => s + Number(e.hotelTotal || 0), 0);

  const hotelTotalPrice = getOptionHotelTotal(activeOption);

  // ── Transport breakdown (shared) ─────────────────────────────────────────
  const transportBreakdown = useMemo(() => {
    if (!selectedTransport?.selectedVehicle) return null;
    const vehicle = selectedTransport.selectedVehicle;
    // Use all options combined nights for transport
    const totalNights =
      packageOptions[0]?.hotelEntries?.reduce(
        (sum, e) => sum + (Number(e.nights) || 0),
        0,
      ) || 0;
    const days = totalNights > 0 ? totalNights + 1 : 1;
    const perKm = Number(vehicle.perKmprice || 0);
    const lumpsum = Number(vehicle.price || 0);
    const allowancePerDay = Number(vehicle.driverAllowance || 0);

    if (perKm > 0) {
      const calculatedBaseCost = Number(minKm || 0) * perKm * days;
      const baseCost =
        editableBaseCost !== null
          ? Number(editableBaseCost)
          : calculatedBaseCost;
      const driverAllowance = allowancePerDay * days;
      const toll = Math.max(0, Number(tollCharges || 0));
      const permit = Math.max(0, Number(permitCharges || 0));
      const other = Math.max(0, Number(otherCharges || 0));
      return {
        baseCost,
        driverAllowance,
        toll,
        permit,
        other,
        total: baseCost + driverAllowance + toll + permit + other,
        isPerKm: true,
      };
    }
    if (lumpsum > 0) {
      return {
        baseCost: lumpsum,
        driverAllowance: 0,
        toll: 0,
        permit: 0,
        other: 0,
        total: lumpsum,
        isPerKm: false,
      };
    }
    return null;
  }, [
    selectedTransport,
    packageOptions,
    minKm,
    editableBaseCost,
    tollCharges,
    permitCharges,
    otherCharges,
  ]);

  const transportTotalPrice = transportBreakdown?.total || 0;

  // Grand total per option
   const getOptionGrandTotal = (opt) => {
    // Use per-option markup if stored, else shared confirmedMarkup
    const optMarkup = typeof opt.markup === "number" ? opt.markup : confirmedMarkup;
    return getOptionHotelTotal(opt) + transportTotalPrice + activityTotalPrice + optMarkup;
  };

  const grandTotal = getOptionGrandTotal(activeOption);

  // ── Option Management ─────────────────────────────────────────────────────
  const handleAddOption = () => {
    if (packageOptions.length >= MAX_OPTIONS) {
      toast.error(`Maximum ${MAX_OPTIONS} package options allowed.`);
      return;
    }
    const newId = nextOptionId;
    setPackageOptions((prev) => [
      ...prev,
      createEmptyOption(newId, `Option ${newId}`),
    ]);
    setNextOptionId((n) => n + 1);
    setActiveOptionId(newId);
    setOptionValidationError("");
  };

  const handleRemoveOption = (id) => {
    if (packageOptions.length <= 1) {
      toast.error("At least one package option is required.");
      return;
    }
    setPackageOptions((prev) => prev.filter((o) => o.id !== id));
    if (activeOptionId === id) {
      setActiveOptionId(
        packageOptions.find((o) => o.id !== id)?.id || packageOptions[0].id,
      );
    }
    setOptionValidationError("");
  };

  const handleStartRename = (opt) => {
    setRenamingId(opt.id);
    setRenameValue(opt.name);
  };

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Option name cannot be empty.");
      return;
    }
    const duplicate = packageOptions.some(
      (o) =>
        o.id !== renamingId &&
        o.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error("Option name must be unique.");
      return;
    }
    setPackageOptions((prev) =>
      prev.map((o) => (o.id === renamingId ? { ...o, name: trimmed } : o)),
    );
    setRenamingId(null);
    setRenameValue("");
  };

  // ── Hotel handlers ────────────────────────────────────────────────────────
  const handleSaveHotel = () => {
    if (!selectedHotelData) {
      alert("Please select a hotel.");
      return;
    }
    if (!mealPlan) {
      alert("Please select a meal plan.");
      return;
    }
    const entry = {
      checkInDate,
      nights,
      checkOutDate,
      state: selectedState,
      hotel: selectedHotelData.name,
      city: selectedHotelData.city,
      GoogleListingURL: selectedHotelData.GoogleListingURL || null,
      numDouble: guests.numDouble,
      numExtraAdult: guests.numExtraAdult,
      numExtraChild: guests.numExtraChild,
      numCNB: guests.numCNB,
      hotelTotal: currentHotelTotal,
      selectedMealPlan: mealPlan,
      selectedRoomCategory: roomCategory,
      isCustom: false,
    };
    if (editingIndex !== null) {
      updateHotelEntryInOption(editingIndex, entry);
    } else {
      addHotelEntryToOption(entry);
    }
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
    setEditingIndex(null);
  };

  const handleEditHotel = (index) => {
    const entry = hotelEntries[index];
    updateActiveOption({
      selectedState: entry.state,
      checkInDate: entry.checkInDate,
      nights: entry.nights,
      selectedHotelId:
        hotels.find((h) => h.name === entry.hotel && h.city === entry.city)
          ?.id || null,
      editingIndex: index,
    });
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleAddAnotherHotel = () => {
    updateActiveOption({
      checkInDate: checkOutDate,
      selectedState: "",
      selectedHotelId: null,
      nights: 1,
      roomCategory: "",
      mealPlan: "",
      guests: { numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 },
      currentHotelTotal: 0,
      isReadyToAddAnother: false,
      editingIndex: null,
      showCustomHotelForm: false,
    });
    setSaveChanges(false);
  };

  const handleCustomHotelAdd = (data) => {
    addHotelEntryToOption(data);
    setShowCustomHotelForm(false);
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
  };

  const handleActivitiesDone = (activities, total) => {
    dispatch(setSelectedActivities({ activities, totalPrice: total }));
  };

 const handleApplyMarkup = () => {
    if (markupType === "percentage") {
      // Compute and store individual markup on every option
      setPackageOptions((prev) =>
        prev.map((opt) => {
          const hotelTotal = (opt.hotelEntries || []).reduce(
            (s, e) => s + Number(e.hotelTotal || 0),
            0,
          );
          const base = hotelTotal + transportTotalPrice + activityTotalPrice;
          const resolved = (markupAmount / 100) * base;
          return { ...opt, markup: resolved };
        }),
      );
      // Also store a representative value in Redux (first option) for UI display
      const firstOptTotal = getOptionHotelTotal(packageOptions[0]);
      const firstBase = firstOptTotal + transportTotalPrice + activityTotalPrice;
      dispatch(setConfirmedMarkup((markupAmount / 100) * firstBase));
    } else {
      // Lumpsum: same for all — clear per-option markup and store in Redux
      setPackageOptions((prev) => prev.map((opt) => ({ ...opt, markup: null })));
      dispatch(setConfirmedMarkup(Number(markupAmount)));
    }
  };

   const handleCopyToClipboard = () =>
    copyPackageSummary({
      packageOptions,
      selectedTransport,
      selectedActivities,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      markupType,
      markupAmount,
      hotels,
    });
 

  const handleExportToPDF = () =>
    exportPackagePDF({
      packageOptions,
      selectedTransport,
      selectedActivities,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      markupType,
      markupAmount,
      customerName,
      packageName,
      itineraryData,
    });

  // ── Save Package ──────────────────────────────────────────────────────────
  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (!customerName.trim()) {
      alert("Please enter a customer name.");
      return;
    }

    // Validate options
    const validation = validateOptions(packageOptions);
    if (!validation.valid) {
      setOptionValidationError(validation.error);
      toast.error(validation.error);
      return;
    }
    setOptionValidationError("");

    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Not logged in");
      const effectiveLeadId = isEditMode ? saveAsLeadId || null : leadId;
      const linkedLead = effectiveLeadId
        ? agentLeads.find((l) => l.id === effectiveLeadId)
        : null;
      const c_data = customerId
        ? { customerId, customerName }
        : selectedCustomerLink
          ? {
              customerId: selectedCustomerLink.id,
              customerName: selectedCustomerLink.name,
            }
          : effectiveLeadId
            ? {
                leadId: effectiveLeadId,
                leadName: customerName,
                ...(linkedLead?.customerId
                  ? { customerId: linkedLead.customerId }
                  : {}),
              }
            : { customerName };
      const refNumber = await generateQuotationRef();

      // Build packageOptions summary for storage
      const packageOptionsSummary = packageOptions.map((opt) => ({
        name: opt.name,
        hotelEntries: opt.hotelEntries,
        hotelTotal: getOptionHotelTotal(opt),
        grandTotal: getOptionGrandTotal(opt),
      }));
      const cleanedItinerary =
        itineraryData && Array.isArray(itineraryData.days)
          ? {
              ...itineraryData,
              days: itineraryData.days.filter(
                (day) =>
                  day.title?.trim() ||
                  day.description?.trim() ||
                  (day.images && day.images.length > 0) ||
                  (day.activityIds && day.activityIds.length > 0),
              ),
            }
          : null;

      // Legacy hotelSummary = first option's hotels (for backwards compat)
      const firstOptionHotels = packageOptions[0]?.hotelEntries || [];

      await addDoc(
        collection(doc(db, "saved_packages_by_agents", agentId), "packages"),
        {
          packageName,
          ...c_data,
          status: "Draft",
          refNumber,
          createdAt: serverTimestamp(),
          markup: confirmedMarkup || 0,
          grandTotal: getOptionGrandTotal(packageOptions[0]) || 0,
          // Multi-option storage
          packageOptions: packageOptionsSummary,
          // Legacy compat
          hotelSummary: firstOptionHotels,
          activitySummary: selectedActivities,
          transportSummary: selectedTransport
            ? {
                packageName: selectedTransport.name || "Custom",
                vehicleName: selectedTransport.selectedVehicle?.type || "",
                seats: selectedTransport.selectedVehicle?.seating || "",
                ac: selectedTransport.selectedVehicle?.ac || false,
                pricingType: selectedTransport.pricingType || "fixed",
                perKmprice: selectedTransport.selectedVehicle?.perKmprice || 0,
                minKm: minKm || 0,
                vehicleCost: transportBreakdown?.baseCost || 0,
                driverAllowance: transportBreakdown?.driverAllowance || 0,
                tollCharges: transportBreakdown?.toll || 0,
                permitCharges: transportBreakdown?.permit || 0,
                otherCharges: transportBreakdown?.other || 0,
                totalTransportCost: transportBreakdown?.total || 0,
                isCustom: selectedTransport.selectedVehicle?.isCustom || false,
              }
            : null,
          itinerarySummary:
            cleanedItinerary && cleanedItinerary.days.length > 0
              ? cleanedItinerary
              : null,
        },
      );
      toast(
        isEditMode
          ? "Saved as new quotation! ✅"
          : "Package saved successfully! ✅",
      );
      router.back();
      setShowSaveModal(false);
      dispatch(setPackageName(""));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save: " + err.message);
    }
  };

  const allHotelEntries = packageOptions.flatMap((o) => o.hotelEntries);
  const showRightPanel =
    selectedActivities.length > 0 ||
    allHotelEntries.length > 0 ||
    selectedTransport;

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-6 xl:gap-8">
          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex-1 space-y-4 lg:pr-2 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            {/* Edit mode banner */}
            {isEditMode && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Editing a copy — saving will create a{" "}
                  <strong>new quotation with a new reference number</strong>.
                  The original stays unchanged.
                </span>
              </div>
            )}

            {/* ── Package Options Tabs ────────────────────────────────────── */}
            {/* ── Package Options Section ────────────────────────────────────── */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-theme-primary" />
                    <CardTitle className="text-lg font-semibold">
                      Package Options
                    </CardTitle>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {packageOptions.length}/{MAX_OPTIONS}
                    </span>
                  </div>

                  <Button
                    onClick={handleAddOption}
                    disabled={packageOptions.length >= MAX_OPTIONS}
                    variant="outline"
                    size="sm"
                    className="text-theme-primary border-theme-primary hover:bg-theme-primary/5"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Option
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {packageOptions.map((opt) => {
                    const isActive = activeOptionId === opt.id;
                    const hotelCount = opt.hotelEntries?.length || 0;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => setActiveOptionId(opt.id)}
                        className={`
              group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
              ${
                isActive
                  ? "border-theme-primary bg-theme-primary/5 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }
            `}
                      >
                        {/* Option Name */}
                        <div className="flex-1 min-w-0">
                          {renamingId === opt.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmRename();
                                if (e.key === "Escape") {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              onBlur={handleConfirmRename}
                              className="w-full bg-transparent font-medium text-sm focus:outline-none border-b border-theme-primary"
                            />
                          ) : (
                            <div
                              className="font-medium text-sm truncate"
                              onDoubleClick={() => handleStartRename(opt)}
                            >
                              {opt.name}
                            </div>
                          )}
                        </div>

                        {/* Hotels Count */}
                        <div
                          className={`text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1 ${
                            hotelCount > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Hotel className="h-3.5 w-3.5" />
                          {hotelCount}
                        </div>

                        {/* Total */}

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(opt);
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                          </button>
                          {packageOptions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOption(opt.id);
                              }}
                              className="p-1.5 hover:bg-red-50 rounded-lg  text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Active Indicator */}
                        {isActive && (
                          <div className="w-2 h-2 bg-theme-primary rounded-full" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Messages */}
                {optionValidationError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {optionValidationError}
                  </div>
                )}

                {packageOptions.length >= MAX_OPTIONS && (
                  <p className="mt-4 text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Maximum {MAX_OPTIONS} options allowed
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── 1. Date + Nights + State ── */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-theme-primary" />{" "}
                      Check-in
                    </Label>
                    <Input
                      type="date"
                      value={checkInDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Moon className="h-3 w-3 text-theme-primary" /> Nights
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={nights ?? ""}
                      onChange={(e) =>{const val = e.target.value;
                    setNights(val === "" ? "" : Number(val))}}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Sun className="h-3 w-3 text-theme-primary" /> Check-out
                    </Label>
                    <Input
                      type="date"
                      value={checkOutDate}
                      readOnly
                      className="h-8 text-xs bg-slate-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-theme-primary" /> State
                    </Label>
                    <Select
                      value={selectedState}
                      onValueChange={(v) => setSelectedState(v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── 2. Hotel Selection ── */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-theme-primary" />
                    Hotels in{" "}
                    <span className="text-theme-primary">{selectedState}</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      — for {activeOption.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                        <Hotel className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs">
                        No hotels found in {selectedState}.
                      </p>
                      <Button
                        onClick={() => setShowCustomHotelForm(true)}
                        className="bg-theme-primary hover:bg-theme-secondary"
                        size="sm"
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1.5" /> Add Custom
                        Hotel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`${selectedHotelData && !showCustomHotelForm ? "grid grid-cols-1 lg:grid-cols-2 gap-3" : ""}`}
                      >
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                            {Object.keys(groupedHotels).map((city) => (
                              <div key={city} className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-theme-secondary px-1">
                                  📍 {city}
                                </p>
                                {groupedHotels[city].map((h) => (
                                  <label
                                    key={h.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                      selectedHotelId === h.id
                                        ? "border-theme-primary bg-theme-primary/5"
                                        : "border-slate-100 hover:border-theme-primary/30 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`hotel-${activeOptionId}`}
                                      value={h.id}
                                      checked={selectedHotelId === h.id}
                                      onChange={() => {
                                        setSelectedHotelId(h.id);
                                        setShowCustomHotelForm(false);
                                      }}
                                      className="accent-theme-primary flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-slate-800 truncate">
                                        {h.name}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                                        <span className="text-[9px] text-slate-500">
                                          {h.GoogleReviewRating || "N/A"} ·{" "}
                                          {h.city}
                                        </span>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomHotelForm((p) => !p)}
                              className="text-xs h-7 border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
                            >
                              <PenLine className="h-3 w-3 mr-1" />
                              {showCustomHotelForm
                                ? "Hide Custom Form"
                                : "Add Custom Hotel"}
                            </Button>
                          </div>
                        </div>

                        {selectedHotelData && !showCustomHotelForm && (
                          <div className="border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Hotel className="h-3.5 w-3.5 text-theme-primary" />
                              {selectedHotelData.name}
                              <span className="text-slate-400 font-normal">
                                — {selectedHotelData.city}
                              </span>
                            </p>
                            <HotelRoomSelector
                              hotel={selectedHotelData}
                              checkInDate={checkInDate}
                              nights={nights}
                              onTotalChange={setCurrentHotelTotal}
                              onRoomCategoryChange={setRoomCategory}
                              onMealPlanChange={setMealPlan}
                              onGuestsChange={setGuests}
                              initial={
                                editingIndex !== null
                                  ? hotelEntries[editingIndex]
                                  : {}
                              }
                            />
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <Button
                                onClick={handleSaveHotel}
                                className="bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                                size="sm"
                              >
                                {editingIndex !== null
                                  ? "✏️ Update Hotel"
                                  : "💾 Save Hotel"}
                              </Button>
                              {isReadyToAddAnother && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddAnotherHotel}
                                  className="text-xs h-8 border-theme-primary text-theme-primary hover:bg-theme-primary/5"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                  Another Hotel
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {showCustomHotelForm && (
                    <CustomHotelForm
                      defaultState={selectedState}
                      onAdd={handleCustomHotelAdd}
                      onCancel={() => setShowCustomHotelForm(false)}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── 3. Hotel Itinerary for active option ── */}
            {hotelEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-bold text-slate-800">
                      {activeOption.name} — Hotels
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {hotelEntries.length} hotel
                        {hotelEntries.length > 1 ? "s" : ""}
                      </span>
                    </h3>
                  </div>
                  <span className="text-sm font-black text-theme-primary">
                    ₹{hotelTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="space-y-2">
                  {hotelEntries.map((entry, idx) => (
                    <HotelItineraryCard
                      key={idx}
                      entry={entry}
                      index={idx}
                      onEdit={handleEditHotel}
                      onDelete={(i) => deleteHotelEntryFromOption(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── 4. Transport + Activities (shared across options) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transport */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-theme-primary" /> Transport
                    <span className="text-[10px] font-normal text-slate-400">
                      (shared)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {selectedTransport?.selectedVehicle && (
                    <TransportSummaryCard
                      transport={selectedTransport}
                      totalPrice={transportTotalPrice}
                      transportBreakdown={transportBreakdown}
                      minKm={minKm}
                      setMinKm={setMinKm}
                      tollCharges={tollCharges}
                      setTollCharges={setTollCharges}
                      permitCharges={permitCharges}
                      setPermitCharges={setPermitCharges}
                      otherCharges={otherCharges}
                      setOtherCharges={setOtherCharges}
                      editableBaseCost={editableBaseCost}
                      setEditableBaseCost={setEditableBaseCost}
                      onEdit={() => setShowTransportSection(true)}
                    />
                  )}
                  {!showTransportSection &&
                  !selectedTransport?.selectedVehicle ? (
                    <Button
                      onClick={() => setShowTransportSection(true)}
                      className="w-full bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                      size="sm"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Transport
                    </Button>
                  ) : showTransportSection ? (
                    <div className="mt-1">
                      <TransportSelector
                        onTransportSelect={(t) => {
                          dispatch(setSelectedTransport(t));
                          setShowTransportSection(false);
                        }}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Activities */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palmtree className="h-4 w-4 text-theme-primary" />{" "}
                    Activities
                    <span className="text-[10px] font-normal text-slate-400">
                      (shared)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {selectedActivities.length > 0 && (
                    <ActivitySummaryCard
                      activities={selectedActivities}
                      totalPrice={activityTotalPrice}
                      onEdit={() => setShowActivitiesSection(true)}
                    />
                  )}
                  {!showActivitiesSection && selectedActivities.length === 0 ? (
                    <Button
                      onClick={() => setShowActivitiesSection(true)}
                      className="w-full bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                      size="sm"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Activities
                    </Button>
                  ) : showActivitiesSection ? (
                    <div className="space-y-2 mt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          State for Activities
                        </Label>
                        <Select
                          value={selectedState}
                          onValueChange={setSelectedState}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedState && (
                        <ActivitySelector
                          selectedState={selectedState}
                          initialActivities={selectedActivities}
                          onDone={handleActivitiesDone}
                        />
                      )}
                      {selectedActivities.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowActivitiesSection(false)}
                          className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Done —
                          Collapse
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivitiesSection(true)}
                      className="text-xs h-7 border-theme-primary/40 text-theme-primary"
                    >
                      <PenLine className="h-3 w-3 mr-1" /> Edit Activities
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── 5. Itinerary ── */}
            {allHotelEntries.length > 0 && (
              <ItinerarySection
                hotelEntries={allHotelEntries}
                selectedState={selectedState}
                itineraryData={itineraryData}
                setItineraryData={setItineraryData}
                onChange={(data) => setItineraryData(data)}
                canUseAI={canUseItineraryAI}
              />
            )}
          </div>

          {/* ══ RIGHT COLUMN — Sticky Pricing Panel ══════════════════════ */}
          {showRightPanel && (
            <div className="lg:w-80 xl:w-96 lg:min-w-[300px] lg:sticky lg:top-6 lg:self-start space-y-3 pt-4 lg:pt-0">
              {/* All Options Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-theme-primary" />{" "}
                    Package Options
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {packageOptions.map((opt) => {
                    const optHotelTotal = getOptionHotelTotal(opt);
                    const optGrandTotal = getOptionGrandTotal(opt);
                    const isActive = opt.id === activeOptionId;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setActiveOptionId(opt.id)}
                        className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                          isActive
                            ? "border-theme-primary bg-theme-primary/5"
                            : "border-slate-100 hover:border-theme-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold ${isActive ? "text-theme-primary" : "text-slate-700"}`}
                          >
                            {opt.name}
                          </span>
                          <span className="text-xs font-black text-theme-primary">
                            ₹
                            {optGrandTotal.toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        {opt.hotelEntries.length > 0 ? (
                          <div className="space-y-0.5">
                            {opt.hotelEntries.map((h, i) => (
                              <p
                                key={i}
                                className="text-[10px] text-slate-500 truncate"
                              >
                                🏨 {h.hotel} · {h.city} · {h.nights}N
                              </p>
                            ))}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span>
                                Hotels: ₹{optHotelTotal.toLocaleString("en-IN")}
                              </span>
                              {transportTotalPrice > 0 && (
                                <span>
                                  · Trans: ₹
                                  {transportTotalPrice.toLocaleString("en-IN")}
                                </span>
                              )}
                              {activityTotalPrice > 0 && (
                                <span>
                                  · Act: ₹
                                  {activityTotalPrice.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No hotels added
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Option Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">
                    {activeOption.name} — Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {hotelEntries.length}H · {selectedTransport ? "1T" : "0T"} ·{" "}
                    {selectedActivities.length}A
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    {
                      icon: <Hotel className="h-3 w-3 text-blue-600" />,
                      bg: "bg-blue-100",
                      label: `Hotels (${hotelEntries.length})`,
                      val: hotelTotalPrice,
                    },
                    {
                      icon: <Car className="h-3 w-3 text-indigo-600" />,
                      bg: "bg-indigo-100",
                      label: "Transport",
                      val: transportTotalPrice,
                    },
                    {
                      icon: <Palmtree className="h-3 w-3 text-emerald-600" />,
                      bg: "bg-emerald-100",
                      label: `Activities (${selectedActivities.length})`,
                      val: activityTotalPrice,
                    },
                  ].map(({ icon, bg, label, val }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div
                          className={`w-5 h-5 rounded-md ${bg} flex items-center justify-center`}
                        >
                          {icon}
                        </div>
                        {label}
                      </div>
                      <span className="font-semibold">
                        ₹
                        {val.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ))}
                  {confirmedMarkup > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                          <Wallet className="h-3 w-3 text-amber-600" />
                        </div>
                        Markup
                      </div>
                      <span className="font-semibold text-amber-600">
                        +₹
                        {confirmedMarkup.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Markup */}
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Wallet className="h-3.5 w-3.5 text-theme-primary" /> Add
                    Markup
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      value={markupAmount}
                      onChange={(e) => setMarkupAmount(Number(e.target.value))}
                      className="flex-1 text-xs h-8"
                      placeholder="0"
                    />
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger className="w-28 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lumpsum">Lumpsum (₹)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleApplyMarkup}
                      size="sm"
                      className="bg-theme-secondary hover:bg-theme-secondary/90 h-8 px-3 text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                  {confirmedMarkup > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Applied:{" "}
                      <span className="font-bold text-theme-dark">
                        ₹
                        {confirmedMarkup.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Grand Total (active option) */}
              <div className="relative overflow-hidden rounded-xl bg-theme-dark text-white shadow-xl">
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-4 w-4 opacity-70" />
                      <h3 className="text-sm font-bold">{activeOption.name}</h3>
                    </div>
                    {hotelEntries.length > 0 && (
                      <p className="text-[10px] text-white/50">
                        {hotelEntries.reduce(
                          (s, e) => s + (parseInt(e.nights) || 0),
                          0,
                        )}
                        N · {hotelEntries[0]?.numDouble || 0} room
                        {(hotelEntries[0]?.numDouble || 0) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <p className="text-4xl font-black tracking-tight mb-4">
                    ₹
                    {grandTotal.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full py-5 bg-theme-primary hover:bg-theme-secondary font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? "Save As New Quotation" : "Save Package"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      <Copy className="h-3 w-3" /> WhatsApp
                    </button>
                    <button
                      onClick={handleExportToPDF}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      <FileText className="h-3 w-3" /> Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Save Modal ══════════════════════════════════════════════════════ */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-theme-dark text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {isEditMode ? "Save As New Quotation" : "Finalize Package"}
                </h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-white/60 text-xs mt-0.5">
                {isEditMode
                  ? "A new quotation with a new reference number will be created"
                  : "Fill in details to save this package"}
              </p>
            </div>
            <div className="p-5 space-y-3">
              {isEditMode && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  Original quotation will not be modified
                </div>
              )}

              {/* Options summary */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                  Package Options
                </p>
                {packageOptions.map((opt) => {
                  const optGrandTotal = getOptionGrandTotal(opt);
                  return (
                    <div
                      key={opt.id}
                      className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-slate-700">
                          {opt.name}
                        </span>
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          {opt.hotelEntries.length} hotel
                          {opt.hotelEntries.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="font-bold text-theme-primary">
                        ₹{optGrandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {optionValidationError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {optionValidationError}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">Package Name *</Label>
                <Input
                  value={packageName}
                  onChange={(e) => dispatch(setPackageName(e.target.value))}
                  placeholder="e.g. Goa Delight 4N/5D"
                  className="h-8 text-xs"
                />
              </div>
              {/* Customer field: disabled if URL has customerId, searchable otherwise */}
              {customerId ? (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Customer Name *</Label>
                  <Input
                    value={customerName}
                    disabled
                    className="h-8 text-xs bg-slate-100 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400">
                    ✓ Auto-filled from customer record
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Customer *</Label>
                  {selectedCustomerLink ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-theme-primary/40 bg-theme-muted/20 text-xs">
                      <Link2 className="h-3 w-3 text-theme-primary shrink-0" />
                      <span className="flex-1 font-medium text-slate-800">
                        {selectedCustomerLink.name}
                      </span>
                      <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wide">
                        Linked
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerLink(null);
                          setCustomerName("");
                          setCustomerSearchText("");
                          setShowCustomerDropdown(false);
                        }}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                      <Input
                        value={customerSearchText || customerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomerSearchText(val);
                          setCustomerName(val);
                          setShowCustomerDropdown(val.length > 0);
                          setShowInlineCreateCustomer(false);
                        }}
                        onFocus={() => {
                          if ((customerSearchText || customerName).length > 0)
                            setShowCustomerDropdown(true);
                        }}
                        placeholder="Search by name or mobile..."
                        className="h-8 text-xs pl-8"
                      />
                      {showCustomerDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden mt-0.5">
                          {customerSuggestions.length > 0 ? (
                            <ul className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                              {customerSuggestions.map((c) => (
                                <li
                                  key={c.id}
                                  onMouseDown={() => {
                                    setSelectedCustomerLink({
                                      id: c.id,
                                      name: c.name,
                                    });
                                    setCustomerName(c.name);
                                    setCustomerSearchText("");
                                    setShowCustomerDropdown(false);
                                  }}
                                  className="flex items-center justify-between px-3 py-2 hover:bg-theme-muted/40 cursor-pointer"
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800">
                                      {c.name}
                                    </p>
                                    {c.mobile && (
                                      <p className="text-[10px] text-slate-400">
                                        {c.mobile}
                                      </p>
                                    )}
                                  </div>
                                  {c.city && (
                                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-500">
                                      {c.city}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-2 text-xs text-slate-400 italic">
                              No customers found
                            </p>
                          )}
                          <button
                            type="button"
                            onMouseDown={() => {
                              setNewCustomerDraft({
                                name: customerName,
                                mobile: "",
                                email: "",
                              });
                              setShowInlineCreateCustomer(true);
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-theme-primary hover:bg-theme-muted/30 border-t border-slate-100 font-medium"
                          >
                            <UserPlus className="h-3 w-3" /> Create new customer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {leadId && !selectedCustomerLink && (
                    <p className="text-[10px] text-slate-400">
                      ✓ Name auto-filled from lead. Optionally link to a
                      customer.
                    </p>
                  )}

                  {/* Inline create customer form */}
                  {showInlineCreateCustomer && (
                    <div className="border border-theme-primary/30 rounded-lg p-3 space-y-2 bg-slate-50 mt-1">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        New Customer
                      </p>
                      <Input
                        value={newCustomerDraft.name}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Full name *"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={newCustomerDraft.mobile}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            mobile: e.target.value,
                          }))
                        }
                        placeholder="Mobile"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={newCustomerDraft.email}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Email"
                        className="h-7 text-xs"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs bg-theme-primary hover:bg-theme-secondary flex-1"
                          onClick={async () => {
                            if (!newCustomerDraft.name.trim()) return;
                            try {
                              const ref = await addDoc(
                                collection(db, "customers"),
                                {
                                  ...newCustomerDraft,
                                  status: "New",
                                  date: new Date().toLocaleDateString(),
                                },
                              );
                              const newCust = {
                                id: ref.id,
                                ...newCustomerDraft,
                              };
                              setCustomers((prev) => [...prev, newCust]);
                              setSelectedCustomerLink({
                                id: ref.id,
                                name: newCustomerDraft.name,
                              });
                              setCustomerName(newCustomerDraft.name);
                              setShowInlineCreateCustomer(false);
                              toast.success("Customer created and linked");
                            } catch (err) {
                              toast.error("Failed to create customer");
                            }
                          }}
                        >
                          Save & Link
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowInlineCreateCustomer(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lead selector — only shown in edit/clone mode */}
              {isEditMode && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Link to Lead{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={saveAsLeadId || "none"}
                    onValueChange={(v) =>
                      setSaveAsLeadId(v === "none" ? "" : v)
                    }
                    disabled={isLoadingLeads}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue
                        placeholder={
                          isLoadingLeads
                            ? "Loading leads..."
                            : "Select a lead..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No lead —</SelectItem>
                      {leadsForSelectedCustomer.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                          {lead.destination ? ` · ${lead.destination}` : ""}
                          {lead.status ? ` (${lead.status})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    {selectedCustomerLink
                      ? `Showing active leads for ${selectedCustomerLink.name}.`
                      : "Linking associates this quotation with a lead for tracking."}
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePackage}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white px-5"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isEditMode ? "Save As New" : "Save Package"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create_new_package;
