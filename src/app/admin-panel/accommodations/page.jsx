"use client";

import React, { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import AddHotel from "@/components/accommodation/AddHotel";
import EditHotel from "@/components/accommodation/EditHotel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { Plus, MapPin, Search, Edit, Star, Hotel, Building2, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const Accommodation = () => {
  const [hotels, setHotels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "hotels"));

      const hotelList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          rooms: data.rooms || [],
        };
      });

      const uniqueHotelsMap = new Map();
      hotelList.forEach((hotel) => {
        const key = `${(hotel.name || "").toLowerCase()}-${(hotel.state || "").toLowerCase()}-${(hotel.city || "").toLowerCase()}`;
        if (!uniqueHotelsMap.has(key)) {
          uniqueHotelsMap.set(key, hotel);
        }
      });

      setHotels(Array.from(uniqueHotelsMap.values()));
    } catch (error) {
      console.error("Error fetching hotels:", error);
      toast.error("Failed to load hotels");
    } finally {
      setLoading(false);
    }
  };

  const filteredHotels = hotels.filter((hotel) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (hotel.name || "").toLowerCase().includes(q) ||
      (hotel.city || "").toLowerCase().includes(q) ||
      (hotel.state || "").toLowerCase().includes(q)
    );
  });

  const groupedHotels = filteredHotels.reduce((acc, hotel) => {
    const key = `${hotel.state || "Unknown"}-${hotel.city || "Unknown"}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(hotel);
    return acc;
  }, {});

  const handleEditHotel = (hotel) => {
    setSelectedHotel(hotel);
    setIsEditModalOpen(true);
  };

  const handleSaveHotel = async (updatedHotel) => {
    try {
      await updateDoc(doc(db, "hotels", updatedHotel.id), updatedHotel);
      toast.success("Hotel updated successfully");
      fetchHotels();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update hotel");
    }
  };

  const handleDeleteHotel = async (hotelId) => {
    if (!window.confirm("Are you sure you want to delete this hotel?")) return;

    try {
      await deleteDoc(doc(db, "hotels", hotelId));
      toast.success("Hotel removed from inventory");
      fetchHotels();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete hotel");
    }
  };

  // Helper for Title Case
  const toTitleCase = (str) => {
    return (str || "Unnamed").toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <Toaster position="top-right" />

      {/* Hero Header Section */}
      <div className="bg-white border-b mb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <Badge variant="outline" className="text-theme-primary border-theme-primary/30 bg-theme-muted/50 px-3 py-1">
                Inventory Dashboard
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                Accommodation <span className="text-theme-primary">Management</span>
              </h1>
              <p className="text-slate-500 max-w-md">
                Easily organize properties, monitor room categories, and maintain quality ratings across your global locations.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search properties..."
                  className="pl-9 bg-slate-50 border-slate-200 focus:ring-theme-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => setShowAddHotelModal(true)}
                className="w-full sm:w-auto bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20 transition-all active:scale-95"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Property
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        {loading ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
            ))}
          </div>
        ) : Object.keys(groupedHotels).length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent py-20 text-center">
            <CardContent className="flex flex-col items-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Hotel className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">No properties found</h3>
              <p className="text-slate-500 mt-2">Try adjusting your filters or add a new listing.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedHotels).map(([locationKey, hotelsInGroup]) => {
            const [state, city] = locationKey.split("-");
            return (
              <section key={locationKey} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="p-2 rounded-lg bg-theme-primary text-white shadow-md shadow-theme-primary/30">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">{city}</h2>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{state}</p>
                  </div>
                  <div className="flex-1 border-b border-slate-200 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Card className="border-none shadow-sm overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b-slate-100">
                          <TableHead className="font-semibold text-slate-700">Property Details</TableHead>
                          <TableHead className="font-semibold text-slate-700">Room Availability</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-center">Standard</TableHead>
                          <TableHead className="text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hotelsInGroup.map((hotel) => (
                          <TableRow
                            key={hotel.id}
                            className="group cursor-pointer hover:bg-theme-muted/30 transition-all border-b-slate-50"
                            onClick={() => handleEditHotel(hotel)}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 group-hover:text-theme-dark transition-colors">
                                  {toTitleCase(hotel.name)}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center mt-1">
                                  <Building2 className="h-3 w-3 mr-1" /> ID: {hotel.id.slice(0, 8)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {hotel.rooms?.length ? (
                                  hotel.rooms.slice(0, 3).map((r, i) => (
                                    <Badge key={i} variant="secondary" className="bg-white border-slate-200 text-slate-600 font-normal">
                                      {r.categoryName}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-sm italic">No rooms configured</span>
                                )}
                                {hotel.rooms?.length > 3 && (
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-500">
                                    +{hotel.rooms.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center justify-center">
                                <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                  <span className="text-sm font-bold text-amber-700">{hotel.rating ?? "N/A"}</span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-theme-primary hover:text-theme-secondary hover:bg-theme-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditHotel(hotel);
                                }}
                              >
                                <span className="mr-2 hidden sm:inline text-xs font-semibold uppercase">Manage</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Modals */}
      {showAddHotelModal && (
        <AddHotel
          onClose={() => {
            setShowAddHotelModal(false);
            fetchHotels();
          }}
          hotelToEdit={null}
        />
      )}

      {isEditModalOpen && selectedHotel && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />
          <EditHotel
            hotel={selectedHotel}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveHotel}
            onDelete={handleDeleteHotel}
          />
        </>
      )}
    </div>
  );
};

export default Accommodation;