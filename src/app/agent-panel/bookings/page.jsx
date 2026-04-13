"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import {
  getBookingsByAgent,
  updateBookingStatus,
  deleteBooking,
} from "@/firebase/bookingsService";
import {
  CalendarCheck,
  Plus,
  Search,
  Loader2,
  Pencil,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { pageLengthsForPagination } from "@/lib/pagination_size";
import toast from "react-hot-toast";

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      className={`flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase text-[11px] tracking-[0.16em] ${isActive ? "text-theme-primary" : "text-slate-600"} ${align === "center" ? "justify-center w-full" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  const fetchBookings = async () => {
    if (!auth.currentUser) { setLoading(false); return; }
    try {
      const data = await getBookingsByAgent(auth.currentUser.uid);
      setBookings(data);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, sortConfig, pageSize]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
      setEditingStatusId(null);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this booking?")) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast.success("Booking deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const processed = useMemo(() => {
    let data = [...bookings];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q) ||
          b.bookingRef?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      data = data.filter((b) => b.status === statusFilter);
    }
    if (sortConfig.key) {
      data.sort((a, b) => {
        let av = a[sortConfig.key];
        let bv = b[sortConfig.key];
        if (av?.seconds) av = av.seconds;
        if (bv?.seconds) bv = bv.seconds;
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [bookings, searchTerm, statusFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processed.slice(start, start + pageSize);
  }, [processed, currentPage, pageSize]);

  const stats = [
    { label: "Total", value: bookings.length, color: "text-slate-800" },
    { label: "Confirmed", value: bookings.filter((b) => b.status === "Confirmed").length, color: "text-emerald-600" },
    { label: "Pending", value: bookings.filter((b) => b.status === "Pending").length, color: "text-amber-600" },
    { label: "Cancelled", value: bookings.filter((b) => b.status === "Cancelled").length, color: "text-rose-600" },
  ];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-theme-primary p-2 rounded-lg text-white">
              <CalendarCheck size={20} />
            </div>
            <h1 className="app-section-title uppercase tracking-tight">Bookings</h1>
          </div>
          <Button
            onClick={() => router.push("/agent-panel/bookings/create")}
            className="bg-theme-primary hover:bg-theme-primary/90 text-white font-bold rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> NEW BOOKING
          </Button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
              <p className={`text-2xl font-black leading-none mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by customer, destination or ref..."
              className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-44 rounded-xl border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Statuses</SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="table-shell">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 py-4 w-[130px]">
                  <SortHeader label="Ref" column="bookingRef" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="py-4">
                  <SortHeader label="Customer" column="customerName" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="py-4">
                  <SortHeader label="Destination" column="destination" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-center w-[160px]">
                  <SortHeader label="Travel Dates" column="startDate" sortConfig={sortConfig} onSort={handleSort} align="center" />
                </TableHead>
                <TableHead className="text-center w-[130px]">
                  <SortHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} align="center" />
                </TableHead>
                <TableHead className="text-center w-[110px]">
                  <SortHeader label="Payment" column="paymentStatus" sortConfig={sortConfig} onSort={handleSort} align="center" />
                </TableHead>
                <TableHead className="text-center w-[130px] pr-6 font-bold text-slate-600 uppercase text-[11px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-center">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-theme-primary" />
                  </TableCell>
                </TableRow>
              ) : paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center text-slate-400 text-sm font-medium">
                    <CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    {searchTerm || statusFilter !== "all" ? "No bookings match your search." : "No bookings yet. Create your first one."}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((booking) => (
                  <TableRow key={booking.id} className="group hover:bg-slate-50/40 transition-colors">
                    <TableCell className="pl-6 text-left">
                      <span className="font-bold text-theme-primary text-xs tracking-wide">{booking.bookingRef}</span>
                    </TableCell>
                    <TableCell className="text-left font-semibold text-slate-900 text-sm">
                      {booking.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-left text-sm text-slate-600">
                      {booking.destination || "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">
                      <div>{formatDate(booking.startDate)}</div>
                      {booking.endDate && <div className="text-slate-400">to {formatDate(booking.endDate)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {editingStatusId !== booking.id ? (
                          <>
                            <StatusBadge status={booking.status || "Pending"} fallback="Pending" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" />
                            <button
                              onClick={() => setEditingStatusId(booking.id)}
                              className="text-slate-400 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <DropdownMenu open={true} onOpenChange={(open) => !open && setEditingStatusId(null)}>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center h-7 px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800">
                                {booking.status || "Pending"}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-36">
                              {BOOKING_STATUSES.map((s) => (
                                <DropdownMenuItem key={s} onClick={() => handleStatusChange(booking.id, s)}>
                                  {s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.paymentStatus || "Unpaid"} fallback="Unpaid" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/agent-panel/bookings/${booking.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => router.push(`/agent-panel/bookings/create?id=${booking.id}`)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(booking.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && processed.length > 0 && (
            <div className="table-footer-bar flex-wrap">
              <p>
                Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, processed.length)}</span> of{" "}
                <span className="font-bold text-slate-800">{processed.length}</span> bookings
              </p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 border rounded-lg px-2 text-xs">
                  {pageLengthsForPagination.map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-2">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
