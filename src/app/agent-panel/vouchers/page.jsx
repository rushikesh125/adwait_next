"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Plane,
  Hotel,
  Trash2,
  ChevronDown,
  Eye,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useQuotationState } from "@/app/hooks/useQuotationState";
import { updateQuotation } from "@/firebase/quotations";
import {
  fetchAllVouchersForAgent,
  deleteVoucherDocument,
} from "@/firebase/voucher";

// ── NEW: hotel voucher PDF + WhatsApp helpers
import {
  generateHotelVoucherPDF,
  shareHotelVoucherWhatsApp,
} from "@/lib/generateHotelVoucher";
import { pageLengthsForPagination } from "@/lib/pagination_size";

// ── NEW: SortHeader Component
const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      className={`flex items-center gap-1.5 hover:text-slate-900 transition-colors font-bold ${
        isActive ? "text-theme-primary" : "text-slate-600"
      } ${align === "center" ? "justify-center" : ""} ${align === "right" ? "justify-end" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmt = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

/* ─── View Modal ─────────────────────────────────────────────────────────── */
const VoucherViewModal = ({ voucher, onClose }) => {
  if (!voucher) return null;

  const handleDownload = async () => {
    if (voucher.voucherType === "Hotel") await generateHotelVoucherPDF(voucher);
    else alert("Flight voucher PDF coming soon.");
  };

  const handleWhatsApp = () => shareHotelVoucherWhatsApp(voucher);

  return (
    <Dialog open={!!voucher} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voucher Details</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg p-6 space-y-4 text-sm">
          <h2 className="text-center text-xl font-bold text-blue-800">
            {voucher.voucherType === "Hotel" ? "Hotel" : "Flight"} Booking
            Voucher
          </h2>
          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <p>
              <span className="font-semibold">Voucher No:</span>{" "}
              {voucher.voucherNumber || "—"}
            </p>
            <p>
              <span className="font-semibold">Issue Date:</span>{" "}
              {voucher.issueDate ? fmt(voucher.issueDate) : "—"}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {voucher.status || "—"}
            </p>
            {voucher.quotationId && (
              <p className="text-slate-500 text-xs">
                Quotation: #{voucher.quotationId.substring(0, 8).toUpperCase()}
              </p>
            )}
          </div>

          {voucher.voucherType === "Hotel" && (
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <p className="col-span-2 font-semibold text-base">
                {voucher.hotelName || "—"}
              </p>
              <p>
                <span className="font-semibold">Check-in:</span>{" "}
                {fmt(voucher.checkIn)} at 12:00 Noon
              </p>
              <p>
                <span className="font-semibold">Check-out:</span>{" "}
                {fmt(voucher.checkOut)} at 11:00 AM
              </p>
              <p>
                <span className="font-semibold">Nights:</span>{" "}
                {voucher.nights || "—"}
              </p>
              <p>
                <span className="font-semibold">{" "}</span>
                {voucher.rooms || "—"}
              </p>
              <p>
                <span className="font-semibold">Room Type:</span>{" "}
                {voucher.roomCategory || "—"}
              </p>
              <p>
                <span className="font-semibold">Meal Plan:</span>{" "}
                {voucher.meal || "—"}
              </p>
            </div>
          )}

          <div className="border-t pt-3 space-y-1.5">
            {voucher.guests?.length > 0 && (
              <p>
                <span className="font-semibold">Guests:</span>{" "}
                {voucher.guests.map((g) => `${g.title} ${g.name}`).join(", ")}
              </p>
            )}
            {voucher.contact && (
              <p>
                <span className="font-semibold">Contact:</span>{" "}
                {voucher.contact}
              </p>
            )}
            {voucher.address && (
              <p>
                <span className="font-semibold">Hotel Address:</span>{" "}
                {voucher.address}
              </p>
            )}
            {voucher.phone && (
              <p>
                <span className="font-semibold">Hotel Phone:</span>{" "}
                {voucher.phone}
              </p>
            )}
            <p>
              <span className="font-semibold">Payment:</span>{" "}
              {voucher.paymentStatus || "—"}
              {voucher.amount ? ` — ₹${voucher.amount}` : ""}
            </p>
            {voucher.requests && (
              <p>
                <span className="font-semibold">Special Requests:</span>{" "}
                {voucher.requests}
              </p>
            )}
            {voucher.cancellation && (
              <p>
                <span className="font-semibold">Cancellation Policy:</span>{" "}
                {voucher.cancellation}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center mt-3 gap-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {voucher.voucherType === "Hotel" && voucher.contact && (
              <Button
                onClick={handleWhatsApp}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
const VoucherDashboard = () => {
  const router = useRouter();
  const state = useQuotationState();
  const [pageSize, setPageSize] = useState(50);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // 2. Pagination State
  const [viewingVoucher, setViewingVoucher] = useState(null);
  const [allVouchers, setAllVouchers] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "issueDate",
    direction: "desc",
  });

  const loadVouchers = useCallback(async () => {
    const uid = authUser?.uid;
    if (!uid) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const data = await fetchAllVouchersForAgent(uid);
      setAllVouchers(data);
    } catch (err) {
      setFetchError(err.message);
      setAllVouchers([]);
    } finally {
      setIsFetching(false);
    }
  }, [authUser?.uid]);

  useEffect(() => {
    if (!authLoading && authUser?.uid) loadVouchers();
  }, [authLoading, authUser?.uid, loadVouchers]);

  // 3. Filtered Logic (useMemo) with sorting
  const processedData = useMemo(() => {
    let filtered = [...allVouchers];

    // Apply search filter
    const q = localSearch.toLowerCase();
    filtered = filtered.filter((v) => {
      return (
        !q ||
        v.customerName?.toLowerCase().includes(q) ||
        v.voucherNumber?.toLowerCase().includes(q) ||
        v.quotationId?.toLowerCase().includes(q) ||
        v.destination?.toLowerCase().includes(q) ||
        v.hotelName?.toLowerCase().includes(q)
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle Firebase Timestamps or Date objects
        if (aVal?.seconds) aVal = aVal.seconds;
        if (bVal?.seconds) bVal = bVal.seconds;

        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allVouchers, localSearch, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, localSearch, sortConfig]);
  
  // 4. Pagination Logic
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const handleDeleteVoucher = async (voucherRecord) => {
    if (!window.confirm("Delete this voucher?")) return;
    try {
      await deleteVoucherDocument(authUser.uid, voucherRecord);
      setAllVouchers((prev) => prev.filter((v) => v.id !== voucherRecord.id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleStatusUpdate = async (voucherRecord, newStatus) => {
    setAllVouchers((prev) =>
      prev.map((v) =>
        v.id === voucherRecord.id ? { ...v, status: newStatus } : v,
      ),
    );
    if (voucherRecord.quotationId) {
      try {
        await updateQuotation(authUser.uid, voucherRecord.quotationId, {
          voucherStatus: newStatus,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };
  useEffect(() => {
  if (currentPage > totalPages) {
    setCurrentPage(1);
  }
}, [totalPages]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-300" />
          <p>Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!authUser?.uid) {
    return (
      <div className="p-20 text-center text-slate-400">
        Not authenticated. Please log in.
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="text-blue-600 h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Voucher Management
                </h1>
                <p className="text-slate-500 text-sm">
                  Manage and track issued travel vouchers.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                onClick={loadVouchers}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="mr-2 h-4 w-4" /> Create Flight Voucher
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={() =>
                  router.push("/agent-panel/vouchers/create-hotel")
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Create Hotel Voucher
              </Button>
            </div>
          </div>

          {fetchError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <strong>Error loading vouchers:</strong> {fetchError}
              <button
                className="ml-3 underline text-red-500"
                onClick={loadVouchers}
              >
                Retry
              </button>
            </div>
          )}

          {/* Search */}
          <Card className="border-none shadow-sm bg-white/80 backdrop-blur">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by Voucher No, Client, Hotel, or Destination..."
                  className="pl-10 bg-white border-slate-200"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="text-slate-600 border-slate-200"
              >
                <Filter className="mr-2 h-4 w-4" /> Filter by Status
              </Button>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardContent className="p-0">
              {isFetching ? (
                <div className="py-24 text-center text-slate-400">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-300" />
                  <p>Loading vouchers...</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader className="bg-slate-50 border-y">
                      <TableRow>
                        <TableHead className="w-[50px] text-center font-bold">
                          <SortHeader
                            label="S.No"
                            column="id"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            align="center"
                          />
                        </TableHead>
                        <TableHead className="font-bold">
                          <SortHeader
                            label="Voucher No"
                            column="voucherNumber"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                          />
                        </TableHead>
                        <TableHead className="font-bold">
                          <SortHeader
                            label="Client"
                            column="customerName"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                          />
                        </TableHead>
                        <TableHead className="font-bold">
                          <SortHeader
                            label="Hotel / Details"
                            column="hotelName"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                          />
                        </TableHead>
                        <TableHead className="font-bold">
                          <SortHeader
                            label="Type"
                            column="voucherType"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                          />
                        </TableHead>
                        <TableHead className="font-bold">
                          <SortHeader
                            label="Status"
                            column="status"
                            sortConfig={sortConfig}
                            onSort={handleSort}
                          />
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* 5. Map over pagedData */}
                      {pagedData.map((item, index) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="text-center text-slate-500">
                            {(currentPage - 1) * pageSize + index + 1}
                          </TableCell>

                          <TableCell className="font-mono text-sm font-semibold text-slate-700 uppercase">
                            {item.voucherNumber || "—"}
                          </TableCell>

                          <TableCell className="font-medium text-blue-600">
                            {item.customerName || "—"}
                          </TableCell>

                          <TableCell className="text-sm">
                            <p className="font-medium text-slate-700">
                              {item.hotelName || "—"}
                            </p>
                            {item.checkIn && (
                              <p className="text-xs text-slate-400">
                                {fmt(item.checkIn)} → {fmt(item.checkOut)}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              {item.voucherType === "Hotel" ? (
                                <>
                                  <Hotel className="h-3.5 w-3.5 text-orange-400" />{" "}
                                  Hotel
                                </>
                              ) : (
                                <>
                                  <Plane className="h-3.5 w-3.5 text-blue-400" />{" "}
                                  Flight
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="h-8 p-0 px-2 flex items-center gap-1 focus:ring-0"
                                >
                                  <Badge
                                    className={`${
                                      item.status === "SENT"
                                        ? "bg-green-100 text-green-700"
                                        : item.status === "CANCELLED"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-yellow-100 text-yellow-700"
                                    } border-none shadow-none text-[10px]`}
                                  >
                                    {item.status || "PENDING"}
                                  </Badge>
                                  <ChevronDown className="h-3 w-3 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(item, "PENDING")
                                  }
                                >
                                  Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(item, "SENT")
                                  }
                                >
                                  Sent
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(item, "CANCELLED")
                                  }
                                >
                                  Cancelled
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-center gap-1">
                              {/* View */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View Voucher"
                                onClick={() => setViewingVoucher(item)}
                              >
                                <Eye className="h-4 w-4 text-slate-500" />
                              </Button>

                              {/* Download PDF */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Download PDF"
                                onClick={async () =>
                                  item.voucherType === "Hotel"
                                    ? await generateHotelVoucherPDF(item)
                                    : alert("Flight voucher PDF coming soon.")
                                }
                              >
                                <Download className="h-4 w-4 text-slate-500" />
                              </Button>

                              {/* WhatsApp */}
                              {item.voucherType === "Hotel" && item.contact && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Share on WhatsApp"
                                  onClick={() =>
                                    shareHotelVoucherWhatsApp(item)
                                  }
                                >
                                  <MessageCircle className="h-4 w-4 text-green-500" />
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Delete Voucher"
                                onClick={() => handleDeleteVoucher(item)}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* 6. Pagination Footer */}
                  {!isFetching && processedData.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
                      {/* LEFT SIDE */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                        <p>
                          Showing{" "}
                          <span className="font-bold text-slate-700">
                            {(currentPage - 1) * pageSize + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-bold text-slate-700">
                            {Math.min(
                              currentPage * pageSize,
                              processedData.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-bold text-slate-700">
                            {processedData.length}
                          </span>{" "}
                          vouchers
                        </p>
                      </div>

                      {/* RIGHT SIDE */}
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
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
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

                  {processedData.length === 0 && (
                    <div className="py-24 text-center">
                      <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900">
                        No Vouchers Found
                      </h3>
                      <p className="text-slate-500 text-sm">
                        {allVouchers.length > 0
                          ? "No vouchers match your search."
                          : "Create a voucher using the buttons above or from a quotation row."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <VoucherViewModal
        voucher={viewingVoucher}
        onClose={() => setViewingVoucher(null)}
      />
    </>
  );
};

export default VoucherDashboard;