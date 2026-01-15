"use client"
import React, { useState } from "react";
import { CheckCircle, AlertTriangle, IndianRupee, MapPin, Car, Calendar } from "lucide-react";

const SummaryStep = ({ data, onSave, onPrev }) => {
  const [markup, setMarkup] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Calculate Base Total
  const calculateTotal = () => {
    let hotelCost = 0;
    let activityCost = 0;
    
    data.days.forEach((day) => {
      // Hotel Total is stored as an array [value] in our state
      hotelCost += day.hotelTotal[0] || 0;
      
      // Activities are objects with totalPrice
      day.activities.forEach((act) => {
        activityCost += act.totalPrice || 0;
      });
    });

    const transportCost = data.transport?.totalPrice || 0;
    return hotelCost + activityCost + transportCost;
  };

  const baseTotal = calculateTotal();
  const grandTotal = baseTotal + Number(markup);

  const handleFinalSave = async () => {
    setIsSaving(true);
    const finalData = {
      ...data,
      pricing: {
        baseTotal,
        markup: Number(markup),
        grandTotal,
      },
    };
    await onSave(finalData);
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gray-900 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="text-green-400" /> Review Package Template
        </h2>
        <p className="text-gray-400 text-sm mt-1">Check all details before saving to the database.</p>
      </div>

      <div className="p-8 space-y-8">
        {/* Basic Info Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Calendar className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Duration</p>
              <p className="font-bold">{data.duration.days} Days / {data.duration.nights} Nights</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <MapPin className="text-red-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Base Location</p>
              <p className="font-bold">{data.baseLocation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Car className="text-orange-500" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Transport</p>
              <p className="font-bold">{data.transport?.selectedVehicle?.type || "Not Selected"}</p>
            </div>
          </div>
        </div>

        {/* Itinerary Breakdown */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-800 border-b pb-2">Itinerary Summary</h3>
          {data.days.map((day, idx) => (
            <div key={idx} className="flex justify-between items-start text-sm border-b border-gray-50 pb-3">
              <div>
                <span className="font-bold text-blue-600">Day {idx + 1}:</span> {day.city}
                <p className="text-gray-500 text-xs">Stay: {day.hotel?.name || "No Hotel"}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">₹{day.hotelTotal[0] || 0}</p>
                <p className="text-[10px] text-gray-400">{day.activities.length} Activities Included</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Matrix */}
        <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between text-gray-700 font-medium">
            <span>Base Cost (Hotels + Transport + Activities)</span>
            <span>₹{baseTotal.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between gap-4 py-3 border-y border-blue-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">Add Profit Markup</span>
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <div className="relative">
              <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="number" 
                className="pl-8 pr-4 py-2 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 w-40 font-bold text-right"
                placeholder="0"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xl font-black text-blue-900 pt-2">
            <span>Estimated Package Price</span>
            <span>₹{grandTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <button 
            className="px-8 py-3 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition"
            onClick={onPrev}
          >
            Modify Itinerary
          </button>
          
          <button 
            disabled={isSaving}
            className={`px-10 py-3 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all transform active:scale-95 ${
              isSaving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={handleFinalSave}
          >
            {isSaving ? "Saving to Cloud..." : "Finalize & Save Package"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;