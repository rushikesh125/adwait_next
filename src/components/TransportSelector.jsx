"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { 
  Car, 
  MapPin, 
  Calendar, 
  Settings, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  X,
  Wind
} from "lucide-react";

const SelectTransport = ({ onTransportSelect }) => {
  const [states, setStates] = useState([]);
  const [showSelectionUI, setShowSelectionUI] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const [customVehicleType, setCustomVehicleType] = useState("");
  const [customSeats, setCustomSeats] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customAC, setCustomAC] = useState(false);

  // --- Logic Helpers ---
  const setInSession = (key, value) => {
    sessionStorage.setItem(key, JSON.stringify(value));
  };

  const getFromSession = (key) => {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;
    try { return JSON.parse(itemStr); } catch (e) { return null; }
  };

  useEffect(() => {
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    if (navigationType === "reload") {
      sessionStorage.removeItem("selectedTransportPackage");
    } else {
      const saved = getFromSession("selectedTransportPackage");
      if (saved) {
        setSelectedTransport(saved);
        setIsFinalized(true);
      }
    }
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snapshot = await getDocs(collection(db, "transport"));
        setStates(snapshot.docs.map(doc => ({ id: doc.id, stateName: doc.data().stateName })));
      } catch (error) { console.error(error); }
    };
    if (showSelectionUI) fetchStates();
  }, [showSelectionUI]);

  const handleStateChange = async (e) => {
    const stateId = e.target.value;
    setSelectedStateId(stateId);
    setPackages([]);
    setSelectedPackage(null);
    if (stateId) {
      try {
        const snapshot = await getDocs(collection(db, "transport", stateId, "packages"));
        setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) { console.error(error); }
    }
  };

  const handleDone = () => {
    let finalVehicle = null;
    if (isCustomizing) {
      if (!customVehicleType || !customSeats || !customPrice) {
        alert("Please fill all details.");
        return;
      }
      finalVehicle = { type: customVehicleType, seating: customSeats, price: Number(customPrice), ac: customAC, isCustom: true };
    } else if (selectedPackage && selectedVehicleIndex !== null) {
      finalVehicle = { ...selectedPackage.vehicles[selectedVehicleIndex], isCustom: false };
    } else {
      alert("Please select a vehicle.");
      return;
    }

    const finalSelection = {
      ...selectedPackage,
      selectedVehicle: finalVehicle,
      allPkgs: packages,
      totalPrice: Number(finalVehicle.price),
    };

    setSelectedTransport(finalSelection);
    setInSession("selectedTransportPackage", finalSelection);
    onTransportSelect(finalSelection);
    setIsFinalized(true);
    setShowSelectionUI(false);
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Main Toggle Button */}
      <button
        onClick={() => { setShowSelectionUI(true); setIsFinalized(false); }}
        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
          selectedTransport 
          ? "bg-white border-blue-200 text-blue-700 shadow-sm" 
          : "bg-gray-900 text-white hover:bg-black border-transparent"
        }`}
      >
        <div className="flex items-center gap-3 font-bold">
          <Car size={20} />
          {selectedTransport ? "Edit Transport Details" : "Select Transport"}
        </div>
        <ChevronRight size={18} className={showSelectionUI ? "rotate-90 transition-transform" : ""} />
      </button>

      {/* 2. Selection Modal/Overlay UI */}
      {showSelectionUI && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6 space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Configure Fleet</h3>
              <button onClick={() => setShowSelectionUI(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            {/* State Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operation State</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none"
                  onChange={handleStateChange}
                  value={selectedStateId}
                >
                  <option value="">Choose a State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.stateName}</option>)}
                </select>
              </div>
            </div>

            {/* Packages List */}
            {packages.length > 0 && !selectedPackage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-500">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="border border-gray-100 bg-gray-50/50 p-4 rounded-xl hover:border-blue-400 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-800 leading-tight">{pkg.name}</h4>
                      <div className="flex items-center gap-1 text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-gray-500">
                        <Calendar size={10}/> {pkg.days}D/{pkg.nights}N
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedPackage(pkg)} className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">Select</button>
                      <button onClick={() => { setSelectedPackage(pkg); setIsCustomizing(true); }} className="px-3 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vehicle Selection */}
            {selectedPackage && !isCustomizing && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 italic">Fleet for: {selectedPackage.name}</p>
                  <button onClick={() => setSelectedPackage(null)} className="text-[10px] font-black text-blue-600 uppercase">Change Package</button>
                </div>
                <div className="space-y-2">
                  {selectedPackage.vehicles.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVehicleIndex(idx)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        selectedVehicleIndex === idx ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-2 rounded-lg ${selectedVehicleIndex === idx ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                          <Car size={18}/>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{v.type}</p>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{v.seating} Seats • {v.ac ? 'AC' : 'Non-AC'}</p>
                        </div>
                      </div>
                      <span className="font-black text-blue-700">₹{v.price || v.perKmprice}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={() => setIsCustomizing(true)} className="py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all">Manual Override</button>
                  <button onClick={handleDone} className="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Confirm Fleet</button>
                </div>
              </div>
            )}

            {/* Custom Entry */}
            {isCustomizing && (
              <div className="space-y-4 bg-gray-900 p-5 rounded-2xl text-white animate-in zoom-in-95">
                <div className="flex items-center gap-2 mb-2">
                  <Settings size={16} className="text-blue-400"/>
                  <h4 className="text-sm font-bold uppercase tracking-tight">Custom Vehicle Entry</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input type="text" placeholder="Vehicle Name" value={customVehicleType} onChange={e => setCustomVehicleType(e.target.value)} className="w-full bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Seats" value={customSeats} onChange={e => setCustomSeats(e.target.value)} className="bg-gray-800 border-none rounded-xl p-3 text-sm outline-none" />
                    <input type="number" placeholder="Total Price" value={customPrice} onChange={e => setCustomPrice(e.target.value)} className="bg-gray-800 border-none rounded-xl p-3 text-sm outline-none font-bold text-blue-400" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <input type="checkbox" checked={customAC} onChange={e => setCustomAC(e.target.checked)} className="w-4 h-4 rounded border-none bg-gray-800 text-blue-500" />
                  <span className="text-xs font-bold text-gray-400">Air Conditioning Included</span>
                </label>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setIsCustomizing(false)} className="py-3 bg-gray-800 text-gray-400 rounded-xl font-bold text-xs hover:text-white transition-all">Cancel</button>
                  <button onClick={handleDone} className="py-3 bg-blue-500 text-white rounded-xl font-bold text-xs hover:bg-blue-400 shadow-xl shadow-blue-500/20 transition-all">Save Entry</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Finalized Summary Card */}
      {selectedTransport && isFinalized && !showSelectionUI && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-2 py-1 rounded-md w-fit border border-green-100">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Selected</span>
              </div>
              <div>
                <h4 className="text-lg font-black text-gray-900 leading-tight">
                  {selectedTransport.selectedVehicle.type}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-[11px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <MapPin size={12}/> {selectedTransport.name || "Custom Arrangement"}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Settings size={12}/> {selectedTransport.selectedVehicle.seating} Seater
                  </span>
                  {selectedTransport.selectedVehicle.ac && (
                    <span className="text-[11px] text-blue-500 font-bold uppercase flex items-center gap-1">
                      <Wind size={12}/> AC
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lumpsum</p>
              <p className="text-2xl font-black text-gray-900 italic">₹{selectedTransport.totalPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectTransport;