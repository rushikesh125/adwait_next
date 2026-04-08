"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Eye,
  FilePlus2,
  FilterX,
  Pencil,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { pageLengthsForPagination } from "@/lib/pagination_size";

// --- Reusable Sortable Header Component ---
const SortHeader = ({ label, column, sortConfig, onSort, align = "start" }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown;

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

export default function LeadsTable({ leads, onStatusChange, onDeleteLead }) {
  const router = useRouter();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [itemsPerPage, setItemsPerPage] = useState(50);
  const statusOptions = [
    "New",
    "Contacted",
    "Quotation Sent",
    "Closed Won",
    "Closed Lost",
  ];

  // --- Logic: Sorting and Filtering ---
  const processedLeads = useMemo(() => {
    // 1. Filter
    let result = leads.filter((lead) => {
      const name = lead.name?.toLowerCase() || "";
      const dest = (lead.destination || "").toLowerCase();
      const term = searchTerm.toLowerCase();
      const status = lead.status || "New";

      const matchesSearch = name.includes(term) || dest.includes(term);
      const matchesStatus = statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // 2. Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
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
    return result;
  }, [leads, searchTerm, statusFilter, sortConfig]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);
  // Pagination Calculations
  const totalPages = Math.ceil(processedLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = processedLeads.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);
    if (isNaN(date)) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "Contacted":
        return "bg-amber-50 text-amber-600 border-amber-100";
      case "Quotation Sent":
        return "bg-purple-50 text-purple-600 border-purple-100";
      case "Closed Won":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Closed Lost":
        return "bg-rose-50 text-rose-600 border-rose-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 bg-white border rounded-xl flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg h-10 border-slate-200 focus-visible:ring-theme-primary"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 rounded-lg border-slate-200"
              >
                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                {statusFilter === "All" ? "Status" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                All Statuses
              </DropdownMenuItem>
              {statusOptions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(searchTerm || statusFilter !== "All") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("All");
            }}
            className="text-slate-500 hover:text-rose-600"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px] text-center text-[11px] font-bold text-slate-400">
                #
              </TableHead>
              <TableHead className="w-[200px] py-4">
                <SortHeader
                  label="Lead Name"
                  column="name"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortHeader
                  label="Destination"
                  column="destination"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="text-center">
                <SortHeader
                  label="Travel Date"
                  column="travelDate"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="text-center">
                <SortHeader
                  label="Created"
                  column="createdAt"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="text-center w-[160px]">
                <SortHeader
                  label="Status"
                  column="status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  align="center"
                />
              </TableHead>
              <TableHead className="text-center pr-6 font-bold text-slate-600 uppercase text-[11px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-center">
            {paginatedLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-slate-500 italic"
                >
                  No leads found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map((lead, index) => (
                <TableRow
                  key={lead.id}
                  className="group hover:bg-theme-muted/10 transition-colors"
                >
                  {/* S.No - Centered */}
                  <TableCell className="text-center font-medium text-slate-500">
                    {startIndex + index + 1}
                  </TableCell>

                  {/* Name - Left Aligned */}
                  <TableCell className="text-left font-semibold text-slate-900">
                    {lead.name}
                  </TableCell>

                  {/* Destination - Left Aligned */}
                  <TableCell className="text-left text-sm text-slate-600">
                    <div className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-theme-primary shrink-0" />
                      {lead.destination || "Not specified"}
                    </div>
                  </TableCell>

                  {/* Travel Date - Centered */}
                  <TableCell className="text-center text-sm text-slate-600">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      {formatDate(lead.travelDate)}
                    </div>
                  </TableCell>

                  {/* Created At - Centered */}
                  <TableCell className="text-center text-sm text-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(lead.createdAt)}
                    </div>
                  </TableCell>

                  {/* Status - Original Editing UI */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {editingStatusId !== lead.id ? (
                        <>
                          <span
                            className={`text-[11px] font-bold px-3 py-1 rounded-full border w-full text-center uppercase tracking-wider ${getStatusStyles(lead.status)}`}
                          >
                            {lead.status || "New"}
                          </span>
                          <button
                            onClick={() => setEditingStatusId(lead.id)}
                            className="text-slate-400 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
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
                            <button className="flex items-center justify-between  h-7 px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800 focus:ring-2 focus:ring-theme-primary/30">
                              {lead.status || "New"}
                              <Search className="h-3 w-3 rotate-90" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-40">
                            {statusOptions.map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() => {
                                  onStatusChange(lead.id, status);
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

                  {/* Actions - Right Aligned */}
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-center gap-1.5">
                      <Button
                        size="sm"
                        className="bg-theme-primary text-white h-8 px-3"
                        onClick={() =>
                          router.push(
                            `/agent-panel/my-quatation/create?leadId=${lead.id}`,
                          )
                        }
                      >
                        <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs">Quotation</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-theme-primary"
                        onClick={() => router.push(`./leads/${lead.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => onDeleteLead(lead.id)}
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

      {/* Pagination Controls */}
      {processedLeads.length > 0 && (
        <div className="flex items-center justify-between px-2 py-2 flex-wrap gap-2">
          {/* LEFT SIDE */}
          <div className="flex items-center gap-4 ">
            <p className="text-xs text-slate-500 font-medium">
              Showing <span className="text-slate-900">{startIndex + 1}</span>{" "}
              to{" "}
              <span className="text-slate-900">
                {Math.min(startIndex + itemsPerPage, processedLeads.length)}
              </span>{" "}
              of <span className="text-slate-900">{processedLeads.length}</span>{" "}
              entries
            </p>

            {/* 🔽 NEW DROPDOWN */}
          
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">
            <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 border rounded-lg px-2 text-xs text-slate-600"
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
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 rounded-lg"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
