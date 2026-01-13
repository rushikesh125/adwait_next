import React, { useState, useEffect } from "react";
import { Car, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";
import { getTransportData, getPackagesByState } from "@/firebase/transport_service";

const SelectTransport = ({ onTransportSelect }) => {
  const [states, setStates] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Custom Vehicle State
  const [customVehicle, setCustomVehicle] = useState({
    type: "", seating: "", price: "", ac: true, isCustom: true
  });

  useEffect(() => {
    const fetchStates = async () => {
      const data = await getTransportData();
      setStates(data);
    };
    fetchStates();
  }, []);

  const handleStateChange = async (stateId) => {
    setSelectedStateId(stateId);
    setLoading(true);
    const pkgs = await getPackagesByState(stateId);
    setPackages(pkgs);
    setLoading(false);
  };

  const finalizeSelection = (pkg, vehicle) => {
    const finalSelection = {
      ...pkg,
      selectedVehicle: vehicle,
      totalPrice: Number(vehicle.price || vehicle.perKmprice || 0),
    };
    onTransportSelect(finalSelection);
    setIsCustomizing(false);
  };

  return (
    <div className="space-y-6">
      {/* State Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-gray-700">Operating State</label>
        <select 
          className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          onChange={(e) => handleStateChange(e.target.value)}
          value={selectedStateId}
        >
          <option value="">-- Select State --</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.stateName}</option>)}
        </select>
      </div>

      {loading && <div className="text-center py-4 text-blue-600 font-medium animate-pulse">Fetching packages...</div>}

      {/* Package List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`p-4 border-2 rounded-2xl transition-all ${selectedPackage?.id === pkg.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-gray-800">{pkg.name}</h4>
              <span className="text-[10px] px-2 py-1 bg-gray-200 rounded-full font-bold uppercase">{pkg.pricingType}</span>
            </div>
            
            <div className="space-y-2 mb-4">
              {pkg.vehicles.map((v, idx) => (
                <button 
                  key={idx}
                  onClick={() => finalizeSelection(pkg, v)}
                  className="w-full flex justify-between items-center p-2 text-xs bg-white border border-gray-100 rounded-lg hover:bg-blue-600 hover:text-white transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <Car size={14} /> {v.type} ({v.seating} str)
                  </span>
                  <span className="font-bold">₹{v.price || v.perKmprice}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={() => { setSelectedPackage(pkg); setIsCustomizing(true); }}
              className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-100"
            >
              <Settings2 size={14} /> Customize for this Package
            </button>
          </div>
        ))}
      </div>

      {/* Customization Modal-style UI */}
      {isCustomizing && (
        <div className="p-6 bg-gray-900 rounded-2xl text-white space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          <h4 className="font-bold flex items-center gap-2"><Settings2 size={18} className="text-blue-400"/> Custom Vehicle Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" placeholder="Vehicle Name" 
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:border-blue-500"
              onChange={(e) => setCustomVehicle({...customVehicle, type: e.target.value})}
            />
            <input 
              type="number" placeholder="Seats" 
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:border-blue-500"
              onChange={(e) => setCustomVehicle({...customVehicle, seating: e.target.value})}
            />
            <input 
              type="number" placeholder="Price (Total)" 
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:border-blue-500 col-span-2"
              onChange={(e) => setCustomVehicle({...customVehicle, price: e.target.value})}
            />
          </div>
          <div className="flex gap-3">
            <button 
              className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition"
              onClick={() => finalizeSelection(selectedPackage, customVehicle)}
            >
              Apply Custom Transport
            </button>
            <button 
              className="px-4 py-3 bg-gray-700 rounded-xl font-bold"
              onClick={() => setIsCustomizing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectTransport;