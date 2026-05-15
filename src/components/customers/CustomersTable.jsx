"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2,
  Pencil,
  MapPin,
  Mail,
  Phone,
  User,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Reusable Sortable Header Component ---
const SortableHeader = ({ label, column, sortConfig, onSort }) => {
  const isActive = sortConfig.key === column;
  const Icon = !isActive
    ? ArrowUpDown
    : sortConfig.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      className={`flex items-center justify-start gap-1.5 hover:text-slate-900 transition-colors ${
        isActive ? "text-slate-900" : "text-slate-600"
      }`}
      onClick={() => onSort(column)}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
};

export default function CustomersTable({ customers, onEdit, onDelete }) {
  const router = useRouter();

  // 1. Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  // 2. Memoized Sorted Data
  const sortedCustomers = useMemo(() => {
    if (!sortConfig.key) return customers;

    return [...customers].sort((a, b) => {
      const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      const bVal = (b[sortConfig.key] || "").toString().toLowerCase();

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [customers, sortConfig]);

  return (
    <div className="w-full">
      {sortedCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <User className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
        </div>
      ) : (
        <div className="table-shell">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* Customer Name */}
                <TableHead className="w-[28%]">
                  <SortableHeader
                    label="Customer Name"
                    column="name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </TableHead>

                {/* Phone */}
                <TableHead className="w-[18%]">
                  <SortableHeader
                    label="Phone"
                    column="mobile"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </TableHead>

                {/* Email */}
                <TableHead className="w-[24%]">
                  <SortableHeader
                    label="Email"
                    column="email"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </TableHead>

                {/* Location */}
                <TableHead className="w-[18%]">
                  <SortableHeader
                    label="Location"
                    column="city"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </TableHead>

                {/* Actions - Changed from text-center to text-left to match */}
                <TableHead className="w-[12%] text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedCustomers.map((c, i) => (
                <TableRow
                  key={c.id || i}
                  className="group transition-colors hover:bg-theme-muted/20 cursor-pointer"
                  onClick={() => router.push(`./customers/${c.id}`)}
                >
                  {/* Name: Left Aligned with Avatar */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-theme-muted flex items-center justify-center text-theme-primary font-bold text-xs">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900 truncate">
                        {c.name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Phone: Left Aligned */}
                  <TableCell className="text-slate-600 text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {c.mobile ? (
                        <a href={`tel:${c.mobile}`} className="hover:text-theme-primary hover:underline">{c.mobile}</a>
                      ) : "—"}
                    </div>
                  </TableCell>

                  {/* Email: Left Aligned */}
                  <TableCell className="text-slate-600 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {c.email}
                    </div>
                  </TableCell>

                  {/* Location: Centered */}
                  <TableCell className="text-left">
                    <div className="inline-flex flex-col items-start min-w-[80px]">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-theme-primary/60" />
                        {c.city}
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase pl-5">
                        {c.state}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions: Right Aligned */}
                  <TableCell className="text-center pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <TooltipProvider>
                        <Button
                          size="sm"
                          className="bg-theme-primary hover:bg-theme-secondary text-white h-8 px-3 rounded-md shadow-sm"
                          onClick={() =>
                            router.push(`/agent-panel/my-quotation/create?customerId=${c.id}`)
                          }
                        >
                          <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
                          <span className="text-xs">Quotation</span>
                        </Button>

                        <Button
                          onClick={() => onEdit(c)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-700 hover:text-theme-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          onClick={() => onDelete(c.id)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-700 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
