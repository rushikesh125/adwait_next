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
  Plus, // <-- Added Plus icon
} from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import {
  copyPackageSummary,
  sharePackageSummaryOnWhatsApp,
} from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";
import { setEditingQuotation } from "@/store/packageSlice";
import { useDispatch } from "react-redux";
import QuotationPreviewModal from "./QuotationPreviewModal";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";

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

  const paginatedQuotations = sortedQuotations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(sortedQuotations.length / pageSize);

  const handleViewClick = (q) => {
    setPreviewQuotation(q);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    state.searchTerm,
    state.startDate,
    state.endDate,
    state.filterDestination,
    pageSize,
  ]);

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

  const handleGenerateVoucher = (quotation, type) => {
    if (type !== "hotel") {
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
    dispatch(setEditingQuotation(quotation));
    const params = new URLSearchParams();
    params.set("quotationId", quotation.id);
    if (quotation.customerId) params.set("customerId", quotation.customerId);
    if (quotation.leadId) params.set("leadId", quotation.leadId);

    router.push(`/agent-panel/my-quatation/create?${params.toString()}`);
  };

  useEffect(() => {
    if (editId && state.quotations.length > 0) {
      const quoteToEdit = state.quotations.find((q) => q.id === editId);
      if (quoteToEdit) state.handleEditClick(quoteToEdit);
    }
  }, [editId, state.quotations, state.handleEditClick]);

  const handleDownloadPDF = (quotation) => {
    const normalized = normaliseQuotation(quotation);
    if (quotation.itinerarySummary) {
      normalized.itineraryData = quotation.itinerarySummary;
    }
    normalized.refNumber = quotation.refNumber || null;
    exportPackagePDF(normalized);
  };

  const handleCopyToClipboard = (quotation) => {
    copyPackageSummary({
      ...normaliseQuotation(quotation),
      hotels: state.allHotels,
    });
  };

  const handleShareOnWhatsApp = async (quotation) => {
    let guestPhone = quotation?.customerMobile || quotation?.mobile || "";

    if (!guestPhone && quotation?.leadId) {
      try {
        const leadSnap = await getDoc(doc(db, "leads", quotation.leadId));
        if (leadSnap.exists()) {
          guestPhone = leadSnap.data()?.mobile || "";
        }
      } catch (error) {
        console.error("Failed to fetch lead phone for WhatsApp share:", error);
      }
    }

    if (!guestPhone && quotation?.customerId) {
      try {
        const customerSnap = await getDoc(
          doc(db, "customers", quotation.customerId),
        );
        if (customerSnap.exists()) {
          guestPhone = customerSnap.data()?.mobile || "";
        }
      } catch (error) {
        console.error(
          "Failed to fetch customer phone for WhatsApp share:",
          error,
        );
      }
    }

    sharePackageSummaryOnWhatsApp(
      {
        ...normaliseQuotation(quotation),
        hotels: state.allHotels,
      },
      guestPhone,
    );
  };

  if (state.loading)
    return <p className="p-8 text-center text-slate-500">Authenticating...</p>;
  if (state.isFetchingQuotations)
    return <p className="p-8 text-center text-slate-500">Loading quotations...</p>;

  // ❌ REMOVED the early return that was breaking the layout
  // if (!state.isFetchingQuotations && state.quotations.length === 0)
  //   return <p className="p-8 text-center">No quotations found.</p>;

  const viewedIsAccepted = state.viewingQuotation?.status === "Accepted";

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* ── Overview Metrics Grid ── */}
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
        handleShareOnWhatsApp={handleShareOnWhatsApp}
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

      {/* ── Multi-hotel selection dialog ── */}
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

      {/* ── Quotation Preview Modal ── */}
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
