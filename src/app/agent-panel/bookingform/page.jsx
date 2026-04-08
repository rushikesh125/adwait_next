"use client";
import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import Link from "next/link";
import { auth, db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Plus,
  ExternalLink,
  Copy,
  Search,
  Check,
  Ticket,
  Trash2,
  Edit3,
  Lock,
  Globe,
  FileText,
  Loader2,
  Eye,
  ChevronDown,
  ChevronLeft,    // Added for pagination
  ChevronRight,   // Added for pagination
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import toast from "react-hot-toast";
import { pageLengthsForPagination } from "@/lib/pagination_size";



export default function AgentDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  // 2. Added Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTrips = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "trips"),
        where("agentId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
      );
      const querySnapshot = await getDocs(q);
      setTrips(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (error) {
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  // 3. Reset to page 1 when user searches
  useEffect(() => {
  setCurrentPage(1);
}, [searchTerm, pageSize]);

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/book/${id}`);
    setCopiedId(id);
    toast.success("Link Copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateStatus = async (tripId, newStatus) => {
    try {
      await updateDoc(doc(db, "trips", tripId), { status: newStatus });
      setTrips(
        trips.map((t) => (t.id === tripId ? { ...t, status: newStatus } : t)),
      );
      toast.success(`Status: ${newStatus.toUpperCase()}`);
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleDelete = async (tripId) => {
    if (!confirm("Permanently delete this trip?")) return;
    try {
      await deleteDoc(doc(db, "trips", tripId));
      setTrips(trips.filter((t) => t.id !== tripId));
      toast.success("Deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  // 4. Memoized Filtering and Pagination Logic
  const filteredData = useMemo(() => {
    return trips.filter((t) =>
      t.tripName.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [trips, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  const pagedData = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return filteredData.slice(start, start + pageSize);
}, [filteredData, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Ticket size={20} />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              Agent Panel
            </h1>
          </div>
          <Link href="./bookingform/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> CREATE TRIP
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex gap-8 px-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Live
              </p>
              <p className="text-xl font-black text-blue-600 leading-none">
                {trips.filter((t) => t.status === "public").length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Total
              </p>
              <p className="text-xl font-black text-slate-800 leading-none">
                {trips.length}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Quick search..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-500 text-[11px] uppercase py-4 pl-6">
                  Trip Details
                </TableHead>
                <TableHead className="font-bold text-slate-500 text-[11px] uppercase py-4">
                  Created
                </TableHead>
                <TableHead className="font-bold text-slate-500 text-[11px] uppercase py-4">
                  Status
                </TableHead>
                <TableHead className="font-bold text-slate-500 text-[11px] uppercase py-4 text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                    <Loader2 className="animate-spin mx-auto text-blue-500" />
                  </TableCell>
                </TableRow>
              ) : (
                pagedData.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <TableCell className="py-4 pl-6 w-1/3">
                      <span className="font-bold text-slate-900 text-sm block truncate">
                        {trip.tripName}
                      </span>
                    </TableCell>

                    <TableCell className="py-4 text-slate-500 text-xs tabular-nums">
                      {trip.createdAt?.toDate().toLocaleDateString("en-GB")}
                    </TableCell>

                    <TableCell className="py-4">
                      <StatusBadge status={trip.status} />
                    </TableCell>

                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* COPY LINK WITH FEEDBACK */}
                        <Button
                          onClick={() => copyLink(trip.id)}
                          variant="outline"
                          size="sm"
                          className={`h-9 px-3 font-bold text-xs transition-all ${copiedId === trip.id ? "bg-green-50 border-green-500 text-green-600" : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100"}`}
                        >
                          {copiedId === trip.id ? (
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {copiedId === trip.id ? "COPIED" : "COPY LINK"}
                        </Button>

                        {/* STATUS DROPDOWN */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-[10px] font-black border-slate-200 text-slate-600"
                            >
                              STATUS <ChevronDown className="ml-1 w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-32 font-bold text-[11px]"
                          >
                            <DropdownMenuItem
                              onClick={() => updateStatus(trip.id, "public")}
                              className="text-green-600"
                            >
                              <Globe className="w-3.5 h-3.5 mr-2" /> PUBLIC
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(trip.id, "draft")}
                              className="text-slate-500"
                            >
                              <FileText className="w-3.5 h-3.5 mr-2" /> DRAFT
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(trip.id, "closed")}
                              className="text-amber-600"
                            >
                              <Lock className="w-3.5 h-3.5 mr-2" /> CLOSED
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                        {/* ICON ACTIONS */}
                        <Link href={`./bookingform/view/${trip.id}`}>
                          <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Link href={`./bookingform/create?id=${trip.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </Link>

                        <Button
                          onClick={() => handleDelete(trip.id)}
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-300 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 5. Pagination UI Footer */}
          {!loading && filteredData.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex-wrap gap-3">

  {/* LEFT */}
  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
    <p>
      Showing{" "}
      <span className="font-bold text-slate-800">
        {(currentPage - 1) * pageSize + 1}
      </span>{" "}
      to{" "}
      <span className="font-bold text-slate-800">
        {Math.min(currentPage * pageSize, filteredData.length)}
      </span>{" "}
      of{" "}
      <span className="font-bold text-slate-800">
        {filteredData.length}
      </span>{" "}
      trips
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
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="h-8"
    >
      Next
      <ChevronRight className="h-4 w-4 ml-1" />
    </Button>
  </div>
</div>
          )}

          {/* Empty State */}
          {!loading && filteredData.length === 0 && (
            <div className="py-20 text-center">
              <Ticket className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No trips found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    public: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
    closed: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${styles[status]}`}
    >
      {status}
    </span>
  );
}