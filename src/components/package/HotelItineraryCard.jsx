import React from "react";
import { MEAL_PLAN_ICONS, MEAL_PLAN_LABELS, renderStars } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Hotel, MapPin, Edit3, Trash2, Moon } from "lucide-react";

const HotelItineraryCard = ({ entry, index, onEdit, onDelete }) => {
  const mealEmoji = MEAL_PLAN_ICONS[entry.selectedMealPlan] || "🍽️";
  const mealLabel = MEAL_PLAN_LABELS[entry.selectedMealPlan] || entry.selectedMealPlan;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        entry.isCustom
          ? "border-theme-primary/30 bg-purple-50/30"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Top row: hotel name + nights badge + cost */}
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            entry.isCustom ? "bg-purple-100" : "bg-theme-primary/10"
          }`}
        >
          <Hotel
            className={`h-3.5 w-3.5 ${
              entry.isCustom ? "text-purple-600" : "text-theme-primary"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">
              {entry.hotel}
            </p>
            {entry.isCustom && (
              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                Custom
              </span>
            )}
            {entry.rating && (
              <div className="flex gap-0.5 flex-shrink-0">
                {renderStars(entry.rating)}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-0.5 mt-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {entry.city}, {entry.state}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
            <Moon className="h-2.5 w-2.5" />
            {entry.nights}N
          </div>
        </div>
      </div>

      {/* Middle: details in compact grid */}
      <div className="px-3 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {[
          { label: "Check-in", val: formatDate(entry.checkInDate) },
          { label: "Check-out", val: formatDate(entry.checkOutDate) },
          { label: "Room", val: entry.selectedRoomCategory || "—" },
          {
            label: "Meal",
            val: `${mealEmoji} ${entry.selectedMealPlan}`,
            sub: mealLabel,
          },
        ].map(({ label, val, sub }) => (
          <div
            key={label}
            className="bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100"
          >
            <p className="text-[9px] text-slate-400 uppercase font-medium tracking-wide">
              {label}
            </p>
            <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
              {val}
            </p>
            {sub && (
              <p className="text-[9px] text-slate-400 truncate">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Guest badges + cost + actions */}
      <div className="px-3 pb-2.5 flex items-center gap-2 flex-wrap">
        {entry.numDouble > 0 && (
          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            🛏️ {entry.numDouble}×Room
          </span>
        )}
        {entry.numExtraAdult > 0 && (
          <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
            👤 {entry.numExtraAdult} EA
          </span>
        )}
        {entry.numExtraChild > 0 && (
          <span className="text-[10px] bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-full font-medium">
            👧 {entry.numExtraChild} EC
          </span>
        )}
        {entry.numCNB > 0 && (
          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            🛌 {entry.numCNB} CNB
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-base font-black text-theme-primary">
            ₹{Number(entry.hotelTotal || 0).toLocaleString("en-IN")}
          </span>
          <button
            onClick={() => onEdit(index)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-theme-primary border border-slate-200 rounded-lg px-2 py-1 transition-all"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => onDelete(index)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600 border border-slate-200 rounded-lg px-2 py-1 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelItineraryCard;