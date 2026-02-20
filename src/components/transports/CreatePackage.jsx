"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
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
  X,
} from "lucide-react";

const defaultVehicles = [
  { type: "Sedan", price: null, seating: null, ac: true, perKmprice: null, driverAllowance: null },
  { type: "Ertiga", price: null, seating: null, ac: true, perKmprice: null,  driverAllowance: null },
  { type: "Innova", price: null, seating: null, ac: true, perKmprice: null ,  driverAllowance: null},
  { type: "Crysta", price: null, seating: null, ac: true, perKmprice: null, driverAllowance : null},
  {
    type: "Innova 7 Seater",
    price: null,
    seating: 7,
    ac: true,
    perKmprice: null,
      driverAllowance: null,
  },
  {
    type: "Crysta 7 Seater",
    price: null,
    seating: 7,
    ac: true,
    perKmprice: null,
      driverAllowance: null,
  },
  {
    type: "Tempo Traveller - Non AC",
    price: null,
    seating: null,
    ac: false,
    perKmprice: null,
      driverAllowance: null,
  },
  {
    type: "Tempo Traveller - AC",
    price: null,
    seating: null,
    ac: true,
    perKmprice: null,
      driverAllowance: null,
  },
];

const Createpackage = ({ onClose }) => {
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
  const resetForm = () => {
  setSelectedState("");
  setSelectedPricingType("");
  setPackageName("");
  setPackageDescription("");
  setStep(1);
  setVehicles(defaultVehicles.map(v => ({ ...v })));
  setNights("");
};

  // Fetch states
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snapshot = await getDocs(collection(db, "transport"));
        const fetchedStates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStates(fetchedStates);
      } catch (error) {
        toast.error("Error fetching states");
      }
    };
    fetchStates();
  }, []);
  

  //use effect for reset form 
  useEffect(() => {
  resetForm();
}, []);
  // Update pricing options
  useEffect(() => {
    if (selectedState) {
      const stateData = states.find(
        (state) => state.stateName === selectedState,
      );
      if (stateData?.pricing) setPricingOptions(Object.keys(stateData.pricing));
      else setPricingOptions([]);
    }
  }, [selectedState, states]);

  const handleVehicleChange = (index, key, value) => {
    const updatedVehicles = [...vehicles]; // or [...formData.vehicles] for Edit component

    if (key === "price" || key === "seating" || key === "perKmprice" || key == "driverAllowance") {
      // Parse the value and ensure it's at least 0
      const numValue = parseInt(value);
      updatedVehicles[index][key] = isNaN(numValue)
        ? null
        : Math.max(0, numValue);
    } else {
      updatedVehicles[index][key] = value;
    }

    setVehicles(updatedVehicles); // or setFormData for Edit component
  };

  const addCustomVehicle = () => {
    setVehicles([
      ...vehicles,
      {
        type: "New Vehicle",
        price: null,
        seating: null,
        ac: true,
        perKmprice: null,
        driverAllowance: null,
      },
    ]);
    toast.success("New vehicle row added");
  };

  const removeVehicle = (index) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const stateDoc = states.find((s) => s.stateName === selectedState);
    if (
      !stateDoc ||
      !selectedPricingType ||
      (selectedPricingType === "lumpsum" && !packageName.trim())
    ) {
      toast.error("Missing required fields");
      return;
    }
   const hasInvalidValues = vehicles.some((v) => {
  //  Vehicle type empty
  if (!v.type || v.type.trim() === "") return true;

  //  Driver allowance missing or <= 0
  if (v.driverAllowance === null || v.driverAllowance <= 0) return true;

  //  Seating negative
  if (v.seating !== null && v.seating < 0) return true;

  //  Pricing validation
  if (selectedPricingType === "perKm") {
    if (v.perKmprice === null || v.perKmprice <= 0) return true;
  }

  if (selectedPricingType === "lumpsum") {
    if (v.price === null || v.price <= 0) return true;
  }

  return false;
});

