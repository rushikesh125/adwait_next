import React, { useEffect, useState } from "react";
import { MEAL_PLANS, PLAN_DESCRIPTIONS, STAR_RATINGS, EMPTY_PRICING, calcCustomHotelNightPrice } from "@/lib/utils";
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
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
import {
  PenLine,
  Plus,
} from "lucide-react";

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
    new Date().toISOString().split("T")[0],
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
    numDouble, numExtraAdult, numExtraChild, numCNB,
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
    } catch (e) {
      console.error("Custom hotel save failed:", e);
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
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Pricing Table — rates per guest type (₹)
          </Label>
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
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Active Meal Plan for this stay
          </Label>
          <div className="flex flex-wrap gap-2">
            {MEAL_PLANS.map((plan) => {
              const hasPrice = plansWithPrice.includes(plan);
              return (
                <button
                  key={plan} type="button"
                  onClick={() => setSelectedMealPlan(plan)}
                  disabled={!hasPrice}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedMealPlan === plan
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
            { label: "Nights", type: "number", val: nights, set: (v) => setNights(parseInt(v) || 1) },
            { label: "Rooms", type: "number", val: numDouble, set: (v) => setNumDouble(parseInt(v) || 0) },
            { label: "Ex. Adults", type: "number", val: numExtraAdult, set: (v) => setNumExtraAdult(parseInt(v) || 0) },
            { label: "Ex. Children", type: "number", val: numExtraChild, set: (v) => setNumExtraChild(parseInt(v) || 0) },
            { label: "CNB", type: "number", val: numCNB, set: (v) => setNumCNB(parseInt(v) || 0) },
          ].map(({ label, type, val, set }) => (
            <div key={label} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <input
                type={type} min={type === "number" ? 0 : undefined} value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full h-8 border rounded px-2 text-xs outline-none focus:ring-1 focus:ring-theme-primary"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t gap-4">
          <div className="text-sm space-y-0.5">
            <div>Per night: <span className="font-bold text-theme-primary">₹{pricePerNight.toFixed(0)}</span>{" "}<span className="text-xs text-muted-foreground">({selectedMealPlan})</span></div>
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

export default CustomHotelForm;