"use client"
import React from "react";
import { Info, MapPin, CalendarDays } from "lucide-react";

const GeneralInfoStep = ({ data, update, onNext }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Step Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Info className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">General Information</h2>
          <p className="text-sm text-gray-500">Define the basic details of your tour template.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Package Title */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 ml-1">Package Title</label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
            placeholder="e.g. 5 Days Mesmerizing Kashmir"
            value={data.packageName}
            onChange={(e) => update("packageName", e.target.value)}
          />
        </div>

        {/* Duration Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
              <CalendarDays size={16} className="text-gray-400" /> Days
            </label>
            <input
              type="number"
              min="1"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={data.duration.days}
              onChange={(e) => update("duration", { ...data.duration, days: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
              <CalendarDays size={16} className="text-gray-400" /> Nights
            </label>
            <input
              type="number"
              min="0"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={data.duration.nights}
              onChange={(e) => update("duration", { ...data.duration, nights: e.target.value })}
            />
          </div>
        </div>

        {/* Starting Location */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700 ml-1 flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" /> Starting Location (State/City)
          </label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
            placeholder="e.g. Srinagar"
            value={data.baseLocation}
            onChange={(e) => update("baseLocation", e.target.value)}
          />
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button 
            className={`w-full py-4 rounded-xl font-bold text-white transition-all transform active:scale-[0.98] shadow-lg shadow-blue-100 flex items-center justify-center gap-2 ${
              !data.packageName || !data.baseLocation 
              ? "bg-gray-300 cursor-not-allowed shadow-none" 
              : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={!data.packageName || !data.baseLocation} 
            onClick={onNext}
          >
            Next: Select Transport
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralInfoStep;