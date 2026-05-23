"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Car,
  Trash2,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react";

const defaultVehicles = [
  { type: "Sedan", price: 0, seating: 4, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Ertiga", price: 0, seating: 6, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Innova", price: 0, seating: 6, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Crysta", price: 0, seating: 6, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Innova 7 Seater", price: 0, seating: 7, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Crysta 7 Seater", price: 0, seating: 7, ac: true, perKmprice: 0, driverAllowance: 0 },
  { type: "Tempo Traveller - Non AC", price: 0, seating: 12, ac: false, perKmprice: 0, driverAllowance: 0 },
  { type: "Tempo Traveller - AC", price: 0, seating: 12, ac: true, perKmprice: 0, driverAllowance: 0 },
];
const Createpackage = ({ onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedPricingType, setSelectedPricingType] = useState("");
  const [pricingOptions, setPricingOptions] = useState([]);
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState(defaultVehicles);
  const [nights, setNights] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStates = async () => {
      if (!user?.orgId) return;
      try {
        const snapshot = await getDocs(
          query(collection(db, "transport"), where("orgId", "==", user.orgId)),
        );
        const fetchedStates = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStates(fetchedStates);
      } catch {
        toast.error("Error fetching states");
      }
    };
    fetchStates();
  }, [user?.orgId]);

  useEffect(() => {
    if (selectedState) {
      const stateData = states.find((s) => s.stateName === selectedState);
      if (stateData?.pricing) setPricingOptions(Object.keys(stateData.pricing));
      else setPricingOptions([]);
    }
  }, [selectedState, states]);

  const handleVehicleChange = (index, key, value) => {
    const updatedVehicles = [...vehicles];
    if (key === "price" || key === "seating" || key === "perKmprice") {
      const numValue = value === "" ? 0 : parseInt(value);
      updatedVehicles[index][key] = Math.max(0, numValue || 0);
    } else {
      updatedVehicles[index][key] = value;
    }
    setVehicles(updatedVehicles);
  };

  const addVehicleRow = () => {
    const newVehicle = {
      type: "New Vehicle",
      seating: 4,
      ac: true,
       driverAllowance: 0,
      ...(selectedPricingType === "lumpsum" ? { price: 0 } : { perKmprice: 0 }),
    };
    setVehicles([...vehicles, newVehicle]);
    toast.success("New vehicle row added");
  };

  const deleteVehicleRow = (index) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
    toast.success("Vehicle removed from list");
  };

  const sanitizedVehicles = vehicles.map((vehicle) =>
    selectedPricingType === "lumpsum"
      ? {
          ...vehicle,
          price: Number(vehicle.price || 0),
          perKmprice: 0,
          driverAllowance: 0,
        }
      : {
          ...vehicle,
          price: 0,
          perKmprice: Number(vehicle.perKmprice || 0),
          driverAllowance: Number(vehicle.driverAllowance || 0),
        }
  );

  const handleSubmit = async () => {
    if (!packageName.trim()) {
      toast.error("Package name is required");
      return;
    }
    const stateDoc = states.find((s) => s.stateName === selectedState);
    if (!stateDoc || !selectedPricingType) {
      toast.error("Missing required fields");
      return;
    }
    if (vehicles.length === 0) {
      toast.error("Please add at least one vehicle");
      return;
    }
    const hasNegativeValues = sanitizedVehicles.some(
      (v) =>
        (v.price !== null && v.price < 0) ||
        (v.perKmprice !== null && v.perKmprice < 0) ||
         (v.driverAllowance !== null && v.driverAllowance < 0)||
        (v.seating !== null && v.seating < 0) 
       
    );
    if (hasNegativeValues) {
      toast.error("Pricing and seating values cannot be negative.");
      return;
    }

    if (!user?.orgId) {
      toast.error("Organization is not assigned");
      return;
    }
    setLoading(true);
    try {
      const stateDocRef = doc(db, "transport", stateDoc.id);
      const stateSnapshot = await getDoc(stateDocRef);
      const existingPackagesArray = stateSnapshot.data()?.packages || [];

      if (existingPackagesArray.some((pkg) => pkg.name === packageName.trim())) {
        toast.error("Package name already exists");
        setLoading(false);
        return;
      }

      const newPackage = {
        id: uuidv4(),
        orgId: user.orgId,
        pricingType: selectedPricingType,
        name: packageName.trim(),
        description: packageDescription.trim(),
        vehicles: sanitizedVehicles,
        createdAt: new Date().toISOString(),
        // lumpsum-only fields
        ...(selectedPricingType === "lumpsum" && {
          nights: parseInt(nights) || 0,
          days: (parseInt(nights) || 0) + 1,
        }),
      };

      await setDoc(
        doc(collection(db, "transport", stateDoc.id, "packages"), newPackage.id),
        newPackage
      );
      await updateDoc(stateDocRef, {
        packages: [...existingPackagesArray, newPackage],
      });

      toast.success("Package created successfully!");
      onClose();
    } catch {
      toast.error("Database error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl md:max-w-7xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl bg-white">

        {/* HEADER */}
        <DialogHeader className="p-6 bg-theme-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-theme-primary rounded-lg text-white">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl text-theme-dark">
                  Create Transport Package
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Define pricing and vehicle configuration for a new package.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={step === 1 ? "bg-theme-primary" : "bg-slate-300"}>
                1. Details
              </Badge>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <Badge className={step === 2 ? "bg-theme-primary" : "bg-slate-300"}>
                2. Pricing
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* BODY — plain div, no form tag, prevents accidental submission */}
        <div className="p-6 space-y-8">

          {/* ── STEP 1: Package Details ── */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* State + Pricing Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-theme-dark font-semibold">Destination State</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="border-slate-200 focus:ring-theme-primary">
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.id} value={s.stateName}>
                          {s.stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-theme-dark font-semibold">Pricing Structure</Label>
                  <Select
                    value={selectedPricingType}
                    onValueChange={setSelectedPricingType}
                    disabled={!selectedState}
                  >
                    <SelectTrigger className="border-slate-200 focus:ring-theme-primary">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt === "lumpsum"
                            ? "Fixed Package (Lumpsum)"
                            : "Distance Based (Per Km)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Name + Description — shown for ALL pricing types once selected */}
              {selectedPricingType && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <Label className="text-theme-dark font-semibold">Package Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. Kerala Backwater Special"
                      className="focus-visible:ring-theme-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-theme-dark font-semibold">Short Description</Label>
                    <Textarea
                      value={packageDescription}
                      onChange={(e) => setPackageDescription(e.target.value)}
                      placeholder="Include tour highlights..."
                      className="focus-visible:ring-theme-primary resize-none"
                      rows={1}
                    />
                  </div>

                  {/* Nights/Days — only for lumpsum */}
                  {selectedPricingType === "lumpsum" && (
                    <div className="space-y-2">
                      <Label className="text-theme-dark font-semibold">Duration (Nights)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={nights}
                          onChange={(e) => setNights(e.target.value)}
                          className="focus-visible:ring-theme-primary"
                          min={0}
                        />
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          = {nights ? parseInt(nights) + 1 : "0"} Days
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedPricingType && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 italic text-sm">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  Select a state and pricing type to continue
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Vehicle Pricing ── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-theme-primary" />
                  <h3 className="font-bold text-theme-dark uppercase text-xs tracking-wider">
                    Fleet Configuration
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVehicleRow}
                  className="h-8 text-theme-primary border-theme-primary/20 hover:bg-theme-primary hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Vehicle
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Vehicle Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">
                        {selectedPricingType === "lumpsum" ? "Rate (₹)" : "Rate/Km (₹)"}
                      </th>
                      {selectedPricingType !== "lumpsum" && (
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Driver Allowance</th>
                      )}

                      <th className="px-4 py-3 text-left font-semibold text-slate-600 w-24">Seats</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Climate</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map((v, idx) => (
                      <tr key={idx} className="hover:bg-theme-muted/10 transition-colors group">
                        <td className="px-4 py-2">
                          <Input
                            value={v.type}
                            onChange={(e) => handleVehicleChange(idx, "type", e.target.value)}
                            className="h-9 border-slate-200 bg-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={selectedPricingType === "lumpsum" ? (v.price ?? "") : (v.perKmprice ?? "")}
                            onChange={(e) =>
                              handleVehicleChange(
                                idx,
                                selectedPricingType === "lumpsum" ? "price" : "perKmprice",
                                e.target.value
                              )
                            }
                            className="h-9 border-slate-200 font-medium text-theme-primary"
                          />
                        </td>
                        {selectedPricingType !== "lumpsum" && (
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              value={v.driverAllowance ?? ""}
                              onChange={(e) =>
                                handleVehicleChange(idx, "driverAllowance", e.target.value)
                              }
                              className="h-9 border-slate-200"
                            />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={v.seating ?? ""}
                            onChange={(e) => handleVehicleChange(idx, "seating", e.target.value)}
                            className="h-9 border-slate-200"
                          />
                        </td>
                        
                        <td className="px-4 py-2">
                          <Select
                            value={String(v.ac)}
                            onValueChange={(val) => handleVehicleChange(idx, "ac", val === "true")}
                          >
                            <SelectTrigger className="h-9 border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">AC</SelectItem>
                              <SelectItem value="false">Non-AC</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteVehicleRow(idx)}
                            className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vehicles.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No vehicles listed. Click Add Vehicle to begin.
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator className="bg-slate-100" />

          {/* FOOTER ACTIONS */}
          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between items-center bg-slate-50/50 p-6 -m-6 mt-2">
            <div />
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? onClose : () => setStep(1)}
                className="border-slate-200"
              >
                {step === 1 ? "Cancel" : <><ChevronLeft className="w-4 h-4 mr-1" /> Back</>}
              </Button>

              {step === 1 ? (
                <Button
                  type="button"
                  disabled={!selectedPricingType}
                  onClick={() => setStep(2)}
                  className="bg-theme-primary hover:bg-theme-secondary text-white min-w-[140px] shadow-lg shadow-theme-primary/20"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="bg-theme-primary hover:bg-theme-secondary text-white min-w-[140px] shadow-lg shadow-theme-primary/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Create Package</>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default Createpackage;
