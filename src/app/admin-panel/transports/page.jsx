"use client";
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/firebase/config";
import { orgFilter } from "@/firebase/orgScope";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Plus,
  Pencil,
  MapPin,
  Car,
  Truck,
  Users,
  Filter,
  FilterX,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

import Createpackage from "@/components/transports/CreatePackage";
import EditPackage from "@/components/transports/EditPackage";

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

const pricingBadgeClass = (type) =>
  type === "perKm"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

const Transport = () => {
  const { user } = useSelector((state) => state.auth);
  const [showModal, setShowModal] = useState(false);
  const [packagesByState, setPackagesByState] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [editingData, setEditingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: "stateName", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const fetchTransportData = async () => {
    if (!user?.orgId) {
      setPackagesByState([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, "transport"), ...orgFilter(user.orgId)),
      );
      const stateData = await Promise.all(
        snapshot.docs.map(async (stateDoc) => {
          const pkgSnap = await getDocs(
            query(
              collection(db, "transport", stateDoc.id, "packages"),
              ...orgFilter(user.orgId),
            ),
          );
          const packages = pkgSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return { id: stateDoc.id, stateName: stateDoc.data().stateName, packages };
        })
      );
      setPackagesByState(stateData.filter((s) => s.packages.length > 0));
    } catch (err) {
      console.error("Error fetching:", err);
      toast.error("Failed to load transport data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransportData(); }, [showModal, user?.orgId]);

  // Flatten to one row per package
  const flatRows = useMemo(() =>
    packagesByState.flatMap((state) =>
      state.packages.map((pkg) => ({
        stateId: state.id,
        stateName: state.stateName,
        pkg,
      }))
    ), [packagesByState]
  );

  const uniqueStates = useMemo(
    () => ["All", ...new Set(packagesByState.map((s) => s.stateName))].sort(),
    [packagesByState]
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const processed = useMemo(() => {
    let result = flatRows.filter((row) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        row.stateName?.toLowerCase().includes(q) ||
        row.pkg.name?.toLowerCase().includes(q) ||
        row.pkg.description?.toLowerCase().includes(q) ||
        row.pkg.pricingType?.toLowerCase().includes(q);
      const matchesState = stateFilter === "All" || row.stateName === stateFilter;
      return matchesSearch && matchesState;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = sortConfig.key === "stateName" ? a.stateName : a.pkg[sortConfig.key] ?? "";
        let bVal = sortConfig.key === "stateName" ? b.stateName : b.pkg[sortConfig.key] ?? "";
        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [flatRows, searchTerm, stateFilter, sortConfig]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, stateFilter, itemsPerPage]);

  const totalPages = Math.ceil(processed.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = processed.slice(startIndex, startIndex + itemsPerPage);

  const hasFilters = searchTerm || stateFilter !== "All";

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-10 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <div className="p-2 bg-theme-primary/10 rounded-lg">
              <Truck className="w-6 h-6 text-theme-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Transport Management
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Fleet packages and pricing across all destinations.
          </p>
        </div>

        <Button
          className="bg-theme-primary hover:bg-theme-secondary text-white px-6 py-3 rounded-xl shadow-lg shadow-theme-primary/20 transition-all active:scale-95 font-semibold text-sm h-auto"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Create Package
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Packages</p>
            <p className="text-2xl font-bold text-slate-800">{flatRows.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active States</p>
            <p className="text-2xl font-bold text-slate-800">{packagesByState.length}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="table-toolbar mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search packages, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            variant="ghost" size="sm"
            onClick={() => { setSearchTerm(""); setStateFilter("All"); }}
            className="text-slate-500 hover:text-rose-600"
          >
            <FilterX className="h-4 w-4 mr-2" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-theme-primary mb-4" />
          <p className="font-medium">Loading transport data...</p>
        </div>
      ) : (
        <div className="table-shell">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-center text-[11px] font-bold text-slate-400">#</TableHead>
                <TableHead className="py-4">
                  <SortHeader label="State" column="stateName" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead>
                  <SortHeader label="Package Name" column="name" sortConfig={sortConfig} onSort={handleSort} />
                </TableHead>
                <TableHead className="text-center">
                  <SortHeader label="Pricing Type" column="pricingType" sortConfig={sortConfig} onSort={handleSort} align="center" />
                </TableHead>
                <TableHead className="text-center font-bold text-slate-600 uppercase text-[11px]">
                  Vehicles
                </TableHead>
                <TableHead className="text-center pr-6 font-bold text-slate-600 uppercase text-[11px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">
                    No transport packages found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, index) => (
                  <TableRow key={`${row.stateId}-${index}`} className="group hover:bg-theme-muted/10 transition-colors">
                    <TableCell className="text-center font-medium text-slate-400 text-sm">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-theme-primary shrink-0" />
                        <span className="font-semibold text-slate-700">{row.stateName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {row.pkg.pricingType === "perKm" ? "Standard Fleet Rates" : (row.pkg.name || "—")}
                      {row.pkg.description && (
                        <p className="text-[11px] text-slate-400 font-normal truncate max-w-[220px]">
                          {row.pkg.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-bold capitalize ${pricingBadgeClass(row.pkg.pricingType)}`}
                      >
                        {row.pkg.pricingType === "perKm" ? "Per KM" : "Lump Sum"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">
                          {row.pkg.vehicles?.length ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-400">vehicles</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-theme-primary"
                        onClick={() => setEditingData({ pkg: row.pkg, stateId: row.stateId })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && processed.length > 0 && (
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
      {showModal && <Createpackage onClose={() => setShowModal(false)} />}
      {editingData && (
        <EditPackage
          stateId={editingData.stateId}
          originalPackage={editingData.pkg}
          packageId={editingData.pkg.id}
          pricingType={editingData.pkg.pricingType}
          onClose={() => setEditingData(null)}
          onSuccess={() => {
            fetchTransportData();
            toast.success("Package updated successfully");
          }}
        />
      )}
    </div>
  );
};

export default Transport;
