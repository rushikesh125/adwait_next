// src/components/hotel-selector/MealPlanTable.jsx
import React from "react";

const MealPlans = ["EP", "CP", "MAP", "AP"];

const MealPlanTable = ({ season, selectedPlan, onPlanChange }) => {
  if (!season?.pricing) {
    return null;
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider w-12">
              Select
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Plan
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Double Room
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Extra Adult
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">
              Extra Child
            </th>
            <th className="px-4 py-3 text-xs font-bold uppercase text-primary tracking-wider">
              CNB
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MealPlans.map((plan) => {
            const data = season.pricing[plan.toLowerCase()];
            const hasPricing =
              data &&
              (data.double > 0 ||
                data.extraAdult > 0 ||
                data.extraChild > 0 ||
                data.cnb > 0);

            if (!hasPricing) return null;

            return (
              <tr
                key={plan}
                className={`transition-colors hover:bg-slate-50/50 ${
                  selectedPlan === plan ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <input
                    type="radio"
                    name="meal-plan"
                    className="w-4 h-4 accent-primary cursor-pointer"
                    checked={selectedPlan === plan}
                    onChange={() => onPlanChange(plan)}
                  />
                </td>
                <td className="px-4 py-4 font-bold text-slate-700">{plan}</td>
                <td className="px-4 py-4 text-slate-600">₹{data.double || 0}</td>
                <td className="px-4 py-4 text-slate-600">₹{data.extraAdult || 0}</td>
                <td className="px-4 py-4 text-slate-600">₹{data.extraChild || 0}</td>
                <td className="px-4 py-4 text-slate-600 font-medium">₹{data.cnb || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MealPlanTable;