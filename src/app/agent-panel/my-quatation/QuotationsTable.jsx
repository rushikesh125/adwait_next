"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MoreVertical, 
  Hotel, 
  Plane, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Loader2 
} from "lucide-react";

const STATUS_VARIANT_MAP = {
  Accepted: "success",
  Sent: "default",
  Rejected: "destructive",
};

const QuotationsTable = ({
  filteredQuotations,
  searchTerm,
  setSearchTerm,
  filterDestination,
  setFilterDestination,
  startDate,
  handleGenerateVoucher,
  setStartDate,
  endDate,
  setEndDate,
  getDestinationOfpkg,
  handleViewClick,
  handleEditClick,
  handleDownloadPDF,
  handleDeleteQuotation,
  handleCopyToClipboard,
  // Pagination Props
  currentPage = 1,
  onNextPage,
  onPrevPage,
  hasNextPage = false,
  hasPrevPage = false,
  isFetching = false,
}) => {
  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDestination?.("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchTerm || filterDestination || startDate || endDate;

  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">My Quotations</h1>
          <p className="text-muted-foreground mt-1">Manage and edit your travel quotations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Total results found: {filteredQuotations.length}</span>
        </div>
      </div>

      <Card className="border-theme-muted shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-xl text-theme-primary">All Quotations (Newest First)</CardTitle>

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search" className="text-sm">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by customer, package, or destination..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm">From Date</Label>
                  <Input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm">To Date</Label>
                  <Input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="h-10 whitespace-nowrap"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-theme-muted/30 hover:bg-theme-muted/50">
                  <TableHead className="w-24">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Fetching quotations...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No quotations match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotations.map((q, ind) => {
                    const isAccepted = q.status === "Accepted";
                    // Calculate order number based on 10 records per page
                    const orderNumber = (currentPage - 1) * 10 + ind + 1;

                    return (
                      <TableRow
                        key={q.id}
                        className="cursor-pointer hover:bg-theme-muted/20 transition-colors"
                        onClick={() => handleViewClick(q)}
                      >
                        <TableCell className="font-medium text-theme-primary">#{orderNumber}</TableCell>
                        <TableCell className="font-medium">{q.customerName || q.leadName || "—"}</TableCell>
                        <TableCell className="max-w-[160px] truncate" title={q.packageName}>{q.packageName || "—"}</TableCell>
                        <TableCell className="whitespace-pre-line max-w-[180px] text-sm text-muted-foreground">
                          {getDestinationOfpkg(q)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {q.createdAt
                            ? new Date(q.createdAt.seconds * 1000).toLocaleDateString("en-GB")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT_MAP[q.status] || "secondary"}>
                            {q.status || "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(q)} title="View Quotation" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)} title="Edit Quotation" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(q)} title="Download PDF" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(q)} title="Copy Summary" className="h-8 w-8">
                              <Copy className="h-4 w-4" />
                            </Button>

                            {isAccepted ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Voucher Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleGenerateVoucher(q, "hotel")}>
                                    <Hotel className="mr-2 h-4 w-4" /> Hotel Voucher
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleGenerateVoucher(q, "flight")}>
                                    <Plane className="mr-2 h-4 w-4" /> Flight Voucher
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-40 cursor-not-allowed"
                                      disabled
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs">Vouchers are created for accepted quotations</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive/90 h-8 w-8"
                                  title="Delete Quotation"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the quotation for &quot;
                                    {q.customerName || q.leadName}&quot;. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteQuotation(q.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* ── Pagination Controls ────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page <strong>{currentPage}</strong>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevPage}
                disabled={!hasPrevPage || isFetching}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!hasNextPage || isFetching}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default QuotationsTable;