"use client";
import React from "react";
import SelectTransport from "./SelectTransport";
import { Car, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

const TransportStep = ({ data, update, onNext, onPrev }) => {
  const handleTransportSelection = (selectedTransport) => {
    // We save the entire transport object into our master package state
    update("transport", selectedTransport);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {/* Step Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-gray-50 pb-4">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Car className="text-orange-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Vehicle & Logistics</h2>
          <p className="text-sm text-gray-500">Select the primary vehicle for this package template.</p>
        </div>
      </div>

      {/* Transport Selection Component Wrapper */}
      <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <SelectTransport onTransportSelect={handleTransportSelection} />
      </div>

      {/* Selection Confirmation Toast */}
      {data.transport && (
        <div className="flex items-center gap-3 p-4 mb-8 bg-green-50 border border-green-100 rounded-xl animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-sm text-green-800">
            Transport fixed: <span className="font-bold">{data.transport.selectedVehicle.type}</span> 
            <span className="ml-2 text-green-600 font-medium">
              (₹{data.transport.totalPrice})
            </span>
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
        <button
          className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
          onClick={onPrev}
        >
          <ChevronLeft size={18} />
          Back to General Info
        </button>

        <button
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg ${
            !data.transport
              ? "bg-gray-300 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
          }`}
          onClick={onNext}
          disabled={!data.transport}
        >
          {data.transport ? "Continue to Itinerary" : "Select Transport First"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default TransportStep;