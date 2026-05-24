"use client";

import React, { useState, useMemo, useEffect } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
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
  Star,
  PenLine,
  FileText,
  CalendarDays,
  MapPin,
  UserRound,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import {
  getAvailableRoomsForStay,
  hotelHasRatesForStay,
} from "@/lib/hotelRateAvailability";

// ── Import HotelVoucherDrawer for Documents tab ───────────────────────────────
import HotelVoucherDrawer from "../vouchers/hotelVoucher";// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];
const STAR_RATINGS = ["1", "2", "3", "4", "5"];

const EMPTY_PRICING = () => ({
  ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
});

const PLAN_LABELS = { ep: "EP", cp: "CP", map: "MAP", ap: "AP" };
const PLAN_DESCRIPTIONS = {
  ep: "Accommodation only",
  cp: "Bed + Breakfast",
  map: "Breakfast + Dinner",
  ap: "All Meals",
};

const formatCurrency = (value) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const formatViewDate = (value) => {
  if (!value) return "—";
  const date = value?.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calcCustomHotelNightPrice = (
  pricing,
  plan,
  { numDouble, numExtraAdult, numExtraChild, numCNB },
) => {
  if (!pricing || !plan) return 0;
  const p = pricing[plan.toLowerCase()];
  if (!p) return 0;
  return (
    (p.double || 0) * (numDouble || 0) +
    (p.extraAdult || 0) * (numExtraAdult || 0) +
    (p.extraChild || 0) * (numExtraChild || 0) +
    (p.cnb || 0) * (numCNB || 0)
  );
};

// ─── Custom Hotel Form ────────────────────────────────────────────────────────
const CustomHotelForm = ({ state: defaultState, orgId = null, onAdd, onCancel }) => {
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(defaultState || "");
  const [rating, setRating] = useState("3");
  const [roomType, setRoomType] = useState("");
  const [pricing, setPricing] = useState(EMPTY_PRICING());
  const [selectedMealPlan, setSelectedMealPlan] = useState("EP");
  const [nights, setNights] = useState(1);
  const [numDouble, setNumDouble] = useState(1);
  const [numExtraAdult, setNumExtraAdult] = useState(0);
  const [numExtraChild, setNumExtraChild] = useState(0);
  const [numCNB, setNumCNB] = useState(0);
  const [checkInDate, setCheckInDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocId, setExistingDocId] = useState(null);

  useEffect(() => {
    const name = hotelName.trim();
    const c = city.trim();
    const s = state.trim();
    if (!name || !c || !s || !orgId) return;

    let cancelled = false;
    const lookup = async () => {
      try {
        const q = query(
          collection(db, "custom_hotels"),
          where("orgId", "==", orgId),
          where("name", "==", name),
          where("city", "==", c),
          where("state", "==", s),
        );
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const d = snap.docs[0];
        const data = d.data();
        setExistingDocId(d.id);
        setRating(data.rating || "3");
        setRoomType(data.roomType || "");
        setPricing(data.pricing || EMPTY_PRICING());
        setSelectedMealPlan(data.lastUsedMealPlan || "EP");
      } catch (err) {
        console.error("Custom hotel lookup failed:", err);
      }
    };
    lookup();
    return () => {
      cancelled = true;
    };
  }, [hotelName, city, state, orgId]);

  const handlePricingChange = (plan, type, raw) => {
    const val = raw === "" ? 0 : Math.max(0, Number(raw));
    setPricing((prev) => ({
      ...prev,
      [plan]: { ...prev[plan], [type]: val },
    }));
  };

  const pricePerNight = calcCustomHotelNightPrice(pricing, selectedMealPlan, {
    numDouble,
    numExtraAdult,
    numExtraChild,
    numCNB,
  });
  const estimatedTotal = pricePerNight * nights;

  const plansWithPrice = MEAL_PLANS.filter((p) => {
    const row = pricing[p.toLowerCase()];
    return row && Object.values(row).some((v) => v > 0);
  });

  const handleSubmit = async () => {
    if (!hotelName.trim()) { alert("Hotel name is required."); return; }
    if (!city.trim()) { alert("City is required."); return; }
    if (!state.trim()) { alert("State is required."); return; }
    if (!roomType.trim()) { alert("Room type is required."); return; }
    if (plansWithPrice.length === 0) { alert("Enter at least one price in the pricing table."); return; }
    if (!orgId) { alert("Organization is not assigned."); return; }

    setIsSaving(true);
    try {
      const payload = {
        name: hotelName.trim(), city: city.trim(), state: state.trim(),
        orgId,
        rating, roomType: roomType.trim(), pricing,
        lastUsedMealPlan: selectedMealPlan, updatedAt: new Date(),
      };
      if (existingDocId) {
        await updateDoc(doc(db, "custom_hotels", existingDocId), payload);
      } else {
        const ref = await addDoc(collection(db, "custom_hotels"), { ...payload, createdAt: new Date() });
        setExistingDocId(ref.id);
      }
    } catch (err) {
      console.error("Failed to save custom hotel:", err);
    } finally {
      setIsSaving(false);
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (nights || 1));

    onAdd({
      hotel: hotelName.trim(), city: city.trim(), state: state.trim(), rating,
      selectedRoomCategory: roomType.trim(), nights, numDouble, numExtraAdult,
      numExtraChild, numCNB, selectedMealPlan, pricing, pricePerNight,
      hotelTotal: estimatedTotal, checkInDate,
      checkOutDate: checkOut.toISOString().split("T")[0], isCustom: true,
    });
  };

  return (
    <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-theme-primary">
          <PenLine className="h-4 w-4" />
          Add Custom Hotel
          {existingDocId && (
            <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✓ Found in records — prices pre-filled
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Hotel Name *</Label>
            <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="e.g. Hotel Paradise" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City *</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lonavala" className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">State *</Label>
            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" className="text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Star Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAR_RATINGS.map((r) => (
                  <SelectItem key={r} value={r}>{r} Star{r !== "1" ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs">Room Type * (free text)</Label>
            <Input value={roomType} onChange={(e) => setRoomType(e.target.value)} placeholder="e.g. Premium Deluxe, Suite, Cottage…" className="text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pricing Table — enter rates per guest type</Label>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-xs min-w-[480px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium w-20">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">Double (₹)</th>
                  <th className="px-3 py-2 text-left font-medium">Extra Adult (₹)</th>
                  <th className="px-3 py-2 text-left font-medium">Extra Child (₹)</th>
                  <th className="px-3 py-2 text-left font-medium text-theme-primary">CNB (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(PLAN_LABELS).map(([planKey, planLabel]) => (
                  <tr key={planKey} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-bold text-xs">{planLabel}</div>
                      <div className="text-muted-foreground text-[10px] leading-tight">{PLAN_DESCRIPTIONS[planKey]}</div>
                    </td>
                    {["double", "extraAdult", "extraChild", "cnb"].map((type) => (
                      <td key={type} className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">₹</span>
                          <input
                            type="number" min="0"
                            value={pricing[planKey]?.[type] || ""}
                            onChange={(e) => handlePricingChange(planKey, type, e.target.value)}
                            className={`w-full h-8 pl-5 pr-2 border rounded text-right text-xs outline-none focus:ring-1 focus:ring-theme-primary ${type === "cnb" ? "border-theme-primary/30" : "border-input"}`}
                            placeholder="0"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Select Active Meal Plan for this stay</Label>
          <div className="flex flex-wrap gap-2">
            {MEAL_PLANS.map((plan) => {
              const hasPrice = plansWithPrice.includes(plan);
              const isActive = selectedMealPlan === plan;
              return (
                <button key={plan} type="button" onClick={() => setSelectedMealPlan(plan)} disabled={!hasPrice}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isActive ? "bg-theme-primary text-white border-theme-primary shadow-sm" : hasPrice ? "bg-white border-input text-slate-700 hover:border-theme-primary/60" : "bg-muted/30 border-muted text-muted-foreground cursor-not-allowed opacity-50"}`}>
                  {plan}{hasPrice && <span className="ml-1 text-[10px] opacity-70">✓</span>}
                </button>
              );
            })}
          </div>
          {!plansWithPrice.includes(selectedMealPlan) && plansWithPrice.length > 0 && (
            <p className="text-[11px] text-amber-600">Selected plan has no price — switch to a plan marked ✓</p>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Check-in", type: "date", val: checkInDate, set: setCheckInDate, min: undefined },
            { label: "Nights", type: "number", val: nights, set: (v) => setNights(parseInt(v) || 1), min: 1 },
            { label: "Rooms", type: "number", val: numDouble, set: (v) => setNumDouble(parseInt(v) || 0), min: 0 },
            { label: "Ex. Adults", type: "number", val: numExtraAdult, set: (v) => setNumExtraAdult(parseInt(v) || 0), min: 0 },
            { label: "Ex. Children", type: "number", val: numExtraChild, set: (v) => setNumExtraChild(parseInt(v) || 0), min: 0 },
            { label: "CNB", type: "number", val: numCNB, set: (v) => setNumCNB(parseInt(v) || 0), min: 0 },
          ].map(({ label, type, val, set: setter, min }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <input type={type} min={min} value={val} onChange={(e) => setter(e.target.value)}
                className="w-full h-8 border rounded px-2 text-xs outline-none focus:ring-1 focus:ring-theme-primary" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t gap-4">
          <div className="text-sm text-muted-foreground space-y-0.5">
            <div>Per night: <span className="font-semibold text-theme-primary">₹{pricePerNight.toFixed(0)}</span><span className="text-xs ml-1">({selectedMealPlan})</span></div>
            <div>Est. total ({nights} night{nights !== 1 ? "s" : ""}): <span className="font-bold text-theme-primary">₹{estimatedTotal.toFixed(0)}</span></div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSaving} className="bg-theme-primary hover:bg-theme-secondary text-xs">
              <Plus className="h-3 w-3 mr-1" />{isSaving ? "Saving…" : "Add Hotel"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Custom Activity Form ─────────────────────────────────────────────────────
const CustomActivityForm = ({ state, onAdd, onCancel }) => {
  const [form, setForm] = useState({
    name: "", city: "", state: state || "", description: "",
    participants: 1, pricePerPerson: 0, isCustom: true,
  });
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const handleSubmit = () => {
    if (!form.name.trim()) { alert("Activity name is required."); return; }
    if (!form.city.trim()) { alert("City is required."); return; }
    const totalPrice = (parseFloat(form.pricePerPerson) || 0) * (parseInt(form.participants) || 1);
    onAdd({ ...form, totalPrice, fitRatePerPerson: form.pricePerPerson, groupRatePerPerson: form.pricePerPerson });
  };
  return (
    <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-theme-primary">
          <PenLine className="h-4 w-4" />Add Custom Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Activity Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Paragliding" className="text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">City *</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Manali" className="text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">State</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="e.g. Himachal Pradesh" className="text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Participants</Label><Input type="number" min="1" value={form.participants} onChange={(e) => set("participants", parseInt(e.target.value) || 1)} className="text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Price / Person (₹)</Label><Input type="number" min="0" value={form.pricePerPerson} onChange={(e) => set("pricePerPerson", parseFloat(e.target.value) || 0)} className="text-sm" /></div>
        </div>
        <div className="space-y-1"><Label className="text-xs">Description (optional)</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description of the activity" className="text-sm" /></div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">Total ≈ <span className="font-semibold text-theme-primary">₹{((parseFloat(form.pricePerPerson) || 0) * (parseInt(form.participants) || 1)).toFixed(0)}</span></span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSubmit} className="bg-theme-primary hover:bg-theme-secondary text-xs"><Plus className="h-3 w-3 mr-1" /> Add Activity</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main QuotationModals ─────────────────────────────────────────────────────
const QuotationModals = ({
  isViewModalOpen,
  setIsViewModalOpen,
  viewingQuotation,
  isEditModalOpen,
  setIsEditModalOpen,
  editingQuotation,
  handleEditChange,
  AllDestinations,
  SelectedDestination,
  setSelectedDestination,
  selectedHotelToAdd,
  setSelectedHotelToAdd,
  allHotels,
  handleAddHotel,
  handleAddCustomHotel,
  handleRemoveHotel,
  handleHotelChange,
  handleHotelSummaryChange,
  getAvailableMealPlans,
  toggleValue,
  handleToggle,
  handleTransportSummaryChange,
  selectedTransportStateId,
  setSelectedTransportStateId,
  transportStates,
  toTitleCase,
  handlePackageChange,
  availableTransportPackagesForSelectedState,
  handleVehicleChange,
  isFetchingActivities,
  selectedActivityToAdd,
  setSelectedActivityToAdd,
  availableActivities,
  handleAddActivity,
  handleAddCustomActivity,
  handleRemoveActivity,
  handleActivitySummaryChange,
  markupMode,
  setMarkupMode,
  handleMarkupInputChange,
  recalculateGrandTotal,
  handleUpdateQuotation,
  handleSaveAs,
  showSaveAsModal,
  setShowSaveAsModal,
  newPackageName,
  setNewPackageName,
  newCustomerName,
  setNewCustomerName,
  handleConfirmSaveAs,
  saveAsLeadId,
  setSaveAsLeadId,
  agentLeads,
  onOpenBookingConfirmation,
  orgId = null,
}) => {
  const truncateText = (text, maxLength) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const [showCustomHotelForm, setShowCustomHotelForm] = useState(false);
  const [showCustomActivityForm, setShowCustomActivityForm] = useState(false);

  // ── Hotel Voucher Drawer state (for Documents tab in View Modal) ───────────
  const [hotelVoucherOpen, setHotelVoucherOpen] = useState(false);
  const [voucherHotelData, setVoucherHotelData] = useState(null);

  const nextHotelStay = useMemo(() => {
    const hotels = editingQuotation?.hotelSummary || [];
    const lastHotel = hotels[hotels.length - 1];
    const checkInDate =
      lastHotel?.checkOutDate ||
      hotels[0]?.checkInDate ||
      new Date().toISOString().split("T")[0];
    return { checkInDate, nights: 1 };
  }, [editingQuotation?.hotelSummary]);

  const hotelsForSelectedState = useMemo(
    () =>
      allHotels.filter(
        (h) =>
          h.state === SelectedDestination &&
          hotelHasRatesForStay(h, nextHotelStay),
      ),
    [allHotels, SelectedDestination, nextHotelStay],
  );

  const activitiesForSelectedState = useMemo(
    () => availableActivities,
    [availableActivities],
  );

  const noHotelsFound = SelectedDestination && hotelsForSelectedState.length === 0;
  const noActivitiesFound = SelectedDestination && !isFetchingActivities && activitiesForSelectedState.length === 0;
  const getHotelsAvailableForEntry = (entry) =>
    allHotels.filter(
      (h) => h.state === entry.state && hotelHasRatesForStay(h, entry),
    );

  const baseTotal = useMemo(() => {
    if (!editingQuotation) return 0;
    const hotelTotal = editingQuotation.hotelSummary?.reduce((s, h) => s + (h.hotelTotal || 0), 0) || 0;
    let transportTotal = 0;
    if (editingQuotation.transportSummary) {
      const t = editingQuotation.transportSummary;
      transportTotal =
        t.pricingType === "perKm"
          ? (Number(t.vehicleCost) || 0) +
            (Number(t.driverAllowance) || 0) +
            (Number(t.tollCharges) || 0) +
            (Number(t.permitCharges) || 0) +
            (Number(t.otherCharges) || 0)
          : Number(t.vehicleCost || t.totalTransportCost || 0);
    }
    const activityTotal = editingQuotation.activitySummary?.reduce((s, a) => s + (a.totalPrice || 0), 0) || 0;
    return hotelTotal + transportTotal + activityTotal;
  }, [editingQuotation]);

  const markupInputValue = editingQuotation?.markupValue ?? editingQuotation?.markup ?? 0;

  const handleMarkupChange = (value) => {
    handleMarkupInputChange(value, markupMode, baseTotal);
  };

  const handleMarkupModeSwitch = (newMode) => {
    setMarkupMode(newMode);
    handleMarkupInputChange(0, newMode, baseTotal);
  };

  const onCustomHotelAdd = (data) => {
    handleAddCustomHotel(data);
    setShowCustomHotelForm(false);
  };

  const onCustomActivityAdd = (data) => {
    handleAddCustomActivity(data);
    setShowCustomActivityForm(false);
  };

  const renderStars = (rating) => {
    const n = parseInt(rating) || 0;
    return Array.from({ length: n }).map((_, i) => (
      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
    ));
  };

  const editTransportTotal = useMemo(() => {
    if (!editingQuotation?.transportSummary) return 0;
    const t = editingQuotation.transportSummary;
    return t.pricingType === "perKm"
      ? (Number(t.vehicleCost) || 0) +
          (Number(t.driverAllowance) || 0) +
          (Number(t.tollCharges) || 0) +
          (Number(t.permitCharges) || 0) +
          (Number(t.otherCharges) || 0)
      : Number(t.vehicleCost || t.totalTransportCost || 0);
  }, [editingQuotation?.transportSummary]);

  // ── Open voucher drawer for a specific hotel from the quotation ───────────
  const handleOpenHotelVoucher = (hotel) => {
    setVoucherHotelData({
      hotelName: hotel.hotel || hotel.hotelName || "",
      checkIn: hotel.checkInDate || hotel.checkIn || "",
      checkOut: hotel.checkOutDate || hotel.checkOut || "",
      nights: hotel.nights || "",
      rooms: hotel.numDouble || "",
      roomCategory: hotel.selectedRoomCategory || "",
      mealPlan: hotel.selectedMealPlan || "",
    });
    setHotelVoucherOpen(true);
  };

  return (
    <>
      {/* ================== VIEW MODAL ================== */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-[95vw] max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-4 border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-xl sm:text-2xl text-theme-primary break-words">
                  {viewingQuotation?.packageName || "Quotation Details"}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                    <UserRound className="h-3.5 w-3.5" />
                    {viewingQuotation?.customerName || viewingQuotation?.leadName || "Customer"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatViewDate(viewingQuotation?.createdAt)}
                  </span>
                  <StatusBadge
                    status={viewingQuotation?.status || "Draft"}
                    fallback="Draft"
                    className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Hotels</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {viewingQuotation?.hotelSummary?.length || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Activities</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {viewingQuotation?.activitySummary?.length || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Transport</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {viewingQuotation?.transportSummary?.vehicleName || "Not added"}
                  </p>
                </div>
                <div className="rounded-2xl border border-theme-primary/20 bg-theme-muted/40 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Grand Total</p>
                  <p className="mt-1 text-xl font-black text-theme-primary">
                    {formatCurrency(viewingQuotation?.grandTotal)}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* ── Tabs: Details | Documents ── */}
          <Tabs defaultValue="details" className="space-y-4">
          <TabsList className={`grid w-full max-w-xs ${viewingQuotation?.status === "Accepted" ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="details">Details</TabsTrigger>
            {viewingQuotation?.status === "Accepted" && (
              <TabsTrigger value="documents" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Documents
              </TabsTrigger>
            )}
          </TabsList>

            {/* ── DETAILS TAB (original view content) ── */}
            <TabsContent value="details">
              <div className="space-y-6 sm:space-y-8 py-2">
                {/* Hotels */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Hotel className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                    Hotel Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {viewingQuotation?.hotelSummary?.map((hotel, i) => (
                      <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm sm:text-base truncate" title={hotel.hotel}>
                              {truncateText(hotel.hotel, 22)}
                            </h4>
                            {hotel.isCustom && (
                              <span className="text-xs bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded flex-shrink-0">Custom</span>
                            )}
                          </div>
                          {hotel.rating && <div className="flex items-center gap-0.5 mt-1">{renderStars(hotel.rating)}</div>}
                          <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 truncate"><MapPin className="h-3.5 w-3.5 text-theme-primary" />{hotel.city}, {hotel.state}</p>
                          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                            <div><span className="text-muted-foreground">Nights:</span><p className="font-medium">{hotel.nights}</p></div>
                            <div><span className="text-muted-foreground">Room:</span><p className="font-medium truncate" title={hotel.selectedRoomCategory}>{truncateText(hotel.selectedRoomCategory, 12)}</p></div>
                            <div><span className="text-muted-foreground">Meal:</span><p className="font-medium">{hotel.selectedMealPlan}</p></div>
                            <div><span className="text-muted-foreground">Guests:</span><p className="font-medium text-xs">{hotel.numDouble || 0}D, {hotel.numExtraAdult || 0}A, {hotel.numExtraChild || 0}C{Number(hotel.numCNB) > 0 && `, ${hotel.numCNB} CNB`}</p></div>
                          </div>
                          {hotel.isCustom && hotel.pricePerNight > 0 && (
                            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">₹{hotel.pricePerNight}/night</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Transport & Activities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <Car className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                      Transport
                    </h3>
                    <Card className="border-slate-200 shadow-sm">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                          <div className="flex justify-between"><span className="font-bold">Vehicle:</span><span className="font-medium">{viewingQuotation?.transportSummary?.vehicleName}{viewingQuotation?.transportSummary?.ac ? " (AC)" : ""}</span></div>
                          <div className="flex justify-between"><span>Vehicle Cost:</span><span>₹{viewingQuotation?.transportSummary?.vehicleCost || 0}</span></div>
                          <div className="flex justify-between"><span>Driver Allowance:</span><span>₹{viewingQuotation?.transportSummary?.driverAllowance || 0}</span></div>
                          <div className="flex justify-between"><span>Toll Charges:</span><span>₹{viewingQuotation?.transportSummary?.tollCharges || 0}</span></div>
                          <div className="flex justify-between"><span>Permit Charges:</span><span>₹{viewingQuotation?.transportSummary?.permitCharges || 0}</span></div>
                          <div className="flex justify-between"><span>Other Charges:</span><span>₹{viewingQuotation?.transportSummary?.otherCharges || 0}</span></div>
                          <div className="border-t pt-2 flex justify-between font-bold"><span>Total Transport</span><span>₹{(viewingQuotation?.transportSummary?.totalTransportCost || 0).toLocaleString("en-IN")}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                      <ActivitySquare className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                      Activities
                    </h3>
                    {viewingQuotation?.activitySummary?.length > 0 ? (
                      <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          {viewingQuotation.activitySummary.map((act, i) => (
                            <div key={i} className="flex justify-between items-center gap-3 rounded-xl border border-slate-100 px-3 py-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-sm sm:text-base truncate" title={act.name}>{truncateText(act.name, 20)}</p>
                                  {act.isCustom && <span className="text-xs bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded flex-shrink-0">Custom</span>}
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{act.city}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-medium text-sm sm:text-base">{act.participants} Person(s)</p>
                                <p className="text-xs sm:text-sm text-theme-primary">₹{act.totalPrice?.toFixed(0)}</p>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ) : (
                      <p className="text-muted-foreground text-center py-6 text-sm">No activities added</p>
                    )}
                  </div>
                </div>

                {/* Cost Summary */}
                <Card className="bg-theme-muted/25 border-theme-primary/20 shadow-sm">
                  <CardHeader className="pb-3 p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary flex-shrink-0" />
                      Cost Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
                    <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                      <div className="flex justify-between gap-2"><span>Hotel Total:</span><span>₹{viewingQuotation?.hotelSummary?.reduce((s, h) => s + (h.hotelTotal || 0), 0)?.toFixed(0) || "0"}</span></div>
                      <div className="flex justify-between gap-2"><span>Transport Total:</span><span>₹{(viewingQuotation?.transportSummary?.totalTransportCost || 0).toFixed(0)}</span></div>
                      <div className="flex justify-between gap-2"><span>Activity Total:</span><span>₹{viewingQuotation?.activitySummary?.reduce((s, a) => s + (a.totalPrice || 0), 0)?.toFixed(0) || "0"}</span></div>
                      <div className="flex justify-between gap-2"><span>Markup:</span><span>₹{viewingQuotation?.markup?.toFixed(0) || "0"}</span></div>
                    </div>
                    <div className="pt-3 sm:pt-4 border-t">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-base sm:text-lg font-bold text-theme-primary">Grand Total:</span>
                        <span className="text-xl sm:text-2xl font-bold text-theme-primary">₹{(viewingQuotation?.grandTotal || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── DOCUMENTS TAB ── */}
            <TabsContent value="documents">
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Vouchers</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Create and manage vouchers for this quotation</p>
                  </div>
                </div>

                {/* Hotel voucher cards — one per hotel in the quotation */}
                {viewingQuotation?.hotelSummary?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewingQuotation.hotelSummary.map((hotel, i) => (
                      <Card key={i} className="border border-slate-200 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-blue-50 rounded-lg p-2 flex-shrink-0">
                              <Hotel className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-slate-800 truncate" title={hotel.hotel || hotel.hotelName}>
                                {hotel.hotel || hotel.hotelName || "Hotel"}
                              </p>
                              <p className="text-xs text-slate-500">{hotel.city} · {hotel.nights} nights · {hotel.selectedMealPlan}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleOpenHotelVoucher(hotel)}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Hotel Voucher
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenBookingConfirmation?.(viewingQuotation, hotel)}
                            className="flex-shrink-0 gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Booking Request
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No hotels in this quotation</p>
                    <p className="text-slate-400 text-xs mt-1">Add hotels to the quotation to create vouchers</p>
                  </div>
                )}


                
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hotel Voucher Drawer (triggered from Documents tab) ── */}
      <HotelVoucherDrawer
        isOpen={hotelVoucherOpen}
        onClose={() => {
          setHotelVoucherOpen(false);
          setVoucherHotelData(null);
        }}
        hotelData={voucherHotelData}
        quotation={viewingQuotation}
      />

      {/* ================== EDIT MODAL ================== */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open);
          if (!open) {
            setShowCustomHotelForm(false);
            setShowCustomActivityForm(false);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-scroll flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-theme-primary break-words">Edit Quotation</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2 sm:pr-4 -mr-2 sm:-mr-4">
            <div className="space-y-6 sm:space-y-8 py-4 sm:py-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
                  <Input id="customerName" name="customerName" value={editingQuotation?.customerName || editingQuotation?.leadName || ""} onChange={handleEditChange} className="text-sm sm:text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select name="status" value={editingQuotation?.status || "Draft"} onValueChange={(value) => handleEditChange({ target: { name: "status", value } })}>
                    <SelectTrigger className="text-sm sm:text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Accepted">Accepted</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="hotels" className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="hotels" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2"><Hotel className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Hotels</span><span className="sm:hidden">Hotel</span></TabsTrigger>
                  <TabsTrigger value="transport" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2"><Car className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Transport</span><span className="sm:hidden">Trans</span></TabsTrigger>
                  <TabsTrigger value="activities" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2"><ActivitySquare className="h-3 w-3 sm:h-4 sm:w-4" /><span className="hidden sm:inline">Activities</span><span className="sm:hidden">Act</span></TabsTrigger>
                </TabsList>

                {/* ─── HOTELS TAB ─── */}
                <TabsContent value="hotels" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6"><CardTitle className="text-base sm:text-lg">Add Hotel</CardTitle></CardHeader>
                    <CardContent className="space-y-4 p-3 sm:p-6 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">Select State</Label>
                          <Select value={SelectedDestination} onValueChange={(v) => { setSelectedDestination(v); setShowCustomHotelForm(false); }}>
                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>{AllDestinations.map((state) => (<SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Select Hotel</Label>
                          {noHotelsFound ? (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground flex-1">No hotels with rates found for this stay.</p>
                              {!showCustomHotelForm && (
                                <Button size="sm" onClick={() => setShowCustomHotelForm(true)} className="bg-theme-primary hover:bg-theme-secondary text-xs whitespace-nowrap">
                                  <PenLine className="h-3 w-3 mr-1" />Add Custom
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-2 sm:gap-3">
                              <Select value={selectedHotelToAdd} onValueChange={setSelectedHotelToAdd} disabled={!SelectedDestination}>
                                <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder="Choose hotel..." /></SelectTrigger>
                                <SelectContent>{hotelsForSelectedState.map((h) => (<SelectItem key={h.id} value={h.id}>{h.name} ({h.city})</SelectItem>))}</SelectContent>
                              </Select>
                              <Button onClick={handleAddHotel} disabled={!selectedHotelToAdd} className="bg-theme-primary hover:bg-theme-secondary flex-shrink-0 text-sm sm:text-base" size="sm">
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /><span className="hidden sm:inline">Add</span>
                              </Button>
                              {SelectedDestination && (
                                <Button variant="outline" size="sm" onClick={() => setShowCustomHotelForm((p) => !p)} className="flex-shrink-0 text-xs border-theme-primary/40 text-theme-primary" title="Add custom hotel">
                                  <PenLine className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {showCustomHotelForm && <CustomHotelForm state={SelectedDestination} orgId={orgId || editingQuotation?.orgId || null} onAdd={onCustomHotelAdd} onCancel={() => setShowCustomHotelForm(false)} />}
                    </CardContent>
                  </Card>

                  {editingQuotation?.hotelSummary?.length > 0 ? (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden lg:block rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="min-w-[180px]">Hotel</TableHead>
                              <TableHead className="min-w-[130px]">Room Type</TableHead>
                              <TableHead className="w-20">Nights</TableHead>
                              <TableHead className="w-20">Rooms</TableHead>
                              <TableHead className="w-24">Ex. Adults</TableHead>
                              <TableHead className="w-24">Ex. Children</TableHead>
                              <TableHead className="w-20">CNB</TableHead>
                              <TableHead className="min-w-[110px]">Meal Plan</TableHead>
                              <TableHead className="text-right min-w-[100px]">Price</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingQuotation.hotelSummary.map((hotel, index) => {
                              const currentHotelData = allHotels.find((h) => h.name === hotel.hotel && h.state === hotel.state);
                              const availableRooms = currentHotelData
                                ? getAvailableRoomsForStay(currentHotelData, hotel)
                                : [];
                              return (
                                <TableRow key={index} className={hotel.isCustom ? "bg-theme-muted/10" : ""}>
                                  <TableCell className="font-medium">
                                    {hotel.isCustom ? (
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm font-medium truncate max-w-[160px]" title={hotel.hotel}>{hotel.hotel}</span>
                                          <span className="text-xs bg-theme-primary/10 text-theme-primary px-1 rounded flex-shrink-0">Custom</span>
                                        </div>
                                        <div className="flex items-center gap-0.5">{renderStars(hotel.rating)}</div>
                                        <p className="text-xs text-muted-foreground">{hotel.city}, {hotel.state}</p>
                                      </div>
                                    ) : (
                                      <Select value={allHotels.find((h) => h.name === hotel.hotel && h.state === hotel.state)?.id || ""} onValueChange={(val) => handleHotelChange(index, val)}>
                                        <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>{getHotelsAvailableForEntry(hotel).map((h) => (<SelectItem key={h.id} value={h.id}>{h.name} ({h.city})</SelectItem>))}</SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {hotel.isCustom ? (
                                      <Input value={hotel.selectedRoomCategory || ""} onChange={(e) => handleHotelSummaryChange(index, "selectedRoomCategory", e.target.value)} placeholder="e.g. Deluxe" className="w-[130px] text-sm" />
                                    ) : (
                                      <Select value={hotel.selectedRoomCategory || ""} onValueChange={(val) => handleHotelSummaryChange(index, "selectedRoomCategory", val)}>
                                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>{availableRooms.map((room) => (<SelectItem key={room.categoryName} value={room.categoryName}>{room.categoryName}</SelectItem>))}</SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  {["nights", "numDouble", "numExtraAdult", "numExtraChild", "numCNB"].map((field) => (
                                    <TableCell key={field}>
                                      <Input type="number" min="0" value={hotel[field] || 0} onChange={(e) => handleHotelSummaryChange(index, field, e.target.value)} className="w-20" />
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    <Select value={hotel.selectedMealPlan || "EP"} onValueChange={(val) => handleHotelSummaryChange(index, "selectedMealPlan", val)}>
                                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                      <SelectContent>{(hotel.isCustom ? MEAL_PLANS : getAvailableMealPlans(hotel)).map((plan) => (<SelectItem key={plan} value={plan}>{plan}</SelectItem>))}</SelectContent>
                                    </Select>
                                  </TableCell>
                                  {hotel.isCustom && (
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground">₹/night</span>
                                        <Input type="number" min="0" value={hotel.pricePerNight || 0} onChange={(e) => handleHotelSummaryChange(index, "pricePerNight", e.target.value)} className="w-24" />
                                      </div>
                                    </TableCell>
                                  )}
                                  <TableCell className="text-right font-medium">₹{(hotel.hotelTotal || 0).toFixed(0)}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveHotel(index)} disabled={editingQuotation.hotelSummary.length <= 1} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="lg:hidden space-y-4">
                        {editingQuotation.hotelSummary.map((hotel, index) => {
                          const currentHotelData = allHotels.find((h) => h.name === hotel.hotel && h.state === hotel.state);
                          const availableRooms = currentHotelData
                            ? getAvailableRoomsForStay(currentHotelData, hotel)
                            : [];
                          return (
                            <Card key={index} className={`border-theme-muted ${hotel.isCustom ? "bg-theme-muted/10" : ""}`}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0 space-y-1">
                                    {hotel.isCustom ? (
                                      <>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium text-sm truncate">{hotel.hotel}</span>
                                          <span className="text-xs bg-theme-primary/10 text-theme-primary px-1 rounded flex-shrink-0">Custom</span>
                                        </div>
                                        <div className="flex items-center gap-0.5">{renderStars(hotel.rating)}</div>
                                        <p className="text-xs text-muted-foreground">{hotel.city}, {hotel.state}</p>
                                      </>
                                    ) : (
                                      <>
                                        <Label className="text-xs">Hotel</Label>
                                        <Select value={allHotels.find((h) => h.name === hotel.hotel && h.state === hotel.state)?.id || ""} onValueChange={(val) => handleHotelChange(index, val)}>
                                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                          <SelectContent>{getHotelsAvailableForEntry(hotel).map((h) => (<SelectItem key={h.id} value={h.id}>{h.name} ({h.city})</SelectItem>))}</SelectContent>
                                        </Select>
                                      </>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveHotel(index)} disabled={editingQuotation.hotelSummary.length <= 1} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 flex-shrink-0">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Room Type</Label>
                                    {hotel.isCustom ? (
                                      <Input value={hotel.selectedRoomCategory || ""} onChange={(e) => handleHotelSummaryChange(index, "selectedRoomCategory", e.target.value)} placeholder="e.g. Deluxe" className="text-sm" />
                                    ) : (
                                      <Select value={hotel.selectedRoomCategory || ""} onValueChange={(val) => handleHotelSummaryChange(index, "selectedRoomCategory", val)}>
                                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>{availableRooms.map((room) => (<SelectItem key={room.categoryName} value={room.categoryName}>{room.categoryName}</SelectItem>))}</SelectContent>
                                      </Select>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Meal Plan</Label>
                                    <Select value={hotel.selectedMealPlan || "EP"} onValueChange={(val) => handleHotelSummaryChange(index, "selectedMealPlan", val)}>
                                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                      <SelectContent>{(hotel.isCustom ? MEAL_PLANS : getAvailableMealPlans(hotel)).map((plan) => (<SelectItem key={plan} value={plan}>{plan}</SelectItem>))}</SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {[["nights", "Nights"], ["numDouble", "Rooms"], ["numExtraAdult", "Adults"], ["numExtraChild", "Child"]].map(([field, label]) => (
                                    <div key={field} className="space-y-1">
                                      <Label className="text-xs">{label}</Label>
                                      <Input type="number" min="0" value={hotel[field] || 0} onChange={(e) => handleHotelSummaryChange(index, field, e.target.value)} className="text-sm" />
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="space-y-1 w-24">
                                    <Label className="text-xs">CNB</Label>
                                    <Input type="number" min="0" value={hotel.numCNB || 0} onChange={(e) => handleHotelSummaryChange(index, "numCNB", e.target.value)} className="text-sm" />
                                  </div>
                                  {hotel.isCustom && (
                                    <div className="flex-1 space-y-1">
                                      <Label className="text-xs">Price/Night (₹)</Label>
                                      <Input type="number" min="0" value={hotel.pricePerNight || 0} onChange={(e) => handleHotelSummaryChange(index, "pricePerNight", e.target.value)} className="text-sm" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                  <span className="text-sm font-medium">Total:</span>
                                  <span className="text-lg font-bold text-theme-primary">₹{(hotel.hotelTotal || 0).toFixed(0)}</span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">No hotels added yet. Add your first hotel above.</div>
                  )}
                </TabsContent>

                {/* ─── TRANSPORT TAB ─── */}
                <TabsContent value="transport" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base sm:text-lg">Transportation</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-medium">Custom</span>
                          <Switch checked={toggleValue} onCheckedChange={handleToggle} />
                          <span className="text-xs sm:text-sm font-medium">Package</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0">
                      {!toggleValue ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <div className="space-y-2"><Label className="text-sm">Vehicle Name</Label><Input value={editingQuotation?.transportSummary?.vehicleName || ""} onChange={(e) => handleTransportSummaryChange("vehicleName", e.target.value)} className="text-sm" /></div>
                            <div className="space-y-2"><Label className="text-sm">Price (₹)</Label><Input type="number" min="0" value={editingQuotation?.transportSummary?.price || 0} onChange={(e) => handleTransportSummaryChange("price", parseFloat(e.target.value) || 0)} className="text-sm" /></div>
                            <div className="flex items-end">
                              <div className="flex items-center space-x-2">
                                <input type="checkbox" id="ac" checked={!!editingQuotation?.transportSummary?.ac} onChange={(e) => handleTransportSummaryChange("ac", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-theme-primary focus:ring-theme-primary" />
                                <Label htmlFor="ac" className="text-xs sm:text-sm font-medium">AC Vehicle</Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 sm:space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm">Select State</Label>
                              <Select value={selectedTransportStateId} onValueChange={setSelectedTransportStateId}>
                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select transport state" /></SelectTrigger>
                                <SelectContent>{transportStates.map((state) => (<SelectItem key={state.id} value={state.id}>{toTitleCase(state.id)}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                            {selectedTransportStateId && (
                              <div className="space-y-4 pt-4 border-t">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div><Label className="text-xs text-muted-foreground">Current Package</Label><p className="font-medium mt-1 text-sm">{editingQuotation?.transportSummary?.packageName || "—"}</p></div>
                                  <div><Label className="text-xs text-muted-foreground">AC Status</Label><p className="font-medium mt-1 text-sm">{editingQuotation?.transportSummary?.ac ? "Available" : "Not Available"}</p></div>
                                  <div><Label className="text-xs text-muted-foreground">Vehicle Cost</Label><Input type="number" value={editingQuotation?.transportSummary?.vehicleCost || 0} onChange={(e) => handleTransportSummaryChange("vehicleCost", Number(e.target.value))} /></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {editingQuotation?.transportSummary?.vehicles?.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm">Select Vehicle</Label>
                              <Select value={editingQuotation?.transportSummary?.selectedVehicle?.type || ""} onValueChange={(val) => { const vehicle = editingQuotation.transportSummary.vehicles.find((v) => v.type === val); if (vehicle) handleVehicleChange(vehicle); }}>
                                <SelectTrigger className="text-sm"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                                <SelectContent>{editingQuotation.transportSummary.vehicles.map((v, i) => (<SelectItem key={i} value={v.type}>{v.type} - ₹{v.price ?? v.perKmprice} {v.ac ? "(AC)" : "(Non-AC)"}</SelectItem>))}</SelectContent>
                              </Select>
                            </div>
                          )}
                          {selectedTransportStateId && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t">
                              <div><Label className="text-xs text-muted-foreground">Current Package</Label><p className="font-medium mt-1 text-sm truncate">{truncateText(editingQuotation?.transportSummary?.packageName || "—", 20)}</p></div>
                              <div><Label className="text-xs text-muted-foreground">AC Status</Label><p className="font-medium mt-1 text-sm">{editingQuotation?.transportSummary?.ac ? "Available" : "Not Available"}</p></div>
                              <div><Label className="text-xs text-muted-foreground">Vehicle Cost</Label><p className="font-medium text-theme-primary mt-1 text-sm">₹{editingQuotation?.transportSummary?.totalPrice || 0}</p></div>
                            </div>
                          )}
                          <div className="rounded-xl border bg-slate-50 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-700">Transport Charges Breakdown</h4>
                              {editingQuotation?.transportSummary?.packageName && (
                                <span className="text-xs text-muted-foreground bg-white border px-2 py-0.5 rounded-full">{editingQuotation.transportSummary.packageName}{editingQuotation.transportSummary.ac ? " · AC" : ""}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {[["vehicleCost","Vehicle Cost"],["driverAllowance","Driver Allowance"],["tollCharges","Toll Charges"],["permitCharges","Permit Charges"],["otherCharges","Other Charges"]].map(([field, label]) => (
                                <div key={field} className="space-y-1.5">
                                  <Label className="text-xs">{label} (₹)</Label>
                                  <Input type="number" min="0" value={editingQuotation?.transportSummary?.[field] || 0} onChange={(e) => handleTransportSummaryChange(field, Number(e.target.value))} className="text-sm" />
                                </div>
                              ))}
                            </div>
                            <div className="border-t pt-3 flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-700">Total Transport Cost</span>
                              <span className="text-lg font-black text-theme-primary">₹{editTransportTotal.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── ACTIVITIES TAB ─── */}
                <TabsContent value="activities" className="space-y-4 sm:space-y-6">
                  <Card>
                    <CardHeader className="pb-3 p-3 sm:p-6"><CardTitle className="text-base sm:text-lg">Add Activity</CardTitle></CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm">Select State</Label>
                          <Select value={SelectedDestination} onValueChange={(v) => { setSelectedDestination(v); setShowCustomActivityForm(false); }}>
                            <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                            <SelectContent>{AllDestinations.map((state) => (<SelectItem key={state.name} value={state.name}>{state.name}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Select Activity</Label>
                          {noActivitiesFound ? (
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground flex-1">No activities found for this state.</p>
                              {!showCustomActivityForm && (
                                <Button size="sm" onClick={() => setShowCustomActivityForm(true)} className="bg-theme-primary hover:bg-theme-secondary text-xs whitespace-nowrap">
                                  <PenLine className="h-3 w-3 mr-1" />Add Custom
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-2 sm:gap-3">
                              <Select value={selectedActivityToAdd} onValueChange={setSelectedActivityToAdd} disabled={!SelectedDestination || isFetchingActivities}>
                                <SelectTrigger className="flex-1 text-sm"><SelectValue placeholder={isFetchingActivities ? "Loading..." : "Choose activity..."} /></SelectTrigger>
                                <SelectContent>{availableActivities.map((act) => (<SelectItem key={act.name} value={act.name}>{act.name} ({act.city}) - ₹{act.fitRatePerPerson || act.groupRatePerPerson}/person</SelectItem>))}</SelectContent>
                              </Select>
                              <Button onClick={handleAddActivity} disabled={!selectedActivityToAdd} className="bg-theme-primary hover:bg-theme-secondary flex-shrink-0" size="sm">
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /><span className="hidden sm:inline">Add</span>
                              </Button>
                              {SelectedDestination && !isFetchingActivities && (
                                <Button variant="outline" size="sm" onClick={() => setShowCustomActivityForm((p) => !p)} className="flex-shrink-0 text-xs border-theme-primary/40 text-theme-primary" title="Add custom activity">
                                  <PenLine className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {showCustomActivityForm && <CustomActivityForm state={SelectedDestination} onAdd={onCustomActivityAdd} onCancel={() => setShowCustomActivityForm(false)} />}
                    </CardContent>
                  </Card>

                  {editingQuotation?.activitySummary?.length > 0 ? (
                    <>
                      {/* Desktop */}
                      <div className="hidden md:block rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Activity</TableHead><TableHead>Participants</TableHead><TableHead>Price/Person</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingQuotation.activitySummary.map((activity, index) => (
                              <TableRow key={index} className={activity.isCustom ? "bg-theme-muted/10" : ""}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <span className="block truncate max-w-[180px]" title={activity.name}>{activity.name}</span>
                                    {activity.isCustom && <span className="text-xs bg-theme-primary/10 text-theme-primary px-1 rounded flex-shrink-0">Custom</span>}
                                  </div>
                                  <span className="text-muted-foreground text-sm">({activity.city})</span>
                                </TableCell>
                                <TableCell><Input type="number" min="1" value={activity.participants || 1} onChange={(e) => handleActivitySummaryChange(index, "participants", e.target.value)} className="w-24" /></TableCell>
                                <TableCell>
                                  {activity.isCustom ? (
                                    <Input type="number" min="0" value={activity.pricePerPerson || 0} onChange={(e) => handleActivitySummaryChange(index, "pricePerPerson", e.target.value)} className="w-28" />
                                  ) : (
                                    <span className="text-sm">₹{activity.participants > 10 ? activity.groupRatePerPerson : activity.fitRatePerPerson}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">₹{(activity.totalPrice || 0).toFixed(0)}</TableCell>
                                <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveActivity(index)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden space-y-3">
                        {editingQuotation.activitySummary.map((activity, index) => (
                          <Card key={index} className={`border-theme-muted ${activity.isCustom ? "bg-theme-muted/10" : ""}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-medium text-sm truncate" title={activity.name}>{activity.name}</h4>
                                    {activity.isCustom && <span className="text-xs bg-theme-primary/10 text-theme-primary px-1 rounded">Custom</span>}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{activity.city}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveActivity(index)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 flex-shrink-0 h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                              <div className="flex justify-between items-end gap-4">
                                <div className="flex-1 space-y-1"><Label className="text-xs">Participants</Label><Input type="number" min="1" value={activity.participants || 1} onChange={(e) => handleActivitySummaryChange(index, "participants", e.target.value)} className="mt-1 text-sm" /></div>
                                {activity.isCustom && <div className="flex-1 space-y-1"><Label className="text-xs">₹ / Person</Label><Input type="number" min="0" value={activity.pricePerPerson || 0} onChange={(e) => handleActivitySummaryChange(index, "pricePerPerson", e.target.value)} className="mt-1 text-sm" /></div>}
                                <div className="text-right"><Label className="text-xs text-muted-foreground">Total</Label><p className="font-bold text-theme-primary mt-1">₹{(activity.totalPrice || 0).toFixed(0)}</p></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">No activities added yet.</div>
                  )}
                </TabsContent>
              </Tabs>

              {/* ─── PRICING SUMMARY ─── */}
              <Card className="bg-theme-muted/30">
                <CardHeader className="pb-3 p-3 sm:p-6"><CardTitle className="text-base sm:text-lg">Pricing Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-2 rounded-md bg-background border"><p className="text-xs text-muted-foreground mb-0.5">Hotels</p><p className="font-semibold text-theme-primary">₹{(editingQuotation?.hotelSummary?.reduce((s, h) => s + (h.hotelTotal || 0), 0) || 0).toFixed(0)}</p></div>
                    <div className="text-center p-2 rounded-md bg-background border"><p className="text-xs text-muted-foreground mb-0.5">Transport</p><p className="font-semibold text-theme-primary">₹{(editingQuotation?.transportSummary?.totalTransportCost || 0).toFixed(0)}</p></div>
                    <div className="text-center p-2 rounded-md bg-background border"><p className="text-xs text-muted-foreground mb-0.5">Activities</p><p className="font-semibold text-theme-primary">₹{(editingQuotation?.activitySummary?.reduce((s, a) => s + (a.totalPrice || 0), 0) || 0).toFixed(0)}</p></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Markup</Label>
                      <div className="flex items-center gap-1 border rounded-md overflow-hidden text-xs">
                        <button type="button" onClick={() => handleMarkupModeSwitch("amount")} className={`px-3 py-1.5 transition-colors ${markupMode === "amount" ? "bg-theme-primary text-white font-medium" : "hover:bg-muted text-muted-foreground"}`}>₹ Amount</button>
                        <button type="button" onClick={() => handleMarkupModeSwitch("percentage")} className={`px-3 py-1.5 transition-colors ${markupMode === "percentage" ? "bg-theme-primary text-white font-medium" : "hover:bg-muted text-muted-foreground"}`}>% Percent</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{markupMode === "percentage" ? "%" : "₹"}</span>
                        <Input type="number" min="0" placeholder={markupMode === "percentage" ? "e.g. 10" : "e.g. 5000"} value={markupInputValue} onChange={(e) => handleMarkupChange(e.target.value)} className="pl-7 text-base sm:text-lg" />
                      </div>
                      {markupMode === "percentage" && <div className="text-sm text-muted-foreground whitespace-nowrap">= ₹{(editingQuotation?.markup || 0).toFixed(0)}</div>}
                    </div>
                  </div>
                  <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Grand Total</p>
                      <p className="text-2xl sm:text-3xl font-bold text-theme-primary mt-1">₹{(editingQuotation?.grandTotal || 0).toLocaleString("en-IN")}</p>
                    </div>
                    {markupMode === "percentage" && (editingQuotation?.markupValue || 0) > 0 && (
                      <p className="text-xs text-muted-foreground">Base ₹{baseTotal.toFixed(0)} + {editingQuotation.markupValue}% markup</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 sm:pt-6 border-t mt-4 flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="outline" onClick={handleSaveAs} className="border-theme-primary text-theme-primary hover:bg-theme-primary/10 w-full sm:w-auto">Save As New</Button>
            {/* <Button onClick={handleUpdateQuotation} className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto">Save Changes</Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================== SAVE AS NEW MODAL ================== */}
      <Dialog open={showSaveAsModal} onOpenChange={setShowSaveAsModal}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-theme-primary">Save as New Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPackageName" className="text-sm">New Package Name</Label>
              <Input id="newPackageName" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder="Summer Special Goa 2025" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCustomerName" className="text-sm">Customer Name</Label>
              <Input id="newCustomerName" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="John Doe" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Link to Lead <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select value={saveAsLeadId || "none"} onValueChange={(v) => setSaveAsLeadId(v === "none" ? "" : v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No lead —</SelectItem>
                  {(agentLeads || []).map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}{lead.destination ? ` · ${lead.destination}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">Linking associates this quotation with a lead for tracking.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowSaveAsModal(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleConfirmSaveAs} className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto">Save New Quotation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuotationModals;
