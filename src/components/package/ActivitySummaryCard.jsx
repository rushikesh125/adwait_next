import React, { useState } from "react";
import {
  Palmtree,
  Activity,
  Edit3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
          <button onClick={() => setExpanded((p) => !p)} className="w-full text-xs text-theme-primary hover:text-theme-secondary flex items-center justify-center gap-1 py-1">
            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> +{activities.length - 3} more</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivitySummaryCard;