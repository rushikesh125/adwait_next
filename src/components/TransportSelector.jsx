// "use client";

// import React, { useEffect, useState } from "react";
// import { 
//   Car, 
//   MapPin, 
//   CheckCircle2, 
//   Settings2, 
//   ChevronRight, 
//   Wind, 
//   Users, 
//   Wallet,
//   Pencil
// } from "lucide-react";

// // Shadcn UI components
// import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";

// // Firebase features
// import { fetchTransportStates, fetchPackagesByState } from "@/firebase/transportFeatures";

// const SelectTransport = ({ onTransportSelect }) => {
//   const [states, setStates] = useState([]);
//   const [showSelectionUI, setShowSelectionUI] = useState(false);
//   const [selectedStateId, setSelectedStateId] = useState("");
//   const [packages, setPackages] = useState([]);
//   const [selectedPackage, setSelectedPackage] = useState(null);
//   const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(null);
//   const [isFinalized, setIsFinalized] = useState(false);
//   const [selectedTransport, setSelectedTransport] = useState(null);
//   const [isCustomizing, setIsCustomizing] = useState(false);

//   // Custom vehicle state
//   const [customVehicle, setCustomVehicle] = useState({
//     type: "",
//     seating: "",
//     price: "",
//     ac: false
//   });

//   // Session storage helpers
//   const setInSession = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
//   const getFromSession = (key) => {
//     const itemStr = sessionStorage.getItem(key);
//     if (!itemStr) return null;
//     try { return JSON.parse(itemStr); } catch { return null; }
//   };

//   useEffect(() => {
//     const saved = getFromSession("selectedTransportPackage");
//     if (saved) {
//       setSelectedTransport(saved);
//       setIsFinalized(true);
//       setShowSelectionUI(false);
//     }
    
//     const loadStates = async () => {
//       const data = await fetchTransportStates();
//       setStates(data);
//     };
//     loadStates();
//   }, []);

//   const handleStateChange = async (stateId) => {
//     setSelectedStateId(stateId);
//     setPackages([]);
//     setSelectedPackage(null);
//     setSelectedVehicleIndex(null);
//     setIsCustomizing(false);

//     if (stateId) {
//       const data = await fetchPackagesByState(stateId);
//       setPackages(data);
//     }
//   };

//   const handleDone = () => {
//     let finalVehicle = null;

//     if (isCustomizing) {
//       if (!customVehicle.type || !customVehicle.seating || !customVehicle.price) {
//         alert("Please fill all custom details.");
//         return;
//       }
//       finalVehicle = { ...customVehicle, price: Number(customVehicle.price), isCustom: true };
//     } else if (selectedPackage && selectedVehicleIndex !== null) {
//       finalVehicle = { 
//         ...selectedPackage.vehicles[selectedVehicleIndex], 
//         isCustom: false,
//         vehicles: selectedPackage 
//       };
//     } else {
//       alert("Please select a vehicle or customize one.");
//       return;
//     }

//     const finalSelection = {
//       ...selectedPackage,
//       selectedVehicle: finalVehicle,
//       allPkgs: packages,
//       totalPrice: Number(finalVehicle.price),
//     };

//     setSelectedTransport(finalSelection);
//     setInSession("selectedTransportPackage", finalSelection);
//     onTransportSelect?.(finalSelection);
//     setIsFinalized(true);
//     setShowSelectionUI(false);
//   };

//   return (
//     <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
//       {/* Header Action */}
//       <div className="flex justify-between items-center">
//         <h2 className="text-xl font-semibold text-theme-dark flex items-center gap-2">
//           <Car className="text-theme-primary" /> Transport Management
//         </h2>
//         <Button 
//           variant={selectedTransport ? "outline" : "default"}
//           className={!selectedTransport ? "bg-theme-primary hover:bg-theme-secondary text-white" : "border-theme-primary text-theme-primary"}
//           onClick={() => { setShowSelectionUI(true); setIsFinalized(false); }}
//         >
//           {selectedTransport ? <><Pencil className="w-4 h-4 mr-2"/> Edit Transport</> : "Select Transport"}
//         </Button>
//       </div>

//       {/* Selection UI */}
//       {showSelectionUI && (
//         <Card className="border-theme-muted shadow-lg bg-white overflow-hidden">
//           <CardHeader className="bg-theme-muted/30">
//             <CardTitle className="text-theme-dark text-lg">Choose Your Journey</CardTitle>
//             <CardDescription>Select a state and package to see available vehicles</CardDescription>
//           </CardHeader>
//           <CardContent className="pt-6 space-y-6">
            
//             {/* State Selection */}
//             <div className="grid gap-2">
//               <Label className="text-theme-secondary flex items-center gap-1">
//                 <MapPin size={16} /> Pickup State
//               </Label>
//               <Select onValueChange={handleStateChange} value={selectedStateId}>
//                 <SelectTrigger className="border-theme-accent/30 focus:ring-theme-primary">
//                   <SelectValue placeholder="Where are you starting from?" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {states.map((s) => (
//                     <SelectItem key={s.id} value={s.id}>{s.stateName}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Packages Grid */}
//             {packages.length > 0 && !selectedPackage && (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
//                 {packages.map((pkg) => (
//                   <Card key={pkg.id} className="group hover:border-theme-primary transition-all cursor-pointer border-dashed">
//                     <CardContent className="p-4">
//                       <div className="flex justify-between items-start mb-2">
//                         <Badge variant="secondary" className="bg-theme-muted text-theme-dark">
//                           {pkg.days}D / {pkg.nights}N
//                         </Badge>
//                         <span className="text-xs font-medium text-slate-400">{pkg.pricingType}</span>
//                       </div>
//                       <h4 className="font-bold text-slate-800 mb-2">{pkg.name}</h4>
//                       <div className="flex gap-2 mt-4">
//                         <Button size="sm" className="flex-1 bg-theme-primary" onClick={() => setSelectedPackage(pkg)}>
//                           Select
//                         </Button>
//                         <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedPackage(pkg); setIsCustomizing(true); }}>
//                           <Settings2 className="w-3 h-3 mr-1" /> Custom
//                         </Button>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             )}

//             {/* Vehicle Selection or Customization */}
//             {selectedPackage && (
//               <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-100 animate-in zoom-in-95">
//                 <div className="flex items-center justify-between">
//                   <h4 className="font-semibold text-theme-dark">
//                     {isCustomizing ? "Custom Transport Details" : `Vehicles for ${selectedPackage.name}`}
//                   </h4>
//                   <Button variant="ghost" size="sm" onClick={() => { setSelectedPackage(null); setIsCustomizing(false); }}>Change Package</Button>
//                 </div>

//                 {!isCustomizing ? (
//                   <div className="grid gap-3">
//                     {selectedPackage.vehicles.map((v, idx) => (
//                       <div 
//                         key={idx}
//                         onClick={() => setSelectedVehicleIndex(idx)}
//                         className={`p-3 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all ${
//                           selectedVehicleIndex === idx ? "border-theme-primary bg-theme-muted/20" : "border-transparent bg-white shadow-sm"
//                         }`}
//                       >
//                         <div className="flex items-center gap-3">
//                           <div className={`p-2 rounded-full ${selectedVehicleIndex === idx ? "bg-theme-primary text-white" : "bg-slate-100 text-slate-400"}`}>
//                             <Car size={18} />
//                           </div>
//                           <div>
//                             <p className="font-medium text-slate-800">{v.type}</p>
//                             <p className="text-xs text-slate-500 flex items-center gap-2">
//                               <Users size={12} /> {v.seating} Seats • {v.ac ? "AC" : "Non-AC"}
//                             </p>
//                           </div>
//                         </div>
//                         <p className="font-bold text-theme-secondary">₹{v.price || v.perKmprice}</p>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-2 gap-4">
//                     <Input placeholder="Vehicle Name" value={customVehicle.type} onChange={(e) => setCustomVehicle({...customVehicle, type: e.target.value})} />
//                     <Input type="number" placeholder="Seats" value={customVehicle.seating} onChange={(e) => setCustomVehicle({...customVehicle, seating: e.target.value})} />
//                     <Input type="number" placeholder="Price" value={customVehicle.price} onChange={(e) => setCustomVehicle({...customVehicle, price: e.target.value})} />
//                     <div className="flex items-center space-x-2 border rounded-md px-3 bg-white">
//                       <Checkbox id="ac" checked={customVehicle.ac} onCheckedChange={(val) => setCustomVehicle({...customVehicle, ac: !!val})} />
//                       <Label htmlFor="ac">AC Available</Label>
//                     </div>
//                   </div>
//                 )}

//                 <div className="flex gap-2 pt-4">
//                   <Button className="flex-1 bg-theme-primary" onClick={handleDone}>Confirm Selection</Button>
//                   <Button variant="outline" className="flex-1" onClick={() => setShowSelectionUI(false)}>Cancel</Button>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       )}

//       {/* Summary View */}
//       {selectedTransport && isFinalized && !showSelectionUI && (
//         <Card className="border-l-4 border-l-theme-primary shadow-md overflow-hidden animate-in fade-in">
//           <CardHeader className="pb-2">
//             <div className="flex justify-between items-center">
//               <Badge className="bg-theme-primary hover:bg-theme-primary">Booked Transport</Badge>
//               <CheckCircle2 className="text-emerald-500" />
//             </div>
//             <CardTitle className="text-lg mt-2">{selectedTransport.name || "Custom Arrangement"}</CardTitle>
//           </CardHeader>
//           <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
//             <div className="flex items-center gap-2">
//               <Car className="text-theme-accent" size={18} />
//               <div>
//                 <p className="text-[10px] uppercase text-slate-400 font-bold">Vehicle</p>
//                 <p className="text-sm font-semibold">{selectedTransport.selectedVehicle.type}</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <Users className="text-theme-accent" size={18} />
//               <div>
//                 <p className="text-[10px] uppercase text-slate-400 font-bold">Capacity</p>
//                 <p className="text-sm font-semibold">{selectedTransport.selectedVehicle.seating} Seats</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <Wind className="text-theme-accent" size={18} />
//               <div>
//                 <p className="text-[10px] uppercase text-slate-400 font-bold">Comfort</p>
//                 <p className="text-sm font-semibold">{selectedTransport.selectedVehicle.ac ? "Air Conditioned" : "Standard"}</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               <Wallet className="text-theme-accent" size={18} />
//               <div>
//                 <p className="text-[10px] uppercase text-slate-400 font-bold">Total Fare</p>
//                 <p className="text-sm font-bold text-theme-dark">₹{selectedTransport.selectedVehicle.price}</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default SelectTransport;

'use client';

import React, { useEffect, useState } from 'react';



import { fetchAllStates, fetchPackagesForState } from '@/firebase/transport';
import { 
  BusFront, 
  CheckCircle, 
  Edit, 
  ChevronRight,
  Car,
  Sparkles,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
const SESSION_KEY = 'selectedTransportPackage';

const SelectTransport = ({ onTransportSelect }) => {
  const [states, setStates] = useState([]);
  const [showSelectionUI, setShowSelectionUI] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);

  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customVehicleType, setCustomVehicleType] = useState('');
  const [customSeats, setCustomSeats] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customAC, setCustomAC] = useState(false);

  // ── Session helpers ────────────────────────────────────────
  const setInSession = (value) => {
    if (value) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  const getFromSession = () => {
    const itemStr = sessionStorage.getItem(SESSION_KEY);
    if (!itemStr) return null;
    try {
      return JSON.parse(itemStr);
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  };

  // ── Reset on full reload ───────────────────────────────────
  useEffect(() => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const navigationType = navEntry?.type;

    if (navigationType === 'reload') {
      sessionStorage.removeItem(SESSION_KEY);
      setSelectedTransport(null);
      setShowSelectionUI(false);
      setSelectedStateId('');
      setPackages([]);
      setSelectedPackage(null);
      setSelectedVehicleIndex(null);
      setIsFinalized(false);
      setIsCustomizing(false);
      resetCustomFields();
    } else {
      const saved = getFromSession();
      if (saved) {
        setSelectedTransport(saved);
        setIsFinalized(true);
        setShowSelectionUI(false);
      }
    }
  }, []);

  const resetCustomFields = () => {
    setCustomVehicleType('');
    setCustomSeats('');
    setCustomPrice('');
    setCustomAC(false);
  };

  // Load states when selection UI opens
  useEffect(() => {
    if (showSelectionUI && states.length === 0) {
      fetchAllStates().then(setStates);
    }
  }, [showSelectionUI, states.length]);

  // Load packages when state changes
  useEffect(() => {
    if (!selectedStateId) {
      setPackages([]);
      return;
    }
    fetchPackagesForState(selectedStateId).then(setPackages);
  }, [selectedStateId]);

  const handleSelectTransportClick = () => {
    setShowSelectionUI(true);
    setSelectedStateId('');
    setPackages([]);
    setSelectedPackage(null);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);
    setIsFinalized(false);
    setSelectedTransport(null);
    if (onTransportSelect) onTransportSelect(null);
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);
    setIsFinalized(false);
  };

  const handleVehicleSelect = (index) => {
    setSelectedVehicleIndex(index);
    setIsFinalized(false);
  };

  const handleCustomizeTransport = (pkg) => {
    setSelectedPackage(pkg);
    setIsCustomizing(true);
    setSelectedVehicleIndex(null);
    resetCustomFields();
    setIsFinalized(false);
  };

  const handleDone = () => {
    let finalVehicle;

    if (isCustomizing) {
      if (!customVehicleType || !customSeats || !customPrice) {
        alert('Please fill all custom vehicle details.');
        return;
      }
      finalVehicle = {
        type: customVehicleType,
        seating: customSeats,
        price: Number(customPrice),
        ac: customAC,
        isCustom: true,
      };
    } else if (
      selectedPackage &&
      selectedVehicleIndex !== null &&
      selectedPackage.vehicles[selectedVehicleIndex]
    ) {
      finalVehicle = {
        ...selectedPackage.vehicles[selectedVehicleIndex],
        isCustom: false,
      };
    } else {
      alert('Please select a vehicle or customize one.');
      return;
    }

    const finalSelection = {
      ...(selectedPackage || {}),
      selectedVehicle: finalVehicle,
      allPkgs: packages,
      totalPrice: Number(finalVehicle.price ?? finalVehicle.perKmprice ?? 0),
    };

    setSelectedTransport(finalSelection);
    setInSession(finalSelection);
    if (onTransportSelect) onTransportSelect(finalSelection);
    setIsFinalized(true);
    setShowSelectionUI(false);
  };

  const getVehicleLabel = (vehicle) =>
    `${vehicle.type} - ₹${vehicle.price ?? vehicle.perKmprice ?? 'N/A'} - ${vehicle.seating} seats ${
      vehicle.ac ? '(AC)' : '(Non-AC)'
    }`;

