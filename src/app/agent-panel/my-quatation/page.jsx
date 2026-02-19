"use client";
import React, { useMemo } from "react";
import "@/app/globals.css";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import QuotationsTable from "./QuotationsTable";
import QuotationModals from "./QuotationModals";
import { generateAndDownloadQuotationPDF } from "@/lib/my-quotation-pdf";
import { useQuotationState } from "@/app/hooks/useQuotationState";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  // --- SORTING LOGIC ---
  // We use useMemo to ensure sorting only happens when the quotations change.
  // This sorts by createdAt.seconds in descending order (Newest first).
  const sortedQuotations = useMemo(() => {
    return [...state.filteredQuotations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA; // Descending order
    });
  }, [state.filteredQuotations]);

  // Auto-open edit modal if editId is in URL
  useEffect(() => {
    if (editId && state.quotations.length > 0) {
      const quoteToEdit = state.quotations.find((q) => q.id === editId);
      if (quoteToEdit) {
        state.handleEditClick(quoteToEdit);
      }
    }
  }, [editId, state.quotations, state.handleEditClick]);

  const handleDownloadPDF = (quotation) => {
    generateAndDownloadQuotationPDF(quotation, state.allHotels);
  };

  if (state.loading) return <p className="p-8 text-center">Authenticating...</p>;
  if (state.isFetchingQuotations) return <p className="p-8 text-center">Loading quotations...</p>;
  if (!state.isFetchingQuotations && state.quotations.length === 0) {
    return <p className="p-8 text-center">No quotations found.</p>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <QuotationsTable
        filteredQuotations={sortedQuotations} // Passing sorted data here
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
        handleCopyToClipboard={state.handleCopyToClipboard}
      />

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