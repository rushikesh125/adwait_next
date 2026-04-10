import React from "react";
import { Input } from "@/components/ui/input";
import {
  BusFront,
  Car,
  Edit3,
} from "lucide-react";

const TransportSummaryCard = ({
  transport, totalPrice, transportBreakdown,
  minKm, setMinKm, tollCharges, setTollCharges,
  permitCharges, setPermitCharges, otherCharges, setOtherCharges,
  editableBaseCost, setEditableBaseCost, onEdit,
}) => {
  if (!transport?.selectedVehicle) return null;
  const v = transport.selectedVehicle;
  const displayPrice = Number(v.perKmprice) > 0 ? v.perKmprice : (v.price ?? 0);
  const displaySuffix = Number(v.perKmprice) > 0 ? "/km" : "";

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-theme-primary/20 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5">
        <BusFront className="h-28 w-28 text-theme-primary" />
      </div>
      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-theme-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-theme-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-theme-primary/70">Transport</p>
              <p className="font-bold text-theme-dark text-sm">{transport.name || "Custom Package"}</p>
            </div>
          </div>
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-theme-primary transition-colors bg-white border rounded-lg px-2.5 py-1.5 shadow-sm">
            <Edit3 className="h-3 w-3" /> Change
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">Vehicle</p>
            <p className="font-bold text-slate-800 text-sm">{v.type}</p>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">AC</p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${v.ac ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
              {v.ac ? "✓ Yes" : "✗ No"}
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-0.5">
              {Number(v.perKmprice) > 0 ? "Rate" : "Total"}
            </p>
            <p className="font-black text-theme-primary text-base">₹{Number(displayPrice).toLocaleString("en-IN")}{displaySuffix}</p>
          </div>
        </div>
        {transportBreakdown?.isPerKm && (
          <div className="mt-4 p-4 border rounded-xl bg-slate-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Min KM / Day</span>
              <Input type="number" min="0" value={minKm} onChange={(e) => setMinKm(Math.max(0, Number(e.target.value)))} className="w-28 text-right" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Vehicle Cost</span>
              <Input type="number" min="0" value={editableBaseCost ?? transportBreakdown.baseCost} onChange={(e) => setEditableBaseCost(Math.max(0, Number(e.target.value)))} className="w-28 text-right" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Driver Allowance</span>
              <Input value={transportBreakdown.driverAllowance} readOnly className="w-28 text-right bg-slate-100 cursor-not-allowed" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Toll Charges</span>
              <Input type="number" min="0" value={tollCharges} onChange={(e) => setTollCharges(Math.max(0, Number(e.target.value)))} className="w-28 text-right" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Permit Charges</span>
              <Input type="number" min="0" value={permitCharges} onChange={(e) => setPermitCharges(Math.max(0, Number(e.target.value)))} className="w-28 text-right" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Other Charges</span>
              <Input type="number" min="0" value={otherCharges} onChange={(e) => setOtherCharges(Math.max(0, Number(e.target.value)))} className="w-28 text-right" />
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-theme-primary">
              <span>Total Transport Cost</span>
              <span>₹{transportBreakdown.total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-theme-primary/10 flex items-center justify-between">
          <p className="text-xs text-slate-500">Estimated transport cost</p>
          <p className="text-base font-black text-theme-primary">₹{Number(totalPrice || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>
    </div>
  );
};

export default TransportSummaryCard;