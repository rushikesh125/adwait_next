import React, { useEffect, useState } from "react";
import {
  MEAL_PLANS,
  PLAN_DESCRIPTIONS,
  STAR_RATINGS,
  EMPTY_PRICING,
  calcCustomHotelNightPrice,
} from "@/lib/utils";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PenLine, Plus } from "lucide-react";

const CustomHotelForm = ({ defaultState = "", onAdd, onCancel }) => {
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState(defaultState);
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
    new Date().toISOString().split("T")[0]
  );
  const [existingDocId, setExistingDocId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const name = hotelName.trim();
    const c = city.trim();
    const s = state.trim();
    if (!name || !c || !s) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, "custom_hotels"),
          where("name", "==", name),
          where("city", "==", c),
          where("state", "==", s)
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
      } catch (e) {
        console.error(e);
      }
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

  const pricePerNight = calcCustomHotelNightPrice(pricing, selectedMealPlan, {
    numDouble,
    numExtraAdult,
    numExtraChild,
    numCNB,
  });
  const estimatedTotal = pricePerNight * nights;

  const handleSubmit = async () => {
    if (!hotelName.trim()) { alert("Hotel name is required."); return; }
    if (!city.trim()) { alert("City is required."); return; }
    if (!state.trim()) { alert("State is required."); return; }
    if (!roomType.trim()) { alert("Room type is required."); return; }
    if (plansWithPrice.length === 0) { alert("Enter at least one price in the pricing table."); return; }

    setIsSaving(true);
    try {
      const payload = {
        name: hotelName.trim(),
        city: city.trim(),
        state: state.trim(),
        rating,
        roomType: roomType.trim(),
        pricing,
        lastUsedMealPlan: selectedMealPlan,
        updatedAt: new Date(),
      };
      if (existingDocId) {
        await updateDoc(doc(db, "custom_hotels", existingDocId), payload);
      } else {
        const ref = await addDoc(collection(db, "custom_hotels"), {
          ...payload,
          createdAt: new Date(),
        });
        setExistingDocId(ref.id);
      }
    } catch (e) {
      console.error("Custom hotel save failed:", e);
    } finally {
      setIsSaving(false);
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (nights || 1));

    onAdd({
      hotel: hotelName.trim(),
      city: city.trim(),
      state: state.trim(),
      rating,
      selectedRoomCategory: roomType.trim(),
      nights,
      numDouble,
      numExtraAdult,
      numExtraChild,
      numCNB,
      selectedMealPlan,
      pricing,
      pricePerNight,
      hotelTotal: estimatedTotal,
      checkInDate,
      checkOutDate: checkOut.toISOString().split("T")[0],
      isCustom: true,
    });
  };

  return (
    <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10 mt-3">
      <CardHeader className="pb-2 p-3">
        <CardTitle className="text-xs flex items-center gap-2 text-theme-primary">
          <PenLine className="h-3.5 w-3.5" />
          Add Custom Hotel
          {existingDocId && (
            <span className="ml-1 text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✓ Found in records
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Row 1: Name + City + State + Rating */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-[10px]">Hotel Name *</Label>
            <Input
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g. Hotel Paradise"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">City *</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lonavala"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">State *</Label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Row 2: Rating + Room type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Stars</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAR_RATINGS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}★
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-[10px]">Room Type *</Label>
            <Input
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              placeholder="e.g. Premium Deluxe, Suite…"
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Pricing table — compact */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Pricing (₹/guest)
          </Label>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-[11px] min-w-[420px]">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium w-16">Plan</th>
                  <th className="px-2 py-1.5 text-left font-medium">Double</th>
                  <th className="px-2 py-1.5 text-left font-medium">Ex. Adult</th>
                  <th className="px-2 py-1.5 text-left font-medium">Ex. Child</th>
                  <th className="px-2 py-1.5 text-left font-medium text-theme-primary">CNB</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries({ ep: "EP", cp: "CP", map: "MAP", ap: "AP" }).map(
                  ([planKey, planLabel]) => (
                    <tr key={planKey} className="hover:bg-muted/20">
                      <td className="px-2 py-1">
                        <span className="font-bold text-[10px]">{planLabel}</span>
                      </td>
                      {["double", "extraAdult", "extraChild", "cnb"].map((type) => (
                        <td key={type} className="px-2 py-1">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[9px]">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={pricing[planKey]?.[type] || ""}
                              onChange={(e) =>
                                handlePricingChange(planKey, type, e.target.value)
                              }
                              className="w-full h-7 pl-4 pr-1 border rounded text-right text-[11px] outline-none focus:ring-1 focus:ring-theme-primary border-input"
                              placeholder="0"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Meal plan selector */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Active Meal Plan
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {MEAL_PLANS.map((plan) => {
              const hasPrice = plansWithPrice.includes(plan);
              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedMealPlan(plan)}
                  disabled={!hasPrice}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    selectedMealPlan === plan
                      ? "bg-theme-primary text-white border-theme-primary"
                      : hasPrice
                      ? "bg-white border-input text-slate-700 hover:border-theme-primary/60"
                      : "bg-muted/30 border-muted text-muted-foreground cursor-not-allowed opacity-50"
                  }`}
                >
                  {plan}
                  {hasPrice && <span className="ml-0.5 text-[9px] opacity-70">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stay details — compact grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Check-in", type: "date", val: checkInDate, set: setCheckInDate },
            { label: "Nights", type: "number", val: nights, set: (v) => setNights(parseInt(v) || 1) },
            { label: "Rooms", type: "number", val: numDouble, set: (v) => setNumDouble(parseInt(v) || 0) },
            { label: "Ex. Adults", type: "number", val: numExtraAdult, set: (v) => setNumExtraAdult(parseInt(v) || 0) },
            { label: "Ex. Children", type: "number", val: numExtraChild, set: (v) => setNumExtraChild(parseInt(v) || 0) },
            { label: "CNB", type: "number", val: numCNB, set: (v) => setNumCNB(parseInt(v) || 0) },
          ].map(({ label, type, val, set }) => (
            <div key={label} className="space-y-0.5">
              <Label className="text-[10px]">{label}</Label>
              <input
                type={type}
                min={type === "number" ? 0 : undefined}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full h-7 border rounded px-1.5 text-xs outline-none focus:ring-1 focus:ring-theme-primary"
              />
            </div>
          ))}
        </div>

        {/* Footer: price + actions */}
        <div className="flex items-center justify-between pt-2 border-t gap-4">
          <div className="text-xs flex items-center gap-3">
            <span className="text-slate-500">
              Per night:{" "}
              <span className="font-bold text-theme-primary">
                ₹{pricePerNight.toFixed(0)}
              </span>{" "}
              <span className="text-muted-foreground">({selectedMealPlan})</span>
            </span>
            <span className="text-slate-500">
              Total:{" "}
              <span className="font-bold text-theme-primary">
                ₹{estimatedTotal.toFixed(0)}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-xs h-7 px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-theme-primary hover:bg-theme-secondary text-xs h-7 px-3"
            >
              <Plus className="h-3 w-3 mr-1" />
              {isSaving ? "Saving…" : "Add Hotel"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomHotelForm;