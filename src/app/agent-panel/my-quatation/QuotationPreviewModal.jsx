"use client";

/**
 * QuotationPreviewModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Props
 *   quotation   – the saved package object from Firestore
 *   onClose     – () => void
 *   onEdit              – (quotation) => void   optional
 *   onCopy              – (quotation) => void   optional  (WhatsApp summary)
 *   onPDF               – (quotation) => void   optional
 *   onConvertToBooking  – (quotation) => void   optional  (shown only when status === "Accepted")
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Hotel,
  Car,
  Palmtree,
  MapPin,
  Moon,
  Copy,
  FileText,
  Edit3,
  Star,
  BedDouble,
  Utensils,
  Users,
  CalendarCheck,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBookingById } from "@/firebase/bookingsService";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const MEAL_ICONS = { EP: "🏨", CP: "🍳", MAP: "🍽️", AP: "🍱" };
const MEAL_LABELS = {
  EP: "Accommodation only",
  CP: "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP: "All Meals",
};

const STATUS_STYLES = {
  Draft:    "bg-orange-50 text-orange-700 border-orange-200",
  Sent:     "bg-blue-50 text-blue-700 border-blue-200",
  Accepted: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

function Stars({ rating }) {
  const n = parseInt(rating) || 0;
  return (
    <span className="inline-flex gap-px">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      ))}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 my-1" />;
}

// ── Hotel card ─────────────────────────────────────────────────────────────────
function HotelCard({ entry }) {
  const mealIcon  = MEAL_ICONS[entry.selectedMealPlan] || "🍽️";
  const mealLabel = MEAL_LABELS[entry.selectedMealPlan] || entry.selectedMealPlan;

  return (
    <div
      className={`rounded-xl border p-3.5 ${
        entry.isCustom
          ? "border-purple-200 bg-purple-50/40"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              entry.isCustom ? "bg-purple-100" : "bg-indigo-100"
            }`}
          >
            <Hotel
              className={`h-4 w-4 ${entry.isCustom ? "text-purple-600" : "text-indigo-600"}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-slate-800 text-sm leading-tight">
                {entry.hotel}
              </p>
              {entry.isCustom && (
                <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                  Custom
                </span>
              )}
            </div>
            {entry.rating && <Stars rating={entry.rating} />}
            <p className="text-xs text-slate-500 flex items-center gap-0.5 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {entry.city}, {entry.state}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0">
          <Moon className="h-3 w-3" />
          {entry.nights}N
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
        {[
          { label: "Check-in",  val: fmtDate(entry.checkInDate) },
          { label: "Check-out", val: fmtDate(entry.checkOutDate) },
          { label: "Room type", val: entry.selectedRoomCategory || "—" },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="bg-white rounded-lg px-2.5 py-2 border border-slate-100"
          >
            <p className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">
              {label}
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
              {val}
            </p>
          </div>
        ))}
        <div className="bg-indigo-50 rounded-lg px-2.5 py-2 border border-indigo-100">
          <p className="text-[9px] text-indigo-400 uppercase tracking-wide font-medium">
            Meal plan
          </p>
          <p className="text-xs font-semibold text-indigo-700 mt-0.5">
            {mealIcon} {entry.selectedMealPlan}{" "}
            <span className="font-normal opacity-70">— {mealLabel}</span>
          </p>
        </div>
      </div>

      {/* Guest badges */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {entry.numDouble > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
            🛏️ {entry.numDouble} Room{entry.numDouble > 1 ? "s" : ""}
          </span>
        )}
        {entry.numExtraAdult > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
            👤 {entry.numExtraAdult} Extra Adult{entry.numExtraAdult > 1 ? "s" : ""}
          </span>
        )}
        {entry.numExtraChild > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full">
            👧 {entry.numExtraChild} Child{entry.numExtraChild > 1 ? "ren" : ""}
          </span>
        )}
        {entry.numCNB > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
            🛌 {entry.numCNB} CNB
          </span>
        )}
      </div>

      {/* Cost */}
      <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2.5 border-t border-slate-100">
        <span className="text-xs text-slate-400">Hotel cost</span>
        <span className="text-base font-bold text-indigo-600">
          ₹{fmt(entry.hotelTotal)}
        </span>
      </div>
    </div>
  );
}

// ── Transport card ─────────────────────────────────────────────────────────────
function TransportCard({ transport }) {
  if (!transport?.selectedVehicle && !transport?.vehicleName) return null;

  // Supports both live Redux shape and saved Firestore shape
  const vehicleName =
    transport.selectedVehicle?.type || transport.vehicleName || "Vehicle";
  const isAC =
    transport.selectedVehicle?.ac ?? transport.ac ?? false;
  const pkgName =
    transport.name || transport.packageName || "Custom transport";
  const totalCost =
    transport.totalTransportCost ||
    transport.selectedVehicle?.price ||
    0;
  const pricingType = transport.pricingType || "fixed";
  const perKm = transport.selectedVehicle?.perKmprice || transport.perKmprice || 0;

  // Extras (saved Firestore shape)
  const toll    = transport.tollCharges    || 0;
  const permit  = transport.permitCharges  || 0;
  const other   = transport.otherCharges   || 0;
  const driver  = transport.driverAllowance || 0;
  const baseCost = transport.vehicleCost   || 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 p-3.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Car className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{vehicleName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{pkgName}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  isAC
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {isAC ? "✓ AC" : "✗ Non-AC"}
              </span>
              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {pricingType === "perKm" || perKm > 0
                  ? `₹${fmt(perKm)}/km`
                  : "Fixed rate"}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Total transport</p>
          <p className="text-xl font-bold text-indigo-600">₹{fmt(totalCost)}</p>
        </div>
      </div>

      {/* Breakdown if per-km */}
      {(baseCost > 0 || toll > 0 || permit > 0 || driver > 0 || other > 0) && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-3 border-t border-slate-100">
          {[
            { label: "Vehicle cost",      val: baseCost },
            { label: "Driver allowance",  val: driver },
            { label: "Toll",              val: toll },
            { label: "Permit",            val: permit },
            other > 0 && { label: "Other", val: other },
          ]
            .filter(Boolean)
            .map(({ label, val }) =>
              val > 0 ? (
                <div key={label} className="bg-white rounded-lg px-2.5 py-2 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">₹{fmt(val)}</p>
                </div>
              ) : null
            )}
        </div>
      )}
    </div>
  );
}

