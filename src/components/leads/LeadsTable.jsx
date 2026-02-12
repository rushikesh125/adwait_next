"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Calendar,  
  Eye,FilePlus2,
  FilterX,
  Pencil, 
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export default function LeadsTable({ leads, onStatusChange, onCreateQuotation }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();


const [editingStatusId, setEditingStatusId] = useState(null);
  const filteredLeads = leads.filter((lead) => {
    const name = lead.name?.toLowerCase() || "";
    const dest = (lead.destination || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || dest.includes(term);
  });

  const formatDate = (value) => {
  if (!value) return "-";

  let date;

  // Firestore Timestamp
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
      case "Closed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search leads or destinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-lg h-10"
          />
        </div>
        {searchTerm && (
          <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")}>
            <FilterX className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className=" min-w-[1000px]">
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[70px] text-center">S.No</TableHead>
              <TableHead className="text-center">Lead Name</TableHead>
              <TableHead className="text-center">Destination</TableHead>
              <TableHead className="text-center">Travel Date</TableHead>
              <TableHead  className=" text-center w-[120px]">Created At</TableHead>
              <TableHead className=" text-center w-[140px]">Status</TableHead>
              <TableHead className=" text-center px-6 w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-center">
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                  No matching leads found
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, index) => (
                <TableRow key={lead.id} className="hover:bg-theme-muted/10">
                  
                  {/* Serial Number */}
                  <TableCell className=" text-center font-medium text-slate-500">
                    {index + 1}
                  </TableCell>

                  {/* Lead Name */}
                  <TableCell className=" text-center font-semibold text-slate-900">
                    {lead.name}
                  </TableCell>

                  {/* Destination Column */}
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-theme-primary" />
                      {lead.destination || "Not specified"}
                    </div>
                  </TableCell>

                  {/* Travel Date */}
                  <TableCell className="text-sm text-slate-600">
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                     {formatDate(lead.travelDate)}
                    </div>
                  </TableCell>

                  {/* Created At */}
                      {/* Travel Date */}
          <TableCell className="text-sm text-slate-600 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(lead.createdAt)}
            </div>
          </TableCell>

            
            <TableCell>
  <div className="flex items-center gap-2">

    {/* VIEW MODE */}
    {editingStatusId !== lead.id && (
      <>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full border 
          w-[130px] text-center whitespace-nowrap
          ${getStatusStyles(lead.status)}`}
        >
          {lead.status || "New"}
        </span>

        <button
          onClick={() => setEditingStatusId(lead.id)}
          className="text-slate-500 hover:text-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </>
    )}

    {/* EDIT MODE */}
    {editingStatusId === lead.id && (
      <DropdownMenu onOpenChange={(open) => !open && setEditingStatusId(null)}>
        <DropdownMenuTrigger asChild>
          <button className="
      flex items-center justify-between
      w-[160px]
      h-8
      px-3
      text-sm
      font-semibold
      rounded-full
      border
      bg-white
      text-slate-800
      hover:bg-slate-50
      focus:outline-none
      focus:ring-2
      focus:ring-theme-primary/30
    "
  >
            {lead.status || "New"}
           <svg
      className="h-4 w-4 ml-2 text-slate-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-40">
          {[
            "New",
            "Contacted",
            "Quotation Sent",
            "Closed Won",
            "Closed Lost",
          ].map((status) => (
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




                  {/* Actions */}
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-theme-primary text-white"
                        onClick={() => router.push(`/agent-panel?leadId=${lead.id}`)}
                      >
                           <FilePlus2 className="h-4 w-4 mr-2" />
                       Create Quotation
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`./leads/${lead.id}`)}
                      >
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
