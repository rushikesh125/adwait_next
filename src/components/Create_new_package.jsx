"use client";
// src/components/Create_new_package.jsx
// Enhanced UI with full functionality preserved

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
  X,
  BedDouble,
  Utensils,
  Users,
  User,
  BusFront,
  Flame,
  Moon,
  Sun,
  ArrowRight,
  Activity,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];
const MEAL_PLAN_LABELS = {
  EP: "Accommodation only",
  CP: "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP: "All Meals",
};
const MEAL_PLAN_ICONS = {
  EP: "🏨",
  CP: "🍳",
  MAP: "🍽️",
  AP: "🍱",
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
// ── HotelRoomSelector (inline) ────────────────────────────────────────────
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

  const availableMealPlans = useMemo(() => {
    if (!season?.pricing) return MEAL_PLANS;
    return MEAL_PLANS.filter((p) => {
      const pr = season.pricing[p.toLowerCase()];
      return pr && Object.values(pr).some((v) => v > 0);
    });
  }, [season]);

  useEffect(() => {
    if (availableMealPlans.length && !availableMealPlans.includes(selectedMealPlan)) {
      setSelectedMealPlan(availableMealPlans[0]);
    }
  }, [availableMealPlans, selectedMealPlan]);

  useEffect(() => {
    if (!selectedRoomCategory && hotel?.rooms?.length) {
      setSelectedRoomCategory(hotel.rooms[0].categoryName);
    }
  }, [hotel, selectedRoomCategory]);

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

  useEffect(() => { onTotalChange?.(total); }, [total]);
  useEffect(() => { onRoomCategoryChange?.(selectedRoomCategory); }, [selectedRoomCategory]);
  useEffect(() => { onMealPlanChange?.(selectedMealPlan); }, [selectedMealPlan]);
  useEffect(() => {
    onGuestsChange?.({ numDouble, numExtraAdult, numExtraChild, numCNB });
  }, [numDouble, numExtraAdult, numExtraChild, numCNB]);

  if (!hotel) return null;

  const pricePerNight = total / (parseInt(nights) || 1);

  return (
    <div className="space-y-6">
      {/* Room categories */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5" /> Room Category
        </Label>
        <div className="flex flex-wrap gap-2">
          {hotel.rooms?.map((r) => (
            <button
              key={r.categoryName}
              onClick={() => setSelectedRoomCategory(r.categoryName)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all shadow-sm ${
                selectedRoomCategory === r.categoryName
                  ? "bg-theme-primary text-white border-theme-primary shadow-theme-primary/25"
                  : "bg-white border-slate-200 text-slate-700 hover:border-theme-primary/50 hover:shadow-md"
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
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Utensils className="h-3.5 w-3.5" /> Meal Plan
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {availableMealPlans.map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedMealPlan(plan)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  selectedMealPlan === plan
                    ? "bg-theme-primary text-white border-theme-primary"
                    : "bg-white border-slate-200 hover:border-theme-primary/40"
                }`}
              >
                <div className="text-lg mb-0.5">{MEAL_PLAN_ICONS[plan]}</div>
                <div className="font-bold text-sm">{plan}</div>
                <div className={`text-[10px] leading-tight mt-0.5 ${selectedMealPlan === plan ? "text-white/80" : "text-slate-500"}`}>
                  {MEAL_PLAN_LABELS[plan]}
                </div>
              </button>
            ))}
          </div>
          {!season && checkInDate && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
              <Info className="h-4 w-4 flex-shrink-0" />
              No pricing season found for the selected check-in date.
            </div>
          )}
        </div>
      )}

      {/* Guest counts */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Guest Configuration
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Rooms (Double)", val: numDouble, set: setNumDouble, icon: "🛏️" },
            { label: "Extra Adults", val: numExtraAdult, set: setNumExtraAdult, icon: "👤" },
            { label: "Extra Children", val: numExtraChild, set: setNumExtraChild, icon: "👧" },
            { label: "CNB", val: numCNB, set: setNumCNB, icon: "🛌" },
          ].map(({ label, val, set, icon }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs text-slate-500">{icon} {label}</Label>
              <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-theme-primary transition-colors">
                <button onClick={() => set(Math.max(0, val - 1))} className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 text-sm font-bold">−</button>
                <span className="flex-1 text-center text-sm font-semibold">{val}</span>
                <button onClick={() => set(val + 1)} className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 text-sm font-bold">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="rounded-xl border-2 border-theme-primary/20 bg-gradient-to-br from-theme-primary/5 to-theme-primary/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">{season ? `${season.name || "Current"} season` : "Pricing"}</p>
            <p className="text-sm text-slate-600 mt-0.5">
              ₹{pricePerNight.toLocaleString("en-IN", { maximumFractionDigits: 0 })} / night × {nights} night{nights !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Est. Total</p>
            <p className="text-2xl font-black text-theme-primary">₹{total.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── CustomHotelForm (inline) ──────────────────────────────────────────────
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
                            className="w-full h-8 pl-5 pr-2 border rounded text-right text-xs outline-none focus:ring-1 focus:ring-theme-primary border-input"
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

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Check-in", type: "date", val: checkInDate, set: setCheckInDate },
            { label: "Nights", type: "number", val: nights, set: (v) => setNights(parseInt(v)||1) },
            { label: "Rooms", type: "number", val: numDouble, set: (v) => setNumDouble(parseInt(v)||0) },
            { label: "Ex. Adults", type: "number", val: numExtraAdult, set: (v) => setNumExtraAdult(parseInt(v)||0) },
            { label: "Ex. Children", type: "number", val: numExtraChild, set: (v) => setNumExtraChild(parseInt(v)||0) },
            { label: "CNB", type: "number", val: numCNB, set: (v) => setNumCNB(parseInt(v)||0) },
          ].map(({ label, type, val, set }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <input type={type} min={type === "number" ? 0 : undefined} value={val} onChange={(e) => set(e.target.value)}
                className="w-full h-8 border rounded px-2 text-xs outline-none focus:ring-1 focus:ring-theme-primary" />
            </div>
          ))}
        </div>

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
// ── TransportSelector (inline) ────────────────────────────────────────────
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
      <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
        {["From Package", "Custom"].map((label, i) => (
          <button
            key={label}
            onClick={() => setIsCustom(i === 1)}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              isCustom === (i === 1)
                ? "bg-white text-theme-primary shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!isCustom ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-theme-primary" /> Transport State
            </Label>
            <Select value={selectedStateId} onValueChange={setSelectedStateId}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {transportStates.map((s) => <SelectItem key={s.id} value={s.id}>{toTitleCase(s.id)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {packages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Package</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { setSelectedPkg(pkg); setSelectedVehicle(null); }}
                    className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                      selectedPkg?.id === pkg.id
                        ? "border-theme-primary bg-theme-primary/5"
                        : "border-slate-200 hover:border-theme-primary/40"
                    }`}
                  >
                    <p className="font-semibold">{pkg.name || pkg.packageName || pkg.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pkg.vehicles?.length || 0} vehicle(s) available</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedPkg?.vehicles?.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Choose Vehicle</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPkg.vehicles.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => handleVehicleSelect(v, selectedPkg)}
                    className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                      selectedVehicle?.type === v.type
                        ? "border-theme-primary bg-theme-primary/5"
                        : "border-slate-200 hover:border-theme-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">🚗 {v.type}</p>
                      <Badge variant={v.ac ? "default" : "outline"} className={`text-xs ${v.ac ? "bg-green-100 text-green-800 border-green-200" : ""}`}>
                        {v.ac ? "AC" : "Non-AC"}
                      </Badge>
                    </div>
                    <p className="text-sm font-bold text-theme-primary mt-1">
                      ₹{(v.price ?? v.perKmprice ?? 0).toLocaleString("en-IN")}{v.perKmprice ? "/km" : ""}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedVehicle && !selectedVehicle.isCustom && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{selectedVehicle.type}</span>
              <span className="text-green-600">{selectedVehicle.ac ? "(AC)" : "(Non-AC)"}</span>
              <span>—</span>
              <span className="font-bold">₹{selectedVehicle.price ?? selectedVehicle.perKmprice}</span>
              <span className="text-green-600 text-xs">selected ✓</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm">Vehicle Name</Label>
              <Input value={customVehicleName} onChange={(e) => setCustomVehicleName(e.target.value)} placeholder="e.g. Toyota Innova Crysta" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Price (₹)</Label>
              <Input type="number" min="0" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="customAC" checked={customAC} onChange={(e) => setCustomAC(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-theme-primary" />
            <Label htmlFor="customAC" className="text-sm cursor-pointer">AC Vehicle</Label>
          </div>
          <Button onClick={handleCustomApply} className="bg-theme-primary hover:bg-theme-secondary text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Apply Custom Transport
          </Button>
          {selectedVehicle?.isCustom && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{selectedVehicle.type}</span> {selectedVehicle.ac ? "(AC)" : "(Non-AC)"} — ₹{selectedVehicle.price} applied ✓
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── ActivitySelector (inline) ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
const ActivitySelector = ({ selectedState, initialActivities = [], onDone }) => {
  const [activities, setActivities]   = useState([]);
  const [isFetching, setIsFetching]   = useState(false);
  const [selected, setSelected]       = useState(initialActivities);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm]   = useState({
    name: "", city: "", state: selectedState || "",
    description: "", participants: 1, pricePerPerson: 0,
  });

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
      fitRatePerPerson: act.fitRatePerPerson || 0,
      groupRatePerPerson: act.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: parseFloat(act.fitRatePerPerson || act.groupRatePerPerson || 0),
      isCustom: false,
    };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const updateParticipants = (idx, val) => {
    const n = parseInt(val) || 1;
    const updated = selected.map((a, i) => {
      if (i !== idx) return a;
      const rate = a.isCustom
        ? a.pricePerPerson || 0
        : n > 10 ? a.groupRatePerPerson : a.fitRatePerPerson;
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
    const entry = {
      ...customForm, isCustom: true, totalPrice,
      fitRatePerPerson: customForm.pricePerPerson,
      groupRatePerPerson: customForm.pricePerPerson,
    };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
    setShowCustomForm(false);
    setCustomForm({ name: "", city: "", state: selectedState || "", description: "", participants: 1, pricePerPerson: 0 });
  };

  return (
    <div className="space-y-4">
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
                className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                  isAdded
                    ? "border-green-300 bg-green-50"
                    : "border-slate-200 hover:border-theme-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{act.name}</p>
                  {isAdded && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {act.city} • ₹{(act.fitRatePerPerson || act.groupRatePerPerson || 0).toLocaleString()}/person
                </p>
              </button>
            );
          })}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setShowCustomForm((p) => !p)}
        className="text-xs border-theme-primary/40 text-theme-primary">
        <PenLine className="h-3 w-3 mr-1" /> Add Custom Activity
      </Button>

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

      {selected.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Activities</p>
          {selected.map((act, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-white border rounded-xl text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">{act.name}</p>
                  {act.isCustom && <Badge variant="outline" className="text-[10px] px-1.5">Custom</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">📍 {act.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input type="number" min="1" value={act.participants}
                  onChange={(e) => updateParticipants(i, e.target.value)}
                  className="w-16 h-7 text-xs text-center" />
                <span className="text-xs text-muted-foreground">pax</span>
                <span className="text-xs font-bold text-theme-primary w-20 text-right">₹{act.totalPrice?.toFixed(0)}</span>
                <button onClick={() => removeActivity(i)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Activities Total</span>
            <span className="text-theme-primary">₹{totalPrice.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── TransportSummaryCard — beautiful display of selected transport ─────────
// ─────────────────────────────────────────────────────────────────────────────
const TransportSummaryCard = ({ transport, onEdit }) => {
  if (!transport?.selectedVehicle) return null;
  const v = transport.selectedVehicle;
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-theme-primary/20 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
      {/* Decorative background icon */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
        <BusFront className="h-28 w-28 text-theme-primary" />
      </div>

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-theme-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-theme-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-theme-primary/70">Transport</p>
              <p className="font-bold text-theme-dark text-sm">{transport.name || "Custom Package"}</p>
            </div>
          </div>
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-theme-primary transition-colors bg-white border rounded-lg px-2.5 py-1.5 shadow-sm">
            <Edit3 className="h-3 w-3" /> Change
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Vehicle</p>
            <p className="font-bold text-slate-800 text-sm">{v.type}</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">AC</p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${v.ac ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {v.ac ? "✓ Yes" : "✗ No"}
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Price</p>
            <p className="font-black text-theme-primary text-base">₹{Number(v.price || 0).toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── ActivitySummaryCard — display of all selected activities ──────────────
// ─────────────────────────────────────────────────────────────────────────────
const ActivitySummaryCard = ({ activities, totalPrice, onEdit }) => {
  if (!activities || activities.length === 0) return null;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? activities : activities.slice(0, 3);

  return (
    <div className="rounded-2xl border-2 border-theme-primary/20 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Palmtree className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/70">Activities</p>
            <p className="font-bold text-slate-800 text-sm">{activities.length} Activity{activities.length > 1 ? "s" : ""} Selected</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Total</p>
            <p className="font-black text-emerald-600 text-sm">₹{Number(totalPrice || 0).toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-theme-primary transition-colors bg-white border rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-1">
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {visible.map((act, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/80 rounded-xl p-2.5 border border-white shadow-sm">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-800 truncate">{act.name}</p>
                {act.isCustom && <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded-full font-medium">Custom</span>}
              </div>
              <p className="text-xs text-slate-500">📍 {act.city} · {act.participants} person{act.participants > 1 ? "s" : ""}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-emerald-600">₹{Number(act.totalPrice || 0).toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-slate-400">₹{(act.fitRatePerPerson || act.pricePerPerson || 0).toLocaleString()}/pax</p>
            </div>
          </div>
        ))}

        {activities.length > 3 && (
          <button onClick={() => setExpanded(p => !p)}
            className="w-full text-xs text-theme-primary hover:text-theme-secondary flex items-center justify-center gap-1 py-1">
            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> +{activities.length - 3} more</>}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ── HotelItineraryCard — rich display of a saved hotel entry ─────────────
// ─────────────────────────────────────────────────────────────────────────────
const HotelItineraryCard = ({ entry, index, onEdit, onDelete }) => {
  const mealEmoji = MEAL_PLAN_ICONS[entry.selectedMealPlan] || "🍽️";
  const mealLabel = MEAL_PLAN_LABELS[entry.selectedMealPlan] || entry.selectedMealPlan;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 shadow-sm transition-all hover:shadow-md
      ${entry.isCustom ? "border-theme-primary/30 bg-gradient-to-br from-purple-50 via-white to-theme-primary/5" : "border-slate-200 bg-white"}`}
    >
      {/* Night indicator badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-theme-dark text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm">
        <Moon className="h-3 w-3" />
        {entry.nights}N
      </div>

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4 pr-14">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${entry.isCustom ? "bg-purple-100" : "bg-theme-primary/10"}`}>
            <Hotel className={`h-5 w-5 ${entry.isCustom ? "text-purple-600" : "text-theme-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
              <h4 className="font-bold text-slate-800 text-base leading-tight">{entry.hotel}</h4>
              {entry.isCustom && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Custom</span>
              )}
            </div>
            {entry.rating && <div className="flex gap-0.5 mb-0.5">{renderStars(entry.rating)}</div>}
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {entry.city}, {entry.state}
            </p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Check-in</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{formatDate(entry.checkInDate)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Check-out</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{formatDate(entry.checkOutDate)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Room Type</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{entry.selectedRoomCategory || "—"}</p>
          </div>
          <div className="bg-theme-primary/5 rounded-xl p-2.5 border border-theme-primary/10">
            <p className="text-[10px] text-theme-primary/70 uppercase font-medium tracking-wide">Meal Plan</p>
            <p className="text-xs font-bold text-theme-primary mt-0.5">{mealEmoji} {entry.selectedMealPlan} <span className="font-normal opacity-70">— {mealLabel}</span></p>
          </div>
        </div>

        {/* Guest pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {entry.numDouble > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
              🛏️ {entry.numDouble} Room{entry.numDouble > 1 ? "s" : ""}
            </span>
          )}
          {entry.numExtraAdult > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
              👤 {entry.numExtraAdult} Extra Adult{entry.numExtraAdult > 1 ? "s" : ""}
            </span>
          )}
          {entry.numExtraChild > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 rounded-full font-medium">
              👧 {entry.numExtraChild} Child{entry.numExtraChild > 1 ? "ren" : ""}
            </span>
          )}
          {entry.numCNB > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
              🛌 {entry.numCNB} CNB
            </span>
          )}
        </div>

        {/* Footer: price + actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Total Cost</p>
            <p className="text-2xl font-black text-theme-primary">₹{Number(entry.hotelTotal || 0).toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">for {entry.nights} night{entry.nights > 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(index)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-theme-primary border border-slate-200 hover:border-theme-primary/40 hover:bg-theme-primary/5 rounded-xl transition-all"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(index)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-300 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      </div>
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

  const checkInDate    = propCheckInDate;
  const setCheckInDate = propSetCheckInDate;
  const checkOutDate   = propCheckOutDate;
  const setCheckOutDate = propSetCheckOutDate;
  const saveChanges    = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

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

  const [roomCategory, setRoomCategory]     = useState("");
  const [mealPlan, setMealPlan]             = useState("");
  const [guests, setGuests]                 = useState({ numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 });
  const [currentHotelTotal, setCurrentHotelTotal] = useState(0);

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

  useEffect(() => {
    getDocs(collection(db, "hotels")).then((snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), rooms: d.data().rooms || [] }));
      const unique = [...new Map(list.map((h) => [`${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`, h])).values()];
      setHotels(unique);
    });
    getDocs(collection(db, "locations")).then((snap) => setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    setCheckOutDate(d.toISOString().split("T")[0]);
  }, [checkInDate, nights]);

  const filteredHotels = useMemo(() => hotels.filter((h) => h.state?.toLowerCase() === selectedState.toLowerCase()), [hotels, selectedState]);
  const groupedHotels  = useMemo(() => filteredHotels.reduce((acc, h) => { const c = h.city || "Other"; if (!acc[c]) acc[c] = []; acc[c].push(h); return acc; }, {}), [filteredHotels]);
  const selectedHotelData = hotels.find((h) => h.id === selectedHotelId);
  const hotelTotalPrice   = hotelEntries.reduce((s, e) => s + Number(e.hotelTotal || 0), 0);
  const transportTotalPrice = selectedTransport?.selectedVehicle?.price ? Number(selectedTransport.selectedVehicle.price) : 0;
  const grandTotal = hotelTotalPrice + transportTotalPrice + activityTotalPrice + confirmedMarkup;

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
    const markup = markupType === "percentage" ? (markupAmount / 100) * base : markupAmount;
    dispatch(setConfirmedMarkup(markup));
  };

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
      selectedActivities?.forEach((a) => included.push(`• ${a.name} (${a.city || "Custom"}) - ${a.participants} Person(s)`));
      const excluded = ["• Train / Flight Fare.", "• Early check-in & late check-out.", "• Anything not in the Included list."];
      const colW = 85;
      const body = Array.from({ length: Math.max(included.length, excluded.length) }, (_, i) => [
        included[i] ? pdfdoc.splitTextToSize(included[i], colW) : "",
        excluded[i] ? pdfdoc.splitTextToSize(excluded[i], colW) : "",
      ]);
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

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-8 xl:gap-10">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex-1 space-y-6 lg:pr-4 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">

            {/* 1. Date + Nights + State */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1.5 font-medium">
                      <Calendar className="h-4 w-4 text-theme-primary" /> Check-in
                    </Label>
                    <Input type="date" value={checkInDate} min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckInDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Moon className="h-4 w-4 text-theme-primary" /> Nights
                    </Label>
                    <Input type="number" min={1} value={nights} onChange={(e) => setNights(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Sun className="h-4 w-4 text-theme-primary" /> Check-out
                    </Label>
                    <Input type="date" value={checkOutDate} readOnly className="bg-slate-50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-theme-primary" /> Destination State
                    </Label>
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

            {/* 2. Hotel Selection */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 sm:p-5 pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-theme-primary" />
                    Hotels in <span className="text-theme-primary">{selectedState}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-5 pt-2 space-y-4">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                        <Hotel className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm">No hotels found in {selectedState}.</p>
                      <Button onClick={() => setShowCustomHotelForm(true)} className="bg-theme-primary hover:bg-theme-secondary" size="sm">
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
                                <input type="radio" name="hotel" value={h.id} checked={selectedHotelId === h.id}
                                  onChange={() => { setSelectedHotelId(h.id); setShowCustomHotelForm(false); }}
                                  className="accent-theme-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[10px] text-slate-500">{h.GoogleReviewRating || "N/A"}</span>
                                    <span className="text-[10px] text-slate-400">· {h.city}</span>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <Button variant="outline" size="sm"
                          onClick={() => setShowCustomHotelForm((p) => !p)}
                          className="text-xs border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5">
                          <PenLine className="h-3.5 w-3.5 mr-1" />
                          {showCustomHotelForm ? "Hide Custom Form" : "Add Custom Hotel"}
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
                      <span className="text-theme-dark">{selectedHotelData.name}</span>
                      <span className="text-sm font-normal text-slate-500 ml-2">— {selectedHotelData.city}</span>
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
                    initial={editingIndex !== null ? hotelEntries[editingIndex] : {}}
                  />
                  <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t">
                    <Button onClick={handleSaveHotel} className="bg-theme-primary hover:bg-theme-secondary shadow-sm">
                      {editingIndex !== null ? "✏️ Update Hotel" : "💾 Save Hotel"}
                    </Button>
                    {isReadyToAddAnother && (
                      <Button variant="outline" onClick={handleAddAnotherHotel} className="border-theme-primary text-theme-primary hover:bg-theme-primary/5">
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
                      {hotelEntries.length} hotel{hotelEntries.length > 1 ? "s" : ""}
                    </span>
                  </h3>
                </div>

                {/* Timeline connector */}
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

                {/* Hotel total summary bar */}
                <div className="flex items-center justify-between bg-theme-primary/5 border border-theme-primary/20 rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">Hotels Subtotal</span>
                  <span className="text-lg font-black text-theme-primary">₹{hotelTotalPrice.toLocaleString("en-IN")}</span>
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
                {/* Summary card if transport already selected */}
                {selectedTransport?.selectedVehicle && (
                  <TransportSummaryCard
                    transport={selectedTransport}
                    onEdit={() => setShowTransportSection(true)}
                  />
                )}

                {!showTransportSection && !selectedTransport?.selectedVehicle ? (
                  <Button onClick={() => setShowTransportSection(true)} className="w-full bg-theme-primary hover:bg-theme-secondary">
                    <Plus className="h-4 w-4 mr-2" /> Add Transport
                  </Button>
                ) : showTransportSection ? (
                  <div className="mt-2">
                    <TransportSelector onTransportSelect={(t) => {
                      dispatch(setSelectedTransport(t));
                      setShowTransportSection(false);
                    }} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* 6. Activities */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-3 sm:p-5 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palmtree className="h-5 w-5 text-theme-primary" /> Activities & Sightseeing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-5 pt-0 space-y-4">
                {/* Summary card if activities already selected */}
                {selectedActivities.length > 0 && (
                  <ActivitySummaryCard
                    activities={selectedActivities}
                    totalPrice={activityTotalPrice}
                    onEdit={() => setShowActivitiesSection(true)}
                  />
                )}

                {!showActivitiesSection && selectedActivities.length === 0 ? (
                  <Button onClick={() => setShowActivitiesSection(true)} className="w-full bg-theme-primary hover:bg-theme-secondary">
                    <Plus className="h-4 w-4 mr-2" /> Add Activities
                  </Button>
                ) : showActivitiesSection ? (
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">State for Activities</Label>
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
                    {selectedActivities.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setShowActivitiesSection(false)}
                        className="text-xs border-green-300 text-green-700 hover:bg-green-50">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Done — Collapse Activities
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Show "Edit Activities" button when collapsed but activities exist */
                  <Button variant="outline" size="sm" onClick={() => setShowActivitiesSection(true)}
                    className="text-xs border-theme-primary/40 text-theme-primary">
                    <PenLine className="h-3.5 w-3.5 mr-1" /> Edit Activities
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
              <button onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-black text-sm shadow-sm font-medium transition-all">
                <Copy className="h-4 w-4" /> Copy WhatsApp Summary
              </button>
              <button onClick={handleExportToPDF}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm shadow-sm font-medium transition-all">
                <FileText className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>

          {/* ══ RIGHT COLUMN — Sticky Pricing Panel ══════════════════════════ */}
          {showRightPanel && (
            <div className="lg:w-96 xl:w-[420px] lg:min-w-[360px] lg:sticky lg:top-6 lg:self-start space-y-5 pt-6 lg:pt-0">

              {/* Quick package summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">Package Breakdown</h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {hotelEntries.length}H · {selectedTransport ? "1T" : "0T"} · {selectedActivities.length}A
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
                    <span className="font-semibold">₹{hotelTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      Transport
                    </div>
                    <span className="font-semibold">₹{transportTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      Activities ({selectedActivities.length})
                    </div>
                    <span className="font-semibold">₹{activityTotalPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                  {confirmedMarkup > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Wallet className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        Markup
                      </div>
                      <span className="font-semibold text-amber-600">+₹{confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Markup section */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-theme-primary" /> Add Markup
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0">
                  <div className="flex gap-2">
                    <Input type="number" value={markupAmount}
                      onChange={(e) => setMarkupAmount(Number(e.target.value))}
                      className="flex-1 text-sm" placeholder="0" />
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lumpsum">Lumpsum (₹)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleApplyMarkup} size="sm" className="bg-theme-secondary hover:bg-theme-secondary/90 px-4">
                      Apply
                    </Button>
                  </div>
                  {confirmedMarkup > 0 && (
                    <p className="mt-2.5 text-xs text-slate-500">
                      Markup applied: <span className="font-bold text-theme-dark">₹{confirmedMarkup.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Grand Total */}
              <div className="relative overflow-hidden rounded-2xl bg-theme-dark text-white shadow-2xl">
                {/* Decorative */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <IndianRupee className="h-5 w-5 opacity-70" />
                    <h3 className="text-lg font-bold">Grand Total</h3>
                  </div>

                  <div className="text-center mb-6">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-medium mb-1">Total Package Cost</p>
                    <p className="text-5xl font-black tracking-tight">
                      ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                    {hotelEntries.length > 0 && (
                      <p className="text-xs text-white/50 mt-1">
                        for {hotelEntries.reduce((sum, e) => sum + (parseInt(e.nights) || 0), 0)} nights · {hotelEntries[0]?.numDouble || 0} room{(hotelEntries[0]?.numDouble || 0) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full py-6 bg-theme-primary hover:bg-theme-secondary font-bold text-base shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Save className="h-5 w-5 mr-2" /> Save Package
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Save Modal ═══════════════════════════════════════════════════════ */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-theme-dark text-white px-6 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Finalize Package</h2>
                <button onClick={() => setShowSaveModal(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-white/60 text-sm mt-1">Fill in details to save this package</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Package summary preview */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between"><span>Hotels</span><span className="font-semibold">₹{hotelTotalPrice.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span>Transport</span><span className="font-semibold">₹{transportTotalPrice.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span>Activities</span><span className="font-semibold">₹{activityTotalPrice.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-slate-800"><span>Grand Total</span><span className="text-theme-primary">₹{grandTotal.toLocaleString("en-IN")}</span></div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Package Name *</Label>
                <Input value={packageName} onChange={(e) => dispatch(setPackageName(e.target.value))} placeholder="e.g. Goa Delight 4N/5D" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Customer Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  disabled={!!customerId}
                  className={customerId ? "bg-slate-100 cursor-not-allowed" : ""}
                />
                {(customerId || leadId) && (
                  <p className="text-xs text-slate-400">
                    ✓ Auto-filled from {customerId ? "customer" : "lead"} record
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button onClick={handleSavePackage} className="bg-green-600 hover:bg-green-700 text-white px-6">
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