return (
  <div className="space-y-6 max-w-5xl">
    {/* Main action button */}
    <div className="flex items-center gap-4">
      <Button
        onClick={handleSelectTransportClick}
        variant={selectedTransport ? "outline" : "default"}
        size="lg"
        className={`
          min-w-[220px] gap-2.5 font-medium transition-all duration-200
          ${selectedTransport 
            ? "border-theme-primary text-theme-primary hover:bg-theme-primary/5 hover:border-theme-secondary" 
            : "bg-gradient-to-r from-theme-primary to-theme-secondary hover:opacity-90 text-white shadow-md"}
        `}
      >
        {selectedTransport ? (
          <>
            <Edit className="h-4 w-4" />
            Edit Transport
          </>
        ) : (
          <>
            <BusFront className="h-4 w-4" />
            Select Transport
          </>
        )}
      </Button>

      {/* Quick info badge */}
      {selectedTransport && isFinalized && !showSelectionUI && (
        <div className="flex items-center gap-2 px-4 py-2 bg-theme-muted/50 rounded-lg border border-theme-primary/20">
          <CheckCircle className="h-4 w-4 text-theme-primary" />
          <span className="text-sm text-theme-dark/80">
            {selectedTransport.name || "Custom"} · {selectedTransport.selectedVehicle.type}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-semibold text-theme-primary">
            ₹{selectedTransport.selectedVehicle.price ?? selectedTransport.selectedVehicle.perKmprice ?? "—"}
          </span>
        </div>
      )}
    </div>

    {/* Selection panel */}
    {showSelectionUI && (
      <Card className="border-theme-primary/20 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-theme-muted/60 to-theme-muted/30 border-b border-theme-primary/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-theme-primary/10 rounded-lg">
              <BusFront className="h-5 w-5 text-theme-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-theme-dark text-xl font-semibold">
                Choose Your Transport
              </CardTitle>
              <CardDescription className="text-theme-dark/60 mt-1">
                Select state, package and vehicle or create a custom option
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          {/* State selection */}
          <div className="space-y-3">
            <Label htmlFor="state" className="text-theme-dark font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-theme-primary" />
              Select State
            </Label>
            <Select
              value={selectedStateId}
              onValueChange={(val) => {
                setSelectedStateId(val);
                setSelectedPackage(null);
                setSelectedVehicleIndex(null);
                setIsCustomizing(false);
              }}
            >
              <SelectTrigger 
                id="state" 
                className="h-12 border-theme-primary/30 hover:border-theme-primary focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all"
              >
                <SelectValue placeholder="Choose a state..." />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem 
                    key={state.id} 
                    value={state.id}
                    className="focus:bg-theme-muted/50 focus:text-theme-dark"
                  >
                    {state.stateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Packages grid */}
          {packages.length > 0 && !selectedPackage && !isCustomizing && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-theme-dark">
                  Available Packages
                </h3>
                <Badge variant="secondary" className="bg-theme-muted text-theme-primary border-theme-primary/20">
                  {packages.length} options
                </Badge>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => (
                  <Card 
                    key={pkg.id}
                    className="group border-theme-primary/20 hover:border-theme-accent hover:shadow-md transition-all duration-200"
                  >
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base text-theme-dark group-hover:text-theme-primary transition-colors">
                        {pkg.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-theme-dark/60 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="border-theme-primary/30 text-theme-dark text-xs">
                          {pkg.days}D / {pkg.nights}N
                        </Badge>
                        <span className="text-theme-primary">·</span>
                        <span>{pkg.pricingType}</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="space-y-2.5">
                        {pkg.vehicles.map((v, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-md bg-theme-muted/30">
                            <Car className="h-4 w-4 text-theme-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 text-theme-dark/80">
                              <span className="font-medium text-theme-dark">{v.type}</span>
                              <span className="text-theme-primary mx-1">·</span>
                              <span className="font-semibold text-theme-primary">
                                ₹{v.price ?? v.perKmprice ?? "—"}
                              </span>
                              <span className="text-theme-dark/60 mx-1">·</span>
                              <span>{v.seating} seats</span>
                              {v.ac && (
                                <Badge variant="secondary" className="ml-2 bg-theme-accent/20 text-theme-accent text-xs">
                                  AC
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="gap-2 border-t border-theme-primary/10 bg-gradient-to-br from-theme-muted/40 to-transparent pt-4">
                      <Button
                        size="sm"
                        className="flex-1 bg-theme-primary hover:bg-theme-secondary text-white shadow-sm"
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Select
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
                        onClick={() => handleCustomizeTransport(pkg)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Customize
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Predefined vehicle choice */}
          {selectedPackage && !isCustomizing && (
            <div className="space-y-5 pt-4 border-t border-theme-primary/10">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-theme-dark">
                  Select Vehicle from
                </h3>
                <Badge className="bg-theme-primary/10 text-theme-primary border-theme-primary/20">
                  {selectedPackage.name}
                </Badge>
              </div>

              <Select
                value={selectedVehicleIndex !== null ? String(selectedVehicleIndex) : ""}
                onValueChange={(v) => handleVehicleSelect(Number(v))}
              >
                <SelectTrigger className="h-12 border-theme-primary/30 hover:border-theme-primary focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all">
                  <SelectValue placeholder="Choose your vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedPackage.vehicles.map((v, idx) => (
                    <SelectItem 
                      key={idx} 
                      value={String(idx)}
                      className="focus:bg-theme-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-theme-primary" />
                        <span>{v.type}</span>
                        <span className="text-theme-primary">·</span>
                        <span className="font-semibold text-theme-primary">
                          ₹{v.price ?? v.perKmprice ?? "—"}
                        </span>
                        <span className="text-theme-dark/60">·</span>
                        <span className="text-theme-dark/60">{v.seating} seats</span>
                        {v.ac && (
                          <Badge variant="secondary" className="ml-1 bg-theme-accent/20 text-theme-accent text-xs">
                            AC
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-3">
                <Button 
                  className="gap-2 bg-gradient-to-r from-theme-primary to-theme-secondary hover:opacity-90 text-white shadow-sm"
                  onClick={handleDone}
                  disabled={selectedVehicleIndex === null}
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm Selection
                </Button>
                <Button
                  variant="outline"
                  className="border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
                  onClick={() => handleCustomizeTransport(selectedPackage)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Customize Instead
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-theme-dark/60 hover:text-theme-dark hover:bg-theme-muted/50"
                  onClick={() => setShowSelectionUI(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Custom vehicle form */}
          {isCustomizing && (
            <div className="space-y-6 pt-4 border-t border-theme-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-dark">
                  Create Custom Vehicle
                </h3>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-theme-dark font-medium">Vehicle Type / Name</Label>
                  <Input
                    placeholder="e.g. Toyota Innova Crysta"
                    value={customVehicleType}
                    onChange={(e) => setCustomVehicleType(e.target.value)}
                    className="h-11 border-theme-primary/30 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-theme-dark font-medium">Number of Seats</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 7"
                    value={customSeats}
                    onChange={(e) => setCustomSeats(e.target.value)}
                    className="h-11 border-theme-primary/30 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-theme-dark font-medium">Price (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 4500"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="h-11 border-theme-primary/30 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="ac-custom"
                    checked={customAC}
                    onCheckedChange={setCustomAC}
                    className="border-theme-primary data-[state=checked]:bg-theme-primary data-[state=checked]:border-theme-primary h-5 w-5"
                  />
                  <Label 
                    htmlFor="ac-custom" 
                    className="text-theme-dark cursor-pointer font-medium"
                  >
                    Air Conditioning Available
                  </Label>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  className="gap-2 bg-gradient-to-r from-theme-primary to-theme-secondary hover:opacity-90 text-white shadow-sm"
                  onClick={handleDone}
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Custom Vehicle
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-theme-dark/60 hover:text-theme-dark hover:bg-theme-muted/50"
                  onClick={() => setShowSelectionUI(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )}

    {/* Final summary */}
    {selectedTransport && isFinalized && !showSelectionUI && (
      <Card className="bg-gradient-to-br from-theme-muted/60 to-theme-muted/30 border-theme-primary/20 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-theme-dark text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 bg-theme-primary/10 rounded">
              <BusFront className="h-4 w-4 text-theme-primary" />
            </div>
            Selected Transport Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 md:grid-cols-5">
          <div className="space-y-1">
            <div className="text-theme-dark/60 text-xs font-medium uppercase tracking-wide">Package</div>
            <div className="font-semibold text-theme-dark">
              {selectedTransport.name || "Custom"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-theme-dark/60 text-xs font-medium uppercase tracking-wide">Vehicle</div>
            <div className="font-semibold text-theme-dark">
              {selectedTransport.selectedVehicle.type}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-theme-dark/60 text-xs font-medium uppercase tracking-wide">Seats</div>
            <div className="font-semibold text-theme-dark">
              {selectedTransport.selectedVehicle.seating}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-theme-dark/60 text-xs font-medium uppercase tracking-wide">Price</div>
            <div className="font-bold text-theme-primary text-lg">
              ₹{selectedTransport.selectedVehicle.price ?? selectedTransport.selectedVehicle.perKmprice ?? "—"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-theme-dark/60 text-xs font-medium uppercase tracking-wide">AC</div>
            <div className="font-semibold">
              {selectedTransport.selectedVehicle.ac ? (
                <Badge className="bg-theme-primary/10 text-theme-primary border-theme-primary/20">
                  Yes
                </Badge>
              ) : (
                <span className="text-theme-dark/50">No</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);
};

export default SelectTransport;