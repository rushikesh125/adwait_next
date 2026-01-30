"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Calendar, 
  FileText, 
  Eye, 
  MoreVertical,
  FilterX
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
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function LeadsTable({ leads, onStatusChange, onCreateQuotation }) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  // Filter Logic: Name or Destination
  const filteredLeads = leads.filter((lead) => {
    const name = lead.name?.toLowerCase() || "";
    const dest = (lead.Destination || lead.destination || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || dest.includes(term);
  });

  // Helper for Status Badge Colors
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
      {/* Search Header Area */}
      <div className="p-4 bg-white border-b flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search leads or destinations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 focus:ring-theme-primary rounded-lg h-10"
          />
        </div>
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSearchTerm("")}
            className="text-slate-500 text-xs"
          >
            <FilterX className="h-4 w-4 mr-2" />
            Clear Filter
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[80px] font-bold text-slate-600">ID</TableHead>
              <TableHead className="font-bold text-slate-600">Lead Details</TableHead>
              <TableHead className="font-bold text-slate-600">Travel Date</TableHead>
              <TableHead className="font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-600 px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-slate-200" />
                    <p>No matching leads found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead, index) => (
                <TableRow key={lead.id} className="group hover:bg-theme-muted/10 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-400">
                    {lead?.id?.slice(0,6)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{lead.name}</span>
                      <span className="flex items-center text-xs text-slate-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1 text-theme-primary" />
                        {lead.Destination || lead.destination || "Not specified"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      {lead.travelDate || "TBD"}
                    </div>
                  </TableCell>

                  <TableCell>
                    <select
                      value={lead.status || "New"}
                      onChange={(e) => onStatusChange(lead.id, e.target.value)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none transition-all ${getStatusStyles(lead.status)}`}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Quotation Sent">Quotation Sent</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </TableCell>

                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="bg-theme-primary hover:bg-theme-secondary text-white shadow-sm"
                        onClick={() => router.push(`/agent-panel?leadId=${lead.id}`)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-2" />
                        Quotation
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-theme-primary hover:bg-theme-muted rounded-full"
                        onClick={()=>router.push(`./leads/${lead.id}`)}
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