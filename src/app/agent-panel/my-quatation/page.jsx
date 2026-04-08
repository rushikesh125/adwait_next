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
import { Button } from "@/components/ui/button";
import { Hotel, Plane } from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { copyPackageSummary } from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [voucherDrawerOpen, setVoucherDrawerOpen] = React.useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] =
    React.useState(null);
  const [activeQuotation, setActiveQuotation] = React.useState(null);

  const [hotelSelectionOpen, setHotelSelectionOpen] = React.useState(false);
  const [hotelList, setHotelList] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 50; // Set default to 50 as requested

  const sortedQuotations = useMemo(() => {
    return [...state.filteredQuotations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [state.filteredQuotations]);

  // Use PAGE_SIZE instead of hardcoded 50
  const paginatedQuotations = sortedQuotations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const totalPages = Math.ceil(sortedQuotations.length / PAGE_SIZE);

  // Update the useEffect that handles pagination reset
  useEffect(() => {
    setCurrentPage(1);
  }, [
    state.searchTerm,
    state.startDate,
    state.endDate,
    state.filterDestination,
  ]);
// Add these functions
  const onNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const onPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };
  // ── Core voucher trigger — works from table row AND from view modal ────────
  const handleGenerateVoucher = (quotation, type) => {
    if (type !== "hotel") {
      // Flight voucher — extend here later
      alert("Flight voucher coming soon");
      return;
    }

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
      alert("No hotel data found in this quotation.");
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
  

  // ── Auto-open edit modal when editId is in URL ────────────────────────────
  useEffect(() => {
    if (editId && state.quotations.length > 0) {
      const quoteToEdit = state.quotations.find((q) => q.id === editId);
      if (quoteToEdit) state.handleEditClick(quoteToEdit);
    }
  }, [editId, state.quotations, state.handleEditClick]);

  // ── PDF download — uses shared exportPackagePDF via adapter ───────────────
  const handleDownloadPDF = (quotation) => {
    const normalized = normaliseQuotation(quotation);
    // Add itinerary data from the stored quotation if present
    if (quotation.itinerarySummary) {
      normalized.itineraryData = quotation.itinerarySummary;
    }
    exportPackagePDF(normalized);
  };

  const handleCopyToClipboard = (quotation) => {
    copyPackageSummary({
      ...normaliseQuotation(quotation),
      hotels: state.allHotels,
    });
  };

  if (state.loading)
    return <p className="p-8 text-center">Authenticating...</p>;
  if (state.isFetchingQuotations)
    return <p className="p-8 text-center">Loading quotations...</p>;
  if (!state.isFetchingQuotations && state.quotations.length === 0)
    return <p className="p-8 text-center">No quotations found.</p>;

  // ── Determine if the currently-viewed quotation is Accepted ──────────────
  const viewedIsAccepted = state.viewingQuotation?.status === "Accepted";

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <QuotationsTable
        filteredQuotations={paginatedQuotations}
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
        handleDownloadPDF={handleDownloadPDF}
        handleDeleteQuotation={state.handleDeleteQuotation}
        handleCopyToClipboard={handleCopyToClipboard}
        handleGenerateVoucher={handleGenerateVoucher}
        currentPage={currentPage}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        hasNextPage={currentPage < totalPages}
        hasPrevPage={currentPage > 1}
        isFetching={state.isFetchingQuotations}
        pageSize={PAGE_SIZE}
      />
      {/* ── Hotel Voucher Drawer ──────────────────────────────────────────── */}
      <HotelVoucherDrawer
        isOpen={voucherDrawerOpen}
        onClose={() => setVoucherDrawerOpen(false)}
        hotelData={selectedHotelForVoucher}
        quotation={activeQuotation}
        agentId={state.user?.uid || ""}
      />

      {/* ── Multi-hotel selection dialog ──────────────────────────────────── */}
      <Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Hotel for Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">
            This quotation has multiple hotels. Pick one to generate a voucher.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {hotelList.map((h, i) => (
              <div
                key={i}
                className="border rounded-xl p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition"
                onClick={() => {
                  setSelectedHotelForVoucher(h);
                  setHotelSelectionOpen(false);
                  setVoucherDrawerOpen(true);
                }}
              >
                <p className="font-semibold text-base text-slate-800">
                  {h.hotelName || "Hotel"}
                </p>
                {(h.city || h.destination) && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {h.city || h.destination}
                  </p>
                )}
                <p className="text-sm mt-2 text-slate-600">
                  {h.checkIn} → {h.checkOut}
                </p>
                <p className="text-sm text-slate-500">
                  {h.roomCategory || "-"} · {h.mealPlan || "-"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quotation View Modal — with Voucher buttons in footer ─────────── */}
      <QuotationModals
        // View modal
        isViewModalOpen={state.isViewModalOpen}
        setIsViewModalOpen={state.setIsViewModalOpen}
        viewingQuotation={state.viewingQuotation}
        // ↓ Pass the voucher trigger + accepted flag so the view modal can render buttons
        onGenerateVoucher={handleGenerateVoucher}
        viewedIsAccepted={viewedIsAccepted}
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
        availableTransportPackagesForSelectedState={
          state.availableTransportPackagesForSelectedState
        }
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
