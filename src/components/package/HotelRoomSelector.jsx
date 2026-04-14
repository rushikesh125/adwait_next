import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MEAL_PLANS, MEAL_PLAN_LABELS, MEAL_PLAN_ICONS } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { BedDouble, Utensils, Users } from "lucide-react";

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
    initial.selectedRoomCategory || ""
  );
  const [selectedMealPlan, setSelectedMealPlan] = useState(
    initial.selectedMealPlan || ""
  );
  const [numDouble, setNumDouble] = useState(initial.numDouble ?? 1);
  const [numExtraAdult, setNumExtraAdult] = useState(initial.numExtraAdult ?? 0);
  const [numExtraChild, setNumExtraChild] = useState(initial.numExtraChild ?? 0);
  const [numCNB, setNumCNB] = useState(initial.numCNB ?? 0);

  const getApplicableSeason = useCallback(
    (roomData) => {
      if (!roomData?.seasons || !checkInDate) return null;
      const d = new Date(checkInDate);
      d.setHours(0, 0, 0, 0);
      const matching = roomData.seasons.filter((s) => {
        const start = new Date(s.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(s.end);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });
      if (!matching.length) return null;
      return matching.sort(
        (a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99)
      )[0];
    },
    [checkInDate]
  );

  const roomData = hotel?.rooms?.find(
    (r) => r.categoryName === selectedRoomCategory
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
      (pr.double || 0) * numDouble +
      (pr.extraAdult || 0) * numExtraAdult +
      (pr.extraChild || 0) * numExtraChild +
      (pr.cnb || 0) * numCNB;
    return perNight * (parseInt(nights) || 1);
  }, [season, selectedMealPlan, numDouble, numExtraAdult, numExtraChild, numCNB, nights]);

  const total = calculateTotal();
  const pricePerNight = total / (parseInt(nights) || 1);

  useEffect(() => { onTotalChange?.(total); }, [total]);
  useEffect(() => { onRoomCategoryChange?.(selectedRoomCategory); }, [selectedRoomCategory]);
  useEffect(() => { onMealPlanChange?.(selectedMealPlan); }, [selectedMealPlan]);
  useEffect(() => { onGuestsChange?.({ numDouble, numExtraAdult, numExtraChild, numCNB }); }, [numDouble, numExtraAdult, numExtraChild, numCNB]);

  // console.log(JSON.stringify(hotel))
  if (!hotel) return null;
  return (
    <div className="space-y-4">
      {/* Room categories + Meal plan side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Room Categories */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <BedDouble className="h-3 w-3" /> Room Category
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {hotel.rooms?.map((r) => (
              <button
                key={r.categoryName}
                onClick={() => setSelectedRoomCategory(r.categoryName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedRoomCategory === r.categoryName
                    ? "bg-theme-primary text-white border-theme-primary"
                    : "bg-white border-slate-200 text-slate-700 hover:border-theme-primary/50"
                }`}
              >
                {r.categoryName}
              </button>
            ))}
          </div>
        </div>

        {/* Meal Plan */}
        {availableMealPlans.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Utensils className="h-3 w-3" /> Meal Plan
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {availableMealPlans.map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedMealPlan(plan)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                    selectedMealPlan === plan
                      ? "bg-theme-primary text-white border-theme-primary"
                      : "bg-white border-slate-200 text-slate-700 hover:border-theme-primary/40"
                  }`}
                >
                  <span className="text-sm leading-none">{MEAL_PLAN_ICONS[plan]}</span>
                  {plan}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guest Counts — compact +/- row */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Guest Configuration
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Rooms", icon: "🛏️", val: numDouble, set: setNumDouble },
            { label: "Ex. Adults", icon: "👤", val: numExtraAdult, set: setNumExtraAdult },
            { label: "Ex. Children", icon: "👧", val: numExtraChild, set: setNumExtraChild },
            { label: "CNB", icon: "🛌", val: numCNB, set: setNumCNB },
          ].map(({ label, icon, val, set }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-[10px] text-slate-500">
                {icon} {label}
              </p>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden h-8">
                <button
                  onClick={() => set(Math.max(0, val - 1))}
                  className="px-2 h-full text-slate-600 hover:bg-slate-100 text-sm font-bold border-r border-slate-200"
                >
                  −
                </button>
                <span className="flex-1 text-center text-xs font-semibold">
                  {val}
                </span>
                <button
                  onClick={() => set(val + 1)}
                  className="px-2 h-full text-slate-600 hover:bg-slate-100 text-sm font-bold border-l border-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary — compact inline */}
      <div className="flex items-center justify-between bg-theme-primary/5 border border-theme-primary/15 rounded-xl px-4 py-2.5">
        <div>
          <p className="text-[10px] text-slate-500">
            {season ? `${season.name || "Current"} season` : "Pricing"}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            ₹{pricePerNight.toLocaleString("en-IN", { maximumFractionDigits: 0 })} / night × {nights} night{nights !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Est. Total</p>
          <p className="text-xl font-black text-theme-primary">
            ₹{total.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotelRoomSelector;