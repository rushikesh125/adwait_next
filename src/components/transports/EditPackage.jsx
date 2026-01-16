import React, { useState, useEffect } from "react";
import { doc, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/config";

const EditPackage = ({
  stateId,
  originalPackage,
  onClose,
  onSuccess,
  packageId, // this should be the document ID (slug)
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vehicles: [],
    pricingType: "",
  });

  useEffect(() => {
    if (originalPackage) {
      setFormData(originalPackage);
    } else {
      // fallback: fetch it using packageId
      const fetchPackage = async () => {
        const packageRef = doc(db, "transport", stateId, "packages", packageId);
        const snapshot = await getDoc(packageRef);
        if (snapshot.exists()) {
          setFormData(snapshot.data());
        } else {
          alert("Package not found.");
          onClose();
        }
      };
      fetchPackage();
    }
  }, [originalPackage, stateId, packageId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVehicleChange = (index, field, value) => {
    const updatedVehicles = [...formData.vehicles];

    // Auto-clear the other field
    if (field === "price") {
      delete updatedVehicles[index].perKmprice;
    } else if (field === "perKmprice") {
      delete updatedVehicles[index].price;
    }

    updatedVehicles[index][field] = value;
    setFormData({ ...formData, vehicles: updatedVehicles });
  };

  // EditPackage.js - Updated handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const stateRef = doc(db, "transport", stateId);
      const stateSnapshot = await getDoc(stateRef);
      const stateData = stateSnapshot.data();

      if (!stateData || !stateData.packages) {
        alert("Packages not found for this state.");
        return;
      }

      const updatedPackages = stateData.packages.map((pkg) =>
        pkg.id === packageId ? { ...pkg, ...formData } : pkg
      );

      await updateDoc(stateRef, {
        packages: updatedPackages,
      });

      alert("Package updated!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating package:", error);
      alert("Failed to update.");
    }
  };

  // EditPackage.js - Updated handleDeletePackage
  const handleDeletePackage = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this package?"
    );
    if (!confirmed) return;

    try {
      const stateRef = doc(db, "transport", stateId);
      const stateSnapshot = await getDoc(stateRef);
      const stateData = stateSnapshot.data();

      if (!stateData || !stateData.packages) {
        alert("Packages not found for this state.");
        return;
      }

      const updatedPackages = stateData.packages.filter(
        (pkg) => pkg.id !== packageId
      );

      await updateDoc(stateRef, {
        packages: updatedPackages,
      });

      alert("Package deleted successfully!");
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error deleting package:", error);
      alert("Failed to delete package.");
    }
  };

 return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg border border-theme-primary/20 max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-theme-muted/40">
        <h2 className="text-xl font-semibold text-theme-dark">Edit Package</h2>
        <button
          onClick={onClose}
          className="text-theme-primary hover:text-theme-secondary text-lg font-semibold"
        >
          ✖
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Lumpsum Only Fields */}
        {formData.pricingType !== "perKm" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                Package Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                placeholder="Enter package name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                placeholder="Enter description"
                required
              />
            </div>
          </div>
        )}

        {/* Vehicle Table */}
        <div>
          <h3 className="text-theme-dark font-semibold mb-3">
            Vehicles & Pricing
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border border-theme-primary/20 rounded-md overflow-hidden text-sm">
              <thead className="bg-theme-primary text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">
                    {formData.pricingType === "lumpsum"
                      ? "Fixed Price (₹)"
                      : "Price Per Km (₹)"}
                  </th>
                  <th className="px-3 py-2 text-left">Seating</th>
                  <th className="px-3 py-2 text-center">AC</th>
                </tr>
              </thead>

              <tbody>
                {formData.vehicles.map((vehicle, idx) => (
                  <tr key={idx} className="border-b last:border-none bg-white">
                    {/* Vehicle Type */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1"
                        value={vehicle.type}
                        onChange={(e) =>
                          handleVehicleChange(idx, "type", e.target.value)
                        }
                      />
                    </td>

                    {/* Price / Per Km Price */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-full border rounded px-2 py-1"
                        placeholder={
                          formData.pricingType === "lumpsum"
                            ? "Price"
                            : "Per km price"
                        }
                        value={
                          formData.pricingType === "lumpsum"
                            ? vehicle.price || ""
                            : vehicle.perKmprice || ""
                        }
                        onChange={(e) =>
                          handleVehicleChange(
                            idx,
                            formData.pricingType === "lumpsum"
                              ? "price"
                              : "perKmprice",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    {/* Seating */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-full border rounded px-2 py-1"
                        value={vehicle.seating || ""}
                        onChange={(e) =>
                          handleVehicleChange(
                            idx,
                            "seating",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    {/* AC Toggle */}
                    <td className="px-3 py-2 text-center">
                      <select
                        value={vehicle.ac}
                        onChange={(e) =>
                          handleVehicleChange(
                            idx,
                            "ac",
                            e.target.value === "true"
                          )
                        }
                        className="border rounded px-2 py-1"
                      >
                        <option value="true">AC</option>
                        <option value="false">Non-AC</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-theme-dark"
          >
            ❌ Cancel
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDeletePackage}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              🗑 Delete
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded bg-theme-primary hover:bg-theme-secondary text-white"
            >
              💾 Save
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);
};

export default EditPackage;
