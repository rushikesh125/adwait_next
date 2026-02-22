// src/components/TransportSelector.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Car,
  MapPin,
  CheckCircle2,
  Settings2,
  BusFront,
  Pencil,
  Trash2,
  Sparkles,
  Users,
  IndianRupee,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Redux
import { setSelectedTransport } from "@/store/packageSlice";

// Firebase helpers (assumed)
import { fetchTransportStates, fetchPackagesByState } from "@/firebase/transportFeatures";

const TransportSelector = () => {
  const dispatch = useDispatch();
  const { selectedTransport: savedTransport } = useSelector((state) => state.package);

  const [states, setStates] = useState([]);
  const [showSelectionUI, setShowSelectionUI] = useState(!savedTransport);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Custom vehicle form
  const [customVehicle, setCustomVehicle] = useState({
    type: "",
    seating: "",
    price: "",
    ac: false,
  });

  // ────────────────────────────────────────────────
  // Load states once
  // ────────────────────────────────────────────────
  useEffect(() => {
    const loadStates = async () => {
      try {
        const data = await fetchTransportStates();
        setStates(data || []);
      } catch (err) {
        console.error("Failed to load transport states:", err);
      }
    };
    loadStates();
  }, []);

  // ────────────────────────────────────────────────
  // Load packages when state changes
  // ────────────────────────────────────────────────
  const handleStateChange = async (stateId) => {
    setSelectedStateId(stateId);
    setPackages([]);
    setSelectedPackage(null);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);

    if (stateId) {
      try {
        const data = await fetchPackagesByState(stateId);
        setPackages(data || []);
      } catch (err) {
        console.error("Failed to load packages:", err);
      }
    }
  };

  // ────────────────────────────────────────────────
  // Confirm & save to Redux
  // ────────────────────────────────────────────────
  const handleConfirmSelection = () => {
    let finalVehicle = null;

    if (isCustomizing) {
      if (!customVehicle.type || !customVehicle.seating || !customVehicle.price) {
        alert("Please fill all custom vehicle details.");
        return;
      }
      finalVehicle = {
        ...customVehicle,
        price: Number(customVehicle.price),
        isCustom: true,
      };
    } else if (selectedPackage && selectedVehicleIndex !== null) {
      finalVehicle = {
        ...selectedPackage.vehicles[selectedVehicleIndex],
        isCustom: false,
      };
    } else {
      alert("Please select a vehicle or fill custom details.");
      return;
    }

    const finalSelection = {
      ...selectedPackage,
      selectedVehicle: finalVehicle,
      allPkgs: packages,
      totalPrice: Number(finalVehicle.price),
    };

    dispatch(setSelectedTransport(finalSelection));
    setShowSelectionUI(false);
  };

  // ────────────────────────────────────────────────
  // Clear / Remove selected transport
  // ────────────────────────────────────────────────
  const handleClearTransport = () => {
    dispatch(setSelectedTransport(null));
    setShowSelectionUI(true);
    setSelectedStateId("");
    setSelectedPackage(null);
    setSelectedVehicleIndex(null);
    setIsCustomizing(false);
    setCustomVehicle({ type: "", seating: "", price: "", ac: false });
  };

  // ────────────────────────────────────────────────
  // Selected Transport Summary (clean & modern)
  // ────────────────────────────────────────────────
  if (savedTransport && !showSelectionUI) {
    const vehicle = savedTransport.selectedVehicle;

    return (
      <Card className="border-theme-muted shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-theme-muted/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
              <BusFront className="h-5 w-5 text-theme-primary" />
              Selected Transport
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
              onClick={handleClearTransport}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5 pb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Package
            </div>
            <div className="font-medium text-slate-900">
              {savedTransport.name || "Custom Package"}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Vehicle
            </div>
            <div className="font-medium text-slate-900">{vehicle.type}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Seats
            </div>
            <div className="font-medium text-slate-900">{vehicle.seating}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Price
            </div>
            <div className="font-bold text-theme-primary text-xl">
              ₹{Number(vehicle.price || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              AC
            </div>
            {vehicle.ac ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                Yes
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1">
                No
              </Badge>
            )}
          </div>
        </CardContent>

        <CardContent className="pt-0 border-t">
          <Button
            variant="outline"
            className="w-full mt-4 border-theme-primary text-theme-primary hover:bg-theme-muted/50 gap-2"
            onClick={() => setShowSelectionUI(true)}
          >
            <Pencil className="h-4 w-4" />
            Change Transport
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ────────────────────────────────────────────────
  // Selection Interface (modern + clean)
  // ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2.5 text-theme-dark">
          <Car className="h-5 w-5 text-theme-primary" />
          Transport
        </h3>
      </div>

      <Card className="border-theme-muted shadow-sm">
        <CardHeader className="bg-theme-muted/30 pb-5">
          <CardTitle className="text-lg">Select Transport</CardTitle>
          <CardDescription className="text-slate-600">
            Choose your pickup state and preferred vehicle package
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-7">
          {/* State */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2 text-theme-dark">
              <MapPin className="h-4 w-4 text-theme-primary" />
              Pickup State
            </Label>
            <Select value={selectedStateId} onValueChange={handleStateChange}>
              <SelectTrigger className="h-11 border-theme-muted focus:ring-theme-primary/30">
                <SelectValue placeholder="Select starting state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.stateName || s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Packages */}
          {packages.length > 0 && !selectedPackage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="border border-slate-200 hover:border-theme-primary/60 transition-all duration-200 cursor-pointer group bg-white"
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setSelectedVehicleIndex(null);
                    setIsCustomizing(false);
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <Badge className="bg-theme-muted text-theme-dark px-2.5 py-0.5">
                        {pkg.days}D / {pkg.nights}N
                      </Badge>
                      <span className="text-xs text-slate-400">{pkg.pricingType || "Standard"}</span>
                    </div>

                    <h4 className="font-semibold text-slate-900 group-hover:text-theme-primary transition-colors mb-2">
                      {pkg.name}
                    </h4>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {pkg.vehicles?.slice(0, 3).map((v, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs border-slate-300 bg-slate-50"
                        >
                          {v.type} ({v.seating})
                        </Badge>
                      ))}
                      {pkg.vehicles?.length > 3 && (
                        <span className="text-xs text-slate-400 self-center">
                          +{pkg.vehicles.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-theme-primary hover:bg-theme-secondary text-white"
                      >
                        Select
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-theme-primary text-theme-primary hover:bg-theme-muted/40 gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPackage(pkg);
                          setIsCustomizing(true);
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Custom
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vehicle Selection or Custom Form */}
          {selectedPackage && (
            <div className="space-y-6 pt-4 border-t border-slate-200">
              {!isCustomizing ? (
                <div className="space-y-4">
                  <Label className="text-sm font-medium flex items-center gap-2 text-theme-dark">
                    <Car className="h-4 w-4 text-theme-primary" />
                    Choose Vehicle
                  </Label>

                  <Select
                    value={selectedVehicleIndex?.toString() ?? ""}
                    onValueChange={(v) => setSelectedVehicleIndex(Number(v))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select preferred vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPackage.vehicles?.map((v, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{v.type}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-sm">{v.seating} seats</span>
                              {v.ac && (
                                <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 text-xs">
                                  AC
                                </Badge>
                              )}
                            </div>
                            <span className="font-semibold text-theme-primary">
                              ₹{Number(v.price || v.perKmprice || 0).toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      className="gap-2 bg-theme-primary hover:bg-theme-secondary text-white shadow-sm"
                      onClick={handleConfirmSelection}
                      disabled={selectedVehicleIndex === null}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Selection
                    </Button>

                    <Button
                      variant="outline"
                      className="gap-2 border-theme-primary text-theme-primary hover:bg-theme-muted/40"
                      onClick={() => setIsCustomizing(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      Customize Vehicle
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-theme-primary" />
                      <h4 className="font-semibold text-theme-dark">Custom Vehicle</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => setIsCustomizing(false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Vehicle Type / Name</Label>
                      <Input
                        placeholder="e.g. Toyota Innova Crysta"
                        value={customVehicle.type}
                        onChange={(e) =>
                          setCustomVehicle({ ...customVehicle, type: e.target.value })
                        }
                        className="h-10 border-theme-muted focus:border-theme-primary focus:ring-theme-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Number of Seats</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 7"
                        value={customVehicle.seating}
                        onChange={(e) =>
                          setCustomVehicle({ ...customVehicle, seating: e.target.value })
                        }
                        className="h-10 border-theme-muted focus:border-theme-primary focus:ring-theme-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Price (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 4500"
                        value={customVehicle.price}
                        onChange={(e) =>
                          setCustomVehicle({ ...customVehicle, price: e.target.value })
                        }
                        className="h-10 border-theme-muted focus:border-theme-primary focus:ring-theme-primary/20"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <Checkbox
                        id="ac-custom"
                        checked={customVehicle.ac}
                        onCheckedChange={(checked) =>
                          setCustomVehicle({ ...customVehicle, ac: checked })
                        }
                        className="border-theme-primary data-[state=checked]:bg-theme-primary data-[state=checked]:border-theme-primary"
                      />
                      <Label
                        htmlFor="ac-custom"
                        className="text-sm font-medium cursor-pointer text-theme-dark"
                      >
                        Air Conditioning Available
                      </Label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button
                      className="gap-2 bg-theme-primary hover:bg-theme-secondary text-white shadow-sm"
                      onClick={handleConfirmSelection}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Save Custom Vehicle
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportSelector;