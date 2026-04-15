"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreVertical,
  Hotel,
  Plane,
  Search,
  Download,
  Edit,
  Trash2,
  Copy,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PackagePlus,
  ClipboardCopy,
  MessageCircle,
  BellRing,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { pageLengthsForPagination } from "@/lib/pagination_size";
import StatusBadge from "@/components/StatusBadge";
import { getStatusLabel } from "@/lib/status";
import { useSelector } from "react-redux";
import ShareButton from "@/components/ShareButton";

const STATUS_ORDER = { Draft: 1, Sent: 2, Accepted: 3, Rejected: 4 };
const QUOTATION_STATUS_OPTIONS = ["Draft", "Sent", "Accepted", "Rejected"];

const SortableHeader = ({ label, column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${
        isActive ? "text-foreground font-semibold" : "text-muted-foreground"
      }`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
};

const QuotationsTable = ({
  filteredQuotations,
  searchTerm,
  setSearchTerm,
  filterDestination,
  setFilterDestination,
  startDate,
  handleGenerateVoucher,
  handleOpenBookingConfirmation,
  setStartDate,
  endDate,
  setEndDate,
  filterStatus,
  setFilterStatus,
  getDestinationOfpkg,
  handleViewClick,
  handleEditRedirect,
  handleDownloadPDF,
  handleDeleteQuotation,
  handleCopyToClipboard,
  handleShareOnWhatsApp,
  handleSendReminder,
  currentPage = 1,
  onNextPage,
  onPrevPage,
  pageSize,
  setPageSize,
  totalItems,
  hasNextPage = false,
  hasPrevPage = false,
  isFetching = false,
  handleQuotationStatusChange,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [editingStatusId, setEditingStatusId] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };
  const router = useRouter();
  const sortedQuotations = React.useMemo(() => {
    if (!sortConfig.key) return filteredQuotations;

    return [...filteredQuotations].sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;

      if (sortConfig.key === "createdAt") {
        const aTime = a.createdAt?.seconds ?? 0;
        const bTime = b.createdAt?.seconds ?? 0;
        return (aTime - bTime) * dir;
      }

      if (sortConfig.key === "status") {
        const aOrder = STATUS_ORDER[a.status] ?? 99;
        const bOrder = STATUS_ORDER[b.status] ?? 99;
        return (aOrder - bOrder) * dir;
      }

      if (sortConfig.key === "customer") {
        const aVal = (a.customerName || a.leadName || "").toLowerCase();
        const bVal = (b.customerName || b.leadName || "").toLowerCase();
        return aVal.localeCompare(bVal) * dir;
      }

      if (sortConfig.key === "package") {
        const aVal = (a.packageName || "").toLowerCase();
        const bVal = (b.packageName || "").toLowerCase();
        return aVal.localeCompare(bVal) * dir;
      }

      if (sortConfig.key === "destination") {
        const aVal = (getDestinationOfpkg(a) || "").toLowerCase();
        const bVal = (getDestinationOfpkg(b) || "").toLowerCase();
        return aVal.localeCompare(bVal) * dir;
      }

      return 0;
    });
  }, [filteredQuotations, sortConfig, getDestinationOfpkg]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDestination?.("");
    setStartDate("");
    setEndDate("");
    setFilterStatus?.("");
  };

  const hasActiveFilters =
    searchTerm || filterDestination || startDate || endDate || filterStatus;

  return (
    <TooltipProvider>
      <div className="flex justify-end mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            onClick={() => router.push("/agent-panel/my-quatation/create")}
            className="bg-theme-primary hover:bg-theme-secondary text-white shadow-md transition-all hover:scale-105"
          >
            <PackagePlus className="mr-2 h-4 w-4" /> New Package
          </Button>
        </div>
      </div>

      <Card className="border-theme-muted shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-xl text-theme-primary">
              All Quotations (Newest First)
            </CardTitle>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search" className="text-sm">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by customer, package, or destination..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm">
                    From Date
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm">
                    To Date
                  </Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="h-10 whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-theme-muted/30 hover:bg-theme-muted/50">
                  <TableHead className="w-24">Ref. No.</TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Customer"
                      column="customer"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Package"
                      column="package"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Destination"
                      column="destination"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Created"
                      column="createdAt"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader
                      label="Status"
                      column="status"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Fetching quotations...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No quotations match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedQuotations.map((q, ind) => {
                    const isAccepted = q.status === "Accepted";
                    const orderNumber = (currentPage - 1) * pageSize + ind + 1;

                    return (
                      <TableRow
                        key={q.id}
                        className="cursor-pointer hover:bg-theme-muted/20 transition-colors"
                        onClick={() => handleViewClick(q)}
                      >
                        <TableCell className="font-medium text-theme-primary font-mono text-xs">
                          {q.refNumber || `#${orderNumber}`}{" "}
                          {/* fallback for old records */}
                        </TableCell>
                        <TableCell className="font-medium">
                          {q.customerName || q.leadName || "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-[160px] truncate"
                          title={q.packageName}
                        >
                          {q.packageName || "—"}
                        </TableCell>
                        <TableCell className="whitespace-pre-line max-w-[180px] text-sm text-muted-foreground">
                          {getDestinationOfpkg(q)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {q.createdAt
                            ? new Date(
                                q.createdAt.seconds * 1000,
                              ).toLocaleDateString("en-GB")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            {editingStatusId !== q.id ? (
                              <>
                                <StatusBadge
                                  status={q.status || "Draft"}
                                  fallback="Draft"
                                  className="justify-center px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStatusId(q.id);
                                  }}
                                  className="text-slate-400 hover:text-slate-800 transition-opacity"
                                  title="Change status"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <DropdownMenu
                                open={true}
                                onOpenChange={(open) =>
                                  !open && setEditingStatusId(null)
                                }
                              >
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center justify-between h-7 px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800 focus:ring-2 focus:ring-theme-primary/30"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getStatusLabel(
                                      q.status || "Draft",
                                      "Draft",
                                    )}
                                    <Search className="h-3 w-3 rotate-90" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="center"
                                  className="w-40"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {QUOTATION_STATUS_OPTIONS.map((status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuotationStatusChange?.(
                                          q.id,
                                          status,
                                        );
                                        setEditingStatusId(null);
                                      }}
                                    >
                                      {getStatusLabel(status, status)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {/* View */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewClick(q)}
                              title="View Quotation"
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Edit */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditRedirect(q)}
                              title="Edit Quotation"
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Download PDF */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(q)}
                              title="Download PDF"
                              className="h-8 w-8"
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            {/* Copy Summary */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyToClipboard(q)}
                              title="Copy Summary"
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            {/* Share Itinerary - NEW SHARE BUTTON */}
                            <ShareButton
                              quotation={q}
                              agentId={user?.uid}
                              onTokenSaved={(quotationId, fields) => {
                                // Optional: Refresh the specific row in parent component
                                // You can call a refresh function or update local state
                              }}
                              size="sm"
                              variant="icon"
                            />

                            {/* WhatsApp Share */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShareOnWhatsApp?.(q)}
                              title="Share on WhatsApp"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>

                            {/* Reminder (only for Sent) */}
                            {q.status === "Sent" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleSendReminder?.(q)}
                                    className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                  >
                                    <BellRing className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Reminder</TooltipContent>
                              </Tooltip>
                            )}

                            {/* More Actions for Accepted */}
                            {q.status === "Accepted" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>
                                    Accepted Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenBookingConfirmation?.(q)
                                    }
                                  >
                                    <ClipboardCopy className="mr-2 h-4 w-4" />
                                    Send Booking Request
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleGenerateVoucher(q, "hotel")
                                    }
                                  >
                                    <Hotel className="mr-2 h-4 w-4" /> Hotel
                                    Voucher
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleGenerateVoucher(q, "flight")
                                    }
                                  >
                                    <Plane className="mr-2 h-4 w-4" /> Flight
                                    Voucher
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-40 cursor-not-allowed"
                                      disabled
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs">
                                    Vouchers are created for accepted quotations
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive/90 h-8 w-8"
                                  title="Delete Quotation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the quotation
                                    for &quot;
                                    {q.customerName || q.leadName}&quot;. This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteQuotation(q.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination Controls ────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t flex-wrap gap-3">
            {/* LEFT SIDE */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <p>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                <strong>{Math.min(currentPage * pageSize, totalItems)}</strong>{" "}
                of <strong>{totalItems}</strong>
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
                onClick={onPrevPage}
                disabled={!hasPrevPage || isFetching}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm font-medium px-2">{currentPage}</div>

              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!hasNextPage || isFetching}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default QuotationsTable;
