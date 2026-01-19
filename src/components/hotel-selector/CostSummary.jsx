// src/components/hotel-selector/CostSummary.jsx
import React from "react";
import { IndianRupee } from "lucide-react";

const CostSummary = ({ perNightCost, nights, total }) => {
  return (
    <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 space-y-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
        <IndianRupee className="h-5 w-5 text-primary" />
        Cost Summary
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Cost per Night</span>
          <span className="font-semibold">₹{perNightCost.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-600">Number of Nights</span>
          <span className="font-semibold">{nights}</span>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
          <span className="font-semibold text-slate-900">Total Amount</span>
          <span className="text-2xl font-bold text-primary">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CostSummary;