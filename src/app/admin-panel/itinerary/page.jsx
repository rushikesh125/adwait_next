"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  X,
  ChevronRight,
  CalendarDays,
  Tag,
  CheckSquare,
  FileText,
  Info,
  ListChecks,
  Clock,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/firebase/config";

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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { pageLengthsForPagination } from "@/lib/pagination_size";
import StatusBadge from "@/components/StatusBadge";

// ── SortHeader Component
const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      className={`flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase text-[11px] tracking-[0.16em] ${
        isActive ? "text-theme-primary" : "text-slate-600"
      } ${align === "center" ? "justify-center" : ""} ${align === "right" ? "justify-end" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className={`h-4 w-4 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Quick View Dialog
// ─────────────────────────────────────────────────────────────────────────────
function QuickViewDialog({ item, open, onClose }) {
  if (!item) return null;

  const selectedInclusions = (item.inclusions || []).filter((i) => i.selected);
  const selectedExclusions = (item.exclusions || []).filter((i) => i.selected);
  const selectedTnc = (item.tnc || []).filter((i) => i.selected);
  const selectedCancellation = (item.cancellation || []).filter(
    (i) => i.selected,
  );
  const selectedImpInfo = (item.impInfo || []).filter((i) => i.selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {item.title}
            </DialogTitle>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-blue-500" />
                {item.state}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays className="w-3 h-3 text-blue-500" />
                {(item.days || []).length} Days /{" "}
                {item.durationNights ?? (item.days?.length || 1) - 1} Nights
              </span>
              <StatusBadge
                status={item.status || "Draft"}
                fallback="Draft"
                className="text-[10px] px-2 py-0.5"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {(item.cities || []).length > 0 && (
            <div>
              <SectionLabel icon={MapPin} label="Cities Covered" />
              <div className="flex flex-wrap gap-2 mt-2">
                {item.cities.map((city, i) => (
                  <Badge
                    key={i}
                    className="bg-blue-50 text-blue-700 border-blue-100"
                    variant="outline"
                  >
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {(item.days || []).length > 0 && (
            <div>
              <SectionLabel icon={CalendarDays} label="Day-by-Day Program" />
              <div className="mt-2 space-y-3">
                {item.days.map((day) => (
                  <div
                    key={day.id || day.dayNumber}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-blue-50 px-4 py-2 flex items-center gap-3 border-b">
                      <span className="text-xs font-black text-blue-600 tracking-widest">
                        DAY {day.dayNumber}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {day.title}
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {day.description && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {day.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                        {day.overnightCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Overnight:{" "}
                            {day.overnightCity}
                          </span>
                        )}
                        {day.mealNote && (
                          <span className="flex items-center gap-1">
                            🍽️ {day.mealNote}
                          </span>
                        )}
                        {(day.activityIds || []).length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {day.activityIds.length}{" "}
                            Activities
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedInclusions.length > 0 && (
            <ChecklistView
              icon={ListChecks}
              label="Inclusions"
              items={selectedInclusions}
              color="green"
            />
          )}
          {selectedExclusions.length > 0 && (
            <ChecklistView
              icon={X}
              label="Exclusions"
              items={selectedExclusions}
              color="red"
            />
          )}
          {selectedTnc.length > 0 && (
            <ChecklistView
              icon={FileText}
              label="Terms & Conditions"
              items={selectedTnc}
              color="blue"
            />
          )}
          {selectedCancellation.length > 0 && (
            <ChecklistView
              icon={Clock}
              label="Cancellation Policy"
              items={selectedCancellation}
              color="amber"
            />
          )}
          {selectedImpInfo.length > 0 && (
            <ChecklistView
              icon={Info}
              label="Important Information"
              items={selectedImpInfo}
              color="purple"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-blue-500" />
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
  );
}

const colorMap = {
  green: "text-green-600",
  red: "text-red-500",
  blue: "text-blue-600",
  amber: "text-amber-600",
  purple: "text-purple-600",
};

function ChecklistView({ icon: Icon, label, items, color }) {
  return (
    <div>
      <SectionLabel icon={Icon} label={label} />
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2 text-sm text-slate-600"
          >
            <ChevronRight
              className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colorMap[color] || "text-blue-500"}`}
            />
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main List Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ItineraryListPage() {
  const router = useRouter();
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedView, setSelectedView] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const statusOptions = ["Draft", "Published"];

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "itinerary_templates"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      setItineraries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error("Failed to load itineraries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, []);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize, sortConfig]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;
    try {
      await deleteDoc(doc(db, "itinerary_templates", id));
      toast.success("Template deleted");
      setItineraries((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (id) =>
    router.push(`/admin-panel/itinerary/create?itineraryid=${id}`);

  const handleStatusUpdate = async (item, status) => {
    try {
      await updateDoc(doc(db, "itinerary_templates", item.id), { status });
      setItineraries((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, status } : entry,
        ),
      );
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update itinerary status");
    }
  };

  // ── Filtered and sorted list (global — across all data, not just current page) ──────
  const processedData = useMemo(() => {
    let filtered = [...itineraries];

    // Apply search filter
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(q) ||
        item.state?.toLowerCase().includes(q) ||
        (item.cities || []).some((c) => c.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
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
  }, [itineraries, searchQuery, statusFilter, sortConfig]);

  const counts = useMemo(
    () => ({
      All: itineraries.length,
      Published: itineraries.filter((i) => i.status === "Published").length,
      Draft: itineraries.filter((i) => i.status === "Draft").length,
    }),
    [itineraries],
  );

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="app-page-title">Itinerary Templates</h1>
          <p className="app-page-subtitle">
            Manage and create travel plans for your clients.
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin-panel/itinerary/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by title, state or city..."
            className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {["All", "Published", "Draft"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${statusFilter === status ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {status}
              <span className="ml-1.5 text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-medium ml-auto hidden sm:block">
          Showing {processedData.length} of {itineraries.length}
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[30%]">
                <SortHeader
                  label="Template Title"
                  column="title"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[25%]">
                <SortHeader
                  label="State / Cities"
                  column="state"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="w-[15%] text-center">
                <SortHeader
                  label="Duration"
                  column="durationNights"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="w-[15%] text-center">
                <SortHeader
                  label="Activities"
                  column="totalActivities"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="w-[10%] text-center">
                <SortHeader
                  label="Status"
                  column="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="w-[14%] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-slate-400 text-xs">
                    Loading templates...
                  </p>
                </TableCell>
              </TableRow>
            ) : pagedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-48 text-center text-slate-400 text-sm"
                >
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No itineraries found."}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((item) => {
                const totalActivities = (item.days || []).reduce(
                  (acc, d) => acc + (d.activityIds?.length || 0),
                  0,
                );
                const nights =
                  item.durationNights ?? (item.days?.length || 1) - 1;
                const days = nights + 1;
                // console.log(item.states)
                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedView(item)}
                  >
                    <TableCell>
                      <div className="font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        v{item.version || 1} · ID: {item.id.slice(0, 8)}…
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        {(item.states || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 text-sm text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />

                            {(item.states || []).map((state, i) => (
                              <span key={i}>{state},</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {(item.cities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.cities.slice(0, 3).map((city, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5"
                            >
                              {city}
                            </span>
                          ))}
                          {item.cities.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{item.cities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="w-full flex justify-start">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 border-blue-100 text-blue-700 text-xs"
                        >
                          {nights}N / {days}D
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="w-full flex justify-start">
                        <span className="text-sm font-semibold text-slate-700">
                          {totalActivities}
                        </span>
                        &nbsp;
                        <div className="text-[10px] text-slate-400">linked</div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div
                        className="w-full flex items-center justify-start gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingStatusId !== item.id ? (
                          <>
                            <StatusBadge
                              status={item.status || "Draft"}
                              fallback="Draft"
                              className="text-xs"
                            />
                            <button
                              onClick={() => setEditingStatusId(item.id)}
                              className="text-slate-400 hover:text-slate-800 opacity-70 hover:opacity-100 transition-opacity"
                              title="Change status"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <DropdownMenu
                            onOpenChange={(open) =>
                              !open && setEditingStatusId(null)
                            }
                            open={true}
                          >
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center justify-between h-7 min-w-[110px] px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800 focus:ring-2 focus:ring-theme-primary/30">
                                {item.status || "Draft"}
                                <Search className="h-3 w-3 rotate-90" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              {statusOptions.map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={async () => {
                                    await handleStatusUpdate(item, status);
                                    setEditingStatusId(null);
                                  }}
                                >
                                  {status}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                          onClick={() => handleEdit(item.id)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {!loading && processedData.length > 0 && (
          <div className="table-footer-bar flex-wrap">
            <p className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-700">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(currentPage * pageSize, processedData.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {processedData.length}
              </span>{" "}
              templates
            </p>

            <div className="flex items-center gap-2">
              {/* 🔽 PAGE SIZE DROPDOWN */}
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
      </div>

      {/* Quick View Dialog */}
      <QuickViewDialog
        item={selectedView}
        open={!!selectedView}
        onClose={() => setSelectedView(null)}
      />
    </div>
  );
}
