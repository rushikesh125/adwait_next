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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardCopy,
  Hotel,
  Plane,
  PackagePlus,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { copyPackageSummary } from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";
import { generateHotelBookingConfirmationMessage } from "@/lib/generateHotelBookingConfirmation";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const { quotations, handleEditClick } = state;
  const [statusFilter, setStatusFilter] = React.useState("All");

  const [voucherDrawerOpen, setVoucherDrawerOpen] = React.useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] =
    React.useState(null);
  const [activeQuotation, setActiveQuotation] = React.useState(null);
  const [hotelSelectionMode, setHotelSelectionMode] = React.useState("voucher");
  const [bookingConfirmationOpen, setBookingConfirmationOpen] =
    React.useState(false);
  const [bookingConfirmationMessage, setBookingConfirmationMessage] =
    React.useState("");
  const [copySuccessMessage, setCopySuccessMessage] = React.useState("");
  const [showDashboard, setShowDashboard] = React.useState(false);

  const [hotelSelectionOpen, setHotelSelectionOpen] = React.useState(false);
  const [hotelList, setHotelList] = React.useState([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const statusFilteredQuotations = useMemo(() => {
    if (statusFilter === "All") return state.filteredQuotations;
    return state.filteredQuotations.filter(
      (quotation) => (quotation.status || "Draft") === statusFilter,
    );
  }, [state.filteredQuotations, statusFilter]);

  const sortedQuotations = useMemo(() => {
    return [...statusFilteredQuotations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [statusFilteredQuotations]);
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

  // Update the useEffect that handles pagination reset
  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(timer);
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
    setHotelSelectionMode("voucher");

    if (hotels.length === 1) {
      setSelectedHotelForVoucher(hotels[0]);
      setVoucherDrawerOpen(true);
    } else {
      setHotelList(hotels);
      setHotelSelectionOpen(true);
    }
  };

  const openBookingConfirmationDialog = (quotation, hotel) => {
    setActiveQuotation(quotation);
    setBookingConfirmationMessage(
      generateHotelBookingConfirmationMessage(quotation, hotel),
    );
    setCopySuccessMessage("");
    setBookingConfirmationOpen(true);
  };

  const handleOpenBookingConfirmation = (quotation, selectedHotel = null) => {
    const rawHotels = quotation.hotelSummary || quotation.hotel_summary || [];
    const hotels = rawHotels.map((hotel) => ({
      ...hotel,
      hotelName: hotel.hotel || hotel.hotelName || "Hotel",
    }));

    if (hotels.length === 0) {
      alert("No hotel data found in this quotation.");
      return;
    }

    if (selectedHotel) {
      openBookingConfirmationDialog(quotation, selectedHotel);
      return;
    }

    setActiveQuotation(quotation);
    setHotelSelectionMode("booking-confirmation");

    if (hotels.length === 1) {
      openBookingConfirmationDialog(quotation, hotels[0]);
      return;
    }

    setHotelList(hotels);
    setHotelSelectionOpen(true);
  };

  const handleCopyBookingConfirmation = async () => {
    try {
      await navigator.clipboard.writeText(bookingConfirmationMessage);
      setCopySuccessMessage("Booking confirmation copied successfully.");
    } catch (error) {
      console.error("Failed to copy booking confirmation:", error);
      alert("Failed to copy booking confirmation.");
    }
  };

  // ── Sort: newest first ────────────────────────────────────────────────────

  // ── Auto-open edit modal when editId is in URL ────────────────────────────
  useEffect(() => {
    if (editId && quotations.length > 0) {
      const quoteToEdit = quotations.find((q) => q.id === editId);
      if (quoteToEdit) handleEditClick(quoteToEdit);
    }
  }, [editId, quotations, handleEditClick]);

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
  const isStatusActive = (value) => statusFilter === value;
  const getTileClassName = (value) =>
    `rounded-xl border bg-white p-4 shadow-sm text-left transition-all ${
      isStatusActive(value)
        ? "border-theme-primary ring-2 ring-theme-primary/20"
        : "border-slate-200 hover:border-slate-300"
    }`;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowDashboard((prev) => !prev)}
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-100 p-2">
              <PackagePlus className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                Quotations Dashboard
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                {showDashboard
                  ? "Hide dashboard"
                  : "Show dashboard"}{" "}
                to view quotation summary and status filters.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="hidden sm:inline">
              {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
            </span>
            {showDashboard ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {showDashboard && (
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className={getTileClassName("All")}
              >
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
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("Draft")}
                className={getTileClassName("Draft")}
              >
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
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("Sent")}
                className={getTileClassName("Sent")}
              >
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
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("Accepted")}
                className={getTileClassName("Accepted")}
              >
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
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("Rejected")}
                className={getTileClassName("Rejected")}
              >
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
              </button>
            </div>
          </div>
        )}
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
        handleViewClick={state.handleViewClick}
        handleEditClick={state.handleEditClick}
        handleDownloadPDF={handleDownloadPDF}
        handleDeleteQuotation={state.handleDeleteQuotation}
        handleQuotationStatusChange={state.handleQuotationStatusChange}
        handleCopyToClipboard={handleCopyToClipboard}
        handleGenerateVoucher={handleGenerateVoucher}
        handleOpenBookingConfirmation={handleOpenBookingConfirmation}
        currentPage={currentPage}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        hasNextPage={currentPage < totalPages}
        hasPrevPage={currentPage > 1}
        isFetching={state.isFetchingQuotations}
        pageSize={pageSize}
        setPageSize={setPageSize} // ✅ NEW
        totalItems={sortedQuotations.length} // ✅ NEW
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
            <DialogTitle>
              {hotelSelectionMode === "booking-confirmation"
                ? "Select Hotel for Booking Request"
                : "Select Hotel for Voucher"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">
            {hotelSelectionMode === "booking-confirmation"
              ? "This quotation has multiple hotels. Pick one to generate a hotel-specific booking confirmation message."
              : "This quotation has multiple hotels. Pick one to generate a voucher."}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {hotelList.map((h, i) => (
              <div
                key={i}
                className="border rounded-xl p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition"
                onClick={() => {
                  setHotelSelectionOpen(false);
                  if (hotelSelectionMode === "booking-confirmation") {
                    handleOpenBookingConfirmation(activeQuotation, h);
                  } else {
                    setSelectedHotelForVoucher(h);
                    setVoucherDrawerOpen(true);
                  }
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

      <Dialog
        open={bookingConfirmationOpen}
        onOpenChange={(open) => {
          setBookingConfirmationOpen(open);
          if (!open) setCopySuccessMessage("");
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Request Message</DialogTitle>
            <DialogDescription>
              Review and edit the generated hotel booking confirmation before copying it.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={bookingConfirmationMessage}
            onChange={(event) => setBookingConfirmationMessage(event.target.value)}
            rows={20}
            className="font-medium"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            {copySuccessMessage && (
              <p className="mr-auto text-sm text-green-600">{copySuccessMessage}</p>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setBookingConfirmationOpen(false);
                setCopySuccessMessage("");
              }}
            >
              Close
            </Button>
            <Button onClick={handleCopyBookingConfirmation} className="gap-2">
              <ClipboardCopy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </DialogFooter>
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
        onOpenBookingConfirmation={handleOpenBookingConfirmation}
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
