"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

// import Createpackage from "./transportscreen/Createpackage";
// import EditPackage from "./transportscreen/EditPackage";

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// icons
import { Plus, Pencil, MapPin } from "lucide-react";
import Createpackage from "@/components/transports/CreatePackage";
import EditPackage from "@/components/transports/EditPackage";

const Transport = () => {
  const [showModal, setShowModal] = useState(false);
  const [packagesByState, setPackagesByState] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noResultsFound, setNoResultsFound] = useState(false);

  const fetchTransportData = async () => {
    setLoading(true);
    try {
      const transportSnapshot = await getDocs(collection(db, "transport"));
      const stateData = transportSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          stateName: doc.data().stateName,
          packages: doc.data().packages || [],
        }))
        .filter((s) => s.packages.length > 0);

      setPackagesByState(stateData);
    } catch (err) {
      console.error("Error fetching:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, [showModal]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const matches = packagesByState.some(
      (state) =>
        state.stateName.toLowerCase().includes(term) ||
        state.packages.some((p) => p.name?.toLowerCase().includes(term))
    );
    setNoResultsFound(!matches);
  };

  return (
    <div className="min-h-screen bg-theme-muted/40 px-4 md:px-10 py-8">
      {/* --- HEADER --- */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-theme-dark">
          Adwait Tours - Transport Management
        </h1>
        <p className="text-theme-dark/60 text-sm mt-1">
          Manage travel packages, pricing & vehicles across India.
        </p>
      </div>

      {/* --- ACTIONBAR --- */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-6">
        <Button
          className="bg-theme-primary hover:bg-theme-secondary"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Create New Package
        </Button>

        <Input
          type="text"
          className="max-w-sm bg-white"
          placeholder="Search packages or states..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      {/* --- LOADER --- */}
      {loading ? (
        <div className="flex flex-col items-center py-20 text-theme-dark">
          <div className="animate-spin border-4 border-theme-primary/40 border-t-theme-primary rounded-full w-10 h-10"></div>
          <p className="mt-3 text-sm">Loading transport packages...</p>
        </div>
      ) : (
        <>
          {noResultsFound ? (
            <p className="text-center text-theme-dark/60 mt-10">
              No results found for <strong>"{searchTerm}"</strong>
            </p>
          ) : (
            packagesByState.map((state) => {
              const stateMatches = state.stateName
                .toLowerCase()
                .includes(searchTerm);
              const filteredPackages = state.packages.filter((pkg) =>
                pkg.name?.toLowerCase().includes(searchTerm)
              );

              if (!stateMatches && filteredPackages.length === 0) return null;
              const listToShow = stateMatches
                ? state.packages
                : filteredPackages;

              return (
                <div key={state.id} className="mb-10">
                  <h2 className="flex items-center gap-2 mb-3 text-xl font-semibold text-theme-dark">
                    <MapPin className="w-5 h-5 text-theme-primary" />
                    {state.stateName}
                  </h2>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {listToShow.map((pkg, idx) => (
                      <Card
                        key={idx}
                        className="border border-theme-primary/20 shadow-sm hover:shadow-md transition bg-white"
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-theme-dark text-lg">
                            {pkg.pricingType !== "perKm" && pkg.name}
                          </CardTitle>
                          <p className="text-sm text-theme-dark/60">
                            {pkg.description || "No description"} | Pricing:{" "}
                            {pkg.pricingType}
                          </p>
                        </CardHeader>

                        <CardContent className="space-y-2">
                          {pkg.vehicles.map((v, vIdx) => (
                            <div
                              key={vIdx}
                              className="text-sm border-b pb-1 last:border-none"
                            >
                              <strong>{v.type}</strong> — ₹
                              {pkg.pricingType === "lumpsum"
                                ? v.price ?? "N/A"
                                : v.perKmprice ?? "N/A"}
                              {pkg.pricingType === "perKm" && " /km"},{" "}
                              {v.seating} Seater, {v.ac ? "AC" : "Non-AC"}
                            </div>
                          ))}

                          <Button
                            variant="outline"
                            className="w-full border-theme-primary text-theme-primary hover:bg-theme-muted"
                            onClick={() =>
                              setEditingData({ pkg, stateId: state.id })
                            }
                          >
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* --- MODALS PRESERVED --- */}
      {showModal && <Createpackage onClose={() => setShowModal(false)} />}

      {editingData && (
        <EditPackage
          stateId={editingData.stateId}
          originalPackage={editingData.pkg}
          packageId={editingData.pkg.id}
          pricingType={editingData.pkg.pricingType}
          onClose={() => setEditingData(null)}
          onSuccess={fetchTransportData}
        />
      )}
    </div>
  );
};

export default Transport;
