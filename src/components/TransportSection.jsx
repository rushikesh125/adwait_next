import React, { useState, useEffect } from "react";
import { fetchTransportPackages } from "@/firebase/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"; 
import "@/components/css/SelectTransport.css"
const TransportSection = ({ locations, onTransportSelect, selectedTransport }) => {
  const [selectedState, setSelectedState] = useState("");
  const [packages, setPackages] = useState([]);
  const [isCustom, setIsCustom] = useState(false);
  const [customDetails, setCustomDetails] = useState({ type: "", price: 0, seats: 4, ac: true });

  useEffect(() => {
    if (selectedState && !isCustom) {
      fetchTransportPackages(selectedState).then(setPackages);
    }
  }, [selectedState, isCustom]);

  const handlePackageSelect = (pkg, vehicle) => {
    onTransportSelect({
      ...pkg,
      selectedVehicle: vehicle,
      totalPrice: vehicle.price || vehicle.perKmprice || 0,
      isCustom: false
    });
  };

  const handleCustomConfirm = () => {
    onTransportSelect({
      name: "Custom Transport",
      selectedVehicle: { ...customDetails, isCustom: true },
      totalPrice: Number(customDetails.price),
      isCustom: true
    });
  };

  return (
    <Card className="border-t-4 border-theme-secondary mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-theme-dark flex items-center gap-2">🚗 Transport</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span>Package</span>
            <Switch checked={isCustom} onCheckedChange={setIsCustom} />
            <span>Custom</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isCustom ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <input placeholder="Vehicle Name" className="border p-2 rounded" value={customDetails.type} onChange={e=>setCustomDetails({...customDetails, type: e.target.value})} />
            <input type="number" placeholder="Price" className="border p-2 rounded" value={customDetails.price} onChange={e=>setCustomDetails({...customDetails, price: e.target.value})} />
            <div className="flex items-center gap-2">
               <input type="checkbox" checked={customDetails.ac} onChange={e=>setCustomDetails({...customDetails, ac: e.target.checked})} /> AC
            </div>
            <button onClick={handleCustomConfirm} className="bg-theme-secondary text-white p-2 rounded">Set Custom</button>
          </div>
        ) : (
          <div className="space-y-4">
             <select className="w-full p-2 border rounded" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                <option value="">Select State for Transport</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
             </select>
             
             {/* Package List */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="border p-3 rounded hover:shadow-md transition-shadow">
                    <h5 className="font-bold text-theme-primary">{pkg.name}</h5>
                    <p className="text-xs text-gray-500">{pkg.days}D / {pkg.nights}N</p>
                    <div className="mt-2 space-y-1">
                      {pkg.vehicles.map((v, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-1 rounded">
                          <span>{v.type} ({v.ac ? 'AC' : 'Non-AC'})</span>
                          <button 
                            onClick={() => handlePackageSelect(pkg, v)}
                            className="text-xs bg-theme-accent text-white px-2 py-1 rounded hover:bg-theme-secondary"
                          >
                            Select ₹{v.price || v.perKmprice}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
        
        {/* Selected Summary */}
        {selectedTransport && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">
             <strong>Selected:</strong> {selectedTransport.selectedVehicle.type} 
             ({selectedTransport.selectedVehicle.ac ? 'AC' : 'Non-AC'}) 
             - <span className="font-bold">₹{selectedTransport.totalPrice}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default TransportSection;