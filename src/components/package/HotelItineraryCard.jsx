import React from "react";
import { MEAL_PLAN_ICONS, MEAL_PLAN_LABELS, renderStars } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  Hotel,
  MapPin,
  Edit3,
  Trash2,
  Moon,
} from "lucide-react";

const HotelItineraryCard = ({ entry, index, onEdit, onDelete }) => {
  const mealEmoji = MEAL_PLAN_ICONS[entry.selectedMealPlan] || "🍽️";
  const mealLabel = MEAL_PLAN_LABELS[entry.selectedMealPlan] || entry.selectedMealPlan;

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 shadow-sm transition-all hover:shadow-md ${entry.isCustom ? "border-theme-primary/30 bg-gradient-to-br from-purple-50 via-white to-theme-primary/5" : "border-slate-200 bg-white"}`}>
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-theme-dark text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm">
        <Moon className="h-3 w-3" />{entry.nights}N
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4 pr-14">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${entry.isCustom ? "bg-purple-100" : "bg-theme-primary/10"}`}>
            <Hotel className={`h-5 w-5 ${entry.isCustom ? "text-purple-600" : "text-theme-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
              <h4 className="font-bold text-slate-800 text-base leading-tight">{entry.hotel}</h4>
              {entry.isCustom && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Custom</span>}
            </div>
            {entry.rating && <div className="flex gap-0.5 mb-0.5">{renderStars(entry.rating)}</div>}
            <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.city}, {entry.state}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: "Check-in", val: formatDate(entry.checkInDate) },
            { label: "Check-out", val: formatDate(entry.checkOutDate) },
            { label: "Room Type", val: entry.selectedRoomCategory || "—" },
          ].map(({ label, val }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">{label}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{val}</p>
            </div>
          ))}
          <div className="bg-theme-primary/5 rounded-xl p-2.5 border border-theme-primary/10">
            <p className="text-[10px] text-theme-primary/70 uppercase font-medium tracking-wide">Meal Plan</p>
            <p className="text-xs font-bold text-theme-primary mt-0.5">
              {mealEmoji} {entry.selectedMealPlan} <span className="font-normal opacity-70">— {mealLabel}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {entry.numDouble > 0 && <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">🛏️ {entry.numDouble} Room{entry.numDouble > 1 ? "s" : ""}</span>}
          {entry.numExtraAdult > 0 && <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">👤 {entry.numExtraAdult} Extra Adult{entry.numExtraAdult > 1 ? "s" : ""}</span>}
          {entry.numExtraChild > 0 && <span className="inline-flex items-center gap-1 text-xs bg-pink-50 text-pink-700 border border-pink-200 px-2.5 py-1 rounded-full font-medium">👧 {entry.numExtraChild} Child{entry.numExtraChild > 1 ? "ren" : ""}</span>}
          {entry.numCNB > 0 && <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-medium">🛌 {entry.numCNB} CNB</span>}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">Total Cost</p>
            <p className="text-2xl font-black text-theme-primary">₹{Number(entry.hotelTotal || 0).toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">for {entry.nights} night{entry.nights > 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEdit(index)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-theme-primary border border-slate-200 hover:border-theme-primary/40 hover:bg-theme-primary/5 rounded-xl transition-all">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => onDelete(index)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-300 hover:bg-red-50 rounded-xl transition-all">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelItineraryCard;