"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2, MapPin,
  Loader2, X, ChevronRight, CalendarDays, Tag, CheckSquare,
  FileText, Info, ListChecks, Clock, ChevronLeft,
} from "lucide-react";
import {
  collection, getDocs, deleteDoc, doc, orderBy, query,
} from "firebase/firestore";
import { db } from "@/firebase/config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Quick View Dialog
// ─────────────────────────────────────────────────────────────────────────────
function QuickViewDialog({ item, open, onClose }) {
  if (!item) return null;

  const selectedInclusions  = (item.inclusions   || []).filter(i => i.selected);
  const selectedExclusions  = (item.exclusions   || []).filter(i => i.selected);
  const selectedTnc         = (item.tnc          || []).filter(i => i.selected);
  const selectedCancellation= (item.cancellation || []).filter(i => i.selected);
  const selectedImpInfo     = (item.impInfo      || []).filter(i => i.selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl md:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">{item.title}</DialogTitle>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3 text-blue-500" />{item.state}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <CalendarDays className="w-3 h-3 text-blue-500" />
                {(item.days || []).length} Days / {item.durationNights ?? ((item.days?.length || 1) - 1)} Nights
              </span>
              <Badge
                className={`text-[10px] px-2 py-0.5 ${item.status === "Published" ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}
                variant="outline"
              >
                {item.status || "Draft"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {(item.cities || []).length > 0 && (
            <div>
              <SectionLabel icon={MapPin} label="Cities Covered" />
              <div className="flex flex-wrap gap-2 mt-2">
                {item.cities.map((city, i) => (
                  <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-100" variant="outline">{city}</Badge>
                ))}
              </div>
            </div>
          )}

          {(item.days || []).length > 0 && (
            <div>
              <SectionLabel icon={CalendarDays} label="Day-by-Day Program" />
              <div className="mt-2 space-y-3">
                {item.days.map(day => (
                  <div key={day.id || day.dayNumber} className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 flex items-center gap-3 border-b">
                      <span className="text-xs font-black text-blue-600 tracking-widest">DAY {day.dayNumber}</span>
                      <span className="text-sm font-semibold text-slate-800">{day.title}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {day.description && <p className="text-sm text-slate-600 leading-relaxed">{day.description}</p>}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                        {day.overnightCity && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Overnight: {day.overnightCity}</span>}
                        {day.mealNote && <span className="flex items-center gap-1">🍽️ {day.mealNote}</span>}
                        {(day.activityIds || []).length > 0 && <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {day.activityIds.length} Activities</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedInclusions.length > 0   && <ChecklistView icon={ListChecks} label="Inclusions"             items={selectedInclusions}   color="green"  />}
          {selectedExclusions.length > 0   && <ChecklistView icon={X}          label="Exclusions"             items={selectedExclusions}   color="red"    />}
          {selectedTnc.length > 0          && <ChecklistView icon={FileText}   label="Terms & Conditions"     items={selectedTnc}          color="blue"   />}
          {selectedCancellation.length > 0 && <ChecklistView icon={Clock}      label="Cancellation Policy"    items={selectedCancellation} color="amber"  />}
          {selectedImpInfo.length > 0      && <ChecklistView icon={Info}       label="Important Information"  items={selectedImpInfo}      color="purple" />}
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

const colorMap = { green: "text-green-600", red: "text-red-500", blue: "text-blue-600", amber: "text-amber-600", purple: "text-purple-600" };

function ChecklistView({ icon: Icon, label, items, color }) {
  return (
    <div>
      <SectionLabel icon={Icon} label={label} />
      <ul className="mt-2 space-y-1.5">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-2 text-sm text-slate-600">
            <ChevronRight className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colorMap[color] || "text-blue-500"}`} />
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
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedView, setSelectedView] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);

  const fetchItineraries = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "itinerary_templates"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setItineraries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error("Failed to load itineraries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItineraries(); }, []);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteDoc(doc(db, "itinerary_templates", id));
      toast.success("Template deleted");
      setItineraries(prev => prev.filter(item => item.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (id) => router.push(`/admin-panel/itinerary/create?itineraryid=${id}`);

  // ── Filtered list (global — across all data, not just current page) ──────
  const filteredData = useMemo(() => {
    return itineraries.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.title?.toLowerCase().includes(q) ||
        item.state?.toLowerCase().includes(q) ||
        (item.cities || []).some(c => c.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [itineraries, searchQuery, statusFilter]);

  const counts = useMemo(() => ({
    All:       itineraries.length,
    Published: itineraries.filter(i => i.status === "Published").length,
    Draft:     itineraries.filter(i => i.status === "Draft").length,
  }), [itineraries]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Itinerary Templates</h1>
          <p className="text-slate-500 text-sm">Manage and create travel plans for your clients.</p>
        </div>
        <Button
          onClick={() => router.push("/agent-panel/itinerary/create")}
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
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {["All", "Published", "Draft"].map(status => (
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
          Showing {filteredData.length} of {itineraries.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Template Title</TableHead>
              <TableHead className="font-bold text-slate-700">State / Cities</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Duration</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Activities</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-slate-400 text-xs">Loading templates...</p>
                </TableCell>
              </TableRow>
            ) : pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-slate-400 text-sm">
                  {searchQuery ? `No results for "${searchQuery}"` : "No itineraries found."}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map(item => {
                const totalActivities = (item.days || []).reduce((acc, d) => acc + (d.activityIds?.length || 0), 0);
                const nights = item.durationNights ?? ((item.days?.length || 1) - 1);
                const days   = nights + 1;

                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                        v{item.version || 1} · ID: {item.id.slice(0, 8)}…
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />{item.state}
                      </div>
                      {(item.cities || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.cities.slice(0, 3).map((city, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{city}</span>
                          ))}
                          {item.cities.length > 3 && <span className="text-[10px] text-slate-400">+{item.cities.length - 3} more</span>}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-700 text-xs">
                        {nights}N / {days}D
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-slate-700">{totalActivities}</span>
                      <div className="text-[10px] text-slate-400">linked</div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${item.status === "Published" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
                      >
                        {item.status || "Draft"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onSelect={() => setSelectedView(item)}>
                            <Eye className="w-4 h-4 mr-2 text-slate-500" /> Quick View
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleEdit(item.id)}>
                            <Edit className="w-4 h-4 mr-2 text-blue-500" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            onSelect={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {!loading && filteredData.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-700">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredData.length)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{filteredData.length}</span> templates
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold text-slate-700 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Dialog */}
      <QuickViewDialog item={selectedView} open={!!selectedView} onClose={() => setSelectedView(null)} />
    </div>
  );
}