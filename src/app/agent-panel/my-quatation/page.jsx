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
  PackagePlus,
  FileText,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
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
import { getQuotationById } from "@/firebase/quotations";
import { getBookingById } from "@/firebase/bookingsService";
import toast from "react-hot-toast";
import {
  updateLeadStatus,
} from "@/firebase/leadsService";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const router = useRouter();
  const dispatch = useDispatch();

  const [bookingConfirmQuotation, setBookingConfirmQuotation] =
    React.useState(null);
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

    return { totalQuotations, draft, sent, accepted, rejected };
  }, [state.quotations]);

  const paginatedQuotations = sortedQuotations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPages = Math.ceil(sortedQuotations.length / pageSize);

  const handleViewClick = async (q) => {
    setPreviewQuotation(q);
    // Re-fetch from Firestore so convertedToBooking reflects latest state
    try {
      const fresh = await getQuotationById(state.user?.uid, q.id);
      if (fresh)
        setPreviewQuotation((prev) =>
          prev?.id === q.id ? { ...prev, ...fresh } : prev,
        );
    } catch {
      /* use cached version on error */
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [
    state.searchTerm,
    state.startDate,
    state.endDate,
    state.filterDestination,
    state.filterStatus,
    pageSize,
  ]);

  const onNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const onPrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const toDateStr = (d) => {
    if (!d) return "";
    const obj = d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
    if (isNaN(obj.getTime())) return "";
    return obj.toISOString().slice(0, 10);
  };

  const handleConvertToBooking = async (quotation) => {
    if (quotation.convertedToBooking && quotation.bookingId) {
      try {
        const existing = await getBookingById(quotation.bookingId);
        if (existing) {
          toast.error(
            "This quotation has already been converted to a booking.",
          );
          return;
        }
      } catch {
        /* proceed if check fails */
      }
    }
    const hotels = quotation.hotelSummary || [];
    const transport = quotation.transportSummary;
    const activities = quotation.activitySummary || [];
    const services = [
      ...hotels.map((h) => ({
        type: "Hotel",
        description: [
          h.hotel,
          h.selectedRoomCategory,
          h.selectedMealPlan,
          h.nights ? `${h.nights} nights` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        supplier: h.hotel || "",
        confirmationRef: "",
        amount: h.hotelTotal || "",
        advance: "",
        status: "Pending",
      })),
      ...(transport?.vehicleName
        ? [
            {
              type: "Transfer",
              description: `${transport.vehicleName}${transport.ac ? " (AC)" : ""}`,
              supplier: "",
              confirmationRef: "",
              amount: transport.totalTransportCost || "",
              advance: "",
              status: "Pending",
            },
          ]
        : []),
      ...activities.map((a) => ({
        type: "Sightseeing",
        description: [a.name, a.city].filter(Boolean).join(" · "),
        supplier: "",
        confirmationRef: "",
        amount: a.totalPrice || "",
        advance: "",
        status: "Pending",
      })),
    ];
    const prefill = {
      customerName: quotation.customerName || quotation.leadName || "",
      destination: state.getDestinationOfpkg(quotation) || "",
      startDate: toDateStr(hotels[0]?.checkInDate),
      endDate: toDateStr(hotels[hotels.length - 1]?.checkOutDate),
      adults: 1,
      children: 0,
      status: "Pending",
      totalAmount: quotation.grandTotal || "",
      notes:
        `Converted from quotation ${quotation.quoteNumber || quotation.refNumber || ""}`.trim(),
      services,
      payments: [],
      quotationId: quotation.id,
      // Carry over hotelSummary so BookingDetailPage can build vouchers from it
      hotelSummary: quotation.hotelSummary || [],
    };
    sessionStorage.setItem("bookingPrefill", JSON.stringify(prefill));
    router.push("/agent-panel/bookings/create?fromQuotation=true");
  };

  const handleStatusChangeWithConvertPrompt = async (
    quotationId,
    nextStatus,
  ) => {
    const quotation = state.quotations.find((q) => q.id === quotationId);

    await state.handleQuotationStatusChange(quotationId, nextStatus);

    if (quotation?.leadId) {
      if (nextStatus === "Sent") {
        await updateLeadStatus(quotation.leadId, "Quotation Sent");
      }
      if (nextStatus === "Accepted") {
        await updateLeadStatus(quotation.leadId, "Closed Won");
      }
    }

    // Prompt to create booking when accepted (existing behaviour, unchanged)
    if (nextStatus !== "Accepted" || !quotation || quotation.convertedToBooking)
      return;

    setBookingConfirmQuotation(quotation);
  };

  const handleEditRedirect = (quotation) => {
    dispatch(setEditingQuotation(quotation));

    const params = new URLSearchParams();
    params.set("quotationId", quotation.id);
    if (quotation.customerId) params.set("customerId", quotation.customerId);
    if (quotation.leadId) params.set("leadId", quotation.leadId);

    router.push(`/agent-panel/my-quatation/create?${params.toString()}`);
  };

  // Auto-open edit modal when editId is in URL
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

  const handleSendReminder = async (quotation) => {
    let guestPhone = quotation?.customerMobile || quotation?.mobile || "";

    if (!guestPhone && quotation?.leadId) {
      try {
        const leadSnap = await getDoc(doc(db, "leads", quotation.leadId));
        if (leadSnap.exists()) guestPhone = leadSnap.data()?.mobile || "";
      } catch {
        /* continue without phone */
      }
    }
    if (!guestPhone && quotation?.customerId) {
      try {
        const customerSnap = await getDoc(
          doc(db, "customers", quotation.customerId),
        );
        if (customerSnap.exists())
          guestPhone = customerSnap.data()?.mobile || "";
      } catch {
        /* continue without phone */
      }
    }

    const name = quotation?.customerName || quotation?.leadName || "there";
    const pkg = quotation?.packageName || quotation?.itineraryTitle || "";
    const dest = quotation?.destination || pkg || "your upcoming trip";
    const ref = quotation?.refNumber
      ? `\nQuotation Ref: *${quotation.refNumber}*`
      : "";

    const message = [
      `Hi ${name} 👋`,
      ``,
      `Hope you're doing well! We wanted to follow up on the travel quotation we shared with you for *${dest}*.`,
      ``,
      `Have you had a chance to review it? We'd love to answer any questions or customise the package further for you.${ref}`,
      ``,
      `Feel free to reach out anytime — we're here to make your trip unforgettable! 😊`,
      ``,
      `Warm regards,`,
      `*Adwait Tours*`,
      `📞 +91 9884798483 | 🌐 www.adwaittours.com`,
    ].join("\n");

    const digits = String(guestPhone).replace(/\D/g, "");
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    if (!phone) toast("Opening WhatsApp. Select the guest manually.");
  };

  if (state.loading)
    return <p className="p-8 text-center">Authenticating...</p>;
  if (state.isFetchingQuotations)
    return <p className="p-8 text-center">Loading quotations...</p>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* ── Overview metric cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div
          onClick={() => state.setFilterStatus("")}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${state.filterStatus === "" ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"}`}
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
        </div>

        <div
          onClick={() =>
            state.setFilterStatus(state.filterStatus === "Draft" ? "" : "Draft")
          }
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${state.filterStatus === "Draft" ? "border-gray-500 ring-2 ring-gray-200" : "border-slate-200"}`}
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
        </div>

        <div
          onClick={() =>
            state.setFilterStatus(state.filterStatus === "Sent" ? "" : "Sent")
          }
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${state.filterStatus === "Sent" ? "border-amber-500 ring-2 ring-amber-200" : "border-slate-200"}`}
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
        </div>

        <div
          onClick={() =>
            state.setFilterStatus(
              state.filterStatus === "Accepted" ? "" : "Accepted",
            )
          }
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${state.filterStatus === "Accepted" ? "border-green-500 ring-2 ring-green-200" : "border-slate-200"}`}
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
        </div>

        <div
          onClick={() =>
            state.setFilterStatus(
              state.filterStatus === "Rejected" ? "" : "Rejected",
            )
          }
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${state.filterStatus === "Rejected" ? "border-red-500 ring-2 ring-red-200" : "border-slate-200"}`}
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
        </div>
      </div>

      {state.quotations.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <p className="text-slate-500 mb-4">No quotations found.</p>
          <Button
            className="bg-theme-primary text-white"
            onClick={() => router.push("/agent-panel/my-quatation/create")}
          >
            + Create Quotation
          </Button>
        </div>
      ) : (
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
          filterStatus={state.filterStatus}
          setFilterStatus={state.setFilterStatus}
          getDestinationOfpkg={state.getDestinationOfpkg}
          handleViewClick={handleViewClick}
          handleEditClick={state.handleEditClick}
          handleDownloadPDF={handleDownloadPDF}
          handleDeleteQuotation={state.handleDeleteQuotation}
          handleQuotationStatusChange={handleStatusChangeWithConvertPrompt}
          handleCopyToClipboard={handleCopyToClipboard}
          handleShareOnWhatsApp={handleShareOnWhatsApp}
          handleSendReminder={handleSendReminder}
          currentPage={currentPage}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          hasNextPage={currentPage < totalPages}
          hasPrevPage={currentPage > 1}
          isFetching={state.isFetchingQuotations}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalItems={sortedQuotations.length}
          handleEditRedirect={handleEditRedirect}
        />
      )}

      {/* ── Quotation Preview Modal ──────────────────────────────────────── */}
      {previewQuotation && (
        <QuotationPreviewModal
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
          onEdit={handleEditRedirect}
          onCopy={handleCopyToClipboard}
          onPDF={handleDownloadPDF}
          onConvertToBooking={handleConvertToBooking}
          onSendReminder={handleSendReminder}
        />
      )}

      {/* ── Convert-to-booking confirmation dialog ───────────────────────── */}
      <Dialog
        open={!!bookingConfirmQuotation}
        onOpenChange={(open) => {
          if (!open) setBookingConfirmQuotation(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Booking?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Quotation for{" "}
            <span className="font-semibold">
              {bookingConfirmQuotation?.customerName}
            </span>{" "}
            has been accepted. Would you like to open the booking form with
            pre-filled details?
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setBookingConfirmQuotation(null)}
            >
              Not Now
            </Button>
            <Button
              className="bg-theme-primary hover:bg-theme-secondary text-white"
              onClick={() => {
                const q = bookingConfirmQuotation;
                setBookingConfirmQuotation(null);
                handleConvertToBooking(q);
              }}
            >
              Yes, Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyQuotations;