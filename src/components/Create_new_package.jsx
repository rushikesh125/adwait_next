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
    editingQuotation,
  } = useSelector((state) => state.package);

  const quotationId = searchParams.get("quotationId");
  const isEditMode = !!quotationId;
  const customerId =
    searchParams.get("customerId") || searchParams.get("customerid");
  const leadId = searchParams.get("leadId");

  const checkInDate = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

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

  const hydratedRef = React.useRef(false);
  useEffect(() => {
    if (!isEditMode || !editingQuotation || hydratedRef.current) return;
    hydratedRef.current = true;
    const q = editingQuotation;
    if (q.hotelSummary?.length) {
      q.hotelSummary.forEach((h) => dispatch(addHotelEntry(h)));
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
        })
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
        0
      );
      dispatch(setSelectedActivities({ activities: q.activitySummary, totalPrice }));
    }
    if (q.markup) dispatch(setConfirmedMarkup(q.markup));
    dispatch(setPackageName(q.packageName || ""));
    setCustomerName(q.customerName || q.leadName || "");
    if (q.itinerarySummary) setItineraryData(q.itinerarySummary);
    const firstHotel = q.hotelSummary?.[0];
    if (firstHotel?.checkInDate) setCheckInDate(firstHotel.checkInDate);
    if (firstHotel?.checkOutDate) setCheckOutDate(firstHotel.checkOutDate);
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
          ])
        ).values(),
      ];
      setHotels(unique);
    });
    getDocs(collection(db, "locations")).then((snap) =>
      setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    setCheckOutDate(d.toISOString().split("T")[0]);
  }, [checkInDate, nights]);

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
      })
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

  const filteredHotels = useMemo(
    () =>
      hotels.filter(
        (h) => h.state?.toLowerCase() === selectedState.toLowerCase()
      ),
    [hotels, selectedState]
  );
  const groupedHotels = useMemo(
    () =>
      filteredHotels.reduce((acc, h) => {
        const c = h.city || "Other";
        if (!acc[c]) acc[c] = [];
        acc[c].push(h);
        return acc;
      }, {}),
    [filteredHotels]
  );

  const selectedHotelData = hotels.find((h) => h.id === selectedHotelId);
  const hotelTotalPrice = hotelEntries.reduce(
    (s, e) => s + Number(e.hotelTotal || 0),
    0
  );

  const transportBreakdown = useMemo(() => {
    if (!selectedTransport?.selectedVehicle) return null;
    const vehicle = selectedTransport.selectedVehicle;
    const totalNights = hotelEntries.reduce(
      (sum, e) => sum + (Number(e.nights) || 0),
      0
    );
    const days = totalNights > 0 ? totalNights + 1 : 1;
    const perKm = Number(vehicle.perKmprice || 0);
    const lumpsum = Number(vehicle.price || 0);
    const allowancePerDay = Number(vehicle.driverAllowance || 0);

    if (perKm > 0) {
      const calculatedBaseCost = Number(minKm || 0) * perKm * days;
      const baseCost =
        editableBaseCost !== null ? Number(editableBaseCost) : calculatedBaseCost;
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
    hotelTotalPrice + transportTotalPrice + activityTotalPrice + confirmedMarkup;

  const handleSaveHotel = () => {
    if (!selectedHotelData) { alert("Please select a hotel."); return; }
    if (!mealPlan) { alert("Please select a meal plan."); return; }
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
      hotels.find((h) => h.name === entry.hotel && h.city === entry.city)?.id || null
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

  const handleSavePackage = async () => {
    if (!packageName.trim()) { alert("Please enter a package name."); return; }
    if (!customerName.trim()) { alert("Please enter a customer name."); return; }
    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Not logged in");
      const c_data = customerId
        ? { customerId, customerName }
        : leadId
        ? { leadId, leadName: customerName }
        : { customerName };
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
          ...(isEditMode && quotationId ? { clonedFromId: quotationId } : {}),
        }
      );
      toast(isEditMode ? "Saved as new quotation! ✅" : "Package saved successfully! ✅");
      router.back();
      setShowSaveModal(false);
      dispatch(setPackageName(""));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save: " + err.message);
    }
  };

  const showRightPanel =
    selectedActivities.length > 0 || hotelEntries.length > 0 || selectedTransport;

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
                  <strong>new quotation with a new reference number</strong>. The original stays unchanged.
                </span>
              </div>
            )}

            {/* ── 1. Date + Nights + State — all in one compact row ── */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-theme-primary" /> Check-in
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
                      value={nights}
                      onChange={(e) => setNights(parseInt(e.target.value) || 1)}
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
                      onValueChange={(v) => {
                        setSelectedState(v);
                        setSelectedHotelId(null);
                        setShowCustomHotelForm(false);
                      }}
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

            {/* ── 2. Hotel Selection + Room Selector — combined card ── */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-theme-primary" />
                    Hotels in{" "}
                    <span className="text-theme-primary">{selectedState}</span>
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
                        <PenLine className="h-3.5 w-3.5 mr-1.5" /> Add Custom Hotel
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Hotel list + Room Selector side-by-side on larger screens */}
                      <div className={`${selectedHotelData && !showCustomHotelForm ? "grid grid-cols-1 lg:grid-cols-2 gap-3" : ""}`}>
                        {/* Hotel list */}
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
                                      <p className="text-xs font-semibold text-slate-800 truncate">
                                        {h.name}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                                        <span className="text-[9px] text-slate-500">
                                          {h.GoogleReviewRating || "N/A"} · {h.city}
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
                              {showCustomHotelForm ? "Hide Custom Form" : "Add Custom Hotel"}
                            </Button>
                          </div>
                        </div>

                        {/* Room Selector — shown inline alongside the hotel list */}
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
                                editingIndex !== null ? hotelEntries[editingIndex] : {}
                              }
                            />
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <Button
                                onClick={handleSaveHotel}
                                className="bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                                size="sm"
                              >
                                {editingIndex !== null ? "✏️ Update Hotel" : "💾 Save Hotel"}
                              </Button>
                              {isReadyToAddAnother && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddAnotherHotel}
                                  className="text-xs h-8 border-theme-primary text-theme-primary hover:bg-theme-primary/5"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Another Hotel
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Custom hotel form */}
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

            {/* ── 3. Hotel Itinerary ── */}
            {hotelEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Hotel Itinerary
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {hotelEntries.length} hotel{hotelEntries.length > 1 ? "s" : ""}
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
                      onDelete={(i) => dispatch(deleteHotelEntry(i))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── 4. Transport + Activities — side by side ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transport */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-theme-primary" /> Transport
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
                  {!showTransportSection && !selectedTransport?.selectedVehicle ? (
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
                    <Palmtree className="h-4 w-4 text-theme-primary" /> Activities
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
                        <Label className="text-xs font-medium">State for Activities</Label>
                        <Select value={selectedState} onValueChange={setSelectedState}>
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
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Done — Collapse
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
            {hotelEntries.length > 0 && (
              <ItinerarySection
                hotelEntries={hotelEntries}
                selectedState={selectedState}
                itineraryData={itineraryData}
                setItineraryData={setItineraryData}
                onChange={(data) => setItineraryData(data)}
              />
            )}


          </div>

          {/* ══ RIGHT COLUMN — Sticky Pricing Panel ══════════════════════ */}
          {showRightPanel && (
            <div className="lg:w-80 xl:w-96 lg:min-w-[300px] lg:sticky lg:top-6 lg:self-start space-y-3 pt-4 lg:pt-0">

              {/* Package Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">Package Breakdown</h3>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {hotelEntries.length}H · {selectedTransport ? "1T" : "0T"} · {selectedActivities.length}A
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    { icon: <Hotel className="h-3 w-3 text-blue-600" />, bg: "bg-blue-100", label: `Hotels (${hotelEntries.length})`, val: hotelTotalPrice },
                    { icon: <Car className="h-3 w-3 text-indigo-600" />, bg: "bg-indigo-100", label: "Transport", val: transportTotalPrice },
                    { icon: <Palmtree className="h-3 w-3 text-emerald-600" />, bg: "bg-emerald-100", label: `Activities (${selectedActivities.length})`, val: activityTotalPrice },
                  ].map(({ icon, bg, label, val }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div className={`w-5 h-5 rounded-md ${bg} flex items-center justify-center`}>
                          {icon}
                        </div>
                        {label}
                      </div>
                      <span className="font-semibold">
                        ₹{val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
                        +₹{confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Markup */}
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Wallet className="h-3.5 w-3.5 text-theme-primary" /> Add Markup
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
                        ₹{confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Grand Total */}
              <div className="relative overflow-hidden rounded-xl bg-theme-dark text-white shadow-xl">
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-4 w-4 opacity-70" />
                      <h3 className="text-sm font-bold">Grand Total</h3>
                    </div>
                    {hotelEntries.length > 0 && (
                      <p className="text-[10px] text-white/50">
                        {hotelEntries.reduce((s, e) => s + (parseInt(e.nights) || 0), 0)}N ·{" "}
                        {hotelEntries[0]?.numDouble || 0} room{(hotelEntries[0]?.numDouble || 0) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <p className="text-4xl font-black tracking-tight mb-4">
                    ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                {[
                  { label: "Hotels", val: hotelTotalPrice },
                  { label: "Transport", val: transportTotalPrice },
                  { label: "Activities", val: activityTotalPrice },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-semibold">₹{val.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-slate-800">
                  <span>Grand Total</span>
                  <span className="text-theme-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Package Name *</Label>
                <Input
                  value={packageName}
                  onChange={(e) => dispatch(setPackageName(e.target.value))}
                  placeholder="e.g. Goa Delight 4N/5D"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  disabled={!!customerId}
                  className={`h-8 text-xs ${customerId ? "bg-slate-100 cursor-not-allowed" : ""}`}
                />
                {(customerId || leadId) && (
                  <p className="text-[10px] text-slate-400">
                    ✓ Auto-filled from {customerId ? "customer" : "lead"} record
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSaveModal(false)}>
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