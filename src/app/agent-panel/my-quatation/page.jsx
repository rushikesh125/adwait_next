"use client";
import React, { useMemo } from "react";
import "@/app/globals.css";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import QuotationsTable from "./QuotationsTable";
import QuotationModals from "./QuotationModals";
import { useQuotationState } from "@/app/hooks/useQuotationState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Shared utilities (same ones used in Create_new_package) ───────────────────
import { exportPackagePDF }   from "@/lib/exportPackagePDF";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { copyPackageSummary } from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");


    const [voucherDrawerOpen, setVoucherDrawerOpen] = React.useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = React.useState(null);
  const [activeQuotation, setActiveQuotation] = React.useState(null);

 const [hotelSelectionOpen, setHotelSelectionOpen] = React.useState(false);
const [hotelList, setHotelList] = React.useState([]);

const handleGenerateVoucher = (quotation, type) => {
const rawHotels = quotation.hotelSummary || quotation.hotel_summary || [];

const hotels = rawHotels.map((h) => ({
  hotelName: h.hotel || h.hotelName || "Hotel",
  city: h.city || "",
  checkIn: h.checkInDate || h.checkIn,
  checkOut: h.checkOutDate || h.checkOut,
  nights: h.nights || 0,
  rooms: h.numDouble || 0,
  roomCategory: h.selectedRoomCategory || "-",
  mealPlan: h.selectedMealPlan || "-",
}));

  if (hotels.length === 0) {
    alert("No hotel data found");
    return;
  }

  setActiveQuotation(quotation);

  if (hotels.length === 1) {
    setSelectedHotelForVoucher(hotels[0]);
    setVoucherDrawerOpen(true);
  } else {
    setHotelList(hotels);
    setHotelSelectionOpen(true);
  }
};
  // ── Sort: newest first ────────────────────────────────────────────────────
  const sortedQuotations = useMemo(() => {
    return [...state.filteredQuotations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [state.filteredQuotations]);

  // ── Auto-open edit modal when editId is in URL ────────────────────────────
  useEffect(() => {
    if (editId && state.quotations.length > 0) {
      const quoteToEdit = state.quotations.find((q) => q.id === editId);
      if (quoteToEdit) state.handleEditClick(quoteToEdit);
    }
  }, [editId, state.quotations, state.handleEditClick]);

  // ── PDF download — uses shared exportPackagePDF via adapter ───────────────
  const handleDownloadPDF = (quotation) => {
    exportPackagePDF(normaliseQuotation(quotation));
  };

  // ── WhatsApp copy — uses shared copyPackageSummary via adapter ────────────
  const handleCopyToClipboard = (quotation) => {
    copyPackageSummary({
      ...normaliseQuotation(quotation),
      hotels: state.allHotels, // needed for GoogleListingURL lookup
    });
  };

  // ── Loading / empty states ────────────────────────────────────────────────
  if (state.loading)
    return <p className="p-8 text-center">Authenticating...</p>;
  if (state.isFetchingQuotations)
    return <p className="p-8 text-center">Loading quotations...</p>;
  if (!state.isFetchingQuotations && state.quotations.length === 0)
    return <p className="p-8 text-center">No quotations found.</p>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <QuotationsTable
        filteredQuotations={sortedQuotations}
        searchTerm={state.searchTerm}
        setSearchTerm={state.setSearchTerm}
        filterDestination={state.filterDestination}
        setFilterDestination={state.setFilterDestination}
        startDate={state.startDate}
        setStartDate={state.setStartDate}
        endDate={state.endDate}
        setEndDate={state.setEndDate}
        getDestinationOfpkg={state.getDestinationOfpkg}
        handleViewClick={state.handleViewClick}
        handleEditClick={state.handleEditClick}
        handleDownloadPDF={handleDownloadPDF}           // ← shared util
        handleDeleteQuotation={state.handleDeleteQuotation}
        handleCopyToClipboard={handleCopyToClipboard}  // ← shared util
        handleGenerateVoucher={handleGenerateVoucher}
      />

      <HotelVoucherDrawer 
        isOpen={voucherDrawerOpen}
        onClose={() => setVoucherDrawerOpen(false)}
        hotelData={selectedHotelForVoucher}
        quotation={activeQuotation}
        agentId={state.user?.uid || ""} // Ensure you pass the correct Agent ID
      /><Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Select hotel to generate voucher</DialogTitle>
            </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
          {hotelList.map((h, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition"
              onClick={() => {
                setSelectedHotelForVoucher(h);
                setHotelSelectionOpen(false);
                setVoucherDrawerOpen(true);
              }}
            >
              <p className="font-semibold text-base">
                {h.hotelName || "Hotel"}
              </p>

              <p className="text-sm text-gray-500">
                {h.city || h.destination || ""}
              </p>

              <p className="text-sm mt-1">
                {(h.checkIn || h.checkInDate)} → {(h.checkOut || h.checkOutDate)}
              </p>

              <p className="text-sm text-gray-600">
                {h.roomCategory || h.roomType || "-"}
              </p>
            </div>
          ))}
        </div>
          </DialogContent>
        </Dialog>
      

      <QuotationModals
        // View modal
        isViewModalOpen={state.isViewModalOpen}
        setIsViewModalOpen={state.setIsViewModalOpen}
        viewingQuotation={state.viewingQuotation}
        // Edit modal
        isEditModalOpen={state.isEditModalOpen}
        setIsEditModalOpen={state.setIsEditModalOpen}
        editingQuotation={state.editingQuotation}
        handleEditChange={state.handleEditChange}
        // Destinations / state selectors
        AllDestinations={state.AllDestinations}
        SelectedDestination={state.SelectedDestination}
        setSelectedDestination={state.setSelectedDestination}
        // Hotels
        selectedHotelToAdd={state.selectedHotelToAdd}
        setSelectedHotelToAdd={state.setSelectedHotelToAdd}
        allHotels={state.allHotels}
        handleAddHotel={state.handleAddHotel}
        handleAddCustomHotel={state.handleAddCustomHotel}
        handleRemoveHotel={state.handleRemoveHotel}
        handleHotelChange={state.handleHotelChange}
        handleHotelSummaryChange={state.handleHotelSummaryChange}
        getAvailableMealPlans={state.getAvailableMealPlans}
        // Transport
        toggleValue={state.toggleValue}
        handleToggle={state.handleToggle}
        handleTransportSummaryChange={state.handleTransportSummaryChange}
        selectedTransportStateId={state.selectedTransportStateId}
        setSelectedTransportStateId={state.setSelectedTransportStateId}
        transportStates={state.transportStates}
        toTitleCase={state.toTitleCase}
        handlePackageChange={state.handlePackageChange}
        availableTransportPackagesForSelectedState={state.availableTransportPackagesForSelectedState}
        handleVehicleChange={state.handleVehicleChange}
        // Activities
        isFetchingActivities={state.isFetchingActivities}
        selectedActivityToAdd={state.selectedActivityToAdd}
        setSelectedActivityToAdd={state.setSelectedActivityToAdd}
        availableActivities={state.availableActivities}
        handleAddActivity={state.handleAddActivity}
        handleAddCustomActivity={state.handleAddCustomActivity}
        handleRemoveActivity={state.handleRemoveActivity}
        handleActivitySummaryChange={state.handleActivitySummaryChange}
        // Markup
        markupMode={state.markupMode}
        setMarkupMode={state.setMarkupMode}
        handleMarkupInputChange={state.handleMarkupInputChange}
        recalculateGrandTotal={state.recalculateGrandTotal}
        // Save actions
        handleUpdateQuotation={state.handleUpdateQuotation}
        handleSaveAs={state.handleSaveAs}
        showSaveAsModal={state.showSaveAsModal}
        setShowSaveAsModal={state.setShowSaveAsModal}
        newPackageName={state.newPackageName}
        setNewPackageName={state.setNewPackageName}
        newCustomerName={state.newCustomerName}
        setNewCustomerName={state.setNewCustomerName}
        handleConfirmSaveAs={state.handleConfirmSaveAs}
      />
    </div>
  );
};

export default MyQuotations;