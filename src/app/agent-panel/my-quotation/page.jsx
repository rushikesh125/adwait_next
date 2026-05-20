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
  CalendarCheck,
} from "lucide-react";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import {
  buildQuotationSummaryPayload,
  copyPackageSummary,
  sharePackageSummaryOnWhatsApp,
} from "@/lib/copyPackageSummary";
import { setEditingQuotation } from "@/store/packageSlice";
import { useDispatch } from "react-redux";
import QuotationPreviewModal from "./QuotationPreviewModal";
import { db } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { getQuotationById } from "@/firebase/quotations";
import { getBookingById } from "@/firebase/bookingsService";
import toast from "react-hot-toast";
import { updateLeadStatus } from "@/firebase/leadsService";
import FollowUpForm from "@/components/followups/FollowUpForm";
import QuotationSentFollowUpPrompt from "@/components/followups/QuotationSentFollowUpPrompt";
import { addFollowUp } from "@/firebase/followUpService";
import QuotationRejectionDialog from "@/components/QuotationRejectionDialog";
import { createNotification } from "@/firebase/notificationsService";

const MyQuotations = () => {
  const state = useQuotationState();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const quoteId = searchParams.get("quoteId");
  const router = useRouter();
  const dispatch = useDispatch();

  const [bookingConfirmQuotation, setBookingConfirmQuotation] =
    React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  // Add this state near your other useState declarations
  const [optionSelectQuotation, setOptionSelectQuotation] = useState(null);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const [sentFollowUpQuotation, setSentFollowUpQuotation] = useState(null);
  const [showSentFollowUpPrompt, setShowSentFollowUpPrompt] = useState(false);
  const [showSentFollowUpForm, setShowSentFollowUpForm] = useState(false);
  const [rejectionQuotation, setRejectionQuotation] = useState(null);
  const [isRejectingQuotation, setIsRejectingQuotation] = useState(false);

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

  // Step 1: called from table row / preview modal
  const handleConvertToBookingClick = (quotation) => {
    const hasMulti =
      Array.isArray(quotation.packageOptions) &&
      quotation.packageOptions.length > 1;

    if (hasMulti) {
      setSelectedOptionIdx(0);
      setOptionSelectQuotation(quotation);
    } else {
      handleConvertToBooking(quotation, null); // null = use first option
    }
  };

  // Step 2: actual conversion (now accepts a chosen option)
  // Step 2: actual conversion (now accepts a chosen option)
  const handleConvertToBooking = async (quotation, chosenOption) => {
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
        /* proceed */
      }
    }

    const finalOption =
      chosenOption ??
      (Array.isArray(quotation.packageOptions) &&
        quotation.packageOptions[0]) ??
      null;

    const hotels = finalOption?.hotelEntries ?? quotation.hotelSummary ?? [];
    const transport = quotation.transportSummary;
    const activities = quotation.activitySummary || [];

    // ── Compute adults & children from roomCategories ──────────────────────
    // Each roomCategory row: numDouble doubles = numDouble*2 adults
    // numExtraAdult = extra adults on top, numExtraChild = children, numCNB = child no bed
    const computeOccupancy = (hotelEntries) => {
      let totalAdults = 0;
      let totalChildren = 0;

      for (const h of hotelEntries) {
        const rooms = h.roomCategories || [];
        if (rooms.length > 0) {
          for (const rc of rooms) {
            totalAdults += (rc.numDouble ?? 0) * 2 + (rc.numExtraAdult ?? 0);
            totalChildren += (rc.numExtraChild ?? 0) + (rc.numCNB ?? 0);
          }
        } else {
          // Legacy flat structure fallback
          totalAdults += (h.numDouble ?? 1) * 2 + (h.numExtraAdult ?? 0);
          totalChildren += (h.numExtraChild ?? 0) + (h.numCNB ?? 0);
        }
      }

      // Deduplicate: if multiple hotels cover the same nights, take the max
      // (since rooms repeat per hotel, not per night)
      // Use the first hotel entry's occupancy as the "per-trip" count
      if (hotelEntries.length > 1) {
        const first = hotelEntries[0];
        const firstRooms = first.roomCategories || [];
        let firstAdults = 0;
        let firstChildren = 0;
        if (firstRooms.length > 0) {
          for (const rc of firstRooms) {
            firstAdults += (rc.numDouble ?? 0) * 2 + (rc.numExtraAdult ?? 0);
            firstChildren += (rc.numExtraChild ?? 0) + (rc.numCNB ?? 0);
          }
        } else {
          firstAdults = (first.numDouble ?? 1) * 2 + (first.numExtraAdult ?? 0);
          firstChildren = (first.numExtraChild ?? 0) + (first.numCNB ?? 0);
        }
        return { adults: firstAdults || 1, children: firstChildren };
      }

      return {
        adults: totalAdults || 1,
        children: totalChildren,
      };
    };

    const { adults, children } = computeOccupancy(hotels);

    // ── Build services with structured hotel data ──────────────────────────
    // ── Build services with structured hotel data (single service per hotel) ──
const services = [
  ...hotels.map((h) => {
    // Collect all room categories into a rooms array
    const roomCategories = h.roomCategories || [];
    const rooms = roomCategories.map((rc) => ({
      _key: Math.random().toString(36).slice(2),
      roomCategory: rc.roomCategory || "",
      mealPlan: rc.mealPlan || "",
      numDouble: rc.numDouble ?? 0,
      numExtraAdult: rc.numExtraAdult ?? 0,
      numExtraChild: rc.numExtraChild ?? 0,
      numCNB: rc.numCNB ?? 0,
    }));

    // If no roomCategories found, fall back to legacy flat fields
    const primaryRoom =
      rooms.length === 0
        ? {
            _key: Math.random().toString(36).slice(2),
            roomCategory:
              h.selectedRoomCategory || h.roomCategory || "",
            mealPlan:
              h.selectedMealPlan || h.mealPlan || "",
            numDouble: h.numDouble ?? 1,
            numExtraAdult: h.numExtraAdult ?? 0,
            numExtraChild: h.numExtraChild ?? 0,
            numCNB: h.numCNB ?? 0,
          }
        : null;

    return {
      type: "Hotel",
      hotelData: {
        hotelName: h.hotel || "",
        city: h.city || "",
        state: h.state || "",
        checkInDate: h.checkInDate || "",
        checkOutDate: h.checkOutDate || "",
        nights: h.nights || "",
        rooms: rooms.length > 0 ? rooms : [primaryRoom],
      },
      description: [
        h.hotel,
        h.city,
        rooms.map((r) => r.roomCategory + " · " + r.mealPlan).join(" / "),
        h.nights ? `${h.nights} nights` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      supplier: h.hotel || "",
      confirmationRef: "",
      amount: h.hotelTotal || "",
      advance: "",
      status: "Pending",
    };
  }),
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

    const grandTotal = finalOption?.grandTotal ?? quotation.grandTotal ?? "";

    const prefill = {
      customerName: quotation.customerName || quotation.leadName || "",
      destination: state.getDestinationOfpkg(quotation) || "",
      startDate: toDateStr(hotels[0]?.checkInDate),
      endDate: toDateStr(hotels[hotels.length - 1]?.checkOutDate),
      adults,
      children,
      status: "Pending",
      totalAmount: grandTotal,
      notes:
        `Converted from quotation ${quotation.quoteNumber || quotation.refNumber || ""}`.trim() +
        (finalOption?.name ? ` · ${finalOption.name}` : ""),
      services,
      payments: [],
      quotationId: quotation.id,
      hotelSummary: hotels,
    };

    sessionStorage.setItem("bookingPrefill", JSON.stringify(prefill));
    router.push("/agent-panel/bookings/create?fromQuotation=true");
  };

  const handleStatusChangeWithConvertPrompt = async (
    quotationId,
    nextStatus,
  ) => {
    const quotation = state.quotations.find((q) => q.id === quotationId);
    if (!quotation) {
      toast.error("Quotation not found.");
      return;
    }

    if (nextStatus === "Rejected") {
      if (quotation.status === "Rejected") return;
      setRejectionQuotation(quotation);
      return;
    }

    const didUpdate = await state.handleQuotationStatusChange(
      quotationId,
      nextStatus,
    );
    if (!didUpdate) return;
    if (quotation?.leadId) {
      if (nextStatus === "Sent")
        await updateLeadStatus(quotation.leadId, "Quotation Sent");
      if (nextStatus === "Accepted")
        await updateLeadStatus(quotation.leadId, "Closed Won");
    }

    // ── NEW: trigger follow-up prompt when marked Sent ──────────────────────
    if (nextStatus === "Sent" && quotation) {
      setSentFollowUpQuotation({ ...quotation, status: "Sent" });
      setShowSentFollowUpPrompt(true);
    }

    if (nextStatus !== "Accepted" || !quotation || quotation.convertedToBooking)
      return;
    setBookingConfirmQuotation(quotation);
  };

  const handleQuotationRejectConfirm = async (rejection) => {
    if (!rejectionQuotation) return;

    setIsRejectingQuotation(true);
    try {
      const didUpdate = await state.handleQuotationStatusChange(
        rejectionQuotation.id,
        "Rejected",
        {
          rejectionReason: rejection.reason || "",
          rejectionComment: rejection.comment || "",
          rejectionDetails: rejection.details || "",
          rejectedAt: new Date().toISOString(),
        },
        {
          agentName: state.user?.displayName || state.user?.email || "Agent",
        },
      );

      if (!didUpdate) return;
      toast.success(
        rejectionQuotation.leadId
          ? "Quotation rejected and lead note added."
          : "Quotation rejected.",
      );
      setRejectionQuotation(null);
    } finally {
      setIsRejectingQuotation(false);
    }
  };

  const handleSentFollowUpSchedule = () => {
    setShowSentFollowUpPrompt(false);
    setShowSentFollowUpForm(true);
  };

  const handleSentFollowUpSkip = () => {
    setShowSentFollowUpPrompt(false);
    setSentFollowUpQuotation(null);
  };

  const handleSentFollowUpSubmit = async (formData) => {
    if (!sentFollowUpQuotation?.leadId) {
      toast.error(
        "No lead linked to this quotation — follow-up cannot be saved.",
      );
      setShowSentFollowUpForm(false);
      setSentFollowUpQuotation(null);
      return;
    }
    await addFollowUp(sentFollowUpQuotation.leadId, {
      ...formData,
      agentId: state.user?.uid || "",
      agentName: state.user?.displayName || "Agent",
      quotationIds: [
        ...new Set([
          ...(formData.quotationIds || []),
          sentFollowUpQuotation.id,
        ]),
      ],
      quotationNames: [
        ...new Set([
          ...(formData.quotationNames || []),
          sentFollowUpQuotation.packageName || "",
        ]),
      ],
    });
    toast.success("Follow-up scheduled");
    // Inside handleSentFollowUpSubmit, after addFollowUp succeeds:
    const followUpDateTime = new Date(formData.dateTime);
    const formattedTime = followUpDateTime.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    createNotification({
      userId: state.user?.uid,
      type: "follow_up_reminder",
      title: `Follow-up reminder set`,
      message: `${formData.mode} follow-up for ${sentFollowUpQuotation?.packageName || "quotation"} scheduled at ${formattedTime}.`,
      link: `/agent-panel/leads/${sentFollowUpQuotation?.leadId}`,
      priority: "normal",
    }).catch(console.error);
    setShowSentFollowUpForm(false);
    setSentFollowUpQuotation(null);
  };
  const handleEditRedirect = (quotation) => {
    dispatch(setEditingQuotation(quotation));

    const params = new URLSearchParams();
    params.set("quotationId", quotation.id);
    if (quotation.customerId) params.set("customerId", quotation.customerId);
    if (quotation.leadId) params.set("leadId", quotation.leadId);

    router.push(`/agent-panel/my-quotation/create?${params.toString()}`);
  };

  // Auto-open edit modal when editId is in URL
  useEffect(() => {
    if (editId && state.quotations.length > 0) {
      const quoteToEdit = state.quotations.find((q) => q.id === editId);
      if (quoteToEdit) state.handleEditClick(quoteToEdit);
    }
  }, [editId, state.quotations, state.handleEditClick]);
  // ✅ Auto-open preview modal when quoteId is in URL
  useEffect(() => {
    if (!quoteId || !state.user?.uid) return;

    const openQuotation = async () => {
      // Try from already loaded list
      let quotation = state.quotations.find((q) => q.id === quoteId);

      // If not found → fetch from Firestore
      if (!quotation) {
        try {
          const fresh = await getQuotationById(state.user.uid, quoteId);
          if (fresh) quotation = { ...fresh, id: quoteId };
        } catch (err) {
          console.error("Failed to fetch quotation:", err);
        }
      }

      if (quotation) {
        setPreviewQuotation(quotation); // 👈 THIS opens modal
      }
    };

    openQuotation();
  }, [quoteId, state.quotations, state.user]);

const handleDownloadPDF = (quotation) => {
  const packageOptions =
    quotation.packageOptions?.length > 0
      ? quotation.packageOptions  // already has hotelEntries, grandTotal, markup etc.
      : [
          {
            name: "Option 1",
            hotelEntries: quotation.hotelSummary || [],
            grandTotal: quotation.grandTotal,
            hotelTotal: (quotation.hotelSummary || []).reduce(
              (s, h) => s + Number(h.hotelTotal || 0),
              0,
            ),
            markup: quotation.markup || 0,
            discountAmount: quotation.discount?.amount || 0,
          },
        ];

  const selectedTransport = quotation.transportSummary
    ? {
        selectedVehicle: {
          type: quotation.transportSummary.vehicleName || "",
          price: quotation.transportSummary.vehicleCost || 0,
          perKmprice: quotation.transportSummary.perKmprice || 0,
          ac: quotation.transportSummary.ac || false,
          driverAllowance: quotation.transportSummary.driverAllowance || 0,
        },
        pricingType: quotation.transportSummary.pricingType || "fixed",
        isCustom: quotation.transportSummary.isCustom || false,
      }
    : null;

  const selectedActivities = quotation.activitySummary || [];
  const transportTotalPrice =
    quotation.transportSummary?.totalTransportCost || 0;
  const activityTotalPrice = selectedActivities.reduce(
    (sum, a) => sum + Number(a.totalPrice || 0),
    0,
  );

  const markupType = quotation.markupType || "lumpsum";
  const markupAmount = quotation.markupAmount ?? quotation.markup ?? 0;
  const confirmedMarkup = quotation.markup || 0;
  const appliedDiscount = quotation.discount ?? {
    type: "fixed",
    value: 0,
    notes: "",
    amount: 0,
  };

  exportPackagePDF({
    packageOptions,
    selectedTransport,
    selectedActivities,
    transportTotalPrice,
    activityTotalPrice,
    confirmedMarkup,
    markupType,
    markupAmount,
    customerName: quotation.customerName || quotation.leadName || "",
    packageName: quotation.packageName || "",
    itineraryData: quotation.itinerarySummary || null,
    refNumber: quotation.refNumber || null,
    appliedDiscount,
  });
};

  const handleCopyToClipboard = (quotation) => {
    copyPackageSummary(
      buildQuotationSummaryPayload(quotation, state.allHotels),
    );
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
      buildQuotationSummaryPayload(quotation, state.allHotels),
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
            onClick={() => router.push("/agent-panel/my-quotation/create")}
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
                handleConvertToBookingClick(q);
              }}
            >
              Yes, Create Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Option selector modal ─────────────────────────────────────────── */}
      {optionSelectQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-theme-dark text-white px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">
                Converting to booking
              </p>
              <h2 className="text-base font-bold">
                Select final package option
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                This determines the hotels and total cost for the booking.
              </p>
            </div>

            <div className="p-4 space-y-3">
              {optionSelectQuotation.packageOptions.map((opt, idx) => {
                const isSelected = idx === selectedOptionIdx;
                const hotelTotal =
                  opt.hotelTotal ??
                  (opt.hotelEntries || []).reduce(
                    (s, h) => s + Number(h.hotelTotal || 0),
                    0,
                  );
                const grandTotal = opt.grandTotal ?? hotelTotal;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOptionIdx(idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-theme-primary bg-theme-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "border-theme-primary"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-theme-primary" />
                          )}
                        </div>
                        <span
                          className={`text-sm font-semibold ${isSelected ? "text-theme-primary" : "text-slate-800"}`}
                        >
                          {opt.name}
                        </span>
                      </div>
                      <span
                        className={`text-base font-black flex-shrink-0 ${isSelected ? "text-theme-primary" : "text-slate-700"}`}
                      >
                        ₹
                        {Number(grandTotal).toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>

                    {(opt.hotelEntries || []).length > 0 && (
                      <div className="mt-2 ml-6.5 space-y-1">
                        {(opt.hotelEntries || []).map((h, i) => (
                          <p
                            key={i}
                            className={`text-[11px] truncate ${isSelected ? "text-theme-secondary" : "text-slate-500"}`}
                          >
                            {h.hotel} · {h.city} · {h.nights}N
                          </p>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-4 pb-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptionSelectQuotation(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5"
                onClick={() => {
                  const chosen =
                    optionSelectQuotation.packageOptions[selectedOptionIdx];
                  const q = optionSelectQuotation;
                  setOptionSelectQuotation(null);
                  handleConvertToBooking(q, chosen);
                }}
              >
                <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
                Convert with{" "}
                {optionSelectQuotation.packageOptions[selectedOptionIdx]?.name}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Quotation-Sent Follow-Up Prompt */}
      <QuotationSentFollowUpPrompt
        open={showSentFollowUpPrompt}
        quotation={sentFollowUpQuotation}
        onSchedule={handleSentFollowUpSchedule}
        onSkip={handleSentFollowUpSkip}
      />

      {/* Follow-Up Form */}
      <FollowUpForm
        open={showSentFollowUpForm}
        onClose={() => {
          setShowSentFollowUpForm(false);
          setSentFollowUpQuotation(null);
        }}
        onSubmit={handleSentFollowUpSubmit}
        leadQuotations={sentFollowUpQuotation ? [sentFollowUpQuotation] : []}
        initialData={
          sentFollowUpQuotation
            ? {
                dateTime: "",
                mode: "Call",
                notes: `Follow-up for ${sentFollowUpQuotation.packageName || "quotation"} – awaiting customer response.`,
                quotationIds: [sentFollowUpQuotation.id],
                quotationNames: [sentFollowUpQuotation.packageName || ""],
              }
            : null
        }
        isEdit={false}
      />

      <QuotationRejectionDialog
        open={!!rejectionQuotation}
        quotation={rejectionQuotation}
        isSubmitting={isRejectingQuotation}
        onOpenChange={(open) => {
          if (!open && !isRejectingQuotation) setRejectionQuotation(null);
        }}
        onConfirm={handleQuotationRejectConfirm}
      />
    </div>
  );
};

export default MyQuotations;
