"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Calendar,  
  Pencil,
  Eye,FilePlus2,
  FilterX
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import { useRouter } from "next/navigation";

export default function LeadsTable({
  leads,
  onStatusChange,
  onCreateQuotation,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

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
    case "New":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Contacted":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Quotation Sent":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "Closed Won":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Closed Lost":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700";
  }
};


  return (
    <div className="space-y-4">
      {/* Search & Header Section */}
      <div className="p-4 bg-white border rounded-lg flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search leads or destinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-lg h-10 border-slate-200"
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="text-slate-500"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Clear Filter
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className=" w-full">
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-5 w-[70px] ">S.No</TableHead>
              <TableHead className="">Lead Name</TableHead>
              <TableHead className="">Destination</TableHead>
              <TableHead className="">Travel Date</TableHead>
              <TableHead  className=" w-[120px]">Created At</TableHead>
              <TableHead className="  w-[140px]">Status</TableHead>
              <TableHead className="  px-6 w-[160px]">Actirons</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody >
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
                  <TableCell className=" pl-5 font-medium text-slate-500">
                    {index + 1}
                  </TableCell>

                  {/* Lead Name */}
                  <TableCell className="  font-semibold text-slate-900">
                    {lead.name}
                  </TableCell>

                <TableCell>
  <div className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
    <MapPin className="h-3.5 w-3.5 text-theme-primary" />
    <span>{lead.destination || "Not specified"}</span>
  </div>
</TableCell>

                 <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDate(lead.travelDate)}</span>
                    </div>
                  </TableCell>
                <TableCell>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDate(lead.createdAt)}</span>
              </div>
            </TableCell>


                  {/* Status */}
               <TableCell>
  <div className="flex items-center gap-2">

    {/* Fixed-width status pill */}
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full border 
      w-[130px] text-center whitespace-nowrap
      ${getStatusStyles(lead.status)}`}
    >
      {lead.status || "New"}
    </span>

    {/* Pencil */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-slate-500 hover:text-slate-800">
          <Pencil className="h-4 w-4" />
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
            onClick={() => onStatusChange(lead.id, status)}
          >
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

  </div>
</TableCell>


                  {/* Actions */}
                  <TableCell className=" px-6">
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
