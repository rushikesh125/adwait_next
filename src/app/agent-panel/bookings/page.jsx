"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { auth } from "@/firebase/config";
import {
  getBookingsByAgent,
  updateBookingStatus,
  deleteBooking,
  updateBooking,
} from "@/firebase/bookingsService";
import {
  CalendarCheck,
  Plus,
  Search,
  Loader2,
  Pencil,

  Edit3,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
  MoreHorizontal,
  Hotel,
  PlaneTakeoff,
  MessageCircle,
  AlertTriangle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { pageLengthsForPagination } from "@/lib/pagination_size";
import { sendHotelBookingRequestOnWhatsApp } from "@/lib/hotelBookingRequestWhatsapp";
import toast from "react-hot-toast";

// ─── Shared helpers (also exported from booking-detail for reuse) ─────────────

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function extractHotelsFromBooking(booking) {
  if (booking.hotelSummary?.length) {
    return booking.hotelSummary.map((h) => ({
      hotelName: h.hotel || h.hotelName || "Hotel",
      city: h.city || "",
      checkIn: h.checkInDate || h.checkIn || "",
      checkOut: h.checkOutDate || h.checkOut || "",
      nights: h.nights || 0,
      rooms: h.numDouble || 0,
      roomCategory: h.selectedRoomCategory || "-",
      mealPlan: h.selectedMealPlan || "-",
    }));
  }
  return (booking.services || [])
    .filter((s) => s.type === "Hotel")
    .map((s) => ({
      hotelName: s.supplier || s.description || "Hotel",
      city: booking.destination || "",
      checkIn: booking.startDate || "",
      checkOut: booking.endDate || "",
      nights: 0,
      rooms: 0,
      roomCategory: "-",
      mealPlan: "-",
    }));
}

function hotelVoucherKey(hotelName, checkIn) {
  return `${(hotelName || "").trim().toLowerCase()}||${checkIn || ""}`;
}

function buildBookingRequestMessage(booking) {
  const name = booking.customerName || "there";
  const dest = booking.destination || "your destination";
  const ref = booking.bookingRef ? `\nBooking Ref: *${booking.bookingRef}*` : "";
  const dates =
    booking.startDate && booking.endDate
      ? `\nTravel Dates: *${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}*`
      : "";
  const amount = booking.totalAmount
    ? `\nTotal Amount: *₹${Number(booking.totalAmount).toLocaleString("en-IN")}*`
    : "";
  return [
    `Hi ${name} 👋`,
    ``,
    `We're pleased to confirm your booking for *${dest}*!${ref}${dates}${amount}`,
    ``,
    `Here are your booking details. Please review and let us know if you have any questions or changes.`,
    ``,
    `Looking forward to making your trip unforgettable! 🌍✈️`,
    ``,
    `Warm regards,`,
    `*Adwait Tours*`,
    `📞 +91 9884798483 | 🌐 www.adwaittours.com`,
  ].join("\n");
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      className={`flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase text-[11px] tracking-[0.16em] ${
        isActive ? "text-theme-primary" : "text-slate-600"
      } ${align === "center" ? "justify-center w-full" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });

  // ── Voucher state ────────────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState(null);
  const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState(null);
  const [activeVoucherBooking, setActiveVoucherBooking] = useState(null);
  const [hotelSelectionOpen, setHotelSelectionOpen] = useState(false);
  const [hotelListForSelection, setHotelListForSelection] = useState([]);
  const [hotelSelectionMode, setHotelSelectionMode] = useState("voucher");
  const [bookingForHotelRequest, setBookingForHotelRequest] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchBookings = async () => {
    if (!auth.currentUser || !user?.orgId) { setLoading(false); return; }
    try {
      const data = await getBookingsByAgent(auth.currentUser.uid, user.orgId);
      setBookings(data);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [user?.orgId]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, sortConfig, pageSize]);

  // ── Sorting & filtering ──────────────────────────────────────────────────────

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const processed = useMemo(() => {
    let data = [...bookings];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q) ||
          b.bookingRef?.toLowerCase().includes(q)
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

  // ── Booking actions ──────────────────────────────────────────────────────────

  const handleStatusChange = async (id, status) => {
    try {
      await updateBookingStatus(id, status, user.orgId);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
      setEditingStatusId(null);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this booking?")) return;
    setOpenMenuId(null);
    try {
      await deleteBooking(id, user.orgId);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast.success("Booking deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleHotelBookingRequestForHotel = async (booking, hotel) => {
    const { phone } = await sendHotelBookingRequestOnWhatsApp(booking, hotel);
    if (!phone) {
      toast("Opening WhatsApp. Hotel number not found; please select the hotel manually.", {
        icon: "📱",
      });
    }
  };

  const handleHotelBookingRequest = async (booking) => {
    setOpenMenuId(null);
    const hotels = extractHotelsFromBooking(booking);

    if (hotels.length === 0) {
      toast.error("No hotel data found in this booking.");
      return;
    }

    if (hotels.length === 1) {
      await handleHotelBookingRequestForHotel(booking, hotels[0]);
      return;
    }

    setBookingForHotelRequest(booking);
    setHotelSelectionMode("bookingRequest");
    setHotelListForSelection(hotels);
    setHotelSelectionOpen(true);
  };

  // ── WhatsApp ─────────────────────────────────────────────────────────────────

  const handleSendBookingRequest = (booking) => {
    setOpenMenuId(null);
    const phone = booking?.customerMobile || booking?.mobile || "";
    const message = buildBookingRequestMessage(booking);
    const digits = String(phone).replace(/\D/g, "");
    const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (!formattedPhone) {
      toast("Opening WhatsApp. Please select the guest manually.", { icon: "📱" });
    }
  };

  // ── Voucher generation ───────────────────────────────────────────────────────

  const handleGenerateVoucher = (type, booking) => {
    setOpenMenuId(null);
    setActiveVoucherBooking(booking);

    if (type !== "hotel") {
      toast("Flight voucher coming soon", { icon: "✈️" });
      return;
    }

    const hotels = extractHotelsFromBooking(booking);
    if (hotels.length === 0) {
      toast.error("No hotel data found in this booking.");
      return;
    }

    if (hotels.length === 1) {
      const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
      const key = hotelVoucherKey(hotels[0].hotelName, hotels[0].checkIn);
      if (activeVouchers.some((v) => hotelVoucherKey(v.hotelName, v.checkIn) === key)) {
        toast.error(
          `A voucher for "${hotels[0].hotelName}" already exists. Delete it first to create a new one.`
        );
        return;
      }
      setSelectedHotelForVoucher(hotels[0]);
      setVoucherDrawerOpen(true);
    } else {
      setHotelSelectionMode("voucher");
      setHotelListForSelection(hotels);
      setHotelSelectionOpen(true);
    }
  };

  const handleSelectHotelForVoucher = (hotel) => {
    const activeVouchers = (activeVoucherBooking?.vouchers || []).filter((v) => !v.deleted);
    const key = hotelVoucherKey(hotel.hotelName, hotel.checkIn);
    if (activeVouchers.some((v) => hotelVoucherKey(v.hotelName, v.checkIn) === key)) {
      toast.error(`A voucher for "${hotel.hotelName}" already exists. Delete it first to create a new one.`);
      setHotelSelectionOpen(false);
      return;
    }
    setSelectedHotelForVoucher(hotel);
    setHotelSelectionOpen(false);
    setVoucherDrawerOpen(true);
  };

  const handleSelectHotelForRequest = async (hotel) => {
    const booking = bookingForHotelRequest;
    setHotelSelectionOpen(false);
    setBookingForHotelRequest(null);
    if (!booking) return;
    await handleHotelBookingRequestForHotel(booking, hotel);
  };

  // After voucher is saved: record a tracking entry on the booking doc + refresh local state
  const handleVoucherSaved = async () => {
    if (!activeVoucherBooking) return;
    const bookingId = activeVoucherBooking.id;
    const hotel = selectedHotelForVoucher;

    try {
      const existing = activeVoucherBooking.vouchers || [];
      const key = hotelVoucherKey(hotel?.hotelName, hotel?.checkIn);
      const alreadyTracked = existing.some(
        (v) => !v.deleted && hotelVoucherKey(v.hotelName, v.checkIn) === key
      );

      if (!alreadyTracked && hotel) {
        const entry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: "hotel",
          hotelName: hotel.hotelName,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          city: hotel.city || "",
          deleted: false,
          createdAt: new Date().toISOString(),
        };
        const updatedVouchers = [...existing, entry];
        await updateBooking(bookingId, { vouchers: updatedVouchers }, user.orgId);
        // Update local state so the same booking row reflects the new voucher immediately
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, vouchers: updatedVouchers } : b
          )
        );
      }
    } catch (err) {
      console.error("[BookingsPage] Failed to track voucher on booking:", err);
      toast("Voucher saved. Could not update booking record.", { icon: "⚠️" });
    } finally {
      setVoucherDrawerOpen(false);
      setSelectedHotelForVoucher(null);
      setActiveVoucherBooking(null);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = [
    { label: "Total", value: bookings.length, color: "text-slate-800" },
    { label: "Confirmed", value: bookings.filter((b) => b.status === "Confirmed").length, color: "text-emerald-600" },
    { label: "Pending", value: bookings.filter((b) => b.status === "Pending").length, color: "text-amber-600" },
    { label: "Cancelled", value: bookings.filter((b) => b.status === "Cancelled").length, color: "text-rose-600" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
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
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
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
                    {searchTerm || statusFilter !== "all"
                      ? "No bookings match your search."
                      : "No bookings yet. Create your first one."}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((booking) => (
                  <TableRow key={booking.id} className="group hover:bg-slate-50/40 transition-colors cursor-pointer" onClick={() => router.push(`/agent-panel/bookings/${booking.id}`)}>
                    <TableCell className="pl-6 text-left">
                      <span className="font-bold text-theme-primary text-xs tracking-wide">
                        {booking.bookingRef}
                      </span>
                    </TableCell>
                    <TableCell className="text-left font-semibold text-slate-900 text-sm">
                      {booking.customerName || "—"}
                    </TableCell>
                    <TableCell className="text-left text-sm text-slate-600">
                      {booking.destination || "—"}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-500">
                      <div>{formatDate(booking.startDate)}</div>
                      {booking.endDate && (
                        <div className="text-slate-400">to {formatDate(booking.endDate)}</div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {editingStatusId !== booking.id ? (
                          <>
                            <StatusBadge
                              status={booking.status || "Pending"}
                              fallback="Pending"
                              className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingStatusId(booking.id); }}
                              className="text-slate-400 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <DropdownMenu
                            open={true}
                            onOpenChange={(open) => !open && setEditingStatusId(null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center h-7 px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800">
                                {booking.status || "Pending"}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-36">
                              {BOOKING_STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStatusChange(booking.id, s)}
                                >
                                  {s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={booking.paymentStatus || "Unpaid"}
                        fallback="Unpaid"
                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                      />
                    </TableCell>
                    <TableCell className="pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-700 hover:text-slate-900"
                          onClick={() => router.push(`/agent-panel/bookings/create?id=${booking.id}`)}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {/* 3-dot menu */}
                        <DropdownMenu
                          open={openMenuId === booking.id}
                          onOpenChange={(open) =>
                            setOpenMenuId(open ? booking.id : null)
                          }
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-700 hover:text-slate-900"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {/* Vouchers section */}
                            <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              Vouchers
                            </div>
                            <DropdownMenuItem
                              onClick={() => handleGenerateVoucher("hotel", booking)}
                            >
                              <Hotel className="w-4 h-4 mr-2 text-slate-500" />
                              Hotel voucher
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleGenerateVoucher("flight", booking)}
                            >
                              <PlaneTakeoff className="w-4 h-4 mr-2 text-slate-500" />
                              Flight voucher
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* WhatsApp */}
                            <DropdownMenuItem
                              onClick={() => handleHotelBookingRequest(booking)}
                              className="text-green-600 focus:text-green-700 focus:bg-green-50"
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Send hotel request
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Delete */}
                            <DropdownMenuItem
                              onClick={() => handleDelete(booking.id)}
                              className="text-red-500 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-800">
                  {Math.min(currentPage * pageSize, processed.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-800">{processed.length}</span> bookings
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 border rounded-lg px-2 text-xs"
                >
                  {pageLengthsForPagination.map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Hotel Voucher Drawer ─────────────────────────────────────────────── */}
      <HotelVoucherDrawer
        isOpen={voucherDrawerOpen}
        onClose={() => {
          setVoucherDrawerOpen(false);
          setSelectedHotelForVoucher(null);
          setActiveVoucherBooking(null);
        }}
        hotelData={selectedHotelForVoucher}
        quotation={{
          id: activeVoucherBooking?.quotationId || activeVoucherBooking?.id,
          customerName: activeVoucherBooking?.customerName || "",
          customerMobile:
            activeVoucherBooking?.customerMobile || activeVoucherBooking?.mobile || "",
          destination: activeVoucherBooking?.destination || "",
          leadName: activeVoucherBooking?.customerName || "",
        }}
        agentId={activeVoucherBooking?.agentId || ""}
        onSaved={handleVoucherSaved}
      />

      {/* ── Multi-hotel selection dialog ─────────────────────────────────────── */}
      <Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {hotelSelectionMode === "bookingRequest"
                ? "Select Hotel for Booking Request"
                : "Select Hotel for Voucher"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">
            {hotelSelectionMode === "bookingRequest"
              ? "This booking has multiple hotels. Pick one to send the hotel booking request on WhatsApp."
              : "This booking has multiple hotels. Pick one to generate a voucher."}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {hotelListForSelection.map((h, i) => {
              const activeVouchers = (activeVoucherBooking?.vouchers || []).filter(
                (v) => !v.deleted
              );
              const key = hotelVoucherKey(h.hotelName, h.checkIn);
              const hasVoucher = activeVouchers.some(
                (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key
              );
              const isVoucherMode = hotelSelectionMode === "voucher";
              return (
                <div
                  key={i}
                  onClick={() =>
                    isVoucherMode
                      ? !hasVoucher && handleSelectHotelForVoucher(h)
                      : handleSelectHotelForRequest(h)
                  }
                  className={`border rounded-xl p-4 transition ${
                    isVoucherMode && hasVoucher
                      ? "opacity-50 cursor-not-allowed bg-slate-50"
                      : "cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-base text-slate-800">
                    {h.hotelName || "Hotel"}
                  </p>
                  {h.city && <p className="text-sm text-slate-500 mt-0.5">{h.city}</p>}
                  <p className="text-sm mt-2 text-slate-600">
                    {h.checkIn} → {h.checkOut}
                  </p>
                  <p className="text-sm text-slate-500">
                    {h.roomCategory || "-"} · {h.mealPlan || "-"}
                  </p>
                  {isVoucherMode && hasVoucher && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Voucher already created
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
