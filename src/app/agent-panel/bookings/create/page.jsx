"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/firebase/config";
import {
  checkInstallmentAlerts,
  resetInstallmentAlertThrottle,
} from "@/hooks/useInstallmentAlerts";
import {
  createBooking,
  updateBooking,
  getBookingById,
  computePaymentStatus,
} from "@/firebase/bookingsService";
import { updateQuotation } from "@/firebase/quotations";
import { syncVouchersWithBooking } from "@/firebase/voucher";
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
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
  Edit2,
  Check,
  X,
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

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  "Flight",
  "Hotel",
  "Rail",
  "Transfer",
  "Sightseeing",
  "Visa",
  "Insurance",
  "Other",
];
const PAYMENT_MODES = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Card",
  "Cheque",
  "Online",
];
const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
const VENDOR_PAYMENT_TYPES = ["Advance", "Installment"];
const VENDOR_PAYMENT_STATUSES = ["Paid", "Pending"];

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
const MEAL_PLANS = ["CP", "MAP", "AP", "EP",];
// ─── Factory helpers ──────────────────────────────────────────────────────────

const newVendorPayment = (type = "Installment") => ({
  _key: Math.random().toString(36).slice(2),
  type,
  status: "Paid", // <-- NEW: default status
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  mode: "Cash",
  notes: "",
});

const newService = () => ({
  _key: Math.random().toString(36).slice(2),
  type: "Hotel",
  description: "",
  supplier: "",
  confirmationRef: "",
  amount: "",
  vendorPayments: [],
  status: "Pending",
  _showPayments: false,
});

