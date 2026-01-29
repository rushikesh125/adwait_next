import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, Download, Edit, Trash2, Copy } from "lucide-react";

const QuotationsTable = ({
  filteredQuotations,
  searchTerm,
  setSearchTerm,
  filterDestination,
  setFilterDestination,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  quotations,
  getDestinationOfpkg,
  handleViewClick,
  handleEditClick,
  handleDownloadPDF,
  handleDeleteQuotation,
  handleCopyToClipboard,
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">
            My Quotations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and edit your travel quotations
          </p>
        </div>
      </div>

      {/* Unified Card with Filters and Table */}
      <Card className="border-theme-muted shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-xl text-theme-primary">
              All Quotations
            </CardTitle>

            {/* Search and Filters */}
            <div className="md:flex flex-col md:flex-row ga-2 md:gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search" className="text-sm">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by customer or package name..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor="destination" className="text-sm">
                  Destination
                </Label>
                <Select
                  value={filterDestination}
                  onValueChange={setFilterDestination}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem>All Destinations</SelectItem>
                    {[
                      ...new Set(quotations.map((q) => getDestinationOfpkg(q))),
                    ].map((dest) => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm">
                    From Date
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm">
                    To Date
                  </Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterDestination("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="h-10"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="rounded-b-md border-t-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-theme-muted/30 hover:bg-theme-muted/50 ">
                  <TableHead className="w-24">Quote No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer hover:bg-theme-muted/20 transition-colors "
                    onClick={() => handleViewClick(q)}
                  >
                    <TableCell className="font-medium">
                      Quote {q.quoteNumber}
                    </TableCell>
                    <TableCell>{q.customerName || "—"}</TableCell>
                    <TableCell>{q.packageName || "—"}</TableCell>
                    <TableCell className="whitespace-pre-line max-w-xs">
                      {getDestinationOfpkg(q)}
                    </TableCell>
                    <TableCell>
                      {q.createdAt
                        ? new Date(
                            q.createdAt.seconds * 1000,
                          ).toLocaleDateString("en-GB")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          q.status === "Accepted"
                            ? "success"
                            : q.status === "Sent"
                              ? "default"
                              : q.status === "Rejected"
                                ? "destructive"
                                : "secondary"
                        }
                      >
                        {q.status || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(q)}
                        title="Edit Quotation"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(q)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            title="Delete Quotation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the quotation for "
                              {q.customerName}". This action cannot be undone.
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyToClipboard(q)}
                        title="Copy Summary"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default QuotationsTable;
