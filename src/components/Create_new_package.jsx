"use client";
// src/components/Create_new_package.jsx
// Self-contained — no HotelRoomSelector / SelectTransport / SelectActivities imports.
// Preserves customerId / leadId linking, Redux packageSlice, PDF/clipboard export.

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
} from "@/store/packageSlice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "jspdf-autotable";
import toast from "react-hot-toast";

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
  ActivitySquare,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers shared across inner components
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];
const MEAL_PLAN_LABELS = {
  EP: "Accommodation only",
  CP: "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP: "All Meals",
};
const STAR_RATINGS = ["1", "2", "3", "4", "5"];

const EMPTY_PRICING = () => ({
  ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
});

const calcCustomHotelNightPrice = (pricing, plan, { numDouble, numExtraAdult, numExtraChild, numCNB }) => {
  if (!pricing || !plan) return 0;
  const p = pricing[plan.toLowerCase()];
  if (!p) return 0;
  return (
    (p.double      || 0) * (numDouble      || 0) +
    (p.extraAdult  || 0) * (numExtraAdult  || 0) +
    (p.extraChild  || 0) * (numExtraChild  || 0) +
    (p.cnb         || 0) * (numCNB         || 0)
  );
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const renderStars = (rating) => {
  const n = parseInt(rating) || 0;
  return Array.from({ length: n }).map((_, i) => (
    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
  ));
};

// ─────────────────────────────────────────────────────────────────────────────
// ── 1. HotelRoomSelector (inline) ─────────────────────────────────────────
// Handles room category, meal plan, guest counts, price calculation for a
// single DB hotel. Returns hotelTotal via onTotalChange.
// ─────────────────────────────────────────────────────────────────────────────
const HotelRoomSelector = ({
  hotel,
  checkInDate,
  nights,
  onTotalChange,
  onRoomCategoryChange,
  onMealPlanChange,
  onGuestsChange,
  initial = {},
}) => {
  const [selectedRoomCategory, setSelectedRoomCategory] = useState(initial.selectedRoomCategory || "");
  const [selectedMealPlan, setSelectedMealPlan] = useState(initial.selectedMealPlan || "");
  const [numDouble, setNumDouble]       = useState(initial.numDouble      ?? 1);
  const [numExtraAdult, setNumExtraAdult] = useState(initial.numExtraAdult ?? 0);
  const [numExtraChild, setNumExtraChild] = useState(initial.numExtraChild ?? 0);
  const [numCNB, setNumCNB]             = useState(initial.numCNB         ?? 0);

  // Resolve applicable season
  const getApplicableSeason = useCallback((roomData) => {
    if (!roomData?.seasons || !checkInDate) return null;
    const d = new Date(checkInDate);
    d.setHours(0, 0, 0, 0);
    return roomData.seasons.find((s) => {
      const start = new Date(s.start); start.setHours(0, 0, 0, 0);
      const end   = new Date(s.end);   end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }) || null;
  }, [checkInDate]);

  const roomData = hotel?.rooms?.find((r) => r.categoryName === selectedRoomCategory);
  const season   = getApplicableSeason(roomData);

  // Available meal plans for current season & room
  const availableMealPlans = useMemo(() => {
    if (!season?.pricing) return MEAL_PLANS;
    return MEAL_PLANS.filter((p) => {
      const pr = season.pricing[p.toLowerCase()];
      return pr && Object.values(pr).some((v) => v > 0);
    });
  }, [season]);

  // Auto-correct meal plan when available plans change
  useEffect(() => {
    if (availableMealPlans.length && !availableMealPlans.includes(selectedMealPlan)) {
      setSelectedMealPlan(availableMealPlans[0]);
    }
  }, [availableMealPlans, selectedMealPlan]);

  // Auto-select first room category
  useEffect(() => {
    if (!selectedRoomCategory && hotel?.rooms?.length) {
      setSelectedRoomCategory(hotel.rooms[0].categoryName);
    }
  }, [hotel, selectedRoomCategory]);

  // Price calculation
  const calculateTotal = useCallback(() => {
    if (!season?.pricing || !selectedMealPlan) return 0;
    const pr = season.pricing[selectedMealPlan.toLowerCase()];
    if (!pr) return 0;
    const perNight =
      (pr.double     || 0) * numDouble +
      (pr.extraAdult || 0) * numExtraAdult +
      (pr.extraChild || 0) * numExtraChild +
      (pr.cnb        || 0) * numCNB;
    return perNight * (parseInt(nights) || 1);
  }, [season, selectedMealPlan, numDouble, numExtraAdult, numExtraChild, numCNB, nights]);

  const total = calculateTotal();

  // Bubble up changes
  useEffect(() => { onTotalChange?.(total); }, [total]);
  useEffect(() => { onRoomCategoryChange?.(selectedRoomCategory); }, [selectedRoomCategory]);
  useEffect(() => { onMealPlanChange?.(selectedMealPlan); }, [selectedMealPlan]);
  useEffect(() => {
    onGuestsChange?.({ numDouble, numExtraAdult, numExtraChild, numCNB });
  }, [numDouble, numExtraAdult, numExtraChild, numCNB]);

  if (!hotel) return null;

  return (
    <div className="space-y-5">
      {/* Room categories */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Room Category</Label>
        <div className="flex flex-wrap gap-2">
          {hotel.rooms?.map((r) => (
            <button
              key={r.categoryName}
              onClick={() => setSelectedRoomCategory(r.categoryName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                selectedRoomCategory === r.categoryName
                  ? "bg-theme-primary text-white border-theme-primary"
                  : "bg-white border-slate-200 text-slate-700 hover:border-theme-primary/60"
              }`}
            >
              {r.categoryName}
            </button>
          ))}
        </div>
      </div>

      {/* Meal plan */}
      {availableMealPlans.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Meal Plan</Label>
          <div className="flex flex-wrap gap-2">
            {availableMealPlans.map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedMealPlan(plan)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedMealPlan === plan
                    ? "bg-theme-primary text-white border-theme-primary"
                    : "bg-white border-slate-200 text-slate-700 hover:border-theme-primary/60"
                }`}
              >
                <span className="font-bold">{plan}</span>
                <span className="ml-1 opacity-70 hidden sm:inline">— {MEAL_PLAN_LABELS[plan]}</span>
              </button>
            ))}
          </div>
          {!season && checkInDate && (
            <p className="text-xs text-amber-600">⚠ No pricing season found for the selected check-in date.</p>
          )}
        </div>
      )}

      {/* Guest counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Rooms (Double)", val: numDouble,      set: setNumDouble      },
          { label: "Extra Adults",   val: numExtraAdult,  set: setNumExtraAdult  },
          { label: "Extra Children", val: numExtraChild,  set: setNumExtraChild  },
          { label: "CNB",            val: numCNB,         set: setNumCNB         },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              type="number"
              min="0"
              value={val}
              onChange={(e) => set(parseInt(e.target.value) || 0)}
              className="text-sm h-9"
            />
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between bg-theme-muted/20 rounded-lg px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {season ? `${season.name} season` : "No season matched"}
        </span>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Est. total ({nights} night{nights !== 1 ? "s" : ""})</p>
          <p className="text-xl font-bold text-theme-primary">₹{total.toLocaleString("en-IN")}</p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── 2. CustomHotelForm (inline, with pricing table + Firestore persistence) ──
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_DESCRIPTIONS = { ep: "Accommodation only", cp: "Bed + Breakfast", map: "Breakfast + Dinner", ap: "All Meals" };

const CustomHotelForm = ({ defaultState = "", onAdd, onCancel }) => {
  const [hotelName, setHotelName] = useState("");
  const [city, setCity]           = useState("");
  const [state, setState]         = useState(defaultState);
  const [rating, setRating]       = useState("3");
  const [roomType, setRoomType]   = useState("");
  const [pricing, setPricing]     = useState(EMPTY_PRICING());
  const [selectedMealPlan, setSelectedMealPlan] = useState("EP");
  const [nights, setNights]             = useState(1);
  const [numDouble, setNumDouble]       = useState(1);
  const [numExtraAdult, setNumExtraAdult] = useState(0);
  const [numExtraChild, setNumExtraChild] = useState(0);
  const [numCNB, setNumCNB]             = useState(0);
  const [checkInDate, setCheckInDate]   = useState(new Date().toISOString().split("T")[0]);
  const [existingDocId, setExistingDocId] = useState(null);
  const [isSaving, setIsSaving]         = useState(false);

  // Firestore lookup when identity is complete
  useEffect(() => {
    const name = hotelName.trim(); const c = city.trim(); const s = state.trim();
    if (!name || !c || !s) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(collection(db, "custom_hotels"), where("name", "==", name), where("city", "==", c), where("state", "==", s));
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const d = snap.docs[0];
        const data = d.data();
        setExistingDocId(d.id);
        setRating(data.rating || "3");
        setRoomType(data.roomType || "");
        setPricing(data.pricing || EMPTY_PRICING());
        setSelectedMealPlan(data.lastUsedMealPlan || "EP");
      } catch (e) { console.error(e); }
    })();
    return () => { cancelled = true; };
  }, [hotelName, city, state]);

  const handlePricingChange = (plan, type, raw) => {
    const val = raw === "" ? 0 : Math.max(0, Number(raw));
    setPricing((prev) => ({ ...prev, [plan]: { ...prev[plan], [type]: val } }));
  };

  const plansWithPrice = MEAL_PLANS.filter((p) => {
    const row = pricing[p.toLowerCase()];
    return row && Object.values(row).some((v) => v > 0);
  });

  const pricePerNight = calcCustomHotelNightPrice(pricing, selectedMealPlan, { numDouble, numExtraAdult, numExtraChild, numCNB });
  const estimatedTotal = pricePerNight * nights;

  const handleSubmit = async () => {
    if (!hotelName.trim()) { alert("Hotel name is required."); return; }
    if (!city.trim())      { alert("City is required."); return; }
    if (!state.trim())     { alert("State is required."); return; }
    if (!roomType.trim())  { alert("Room type is required."); return; }
    if (plansWithPrice.length === 0) { alert("Enter at least one price in the pricing table."); return; }

    setIsSaving(true);
    try {
      const payload = {
        name: hotelName.trim(), city: city.trim(), state: state.trim(),
        rating, roomType: roomType.trim(), pricing,
        lastUsedMealPlan: selectedMealPlan, updatedAt: new Date(),
      };
      if (existingDocId) {
        await updateDoc(doc(db, "custom_hotels", existingDocId), payload);
      } else {
        const ref = await addDoc(collection(db, "custom_hotels"), { ...payload, createdAt: new Date() });
        setExistingDocId(ref.id);
      }
    } catch (e) { console.error("Custom hotel save failed:", e); }
    finally { setIsSaving(false); }

    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (nights || 1));

    onAdd({
      hotel: hotelName.trim(), city: city.trim(), state: state.trim(),
      rating, selectedRoomCategory: roomType.trim(),
      nights, numDouble, numExtraAdult, numExtraChild, numCNB,
      selectedMealPlan, pricing, pricePerNight, hotelTotal: estimatedTotal,
      checkInDate, checkOutDate: checkOut.toISOString().split("T")[0], isCustom: true,
    });
  };

  return (
    <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10 mt-4">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="text-sm flex items-center gap-2 text-theme-primary">
          <PenLine className="h-4 w-4" />
          Add Custom Hotel
          {existingDocId && (
            <span className="ml-1 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✓ Found in records
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0 space-y-4">

        {/* Identity */}
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

        {/* Rating + room type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Star Rating</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAR_RATINGS.map((r) => <SelectItem key={r} value={r}>{r} Star{r !== "1" ? "s" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs">Room Type * (free text)</Label>
            <Input value={roomType} onChange={(e) => setRoomType(e.target.value)} placeholder="e.g. Premium Deluxe, Suite, Cottage…" className="text-sm" />
          </div>
        </div>

        {/* Pricing table */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pricing Table — rates per guest type (₹)</Label>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-xs min-w-[460px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium w-24">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">Double</th>
                  <th className="px-3 py-2 text-left font-medium">Extra Adult</th>
                  <th className="px-3 py-2 text-left font-medium">Extra Child</th>
                  <th className="px-3 py-2 text-left font-medium text-theme-primary">CNB</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries({ ep: "EP", cp: "CP", map: "MAP", ap: "AP" }).map(([planKey, planLabel]) => (
                  <tr key={planKey} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="font-bold text-xs">{planLabel}</div>
                      <div className="text-muted-foreground text-[10px]">{PLAN_DESCRIPTIONS[planKey]}</div>
                    </td>
                    {["double", "extraAdult", "extraChild", "cnb"].map((type) => (
                      <td key={type} className="px-3 py-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">₹</span>
                          <input
                            type="number" min="0"
                            value={pricing[planKey]?.[type] || ""}
                            onChange={(e) => handlePricingChange(planKey, type, e.target.value)}
                            className={`w-full h-8 pl-5 pr-2 border rounded text-right text-xs outline-none focus:ring-1 focus:ring-theme-primary
                              ${type === "cnb" ? "border-theme-primary/30" : "border-input"}`}
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

        {/* Meal plan selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Active Meal Plan for this stay</Label>
          <div className="flex flex-wrap gap-2">
            {MEAL_PLANS.map((plan) => {
              const hasPrice = plansWithPrice.includes(plan);
              return (
                <button
                  key={plan} type="button" onClick={() => setSelectedMealPlan(plan)} disabled={!hasPrice}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    ${selectedMealPlan === plan
                      ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                      : hasPrice
                        ? "bg-white border-input text-slate-700 hover:border-theme-primary/60"
                        : "bg-muted/30 border-muted text-muted-foreground cursor-not-allowed opacity-50"
                    }`}
                >
                  {plan}{hasPrice && <span className="ml-1 text-[10px] opacity-70">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates + guests */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Check-in", type: "date",   val: checkInDate,    set: setCheckInDate   },
            { label: "Nights",   type: "number",  val: nights,         set: (v) => setNights(parseInt(v)||1)         },
            { label: "Rooms",    type: "number",  val: numDouble,      set: (v) => setNumDouble(parseInt(v)||0)      },
            { label: "Ex. Adults",  type: "number", val: numExtraAdult,  set: (v) => setNumExtraAdult(parseInt(v)||0) },
            { label: "Ex. Children",type: "number", val: numExtraChild,  set: (v) => setNumExtraChild(parseInt(v)||0) },
            { label: "CNB",      type: "number",  val: numCNB,         set: (v) => setNumCNB(parseInt(v)||0)         },
          ].map(({ label, type, val, set }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <input type={type} min={type === "number" ? 0 : undefined} value={val} onChange={(e) => set(e.target.value)}
                className="w-full h-8 border rounded px-2 text-xs outline-none focus:ring-1 focus:ring-theme-primary" />
            </div>
          ))}
        </div>

        {/* Summary + actions */}
        <div className="flex items-center justify-between pt-1 border-t gap-4">
          <div className="text-sm space-y-0.5">
            <div>Per night: <span className="font-bold text-theme-primary">₹{pricePerNight.toFixed(0)}</span> <span className="text-xs text-muted-foreground">({selectedMealPlan})</span></div>
            <div>Est. total: <span className="font-bold text-theme-primary">₹{estimatedTotal.toFixed(0)}</span></div>
          </div>
          <div className="flex gap-2">
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

// ─────────────────────────────────────────────────────────────────────────────
// ── 3. TransportSelector (inline) ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const TransportSelector = ({ onTransportSelect }) => {
  const [transportStates, setTransportStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [packages, setPackages]               = useState([]);
  const [selectedPkg, setSelectedPkg]         = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCustom, setIsCustom]               = useState(false);
  const [customVehicleName, setCustomVehicleName] = useState("");
  const [customPrice, setCustomPrice]             = useState("");
  const [customAC, setCustomAC]                   = useState(false);

  useEffect(() => {
    getDocs(collection(db, "transport"))
      .then((snap) => setTransportStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedStateId) { setPackages([]); setSelectedPkg(null); setSelectedVehicle(null); return; }
    getDocs(collection(db, "transport", selectedStateId, "packages"))
      .then((snap) => setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, [selectedStateId]);

  const toTitleCase = (s) => s?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || s;

  const handleVehicleSelect = (vehicle, pkg) => {
    setSelectedVehicle(vehicle);
    onTransportSelect({
      id: pkg.id, name: pkg.name || pkg.packageName || pkg.id,
      vehicles: pkg.vehicles || [], allPkgs: packages,
      pricingType: pkg.pricingType,
      selectedVehicle: vehicle,
      isCustom: false,
    });
  };

  const handleCustomApply = () => {
    const v = { type: customVehicleName, price: parseFloat(customPrice) || 0, ac: customAC, isCustom: true };
    onTransportSelect({ name: "Custom", selectedVehicle: v, vehicles: [v], isCustom: true });
    setSelectedVehicle(v);
  };

  return (
    <div className="space-y-5">
      {/* Toggle: custom vs package */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCustom(false)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${!isCustom ? "bg-theme-primary text-white border-theme-primary" : "bg-white border-input text-slate-700"}`}
        >
          From Package
        </button>
        <button
          onClick={() => setIsCustom(true)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isCustom ? "bg-theme-primary text-white border-theme-primary" : "bg-white border-input text-slate-700"}`}
        >
          Custom
        </button>
      </div>

      {!isCustom ? (
        <div className="space-y-4">
          {/* State */}
          <div className="space-y-1.5">
            <Label className="text-sm">Transport State</Label>
            <Select value={selectedStateId} onValueChange={setSelectedStateId}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {transportStates.map((s) => <SelectItem key={s.id} value={s.id}>{toTitleCase(s.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Packages */}
          {packages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Package</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { setSelectedPkg(pkg); setSelectedVehicle(null); }}
                    className={`text-left p-3 rounded-lg border text-sm transition-all ${selectedPkg?.id === pkg.id ? "border-theme-primary bg-theme-muted/20" : "border-slate-200 hover:border-theme-primary/40"}`}
                  >
                    <p className="font-medium">{pkg.name || pkg.packageName || pkg.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pkg.vehicles?.length || 0} vehicle(s)</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicles */}
          {selectedPkg?.vehicles?.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Vehicle</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPkg.vehicles.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => handleVehicleSelect(v, selectedPkg)}
                    className={`text-left p-3 rounded-lg border text-sm transition-all ${selectedVehicle?.type === v.type ? "border-theme-primary bg-theme-muted/20" : "border-slate-200 hover:border-theme-primary/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{v.type}</p>
                      <Badge variant="outline" className="text-xs">{v.ac ? "AC" : "Non-AC"}</Badge>
                    </div>
                    <p className="text-xs text-theme-primary mt-0.5 font-semibold">
                      ₹{v.price ?? v.perKmprice}{v.perKmprice ? "/km" : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVehicle && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {selectedVehicle.type} {selectedVehicle.ac ? "(AC)" : "(Non-AC)"} — ₹{selectedVehicle.price ?? selectedVehicle.perKmprice} selected
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm">Vehicle Name</Label>
              <Input value={customVehicleName} onChange={(e) => setCustomVehicleName(e.target.value)} placeholder="e.g. Toyota Innova" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Price (₹)</Label>
              <Input type="number" min="0" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="customAC" checked={customAC} onChange={(e) => setCustomAC(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-theme-primary" />
            <Label htmlFor="customAC" className="text-sm">AC Vehicle</Label>
          </div>
          <Button onClick={handleCustomApply} className="bg-theme-primary hover:bg-theme-secondary text-sm">
            Apply Custom Transport
          </Button>
          {selectedVehicle?.isCustom && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {selectedVehicle.type} {selectedVehicle.ac ? "(AC)" : "(Non-AC)"} — ₹{selectedVehicle.price} applied
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── 4. ActivitySelector (inline) ──────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const ActivitySelector = ({ selectedState, initialActivities = [], onDone }) => {
  const [activities, setActivities]   = useState([]);
  const [isFetching, setIsFetching]   = useState(false);
  const [selected, setSelected]       = useState(initialActivities);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm]   = useState({ name: "", city: "", state: selectedState || "", description: "", participants: 1, pricePerPerson: 0 });

  useEffect(() => {
    if (!selectedState) return;
    setIsFetching(true);
    getDocs(query(collection(db, "activities"), where("state", "==", selectedState)))
      .then((snap) => setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [selectedState]);

  const totalPrice = selected.reduce((s, a) => s + (a.totalPrice || 0), 0);

  const addActivity = (act) => {
    if (selected.some((a) => a.name === act.name)) { alert("Already added."); return; }
    const entry = {
      name: act.name, city: act.city, state: act.state,
      fitRatePerPerson: act.fitRatePerPerson || 0, groupRatePerPerson: act.groupRatePerPerson || 0,
      participants: 1, totalPrice: parseFloat(act.fitRatePerPerson || act.groupRatePerPerson || 0), isCustom: false,
    };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const updateParticipants = (idx, val) => {
    const n = parseInt(val) || 1;
    const updated = selected.map((a, i) => {
      if (i !== idx) return a;
      const rate = a.isCustom ? a.pricePerPerson || 0 : n > 10 ? a.groupRatePerPerson : a.fitRatePerPerson;
      return { ...a, participants: n, totalPrice: rate * n };
    });
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const removeActivity = (idx) => {
    const updated = selected.filter((_, i) => i !== idx);
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const addCustomActivity = () => {
    if (!customForm.name.trim()) { alert("Activity name is required."); return; }
    if (!customForm.city.trim()) { alert("City is required."); return; }
    const totalPrice = (parseFloat(customForm.pricePerPerson) || 0) * (parseInt(customForm.participants) || 1);
    const entry = { ...customForm, isCustom: true, totalPrice, fitRatePerPerson: customForm.pricePerPerson, groupRatePerPerson: customForm.pricePerPerson };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
    setShowCustomForm(false);
    setCustomForm({ name: "", city: "", state: selectedState || "", description: "", participants: 1, pricePerPerson: 0 });
  };

  return (
    <div className="space-y-4">
      {/* Available activities */}
      {isFetching ? (
        <p className="text-sm text-muted-foreground">Loading activities…</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities found for {selectedState}.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activities.map((act) => {
            const isAdded = selected.some((a) => a.name === act.name);
            return (
              <button
                key={act.id}
                onClick={() => !isAdded && addActivity(act)}
                disabled={isAdded}
                className={`text-left p-3 rounded-lg border text-sm transition-all ${isAdded ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 hover:border-theme-primary/40"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{act.name}</p>
                  {isAdded && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground">{act.city} • ₹{act.fitRatePerPerson || act.groupRatePerPerson}/person</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Add custom activity toggle */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowCustomForm((p) => !p)} className="text-xs border-theme-primary/40 text-theme-primary">
          <PenLine className="h-3 w-3 mr-1" /> Add Custom Activity
        </Button>
      </div>

      {/* Custom activity form */}
      {showCustomForm && (
        <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Activity Name *</Label>
                <Input value={customForm.name} onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City *</Label>
                <Input value={customForm.city} onChange={(e) => setCustomForm((p) => ({ ...p, city: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Participants</Label>
                <Input type="number" min="1" value={customForm.participants} onChange={(e) => setCustomForm((p) => ({ ...p, participants: parseInt(e.target.value) || 1 }))} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price/Person (₹)</Label>
                <Input type="number" min="0" value={customForm.pricePerPerson} onChange={(e) => setCustomForm((p) => ({ ...p, pricePerPerson: parseFloat(e.target.value) || 0 }))} className="text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-theme-primary">₹{((parseFloat(customForm.pricePerPerson) || 0) * (parseInt(customForm.participants) || 1)).toFixed(0)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCustomForm(false)} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={addCustomActivity} className="bg-theme-primary hover:bg-theme-secondary text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected activities */}
      {selected.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Activities</p>
          {selected.map((act, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-white border rounded-lg text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">{act.name}</p>
                  {act.isCustom && <Badge variant="outline" className="text-[10px] px-1.5">Custom</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{act.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input
                  type="number" min="1" value={act.participants}
                  onChange={(e) => updateParticipants(i, e.target.value)}
                  className="w-16 h-7 text-xs text-center"
                />
                <span className="text-xs text-muted-foreground">×</span>
                <span className="text-xs font-semibold text-theme-primary w-20 text-right">₹{act.totalPrice?.toFixed(0)}</span>
                <button onClick={() => removeActivity(i)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Total Activities</span>
            <span className="text-theme-primary">₹{totalPrice.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const router       = useRouter();
  const searchParams = useSearchParams();
  const dispatch     = useDispatch();
  const { user }     = useSelector((state) => state.auth);
  const {
    hotelEntries,
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName: reduxCustomerName,
  } = useSelector((state) => state.package);

  // ── Prop aliases ──
  const checkInDate    = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate   = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges    = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

  // ── Local state ──
  const [hotels, setHotels]             = useState([]);
  const [states, setStates]             = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [nights, setNights]             = useState(1);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isReadyToAddAnother, setIsReadyToAddAnother] = useState(false);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [showCustomHotelForm, setShowCustomHotelForm] = useState(false);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType]     = useState("lumpsum");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customerName, setCustomerName] = useState("");

  // HotelRoomSelector bubble-up state
  const [roomCategory, setRoomCategory]     = useState("");
  const [mealPlan, setMealPlan]             = useState("");
  const [guests, setGuests]                 = useState({ numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 });
  const [currentHotelTotal, setCurrentHotelTotal] = useState(0);

  // ── ID / lead linking (preserved from original) ──
  const customerId = searchParams.get("customerId") || searchParams.get("customerid");
  const leadId     = searchParams.get("leadId");

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

  // ── Fetch hotels & states ──
  useEffect(() => {
    getDocs(collection(db, "hotels")).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), rooms: d.data().rooms || [] }));
      const unique = [...new Map(list.map((h) => [`${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`, h])).values()];
      setHotels(unique);
    });
    getDocs(collection(db, "locations")).then((snap) => setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  // ── Auto checkout date ──
  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    setCheckOutDate(d.toISOString().split("T")[0]);
  }, [checkInDate, nights]);

  // ── Derived ──
  const filteredHotels = useMemo(() => hotels.filter((h) => h.state?.toLowerCase() === selectedState.toLowerCase()), [hotels, selectedState]);
  const groupedHotels  = useMemo(() => filteredHotels.reduce((acc, h) => { const c = h.city || "Other"; if (!acc[c]) acc[c] = []; acc[c].push(h); return acc; }, {}), [filteredHotels]);
  const selectedHotelData = hotels.find((h) => h.id === selectedHotelId);
  const hotelTotalPrice   = hotelEntries.reduce((s, e) => s + Number(e.hotelTotal || 0), 0);
  const transportTotalPrice = selectedTransport?.selectedVehicle?.price ? Number(selectedTransport.selectedVehicle.price) : 0;
  const grandTotal = hotelTotalPrice + transportTotalPrice + activityTotalPrice + confirmedMarkup;

  // ── Save hotel ──
  const handleSaveHotel = () => {
    if (!selectedHotelData) { alert("Please select a hotel."); return; }
    if (!mealPlan) { alert("Please select a meal plan."); return; }
    const entry = {
      checkInDate, nights, checkOutDate, state: selectedState,
      hotel: selectedHotelData.name, city: selectedHotelData.city,
      GoogleListingURL: selectedHotelData.GoogleListingURL || null,
      numDouble: guests.numDouble, numExtraAdult: guests.numExtraAdult,
      numExtraChild: guests.numExtraChild, numCNB: guests.numCNB,
      hotelTotal: currentHotelTotal, selectedMealPlan: mealPlan,
      selectedRoomCategory: roomCategory, isCustom: false,
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
    setSelectedHotelId(hotels.find((h) => h.name === entry.hotel && h.city === entry.city)?.id || null);
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

  // ── Custom hotel add ──
  const handleCustomHotelAdd = (data) => {
    dispatch(addHotelEntry(data));
    setShowCustomHotelForm(false);
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
  };

  // ── Activity done ──
  const handleActivitiesDone = (activities, total) => {
    dispatch(setSelectedActivities({ activities, totalPrice: total }));
  };

  // ── Markup apply ──
  const handleApplyMarkup = () => {
    const base = hotelTotalPrice + transportTotalPrice + activityTotalPrice;
    const markup = markupType === "percentage" ? (markupAmount / 100) * base : markupAmount;
    dispatch(setConfirmedMarkup(markup));
  };

  // ── Meals helper ──
  const calculateTotalMeals = (entries) => {
    let totalBreakfasts = 0, totalLunches = 0, totalDinners = 0;
    entries.forEach(({ selectedMealPlan, nights }) => {
      const n = parseInt(nights, 10);
      if (isNaN(n)) return;
      if (selectedMealPlan === "CP")  { totalBreakfasts += n; }
      if (selectedMealPlan === "MAP") { totalBreakfasts += n; totalDinners += n; }
      if (selectedMealPlan === "AP")  { totalBreakfasts += n; totalLunches += n; totalDinners += n; }
    });
    return { totalBreakfasts, totalLunches, totalDinners };
  };

  // ── Clipboard summary ──
  const generatePackageSummary = () => {
    if (!hotelEntries.length) return "Hotel details not available.";
    const first = hotelEntries[0];
    let s = `Dear Guests,\n\nGreetings from Adwait Tours!!\n`;
    s += `Kindly find the best possible rates for your requirement starting ${formatDate(first.checkInDate)}\n`;
    s += `${first.numDouble || 0} Couple\n${first.numExtraChild || 0} Extra Child\n${first.numExtraAdult || 0} Extra Adult\n\n *HOTELS*\n`;
    hotelEntries.forEach((e, idx) => {
      const fullH = hotels.find((h) => h.name === e.hotel && h.city === e.city);
      s += `${idx + 1}. ${e.hotel.toUpperCase()} ${fullH?.GoogleListingURL || ""}\n`;
      s += ` ⇒ ${e.city}, ${e.state}\n`;
      s += ` ⇒ Hotel Room Count: ${e.numDouble || 0} Room Category: ${(e.selectedRoomCategory || "").toUpperCase()}\n`;
      s += ` ⇒ ${formatDate(e.checkInDate)} to ${formatDate(e.checkOutDate)} (${e.nights} Nights, ${MEAL_PLAN_LABELS[e.selectedMealPlan] || e.selectedMealPlan})\n\n`;
    });
    s += `*TOTAL TOUR COST = ₹${grandTotal.toLocaleString("en-IN")}/-*\n\n*INCLUDED*\n`;
    const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);
    if (totalBreakfasts > 0) s += `✅ ${totalBreakfasts} Breakfast(s)\n`;
    if (totalLunches > 0)    s += `✅ ${totalLunches} Lunch(es)\n`;
    if (totalDinners > 0)    s += `✅ ${totalDinners} Dinner(s)\n`;
    if (!totalBreakfasts && !totalLunches && !totalDinners) s += `✅ No meals included (EP Plan)\n`;
    if (selectedTransport?.selectedVehicle) {
      const v = selectedTransport.selectedVehicle;
      s += `✅ ${v.type || v.name} ${v.ac ? "AC" : "Non-AC"} for all sightseeing and transfer\n`;
      s += `✅ Toll, Parking, Driver Allowance, Permits\n`;
    }
    selectedActivities?.forEach((act) => { s += `✅ ${act.name.toUpperCase()} (${act.city}) - ${act.participants} Person\n`; });
    s += `\n*EXCLUDED*\n❌ Train / Flight Fare\n❌ Early check in and late check out as per hotel policy\n❌ Medical, Emergency, Entry Tickets, activities, expenses\n❌ Anything not mentioned in included\n`;
    return s;
  };

  const handleCopyToClipboard = () => {
    const summary = generatePackageSummary();
    const ta = document.createElement("textarea");
    ta.value = summary;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
    document.body.appendChild(ta);
    try {
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      if (!ok && navigator.clipboard) { navigator.clipboard.writeText(summary).then(() => toast("Copied!")).catch(() => toast.error("Copy failed")); return; }
      if (ok) toast("Package summary copied!"); else toast.error("Copy failed.");
    } catch { toast.error("Copy error."); }
    finally { document.body.removeChild(ta); }
  };

  // ── PDF (preserved from original) ──
  const handleExportToPDF = () => {
    if (!hotelEntries.length) { alert("Add at least one hotel before exporting."); return; }
    const pdfdoc = new jsPDF();
    const BRAND = "#0D47A1";
    const img = new Image();
    img.src = "./adwait-logo.jpg";
    img.onload = () => {
      const addHeader = () => {
        const lw = 40, lh = (img.height * lw) / img.width;
        pdfdoc.addImage(img, "PNG", 15, 10, lw, lh);
        pdfdoc.setFont("helvetica", "bold"); pdfdoc.setFontSize(16); pdfdoc.setTextColor(BRAND);
        pdfdoc.text("Adwait Tours", 60, 18);
        pdfdoc.setFont("helvetica", "normal"); pdfdoc.setFontSize(10); pdfdoc.setTextColor("#444");
        pdfdoc.text("Travel Package Quotation", 60, 25);
        pdfdoc.setFontSize(8);
        pdfdoc.text("Phone: +91 9884798483", 160, 14);
        pdfdoc.text("Email: sales@adwaittours.com", 160, 19);
        pdfdoc.text("Web: www.adwaittours.com", 160, 24);
        pdfdoc.setDrawColor("#CCC"); pdfdoc.setLineWidth(0.2); pdfdoc.line(15, 32, 200, 32);
      };
      const addFooter = () => {
        pdfdoc.setDrawColor("#CCC"); pdfdoc.setLineWidth(0.2); pdfdoc.line(15, 282, 200, 282);
        pdfdoc.setFontSize(8); pdfdoc.setTextColor("#444");
        pdfdoc.text("Thank you for choosing Adwait Tours!", 107, 287, { align: "center" });
        pdfdoc.text("For Reviews: Google Page | Follow Us: Instagram", 107, 291, { align: "center" });
      };
      addHeader();
      let y = 42;
      autoTable(pdfdoc, {
        startY: y,
        body: [
          ["Customer Name:", customerName || "N/A", "Date:", formatDate(new Date().toISOString())],
          ["Package Name:", packageName || "N/A", "Guests:", `${hotelEntries[0]?.numDouble || 0} Couple(s), ${hotelEntries[0]?.numExtraAdult || 0} Adult(s), ${hotelEntries[0]?.numExtraChild || 0} Child(ren)`],
        ],
        theme: "plain", styles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
        margin: { left: 15, right: 15 },
      });
      y = pdfdoc.lastAutoTable.finalY + 8;
      pdfdoc.setFont("helvetica", "bold"); pdfdoc.setFontSize(11); pdfdoc.text("Hotel Details", 15, y);
      autoTable(pdfdoc, {
        startY: y + 5,
        head: [["Hotel Name", "City", "Room Type", "Dates", "Nights", "Meal Plan"]],
        body: hotelEntries.map((h) => [h.hotel, h.city, h.selectedRoomCategory, `${formatDate(h.checkInDate)} - ${formatDate(h.checkOutDate)}`, h.nights, MEAL_PLAN_LABELS[h.selectedMealPlan] || h.selectedMealPlan]),
        theme: "grid", headStyles: { fillColor: BRAND }, styles: { fontSize: 9, cellPadding: 2 },
        margin: { left: 15, right: 15 }, didDrawPage: () => addHeader(),
      });
      y = pdfdoc.lastAutoTable.finalY;
      autoTable(pdfdoc, {
        startY: y + 10,
        body: [[{ content: "Grand Total Tour Cost:", styles: { fontStyle: "bold", textColor: BRAND } }, { content: `Rs. ${grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/-`, styles: { halign: "right", fontStyle: "bold", textColor: BRAND } }]],
        theme: "grid", styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 120 } }, margin: { left: 15, right: 15 }, didDrawPage: () => addHeader(),
      });
      y = pdfdoc.lastAutoTable.finalY + 12;
      pdfdoc.setFont("helvetica", "bold"); pdfdoc.setFontSize(11); pdfdoc.text("Inclusions & Exclusions", 15, y);
      const { totalBreakfasts, totalLunches, totalDinners } = calculateTotalMeals(hotelEntries);
      const included = ["• Hotel accommodation as specified."];
      if (totalBreakfasts > 0) included.push(`• ${totalBreakfasts} Breakfast(s)`);
      if (totalLunches > 0)    included.push(`• ${totalLunches} Lunch(es)`);
      if (totalDinners > 0)    included.push(`• ${totalDinners} Dinner(s)`);
      if (!totalBreakfasts && !totalLunches && !totalDinners) included.push("• No meals included (EP Plan)");
      if (selectedTransport?.selectedVehicle) { const v = selectedTransport.selectedVehicle; included.push(`• Private ${v.type || v.name}${v.ac ? " (AC)" : ""}.`); included.push("• Toll, parking fees, driver allowance, and permits."); }
      selectedActivities?.forEach((a) => included.push(`• ${a.name} (${a.city}) - ${a.participants} Person(s)`));
      const excluded = ["• Train / Flight Fare.", "• Early check-in & late check-out.", "• Anything not in the Included list."];
      const colW = 85;
      const body = Array.from({ length: Math.max(included.length, excluded.length) }, (_, i) => [included[i] ? pdfdoc.splitTextToSize(included[i], colW) : "", excluded[i] ? pdfdoc.splitTextToSize(excluded[i], colW) : ""]);
      autoTable(pdfdoc, {
        startY: y + 5, head: [["INCLUDED", "EXCLUDED"]], body,
        headStyles: { fillColor: BRAND, halign: "center" }, theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 }, margin: { left: 15, right: 15 }, didDrawPage: () => addHeader(),
      });
      addFooter();
      pdfdoc.save("Travel_Package_Quotation.pdf");
    };
    img.onerror = () => alert("Could not load company logo.");
  };

  // ── Save package ──
  const handleSavePackage = async () => {
    if (!packageName.trim())  { alert("Please enter a package name."); return; }
    if (!customerName.trim()) { alert("Please enter a customer name."); return; }
    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Not logged in");
      const c_data = customerId
        ? { customerId, customerName }
        : leadId
          ? { leadId, leadName: customerName }
          : { customerName };
      await addDoc(collection(doc(db, "saved_packages_by_agents", agentId), "packages"), {
        packageName, ...c_data, status: "Draft", createdAt: serverTimestamp(),
        markup: confirmedMarkup || 0, grandTotal: grandTotal || 0,
        hotelSummary: hotelEntries, activitySummary: selectedActivities,
        transportSummary: selectedTransport ? {
          vehicles: selectedTransport.vehicles || [],
          allPkgs: selectedTransport.allPkgs || [],
          packageName: selectedTransport.name || "Custom",
          vehicleName: selectedTransport.selectedVehicle?.type || "",
          seats: selectedTransport.selectedVehicle?.seating || "",
          price: selectedTransport.selectedVehicle?.price || 0,
          ac: selectedTransport.selectedVehicle?.ac || false,
          isCustom: selectedTransport.selectedVehicle?.isCustom || false,
          perKmprice: selectedTransport.selectedVehicle?.perKmprice || 0,
          pricingType: selectedTransport.pricingType || "fixed",
        } : null,
      });
      toast("Package saved successfully! ✅");
      router.push("./agent-panel/my-quatation");
      setShowSaveModal(false);
      dispatch(setPackageName(""));
    } catch (err) { console.error(err); toast.error("Failed to save: " + err.message); }
  };

  const showRightPanel = selectedActivities.length > 0 || hotelEntries.length > 0 || selectedTransport;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 xl:gap-10">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 space-y-6 lg:pr-4 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">

            {/* 1. Date + nights + state */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><Calendar className="h-4 w-4 text-theme-primary" /> Check-in</Label>
                    <Input type="date" value={checkInDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setCheckInDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Nights</Label>
                    <Input type="number" min={1} value={nights} onChange={(e) => setNights(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Check-out</Label>
                    <Input type="date" value={checkOutDate} readOnly className="bg-slate-50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5"><MapPin className="h-4 w-4 text-theme-primary" /> State</Label>
                    <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedHotelId(null); setShowCustomHotelForm(false); }}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {states.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Hotel selection */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 sm:p-6 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-theme-primary" /> Hotels in {selectedState}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-2 space-y-4">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-muted-foreground text-sm">No hotels found in {selectedState}.</p>
                      <Button onClick={() => setShowCustomHotelForm(true)} className="bg-theme-primary hover:bg-theme-secondary" size="sm">
                        <PenLine className="h-4 w-4 mr-2" /> Add Custom Hotel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {Object.keys(groupedHotels).map((city) => (
                          <div key={city} className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-theme-secondary">{city}</p>
                            {groupedHotels[city].map((h) => (
                              <label key={h.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${selectedHotelId === h.id ? "border-theme-primary bg-theme-muted/20" : "border-slate-100 hover:border-theme-primary/40 hover:bg-slate-50"}`}>
                                <input type="radio" name="hotel" value={h.id} checked={selectedHotelId === h.id} onChange={() => { setSelectedHotelId(h.id); setShowCustomHotelForm(false); }} className="accent-theme-primary" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{h.name}</p>
                                  <p className="text-[11px] text-muted-foreground">⭐ {h.GoogleReviewRating || "N/A"} • {h.city}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowCustomHotelForm((p) => !p)} className="text-xs border-theme-primary/40 text-theme-primary">
                          <PenLine className="h-3.5 w-3.5 mr-1" /> {showCustomHotelForm ? "Hide" : "Add Custom Hotel"}
                        </Button>
                      </div>
                    </>
                  )}

                  {showCustomHotelForm && (
                    <CustomHotelForm defaultState={selectedState} onAdd={handleCustomHotelAdd} onCancel={() => setShowCustomHotelForm(false)} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* 3. Room selector (only for DB hotels) */}
            {selectedHotelData && !showCustomHotelForm && (
              <Card className="border-theme-primary/20 shadow-sm">
                <CardHeader className="p-3 sm:p-6 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-theme-primary" />
                    {selectedHotelData.name}
                    <span className="text-sm font-normal text-muted-foreground">— {selectedHotelData.city}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <HotelRoomSelector
                    hotel={selectedHotelData}
                    checkInDate={checkInDate}
                    nights={nights}
                    onTotalChange={setCurrentHotelTotal}
                    onRoomCategoryChange={setRoomCategory}
                    onMealPlanChange={setMealPlan}
                    onGuestsChange={setGuests}
                    initial={editingIndex !== null ? hotelEntries[editingIndex] : {}}
                  />

                  <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t">
                    <Button onClick={handleSaveHotel} className="bg-theme-primary hover:bg-theme-secondary">
                      {editingIndex !== null ? "Update Hotel" : "Save Hotel"}
                    </Button>
                    {isReadyToAddAnother && (
                      <Button variant="outline" onClick={handleAddAnotherHotel} className="border-theme-primary text-theme-primary">
                        <Plus className="h-4 w-4 mr-1" /> Add Another Hotel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Saved itinerary */}
            {hotelEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" /> Saved Hotels
                </h3>
                {hotelEntries.map((entry, idx) => (
                  <Card key={idx} className={`border-slate-200 shadow-sm ${entry.isCustom ? "border-l-4 border-l-theme-primary/40" : ""}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-theme-dark">{entry.hotel}</p>
                            {entry.isCustom && <Badge variant="outline" className="text-[10px] px-1.5">Custom</Badge>}
                          </div>
                          {entry.rating && <div className="flex gap-0.5">{renderStars(entry.rating)}</div>}
                          <p className="text-sm text-muted-foreground">{entry.city}, {entry.state}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{formatDate(entry.checkInDate)} → {formatDate(entry.checkOutDate)}</span>
                            <span>• {entry.nights} night{entry.nights > 1 ? "s" : ""}</span>
                            <span>• {entry.selectedRoomCategory}</span>
                            <span>• {entry.selectedMealPlan}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-xl font-bold text-theme-primary">₹{Number(entry.hotelTotal || 0).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleEditHotel(idx)} className="p-2 text-muted-foreground hover:text-theme-primary hover:bg-theme-muted/30 rounded-lg">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => dispatch(deleteHotelEntry(idx))} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 5. Transport */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-3 sm:p-6 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Car className="h-5 w-5 text-theme-primary" /> Transport</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {!showTransportSection ? (
                  <Button onClick={() => setShowTransportSection(true)} className="w-full bg-theme-primary hover:bg-theme-secondary">
                    <Plus className="h-4 w-4 mr-2" /> Add Transport
                  </Button>
                ) : (
                  <TransportSelector onTransportSelect={(t) => dispatch(setSelectedTransport(t))} />
                )}
              </CardContent>
            </Card>

            {/* 6. Activities */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-3 sm:p-6 pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Palmtree className="h-5 w-5 text-theme-primary" /> Activities</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {!showActivitiesSection ? (
                  <Button onClick={() => setShowActivitiesSection(true)} className="w-full bg-theme-primary hover:bg-theme-secondary">
                    <Plus className="h-4 w-4 mr-2" /> Add Activities
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Select State for Activities</Label>
                      <Select value={selectedState} onValueChange={setSelectedState}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {states.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button onClick={handleCopyToClipboard} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-black text-sm shadow-sm">
                <Copy className="h-4 w-4" /> Copy Summary
              </button>
              <button onClick={handleExportToPDF} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm shadow-sm">
                <FileText className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN — sticky pricing panel ── */}
          {showRightPanel && (
            <div className="lg:w-96 xl:w-[420px] lg:min-w-[360px] lg:sticky lg:top-6 lg:self-start space-y-5 pt-6 lg:pt-0">

              {/* Markup */}
              <Card className="shadow-md">
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-5 w-5 text-theme-primary" /> Add Markup</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs">Amount / %</Label>
                      <Input type="number" value={markupAmount} onChange={(e) => setMarkupAmount(Number(e.target.value))} />
                    </div>
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lumpsum">Lumpsum (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleApplyMarkup} className="bg-theme-secondary hover:bg-theme-secondary/90">Apply</Button>
                  </div>
                  <p className="mt-3 text-sm font-bold text-theme-dark">
                    Confirmed Markup: ₹{confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </p>
                </CardContent>
              </Card>

              {/* Grand total */}
              <div className="p-5 bg-theme-dark text-white rounded-xl shadow-xl space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" /> Grand Total
                </h3>
                <div className="space-y-2.5 text-sm opacity-90">
                  {[
                    ["Hotels", `₹${hotelTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
                    ["Transport", `₹${transportTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
                    ["Activities", `₹${activityTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
                    ["Markup", `₹${confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span>{label}</span><span className="font-medium">{val}</span>
                    </div>
                  ))}
                </div>
                <hr className="border-white/20" />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-base">Final Total</span>
                  <span className="text-3xl font-black">₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
                <Button onClick={() => setShowSaveModal(true)} className="w-full py-6 bg-theme-primary hover:bg-theme-secondary font-bold text-base shadow-md">
                  <Save className="h-5 w-5 mr-2" /> Save Package
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Save modal ── */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
          <div className="bg-white p-7 rounded-xl w-full max-w-md shadow-2xl space-y-5 mx-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-theme-dark">Finalize Package</h2>
              <button onClick={() => setShowSaveModal(false)} className="text-muted-foreground hover:text-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Package Name</Label>
                <Input value={packageName} onChange={(e) => dispatch(setPackageName(e.target.value))} placeholder="e.g. Goa Delight 4N/5D" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  disabled={!!customerId}
                  className={customerId ? "bg-slate-100 cursor-not-allowed" : ""}
                />
                {(customerId || leadId) && (
                  <p className="text-xs text-muted-foreground">
                    {customerId ? "Linked to customer" : "Linked to lead"} — name auto-filled.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button onClick={handleSavePackage} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" /> Save Package
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create_new_package;