"use client";
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import toast from "react-hot-toast";

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus, 
  Pencil, 
  MapPin, 
  Car, 
  Users, 
  Snowflake, 
  FlameKindling, 
  Loader2 
} from "lucide-react";

import Createpackage from "@/components/transports/CreatePackage";
import EditPackage from "@/components/transports/EditPackage";

const Transport = () => {
  const [showModal, setShowModal] = useState(false);
  const [packagesByState, setPackagesByState] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      toast.error("Failed to load transport data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, [showModal]);

  const filteredData = packagesByState.map(state => {
    const isStateMatch = state.stateName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchedPackages = state.packages.filter(pkg => 
      pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isStateMatch) return state; 
    if (matchedPackages.length > 0) return { ...state, packages: matchedPackages };
    return null;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* --- STICKY HEADER --- */}
      <div className=" z-10 bg-white/80 backdrop-blur-md border-b border-theme-muted mb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-theme-dark tracking-tight">
                Transport Management
              </h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Fleet & Package Overview
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9 bg-white border-slate-200 focus-visible:ring-theme-primary"
                  placeholder="Search regions or cars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20 transition-all active:scale-95"
                onClick={() => setShowModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Create
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-theme-dark/50">
            <Loader2 className="w-10 h-10 animate-spin text-theme-primary mb-4" />
            <p className="font-medium">Syncing database...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-theme-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-theme-primary w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-theme-dark">No packages found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredData.map((state) => (
            <section key={state.id} className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-theme-primary text-white">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-theme-dark uppercase tracking-wide">
                  {state.stateName}
                </h2>
                <Badge variant="secondary" className="bg-theme-muted text-theme-dark border-none">
                  {state.packages.length} Packages
                </Badge>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.packages.map((pkg, idx) => (
                  <Card key={idx} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 ring-1 ring-slate-200">
                    <div className="h-2 bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to" />
                    <CardHeader className="space-y-1">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="capitalize text-[10px] font-bold border-theme-primary/30 text-theme-primary">
                          {pkg.pricingType}
                        </Badge>
                      </div>
                      <CardTitle className="text-theme-dark group-hover:text-theme-primary transition-colors">
                        {pkg.pricingType === "perKm" ? "Standard Fleet Rates" : pkg.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {pkg.description || "Comprehensive travel solution with premium vehicle options."}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {pkg.vehicles.map((v, vIdx) => (
                          <div key={vIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-theme-muted/50 transition-colors border border-transparent hover:border-theme-muted">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-white rounded border border-slate-100 shadow-sm">
                                <Car className="w-3.5 h-3.5 text-theme-dark" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-700">{v.type}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] flex items-center text-slate-500">
                                    <Users className="w-3 h-3 mr-1" /> {v.seating}
                                  </span>
                                  <span className="text-[10px] flex items-center text-slate-500">
                                    {v.ac ? (
                                      <Snowflake className="w-3 h-3 mr-1 text-blue-400" />
                                    ) : (
                                      <FlameKindling className="w-3 h-3 mr-1 text-orange-400" />
                                    )}
                                    {v.ac ? "AC" : "Non-AC"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-theme-primary">
                                ₹{pkg.pricingType === "lumpsum" ? v.price : v.perKmprice}
                                {pkg.pricingType === "perKm" && <span className="text-[10px] font-normal text-slate-400">/km</span>}
                              </p>
                          {pkg.pricingType === "perKm" && v.driverAllowance > 0 && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Driver: ₹{v.driverAllowance}
                              </p>
                            )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full bg-slate-50 text-theme-dark hover:bg-theme-primary hover:text-white group"
                        onClick={() => setEditingData({ pkg, stateId: state.id })}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-2 opacity-50 group-hover:opacity-100" />
                        Modify Package
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* --- MODALS --- */}
      {showModal && <Createpackage onClose={() => setShowModal(false)} />}

      {editingData && (
        <EditPackage
          stateId={editingData.stateId}
          originalPackage={editingData.pkg}
          packageId={editingData.pkg.id}
          pricingType={editingData.pkg.pricingType}
          onClose={() => setEditingData(null)}
          onSuccess={() => {
            fetchTransportData();
            toast.success("Package updated successfully");
          }}
        />
      )}
    </div>
  );
};

export default Transport;