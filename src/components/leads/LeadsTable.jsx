"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Calendar,  
  Eye,
  FilePlus2,
  FilterX,
  Pencil,
  Filter, // Added Filter icon
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
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export default function LeadsTable({ leads, onStatusChange, onCreateQuotation }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // New State for Filtering
  const [editingStatusId, setEditingStatusId] = useState(null);
  const router = useRouter();

  const statusOptions = ["New", "Contacted", "Quotation Sent", "Closed Won", "Closed Lost"];

  // Updated filtering logic
  const filteredLeads = leads.filter((lead) => {
    const name = lead.name?.toLowerCase() || "";
    const dest = (lead.destination || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    const status = lead.status || "New";

    const matchesSearch = name.includes(term) || dest.includes(term);
    const matchesStatus = statusFilter === "All" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (value) => {
    if (!value) return "-";
    let date;
    if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (isNaN(date)) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Contacted": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Quotation Sent": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Closed Won": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Closed Lost": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="p-4 bg-white border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads or destinations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-lg h-10"
            />
          </div>

          {/* Status Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-lg border-slate-200">
                <Filter className="h-4 w-4 mr-2 text-slate-500" />
                {statusFilter === "All" ? "Filter by Status" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Lead Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("All")}>
                All Statuses
              </DropdownMenuItem>
              {statusOptions.map((status) => (
                <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
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
            Reset Filters
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[70px] text-center">S.No</TableHead>
              <TableHead className="text-center">Lead Name</TableHead>
              <TableHead className="text-center">Destination</TableHead>
              <TableHead className="text-center">Travel Date</TableHead>
              <TableHead className="text-center w-[120px]">Created At</TableHead>
              <TableHead className="text-center w-[140px]">Status</TableHead>
              <TableHead className="text-center px-6 w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-center">
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                  No leads found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, index) => (
                <TableRow key={lead.id} className="hover:bg-theme-muted/10">
                  <TableCell className="text-center font-medium text-slate-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-center font-semibold text-slate-900">
                    {lead.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex items-center justify-center">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-theme-primary" />
                      {lead.destination || "Not specified"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                     {formatDate(lead.travelDate)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(lead.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {editingStatusId !== lead.id ? (
                        <>
                          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border w-[110px] text-center uppercase tracking-wider ${getStatusStyles(lead.status)}`}>
                            {lead.status || "New"}
                          </span>
                          <button onClick={() => setEditingStatusId(lead.id)} className="text-slate-400 hover:text-slate-800">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <DropdownMenu onOpenChange={(open) => !open && setEditingStatusId(null)}>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-between w-[130px] h-7 px-3 text-[11px] font-bold rounded-full border bg-white text-slate-800 focus:ring-2 focus:ring-theme-primary/30">
                              {lead.status || "New"}
                              <Search className="h-3 w-3 rotate-90" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-40">
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
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" className="bg-theme-primary text-white" onClick={() => router.push(`/agent-panel?leadId=${lead.id}`)}>
                        <FilePlus2 className="h-4 w-4 mr-2" />
                        Quotation
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => router.push(`./leads/${lead.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}