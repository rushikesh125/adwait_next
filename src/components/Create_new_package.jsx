"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  addHotelEntry,
  updateHotelEntry,
  deleteHotelEntry,
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

// ── Modularised utilities (PDF + clipboard) ───────────────────────────────────
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
} from "lucide-react";
import ItinerarySection from "./ItinerarySection";
import { generateQuotationRef } from "@/firebase/quotationRef";

// ── Imported components ──────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// ── MAIN: Create_new_package ───────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
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
    hotelEntries,
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName: reduxCustomerName,
    editingQuotation, // ← new: from Redux
  } = useSelector((state) => state.package);

  // ── Edit mode detection ──────────────────────────────────────────────────
  const quotationId = searchParams.get("quotationId");
  const isEditMode = !!quotationId;

  // ── URL params ───────────────────────────────────────────────────────────
  const customerId =
    searchParams.get("customerId") || searchParams.get("customerid");
  const leadId = searchParams.get("leadId");

  // ── Prop bindings ────────────────────────────────────────────────────────
  const checkInDate = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

  // ── Local state ──────────────────────────────────────────────────────────
  const [itineraryData, setItineraryData] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [nights, setNights] = useState(1);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReadyToAddAnother, setIsReadyToAddAnother] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [showCustomHotelForm, setShowCustomHotelForm] = useState(false);
  const [tollCharges, setTollCharges] = useState(0);
  const [permitCharges, setPermitCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [minKm, setMinKm] = useState(300);
  const [editableBaseCost, setEditableBaseCost] = useState(null);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [roomCategory, setRoomCategory] = useState("");
  const [mealPlan, setMealPlan] = useState("");
  const [guests, setGuests] = useState({
    numDouble: 1,
    numExtraAdult: 0,
    numExtraChild: 0,
    numCNB: 0,
  });
  const [currentHotelTotal, setCurrentHotelTotal] = useState(0);

  // ── Customer name: Redux / Firestore fallbacks (unchanged) ───────────────
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

  // ── EDIT MODE: one-time hydration from Redux editingQuotation ────────────
  // ref-guard prevents double-fire in React StrictMode
  const hydratedRef = React.useRef(false);

  useEffect(() => {
    if (!isEditMode || !editingQuotation || hydratedRef.current) return;
    hydratedRef.current = true;

    const q = editingQuotation;

    // 1. Hotels
    if (q.hotelSummary?.length) {
      q.hotelSummary.forEach((h) => dispatch(addHotelEntry(h)));
    }

    // 2. Transport
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

    // 3. Activities
    if (q.activitySummary?.length) {
      const totalPrice = q.activitySummary.reduce(
        (s, a) => s + (a.totalPrice || 0),
        0,
      );
      dispatch(
        setSelectedActivities({ activities: q.activitySummary, totalPrice }),
      );
    }

    // 4. Markup
    if (q.markup) dispatch(setConfirmedMarkup(q.markup));

    // 5. Package name & customer
    dispatch(setPackageName(q.packageName || ""));
    setCustomerName(q.customerName || q.leadName || "");
    // 6. Itinerary (FIX)
    if (q.itinerarySummary) {
      setItineraryData(q.itinerarySummary);
    }
    // 6. Dates from first hotel entry
    const firstHotel = q.hotelSummary?.[0];
    if (firstHotel?.checkInDate) setCheckInDate(firstHotel.checkInDate);
    if (firstHotel?.checkOutDate) setCheckOutDate(firstHotel.checkOutDate);

    // 7. Clear from Redux — no longer needed
    dispatch(clearEditingQuotation());
  }, [isEditMode, editingQuotation]);
  // ────────────────────────────────────────────────────────────────────────

  // ── Static data fetch: hotels + states (unchanged) ───────────────────────
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

  // ── Auto-compute checkout date (unchanged) ────────────────────────────────
  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    setCheckOutDate(d.toISOString().split("T")[0]);
  }, [checkInDate, nights]);

  // ── Sync package context to Redux (unchanged) ─────────────────────────────
  useEffect(() => {
    dispatch(
      setPackageContext({
        hotelEntries,
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
    hotelEntries,
    selectedTransport,
    selectedActivities,
    selectedState,
    checkInDate,
    checkOutDate,
    packageName,
    customerName,
  ]);

  // ── Derived / computed values (unchanged) ─────────────────────────────────
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
  const hotelTotalPrice = hotelEntries.reduce(
    (s, e) => s + Number(e.hotelTotal || 0),
    0,
  );

  const transportBreakdown = useMemo(() => {
    if (!selectedTransport?.selectedVehicle) return null;
    const vehicle = selectedTransport.selectedVehicle;
    const totalNights = hotelEntries.reduce(
      (sum, e) => sum + (Number(e.nights) || 0),
      0,
    );
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
    hotelEntries,
    minKm,
    editableBaseCost,
    tollCharges,
    permitCharges,
    otherCharges,
  ]);

  const transportTotalPrice = transportBreakdown?.total || 0;
  const grandTotal =
    hotelTotalPrice +
    transportTotalPrice +
    activityTotalPrice +
    confirmedMarkup;

  // ── Handlers (all unchanged) ──────────────────────────────────────────────
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
      dispatch(updateHotelEntry({ index: editingIndex, data: entry }));
    } else {
      dispatch(addHotelEntry(entry));
    }
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
    setEditingIndex(null);
  };

  const handleEditHotel = (index) => {
    const entry = hotelEntries[index];
    setSelectedState(entry.state);
    setCheckInDate(entry.checkInDate);
    setNights(entry.nights);
    setSelectedHotelId(
      hotels.find((h) => h.name === entry.hotel && h.city === entry.city)?.id ||
        null,
    );
    setEditingIndex(index);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleAddAnotherHotel = () => {
    setCheckInDate(checkOutDate);
    setSelectedState("");
    setSelectedHotelId(null);
    setNights(1);
    setRoomCategory("");
    setMealPlan("");
    setGuests({ numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 });
    setCurrentHotelTotal(0);
    setSaveChanges(false);
    setIsReadyToAddAnother(false);
    setEditingIndex(null);
    setShowCustomHotelForm(false);
  };

  const handleCustomHotelAdd = (data) => {
    dispatch(addHotelEntry(data));
    setShowCustomHotelForm(false);
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
  };

  const handleActivitiesDone = (activities, total) => {
    dispatch(setSelectedActivities({ activities, totalPrice: total }));
  };

  const handleApplyMarkup = () => {
    const base = hotelTotalPrice + transportTotalPrice + activityTotalPrice;
    const markup =
      markupType === "percentage" ? (markupAmount / 100) * base : markupAmount;
    dispatch(setConfirmedMarkup(markup));
  };

  const handleCopyToClipboard = () =>
    copyPackageSummary({
      hotelEntries,
      selectedTransport,
      selectedActivities,
      grandTotal,
      hotels,
    });

  const handleExportToPDF = () =>
    exportPackagePDF({
      hotelEntries,
      selectedTransport,
      selectedActivities,
      grandTotal,
      customerName,
      packageName,
      itineraryData,
    });

  // ── SAVE: always addDoc + new ref number (create OR clone) ────────────────
  const handleSavePackage = async () => {
    if (!packageName.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (!customerName.trim()) {
      alert("Please enter a customer name.");
      return;
    }
    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Not logged in");

      const c_data = customerId
        ? { customerId, customerName }
        : leadId
          ? { leadId, leadName: customerName }
          : { customerName };

      // Always a brand-new ref number — whether creating or cloning
      const refNumber = await generateQuotationRef();

      await addDoc(
        collection(doc(db, "saved_packages_by_agents", agentId), "packages"),
        {
          packageName,
          ...c_data,
          status: "Draft",
          refNumber,
          createdAt: serverTimestamp(),
          markup: confirmedMarkup || 0,
          grandTotal: grandTotal || 0,
          hotelSummary: hotelEntries,
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
          itinerarySummary: itineraryData ?? null,
          // Audit trail: track which quotation this was cloned from
          ...(isEditMode && quotationId ? { clonedFromId: quotationId } : {}),
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

  const showRightPanel =
    selectedActivities.length > 0 ||
    hotelEntries.length > 0 ||
    selectedTransport;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 xl:gap-10">
          {/* ══ LEFT COLUMN ════════════════════════════════════════════════ */}
          <div className="flex-1 space-y-6 lg:pr-4 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            {/* ── Edit mode banner ─────────────────────────────────────────── */}
            {isEditMode && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  You're editing a copy of an existing quotation. Saving will
                  create a{" "}
                  <strong>new quotation with a new reference number</strong>.
                  The original will remain unchanged.
                </span>
              </div>
            )}

            {/* 1. Date + Nights + State */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5 font-medium">
                      <Calendar className="h-4 w-4 text-theme-primary" />{" "}
                      Check-in
                    </Label>
                    <Input
                      type="date"
                      value={checkInDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Moon className="h-4 w-4 text-theme-primary" /> Nights
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={nights}
                      onChange={(e) => setNights(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-theme-primary" /> Check-out
                    </Label>
                    <Input
                      type="date"
                      value={checkOutDate}
                      readOnly
                      className="bg-slate-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-theme-primary" />{" "}
                      Destination State
                    </Label>
                    <Select
                      value={selectedState}
                      onValueChange={(v) => {
                        setSelectedState(v);
                        setSelectedHotelId(null);
                        setShowCustomHotelForm(false);
                      }}
                    >
                      <SelectTrigger>
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

            {/* 2. Hotel Selection */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 sm:p-5 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-theme-primary" />
                    Hotels in{" "}
                    <span className="text-theme-primary">{selectedState}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-2 space-y-4">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Hotel className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">
                        No hotels found in {selectedState}.
                      </p>
                      <Button
                        onClick={() => setShowCustomHotelForm(true)}
                        className="bg-theme-primary hover:bg-theme-secondary"
                        size="sm"
                      >
                        <PenLine className="h-4 w-4 mr-2" /> Add Custom Hotel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                        {Object.keys(groupedHotels).map((city) => (
                          <div key={city} className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-theme-secondary px-1">
                              📍 {city}
                            </p>
                            {groupedHotels[city].map((h) => (
                              <label
                                key={h.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                                  selectedHotelId === h.id
                                    ? "border-theme-primary bg-theme-primary/5 shadow-sm"
                                    : "border-slate-100 hover:border-theme-primary/30 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="hotel"
                                  value={h.id}
                                  checked={selectedHotelId === h.id}
                                  onChange={() => {
                                    setSelectedHotelId(h.id);
                                    setShowCustomHotelForm(false);
                                  }}
                                  className="accent-theme-primary flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {h.name}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[10px] text-slate-500">
                                      {h.GoogleReviewRating || "N/A"}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      · {h.city}
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
                          className="text-xs border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
                        >
                          <PenLine className="h-3.5 w-3.5 mr-1" />
                          {showCustomHotelForm
                            ? "Hide Custom Form"
                            : "Add Custom Hotel"}
                        </Button>
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

            {/* 3. Room Selector (DB hotel) */}
            {selectedHotelData && !showCustomHotelForm && (
              <Card className="border-2 border-theme-primary/20 shadow-sm">
                <CardHeader className="p-3 sm:p-5 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-theme-primary" />
                    <div>
                      <span className="text-theme-dark">
                        {selectedHotelData.name}
                      </span>
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        — {selectedHotelData.city}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-0">
                  <HotelRoomSelector
                    hotel={selectedHotelData}
                    checkInDate={checkInDate}
                    nights={nights}
                    onTotalChange={setCurrentHotelTotal}
                    onRoomCategoryChange={setRoomCategory}
                    onMealPlanChange={setMealPlan}
                    onGuestsChange={setGuests}
                    initial={
                      editingIndex !== null ? hotelEntries[editingIndex] : {}
                    }
                  />
                  <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t">
                    <Button
                      onClick={handleSaveHotel}
                      className="bg-theme-primary hover:bg-theme-secondary shadow-sm"
                    >
                      {editingIndex !== null
                        ? "✏️ Update Hotel"
                        : "💾 Save Hotel"}
                    </Button>
                    {isReadyToAddAnother && (
                      <Button
                        variant="outline"
                        onClick={handleAddAnotherHotel}
                        className="border-theme-primary text-theme-primary hover:bg-theme-primary/5"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Another Hotel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Saved Hotel Itinerary */}
            {hotelEntries.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <h3 className="text-base font-bold text-slate-800">
                    Hotel Itinerary
                    <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {hotelEntries.length} hotel
                      {hotelEntries.length > 1 ? "s" : ""}
                    </span>
                  </h3>
                </div>
                <div className="space-y-3 relative">
                  {hotelEntries.length > 1 && (
                    <div className="absolute left-7 top-14 bottom-14 w-0.5 bg-gradient-to-b from-theme-primary/30 via-theme-primary/20 to-transparent z-0 hidden sm:block" />
                  )}
                  {hotelEntries.map((entry, idx) => (
                    <div key={idx} className="relative z-10">
                      <HotelItineraryCard
                        entry={entry}
                        index={idx}
                        onEdit={handleEditHotel}
                        onDelete={(i) => dispatch(deleteHotelEntry(i))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-theme-primary/5 border border-theme-primary/20 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Hotels Subtotal
                  </span>
                  <span className="text-lg font-black text-theme-primary">
                    ₹{hotelTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Transport */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-3 sm:p-5 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Car className="h-5 w-5 text-theme-primary" /> Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5 pt-0 space-y-4">
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
                    className="w-full bg-theme-primary hover:bg-theme-secondary"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Transport
                  </Button>
                ) : showTransportSection ? (
                  <div className="mt-2">
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

            {/* 6. Activities */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-3 sm:p-5 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palmtree className="h-5 w-5 text-theme-primary" /> Activities
                  & Sightseeing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5 pt-0 space-y-4">
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
                    className="w-full bg-theme-primary hover:bg-theme-secondary"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Activities
                  </Button>
                ) : showActivitiesSection ? (
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        State for Activities
                      </Label>
                      <Select
                        value={selectedState}
                        onValueChange={setSelectedState}
                      >
                        <SelectTrigger className="text-sm">
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
                        className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Done —
                        Collapse Activities
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActivitiesSection(true)}
                    className="text-xs border-theme-primary/40 text-theme-primary"
                  >
                    <PenLine className="h-3.5 w-3.5 mr-1" /> Edit Activities
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 7. Itinerary */}
            {hotelEntries.length > 0 && (
              <ItinerarySection
                hotelEntries={hotelEntries}
                selectedState={selectedState}
                itineraryData={itineraryData}
                setItineraryData={setItineraryData}
                onChange={(data) => setItineraryData(data)}
              />
            )}

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-black text-sm shadow-sm font-medium transition-all"
              >
                <Copy className="h-4 w-4" /> Copy WhatsApp Summary
              </button>
              <button
                onClick={handleExportToPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm shadow-sm font-medium transition-all"
              >
                <FileText className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>

          {/* ══ RIGHT COLUMN — Sticky Pricing Panel ═══════════════════════ */}
          {showRightPanel && (
            <div className="lg:w-96 xl:w-[420px] lg:min-w-[360px] lg:sticky lg:top-6 lg:self-start space-y-5 pt-6 lg:pt-0">
              {/* Package breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Package Breakdown
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {hotelEntries.length}H · {selectedTransport ? "1T" : "0T"} ·{" "}
                    {selectedActivities.length}A
                  </span>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Hotel className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      Hotels ({hotelEntries.length})
                    </div>
                    <span className="font-semibold">
                      ₹
                      {hotelTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      Transport
                    </div>
                    <span className="font-semibold">
                      ₹
                      {transportTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      Activities ({selectedActivities.length})
                    </div>
                    <span className="font-semibold">
                      ₹
                      {activityTotalPrice.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {confirmedMarkup > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Wallet className="h-3.5 w-3.5 text-amber-600" />
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
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-theme-primary" /> Add Markup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={markupAmount}
                      onChange={(e) => setMarkupAmount(Number(e.target.value))}
                      className="flex-1 text-sm"
                      placeholder="0"
                    />
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger className="w-32 text-xs">
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
                      className="bg-theme-secondary hover:bg-theme-secondary/90 px-4"
                    >
                      Apply
                    </Button>
                  </div>
                  {confirmedMarkup > 0 && (
                    <p className="mt-2.5 text-xs text-slate-500">
                      Markup applied:{" "}
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

              {/* Grand Total */}
              <div className="relative overflow-hidden rounded-2xl bg-theme-dark text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <IndianRupee className="h-5 w-5 opacity-70" />
                    <h3 className="text-lg font-bold">Grand Total</h3>
                  </div>
                  <div className="text-center mb-6">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-medium mb-1">
                      Total Package Cost
                    </p>
                    <p className="text-5xl font-black tracking-tight">
                      ₹
                      {grandTotal.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                    {hotelEntries.length > 0 && (
                      <p className="text-xs text-white/50 mt-1">
                        for{" "}
                        {hotelEntries.reduce(
                          (sum, e) => sum + (parseInt(e.nights) || 0),
                          0,
                        )}{" "}
                        nights · {hotelEntries[0]?.numDouble || 0} room
                        {(hotelEntries[0]?.numDouble || 0) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full py-6 bg-theme-primary hover:bg-theme-secondary font-bold text-base shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {/* Label changes in edit mode */}
                    {isEditMode ? "Save As New Quotation" : "Save Package"}
                  </Button>
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
            <div className="bg-theme-dark text-white px-6 py-5">
              <div className="flex items-center justify-between">
                {/* Title changes in edit mode */}
                <h2 className="text-lg font-bold">
                  {isEditMode ? "Save As New Quotation" : "Finalize Package"}
                </h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-white/60 text-sm mt-1">
                {isEditMode
                  ? "A new quotation with a new reference number will be created"
                  : "Fill in details to save this package"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Edit mode info badge */}
              {isEditMode && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  Original quotation will not be modified
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Hotels</span>
                  <span className="font-semibold">
                    ₹{hotelTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transport</span>
                  <span className="font-semibold">
                    ₹{transportTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Activities</span>
                  <span className="font-semibold">
                    ₹{activityTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-slate-800">
                  <span>Grand Total</span>
                  <span className="text-theme-primary">
                    ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Package Name *</Label>
                <Input
                  value={packageName}
                  onChange={(e) => dispatch(setPackageName(e.target.value))}
                  placeholder="e.g. Goa Delight 4N/5D"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  disabled={!!customerId}
                  className={
                    customerId ? "bg-slate-100 cursor-not-allowed" : ""
                  }
                />
                {(customerId || leadId) && (
                  <p className="text-xs text-slate-400">
                    ✓ Auto-filled from {customerId ? "customer" : "lead"} record
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSavePackage}
                className="bg-green-600 hover:bg-green-700 text-white px-6"
              >
                <Save className="h-4 w-4 mr-2" />
                {/* Button label changes in edit mode */}
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
