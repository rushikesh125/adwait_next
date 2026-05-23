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
import { PenLine, Plus, Trash2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const mkId = () => Math.random().toString(36).slice(2, 10);

const blankCategory = (overrides = {}) => ({
  id: mkId(),
  roomType: "",
  mealPlan: "EP",
  pricing: EMPTY_PRICING(),
  numDouble: 1,
  numExtraAdult: 0,
  numExtraChild: 0,
  numCNB: 0,
  ...overrides,
});

// Build initial categories array from the `initial` prop (when editing).
// Supports both the new multi-category shape (initial.roomCategories[])
// and the legacy single-room shape (initial.selectedMealPlan etc.).
const hydrateCategories = (initial) => {
  if (!initial) return [blankCategory()];
  if (Array.isArray(initial.roomCategories) && initial.roomCategories.length > 0) {
    return initial.roomCategories.map((rc) =>
      blankCategory({
        roomType: rc.roomCategory || rc.roomType || "",
        mealPlan: rc.mealPlan || "EP",
        pricing: rc.pricing || EMPTY_PRICING(),
        numDouble: rc.numDouble ?? 1,
        numExtraAdult: rc.numExtraAdult ?? 0,
        numExtraChild: rc.numExtraChild ?? 0,
        numCNB: rc.numCNB ?? 0,
      }),
    );
  }
  return [
    blankCategory({
      roomType: initial.selectedRoomCategory || initial.roomCategory || "",
      mealPlan: initial.selectedMealPlan || "EP",
      pricing: initial.pricing || EMPTY_PRICING(),
      numDouble: initial.numDouble ?? 1,
      numExtraAdult: initial.numExtraAdult ?? 0,
      numExtraChild: initial.numExtraChild ?? 0,
      numCNB: initial.numCNB ?? 0,
    }),
  ];
};

const categoryHasAnyPrice = (cat) =>
  Object.values(cat.pricing || {}).some((row) =>
    Object.values(row || {}).some((v) => Number(v) > 0),
  );

const plansWithPriceFor = (cat) =>
  MEAL_PLANS.filter((p) => {
    const row = cat.pricing[p.toLowerCase()];
    return row && Object.values(row).some((v) => Number(v) > 0);
  });

const calcCategoryNightPrice = (cat) =>
  calcCustomHotelNightPrice(cat.pricing, cat.mealPlan, {
    numDouble: cat.numDouble,
    numExtraAdult: cat.numExtraAdult,
    numExtraChild: cat.numExtraChild,
    numCNB: cat.numCNB,
  });

// ─────────────────────────────────────────────────────────────────────────────
// RoomCategoryCard — one editable row per room category
// ─────────────────────────────────────────────────────────────────────────────

function RoomCategoryCard({
  index,
  total,
  category,
  onChange,
  onRemove,
}) {
  const setField = (field, value) =>
    onChange({ ...category, [field]: value });

  const setPricing = (planKey, type, raw) => {
    const v = raw === "" ? 0 : Math.max(0, Number(raw));
    onChange({
      ...category,
      pricing: {
        ...category.pricing,
        [planKey]: { ...category.pricing[planKey], [type]: v },
      },
    });
  };

  const setOccupancy = (field, raw) => {
    if (raw === "") return setField(field, "");
    setField(field, Math.max(0, Number(raw)));
  };

  const validPlans = plansWithPriceFor(category);
  const nightPrice = calcCategoryNightPrice(category);

  return (
    <div className="rounded-lg border border-theme-primary/30 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-theme-primary">
          Room Category {index + 1}
          {nightPrice > 0 && (
            <span className="ml-2 text-[10px] font-normal text-slate-500">
              · ₹{nightPrice.toFixed(0)}/night ({category.mealPlan})
            </span>
          )}
        </p>
        {total > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] flex items-center gap-1 text-rose-500 hover:bg-rose-50 px-2 py-0.5 rounded"
          >
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      {/* Room Type */}
      <div className="space-y-1">
        <Label className="text-[10px]">Room Type *</Label>
        <Input
          value={category.roomType}
          onChange={(e) => setField("roomType", e.target.value)}
          placeholder="e.g. Premium Deluxe, Suite…"
          className="text-xs h-8"
        />
      </div>

      {/* Pricing table */}
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
                            value={category.pricing[planKey]?.[type] || ""}
                            onChange={(e) =>
                              setPricing(planKey, type, e.target.value)
                            }
                            className="w-full h-7 pl-4 pr-1 border rounded text-right text-[11px] outline-none focus:ring-1 focus:ring-theme-primary border-input"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active meal plan */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Active Meal Plan
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {MEAL_PLANS.map((plan) => {
            const hasPrice = validPlans.includes(plan);
            const active = category.mealPlan === plan;
            return (
              <button
                key={plan}
                type="button"
                onClick={() => setField("mealPlan", plan)}
                disabled={!hasPrice}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  active
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

      {/* Occupancy */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Rooms", field: "numDouble", min: 1 },
          { label: "Ex. Adults", field: "numExtraAdult", min: 0 },
          { label: "Ex. Children", field: "numExtraChild", min: 0 },
          { label: "CNB", field: "numCNB", min: 0 },
        ].map(({ label, field }) => (
          <div key={field} className="space-y-0.5">
            <Label className="text-[10px]">{label}</Label>
            <input
              type="number"
              min={0}
              value={category[field]}
              onChange={(e) => setOccupancy(field, e.target.value)}
              className="w-full h-7 border rounded px-1.5 text-xs outline-none focus:ring-1 focus:ring-theme-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomHotelForm — top-level
// ─────────────────────────────────────────────────────────────────────────────

const CustomHotelForm = ({
  defaultState = "",
  initial = null,
  onAdd,
  onCancel,
}) => {
  const isEditing = !!initial;

  // ── Hotel-level state ──
  const [hotelName, setHotelName] = useState(initial?.hotel || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || defaultState);
  const [rating, setRating] = useState(initial?.rating || "3");
  const [hotelLink, setHotelLink] = useState(
    initial?.GoogleListingURL ||
      initial?.googleLink ||
      initial?.tripAdvisorLink ||
      initial?.TripAdvisorURL ||
      "",
  );
  const [nights, setNights] = useState(initial?.nights ?? 1);
  const [checkInDate, setCheckInDate] = useState(
    initial?.checkInDate || new Date().toISOString().split("T")[0],
  );
  const [categories, setCategories] = useState(() => hydrateCategories(initial));
  const [existingDocId, setExistingDocId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-restore from saved custom_hotels doc when name/city/state match
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
        if (!hotelLink && (data.googleLink || data.GoogleListingURL)) {
          setHotelLink(data.googleLink || data.GoogleListingURL);
        }
        // Restore room categories — prefer the array shape, fall back to the
        // legacy single-room shape.
        if (Array.isArray(data.roomCategories) && data.roomCategories.length > 0) {
          setCategories(hydrateCategories({ roomCategories: data.roomCategories }));
        } else if (data.roomType || data.pricing) {
          setCategories([
            blankCategory({
              roomType: data.roomType || "",
              mealPlan: data.lastUsedMealPlan || "EP",
              pricing: data.pricing || EMPTY_PRICING(),
            }),
          ]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelName, city, state]);

  const totalPricePerNight = categories.reduce(
    (sum, c) => sum + calcCategoryNightPrice(c),
    0,
  );
  const estimatedTotal = totalPricePerNight * (Number(nights) || 0);

  const addCategory = () =>
    setCategories((prev) => [...prev, blankCategory()]);
  const updateCategory = (idx, next) =>
    setCategories((prev) => prev.map((c, i) => (i === idx ? next : c)));
  const removeCategory = (idx) =>
    setCategories((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!hotelName.trim()) { alert("Hotel name is required."); return; }
    if (!city.trim()) { alert("City is required."); return; }
    if (!state.trim()) { alert("State is required."); return; }
    if (categories.length === 0) { alert("At least one room category is required."); return; }
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (!c.roomType.trim()) { alert(`Room Category ${i + 1}: room type is required.`); return; }
      if (!categoryHasAnyPrice(c)) { alert(`Room Category ${i + 1}: enter at least one price.`); return; }
    }

    setIsSaving(true);
    try {
      const persistedCategories = categories.map((c) => ({
        roomCategory: c.roomType.trim(),
        mealPlan: c.mealPlan,
        pricing: c.pricing,
        numDouble: Number(c.numDouble) || 0,
        numExtraAdult: Number(c.numExtraAdult) || 0,
        numExtraChild: Number(c.numExtraChild) || 0,
        numCNB: Number(c.numCNB) || 0,
      }));

      const first = persistedCategories[0];
      const payload = {
        name: hotelName.trim(),
        city: city.trim(),
        state: state.trim(),
        rating,
        // Legacy fields preserved for back-compat (use first category)
        roomType: first.roomCategory,
        pricing: first.pricing,
        lastUsedMealPlan: first.mealPlan,
        // New multi-room shape
        roomCategories: persistedCategories,
        googleLink: hotelLink.trim(),
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
    checkOut.setDate(checkOut.getDate() + (Number(nights) || 1));

    const outRoomCategories = categories.map((c) => {
      const perNight = calcCategoryNightPrice(c);
      return {
        id: c.id,
        roomCategory: c.roomType.trim(),
        mealPlan: c.mealPlan,
        pricing: c.pricing,
        numDouble: Number(c.numDouble) || 0,
        numExtraAdult: Number(c.numExtraAdult) || 0,
        numExtraChild: Number(c.numExtraChild) || 0,
        numCNB: Number(c.numCNB) || 0,
        price: perNight * (Number(nights) || 0),
      };
    });

    const first = categories[0] || blankCategory();

    onAdd({
      hotel: hotelName.trim(),
      city: city.trim(),
      state: state.trim(),
      rating,
      // Legacy single-room fields use the first category for back-compat
      selectedRoomCategory: first.roomType.trim(),
      selectedMealPlan: first.mealPlan,
      numDouble: Number(first.numDouble) || 0,
      numExtraAdult: Number(first.numExtraAdult) || 0,
      numExtraChild: Number(first.numExtraChild) || 0,
      numCNB: Number(first.numCNB) || 0,
      pricing: first.pricing,
      // New multi-room storage — picked up by PDF + WhatsApp summary
      roomCategories: outRoomCategories,
      nights: Number(nights) || 0,
      pricePerNight: totalPricePerNight,
      hotelTotal: estimatedTotal,
      checkInDate,
      checkOutDate: checkOut.toISOString().split("T")[0],
      GoogleListingURL: hotelLink.trim() || null,
      isCustom: true,
    });
  };

  return (
    <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10 mt-3">
      <CardHeader className="pb-2 p-3">
        <CardTitle className="text-xs flex items-center gap-2 text-theme-primary">
          <PenLine className="h-3.5 w-3.5" />
          {isEditing ? "Edit Custom Hotel" : "Add Custom Hotel"}
          {existingDocId && (
            <span className="ml-1 text-[10px] font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✓ Found in records
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Row 1: Name + City + State */}
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

        {/* Stars + Hotel link */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
            <Label className="text-[10px]">
              Hotel Link (Google Maps / Website / TripAdvisor)
            </Label>
            <Input
              type="url"
              value={hotelLink}
              onChange={(e) => setHotelLink(e.target.value)}
              placeholder="https://maps.google.com/?q=…"
              className="text-xs h-8"
            />
          </div>
        </div>

        {/* Room categories */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Room Categories ({categories.length})
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCategory}
              className="h-7 px-2 text-[11px] text-theme-primary border-theme-primary hover:bg-theme-primary/5"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Room Category
            </Button>
          </div>
          {categories.map((c, idx) => (
            <RoomCategoryCard
              key={c.id}
              index={idx}
              total={categories.length}
              category={c}
              onChange={(next) => updateCategory(idx, next)}
              onRemove={() => removeCategory(idx)}
            />
          ))}
        </div>

        {/* Stay details (shared across all room categories) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Check-in</Label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              className="w-full h-7 border rounded px-1.5 text-xs outline-none focus:ring-1 focus:ring-theme-primary"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Nights</Label>
            <input
              type="number"
              min={1}
              value={nights}
              onChange={(e) => {
                const v = e.target.value;
                setNights(v === "" ? "" : Math.max(1, Number(v)));
              }}
              className="w-full h-7 border rounded px-1.5 text-xs outline-none focus:ring-1 focus:ring-theme-primary"
            />
          </div>
        </div>

        {/* Footer: total + actions */}
        <div className="flex items-center justify-between pt-2 border-t gap-4">
          <div className="text-xs flex items-center gap-3">
            <span className="text-slate-500">
              Per night:{" "}
              <span className="font-bold text-theme-primary">
                ₹{totalPricePerNight.toFixed(0)}
              </span>{" "}
              <span className="text-muted-foreground">(all rooms)</span>
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
              {isSaving ? "Saving…" : isEditing ? "Save Changes" : "Add Hotel"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomHotelForm;
