"use client";
import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import toast from "react-hot-toast";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Icons
import { 
  Trash2, 
  Save, 
  Car, 
  Settings2, 
  Info,
  Loader2,
  Plus
} from "lucide-react";

const EditPackage = ({
  stateId,
  originalPackage,
  onClose,
  onSuccess,
  packageId,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vehicles: [],
    pricingType: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (originalPackage) {
      setFormData(originalPackage);
    } else {
      const fetchPackage = async () => {
        try {
          const stateRef = doc(db, "transport", stateId);
          const snapshot = await getDoc(stateRef);
          if (snapshot.exists()) {
            const data = snapshot.data();
            const pkg = data.packages.find(p => p.id === packageId);
            if (pkg) setFormData(pkg);
            else throw new Error("Package not found");
          }
        } catch (err) {
          toast.error("Package not found");
          onClose();
        }
      };
      fetchPackage();
    }
  }, [originalPackage, stateId, packageId, onClose]);

 const handleVehicleChange = (index, key, value) => {
    // Correctly access vehicles from formData
    const updatedVehicles = [...formData.vehicles];
    
    if (key === 'price' || key === 'seating' || key === 'perKmprice') {
      // Convert to number and ensure it's at least 0
      // We use value === "" check to allow users to clear the input
      const numValue = value === "" ? 0 : parseInt(value);
      updatedVehicles[index][key] = Math.max(0, numValue || 0);
    } else {
      updatedVehicles[index][key] = value;
    }
    
    // Correctly update the formData state
    setFormData({ ...formData, vehicles: updatedVehicles });
  };

  const addVehicleRow = () => {
    const newVehicle = {
      type: "New Vehicle",
      seating: 4,
      ac: true,
      ...(formData.pricingType === "lumpsum" ? { price: 0 } : { perKmprice: 0 })
    };
    setFormData({ ...formData, vehicles: [...formData.vehicles, newVehicle] });
    toast.success("New vehicle row added");
  };

  const deleteVehicleRow = (index) => {
    const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData({ ...formData, vehicles: updatedVehicles });
    toast.success("Vehicle removed from list");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.vehicles.length === 0) {
      toast.error("Please add at least one vehicle");
      return;
    }
    const hasNegativeValues = formData.vehicles.some(v => 
        (v.price !== null && v.price < 0) || 
        (v.perKmprice !== null && v.perKmprice < 0) || 
        (v.seating !== null && v.seating < 0)
    );

    if (hasNegativeValues) {
        toast.error("Pricing and seating values cannot be negative.");
        return;
    }

    setIsSubmitting(true);
    try {
      const stateRef = doc(db, "transport", stateId);
      const stateSnapshot = await getDoc(stateRef);
      const stateData = stateSnapshot.data();

      if (!stateData?.packages) {
        toast.error("Data out of sync. Please refresh.");
        return;
      }

      const updatedPackages = stateData.packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, ...formData } : pkg
      );

      await updateDoc(stateRef, { packages: updatedPackages });
      toast.success("Package updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update package");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!window.confirm("Are you sure? This action will delete the entire package.")) return;
    
    setIsSubmitting(true);
    try {
      const stateRef = doc(db, "transport", stateId);
      const stateSnapshot = await getDoc(stateRef);
      const stateData = stateSnapshot.data();

      const updatedPackages = stateData.packages.filter((pkg) => pkg.id !== packageId);

      await updateDoc(stateRef, { packages: updatedPackages });
      toast.success("Package removed from database");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl md:max-w-7xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl bg-white">
        <DialogHeader className="p-6 bg-theme-muted/30 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-primary rounded-lg text-white">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl text-theme-dark">Edit Transport Package</DialogTitle>
              <p className="text-xs text-slate-500 mt-1">Manage pricing and vehicle availability.</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Section 1: Basic Info */}
          {formData.pricingType !== "perKm" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
              <div className="space-y-2">
                <Label className="text-theme-dark font-semibold">Package Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Manali Sightseeing"
                  className="focus-visible:ring-theme-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-theme-dark font-semibold">Short Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's included?"
                  className="focus-visible:ring-theme-primary resize-none"
                  rows={1}
                  required
                />
              </div>
            </div>
          )}

          {/* Section 2: Vehicles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-theme-primary" />
                <h3 className="font-bold text-theme-dark uppercase text-xs tracking-wider">Fleet Configuration</h3>
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
                      {formData.pricingType === "lumpsum" ? "Rate (₹)" : "Rate/Km (₹)"}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 w-24">Seats</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Climate</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.vehicles.map((vehicle, idx) => (
                    <tr key={idx} className="hover:bg-theme-muted/10 transition-colors group">
                      <td className="px-4 py-2">
                        <Input
                          value={vehicle.type}
                          onChange={(e) => handleVehicleChange(idx, "type", e.target.value)}
                          className="h-9 border-slate-200 bg-transparent"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={formData.pricingType === "lumpsum" ? vehicle.price ?? "" : vehicle.perKmprice ?? ""}
                          onChange={(e) => handleVehicleChange(idx, formData.pricingType === "lumpsum" ? "price" : "perKmprice", e.target.value)}
                          className="h-9 border-slate-200 font-medium text-theme-primary"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={vehicle.seating ?? ""}
                          onChange={(e) => handleVehicleChange(idx, "seating", e.target.value)}
                          className="h-9 border-slate-200"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={String(vehicle.ac)}
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
              {formData.vehicles.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No vehicles listed. Click "Add Vehicle" to begin.
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-100" />

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between items-center bg-slate-50/50 p-6 -m-6 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDeletePackage}
              disabled={isSubmitting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Entire Package
            </Button>

            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-slate-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-theme-primary hover:bg-theme-secondary text-white min-w-[140px] shadow-lg shadow-theme-primary/20"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Update Package</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPackage;