"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getBookingById, deleteBooking } from "@/firebase/bookingsService";
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
  IndianRupee,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";

const SERVICE_ICONS = {
  Flight: PlaneTakeoff,
  Hotel: Hotel,
  Rail: TrainFront,
  Transfer: Car,
  Sightseeing: Landmark,
  Visa: ShieldCheck,
  Insurance: ShieldCheck,
  Other: MoreHorizontal,
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatCurrency = (n) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBookingById(id);
        setBooking(data);
      } catch {
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
      // If this booking was created from a quotation, un-mark the quotation
      // so the agent can convert it again from the preview screen
      if (booking?.quotationId && booking?.agentId) {
        try {
          await updateQuotation(booking.agentId, booking.quotationId, {
            convertedToBooking: false,
            bookingId: null,
          });
        } catch { /* non-critical */ }
      }
      toast.success("Booking deleted");
      router.push("/agent-panel/bookings");
    } catch {
      toast.error("Delete failed");
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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/agent-panel/bookings")} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">{booking.bookingRef}</span>
                <StatusBadge status={booking.status || "Pending"} fallback="Pending" className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider" />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Created {booking.createdAt?.toDate?.()?.toLocaleDateString("en-GB") || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Trip Information</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                <InfoItem icon={Users} label="Customer" value={booking.customerName || "—"} />
                <InfoItem icon={MapPin} label="Destination" value={booking.destination || "—"} />
                <InfoItem icon={Hash} label="Pax" value={`${booking.adults || 1} Adults${booking.children ? `, ${booking.children} Children` : ""}`} />
                <InfoItem icon={Calendar} label="Start Date" value={formatDate(booking.startDate)} />
                <InfoItem icon={Calendar} label="End Date" value={formatDate(booking.endDate)} />
              </div>
              {booking.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{booking.notes}</p>
                  </div>
                </>
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
                      <div key={i} className="flex items-start justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-white border border-slate-200 mt-0.5 shrink-0">
                            <Icon className="w-4 h-4 text-theme-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{svc.type}</span>
                              <StatusBadge status={svc.status || "Pending"} fallback="Pending" className="px-2 py-0.5 text-[9px] font-bold uppercase" />
                            </div>
                            {svc.description && <p className="text-xs text-slate-600 mt-0.5">{svc.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-slate-400">
                              {svc.supplier && <span>Supplier: <span className="text-slate-600 font-medium">{svc.supplier}</span></span>}
                              {svc.confirmationRef && <span>Ref: <span className="text-slate-600 font-mono font-bold">{svc.confirmationRef}</span></span>}
                            </div>
                            {(svc.amount || svc.advance) && (
                              <div className="flex flex-wrap gap-4 mt-2 text-[11px]">
                                <span className="text-slate-500">Total: <span className="font-bold text-slate-700">{svc.amount ? formatCurrency(svc.amount) : "—"}</span></span>
                                <span className="text-slate-500">Advance: <span className="font-bold text-emerald-600">{svc.advance ? formatCurrency(svc.advance) : "₹0"}</span></span>
                                <span className="text-slate-500">Balance: <span className={`font-bold ${(Number(svc.amount) || 0) - (Number(svc.advance) || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                  {formatCurrency((Number(svc.amount) || 0) - (Number(svc.advance) || 0))}
                                </span></span>
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
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{pay.mode}</span>
                          {pay.reference && <span className="text-[11px] font-mono text-slate-400">{pay.reference}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(pay.date)}{pay.notes && ` · ${pay.notes}`}</div>
                      </div>
                      <span className="font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
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
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <SummaryRow label="Total Amount" value={formatCurrency(totalAmount)} bold />
              <SummaryRow label="Amount Paid" value={formatCurrency(paidAmount)} color="text-emerald-600" />
              <SummaryRow label="Balance Due" value={formatCurrency(balance)} color={balance > 0 ? "text-rose-600" : "text-slate-700"} />
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Payment Status</span>
                <StatusBadge status={booking.paymentStatus || "Unpaid"} fallback="Unpaid" className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider" />
              </div>
            </CardContent>
          </Card>

          {booking.services?.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Services Breakdown</CardTitle>
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
                          <span>{svc.type}{svc.description ? ` · ${svc.description.slice(0, 20)}${svc.description.length > 20 ? "…" : ""}` : ""}</span>
                        </div>
                        <span className="font-bold">{svcTotal ? formatCurrency(svcTotal) : "—"}</span>
                      </div>
                      {(svcAdvance > 0 || svcTotal > 0) && (
                        <div className="flex justify-between text-[10px] pl-5">
                          <span className="text-emerald-600">Adv: {formatCurrency(svcAdvance)}</span>
                          <span className={svcBalance > 0 ? "text-rose-500" : "text-emerald-600"}>Bal: {formatCurrency(svcBalance)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Total Cost</span>
                    <span>{formatCurrency(booking.services.reduce((s, v) => s + (Number(v.amount) || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-emerald-600">Total Advance</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(booking.services.reduce((s, v) => s + (Number(v.advance) || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-rose-500">Total Balance</span>
                    <span className="font-bold text-rose-500">{formatCurrency(booking.services.reduce((s, v) => s + ((Number(v.amount) || 0) - (Number(v.advance) || 0)), 0))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
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
