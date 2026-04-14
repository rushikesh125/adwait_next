import React, { useState } from "react";
import {
  Palmtree,
  Activity,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const ActivitySummaryCard = ({ activities, totalPrice, onEdit }) => {
  if (!activities || activities.length === 0) return null;
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? activities : activities.slice(0, 3);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palmtree className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700">
            {activities.length} Activity{activities.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-600">
            ₹{Number(totalPrice || 0).toLocaleString("en-IN")}
          </span>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-theme-primary border border-slate-200 bg-white rounded px-2 py-0.5"
          >
            <Edit3 className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>
      <div className="p-2 space-y-1">
        {visible.map((act, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-100"
          >
            <Activity className="h-3 w-3 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <p className="text-xs font-medium text-slate-800 truncate">
                {act.name}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {act.isCustom && (
                  <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1 rounded-full font-medium flex-shrink-0">
                    Custom
                  </span>
                )}
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  📍 {act.city}
                </span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">
                  · {act.participants}p
                </span>
                {act.applicableTier && (
                  <span className={`text-[9px] px-1.5 rounded font-semibold flex-shrink-0 ${
                    act.isFlat 
                      ? "bg-orange-50 text-orange-600" 
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {act.isFlat ? "Flat: " : "Tier: "} 
                    {act.applicableTier.minPax}-{act.applicableTier.maxPax || '∞'} @ ₹{act.applicableTier.pricePerPerson}
                    {act.isFlat && " (no qty multiplier)"}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex-shrink-0">
              ₹{Number(act.totalPrice || 0).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {activities.length > 3 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="w-full text-[11px] text-theme-primary hover:text-theme-secondary flex items-center justify-center gap-1 py-0.5"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> +{activities.length - 3} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivitySummaryCard;