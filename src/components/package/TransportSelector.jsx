import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  CheckCircle2,
  Plus,
  Badge,
} from "lucide-react";

const TransportSelector = ({ onTransportSelect }) => {
  const [transportStates, setTransportStates] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customVehicleName, setCustomVehicleName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customAC, setCustomAC] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "transport"))
      .then((snap) => setTransportStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedStateId) { setPackages([]); setSelectedPkg(null); setSelectedVehicle(null); return; }
    getDocs(collection(db, "transport", selectedStateId, "packages"))
      .then((snap) => setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, [selectedStateId]);

  const toTitleCase = (s) =>
    s?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || s;

  const handleVehicleSelect = (vehicle, pkg) => {
    setSelectedVehicle(vehicle);
    onTransportSelect({
      id: pkg.id,
      name: pkg.name || pkg.packageName || pkg.id,
      vehicles: pkg.vehicles || [],
      allPkgs: packages,
      pricingType: pkg.pricingType,
      selectedVehicle: vehicle,
      isCustom: false,
    });
  };

  const handleCustomApply = () => {
    const v = { type: customVehicleName, price: parseFloat(customPrice) || 0, ac: customAC, isCustom: true };
    onTransportSelect({ name: "Custom", selectedVehicle: v, vehicles: [v], isCustom: true });
    setSelectedVehicle(v);
  };

  const getVehicleDisplayPrice = (v) => {
    if (Number(v.perKmprice) > 0) return { amount: Number(v.perKmprice), suffix: "/km" };
    return { amount: Number(v.price) || 0, suffix: "" };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
        {["From Package", "Custom"].map((label, i) => (
          <button
            key={label} onClick={() => setIsCustom(i === 1)}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              isCustom === (i === 1) ? "bg-white text-theme-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >{label}</button>
        ))}
      </div>

      {!isCustom ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-theme-primary" /> Transport State
            </Label>
            <Select value={selectedStateId} onValueChange={setSelectedStateId}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>
                {transportStates.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{toTitleCase(s.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {packages.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Package</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => { setSelectedPkg(pkg); setSelectedVehicle(null); }}
                    className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                      selectedPkg?.id === pkg.id ? "border-theme-primary bg-theme-primary/5" : "border-slate-200 hover:border-theme-primary/40"
                    }`}
                  >
                    <p className="font-semibold">{pkg.name || pkg.packageName || pkg.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pkg.vehicles?.length || 0} vehicle(s) available</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedPkg?.vehicles?.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Choose Vehicle</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPkg.vehicles.map((v, i) => {
                  const { amount, suffix } = getVehicleDisplayPrice(v);
                  return (
                    <button
                      key={i} onClick={() => handleVehicleSelect(v, selectedPkg)}
                      className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                        selectedVehicle?.type === v.type ? "border-theme-primary bg-theme-primary/5" : "border-slate-200 hover:border-theme-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">🚗 {v.type}</p>
                        <Badge variant={v.ac ? "default" : "outline"} className={`text-xs ${v.ac ? "bg-green-100 text-green-800 border-green-200" : ""}`}>
                          {v.ac ? "AC" : "Non-AC"}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-theme-primary mt-1">₹{amount.toLocaleString("en-IN")}{suffix}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedVehicle && !selectedVehicle.isCustom && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{selectedVehicle.type}</span>
              <span className="text-green-600">{selectedVehicle.ac ? "(AC)" : "(Non-AC)"}</span>
              <span>—</span>
              <span className="font-bold">₹{getVehicleDisplayPrice(selectedVehicle).amount}{getVehicleDisplayPrice(selectedVehicle).suffix}</span>
              <span className="text-green-600 text-xs">selected ✓</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm">Vehicle Name</Label>
              <Input value={customVehicleName} onChange={(e) => setCustomVehicleName(e.target.value)} placeholder="e.g. Toyota Innova Crysta" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Price (₹)</Label>
              <Input type="number" min="0" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="customAC" checked={customAC} onChange={(e) => setCustomAC(e.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-theme-primary" />
            <Label htmlFor="customAC" className="text-sm cursor-pointer">AC Vehicle</Label>
          </div>
          <Button onClick={handleCustomApply} className="bg-theme-primary hover:bg-theme-secondary text-sm">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Apply Custom Transport
          </Button>
          {selectedVehicle?.isCustom && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{selectedVehicle.type}</span>{" "}
              {selectedVehicle.ac ? "(AC)" : "(Non-AC)"} — ₹{selectedVehicle.price} applied ✓
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransportSelector;