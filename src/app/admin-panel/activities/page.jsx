"use client";
import React, { useState, useEffect, useMemo } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import EditActivity from "@/components/activity/EditActivity";
import AddActivity from "@/components/activity/AddActivity";
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import {
  MapPin,
  Search,
  Plus,
  Users,
  User,
  Pencil,
  Trash2,
  Activity as ActivityIcon,
  Globe,
  Filter,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// --- Sortable Header ---
const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive ? ArrowUpDown : sortConfig.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      className={`flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase text-[11px] tracking-wider font-bold ${
        isActive ? "text-theme-primary" : "text-slate-600"
      } ${align === "center" ? "mx-auto" : ""}`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className={`h-3 w-3 ${isActive ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
};

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "activities"));
      const activityList = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Deduplicate
      const uniqueMap = new Map();
      const unique = activityList.filter((a) => {
        const key = `${a.name?.toLowerCase()}-${a.state?.toLowerCase()}-${a.city?.toLowerCase()}`;
        if (!uniqueMap.has(key)) { uniqueMap.set(key, true); return true; }
        return false;
      });
      setActivities(unique);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      await deleteDoc(doc(db, "activities", activityId));
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Unique states for filter dropdown
  const uniqueStates = useMemo(
    () => ["All", ...new Set(activities.map((a) => a.state).filter(Boolean))].sort(),
    [activities]
  );

  const processed = useMemo(() => {
    let result = activities.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        a.name?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.state?.toLowerCase().includes(q);
      const matchesState = stateFilter === "All" || a.state === stateFilter;
      return matchesSearch && matchesState;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? "";
        let bVal = b[sortConfig.key] ?? "";
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [activities, searchQuery, stateFilter, sortConfig]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, stateFilter, itemsPerPage]);

  const totalPages = Math.ceil(processed.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = processed.slice(startIndex, startIndex + itemsPerPage);

  const hasFilters = searchQuery || stateFilter !== "All";

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-10 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <div className="p-2 bg-theme-primary/10 rounded-lg">
              <ActivityIcon className="w-6 h-6 text-theme-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Activity Management
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Curate and manage travel experiences across your active destinations.
          </p>
        </div>

        <button
          className="flex items-center gap-2 bg-theme-primary hover:bg-theme-secondary text-white px-6 py-3 rounded-xl shadow-lg shadow-theme-primary/20 transition-all active:scale-95 font-semibold text-sm"
          onClick={() => setShowAddActivityModal(true)}
        >
          <Plus className="w-4 h-4" /> Create New Activity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Experiences</p>
            <p className="text-2xl font-bold text-slate-800">{activities.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Unique States</p>
            <p className="text-2xl font-bold text-slate-800">{uniqueStates.length - 1}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search activities, city, state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg h-10 border-slate-200 focus-visible:ring-theme-primary"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-lg border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                {stateFilter === "All" ? "State" : stateFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by State</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueStates.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStateFilter(s)}>
                  {s === "All" ? "All States" : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchQuery(""); setStateFilter("All"); }}
            className="text-slate-500 hover:text-rose-600"
          >
            <FilterX className="h-4 w-4 mr-2" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="table-shell">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] text-center text-[11px] font-bold text-slate-400">#</TableHead>
              <TableHead className="py-4">
                <SortHeader label="Activity Name" column="name" sortConfig={sortConfig} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="State" column="state" sortConfig={sortConfig} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader label="City" column="city" sortConfig={sortConfig} onSort={handleSort} />
              </TableHead>
              <TableHead className="text-center">
                <SortHeader label="FIT Rate" column="fitRatePerPerson" sortConfig={sortConfig} onSort={handleSort} align="center" />
              </TableHead>
              <TableHead className="text-center">
                <SortHeader label="Group Rate" column="groupRatePerPerson" sortConfig={sortConfig} onSort={handleSort} align="center" />
              </TableHead>
              <TableHead className="text-center pr-6 font-bold text-slate-600 uppercase text-[11px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">
                  No activities found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((activity, index) => (
                <TableRow key={activity.id} className="group hover:bg-theme-muted/10 transition-colors">
                  <TableCell className="text-center font-medium text-slate-400 text-sm">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">{activity.name}</TableCell>
                  <TableCell>
                    <span className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-full font-bold uppercase">
                      {activity.state}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-theme-primary shrink-0" />
                      {activity.city}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        ₹{Number(activity.fitRatePerPerson || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-bold text-theme-primary">
                        ₹{Number(activity.groupRatePerPerson || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center pr-6">
                    <div className="flex justify-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-theme-primary"
                        onClick={() => setEditingActivityId(activity.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {processed.length > 0 && (
        <div className="table-footer-bar flex-wrap px-3 py-3 mt-0">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="text-slate-900">{Math.min(startIndex + itemsPerPage, processed.length)}</span> of{" "}
            <span className="text-slate-900">{processed.length}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-8 border rounded-lg px-2 text-xs text-slate-600"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-xs font-bold text-slate-600 px-3">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 rounded-lg"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddActivityModal && (
        <AddActivity onClose={() => { setShowAddActivityModal(false); fetchActivities(); }} />
      )}
      {editingActivityId && (
        <EditActivity
          activityId={editingActivityId}
          onClose={() => setEditingActivityId(null)}
          onSave={() => { setEditingActivityId(null); fetchActivities(); }}
        />
      )}
    </div>
  );
};

export default Activities;
