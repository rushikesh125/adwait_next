"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  FilePlus2,
  Eye,
  Pencil,
  MapPin,
  Mail,
  Phone,
  User,
  MoreHorizontal,
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

export default function CustomersTable({ customers, setCustomers, onEdit }) {
  const router = useRouter();

  return (
    <div className="w-full">
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
            <User className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
          <p className="text-slate-500 max-w-xs mx-auto">
            Try adjusting your search or add a new customer to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50/50 ">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-bold text-center text-slate-600 uppercase text-[11px] tracking-wider">
                  Customer Info
                </TableHead>
                <TableHead className="py-4 font-bold text-center text-slate-600  uppercase text-[11px] tracking-wider">
                  Location
                </TableHead>
                <TableHead className="py-4 font-bold  text-center text-slate-600   uppercase text-[11px] tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, i) => (
                <TableRow
                  key={c.id || i}
                  className="group transition-colors hover:bg-theme-muted/20"
                >
                  {/* Customer Main Info */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-theme-muted  flex items-center justify-center text-theme-primary font-bold text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 leading-tight">
                          {c.name}
                        </span>
                        <div className="md:flex items-center gap-3 mt-1">
                          <span className="flex items-center text-xs text-slate-500">
                            <Phone className="h-3 w-3 mr-1 text-slate-400" />
                            {c.mobile}
                          </span>
                          <span className="flex items-center text-xs text-slate-500">
                            <Mail className="h-3 w-3 mr-1 text-slate-400" />
                            {c.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Location Info */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <MapPin className="h-3.5 w-3.5 mr-1.5 text-theme-primary/60" />
                        {c.city}
                      </div>
                      <span className="text-[11px] text-slate-500 ml-5 font-semibold uppercase tracking-tighter">
                        {c.state}
                      </span>
                    </div>
                  </TableCell>

                  {/* Refined Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <TooltipProvider>
                        {/* Primary Action: Create Quotation */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-theme-primary hover:bg-theme-secondary text-white h-9 px-4 rounded-lg shadow-sm"
                              onClick={() =>
                                router.push(`/agent-panel?customerId=${c.id}`)
                              }
                            >
                              <FilePlus2 className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">
                                Quotation
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate new package</TooltipContent>
                        </Tooltip>

                        {/* View Action */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() =>
                                router.push(`./customers/${c.id}`)
                              }
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-500 hover:text-theme-primary hover:bg-theme-muted"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Details</TooltipContent>
                        </Tooltip>

                        {/* Edit Action */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-500 hover:text-theme-primary hover:bg-theme-muted"
                              onClick={() => onEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Lead</TooltipContent>
                        </Tooltip>
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
