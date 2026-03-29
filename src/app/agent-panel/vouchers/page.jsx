"use client";

import { useState, useMemo } from "react";
import { 
  FileText, Download, Edit3, Search, Filter, 
  RefreshCw, Plus, Plane, Hotel, Trash2, ChevronDown ,Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, }  from "@/components/ui/dialog";
import { deleteVoucherFromQuotation } from "@/firebase/quotations";
// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import HotelVoucherDrawer from "./hotelVoucher";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Hooks & Logic
import { useQuotationState } from "@/app/hooks/useQuotationState";
import { exportPackagePDF } from "@/lib/exportPackagePDF";
import { normaliseQuotation } from "@/lib/quotationAdapter";
import { updateQuotation } from "@/firebase/quotations";

const VoucherDashboard = () => {
  const state = useQuotationState();
  const [localSearch, setLocalSearch] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [quotationSelectOpen, setQuotationSelectOpen] = useState(false);
const [selectedQuotation, setSelectedQuotation] = useState(null);

const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
const [selectedHotel, setSelectedHotel] = useState(null);

const [hotelSelectionOpen, setHotelSelectionOpen] = useState(false);
const [hotelList, setHotelList] = useState([]);

  // Filter: Show only if voucher exists + Search logic
  const displayedVouchers = useMemo(() => {
    return state.filteredQuotations.filter((q) => {
      const hasVoucher = q.voucherNumber || q.isVoucherGenerated;
      const matchesSearch = 
        q.customerName?.toLowerCase().includes(localSearch.toLowerCase()) ||
        q.voucherNumber?.toLowerCase().includes(localSearch.toLowerCase()) ||
        q.id?.toLowerCase().includes(localSearch.toLowerCase()) ||
        q.destination?.toLowerCase().includes(localSearch.toLowerCase());
      
      return hasVoucher && matchesSearch;
    });
  }, [state.filteredQuotations, localSearch]);
  

  const handleGenerateVoucherFromDashboard = (quotation) => {
  const rawHotels = quotation.hotelSummary || [];

  const hotels = rawHotels.map((h) => ({
    hotelName: h.hotel || h.hotelName || "Hotel",
    city: h.city || "",
    checkIn: h.checkInDate,
    checkOut: h.checkOutDate,
    nights: h.nights || 0,
    rooms: h.numDouble || 0,
    roomCategory: h.selectedRoomCategory || "-",
    mealPlan: h.selectedMealPlan || "-",
  }));

  if (hotels.length === 0) {
    alert("No hotel data found");
    return;
  }

  setSelectedQuotation(quotation);

  if (hotels.length === 1) {
    setSelectedHotel(hotels[0]);
    setVoucherDrawerOpen(true);
  } else {
    setHotelList(hotels);
    setHotelSelectionOpen(true);
  }
};

  const handleDeleteVoucher = async (quotationId) => {
  try {
    await deleteVoucherFromQuotation(state.user.uid, quotationId);
    alert("Voucher deleted ✅");
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Failed to delete voucher");
  }
};


  const handleView = (item) =>{
    setPreviewData(item);
  };

  const handleStatusUpdate = async (quotationId, newStatus) => {
    try {
      await updateQuotation(state.user.uid, quotationId, { status: newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDownload = (quotation) => {
    exportPackagePDF(normaliseQuotation(quotation));
  };

  if (state.isFetchingQuotations) {
    return <div className="p-20 text-center text-slate-500">Loading Voucher Records...</div>;
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="text-blue-600 h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Voucher Management</h1>
              <p className="text-slate-500 text-sm">Manage and track issued travel vouchers.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-white" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Create Flight Voucher
            </Button>
           <Button onClick={() => { setSelectedQuotation(null);
    setSelectedHotel(null); setVoucherDrawerOpen(true); }} >
  <Plus className="mr-2 h-4 w-4" /> Create Hotel Voucher
</Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="border-none shadow-sm bg-white/80 backdrop-blur">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by ID, Voucher No, Client, or Destination..."
                className="pl-10 bg-white border-slate-200"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="text-slate-600 border-slate-200">
              <Filter className="mr-2 h-4 w-4" /> Filter by Status
            </Button>
          </CardContent>
        </Card>

        {/* Updated Table with Separate Columns */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 border-y">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-bold">S.No</TableHead>
                  <TableHead className="font-bold">Quotation ID</TableHead>
                  <TableHead className="font-bold">Voucher No</TableHead>
                  <TableHead className="font-bold">Client</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedVouchers.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                    
                    {/* Quotation ID Column */}
                    <TableCell className="font-mono text-[11px] text-slate-500 uppercase">
                      #{item.id.substring(0, 8)}
                    </TableCell>

                    {/* Voucher Number Column */}
                    <TableCell className="font-mono text-sm font-semibold text-slate-700 uppercase">
                      {item.voucherNumber || `VCH-${item.id.substring(0, 5)}`}
                    </TableCell>

                    <TableCell className="font-medium text-blue-600 hover:underline cursor-pointer">
                      {item.customerName}
                    </TableCell>

                    
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        {item.voucherType === "Hotel" ? (
                          <><Hotel className="h-3.5 w-3.5 text-orange-400" /> Hotel</>
                        ) : (
                          <><Plane className="h-3.5 w-3.5 text-blue-400" /> Flight</>
                        )}
                      </div>
                    </TableCell>

              

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 p-0 px-2 flex items-center gap-1 focus:ring-0">
                            <Badge className={`${
                              item.status === 'SENT' ? 'bg-green-100 text-green-700' : 
                              item.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 
                              'bg-yellow-100 text-yellow-700'} border-none shadow-none text-[10px]`}>
                              {item.status || 'PENDING'}
                            </Badge>
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'PENDING')}>Pending</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'SENT')}>Sent</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusUpdate(item.id, 'CANCELLED')}>Cancelled</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownload(item)}>
                          <Download className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleView(item)}>
                          <Eye className="h-4 w-4 text-slate-500" /> 
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => state.handleEditClick(item)}>
                          <Edit3 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button  variant="ghost" size="sm" className="h-8 w-8 p-0"  onClick={() => handleDeleteVoucher(item.id)}>
                                 <Trash2 className="h-4 w-4 text-red-400" />
                           </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {displayedVouchers.length === 0 && (
              <div className="py-24 text-center">
                <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900">No Vouchers Found</h3>
                <p className="text-slate-500">Only quotations with generated vouchers will appear here.</p>
              </div>
            )}
          </CardContent>
          
        </Card>
            
      </div>
      
    </div>
      <Dialog open={quotationSelectOpen} onOpenChange={setQuotationSelectOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Select quotation</DialogTitle>
    </DialogHeader>

    <div className="max-h-[400px] overflow-y-auto space-y-2">
      {state.filteredQuotations.map((q) => (
        <div
          key={q.id}
          className="border p-3 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => {
            setQuotationSelectOpen(false);
            handleGenerateVoucherFromDashboard(q);
          }}
        >
          <p className="font-semibold">{q.customerName}</p>
          <p className="text-sm text-gray-500">
            {q.destination}
          </p>
        </div>
      ))}
    </div>
  </DialogContent>
</Dialog>

<Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Select hotel</DialogTitle>
    </DialogHeader>

    <div className="grid grid-cols-2 gap-4">
      {hotelList.map((h, i) => (
        <div
          key={i}
          className="border p-4 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => {
            setSelectedHotel(h);
            setHotelSelectionOpen(false);
            setVoucherDrawerOpen(true);
          }}
        >
          <p className="font-semibold">{h.hotelName}</p>
          <p className="text-sm">{h.city}</p>
          <p className="text-sm">
            {h.checkIn} → {h.checkOut}
          </p>
        </div>
      ))}
    </div>
  </DialogContent>
</Dialog>

<HotelVoucherDrawer
  isOpen={voucherDrawerOpen}
  onClose={() => setVoucherDrawerOpen(false)}
  hotelData={selectedHotel}
  quotation={selectedQuotation}
  agentId={state.user?.uid}
/>
    </>
    
  );
};

export default VoucherDashboard;