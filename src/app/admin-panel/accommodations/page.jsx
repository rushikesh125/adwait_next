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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Star, ArrowUpDown, Building, MoreHorizontal, Globe } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const Accommodation = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

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
      toast.error("Failed to sync inventory");
    } finally {
      setLoading(false);
    }
  };

  const uniqueStates = useMemo(() => {
    const states = new Set(hotels.map(h => h.state).filter(Boolean));
    return Array.from(states).sort();
  }, [hotels]);

  // Updated Filter Logic: Search checks Name, City, and State
  const processedHotels = useMemo(() => {
    return hotels
      .filter(h => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          (h.name || "").toLowerCase().includes(query) ||
          (h.city || "").toLowerCase().includes(query) ||
          (h.state || "").toLowerCase().includes(query);
          
        const matchesStateDropdown = stateFilter === "all" || h.state === stateFilter;
        
        return matchesSearch && matchesStateDropdown;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "location") return `${a.state}${a.city}`.localeCompare(`${b.state}${b.city}`);
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [hotels, searchQuery, stateFilter, sortBy]);

  const toTitleCase = (str) => (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <Toaster />

      {/* Modern Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Accommodations</h1>
          <p className="text-slate-500 font-medium">Manage property details, ratings, and room inventory.</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20 h-11 px-6"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Property
        </Button>
      </div>

      {/* Advanced Filter Toolbar */}
      <Card className="p-2 border-slate-200 bg-white/50 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by hotel, city, or state..." 
              className="pl-10 bg-white border-slate-200 focus-visible:ring-theme-primary h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[160px] bg-white h-11 border-slate-200">
                <Globe className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueStates.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] bg-white h-11 border-slate-200">
                <ArrowUpDown className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Alphabetical</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="location">By Location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="shadow-xl shadow-slate-200/50 overflow-hidden border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent uppercase tracking-wider">
              <TableHead className="w-[45%] text-[11px] font-bold text-slate-500 py-4">Property Information</TableHead>
              <TableHead className="text-[11px] font-bold text-slate-500">Categories</TableHead>
              <TableHead className="text-center text-[11px] font-bold text-slate-500">Quality Score</TableHead>
              <TableHead className="text-right text-[11px] font-bold text-slate-500 pr-6">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={4} className="p-4"><Skeleton className="h-14 w-full rounded-lg" /></TableCell></TableRow>
              ))
            ) : processedHotels.length > 0 ? (
              processedHotels.map((hotel, index) => {
                const showLocationHeader = sortBy === "location" && 
                  (index === 0 || hotel.city !== processedHotels[index-1].city);

                return (
                  <React.Fragment key={hotel.id}>
                    {showLocationHeader && (
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-y border-slate-100">
                        <TableCell colSpan={4} className="py-2.5 px-6">
                           <div className="flex items-center gap-2 text-theme-primary font-bold text-xs uppercase tracking-widest">
                            <MapPin className="h-3.5 w-3.5" />
                            {hotel.city}, {hotel.state}
                           </div>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="group border-b border-slate-50 hover:bg-theme-muted/10 transition-all cursor-pointer" onClick={() => { setSelectedHotel(hotel); setIsEditModalOpen(true); }}>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-theme-primary/10 group-hover:text-theme-primary transition-colors border border-slate-200/50">
                            <Building className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900 text-base">
                              {toTitleCase(hotel.name)}
                            </span>
                            <div className="flex items-center text-slate-500 text-xs font-medium">
                              <MapPin className="h-3 w-3 mr-1" />
                              {hotel.city}, {hotel.state}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {hotel.rooms?.slice(0, 2).map((r, i) => (
                            <Badge key={i} variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] py-0.5 px-2 rounded-md font-semibold">
                              {r.categoryName}
                            </Badge>
                          ))}
                          {hotel.rooms?.length > 2 && (
                            <Badge variant="ghost" className="text-[10px] text-slate-400 font-bold">+ {hotel.rooms.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span className="text-sm font-black">{hotel.rating || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-all bg-white border border-slate-200 text-slate-600 hover:text-theme-primary h-8"
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-4 bg-slate-50 rounded-full">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No results found for "{searchQuery}"</p>
                    <Button variant="link" onClick={() => {setSearchQuery(""); setStateFilter("all");}} className="text-theme-primary font-bold">Clear all filters</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modals remain the same... */}
      {showAddModal && <AddHotel onClose={() => { setShowAddModal(false); fetchHotels(); }} />}
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