const newCustomerPayment = () => ({
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

// ─── Service financial helpers (status‑aware) ─────────────────────────────────

/** Sum of vendor payments with status "Paid" */
const serviceTotalPaid = (svc) =>
  (svc.vendorPayments || []).reduce(
    (s, p) => s + (p.status === "Paid" ? Number(p.amount) || 0 : 0),
    0,
  );

/** Sum of vendor payments with status "Pending" */
const serviceTotalPending = (svc) =>
  (svc.vendorPayments || []).reduce(
    (s, p) => s + (p.status === "Pending" ? Number(p.amount) || 0 : 0),
    0,
  );

/** Sum of all vendor payments (paid + pending) */
const serviceTotalAllPayments = (svc) =>
  (svc.vendorPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);

/** Remaining balance based on actual paid amount */
const serviceBalance = (svc) =>
  Math.max(0, (Number(svc.amount) || 0) - serviceTotalPaid(svc));

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validates a new/edited vendor payment against the service.
 * Checks that the total of ALL payments (paid + pending) does not exceed the service cost.
 */
const validateVendorPayment = (svc, paymentAmount, excludeKey = null) => {
  const amt = Number(paymentAmount);
  if (!paymentAmount || isNaN(amt) || amt <= 0) {
    return "Payment amount must be greater than 0.";
  }
  const totalCost = Number(svc.amount) || 0;
  if (totalCost <= 0) {
    return "Set a Total Cost before adding payments.";
  }
  const alreadyAllocated = (svc.vendorPayments || [])
    .filter((p) => p._key !== excludeKey)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  if (alreadyAllocated + amt > totalCost) {
    const remaining = totalCost - alreadyAllocated;
    return `Total payments (₹${(alreadyAllocated + amt).toLocaleString("en-IN")}) would exceed cost (₹${totalCost.toLocaleString("en-IN")}). Remaining: ₹${remaining.toLocaleString("en-IN")}.`;
  }
  return null;
};

// ─── Sub-component: Vendor Payment Row (add / edit) ──────────────────────────

function VendorPaymentForm({ svc, onAdd, onCancel }) {
  const [draft, setDraft] = useState(newVendorPayment("Installment"));
  const [error, setError] = useState("");

  const handle = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const submit = () => {
    const err = validateVendorPayment(svc, draft.amount);
    if (err) {
      setError(err);
      return;
    }
    onAdd({ ...draft });
    setDraft(newVendorPayment("Installment"));
    setError("");
  };

  return (
    <div className="mt-3 border border-blue-200 rounded-xl p-3 bg-blue-50/40 space-y-3">
      <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
        New Vendor Payment
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Type
          </Label>
          <Select value={draft.type} onValueChange={(v) => handle("type", v)}>
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {VENDOR_PAYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Status
          </Label>
          <Select
            value={draft.status}
            onValueChange={(v) => handle("status", v)}
          >
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {VENDOR_PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Amount (₹) *
          </Label>
          <Input
            type="number"
            min={0.01}
            step={0.01}
            placeholder="0"
            value={draft.amount}
            onChange={(e) => handle("amount", e.target.value)}
            className="h-8 rounded-lg text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Date *
          </Label>
          <Input
            type="date"
            value={draft.date}
            onChange={(e) => handle("date", e.target.value)}
            className="h-8 rounded-lg text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Mode
          </Label>
          <Select value={draft.mode} onValueChange={(v) => handle("mode", v)}>
            <SelectTrigger className="h-8 rounded-lg text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 sm:col-span-4 space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Notes (optional)
          </Label>
          <Input
            placeholder="e.g. 2nd instalment wire transfer"
            value={draft.notes}
            onChange={(e) => handle("notes", e.target.value)}
            className="h-8 rounded-lg text-xs"
          />
        </div>
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-xs rounded-lg"
        >
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={submit}
          className="h-7 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          <Check className="w-3 h-3 mr-1" /> Add Payment
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-component: Single Vendor Payment row (view + inline-edit) ────────────

function VendorPaymentRow({ svc, payment, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...payment });
  const [error, setError] = useState("");

  const handleField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const saveEdit = () => {
    const err = validateVendorPayment(svc, draft.amount, payment._key);
    if (err) {
      setError(err);
      return;
    }
    onUpdate(payment._key, draft);
    setEditing(false);
    setError("");
  };

  const cancelEdit = () => {
    setDraft({ ...payment });
    setEditing(false);
    setError("");
  };

  if (editing) {
    return (
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
          Editing Payment
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Type
            </Label>
            <Select
              value={draft.type}
              onValueChange={(v) => handleField("type", v)}
            >
              <SelectTrigger className="h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {VENDOR_PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={draft.status}
              onValueChange={(v) => handleField("status", v)}
            >
              <SelectTrigger className="h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {VENDOR_PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Amount (₹)
            </Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={draft.amount}
              onChange={(e) => handleField("amount", e.target.value)}
              className="h-8 rounded-lg text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Date
            </Label>
            <Input
              type="date"
              value={draft.date}
              onChange={(e) => handleField("date", e.target.value)}
              className="h-8 rounded-lg text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Mode
            </Label>
            <Select
              value={draft.mode}
              onValueChange={(v) => handleField("mode", v)}
            >
              <SelectTrigger className="h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-4 space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Notes
            </Label>
            <Input
              placeholder="Notes"
              value={draft.notes}
              onChange={(e) => handleField("notes", e.target.value)}
              className="h-8 rounded-lg text-xs"
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-1.5 text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelEdit}
            className="h-7 text-xs rounded-lg"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveEdit}
            className="h-7 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            <Check className="w-3 h-3 mr-1" /> Save
          </Button>
        </div>
      </div>
    );
  }

  // View row with status pill
  const typeBadge =
    payment.type === "Advance"
      ? "bg-violet-50 border-violet-200 text-violet-700"
      : "bg-sky-50 border-sky-200 text-sky-700";

  const statusBadge =
    payment.status === "Paid"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-amber-50 border-amber-200 text-amber-700";

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-100/60 transition-colors group text-xs">
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${typeBadge}`}
      >
        {payment.type}
      </span>
      <span
        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusBadge}`}
      >
        {payment.status}
      </span>
      <span className="text-slate-500 w-[90px] shrink-0">
        {payment.date
          ? new Date(payment.date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })
          : "—"}
      </span>
      <span className="text-slate-500">{payment.mode}</span>
      {payment.notes && (
        <span className="text-slate-400 truncate flex-1">
          · {payment.notes}
        </span>
      )}
      <span
        className={`ml-auto font-bold shrink-0 ${payment.status === "Pending" ? "text-amber-700" : "text-slate-800"}`}
      >
        ₹{(Number(payment.amount) || 0).toLocaleString("en-IN")}
        {payment.status === "Pending" && (
          <span className="ml-0.5 text-[10px] font-medium">(planned)</span>
        )}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 transition-all ml-1"
        title="Edit payment"
      >
        <Edit2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDelete(payment._key)}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
        title="Delete payment"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Sub-component: Structured Hotel Fields ───────────────────────────────────

// ─── Sub-component: Structured Hotel Fields ───────────────────────────────────

function HotelServiceFields({ hotelData = {}, onChange }) {
  const handle = (field, value) => onChange({ ...hotelData, [field]: value });

  // Support both legacy flat shape and new rooms[] shape
  const rooms = hotelData.rooms || [];

  const addRoom = () => {
    const newRoom = {
      _key: Math.random().toString(36).slice(2),
      roomCategory: "",
      mealPlan: "",
      numDouble: 1,
      numExtraAdult: 0,
      numExtraChild: 0,
      numCNB: 0,
      quantity: 1,
      price: 0,
    };
    handle("rooms", [...rooms, newRoom]);
  };

  const updateRoom = (idx, patch) => {
    handle(
      "rooms",
      rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  };

  const removeRoom = (idx) => {
    if (rooms.length <= 1) return;
    handle(
      "rooms",
      rooms.filter((_, i) => i !== idx),
    );
  };

  // If coming from quotation prefill with no rooms array yet, show legacy fields
  const hasRoomsArray = rooms.length > 0;

  return (
    <div className="space-y-3 mt-1">
      {/* Basic hotel info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Hotel Name
          </Label>
          <Input
            placeholder="e.g. The Taj Mahal Palace"
            value={hotelData.hotelName || ""}
            onChange={(e) => handle("hotelName", e.target.value)}
            className="h-9 rounded-xl text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            City
          </Label>
          <Input
            placeholder="e.g. Mumbai"
            value={hotelData.city || ""}
            onChange={(e) => handle("city", e.target.value)}
            className="h-9 rounded-xl text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Nights
          </Label>
          <Input
            type="number"
            min={1}
            placeholder="1"
            value={hotelData.nights || ""}
            onChange={(e) =>
              handle("nights", Math.max(1, Number(e.target.value) || 1))
            }
            className="h-9 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Room Categories */}
      <div className="border-t pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
            <Hotel className="h-3.5 w-3.5 text-theme-primary" /> Room Categories
          </p>
          {hasRoomsArray && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addRoom}
              className="text-xs h-7 text-theme-primary hover:text-theme-dark"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
            </Button>
          )}
        </div>

        {hasRoomsArray ? (
          <>
            {rooms.map((room, idx) => (
              <div
                key={room._key || idx}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">
                    Room {idx + 1}
                    {(room.quantity ?? room.numDouble ?? 0) > 0 && (
                      <span className="ml-1.5 text-[10px] font-semibold text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded-full normal-case">
                        {room.quantity ?? room.numDouble} room
                        {(room.quantity ?? room.numDouble) > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  {rooms.length > 1 && (
                    <button
                      onClick={() => removeRoom(idx)}
                      className="text-slate-400 hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Room Category
                    </Label>
                    <Input
                      value={room.roomCategory || ""}
                      onChange={(e) =>
                        updateRoom(idx, { roomCategory: e.target.value })
                      }
                      placeholder="e.g. Deluxe"
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Meal Plan
                    </Label>
                    <Select
                      value={room.mealPlan || ""}
                      onValueChange={(v) => updateRoom(idx, { mealPlan: v })}
                    >
                      <SelectTrigger className="h-8 rounded-lg text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {MEAL_PLANS.map((plan) => (
                          <SelectItem
                            key={plan}
                            value={plan}
                            className="text-xs"
                          >
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      No. of Rooms
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={room.quantity ?? room.numDouble ?? ""}
                      onChange={(e) =>
                        updateRoom(idx, {
                          quantity: Number(e.target.value),
                          numDouble: Number(e.target.value),
                        })
                      }
                      placeholder="1"
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Extra occupancy summary */}
                {(room.numExtraAdult > 0 ||
                  room.numExtraChild > 0 ||
                  room.numCNB > 0) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 pt-1">
                    {room.numExtraAdult > 0 && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        +{room.numExtraAdult} Extra Adult
                      </span>
                    )}
                    {room.numExtraChild > 0 && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        +{room.numExtraChild} Child
                      </span>
                    )}
                    {room.numCNB > 0 && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                        +{room.numCNB} CNB
                      </span>
                    )}
                  </div>
                )}

                {room.price > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
                    <span>Subtotal from quotation</span>
                    <span className="font-bold text-slate-700">
                      ₹{Number(room.price).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Footer summary */}
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>
                {rooms.reduce(
                  (s, r) => s + (Number(r.quantity ?? r.numDouble) || 0),
                  0,
                )}{" "}
                total room(s) across {rooms.length} categor
                {rooms.length > 1 ? "ies" : "y"}
              </span>
              {rooms.some((r) => r.price > 0) && (
                <span className="font-bold text-slate-700">
                  ₹
                  {rooms
                    .reduce((s, r) => s + Number(r.price || 0), 0)
                    .toLocaleString("en-IN")}{" "}
                  total
                </span>
              )}
            </div>
          </>
        ) : (
          /* Legacy fallback for manually added services (no rooms array) */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Room Category
              </Label>
              <Input
                placeholder="e.g. Deluxe Room, Suite"
                value={hotelData.roomCategory || ""}
                onChange={(e) => handle("roomCategory", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Meal Plan
              </Label>
              <Select
                value={hotelData.mealPlan || ""}
                onValueChange={(v) => handle("mealPlan", v)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {MEAL_PLANS.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                No. of Rooms
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="1"
                value={hotelData.numDouble || ""}
                onChange={(e) =>
                  handle("numDouble", Number(e.target.value) || 1)
                }
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Promote legacy flat fields to rooms array
                  handle("rooms", [
                    {
                      _key: Math.random().toString(36).slice(2),
                      roomCategory: hotelData.roomCategory || "",
                      mealPlan: hotelData.mealPlan || "",
                      numDouble: hotelData.numDouble ?? 1,
                      numExtraAdult: hotelData.numExtraAdult ?? 0,
                      numExtraChild: hotelData.numExtraChild ?? 0,
                      numCNB: hotelData.numCNB ?? 0,
                      quantity: hotelData.numDouble ?? 1,
                      price: 0,
                    },
                  ]);
                }}
                className="text-xs h-9 w-full border-dashed border-theme-primary/40 text-theme-primary"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Another Room Type
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Sub-component: Service Card (updated with status segments) ───────────────

function ServiceCard({
  svc,
  idx,
  onRemove,
  onUpdateField,
  onAddVendorPayment,
  onUpdateVendorPayment,
  onDeleteVendorPayment,
  onTogglePayments,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;

  // Financials
  const totalCost = Number(svc.amount) || 0;
  const paid = serviceTotalPaid(svc);
  const pending = serviceTotalPending(svc);
  const balance = Math.max(0, totalCost - paid);
  const totalAllocated = paid + pending;

  // Progress bar segments
  const paidPct = totalCost > 0 ? Math.min(100, (paid / totalCost) * 100) : 0;
  const pendingPct =
    totalCost > 0 ? Math.min(100 - paidPct, (pending / totalCost) * 100) : 0;
  const leftPct = Math.max(0, 100 - paidPct - pendingPct);

  // Overall status label
  const statusLabel =
    totalCost <= 0
      ? "No Cost Set"
      : balance === 0
        ? "Fully Paid"
        : paid > 0
          ? "Partial"
          : "Unpaid";

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Service Header */}
      <div className="flex items-center justify-between p-4 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <div className="bg-theme-primary/10 p-1.5 rounded-lg">
            <Icon className="w-4 h-4 text-theme-primary" />
          </div>
          <span className="font-bold text-sm text-slate-700">
            Service {idx + 1}
          </span>
          <span className="text-xs text-slate-400">{svc.type}</span>
        </div>
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Type
            </Label>
            <Select
              value={svc.type}
              onValueChange={(v) => onUpdateField("type", v)}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={svc.status}
              onValueChange={(v) => onUpdateField("status", v)}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {["Pending", "Confirmed", "Cancelled"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Cost (₹)
            </Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              value={svc.amount}
              onChange={(e) => onUpdateField("amount", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1 col-span-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Conf / PNR
            </Label>
            <Input
              placeholder="Ref / PNR"
              value={svc.confirmationRef}
              onChange={(e) => onUpdateField("confirmationRef", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
         {svc.type !== "Hotel" && (
            <div className="space-y-1 col-span-2 sm:col-span-4">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Description
              </Label>
              <Input
                placeholder="e.g. Flight AI-302, Economy Class"
                value={svc.description}
                onChange={(e) => onUpdateField("description", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          )}
          {svc.type === "Hotel" && (
            <div className="col-span-2 sm:col-span-4">
              <HotelServiceFields
                hotelData={svc.hotelData || {}}
                onChange={(updated) => onUpdateField("hotelData", updated)}
              />
            </div>
          )}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Supplier
            </Label>
            <Input
              placeholder="Supplier name"
              value={svc.supplier}
              onChange={(e) => onUpdateField("supplier", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* ── Financial Summary Bar (now with 4 columns + segmented progress) ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 mt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-600 uppercase tracking-wider text-[10px]">
              Vendor Payment Summary
            </span>
            {totalCost > 0 && (
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  statusLabel === "Fully Paid"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : paid > 0
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                {statusLabel}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <p className="text-slate-400 text-[10px]">Total Cost</p>
              <p className="font-bold text-slate-800">
                ₹{totalCost.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px]">Paid</p>
              <p className="font-bold text-emerald-600">
                ₹{paid.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px]">Pending</p>
              <p className="font-bold text-amber-600">
                ₹{pending.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[10px]">Balance</p>
              <p
                className={`font-bold ${balance > 0 ? "text-rose-600" : "text-slate-500"}`}
              >
                ₹{balance.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          {/* Segmented progress bar */}
          {totalCost > 0 && (
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
        </div>

        {/* ── Vendor Payments toggle ────────────────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={onTogglePayments}
            className="flex items-center gap-1.5 text-xs font-bold text-theme-primary hover:text-theme-primary/80 transition-colors py-1"
          >
            <Receipt className="w-3.5 h-3.5" />
            Payment History ({svc.vendorPayments?.length || 0})
            {svc._showPayments ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {svc._showPayments && (
            <div className="mt-2 space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {!svc.vendorPayments || svc.vendorPayments.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-3">
                  No payments recorded yet.
                </p>
              ) : (
                svc.vendorPayments.map((p) => (
                  <VendorPaymentRow
                    key={p._key}
                    svc={svc}
                    payment={p}
                    onUpdate={onUpdateVendorPayment}
                    onDelete={onDeleteVendorPayment}
                  />
                ))
              )}

              {showAddForm ? (
                <VendorPaymentForm
                  svc={svc}
                  onAdd={(payment) => {
                    onAddVendorPayment(payment);
                    setShowAddForm(false);
                  }}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  disabled={totalCost <= 0} // Only disable when no cost is set
                  className="w-full h-8 text-xs rounded-lg border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 mt-1"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {totalCost <= 0 ? "Set Total Cost First" : "Add Payment"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

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
        services: (data.services || []).map((s) => ({
          ...s,
          _key: Math.random().toString(36).slice(2),
          hotelData: s.hotelData || null,
          vendorPayments: (s.vendorPayments || []).map((p) => ({
            ...p,
            _key: Math.random().toString(36).slice(2),
            status: p.status || "Paid",
          })),
          _showPayments: false,
        })),
        payments: [],
      });
      sessionStorage.removeItem("bookingPrefill");
    } catch {
      /* ignore parse errors */
    }
  }, [isEdit, searchParams]);

  // Load edit data
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
            services: (data.services || []).map((s) => ({
              ...s,
              _key: Math.random().toString(36).slice(2),
              hotelData: s.hotelData || null,
              vendorPayments: (s.vendorPayments || []).map((p) => ({
                ...p,
                _key: Math.random().toString(36).slice(2),
                status: p.status || "Paid",
              })),
              _showPayments: false,
            })),
            payments: (data.payments || []).map((p) => ({
              ...p,
              _key: Math.random().toString(36).slice(2),
            })),
            quotationId: data.quotationId || "",
          });
        }
      } catch {
        toast.error("Failed to load booking");
      } finally {
        setFetching(false);
      }
    })();
  }, [editId, isEdit]);

  // ── Form field helpers ───────────────────────────────────────────────────

  const set = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Customer payments
  const addCustomerPayment = () =>
    setForm((prev) => ({
      ...prev,
      payments: [...prev.payments, newCustomerPayment()],
    }));
  const removeCustomerPayment = (key) =>
    setForm((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p._key !== key),
    }));
  const updateCustomerPayment = (key, field, value) =>
    setForm((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p._key === key ? { ...p, [field]: value } : p,
      ),
    }));

  // Services
  const addService = () =>
    setForm((prev) => ({
      ...prev,
      services: [...prev.services, newService()],
    }));
  const removeService = (key) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s._key !== key),
    }));
  const updateServiceField = (svcKey, field, value) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s._key !== svcKey) return s;
        const updated = { ...s, [field]: value };
         if (field === "type" && value === "Hotel" && !updated.hotelData) {
          updated.hotelData = {
            hotelName: "",
            city: "",
            nights: "",
            roomCategory: "",
            mealPlan: "",
          };
        }
        if (field === "type" && value !== "Hotel") {
          updated.hotelData = null;
        }
        return updated;
      }),
    }));
  const toggleServicePayments = (svcKey) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s._key === svcKey ? { ...s, _showPayments: !s._showPayments } : s,
      ),
    }));

  // Vendor payments inside a service
  const addVendorPayment = (svcKey, payment) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s._key === svcKey
          ? { ...s, vendorPayments: [...(s.vendorPayments || []), payment] }
          : s,
      ),
    }));

  const updateVendorPayment = (svcKey, payKey, draftPayment) =>
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s._key === svcKey
          ? {
              ...s,
              vendorPayments: (s.vendorPayments || []).map((p) =>
                p._key === payKey ? { ...p, ...draftPayment } : p,
              ),
            }
          : s,
      ),
    }));

  const deleteVendorPayment = (svcKey, payKey) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s._key === svcKey
          ? {
              ...s,
              vendorPayments: (s.vendorPayments || []).filter(
                (p) => p._key !== payKey,
              ),
            }
          : s,
      ),
    }));
    toast.success("Payment removed");
  };

  // ── Derived financials ───────────────────────────────────────────────────

  // Customer side
  const customerPaidAmount = form.payments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );
  const totalAmount = Number(form.totalAmount) || 0;
  const customerBalance = totalAmount - customerPaidAmount;
  const paymentStatus = computePaymentStatus(totalAmount, customerPaidAmount);

  // Vendor / service side aggregates (status‑aware)
  const totalVendorCost = form.services.reduce(
    (s, svc) => s + (Number(svc.amount) || 0),
    0,
  );
  const totalVendorPaid = form.services.reduce(
    (s, svc) => s + serviceTotalPaid(svc),
    0,
  );
  const totalVendorPending = form.services.reduce(
    (s, svc) => s + serviceTotalPending(svc),
    0,
  );
  const totalVendorBalance = totalVendorCost - totalVendorPaid;

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.customerName.trim())
      return toast.error("Customer name is required");
    if (!form.destination.trim()) return toast.error("Destination is required");
    if (!auth.currentUser) return toast.error("Not authenticated");

    // Validate all vendor payments (total allocated cannot exceed cost)
    for (const svc of form.services) {
      const cost = Number(svc.amount) || 0;
      const totalAll = serviceTotalAllPayments(svc);
      if (totalAll > cost) {
        toast.error(
          `Service "${svc.description || svc.type}": total payments (₹${totalAll.toLocaleString("en-IN")}) exceed cost (₹${cost.toLocaleString("en-IN")}).`,
        );
        return;
      }
      for (const p of svc.vendorPayments || []) {
        if (!p.amount || Number(p.amount) <= 0) {
          toast.error(
            `Service "${svc.description || svc.type}": a payment has an invalid amount.`,
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Strip UI-only fields before saving
     const cleanServices = form.services.map(
        ({ _key, _showPayments, vendorPayments, ...rest }) => ({
          ...rest,
          description:
            rest.type === "Hotel" && rest.hotelData
              ? [
                  rest.hotelData.hotelName,
                  rest.hotelData.city,
                  rest.hotelData.roomCategory,
                  rest.hotelData.mealPlan,
                  rest.hotelData.nights
                    ? `${rest.hotelData.nights} nights`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : rest.description,
          vendorPayments: (vendorPayments || []).map(
            ({ _key: pk, ...vp }) => vp,
          ),
          totalPaid: serviceTotalPaid({ vendorPayments }),
          balance: serviceBalance({ amount: rest.amount, vendorPayments }),
        }),
      );
      const cleanPayments = form.payments.map(({ _key, ...p }) => p);

      const payload = {
        ...form,
        services: cleanServices,
        payments: cleanPayments,
        paidAmount: customerPaidAmount,
        paymentStatus,
        totalVendorCost,
        totalVendorPaid,
        totalVendorBalance,
        agentId: auth.currentUser.uid,
      };

      if (isEdit) {
        await updateBooking(editId, payload);
        await syncVouchersWithBooking(auth.currentUser.uid, editId, payload);
        toast.success("Booking updated");
      } else {
        const newBookingId = await createBooking(payload);
        if (form.quotationId) {
          try {
            await updateQuotation(auth.currentUser.uid, form.quotationId, {
              convertedToBooking: true,
              bookingId: newBookingId,
            });
          } catch {
            /* non-critical */
          }
        }
        toast.success("Booking created");
        // Trigger immediate check for service reminders on the newly created booking
        // Replace this in handleSave after toast.success("Booking created"):
        toast.success("Booking created");
        if (auth.currentUser?.uid) {
          resetInstallmentAlertThrottle();
          checkInstallmentAlerts(auth.currentUser.uid).catch(console.error);
        }

        // WITH THIS:
        toast.success("Booking created");
        if (auth.currentUser?.uid) {
          resetInstallmentAlertThrottle();
          // Small delay to let Firestore propagate the new booking before querying
          setTimeout(() => {
            checkInstallmentAlerts(auth.currentUser.uid).catch(console.error);
          }, 2000);
        }
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-xl"
            >
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
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-theme-primary text-white rounded-xl px-6 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Update Booking"
              ) : (
                "Create Booking"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Customer Name *
                  </Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Destination *
                  </Label>
                  <Input
                    placeholder="e.g. Goa, Kerala"
                    value={form.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate", e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Adults
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.adults}
                    onChange={(e) => set("adults", Number(e.target.value))}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Children
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.children}
                    onChange={(e) => set("children", Number(e.target.value))}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Notes
                </Label>
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
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Services
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addService}
                className="rounded-xl text-xs font-bold h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Service
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {form.services.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No services added. Click "Add Service" to begin.
                </p>
              ) : (
                form.services.map((svc, idx) => (
                  <ServiceCard
                    key={svc._key}
                    svc={svc}
                    idx={idx}
                    onRemove={() => removeService(svc._key)}
                    onUpdateField={(field, value) =>
                      updateServiceField(svc._key, field, value)
                    }
                    onTogglePayments={() => toggleServicePayments(svc._key)}
                    onAddVendorPayment={(payment) =>
                      addVendorPayment(svc._key, payment)
                    }
                    onUpdateVendorPayment={(payKey, draft) =>
                      updateVendorPayment(svc._key, payKey, draft)
                    }
                    onDeleteVendorPayment={(payKey) =>
                      deleteVendorPayment(svc._key, payKey)
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Customer Payments */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Customer Payment Records
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomerPayment}
                className="rounded-xl text-xs font-bold h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Payment
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {form.payments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">
                  No customer payments recorded yet.
                </p>
              ) : (
                form.payments.map((pay, idx) => (
                  <div
                    key={pay._key}
                    className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-700">
                        Payment {idx + 1}
                      </span>
                      <button
                        onClick={() => removeCustomerPayment(pay._key)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Amount (₹)
                        </Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={pay.amount}
                          onChange={(e) =>
                            updateCustomerPayment(
                              pay._key,
                              "amount",
                              e.target.value,
                            )
                          }
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Date
                        </Label>
                        <Input
                          type="date"
                          value={pay.date}
                          onChange={(e) =>
                            updateCustomerPayment(
                              pay._key,
                              "date",
                              e.target.value,
                            )
                          }
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Mode
                        </Label>
                        <Select
                          value={pay.mode}
                          onValueChange={(v) =>
                            updateCustomerPayment(pay._key, "mode", v)
                          }
                        >
                          <SelectTrigger className="h-9 rounded-xl text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {PAYMENT_MODES.map((m) => (
                              <SelectItem key={m} value={m} className="text-xs">
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Reference
                        </Label>
                        <Input
                          placeholder="Transaction ID"
                          value={pay.reference}
                          onChange={(e) =>
                            updateCustomerPayment(
                              pay._key,
                              "reference",
                              e.target.value,
                            )
                          }
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-4 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Notes
                        </Label>
                        <Input
                          placeholder="Payment notes (optional)"
                          value={pay.notes}
                          onChange={(e) =>
                            updateCustomerPayment(
                              pay._key,
                              "notes",
                              e.target.value,
                            )
                          }
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

        {/* ── RIGHT COLUMN — Summary sidebar ──────────────────────────── */}
        <div className="space-y-5">
          {/* Booking Status */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Booking Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger className="h-11 rounded-xl font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Customer Financial Summary */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Customer Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Amount (₹)
                </Label>
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
                  <span className="font-bold">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid</span>
                  <span className="font-bold text-emerald-600">
                    ₹{customerPaidAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Balance</span>
                  <span
                    className={`font-bold ${customerBalance > 0 ? "text-rose-600" : "text-slate-700"}`}
                  >
                    ₹{customerBalance.toLocaleString("en-IN")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 rounded-full border ${
                      paymentStatus === "Paid"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : paymentStatus === "Partial"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendor Financial Summary – now with pending line */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Vendor Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Vendor Cost</span>
                  <span className="font-bold">
                    ₹{totalVendorCost.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Paid</span>
                  <span className="font-bold text-emerald-600">
                    ₹{totalVendorPaid.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending Installments</span>
                  <span className="font-bold text-amber-600">
                    ₹{totalVendorPending.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding</span>
                  <span
                    className={`font-bold ${totalVendorBalance > 0 ? "text-rose-600" : "text-slate-500"}`}
                  >
                    ₹{totalVendorBalance.toLocaleString("en-IN")}
                  </span>
                </div>
                {totalVendorCost > 0 && totalAmount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Margin</span>
                      <span
                        className={`font-bold ${totalAmount - totalVendorCost >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        ₹
                        {(totalAmount - totalVendorCost).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Services summary */}
          {form.services.length > 0 && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Services ({form.services.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {form.services.map((svc) => {
                  const Icon = SERVICE_ICONS[svc.type] || MoreHorizontal;
                  const paid = serviceTotalPaid(svc);
                  const cost = Number(svc.amount) || 0;
                  const bal = Math.max(0, cost - paid);
                  return (
                    <div key={svc._key} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Icon className="w-3.5 h-3.5 text-theme-primary" />
                          <span>{svc.type}</span>
                          {svc.confirmationRef && (
                            <span className="text-slate-400">
                              · {svc.confirmationRef}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-800">
                          {cost ? `₹${cost.toLocaleString("en-IN")}` : "—"}
                        </span>
                      </div>
                      {cost > 0 && (
                        <div className="flex justify-between text-[10px] pl-5">
                          <span className="text-emerald-600">
                            Paid ₹{paid.toLocaleString("en-IN")}
                          </span>
                          <span
                            className={
                              bal > 0 ? "text-rose-500" : "text-slate-400"
                            }
                          >
                            Bal ₹{bal.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Services Total</span>
                  <span>₹{totalVendorCost.toLocaleString("en-IN")}</span>
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-theme-primary w-8 h-8" />
        </div>
      }
    >
      <CreateBookingInner />
    </Suspense>
  );
}
