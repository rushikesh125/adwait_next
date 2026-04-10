import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MEAL_PLANS, MEAL_PLAN_LABELS, MEAL_PLAN_ICONS } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BedDouble,
  Utensils,
  Users,
} from "lucide-react";

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
  const [selectedRoomCategory, setSelectedRoomCategory] = useState(
    initial.selectedRoomCategory || "",
  );
  const [selectedMealPlan, setSelectedMealPlan] = useState(
    initial.selectedMealPlan || "",
  );
  const [numDouble, setNumDouble] = useState(initial.numDouble ?? 1);
  const [numExtraAdult, setNumExtraAdult] = useState(
    initial.numExtraAdult ?? 0,
  );
  const [numExtraChild, setNumExtraChild] = useState(
    initial.numExtraChild ?? 0,
  );
  const [numCNB, setNumCNB] = useState(initial.numCNB ?? 0);

  const getApplicableSeason = useCallback(
    (roomData) => {
      if (!roomData?.seasons || !checkInDate) return null;
      const d = new Date(checkInDate);
      d.setHours(0, 0, 0, 0);
      const matchingSeasons = roomData.seasons.filter((s) => {
        const start = new Date(s.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(s.end);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });
      if (matchingSeasons.length === 0) return null;
      return matchingSeasons.sort(
        (a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99),
      )[0];
    },
    [checkInDate],
  );

  const roomData = hotel?.rooms?.find(
    (r) => r.categoryName === selectedRoomCategory,
  );
  const season = getApplicableSeason(roomData);

  const availableMealPlans = useMemo(() => {
    if (!season?.pricing) return MEAL_PLANS;
    return MEAL_PLANS.filter((p) => {
      const pr = season.pricing[p.toLowerCase()];
      return pr && Object.values(pr).some((v) => v > 0);
    });
  }, [season]);

  useEffect(() => {
    if (
      availableMealPlans.length &&
      !availableMealPlans.includes(selectedMealPlan)
    ) {
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
      (pr.double || 0) * numDouble +
      (pr.extraAdult || 0) * numExtraAdult +
      (pr.extraChild || 0) * numExtraChild +
      (pr.cnb || 0) * numCNB;
    return perNight * (parseInt(nights) || 1);
  }, [
    season,
    selectedMealPlan,
    numDouble,
    numExtraAdult,
    numExtraChild,
    numCNB,
    nights,
  ]);

  const total = calculateTotal();

  useEffect(() => { onTotalChange?.(total); }, [total]);
  useEffect(() => { onRoomCategoryChange?.(selectedRoomCategory); }, [selectedRoomCategory]);
  useEffect(() => { onMealPlanChange?.(selectedMealPlan); }, [selectedMealPlan]);
  useEffect(() => { onGuestsChange?.({ numDouble, numExtraAdult, numExtraChild, numCNB }); }, [numDouble, numExtraAdult, numExtraChild, numCNB]);

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
                <div
                  className={`text-[10px] leading-tight mt-0.5 ${selectedMealPlan === plan ? "text-white/80" : "text-slate-500"}`}
                >
                  {MEAL_PLAN_LABELS[plan]}
                </div>
              </button>
            ))}
          </div>
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
                <button
                  onClick={() => set(Math.max(0, val - 1))}
                  className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 text-sm font-bold"
                >−</button>
                <span className="flex-1 text-center text-sm font-semibold">{val}</span>
                <button
                  onClick={() => set(val + 1)}
                  className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 text-sm font-bold"
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price summary */}
      <div className="rounded-xl border-2 border-theme-primary/20 bg-gradient-to-br from-theme-primary/5 to-theme-primary/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">
              {season ? `${season.name || "Current"} season` : "Pricing"}
            </p>
            <p className="text-sm text-slate-600 mt-0.5">
              ₹{pricePerNight.toLocaleString("en-IN", { maximumFractionDigits: 0 })} / night × {nights} night{nights !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Est. Total</p>
            <p className="text-2xl font-black text-theme-primary">
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelRoomSelector;