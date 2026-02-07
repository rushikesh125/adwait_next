"use client";

import React, { useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Eye,
  FilePlus2,
  FilterX,
  Clock,
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
      case "Closed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
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

      {/* Table Container */}
      <div className="rounded-md border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px] text-center">S.No</TableHead>
                <TableHead className="text-left pl-6">Lead Name</TableHead>
                <TableHead className="text-center">Destination</TableHead>
                <TableHead className="text-center">Travel Date</TableHead>
                <TableHead className="text-center">Created At</TableHead>
                <TableHead className="text-center w-[180px]">Status</TableHead>
                <TableHead className="text-right pr-10 w-[200px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-slate-500"
                  >
                    No matching leads found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead, index) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Serial Number */}
                    <TableCell className="text-center font-medium text-slate-400">
                      {index + 1}
                    </TableCell>

                    {/* Lead Name - Left Aligned for readability */}
                    <TableCell className="pl-6 font-semibold text-slate-900">
                      {lead.name}
                    </TableCell>

                    {/* Destination */}
                    <TableCell>
                      <div className="flex items-center justify-center text-sm text-slate-600">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-theme-primary opacity-80" />
                        {lead.destination || "Not specified"}
                      </div>
                    </TableCell>

                    {/* Travel Date */}
                    <TableCell>
                      <div className="flex items-center justify-center text-sm text-slate-600">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        {formatDate(lead.travelDate)}
                      </div>
                    </TableCell>

                    {/* Created At */}
                    <TableCell>
                      <div className="flex items-center justify-center text-sm text-slate-500">
                        <Clock className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        {formatDate(lead.createdAt)}
                      </div>
                    </TableCell>

                    {/* Status Select */}
                    <TableCell className="text-center">
                      <select
                        value={lead.status || "New"}
                        onChange={(e) =>
                          onStatusChange(lead.id, e.target.value)
                        }
                        className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-theme-primary/20 ${getStatusStyles(lead.status)}`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Quotation Sent">Quotation Sent</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                      </select>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pr-6">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-theme-primary hover:bg-theme-primary/90 text-white h-8"
                          onClick={() =>
                            router.push(`/agent-panel?leadId=${lead.id}`)
                          }
                        >
                          <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
                          Quotation
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-slate-500"
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
    </div>
  );
}