// ── Activity row ───────────────────────────────────────────────────────────────
function ActivityRow({ act }) {
  return (
    <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-800 truncate">{act.name}</p>
          {act.isCustom && (
            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              Custom
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          📍 {act.city} · {act.participants || 1} person{(act.participants || 1) > 1 ? "s" : ""}
        </p>
      </div>
      <p className="text-sm font-bold text-emerald-700 flex-shrink-0">
        ₹{fmt(act.totalPrice)}
      </p>
    </div>
  );
}

// ── Pricing breakdown ──────────────────────────────────────────────────────────
function PricingBreakdown({ hotelTotal, transportTotal, activitiesTotal, markup, grandTotal }) {
  const rows = [
    { label: "Hotels",     icon: <Hotel className="h-4 w-4 text-indigo-500" />,  val: hotelTotal },
    { label: "Transport",  icon: <Car className="h-4 w-4 text-blue-500" />,      val: transportTotal },
    { label: "Activities", icon: <Palmtree className="h-4 w-4 text-emerald-500" />, val: activitiesTotal },
  ];

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {rows.map(({ label, icon, val }) => (
        <div
          key={label}
          className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-sm"
        >
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
              {icon}
            </div>
            {label}
          </div>
          <span className="font-semibold text-slate-700">₹{fmt(val)}</span>
        </div>
      ))}

      {markup > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-sm bg-amber-50/50">
          <span className="text-slate-600">Markup</span>
          <span className="font-semibold text-amber-700">+ ₹{fmt(markup)}</span>
        </div>
      )}

      {/* Grand total bar */}
      <div className="flex items-center justify-between px-4 py-4 bg-[#1e2535]">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
            Grand total
          </p>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          ₹{fmt(grandTotal)}
        </p>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function QuotationPreviewModal({
  quotation,
  onClose,
  onEdit,
  onCopy,
  onPDF,
  onConvertToBooking,
  onSendReminder,
}) {
  // When the quotation is marked as converted, verify the linked booking
  // still exists — if it was deleted, show the Convert button again
  const [linkedBookingExists, setLinkedBookingExists] = useState(true);

  useEffect(() => {
    if (!quotation?.convertedToBooking || !quotation?.bookingId) {
      setLinkedBookingExists(false);
      return;
    }
    setLinkedBookingExists(true); // optimistic while fetching
    getBookingById(quotation.bookingId).then((b) => {
      setLinkedBookingExists(!!b);
    }).catch(() => {
      setLinkedBookingExists(false);
    });
  }, [quotation?.bookingId, quotation?.convertedToBooking]);

  if (!quotation) return null;

  const hotels      = quotation.hotelSummary     || [];
  const transport   = quotation.transportSummary || null;
  const activities  = quotation.activitySummary  || [];

  const hotelTotal      = hotels.reduce((s, h) => s + Number(h.hotelTotal || 0), 0);
  const transportTotal  = Number(transport?.totalTransportCost || 0);
  const activitiesTotal = activities.reduce((s, a) => s + Number(a.totalPrice || 0), 0);
  const markup          = Number(quotation.markup || 0);
  const grandTotal      = Number(quotation.grandTotal || hotelTotal + transportTotal + activitiesTotal + markup);

  const statusClass = STATUS_STYLES[quotation.status] || STATUS_STYLES.Draft;
  const customerLabel = quotation.customerName || quotation.leadName || "—";

  const createdDate = quotation.createdAt?.seconds
    ? new Date(quotation.createdAt.seconds * 1000).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ── Header: Clean & Structured ── */}
        <div className="bg-white border-b border-slate-100 px-6 py-5 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {quotation.packageName || "Package Preview"}
              </h2>
              <Badge className={`${statusClass} border shadow-none px-2 py-0 h-5 text-[10px] font-bold uppercase`}>
                {quotation.status || "Draft"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-theme-secondary" /> {customerLabel}
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-xs">{quotation.refNumber || "#REF-PENDING"}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="overflow-y-auto px-6 py-6 space-y-8 flex-1">
          
          {/* Hotels Section */}
          {hotels.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Accommodations</h3>
                <span className="text-xs font-semibold text-theme-secondary bg-theme-muted px-2 py-1 rounded-md">
                  {hotels.reduce((s, h) => s + (parseInt(h.nights) || 0), 0)} Nights Total
                </span>
              </div>
              <div className="space-y-3">
                {hotels.map((entry, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-theme-accent transition-colors bg-white shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-theme-secondary shrink-0">
                          <Hotel className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800">{entry.hotel}</h4>
                            {entry.isCustom && <Badge className="bg-purple-50 text-purple-700 border-purple-100 text-[9px] h-4">Custom</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                             <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {entry.city}</span>
                             {entry.rating && <Stars rating={entry.rating} />}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-theme-dark bg-theme-muted px-2 py-1 rounded-lg">
                          {entry.nights}N
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-50">
                      {[
                        { label: "Check-in", val: fmtDate(entry.checkInDate) },
                        { label: "Check-out", val: fmtDate(entry.checkOutDate) },
                        { label: "Room", val: entry.selectedRoomCategory || "—" },
                        { label: "Meal Plan", val: `${MEAL_ICONS[entry.selectedMealPlan] || "🍽️"} ${entry.selectedMealPlan}` },
                      ].map((item, idx) => (
                        <div key={idx}>
                          <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">{item.label}</p>
                          <p className="text-[11px] font-semibold text-slate-700 truncate">{item.val}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="flex gap-1.5">
                        {entry.numDouble > 0 && <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">🛏️ {entry.numDouble} Room</span>}
                        {(entry.numExtraAdult > 0 || entry.numExtraChild > 0) && <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">👤 Guests Incl.</span>}
                      </div>
                      <p className="text-sm font-bold text-theme-secondary">₹{fmt(entry.hotelTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transport Section */}
          {transport && (transport.selectedVehicle || transport.vehicleName) && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Transport</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-theme-secondary shadow-sm">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{transport.selectedVehicle?.type || transport.vehicleName || "Vehicle"}</p>
                      <p className="text-[11px] text-slate-500">{transport.name || transport.packageName || "Transport details"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-theme-dark">₹{fmt(transport.totalTransportCost || transport.selectedVehicle?.price || 0)}</p>
                    <p className="text-[10px] font-bold text-theme-accent uppercase">{transport.pricingType === "perKm" ? "Per KM Basis" : "Fixed Rate"}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Activities Section */}
          {activities.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Activities</h3>
              <div className="space-y-2">
                {activities.map((act, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 hover:border-slate-300">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Palmtree className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 truncate">{act.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800 ml-2">₹{fmt(act.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Final Totals */}
          <section className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FileText className="h-16 w-16" />
            </div>
            
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between text-white/60 text-xs font-medium uppercase tracking-wider">
                <span>Items Subtotal</span>
                <span>₹{fmt(hotelTotal + transportTotal + activitiesTotal)}</span>
              </div>
              {markup > 0 && (
                <div className="flex justify-between text-theme-accent text-xs font-bold uppercase tracking-wider">
                  <span>Service Fee / Markup</span>
                  <span>+ ₹{fmt(markup)}</span>
                </div>
              )}
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-tighter">Grand Total Amount</p>
                  <p className="text-xs text-white/40">Includes all taxes and surcharges</p>
                </div>
                <div className="text-3xl font-black tracking-tight text-white">
                  ₹{fmt(grandTotal)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer Actions ── */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 bg-white flex-wrap">
          {onCopy && (
            <Button variant="ghost" size="sm" onClick={() => onCopy(quotation)} className="text-xs font-semibold text-slate-600 hover:bg-slate-50 gap-2 h-9">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          )}
          {onPDF && (
            <Button variant="outline" size="sm" onClick={() => onPDF(quotation)} className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-9 px-4">
              <FileText className="h-3.5 w-3.5 text-theme-secondary" /> PDF
            </Button>
          )}
          {onSendReminder && quotation.status === "Sent" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendReminder(quotation)}
              className="text-xs font-bold border-amber-200 text-amber-600 hover:bg-amber-50 gap-2 h-9 px-4"
            >
              <BellRing className="h-3.5 w-3.5" /> Send Reminder
            </Button>
          )}
          {onConvertToBooking && quotation.status === "Accepted" && (
            linkedBookingExists ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 h-9">
                <CalendarCheck className="h-3.5 w-3.5" /> Booking Created
              </span>
            ) : (
              <Button
                size="sm"
                onClick={() => onConvertToBooking(quotation)}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 px-5 shadow-sm rounded-lg"
              >
                <CalendarCheck className="h-3.5 w-3.5" /> Convert to Booking
              </Button>
            )
          )}
          {onEdit && (
            <Button size="sm" onClick={() => onEdit(quotation)} className="text-xs font-bold bg-theme-dark hover:bg-theme-secondary text-white gap-2 h-9 px-5 shadow-sm rounded-lg">
              <Edit3 className="h-3.5 w-3.5" /> Edit Quotation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}