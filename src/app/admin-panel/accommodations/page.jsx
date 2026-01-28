"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Star, Filter, ArrowUpDown, Building, MoreHorizontal } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const Accommodation = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "hotels"));
      setHotels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Failed to sync with inventory");
    } finally {
      setLoading(false);
    }
  };

  // 1. Get Unique States for Filter Dropdown
  const uniqueStates = useMemo(() => {
    const states = new Set(hotels.map(h => h.state).filter(Boolean));
    return Array.from(states).sort();
  }, [hotels]);

  // 2. Filter and Sort Logic
  const processedHotels = useMemo(() => {
    return hotels
      .filter(h => {
        const matchesSearch = (h.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesState = stateFilter === "all" || h.state === stateFilter;
        return matchesSearch && matchesState;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "location") return `${a.state}${a.city}`.localeCompare(`${b.state}${b.city}`);
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [hotels, searchQuery, stateFilter, sortBy]);

  const toTitleCase = (str) => (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-1 md:p-6 space-y-6">
      <Toaster />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accommodation Library</h1>
          <p className="text-slate-500 text-sm">Manage {hotels.length} properties across {uniqueStates.length} regions.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-theme-primary hover:bg-theme-secondary text-white px-6"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Property
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search property name..." 
            className="pl-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {uniqueStates.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] bg-white">
            <ArrowUpDown className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="location">By Location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table Section */}
      <Card className="shadow-sm overflow-hidden border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[400px]">Property & Location</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead className="text-center">Rating</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
              ))
            ) : processedHotels.length > 0 ? (
              processedHotels.map((hotel, index) => {
                // Show location header only if it's different from the previous hotel when sorted by location
                const showLocationHeader = sortBy === "location" && 
                  (index === 0 || hotel.city !== processedHotels[index-1].city);

                return (
                  <React.Fragment key={hotel.id}>
                    {showLocationHeader && (
                      <TableRow className="bg-slate-100/50 hover:bg-slate-100/50 border-y border-slate-200">
                        <TableCell colSpan={4} className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <MapPin className="h-3 w-3" /> {hotel.city}, {hotel.state}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="group transition-colors hover:bg-slate-50/80">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-theme-muted flex items-center justify-center text-theme-primary">
                            <Building className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 leading-none mb-1">
                              {toTitleCase(hotel.name)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {hotel.city}, {hotel.state}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hotel.rooms?.slice(0, 2).map((r, i) => (
                            <Badge key={i} variant="secondary" className="bg-white border text-[10px] font-medium">
                              {r.categoryName}
                            </Badge>
                          ))}
                          {hotel.rooms?.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-medium">+{hotel.rooms.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold">{hotel.rating || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:text-theme-primary transition-colors"
                          onClick={() => { setSelectedHotel(hotel); setIsEditModalOpen(true); }}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                  No properties match your current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modals remain the same... */}
      {showAddModal && (
        <AddHotel onClose={() => { setShowAddModal(false); fetchHotels(); }} />
      )}
      {isEditModalOpen && selectedHotel && (
        <EditHotel 
          hotel={selectedHotel} 
          onClose={() => setIsEditModalOpen(false)} 
          onSave={() => { fetchHotels(); setIsEditModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default Accommodation;