"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  CalendarCheck, Loader2, Search, RefreshCw, Trash2, Pencil, Filter,
  XCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Eye, Edit3,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { getBookingsByAdmin, getAgentsByAdmin } from "@/firebase/adminService";
import { updateBookingStatus, deleteBooking } from "@/firebase/bookingsService";
import toast from "react-hot-toast";

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const SortHeader = ({ label, column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button className={`flex items-center gap-1 text-[11px] uppercase tracking-widest transition-colors ${isActive ? "text-theme-primary" : "text-slate-500"}`}
      onClick={() => onSort(column)}>
      {label}<Icon className={`h-3.5 w-3.5 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

export default function AdminBookingsPage() {
  const { user } = useSelector((s) => s.auth);
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [b, a] = await Promise.all([
        getBookingsByAdmin(user.uid),
        getAgentsByAdmin(user.uid),
      ]);
      setBookings(b);
      const map = {};
      a.forEach((ag) => { map[ag.id] = ag.name || ag.email || "Agent"; });
      setAgentMap(map);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid]);

  const handleSort = (key) =>
    setSortConfig((prev) => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));

  const processed = useMemo(() => {
    let data = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((b) =>
        b.customerName?.toLowerCase().includes(q) ||
        b.destination?.toLowerCase().includes(q) ||
        b.bookingRef?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") data = data.filter((b) => b.status === statusFilter);
    if (sortConfig.key) {
      data.sort((a, b) => {
        let av = a[sortConfig.key]; let bv = b[sortConfig.key];
        if (av?.seconds) av = av.seconds; if (bv?.seconds) bv = bv.seconds;
        if (typeof av === "string") av = av.toLowerCase(); if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [bookings, search, statusFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const paged = useMemo(() => processed.slice((currentPage - 1) * pageSize, currentPage * pageSize), [processed, currentPage]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Status update failed"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this booking?")) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast.success("Booking deleted");
    } catch { toast.error("Delete failed"); }
  };

  const stats = [
    { label: "Total", value: bookings.length, color: "text-slate-800" },
    { label: "Confirmed", value: bookings.filter((b) => b.status === "Confirmed").length, color: "text-emerald-600" },
    { label: "Pending", value: bookings.filter((b) => b.status === "Pending").length, color: "text-amber-600" },
    { label: "Cancelled", value: bookings.filter((b) => b.status === "Cancelled").length, color: "text-rose-600" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-theme-primary p-2 rounded-lg text-white"><CalendarCheck size={20} /></div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bookings</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
              <p className={`text-2xl font-black leading-none mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by customer, destination or ref..."
              className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearch("")}>
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-44 rounded-xl border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue placeholder="Status" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-6"><SortHeader label="Ref" column="bookingRef" sortConfig={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortHeader label="Customer" column="customerName" sortConfig={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead><SortHeader label="Destination" column="destination" sortConfig={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead className="text-center"><SortHeader label="Travel Dates" column="startDate" sortConfig={sortConfig} onSort={handleSort} /></TableHead>
                <TableHead className="text-center text-[11px] uppercase tracking-widest text-slate-500 font-bold">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Agent</TableHead>
                <TableHead className="text-right pr-6 text-[11px] uppercase tracking-widest text-slate-500 font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-theme-primary" /></TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-16 text-center text-slate-400 text-sm">No bookings found</TableCell></TableRow>
              ) : paged.map((b) => (
                <TableRow key={b.id} className="group hover:bg-slate-50/40 transition-colors">
                  <TableCell className="pl-6">
                    <span className="font-bold text-theme-primary text-xs tracking-wide">{b.bookingRef}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 text-sm">{b.customerName || "—"}</TableCell>
                  <TableCell className="text-sm text-slate-600">{b.destination || "—"}</TableCell>
                  <TableCell className="text-center text-xs text-slate-500">
                    <div>{formatDate(b.startDate)}</div>
                    {b.endDate && <div className="text-slate-400">to {formatDate(b.endDate)}</div>}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 mx-auto">
                          <StatusBadge status={b.status || "Pending"} fallback="Pending"
                            className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80" />
                          <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-36">
                        {BOOKING_STATUSES.map((s) => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChange(b.id, s)}>{s}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 font-medium">
                    {b.agentId ? (agentMap[b.agentId] || "—") : <span className="text-slate-400 italic text-xs">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-theme-primary"
                        onClick={() => router.push(`/admin-panel/bookings/${b.id}`)} title="View">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => router.push(`/admin-panel/bookings/create?id=${b.id}`)} title="Edit">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500"
                        onClick={() => handleDelete(b.id)} title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!loading && processed.length > pageSize && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
              <p className="text-xs text-slate-500">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, processed.length)} of {processed.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-2 self-center">{currentPage} / {totalPages}</span>
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
