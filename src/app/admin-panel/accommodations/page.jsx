"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/firebase/config";
// import HotelDetailModal from "@/components/accommodation/HotelDetailModal";
import HotelDetailModal from "@/components/accommodation/HotelDetailModel";

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
import {
  Search,
  Plus,
  MapPin,
  Star,
  ArrowUpDown,
  Building,
  Globe,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { pageLengthsForPagination } from "@/lib/pagination_size";

const Accommodation = () => {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(50);
  // ── All hotels (fetched once, for search + pagination) ──────────────────
  const [allHotels, setAllHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Search & filter state ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Detail modal ─────────────────────────────────────────────────────────
  const [selectedHotel, setSelectedHotel] = useState(null);

  // ── Fetch all hotels once ────────────────────────────────────────────────
  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "hotels"));
      setAllHotels(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error("Failed to load accommodations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // ── Derived state ────────────────────────────────────────────────────────
  const uniqueStates = useMemo(() => {
    return Array.from(
      new Set(allHotels.map((h) => h.state).filter(Boolean)),
    ).sort();
  }, [allHotels]);

  // Filtered + sorted list (for search & filters — works across all pages)
  const filteredHotels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allHotels
      .filter((h) => {
        const matchesSearch =
          !q ||
          (h.name || "").toLowerCase().includes(q) ||
          (h.city || "").toLowerCase().includes(q) ||
          (h.state || "").toLowerCase().includes(q);
        const matchesState = stateFilter === "all" || h.state === stateFilter;
        return matchesSearch && matchesState;
      })
      .sort((a, b) => {
        if (sortBy === "rating") {
          const rA = parseFloat(a.GoogleReviewRating || a.rating || 0);
          const rB = parseFloat(b.GoogleReviewRating || b.rating || 0);
          return rB - rA;
        }
        if (sortBy === "location")
          return `${a.state}${a.city}`.localeCompare(`${b.state}${b.city}`);
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [allHotels, searchQuery, stateFilter, sortBy]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stateFilter, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredHotels.length / pageSize));

  const pagedHotels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHotels.slice(start, start + pageSize);
  }, [filteredHotels, currentPage, pageSize]);

  const toTitleCase = (str) =>
    (str || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const handleEditClick = (e, hotelId) => {
    e.stopPropagation();
    router.push(`./accommodations/create?id=${hotelId}`);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <Toaster />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Accommodations
          </h1>
          <p className="text-slate-500 font-medium">
            Manage property details, ratings, and room inventory.
          </p>
        </div>
        <Button
          onClick={() => router.push("./accommodations/create")}
          className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20 h-11 px-6"
        >
          <Plus className="mr-2 h-5 w-5" /> Add Property
        </Button>
      </div>

      {/* Filter Toolbar */}
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
                {uniqueStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
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

      {/* Table */}
      <Card className="shadow-xl shadow-slate-200/50 overflow-hidden border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent uppercase tracking-wider">
              <TableHead className="w-[30%] text-[14px] font-bold text-slate-900 py-4">
                Property Name
              </TableHead>
              <TableHead className=" text-[14px] font-bold text-slate-900 py-4">
                City
              </TableHead>
              <TableHead className="text-[14px] font-bold text-slate-900 py-4">
                State
              </TableHead>
              <TableHead className=" text-[14px] font-bold text-slate-900 py-4">
                Google Rating
              </TableHead>
              <TableHead className="text-[14px] font-bold text-slate-900">
                Room Categories
              </TableHead>
              <TableHead className="text-center text-[14px] font-bold text-slate-900">
                Hotel Category
              </TableHead>
              <TableHead className="text-right text-[14px] font-bold text-slate-900 pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(pageSize)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4} className="p-4">
                    <Skeleton className="h-14 w-full rounded-lg" />
                  </TableCell>
                </TableRow>
              ))
            ) : pagedHotels.length > 0 ? (
              pagedHotels.map((hotel, index) => {
                const showLocationHeader =
                  sortBy === "location" &&
                  (index === 0 || hotel.city !== pagedHotels[index - 1].city);

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
                    <TableRow
                      className="group border-b border-slate-50 hover:bg-theme-muted/10 transition-all cursor-pointer"
                      onClick={() => setSelectedHotel(hotel)}
                    >
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-theme-primary/10 group-hover:text-theme-primary transition-colors border border-slate-200/50 shrink-0">
                            <Building className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-bold text-slate-900 text-base truncate">
                              {toTitleCase(hotel.name)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-2">
                        <div className="flex items-left ">
                          <div className="">{hotel.city}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-2">
                        <div className="flex items-left">
                          <div className="">{hotel.state}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-2">
                        <div className="flex items-left">
                          <div className="">{hotel.GoogleReviewRating}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {hotel.rooms?.slice(0, 2).map((r, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] py-0.5 px-2 rounded-md font-semibold"
                            >
                              {r.categoryName}
                            </Badge>
                          ))}
                          {hotel.rooms?.length > 2 && (
                            <Badge
                              variant="ghost"
                              className="text-[10px] text-slate-400 font-bold"
                            >
                              +{hotel.rooms.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/50 shadow-sm">
                          <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                          <span className="text-sm font-black">
                            {hotel.rating || "N/A"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditClick(e, hotel.id)}
                            className=" group-hover:opacity-100 transition-all h-8 w-8 p-0 border border-slate-200 bg-white hover:bg-theme-primary/10 hover:text-theme-primary hover:border-theme-primary/30"
                            title="Edit property"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
                    <p className="text-slate-500 font-medium">
                      {searchQuery
                        ? `No results for "${searchQuery}"`
                        : "No properties found"}
                    </p>
                    {(searchQuery || stateFilter !== "all") && (
                      <Button
                        variant="link"
                        onClick={() => {
                          setSearchQuery("");
                          setStateFilter("all");
                        }}
                        className="text-theme-primary font-bold"
                      >
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {!loading && filteredHotels.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
            {/* LEFT */}
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
              <p>
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-700">
                  {Math.min(currentPage * pageSize, filteredHotels.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {filteredHotels.length}
                </span>{" "}
                properties
              </p>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2">
              {/* 🔽 DROPDOWN */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 border rounded-lg px-2 text-xs"
              >
                {pageLengthsForPagination.map((num) => (
                  <option key={num} value={num}>
                    {num} / page
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>

              <div className="text-xs font-bold text-slate-700 px-2">
                {currentPage} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Read-only detail modal */}
      {selectedHotel && (
        <HotelDetailModal
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onEdit={() =>
            router.push(`./accommodations/create?id=${selectedHotel.id}`)
          }
        />
      )}
    </div>
  );
};

export default Accommodation;
