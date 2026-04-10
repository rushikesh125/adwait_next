"use client";
import React, { useMemo, useState } from "react";
import "@/app/globals.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import QuotationsTable from "./QuotationsTable";

import { useQuotationState } from "@/app/hooks/useQuotationState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Hotel,
  Plane,
  PackagePlus,
  FileText,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { copyPackageSummary } from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";
import { setEditingQuotation } from "@/store/packageSlice";
import { useDispatch } from "react-redux";
import QuotationPreviewModal from "./QuotationPreviewModal";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const router = useRouter();
  const dispatch = useDispatch();
  const [voucherDrawerOpen, setVoucherDrawerOpen] = React.useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] =
    React.useState(null);
  const [activeQuotation, setActiveQuotation] = React.useState(null);

  const [hotelSelectionOpen, setHotelSelectionOpen] = React.useState(false);
  const [hotelList, setHotelList] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  const sortedQuotations = useMemo(() => {
    return [...state.filteredQuotations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [state.filteredQuotations]);
  const overviewMetrics = useMemo(() => {
    const totalQuotations = state.quotations.length;
    const draft = state.quotations.filter(
      (q) => q.status === "Draft" || !q.status,
    ).length;
    const sent = state.quotations.filter((q) => q.status === "Sent").length;
    const accepted = state.quotations.filter(
      (q) => q.status === "Accepted",
    ).length;
    const rejected = state.quotations.filter(
      (q) => q.status === "Rejected",
    ).length;

    return {
      totalQuotations,
      draft,
      sent,
      accepted,
      rejected,
    };
  }, [state.quotations]);
  // Use PAGE_SIZE instead of hardcoded 50
  const paginatedQuotations = sortedQuotations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(sortedQuotations.length / pageSize);
  const handleViewClick = (q) => {
    setPreviewQuotation(q); // ← change this line
  };
  // Update the useEffect that handles pagination reset
  useEffect(() => {
    setCurrentPage(1);
  }, [
    state.searchTerm,
    state.startDate,
    state.endDate,
    state.filterDestination,
    pageSize, // ✅ IMPORTANT
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
  const handleEditRedirect = (quotation) => {
    // Store full quotation in Redux for instant hydration
    dispatch(setEditingQuotation(quotation));

    // Build URL — preserve customerId/leadId if the quotation has them
    const params = new URLSearchParams();
    params.set("quotationId", quotation.id);
    if (quotation.customerId) params.set("customerId", quotation.customerId);
    if (quotation.leadId) params.set("leadId", quotation.leadId);

    router.push(`/agent-panel/my-quatation/create?${params.toString()}`);
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
    normalized.refNumber = quotation.refNumber || null; // ✅ ADD THIS
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PackagePlus className="h-4 w-4 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-slate-500">Total Quotations</p>
              <p className="text-lg font-bold text-slate-900">
                {overviewMetrics.totalQuotations}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-slate-500">Draft</p>
              <p className="text-lg font-bold text-slate-900">
                {overviewMetrics.draft}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Send className="h-4 w-4 text-amber-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-slate-500">Sent</p>
              <p className="text-lg font-bold text-slate-900">
                {overviewMetrics.sent}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-slate-500">Accepted</p>
              <p className="text-lg font-bold text-slate-900">
                {overviewMetrics.accepted}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs text-slate-500">Rejected</p>
              <p className="text-lg font-bold text-slate-900">
                {overviewMetrics.rejected}
              </p>
            </div>
          </div>
        </div>
      </div>
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
        handleViewClick={handleViewClick}
        handleEditClick={state.handleEditClick}
        handleDownloadPDF={handleDownloadPDF}
        handleDeleteQuotation={state.handleDeleteQuotation}
        handleQuotationStatusChange={state.handleQuotationStatusChange}
        handleCopyToClipboard={handleCopyToClipboard}
        handleGenerateVoucher={handleGenerateVoucher}
        currentPage={currentPage}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        hasNextPage={currentPage < totalPages}
        hasPrevPage={currentPage > 1}
        isFetching={state.isFetchingQuotations}
        pageSize={pageSize}
        setPageSize={setPageSize} // ✅ NEW
        totalItems={sortedQuotations.length} // ✅ NEW
        handleEditRedirect={handleEditRedirect}
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
      {/* <QuotationModals
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
      /> */}
      {previewQuotation && (
        <QuotationPreviewModal
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
          onEdit={handleEditRedirect}
          onCopy={handleCopyToClipboard}
          onPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
};

export default MyQuotations;