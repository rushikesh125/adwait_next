"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase/config";
import {
  createBooking,
  updateBooking,
  getBookingById,
  computePaymentStatus,
} from "@/firebase/bookingsService";
import { updateQuotation } from "@/firebase/quotations";
import {
  ArrowLeft,
  Plus,
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
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

const SERVICE_TYPES = ["Flight", "Hotel", "Rail", "Transfer", "Sightseeing", "Visa", "Insurance", "Other"];
const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Card", "Cheque", "Online"];
const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

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

const newService = () => ({
  _key: Math.random().toString(36).slice(2),
  type: "Hotel",
  description: "",
  supplier: "",
  confirmationRef: "",
  amount: "",
  advance: "",
  status: "Pending",
});

const newPayment = () => ({
  _key: Math.random().toString(36).slice(2),
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  mode: "Cash",
  reference: "",
  notes: "",
});

const emptyForm = () => ({
  customerName: "",
  destination: "",
  startDate: "",
  endDate: "",
  adults: 1,
  children: 0,
  status: "Pending",
  totalAmount: "",
  notes: "",
  services: [],
  payments: [],
  quotationId: "",
});

function CreateBookingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // Load pre-fill from quotation conversion
  useEffect(() => {
    if (isEdit) return;
    const fromQuotation = searchParams.get("fromQuotation");
    if (fromQuotation !== "true") return;
    try {
      const raw = sessionStorage.getItem("bookingPrefill");
      if (!raw) return;
      const data = JSON.parse(raw);
      setForm({
        ...emptyForm(),
        ...data,
        services: (data.services || []).map((s) => ({ ...s, _key: Math.random().toString(36).slice(2) })),
        payments: [],
      });
      sessionStorage.removeItem("bookingPrefill");
    } catch { /* ignore parse errors */ }
  }, [isEdit, searchParams]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const data = await getBookingById(editId);
        if (data) {
          setForm({
            customerName: data.customerName || "",
            destination: data.destination || "",
            startDate: data.startDate || "",
            endDate: data.endDate || "",
            adults: data.adults ?? 1,
            children: data.children ?? 0,
            status: data.status || "Pending",
            totalAmount: data.totalAmount || "",
            notes: data.notes || "",
            services: (data.services || []).map((s) => ({ ...s, _key: Math.random().toString(36).slice(2) })),
            payments: (data.payments || []).map((p) => ({ ...p, _key: Math.random().toString(36).slice(2) })),
          });
        }
      } catch {
        toast.error("Failed to load booking");
      } finally {
        setFetching(false);
      }
    })();
  }, [editId, isEdit]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Services
  const addService = () => setForm((prev) => ({ ...prev, services: [...prev.services, newService()] }));
  const removeService = (key) => setForm((prev) => ({ ...prev, services: prev.services.filter((s) => s._key !== key) }));
  const updateService = (key, field, value) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s._key === key ? { ...s, [field]: value } : s)),
    }));

  // Payments
  const addPayment = () => setForm((prev) => ({ ...prev, payments: [...prev.payments, newPayment()] }));
  const removePayment = (key) => setForm((prev) => ({ ...prev, payments: prev.payments.filter((p) => p._key !== key) }));
  const updatePayment = (key, field, value) =>
    setForm((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p._key === key ? { ...p, [field]: value } : p)),
    }));

  const paidAmount = form.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalAmount = Number(form.totalAmount) || 0;
  const balance = totalAmount - paidAmount;
  const paymentStatus = computePaymentStatus(totalAmount, paidAmount);

  const handleSave = async () => {
    if (!form.customerName.trim()) return toast.error("Customer name is required");
    if (!form.destination.trim()) return toast.error("Destination is required");
    if (!auth.currentUser) return toast.error("Not authenticated");

    setLoading(true);
    try {
      const cleanServices = form.services.map(({ _key, ...s }) => s);
      const cleanPayments = form.payments.map(({ _key, ...p }) => p);

      const payload = {
        ...form,
        services: cleanServices,
        payments: cleanPayments,
        paidAmount,
        paymentStatus,
        agentId: auth.currentUser.uid,
      };

      if (isEdit) {
        await updateBooking(editId, payload);
        toast.success("Booking updated");
      } else {
        const newBookingId = await createBooking(payload);
        // Mark the source quotation as converted so it can't be converted again
        if (form.quotationId) {
          try {
            await updateQuotation(auth.currentUser.uid, form.quotationId, {
              convertedToBooking: true,
              bookingId: newBookingId,
            });
          } catch { /* non-critical — booking is already saved */ }
        }
        toast.success("Booking created");
      }
      router.push("/agent-panel/bookings");
    } catch {
      toast.error("Failed to save booking");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-theme-primary w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-theme-primary p-2 rounded-lg text-white">
                <CalendarCheck size={18} />
              </div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight uppercase">
                {isEdit ? "Edit Booking" : "New Booking"}
              </h1>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="bg-theme-primary text-white rounded-xl px-6 font-bold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : isEdit ? "Update Booking" : "Create Booking"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN — Main form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Trip Details */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Customer Name *</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Destination *</Label>
                  <Input
                    placeholder="e.g. Goa, Kerala"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adults</Label>
                  <Input type="number" min={1} value={form.adults} onChange={(e) => set("adults", Number(e.target.value))} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Children</Label>
                  <Input type="number" min={0} value={form.children} onChange={(e) => set("children", Number(e.target.value))} className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Notes</Label>
                <Textarea
                  placeholder="Internal notes about this booking..."
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="rounded-xl resize-none min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Services</CardTitle>
              <Button variant="outline" size="sm" onClick={addService} className="rounded-xl text-xs font-bold h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Service
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {form.services.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No services added. Click "Add Service" to begin.</p>
              ) : (
                form.services.map((svc, idx) => {
                  const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                  return (
                    <div key={svc._key} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-theme-primary" />
                          <span className="font-bold text-sm text-slate-700">Service {idx + 1}</span>
                        </div>
                        <button onClick={() => removeService(svc._key)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</Label>
                          <Select value={svc.type} onValueChange={(v) => updateService(svc._key, "type", v)}>
                            <SelectTrigger className="h-9 rounded-xl text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                          <Select value={svc.status} onValueChange={(v) => updateService(svc._key, "status", v)}>
                            <SelectTrigger className="h-9 rounded-xl text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {["Pending", "Confirmed", "Cancelled"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Cost (₹)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={svc.amount}
                            onChange={(e) => updateService(svc._key, "amount", e.target.value)}
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advance Paid (₹)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={svc.advance}
                            onChange={(e) => updateService(svc._key, "advance", e.target.value)}
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance Due (₹)</Label>
                          <div className={`h-9 rounded-xl text-xs px-3 flex items-center font-bold border ${
                            (Number(svc.amount) || 0) - (Number(svc.advance) || 0) > 0
                              ? "bg-rose-50 border-rose-200 text-rose-600"
                              : "bg-emerald-50 border-emerald-200 text-emerald-600"
                          }`}>
                            ₹{((Number(svc.amount) || 0) - (Number(svc.advance) || 0)).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="space-y-1 col-span-2 sm:col-span-4">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</Label>
                          <Input
                            placeholder="e.g. Hotel Taj Mahal Palace, Deluxe Room"
                            value={svc.description}
                            onChange={(e) => updateService(svc._key, "description", e.target.value)}
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supplier</Label>
                          <Input
                            placeholder="Supplier name"
                            value={svc.supplier}
                            onChange={(e) => updateService(svc._key, "supplier", e.target.value)}
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirmation / PNR</Label>
                          <Input
                            placeholder="Ref / PNR number"
                            value={svc.confirmationRef}
                            onChange={(e) => updateService(svc._key, "confirmationRef", e.target.value)}
                            className="h-9 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Payment Records</CardTitle>
              <Button variant="outline" size="sm" onClick={addPayment} className="rounded-xl text-xs font-bold h-8">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Payment
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {form.payments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
              ) : (
                form.payments.map((pay, idx) => (
                  <div key={pay._key} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-700">Payment {idx + 1}</span>
                      <button onClick={() => removePayment(pay._key)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={pay.amount}
                          onChange={(e) => updatePayment(pay._key, "amount", e.target.value)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</Label>
                        <Input
                          type="date"
                          value={pay.date}
                          onChange={(e) => updatePayment(pay._key, "date", e.target.value)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode</Label>
                        <Select value={pay.mode} onValueChange={(v) => updatePayment(pay._key, "mode", v)}>
                          <SelectTrigger className="h-9 rounded-xl text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference</Label>
                        <Input
                          placeholder="Transaction ID"
                          value={pay.reference}
                          onChange={(e) => updatePayment(pay._key, "reference", e.target.value)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-4 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                        <Input
                          placeholder="Payment notes (optional)"
                          value={pay.notes}
                          onChange={(e) => updatePayment(pay._key, "notes", e.target.value)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — Summary sidebar */}
        <div className="space-y-5">
          {/* Status */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Booking Status</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-11 rounded-xl font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.totalAmount}
                  onChange={(e) => set("totalAmount", e.target.value)}
                  className="h-11 rounded-xl font-semibold"
                />
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid</span>
                  <span className="font-bold text-emerald-600">₹{paidAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance</span>
                  <span className={`font-bold ${balance > 0 ? "text-rose-600" : "text-slate-700"}`}>
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment</span>
                  <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${
                    paymentStatus === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                    paymentStatus === "Partial" ? "border-amber-200 bg-amber-50 text-amber-700" :
                    "border-rose-200 bg-rose-50 text-rose-700"
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services summary */}
          {form.services.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">Services ({form.services.length})</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {form.services.map((svc) => {
                  const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                  return (
                    <div key={svc._key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Icon className="w-3.5 h-3.5 text-theme-primary" />
                        <span>{svc.type}</span>
                        {svc.confirmationRef && <span className="text-slate-400">· {svc.confirmationRef}</span>}
                      </div>
                      <span className="font-bold text-slate-800">
                        {svc.amount ? `₹${Number(svc.amount).toLocaleString("en-IN")}` : "—"}
                      </span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Services Total</span>
                  <span>₹{form.services.reduce((s, v) => s + (Number(v.amount) || 0), 0).toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateBookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-theme-primary w-8 h-8" /></div>}>
      <CreateBookingInner />
    </Suspense>
  );
}
