import React from "react";
import { Input } from "@/components/ui/input";
import { BusFront, Car, Edit3 } from "lucide-react";

const TransportSummaryCard = ({
  transport,
  totalPrice,
  transportBreakdown,
  minKm,
  setMinKm,
  tollCharges,
  setTollCharges,
  permitCharges,
  setPermitCharges,
  otherCharges,
  setOtherCharges,
  editableBaseCost,
  setEditableBaseCost,
  onEdit,
}) => {
  if (!transport?.selectedVehicle) return null;
  const v = transport.selectedVehicle;
  const displayPrice =
    Number(v.perKmprice) > 0 ? v.perKmprice : v.price ?? 0;
  const displaySuffix = Number(v.perKmprice) > 0 ? "/km" : "";

  return (
    <div className="rounded-xl border border-theme-primary/20 bg-blue-50/30 overflow-hidden">
      {/* Header row */}
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-theme-primary/10 flex items-center justify-center flex-shrink-0">
          <Car className="h-3.5 w-3.5 text-theme-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 truncate">
            {transport.name || "Custom Package"}
          </p>
          <p className="text-[10px] text-slate-500">Transport</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-black text-theme-primary">
            ₹{Number(totalPrice || 0).toLocaleString("en-IN")}
          </span>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-theme-primary border border-slate-200 bg-white rounded px-2 py-0.5"
          >
            <Edit3 className="h-3 w-3" /> Change
          </button>
        </div>
      </div>

      {/* Vehicle info row */}
      <div className="px-3 pb-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
          🚗 {v.type}
        </span>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            v.ac
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {v.ac ? "✓ AC" : "Non-AC"}
        </span>
        <span className="text-[11px] font-bold text-theme-primary bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
          ₹{Number(displayPrice).toLocaleString("en-IN")}
          {displaySuffix}
        </span>
      </div>

      {/* Per-km breakdown (collapsible detail) */}
      {transportBreakdown?.isPerKm && (
        <div className="mx-3 mb-3 border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {[
              {
                label: "Min KM / Day",
                val: minKm,
                set: (v) => setMinKm(Math.max(0, Number(v))),
                editable: true,
              },
              {
                label: "Vehicle Cost",
                val:
                  editableBaseCost !== null
                    ? editableBaseCost
                    : transportBreakdown.baseCost,
                set: (v) => setEditableBaseCost(Math.max(0, Number(v))),
                editable: true,
              },
              {
                label: "Driver Allowance",
                val: transportBreakdown.driverAllowance,
                editable: false,
              },
              {
                label: "Toll",
                val: tollCharges,
                set: (v) => setTollCharges(Math.max(0, Number(v))),
                editable: true,
              },
              {
                label: "Permit",
                val: permitCharges,
                set: (v) => setPermitCharges(Math.max(0, Number(v))),
                editable: true,
              },
              {
                label: "Other",
                val: otherCharges,
                set: (v) => setOtherCharges(Math.max(0, Number(v))),
                editable: true,
              },
            ].map(({ label, val, set, editable }) => (
              <div
                key={label}
                className="flex items-center justify-between px-3 py-1.5 gap-3"
              >
                <span className="text-xs text-slate-600 flex-shrink-0">
                  {label}
                </span>
                {editable ? (
                  <input
                    type="number"
                    min="0"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="w-24 h-7 border border-slate-200 rounded px-2 text-xs text-right outline-none focus:ring-1 focus:ring-theme-primary"
                  />
                ) : (
                  <span className="text-xs font-medium text-slate-700">
                    ₹{Number(val).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-theme-primary/5">
              <span className="text-xs font-bold text-theme-primary">
                Total
              </span>
              <span className="text-sm font-black text-theme-primary">
                ₹{transportBreakdown.total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportSummaryCard;