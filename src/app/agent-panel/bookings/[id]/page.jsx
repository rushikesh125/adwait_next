"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBookingById, deleteBooking, updateBooking } from "@/firebase/bookingsService";
import { updateQuotation } from "@/firebase/quotations";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Loader2,
  CalendarCheck,
  PlaneTakeoff,
  Hotel,
  TrainFront,
  Car,
  Landmark,
  ShieldCheck,
  MoreHorizontal,
  Users,
  MapPin,
  Calendar,
  Hash,
  FileCheck2,
  PlusCircle,
  XCircle,
  Send,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

const SERVICE_ICONS = {
  Flight: PlaneTakeoff,
  Hotel,
  Rail: TrainFront,
  Transfer: Car,
  Sightseeing: Landmark,
  Visa: ShieldCheck,
  Insurance: ShieldCheck,
  Other: MoreHorizontal,
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatCurrency = (n) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

// ── Extract hotel list from booking ──────────────────────────────────────────
// Primary: hotelSummary copied from quotation at conversion time
// Fallback: Hotel-type services
function extractHotelsFromBooking(booking) {
  if (booking.hotelSummary?.length) {
    return booking.hotelSummary.map((h) => ({
      hotelName: h.hotel || h.hotelName || "Hotel",
      city: h.city || "",
      checkIn: h.checkInDate || h.checkIn || "",
      checkOut: h.checkOutDate || h.checkOut || "",
      nights: h.nights || 0,
      rooms: h.numDouble || 0,
      roomCategory: h.selectedRoomCategory || "-",
      mealPlan: h.selectedMealPlan || "-",
    }));
  }

  return (booking.services || [])
    .filter((s) => s.type === "Hotel")
    .map((s) => ({
      hotelName: s.supplier || s.description || "Hotel",
      city: booking.destination || "",
      checkIn: booking.startDate || "",
      checkOut: booking.endDate || "",
      nights: 0,
      rooms: 0,
      roomCategory: "-",
      mealPlan: "-",
    }));
}

// ── Dedup key for a hotel voucher ─────────────────────────────────────────────
// Used to check if a voucher already exists for a given hotel+checkIn
function hotelVoucherKey(hotelName, checkIn) {
  return `${(hotelName || "").trim().toLowerCase()}||${checkIn || ""}`;
}

// ── Build WhatsApp booking-request message ────────────────────────────────────
function buildBookingRequestMessage(booking) {
  const name = booking.customerName || "there";
  const dest = booking.destination || "your destination";
  const ref = booking.bookingRef ? `\nBooking Ref: *${booking.bookingRef}*` : "";
  const dates =
    booking.startDate && booking.endDate
      ? `\nTravel Dates: *${formatDate(booking.startDate)} → ${formatDate(booking.endDate)}*`
      : "";
  const amount = booking.totalAmount
    ? `\nTotal Amount: *₹${Number(booking.totalAmount).toLocaleString("en-IN")}*`
    : "";

  return [
    `Hi ${name} 👋`,
    ``,
    `We're pleased to confirm your booking for *${dest}*!${ref}${dates}${amount}`,
    ``,
    `Here are your booking details. Please review and let us know if you have any questions or changes.`,
    ``,
    `Looking forward to making your trip unforgettable! 🌍✈️`,
    ``,
    `Warm regards,`,
    `*Adwait Tours*`,
    `📞 +91 9884798483 | 🌐 www.adwaittours.com`,
  ].join("\n");
}

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Voucher drawer state
  const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState(null);
  const [hotelSelectionOpen, setHotelSelectionOpen] = useState(false);
  const [hotelListForSelection, setHotelListForSelection] = useState([]);
  const [deletingVoucherId, setDeletingVoucherId] = useState(null); // tracks in-progress delete

  useEffect(() => {
    (async () => {
      try {
        const data = await getBookingById(id);
        setBooking(data);
      } catch (err) {
        console.error("[BookingDetail] Failed to load booking:", err);
        toast.error("Failed to load booking");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Permanently delete this booking?")) return;
    try {
      await deleteBooking(id);
      // Un-mark the source quotation so it can be re-converted if needed
      if (booking?.quotationId && booking?.agentId) {
        try {
          await updateQuotation(booking.agentId, booking.quotationId, {
            convertedToBooking: false,
            bookingId: null,
          });
        } catch (e) {
          console.warn("[BookingDetail] Could not un-mark quotation (non-critical):", e);
        }
      }
      toast.success("Booking deleted");
      router.push("/agent-panel/bookings");
    } catch (err) {
      console.error("[BookingDetail] Delete failed:", err);
      toast.error("Delete failed");
    }
  };

  // ── Voucher generation ──────────────────────────────────────────────────────
  const handleGenerateVoucher = (type) => {
    if (type !== "hotel") {
      toast("Flight voucher coming soon", { icon: "✈️" });
      return;
    }

    const hotels = extractHotelsFromBooking(booking);
    if (hotels.length === 0) {
      toast.error("No hotel data found in this booking.");
      return;
    }

    if (hotels.length === 1) {
      // Single hotel — check if already has an active (non-deleted) voucher
      const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
      const key = hotelVoucherKey(hotels[0].hotelName, hotels[0].checkIn);
      const alreadyExists = activeVouchers.some(
        (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key
      );
      if (alreadyExists) {
        toast.error(
          `A voucher for "${hotels[0].hotelName}" already exists. Delete it first to create a new one.`
        );
        return;
      }
      setSelectedHotelForVoucher(hotels[0]);
      setVoucherDrawerOpen(true);
    } else {
      setHotelListForSelection(hotels);
      setHotelSelectionOpen(true);
    }
  };

  const handleSelectHotelForVoucher = (hotel) => {
    const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
    const key = hotelVoucherKey(hotel.hotelName, hotel.checkIn);
    const alreadyExists = activeVouchers.some(
      (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key
    );
    if (alreadyExists) {
      toast.error(
        `A voucher for "${hotel.hotelName}" already exists. Delete it first to create a new one.`
      );
      setHotelSelectionOpen(false);
      return;
    }
    setSelectedHotelForVoucher(hotel);
    setHotelSelectionOpen(false);
    setVoucherDrawerOpen(true);
  };

  // Called by HotelVoucherDrawer after saving to the vouchers collection.
  // We also record a lightweight entry on the booking doc so the UI can track it.
  const handleVoucherSaved = async (/* voucherData is not passed by current drawer */) => {
    // Re-fetch latest to get any external updates; we also append a tracking entry.
    try {
      const fresh = await getBookingById(id);
      const hotel = selectedHotelForVoucher;
      const existing = (fresh?.vouchers || []);

      // Only append if not already tracked (guard against double-saves)
      const key = hotelVoucherKey(hotel?.hotelName, hotel?.checkIn);
      const alreadyTracked = existing.some(
        (v) => !v.deleted && hotelVoucherKey(v.hotelName, v.checkIn) === key
      );

      if (!alreadyTracked && hotel) {
        const entry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          type: "hotel",
          hotelName: hotel.hotelName,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          city: hotel.city || "",
          deleted: false,
          createdAt: new Date().toISOString(),
        };
        const updatedVouchers = [...existing, entry];
        await updateBooking(id, { vouchers: updatedVouchers });
        setBooking((prev) => ({ ...prev, vouchers: updatedVouchers }));
      } else {
        setBooking(fresh);
      }
    } catch (err) {
      console.error("[BookingDetail] Failed to track voucher on booking:", err);
      // Non-critical — voucher was saved in the vouchers collection already
      toast("Voucher saved. Could not update booking record.", { icon: "⚠️" });
    }
  };

  // ── Soft-delete a voucher tracking entry ────────────────────────────────────
  const handleDeleteVoucherEntry = async (voucherId) => {
    if (!confirm("Remove this voucher record? This allows creating a new one for the same hotel.")) return;
    setDeletingVoucherId(voucherId);
    try {
      const updated = (booking.vouchers || []).map((v) =>
        v.id === voucherId
          ? { ...v, deleted: true, deletedAt: new Date().toISOString() }
          : v
      );
      await updateBooking(id, { vouchers: updated });
      setBooking((prev) => ({ ...prev, vouchers: updated }));
      toast.success("Voucher record removed. You can now create a new one.");
    } catch (err) {
      console.error("[BookingDetail] Failed to delete voucher entry:", err);
      toast.error("Could not remove voucher record: " + err.message);
    } finally {
      setDeletingVoucherId(null);
    }
  };

  // ── Send Booking Request via WhatsApp ────────────────────────────────────────
  const handleSendBookingRequest = () => {
    const phone = booking?.customerMobile || booking?.mobile || "";
    const message = buildBookingRequestMessage(booking);
    const digits = String(phone).replace(/\D/g, "");
    const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    if (!formattedPhone) {
      toast("Opening WhatsApp. Please select the guest manually.", { icon: "📱" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-theme-primary w-8 h-8" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <CalendarCheck className="w-12 h-12 mb-3 text-slate-200" />
        <p className="font-medium">Booking not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/agent-panel/bookings")}>
          Back to Bookings
        </Button>
      </div>
    );
  }

  const paidAmount = Number(booking.paidAmount) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const balance = totalAmount - paidAmount;

  const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
  const deletedVouchers = (booking.vouchers || []).filter((v) => v.deleted);

  // Build a compatible "quotation-like" object from the booking for HotelVoucherDrawer
  // The drawer expects: customerName, customerMobile, destination, id
  const bookingAsQuotation = {
    id: booking.quotationId || booking.id,
    customerName: booking.customerName || "",
    customerMobile: booking.customerMobile || booking.mobile || "",
    destination: booking.destination || "",
    leadName: booking.customerName || "",
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/agent-panel/bookings")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">
                  {booking.bookingRef}
                </span>
                <StatusBadge
                  status={booking.status || "Pending"}
                  fallback="Pending"
                  className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Created {booking.createdAt?.toDate?.()?.toLocaleDateString("en-GB") || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Send Booking Request via WhatsApp */}
            <Button
              variant="outline"
              onClick={handleSendBookingRequest}
              className="rounded-xl font-bold h-9 text-green-600 border-green-300 hover:bg-green-50"
              title="Send booking details to customer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Request
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/agent-panel/bookings/create?id=${id}`)}
              className="rounded-xl font-bold h-9"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="rounded-xl h-9 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Trip Info */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Trip Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                <InfoItem icon={Users} label="Customer" value={booking.customerName || "—"} />
                <InfoItem icon={MapPin} label="Destination" value={booking.destination || "—"} />
                <InfoItem
                  icon={Hash}
                  label="Pax"
                  value={`${booking.adults || 1} Adults${booking.children ? `, ${booking.children} Children` : ""}`}
                />
                <InfoItem icon={Calendar} label="Start Date" value={formatDate(booking.startDate)} />
                <InfoItem icon={Calendar} label="End Date" value={formatDate(booking.endDate)} />
              </div>
              {booking.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">{booking.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── Vouchers Card ─────────────────────────────────────────────── */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-theme-primary" />
                Vouchers
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 gap-1.5"
                  onClick={() => handleGenerateVoucher("hotel")}
                >
                  <Hotel className="w-3.5 h-3.5" />
                  Hotel Voucher
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 gap-1.5"
                  onClick={() => handleGenerateVoucher("flight")}
                >
                  <PlaneTakeoff className="w-3.5 h-3.5" />
                  Flight Voucher
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {activeVouchers.length === 0 && deletedVouchers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No vouchers created yet. Use the buttons above to generate one.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Active vouchers */}
                  {activeVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-slate-200">
                          <Hotel className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {v.hotelName || "Hotel Voucher"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {v.checkIn && v.checkOut
                              ? `${formatDate(v.checkIn)} → ${formatDate(v.checkOut)}`
                              : v.city || ""}
                            {v.createdAt
                              ? ` · Created ${formatDate(v.createdAt)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                        title="Remove voucher record (allows creating a new one)"
                        disabled={deletingVoucherId === v.id}
                        onClick={() => handleDeleteVoucherEntry(v.id)}
                      >
                        {deletingVoucherId === v.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}

                  {/* Deleted vouchers — shown as muted history */}
                  {deletedVouchers.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600">
                        {deletedVouchers.length} deleted voucher
                        {deletedVouchers.length > 1 ? "s" : ""} (history)
                      </summary>
                      <div className="space-y-2 mt-2">
                        {deletedVouchers.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 opacity-50"
                          >
                            <Hotel className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-500 line-through">
                                {v.hotelName || "Hotel Voucher"}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Deleted {v.deletedAt ? formatDate(v.deletedAt) : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Services ({booking.services?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {!booking.services?.length ? (
                <p className="text-slate-400 text-sm text-center py-4">No services added.</p>
              ) : (
                <div className="space-y-3">
                  {booking.services.map((svc, i) => {
                    const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                    return (
                      <div
                        key={i}
                        className="flex items-start justify-between p-4 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-white border border-slate-200 mt-0.5 shrink-0">
                            <Icon className="w-4 h-4 text-theme-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{svc.type}</span>
                              <StatusBadge
                                status={svc.status || "Pending"}
                                fallback="Pending"
                                className="px-2 py-0.5 text-[9px] font-bold uppercase"
                              />
                            </div>
                            {svc.description && (
                              <p className="text-xs text-slate-600 mt-0.5">{svc.description}</p>
                            )}
                            <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-400">
                              {svc.supplier && (
                                <span>
                                  Supplier:{" "}
                                  <span className="text-slate-600 font-medium">{svc.supplier}</span>
                                </span>
                              )}
                              {svc.confirmationRef && (
                                <span>
                                  Ref:{" "}
                                  <span className="text-slate-600 font-mono font-bold">
                                    {svc.confirmationRef}
                                  </span>
                                </span>
                              )}
                            </div>
                            {(svc.amount || svc.advance) && (
                              <div className="flex flex-wrap gap-4 mt-2 text-[11px]">
                                <span className="text-slate-500">
                                  Total:{" "}
                                  <span className="font-bold text-slate-700">
                                    {svc.amount ? formatCurrency(svc.amount) : "—"}
                                  </span>
                                </span>
                                <span className="text-slate-500">
                                  Advance:{" "}
                                  <span className="font-bold text-emerald-600">
                                    {svc.advance ? formatCurrency(svc.advance) : "₹0"}
                                  </span>
                                </span>
                                <span className="text-slate-500">
                                  Balance:{" "}
                                  <span
                                    className={`font-bold ${
                                      (Number(svc.amount) || 0) - (Number(svc.advance) || 0) > 0
                                        ? "text-rose-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {formatCurrency(
                                      (Number(svc.amount) || 0) - (Number(svc.advance) || 0)
                                    )}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Payment History ({booking.payments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {!booking.payments?.length ? (
                <p className="text-slate-400 text-sm text-center py-4">No payments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {booking.payments.map((pay, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{pay.mode}</span>
                          {pay.reference && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {pay.reference}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(pay.date)}
                          {pay.notes && ` · ${pay.notes}`}
                        </div>
                      </div>
                      <span className="font-black text-emerald-600">
                        {formatCurrency(pay.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Summary */}
        <div className="space-y-5">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <SummaryRow label="Total Amount" value={formatCurrency(totalAmount)} bold />
              <SummaryRow
                label="Amount Paid"
                value={formatCurrency(paidAmount)}
                color="text-emerald-600"
              />
              <SummaryRow
                label="Balance Due"
                value={formatCurrency(balance)}
                color={balance > 0 ? "text-rose-600" : "text-slate-700"}
              />
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Payment Status</span>
                <StatusBadge
                  status={booking.paymentStatus || "Unpaid"}
                  fallback="Unpaid"
                  className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                />
              </div>
            </CardContent>
          </Card>

          {booking.services?.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Services Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                {booking.services.map((svc, i) => {
                  const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                  const svcTotal = Number(svc.amount) || 0;
                  const svcAdvance = Number(svc.advance) || 0;
                  const svcBalance = svcTotal - svcAdvance;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Icon className="w-3.5 h-3.5 text-theme-primary" />
                          <span>
                            {svc.type}
                            {svc.description
                              ? ` · ${svc.description.slice(0, 20)}${svc.description.length > 20 ? "…" : ""}`
                              : ""}
                          </span>
                        </div>
                        <span className="font-bold">
                          {svcTotal ? formatCurrency(svcTotal) : "—"}
                        </span>
                      </div>
                      {(svcAdvance > 0 || svcTotal > 0) && (
                        <div className="flex justify-between text-[10px] pl-5">
                          <span className="text-emerald-600">
                            Adv: {formatCurrency(svcAdvance)}
                          </span>
                          <span className={svcBalance > 0 ? "text-rose-500" : "text-emerald-600"}>
                            Bal: {formatCurrency(svcBalance)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Total Cost</span>
                    <span>
                      {formatCurrency(
                        booking.services.reduce((s, v) => s + (Number(v.amount) || 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-emerald-600">Total Advance</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(
                        booking.services.reduce((s, v) => s + (Number(v.advance) || 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-rose-500">Total Balance</span>
                    <span className="font-bold text-rose-500">
                      {formatCurrency(
                        booking.services.reduce(
                          (s, v) => s + ((Number(v.amount) || 0) - (Number(v.advance) || 0)),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Hotel Voucher Drawer ─────────────────────────────────────────────── */}
      <HotelVoucherDrawer
        isOpen={voucherDrawerOpen}
        onClose={() => {
          setVoucherDrawerOpen(false);
          setSelectedHotelForVoucher(null);
        }}
        hotelData={selectedHotelForVoucher}
        quotation={bookingAsQuotation}
        agentId={booking.agentId || ""}
        onSaved={handleVoucherSaved}
      />

      {/* ── Multi-hotel selection dialog ─────────────────────────────────────── */}
      <Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Hotel for Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">
            This booking has multiple hotels. Pick one to generate a voucher.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {hotelListForSelection.map((h, i) => {
              const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
              const key = hotelVoucherKey(h.hotelName, h.checkIn);
              const hasVoucher = activeVouchers.some(
                (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key
              );
              return (
                <div
                  key={i}
                  onClick={() => !hasVoucher && handleSelectHotelForVoucher(h)}
                  className={`border rounded-xl p-4 transition ${
                    hasVoucher
                      ? "opacity-50 cursor-not-allowed bg-slate-50"
                      : "cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <p className="font-semibold text-base text-slate-800">
                    {h.hotelName || "Hotel"}
                  </p>
                  {h.city && (
                    <p className="text-sm text-slate-500 mt-0.5">{h.city}</p>
                  )}
                  <p className="text-sm mt-2 text-slate-600">
                    {h.checkIn} → {h.checkOut}
                  </p>
                  <p className="text-sm text-slate-500">
                    {h.roomCategory || "-"} · {h.mealPlan || "-"}
                  </p>
                  {hasVoucher && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Voucher already created
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, bold, color }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color || "text-slate-800"}`}>{value}</span>
    </div>
  );
}