if (hasInvalidValues) {
  toast.error(" Some fileds are empty, Fill it correctly .");
  return;
}

    setLoading(true);
    try {
      const stateDocRef = doc(db, "transport", stateDoc.id);
      const stateSnapshot = await getDoc(stateDocRef);
      const existingPackagesArray = stateSnapshot.data()?.packages || [];

      if (
        selectedPricingType === "lumpsum" &&
        existingPackagesArray.some((pkg) => pkg.name === packageName.trim())
      ) {
        toast.error("Package name already exists");
        setLoading(false);
        return;
      }

      const newPackage = {
        id: uuidv4(),
        pricingType: selectedPricingType,
        vehicles: vehicles,
        createdAt: new Date().toISOString(),
        ...(selectedPricingType === "lumpsum" && {
          name: packageName.trim(),
          description: packageDescription.trim(),
          nights: parseInt(nights),
          days: parseInt(nights) + 1,
        }),
      };

      await setDoc(
        doc(
          collection(db, "transport", stateDoc.id, "packages"),
          newPackage.id,
        ),
        newPackage,
      );
      await updateDoc(stateDocRef, {
        packages: [...existingPackagesArray, newPackage],
      });

      toast.success("Package created successfully!");
      onClose();
    } catch (error) {
      toast.error("Database error. Try again.");
    } finally {
      setLoading(false);
    }
  
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[92vh] overflow-hidden border-none shadow-2xl flex flex-col bg-white">
        {/* MODERN HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-theme-primary/10 flex items-center justify-center">
              <Plus className="text-theme-primary w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-dark">
                Create Package
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  className={step === 1 ? "bg-theme-primary" : "bg-slate-300"}
                >
                  1. Details
                </Badge>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <Badge
                  className={step === 2 ? "bg-theme-primary" : "bg-slate-300"}
                >
                  2. Pricing
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-theme-dark font-semibold">
                    Destination State
                  </Label>
                  <Select
                    value={selectedState}
                    onValueChange={setSelectedState}
                  >
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
                  <Label className="text-theme-dark font-semibold">
                    Pricing Structure
                  </Label>
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

              {selectedPricingType === "lumpsum" && (
                <div className="space-y-5 p-5 bg-theme-muted/30 rounded-xl border border-theme-primary/10">
                  <div className="space-y-2">
                    <Label className="text-theme-dark font-semibold">
                      Package Display Name
                    </Label>
                    <Input
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g. Kerala Backwater Special"
                      className="bg-white border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-theme-dark font-semibold">
                      Description
                    </Label>
                    <Textarea
                      value={packageDescription}
                      onChange={(e) => setPackageDescription(e.target.value)}
                      placeholder="Include tour highlights..."
                      className="bg-white border-slate-200 resize-none"
                    />
                  </div>
                  <div className="w-1/2 space-y-2">
                    <Label className="text-theme-dark font-semibold">
                      Duration (Nights)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={nights}
                        onChange={(e) => setNights(e.target.value)}
                        className="bg-white border-slate-200"
                      />
                      <span className="text-sm text-slate-500 whitespace-nowrap">
                        = {nights ? parseInt(nights) + 1 : "0"} Days
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!selectedPricingType && (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 italic text-sm">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  Select a state and pricing type to continue
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-bold text-theme-dark">
                    Vehicle List & Rates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Specify rates for each vehicle type in this package.
                  </p>
                </div>
                <Button
                  onClick={addCustomVehicle}
                  variant="outline"
                  size="sm"
                  className="border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Custom Row
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Vehicle Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold w-24">
                        Seats
                      </th>
                      <th className="px-4 py-3 text-center font-semibold w-20">
                        AC
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Rate (₹)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
  Driver Allowance (₹ / Day) </th>
                    
                      <th className="px-4 py-3 text-center font-semibold w-16"></th>
</tr>
                      
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicles.map((v, i) => (
                      <tr
                        key={i}
                        className="hover:bg-theme-muted/10 transition-colors group"
                      >
                        <td className="px-4 py-2">
                          <Input
                            value={v.type}
                            onChange={(e) =>
                              handleVehicleChange(i, "type", e.target.value)
                            }
                            className="h-9 bg-transparent border-transparent group-hover:border-slate-200 focus:border-theme-primary transition-all"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={v.seating ?? ""}
                            onChange={(e) =>
                              handleVehicleChange(i, "seating", e.target.value)
                            }
                            className="h-9"
                            disabled={[
                              "Innova 7 Seater",
                              "Crysta 7 Seater",
                            ].includes(v.type)}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={v.ac}
                            onChange={() => {
                              const up = [...vehicles];
                              up[i].ac = !up[i].ac;
                              setVehicles(up);
                            }}
                            className="w-4 h-4 accent-theme-primary cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            placeholder={
                              selectedPricingType === "lumpsum"
                                ? "Total price"
                                : "Per km"
                            }
                            value={
                              selectedPricingType === "lumpsum"
                                ? (v.price ?? "")
                                : (v.perKmprice ?? "")
                            }
                            onChange={(e) =>
                              handleVehicleChange(
                                i,
                                selectedPricingType === "lumpsum"
                                  ? "price"
                                  : "perKmprice",
                                e.target.value,
                              )
                            }
                            className="h-9 font-medium text-theme-primary"
                          />
                        </td>
                        <td className="px-4 py-2">
  <Input
    type="number"
    placeholder="Per day"
    value={v.driverAllowance ?? ""}
    onChange={(e) =>
      handleVehicleChange(i, "driverAllowance", e.target.value)
    }
    className="h-9 font-medium text-theme-primary"
  />
</td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => removeVehicle(i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="text-slate-600"
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </>
            )}
          </Button>

          {step === 1 ? (
            <Button
              disabled={!selectedPricingType}
              onClick={() => setStep(2)}
              className="bg-theme-primary hover:bg-theme-secondary text-white px-8"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              disabled={loading}
              onClick={handleSubmit}
              className="bg-theme-primary hover:bg-theme-secondary text-white px-8 shadow-lg shadow-theme-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Create Package
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Createpackage;
