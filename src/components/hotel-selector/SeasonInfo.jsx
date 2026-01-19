// src/components/hotel-selector/SeasonInfo.jsx
import React from "react";
import { Sun, Info } from "lucide-react";

const SeasonInfo = ({ season }) => {
  if (!season) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800">
        <Info className="h-5 w-5 mt-0.5" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1">Season</p>
          <p className="font-medium">No active season found for selected dates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <Sun className="h-5 w-5 text-slate-600 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Season</p>
        <p className="font-semibold text-slate-900">{season.name || "Active Season"}</p>
        <p className="text-xs text-slate-500 mt-1">
          {new Date(season.start).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}{" "}
          –{" "}
          {new Date(season.end).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
    </div>
  );
};

export default SeasonInfo;