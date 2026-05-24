"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import {
  getBookingById,
  deleteBooking,
  updateBooking,
  computePaymentStatus,
} from "@/firebase/bookingsService";
import {
  getInvoicesByBooking,
  updatePaymentInInvoice,
} from "@/firebase/invoicesService";
import { updateQuotation } from "@/firebase/quotations";
import {
  ArrowLeft,
  Edit3,
  Pencil,
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
  XCircle,
  MessageCircle,
  AlertTriangle,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Wallet,
  BadgeCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import HotelVoucherDrawer from "@/app/agent-panel/vouchers/hotelVoucher";
import { sendHotelBookingRequestOnWhatsApp } from "@/lib/hotelBookingRequestWhatsapp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Status‑aware vendor payment helpers ─────────────────────────────────────

/** Sum of vendor payments with status "Paid" */
const servicePaid = (svc) =>
  (svc.vendorPayments || []).reduce(
    (s, p) => s + (p.status === "Paid" ? Number(p.amount) || 0 : 0),
    0,
  );

/** Sum of vendor payments with status "Pending" */
const servicePending = (svc) =>
  (svc.vendorPayments || []).reduce(
    (s, p) => s + (p.status === "Pending" ? Number(p.amount) || 0 : 0),
    0,
  );

/** Sum of all vendor payments (paid + pending) */
const serviceTotalAll = (svc) =>
  (svc.vendorPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

/**
 * For backwards compatibility – old bookings may still use flat `advance` field.
 * If vendorPayments array is present, we use the status‑aware `servicePaid`.
 */
const serviceAdvanceOld = (svc) =>
  svc.vendorPayments ? servicePaid(svc) : Number(svc.advance) || 0;

const serviceBalance = (svc) =>
  Math.max(0, (Number(svc.amount) || 0) - serviceAdvanceOld(svc));

// ─── Exported helpers (unchanged API, but now status‑aware) ──────────────────

export function extractHotelsFromBooking(booking) {
  // Prefer services[].hotelData — this reflects any edits made in the booking form
  // (updated meal plan, room category, etc.) and supports multi-room hotels.
  const hotelServices = (booking.services || []).filter(
    (s) => s.type === "Hotel" && s.hotelData?.hotelName,
  );

  if (hotelServices.length > 0) {
    return hotelServices.map((s) => {
      const hd = s.hotelData;
      // Multi-room: summarise all room categories into a single readable string
      const rooms = hd.rooms || [];
      const roomCategorySummary =
        rooms.length > 1
          ? rooms
              .map((r) =>
                r.quantity > 1
                  ? `${r.quantity}× ${r.roomCategory}`
                  : r.roomCategory,
              )
              .filter(Boolean)
              .join(", ")
          : rooms[0]?.roomCategory || hd.roomCategory || "-";

      const mealPlanSummary =
        rooms.length > 1
          ? [...new Set(rooms.map((r) => r.mealPlan).filter(Boolean))].join(
              " / ",
            )
          : rooms[0]?.mealPlan || hd.mealPlan || "-";

      const totalRooms =
        rooms.length > 0
          ? rooms.reduce(
              (s, r) => s + (Number(r.quantity ?? r.numDouble) || 0),
              0,
            )
          : hd.numDouble || 0;

      return {
        hotelName: hd.hotelName || s.supplier || "Hotel",
        city: hd.city || booking.destination || "",
        checkIn: hd.checkInDate || hd.checkIn || booking.startDate || "",
        checkOut: hd.checkOutDate || hd.checkOut || booking.endDate || "",
        nights: hd.nights || 0,
        rooms: totalRooms,
        roomCategory: roomCategorySummary,
        mealPlan: mealPlanSummary,
      };
    });
  }

  // Fallback: use hotelSummary if no hotel services with hotelData exist
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

  // Last resort: infer from booking-level fields
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

export function hotelVoucherKey(hotelName, checkIn) {
  return `${(hotelName || "").trim().toLowerCase()}||${checkIn || ""}`;
}

export function buildBookingRequestMessage(booking) {
  const name = booking.customerName || "there";
  const dest = booking.destination || "your destination";
  const ref = booking.bookingRef
    ? `\nBooking Ref: *${booking.bookingRef}*`
    : "";
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

// ─── Sub-component: Vendor Payment History (status‑aware) ───────────────────

function VendorPaymentHistory({ svc, onEditPayment, onDeletePayment }) {
  const [open, setOpen] = useState(false);
  const payments = svc.vendorPayments || [];
  const totalCost = Number(svc.amount) || 0;

  // If no vendorPayments array, fall back to old advance field
  if (!svc.vendorPayments && svc.advance != null) {
    return (
      <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
        <span className="text-slate-500">
          Total:{" "}
          <span className="font-bold text-slate-700">
            {formatCurrency(svc.amount)}
          </span>
        </span>
        <span className="text-slate-500">
          Advance:{" "}
          <span className="font-bold text-emerald-600">
            {formatCurrency(svc.advance)}
          </span>
        </span>
        <span className="text-slate-500">
          Balance:{" "}
          <span
            className={`font-bold ${(Number(svc.amount) || 0) - (Number(svc.advance) || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {formatCurrency(
              (Number(svc.amount) || 0) - (Number(svc.advance) || 0),
            )}
          </span>
        </span>
      </div>
    );
  }

  if (!totalCost && payments.length === 0) return null;

  const paid = servicePaid(svc);
  const pending = servicePending(svc);
  const balance = Math.max(0, totalCost - paid);

  const paidPct = totalCost > 0 ? Math.min(100, (paid / totalCost) * 100) : 0;
  const pendingPct =
    totalCost > 0 ? Math.min(100 - paidPct, (pending / totalCost) * 100) : 0;
  const leftPct = Math.max(0, 100 - paidPct - pendingPct);

  const statusLabel =
    totalCost <= 0
      ? "No Cost Set"
      : balance === 0
        ? "Fully Paid"
        : paid > 0
          ? "Partial"
          : "Unpaid";

  return (
    <div className="mt-2 space-y-2">
      {/* Summary row */}
      <div className="flex flex-wrap gap-4 text-[11px]">
        <span className="text-slate-500">
          Total:{" "}
          <span className="font-bold text-slate-700">
            {formatCurrency(totalCost)}
          </span>
        </span>
        <span className="text-slate-500">
          Paid:{" "}
          <span className="font-bold text-emerald-600">
            {formatCurrency(paid)}
          </span>
        </span>
        {pending > 0 && (
          <span className="text-slate-500">
            Pending:{" "}
            <span className="font-bold text-amber-600">
              {formatCurrency(pending)}
            </span>
          </span>
        )}
        <span className="text-slate-500">
          Balance:{" "}
          <span
            className={`font-bold ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {formatCurrency(balance)}
          </span>
        </span>
        {payments.length > 0 && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-theme-primary font-bold hover:underline"
          >
            <Receipt className="w-3 h-3" />
            {payments.length} payment{payments.length > 1 ? "s" : ""}
            {open ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Segmented progress bar */}
      {totalCost > 0 && (
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden w-full max-w-[240px]">
          {paidPct > 0 && (
            <div
              className="h-full bg-emerald-500 float-left"
              style={{ width: `${paidPct}%` }}
            />
          )}
          {pendingPct > 0 && (
            <div
              className="h-full bg-amber-400 float-left"
              style={{ width: `${pendingPct}%` }}
            />
          )}
          {leftPct > 0 && (
            <div
              className="h-full bg-slate-200 float-left"
              style={{ width: `${leftPct}%` }}
            />
          )}
        </div>
      )}

      {/* Expanded history with status pills */}
      {open && payments.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden mt-1">
          <div className="bg-slate-50 px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
            Payment History
          </div>
          {payments.map((p, i) => {
            // Backward compat: default to "Paid" if no status
            const status = p.status || "Paid";
            const typeBadge =
              p.type === "Advance"
                ? "bg-violet-50 border-violet-200 text-violet-700"
                : "bg-sky-50 border-sky-200 text-sky-700";
            const statusBadge =
              status === "Paid"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700";
            return (
              <div
                key={p._key || i}
                className="px-3 py-2 text-xs border-t border-slate-100 first:border-0 hover:bg-slate-50/60"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${typeBadge}`}
                  >
                    {p.type || "Payment"}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge}`}
                  >
                    {status}
                  </span>
                  <span
                    className={`ml-auto font-bold shrink-0 ${status === "Pending" ? "text-amber-700" : "text-slate-800"}`}
                  >
                    {formatCurrency(p.amount)}
                    {status === "Pending" && (
                      <span className="ml-0.5 text-[10px] font-medium">
                        (planned)
                      </span>
                    )}
                  </span>
                  {(onEditPayment || onDeletePayment) && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {onEditPayment && (
                        <button
                          type="button"
                          onClick={() => onEditPayment(i)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          aria-label="Edit payment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePayment && (
                        <button
                          type="button"
                          onClick={() => onDeletePayment(i)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          aria-label="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {(p.date || p.mode || p.notes) && (
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                    {p.date && (
                      <span>
                        {new Date(p.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    )}
                    {p.mode && <span>· {p.mode}</span>}
                    {p.notes && (
                      <span className="text-slate-400 break-words">
                        · {p.notes}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const panelBase = pathname.startsWith("/admin")
    ? "/admin-panel"
    : "/agent-panel";

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState(null);
  const [hotelSelectionOpen, setHotelSelectionOpen] = useState(false);
  const [hotelListForSelection, setHotelListForSelection] = useState([]);
  const [hotelSelectionMode, setHotelSelectionMode] = useState("voucher");
  const [deletingVoucherId, setDeletingVoucherId] = useState(null);

  const [editingPaymentIdx, setEditingPaymentIdx] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: "",
    date: "",
    mode: "Cash",
    reference: "",
    notes: "",
  });
  const [savingBookingPayment, setSavingBookingPayment] = useState(false);

  const [editingVendorPayment, setEditingVendorPayment] = useState(null);
  const [vendorPaymentForm, setVendorPaymentForm] = useState({
    type: "Installment",
    status: "Paid",
    amount: "",
    date: "",
    mode: "Cash",
    notes: "",
  });
  const [savingVendorPayment, setSavingVendorPayment] = useState(false);

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
  useEffect(() => {
    console.log("voucherDrawerOpen =", voucherDrawerOpen);
  }, [voucherDrawerOpen]);

  useEffect(() => {
    console.log("selectedHotelForVoucher =", selectedHotelForVoucher);
  }, [selectedHotelForVoucher]);

  const handleOpenEditPayment = (idx) => {
    const pay = booking.payments[idx];
    setEditPaymentForm({
      amount: String(pay.amount || ""),
      date: pay.date || new Date().toISOString().slice(0, 10),
      mode: pay.mode || "Cash",
      reference: pay.reference || "",
      notes: pay.notes || "",
    });
    setEditingPaymentIdx(idx);
  };

  const handleSaveBookingPayment = async () => {
    const amount = Number(editPaymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!editPaymentForm.date) {
      toast.error("Date is required");
      return;
    }

    setSavingBookingPayment(true);
    try {
      const updatedPayments = (booking.payments || []).map((p, i) =>
        i === editingPaymentIdx
          ? {
              ...p,
              amount,
              date: editPaymentForm.date,
              mode: editPaymentForm.mode,
              reference: editPaymentForm.reference,
              notes: editPaymentForm.notes,
            }
          : p,
      );
      const paidAmount = updatedPayments.reduce(
        (s, p) => s + (Number(p.amount) || 0),
        0,
      );
      const paymentStatus = computePaymentStatus(
        booking.totalAmount,
        paidAmount,
      );

      await updateBooking(id, {
        payments: updatedPayments,
        paidAmount,
        paymentStatus,
      });
      setBooking((prev) => ({
        ...prev,
        payments: updatedPayments,
        paidAmount,
        paymentStatus,
      }));

      const editedPayment = booking.payments[editingPaymentIdx];
      if (editedPayment?.invoicePaymentId) {
        try {
          const invoices = await getInvoicesByBooking(id);
          for (const inv of invoices) {
            const match = (inv.payments || []).find(
              (p) => p.id === editedPayment.invoicePaymentId,
            );
            if (match) {
              await updatePaymentInInvoice(
                inv.id,
                editedPayment.invoicePaymentId,
                {
                  amount,
                  date: editPaymentForm.date,
                  mode: editPaymentForm.mode,
                  paymentAccountName: editPaymentForm.mode,
                  reference: editPaymentForm.reference,
                  notes: editPaymentForm.notes,
                },
              );
              break;
            }
          }
        } catch (e) {
          console.warn(
            "[BookingDetail] Could not sync invoice payment (non-critical):",
            e,
          );
        }
      }

      toast.success("Payment updated");
      setEditingPaymentIdx(null);
    } catch (err) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setSavingBookingPayment(false);
    }
  };

  const handleOpenEditVendorPayment = (serviceIdx, paymentIdx) => {
    const pay = booking.services?.[serviceIdx]?.vendorPayments?.[paymentIdx];
    if (!pay) return;
    setVendorPaymentForm({
      type: pay.type || "Installment",
      status: pay.status || "Paid",
      amount: String(pay.amount || ""),
      date: pay.date || new Date().toISOString().slice(0, 10),
      mode: pay.mode || "Cash",
      notes: pay.notes || "",
    });
    setEditingVendorPayment({ serviceIdx, paymentIdx });
  };

  const handleSaveVendorPayment = async () => {
    if (!editingVendorPayment) return;
    const { serviceIdx, paymentIdx } = editingVendorPayment;
    const amount = Number(vendorPaymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!vendorPaymentForm.date) {
      toast.error("Date is required");
      return;
    }

    const svc = booking.services?.[serviceIdx];
    if (!svc) {
      toast.error("Service not found");
      return;
    }
    const totalCost = Number(svc.amount) || 0;
    const otherAllocated = (svc.vendorPayments || [])
      .filter((_, i) => i !== paymentIdx)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (totalCost > 0 && otherAllocated + amount > totalCost) {
      toast.error(
        `Payments would exceed service cost (₹${totalCost.toLocaleString("en-IN")})`,
      );
      return;
    }

    setSavingVendorPayment(true);
    try {
      const updatedServices = booking.services.map((s, si) => {
        if (si !== serviceIdx) return s;
        const updatedPayments = (s.vendorPayments || []).map((p, pi) =>
          pi === paymentIdx
            ? {
                ...p,
                type: vendorPaymentForm.type,
                status: vendorPaymentForm.status,
                amount,
                date: vendorPaymentForm.date,
                mode: vendorPaymentForm.mode,
                notes: vendorPaymentForm.notes,
              }
            : p,
        );
        return { ...s, vendorPayments: updatedPayments };
      });
      await updateBooking(id, { services: updatedServices });
      setBooking((prev) => ({ ...prev, services: updatedServices }));
      toast.success("Payment updated");
      setEditingVendorPayment(null);
    } catch (err) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setSavingVendorPayment(false);
    }
  };

  const handleDeleteVendorPayment = async (serviceIdx, paymentIdx) => {
    if (!confirm("Delete this payment? This cannot be undone.")) return;
    try {
      const updatedServices = booking.services.map((s, si) => {
        if (si !== serviceIdx) return s;
        const updatedPayments = (s.vendorPayments || []).filter(
          (_, pi) => pi !== paymentIdx,
        );
        return { ...s, vendorPayments: updatedPayments };
      });
      await updateBooking(id, { services: updatedServices });
      setBooking((prev) => ({ ...prev, services: updatedServices }));
      toast.success("Payment deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Permanently delete this booking?")) return;
    try {
      await deleteBooking(id);
      if (booking?.quotationId && booking?.agentId) {
        try {
          await updateQuotation(booking.agentId, booking.quotationId, {
            convertedToBooking: false,
            bookingId: null,
          });
        } catch (e) {
          console.warn(
            "[BookingDetail] Could not un-mark quotation (non-critical):",
            e,
          );
        }
      }
      toast.success("Booking deleted");
      router.push(`${panelBase}/bookings`);
    } catch (err) {
      console.error("[BookingDetail] Delete failed:", err);
      toast.error("Delete failed");
    }
  };

  const handleGenerateVoucher = (type) => {
    if (type !== "hotel") {
      toast("Flight voucher coming soon", { icon: "✈️" });
      return;
    }
    const hotels = extractHotelsFromBooking(booking);
    console.log(booking);
    console.log(extractHotelsFromBooking(booking));
    if (hotels.length === 0) {
      toast.error("No hotel data found in this booking.");
      return;
    }
    if (hotels.length === 1) {
      const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
      const key = hotelVoucherKey(hotels[0].hotelName, hotels[0].checkIn);
      const alreadyExists = activeVouchers.some(
        (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key,
      );
      if (alreadyExists) {
        toast.error(
          `A voucher for "${hotels[0].hotelName}" already exists. Delete it first to create a new one.`,
        );
        return;
      }
      console.log("Opening voucher drawer");
      console.log(hotels[0]);
      setSelectedHotelForVoucher(hotels[0]);
      setVoucherDrawerOpen(true);
    } else {
      setHotelSelectionMode("voucher");
      setHotelListForSelection(hotels);
      setHotelSelectionOpen(true);
    }
  };

  const handleSelectHotelForVoucher = (hotel) => {
    const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
    const key = hotelVoucherKey(hotel.hotelName, hotel.checkIn);
    const alreadyExists = activeVouchers.some(
      (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key,
    );
    if (alreadyExists) {
      toast.error(
        `A voucher for "${hotel.hotelName}" already exists. Delete it first.`,
      );
      setHotelSelectionOpen(false);
      return;
    }
    setSelectedHotelForVoucher(hotel);
    setHotelSelectionOpen(false);
    setVoucherDrawerOpen(true);
  };

  const handleVoucherSaved = async () => {
    try {
      const fresh = await getBookingById(id);
      const hotel = selectedHotelForVoucher;
      const existing = fresh?.vouchers || [];
      const key = hotelVoucherKey(hotel?.hotelName, hotel?.checkIn);
      const alreadyTracked = existing.some(
        (v) => !v.deleted && hotelVoucherKey(v.hotelName, v.checkIn) === key,
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
      toast("Voucher saved. Could not update booking record.", { icon: "⚠️" });
    }
  };

  const handleDeleteVoucherEntry = async (voucherId) => {
    if (
      !confirm(
        "Remove this voucher record? This allows creating a new one for the same hotel.",
      )
    )
      return;
    setDeletingVoucherId(voucherId);
    try {
      const updated = (booking.vouchers || []).map((v) =>
        v.id === voucherId
          ? { ...v, deleted: true, deletedAt: new Date().toISOString() }
          : v,
      );
      await updateBooking(id, { vouchers: updated });
      setBooking((prev) => ({ ...prev, vouchers: updated }));
      toast.success("Voucher record removed. You can now create a new one.");
    } catch (err) {
      toast.error("Could not remove voucher record: " + err.message);
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const handleHotelBookingRequestForHotel = async (hotel) => {
    setHotelSelectionOpen(false);
    const { phone } = await sendHotelBookingRequestOnWhatsApp(booking, hotel);
    if (!phone)
      toast(
        "Opening WhatsApp. Hotel number not found; please select the hotel manually.",
        { icon: "📱" },
      );
  };

  const handleHotelBookingRequest = () => {
    const hotels = extractHotelsFromBooking(booking);
    if (hotels.length === 0) {
      toast.error("No hotel data found in this booking.");
      return;
    }
    if (hotels.length === 1) {
      handleHotelBookingRequestForHotel(hotels[0]);
      return;
    }
    setHotelSelectionMode("bookingRequest");
    setHotelListForSelection(hotels);
    setHotelSelectionOpen(true);
  };

  const handleSendBookingRequest = () => {
    const phone = booking?.customerMobile || booking?.mobile || "";
    const message = buildBookingRequestMessage(booking);
    const digits = String(phone).replace(/\D/g, "");
    const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    if (!formattedPhone)
      toast("Opening WhatsApp. Please select the guest manually.", {
        icon: "📱",
      });
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
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => router.push(`${panelBase}/bookings`)}
        >
          Back to Bookings
        </Button>
      </div>
    );
  }

  // ── Derived financials (status‑aware) ──────────────────────────────────────

  const paidAmount = Number(booking.paidAmount) || 0;
  const totalAmount = Number(booking.totalAmount) || 0;
  const customerBalance = totalAmount - paidAmount;

  // Vendor aggregates (new schema with status; fall back to old flat advance)
  const totalVendorCost = (booking.services || []).reduce(
    (s, svc) => s + (Number(svc.amount) || 0),
    0,
  );
  const totalVendorPaid = (booking.services || []).reduce(
    (s, svc) => s + serviceAdvanceOld(svc),
    0,
  );
  const totalVendorPending = (booking.services || []).reduce(
    (s, svc) => s + servicePending(svc),
    0,
  );
  const totalVendorBalance = totalVendorCost - totalVendorPaid;
  const estMargin = totalAmount - totalVendorCost;

  const activeVouchers = (booking.vouchers || []).filter((v) => !v.deleted);
  const deletedVouchers = (booking.vouchers || []).filter((v) => v.deleted);

  const bookingAsQuotation = {
    id: booking.quotationId || null,
    customerName: booking.customerName || "",
    // Provide mobile from every possible field so voucher pre-fills correctly
    customerMobile:
      booking.customerMobile ||
      booking.mobile ||
      booking.leadMobile ||
      booking.customerPhone ||
      "",
    destination: booking.destination || "",
    bookingReference: booking.bookingRef || "",
    bookingRef: booking.bookingRef || "",
    leadName: booking.customerName || "",
    // Pass lead mobile explicitly so HotelVoucherDrawer can pick it up
    leadMobile:
      booking.leadMobile || booking.customerMobile || booking.mobile || "",
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Sticky Header (unchanged) ──────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`${panelBase}/bookings`)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
                Created{" "}
                {booking.createdAt?.toDate?.()?.toLocaleDateString("en-GB") ||
                  "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              onClick={handleHotelBookingRequest}
              className="rounded-xl font-bold h-9 text-green-600 border-green-300 hover:bg-green-50"
              title="Send hotel booking request via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Send Request
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`${panelBase}/invoices/create?bookingId=${id}`)
              }
              className="rounded-xl font-bold h-9 text-theme-primary border-blue-200 hover:bg-blue-50"
              title="Create invoice from this booking"
            >
              <FileText className="w-4 h-4 mr-2" /> Create Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                router.push(`${panelBase}/bookings/create?id=${id}`)
              }
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

      <div className="max-w-5xl mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Info (unchanged) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-4 sm:px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Trip Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                <InfoItem
                  icon={Users}
                  label="Customer"
                  value={booking.customerName || "—"}
                />
                <InfoItem
                  icon={MapPin}
                  label="Destination"
                  value={booking.destination || "—"}
                />
                <InfoItem
                  icon={Hash}
                  label="Pax"
                  value={`${booking.adults || 1} Adults${booking.children ? `, ${booking.children} Children` : ""}`}
                />
                <InfoItem
                  icon={Calendar}
                  label="Start Date"
                  value={formatDate(booking.startDate)}
                />
                <InfoItem
                  icon={Calendar}
                  label="End Date"
                  value={formatDate(booking.endDate)}
                />
              </div>
              {booking.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Notes
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {booking.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Vouchers (unchanged) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-4 sm:px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-theme-primary" /> Vouchers
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 gap-1.5"
                  onClick={() => handleGenerateVoucher("hotel")}
                >
                  <Hotel className="w-3.5 h-3.5" /> Hotel Voucher
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 gap-1.5"
                  onClick={() => handleGenerateVoucher("flight")}
                >
                  <PlaneTakeoff className="w-3.5 h-3.5" /> Flight Voucher
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {activeVouchers.length === 0 && deletedVouchers.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No vouchers created yet. Use the buttons above to generate
                  one.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="
    flex items-center justify-between
    p-3 rounded-xl
    bg-slate-50 border border-slate-100
    hover:bg-blue-50 hover:border-blue-200
    transition cursor-pointer
  "
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
                        title="Remove voucher record"
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
                                Deleted{" "}
                                {v.deletedAt ? formatDate(v.deletedAt) : ""}
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

          {/* Services (updated with status‑aware history) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-4 sm:px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Services ({booking.services?.length || 0})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold h-8"
                onClick={() =>
                  router.push(`${panelBase}/bookings/create?id=${id}`)
                }
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Services
              </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {!booking.services?.length ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No services added.
                </p>
              ) : (
                <div className="space-y-3">
                  {booking.services.map((svc, i) => {
                    const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                    return (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-white border border-slate-200 mt-0.5 shrink-0">
                              <Icon className="w-4 h-4 text-theme-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800">
                                  {svc.type}
                                </span>
                                <StatusBadge
                                  status={svc.status || "Pending"}
                                  fallback="Pending"
                                  className="px-2 py-0.5 text-[9px] font-bold uppercase"
                                />
                              </div>
                              {svc.description && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {svc.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-400">
                                {svc.supplier && (
                                  <span>
                                    Supplier:{" "}
                                    <span className="text-slate-600 font-medium">
                                      {svc.supplier}
                                    </span>
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
                              {/* Updated vendor payment history */}
                              <VendorPaymentHistory
                                svc={svc}
                                onEditPayment={(paymentIdx) =>
                                  handleOpenEditVendorPayment(i, paymentIdx)
                                }
                                onDeletePayment={(paymentIdx) =>
                                  handleDeleteVendorPayment(i, paymentIdx)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Payments (unchanged) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-4 sm:px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Customer Payment History ({booking.payments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {!booking.payments?.length ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No payments recorded.
                </p>
              ) : (
                <div className="space-y-2">
                  {booking.payments.map((pay, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-700">
                            {pay.mode}
                          </span>
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-emerald-600">
                          {formatCurrency(pay.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenEditPayment(i)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (updated financials) ─────────────────────────── */}
        <div className="space-y-5">
          {/* Customer Financial Summary (unchanged) */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-theme-primary" /> Customer
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <SummaryRow
                label="Total Amount"
                value={formatCurrency(totalAmount)}
                bold
              />
              <SummaryRow
                label="Amount Paid"
                value={formatCurrency(paidAmount)}
                color="text-emerald-600"
              />
              <SummaryRow
                label="Balance Due"
                value={formatCurrency(customerBalance)}
                color={customerBalance > 0 ? "text-rose-600" : "text-slate-700"}
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

          {/* Vendor Financial Summary (updated with Pending line) */}
          {booking.services?.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-theme-primary" /> Vendor
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <SummaryRow
                  label="Total Vendor Cost"
                  value={formatCurrency(totalVendorCost)}
                  bold
                />
                <SummaryRow
                  label="Total Paid"
                  value={formatCurrency(totalVendorPaid)}
                  color="text-emerald-600"
                />
                {totalVendorPending > 0 && (
                  <SummaryRow
                    label="Pending Installments"
                    value={formatCurrency(totalVendorPending)}
                    color="text-amber-600"
                  />
                )}
                <SummaryRow
                  label="Outstanding"
                  value={formatCurrency(totalVendorBalance)}
                  color={
                    totalVendorBalance > 0 ? "text-rose-600" : "text-slate-500"
                  }
                />
                {totalAmount > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Est. Margin
                      </span>
                      <span
                        className={`font-bold ${estMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {formatCurrency(estMargin)}
                        <span className="ml-1.5 text-[11px] font-semibold opacity-80">
                          ({((estMargin / totalAmount) * 100).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    {totalVendorCost > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Markup
                        </span>
                        <span
                          className={`font-bold ${estMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {((estMargin / totalVendorCost) * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Services Breakdown sidebar (updated) */}
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
                  const svcPaid = serviceAdvanceOld(svc);
                  const svcBal = Math.max(0, svcTotal - svcPaid);
                  return (
                    <div key={i} className="space-y-0.5">
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
                      {(svcPaid > 0 || svcTotal > 0) && (
                        <div className="flex justify-between text-[10px] pl-5">
                          <span className="text-emerald-600">
                            Paid {formatCurrency(svcPaid)}
                          </span>
                          <span
                            className={
                              svcBal > 0 ? "text-rose-500" : "text-slate-400"
                            }
                          >
                            Bal {formatCurrency(svcBal)}
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
                    <span>{formatCurrency(totalVendorCost)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-emerald-600">Total Paid</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(totalVendorPaid)}
                    </span>
                  </div>
                  {totalVendorPending > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-amber-600">Total Pending</span>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(totalVendorPending)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-rose-500">Total Balance</span>
                    <span className="font-bold text-rose-500">
                      {formatCurrency(totalVendorBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <HotelVoucherDrawer
        isOpen={voucherDrawerOpen}
        onClose={() => {
          setVoucherDrawerOpen(false);
          setSelectedHotelForVoucher(null);
        }}
        hotelData={selectedHotelForVoucher}
        quotation={bookingAsQuotation}
        leadId={booking?.leadId}
        agentId={booking.agentId || ""}
        onSaved={handleVoucherSaved}
      />
      {/* ── Edit Customer Payment Dialog (unchanged) ────────────────────── */}
      <Dialog
        open={editingPaymentIdx !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPaymentIdx(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900">
              Edit Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Amount (₹) *
              </Label>
              <Input
                type="number"
                value={editPaymentForm.amount}
                onChange={(e) =>
                  setEditPaymentForm((p) => ({ ...p, amount: e.target.value }))
                }
                className="rounded-xl"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Payment Date *
              </Label>
              <Input
                type="date"
                value={editPaymentForm.date}
                onChange={(e) =>
                  setEditPaymentForm((p) => ({ ...p, date: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Payment Mode
              </Label>
              <Select
                value={editPaymentForm.mode}
                onValueChange={(v) =>
                  setEditPaymentForm((p) => ({ ...p, mode: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Cash",
                    "Bank Transfer",
                    "UPI",
                    "Card",
                    "Cheque",
                    "Online",
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Reference
              </Label>
              <Input
                value={editPaymentForm.reference}
                onChange={(e) =>
                  setEditPaymentForm((p) => ({
                    ...p,
                    reference: e.target.value,
                  }))
                }
                className="rounded-xl"
                placeholder="UTR, Cheque number, etc."
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Notes
              </Label>
              <Input
                value={editPaymentForm.notes}
                onChange={(e) =>
                  setEditPaymentForm((p) => ({ ...p, notes: e.target.value }))
                }
                className="rounded-xl"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditingPaymentIdx(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleSaveBookingPayment}
                disabled={savingBookingPayment}
              >
                {savingBookingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update Payment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Vendor Payment Dialog ─────────────────────────────────── */}
      <Dialog
        open={editingVendorPayment !== null}
        onOpenChange={(open) => {
          if (!open) setEditingVendorPayment(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900">
              Edit Service Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                  Type
                </Label>
                <Select
                  value={vendorPaymentForm.type}
                  onValueChange={(v) =>
                    setVendorPaymentForm((p) => ({ ...p, type: v }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Advance", "Installment"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                  Status
                </Label>
                <Select
                  value={vendorPaymentForm.status}
                  onValueChange={(v) =>
                    setVendorPaymentForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Paid", "Pending"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Amount (₹) *
              </Label>
              <Input
                type="number"
                value={vendorPaymentForm.amount}
                onChange={(e) =>
                  setVendorPaymentForm((p) => ({
                    ...p,
                    amount: e.target.value,
                  }))
                }
                className="rounded-xl"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Payment Date *
              </Label>
              <Input
                type="date"
                value={vendorPaymentForm.date}
                onChange={(e) =>
                  setVendorPaymentForm((p) => ({ ...p, date: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Payment Mode
              </Label>
              <Select
                value={vendorPaymentForm.mode}
                onValueChange={(v) =>
                  setVendorPaymentForm((p) => ({ ...p, mode: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Cash",
                    "Bank Transfer",
                    "UPI",
                    "Card",
                    "Cheque",
                    "Online",
                  ].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Notes
              </Label>
              <Input
                value={vendorPaymentForm.notes}
                onChange={(e) =>
                  setVendorPaymentForm((p) => ({ ...p, notes: e.target.value }))
                }
                className="rounded-xl"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditingVendorPayment(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleSaveVendorPayment}
                disabled={savingVendorPayment}
              >
                {savingVendorPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update Payment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Multi-hotel selection dialog (unchanged) ────────────────────── */}
      <Dialog open={hotelSelectionOpen} onOpenChange={setHotelSelectionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {hotelSelectionMode === "bookingRequest"
                ? "Select Hotel for Booking Request"
                : "Select Hotel for Voucher"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">
            {hotelSelectionMode === "bookingRequest"
              ? "This booking has multiple hotels. Pick one to send the hotel booking request on WhatsApp."
              : "This booking has multiple hotels. Pick one to generate a voucher."}
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {hotelListForSelection.map((h, i) => {
              const key = hotelVoucherKey(h.hotelName, h.checkIn);
              const hasVoucher = activeVouchers.some(
                (v) => hotelVoucherKey(v.hotelName, v.checkIn) === key,
              );
              const isVoucherMode = hotelSelectionMode === "voucher";
              return (
                <div
                  key={i}
                  onClick={() =>
                    isVoucherMode
                      ? !hasVoucher && handleSelectHotelForVoucher(h)
                      : handleHotelBookingRequestForHotel(h)
                  }
                  className={`border rounded-xl p-4 transition ${
                    isVoucherMode && hasVoucher
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
                  {isVoucherMode && hasVoucher && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Voucher already
                      created
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

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────

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
