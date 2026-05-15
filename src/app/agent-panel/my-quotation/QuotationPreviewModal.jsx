"use client";

/**
 * QuotationPreviewModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Props
 *   quotation           – the saved package object from Firestore
 *   onClose             – () => void
 *   onEdit              – (quotation) => void   optional
 *   onCopy              – (quotation) => void   optional  (WhatsApp summary)
 *   onPDF               – (quotation) => void   optional
 *   onConvertToBooking  – (quotation) => void   optional  (shown only when status === "Accepted")
 *   onSendReminder      – (quotation) => void   optional  (shown only when status === "Sent")
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
  Users,
  CalendarCheck,
  BellRing,
  Layers,
  AlertCircle,
  Wallet,
  CheckCircle2,
  BedDouble,
  Utensils,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  EP: "Room only",
  CP: "Bed & Breakfast",
  MAP: "Breakfast & Dinner",
  AP: "All Meals",
};

const STATUS_CONFIG = {
  Draft:    { cls: "bg-slate-100 text-slate-600 border-slate-200",         dot: "bg-slate-400" },
  Sent:     { cls: "bg-theme-muted text-theme-secondary border-theme-accent/30", dot: "bg-theme-primary" },
  Accepted: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",    dot: "bg-emerald-500" },
  Rejected: { cls: "bg-red-50 text-red-600 border-red-200",                dot: "bg-red-500" },
};

// ── sub-components ────────────────────────────────────────────────────────────

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

function SectionHeading({ children, badge, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {children}
        </h3>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-theme-muted text-theme-secondary border border-theme-accent/30 px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

// ── Hotel Card ─────────────────────────────────────────────────────────────────
function HotelCard({ entry }) {
  const mealIcon  = MEAL_ICONS[entry.selectedMealPlan]  || "🍽️";
  const mealLabel = MEAL_LABELS[entry.selectedMealPlan] || entry.selectedMealPlan || "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-theme-accent/60 hover:shadow-sm transition-all">
      {/* Colored top strip */}
      <div className="h-1 bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${entry.isCustom ? "bg-violet-100" : "bg-theme-muted"}`}>
              <Hotel className={`h-4 w-4 ${entry.isCustom ? "text-violet-600" : "text-theme-primary"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-semibold text-slate-800 text-sm leading-tight">
                  {entry.hotel}
                </p>
                {entry.isCustom && (
                  <span className="text-[9px] bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    Custom
                  </span>
                )}
              </div>
              {entry.rating && <Stars rating={entry.rating} />}
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0 text-theme-accent" />
                {entry.city}{entry.state ? `, ${entry.state}` : ""}
              </p>
            </div>
          </div>

          {/* Nights badge */}
          <div className="flex-shrink-0 text-center">
            <div className="bg-theme-dark text-white text-xs font-bold px-2.5 py-1.5 rounded-lg leading-tight">
              <span className="text-lg font-black leading-none">{entry.nights}</span>
              <span className="block text-[9px] uppercase tracking-widest opacity-70">nights</span>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Check-in</p>
            <p className="text-xs font-semibold text-slate-700">{fmtDate(entry.checkInDate)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Check-out</p>
            <p className="text-xs font-semibold text-slate-700">{fmtDate(entry.checkOutDate)}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Room</p>
            <p className="text-xs font-semibold text-slate-700 truncate">{entry.selectedRoomCategory || "—"}</p>
          </div>
          <div className="bg-theme-muted rounded-lg px-2.5 py-1.5 space-y-0.5">
            <p className="text-[9px] text-theme-secondary uppercase tracking-widest font-semibold">Meals</p>
            <p className="text-xs font-semibold text-theme-dark truncate">
              {mealIcon} {entry.selectedMealPlan || "—"}
            </p>
            <p className="text-[9px] text-theme-secondary/70">{mealLabel}</p>
          </div>
        </div>

        {/* Guests + Cost footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1">
            {entry.numDouble > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                🛏️ {entry.numDouble} room{entry.numDouble > 1 ? "s" : ""}
              </span>
            )}
            {entry.numExtraAdult > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                👤 +{entry.numExtraAdult} adult{entry.numExtraAdult > 1 ? "s" : ""}
              </span>
            )}
            {entry.numExtraChild > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-full">
                👧 {entry.numExtraChild} child{entry.numExtraChild > 1 ? "ren" : ""}
              </span>
            )}
            {entry.numCNB > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                🛌 {entry.numCNB} CNB
              </span>
            )}
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Hotel cost</p>
            <p className="text-base font-black text-theme-primary">₹{fmt(entry.hotelTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Transport Card ─────────────────────────────────────────────────────────────
function TransportCard({ transport }) {
  if (!transport?.selectedVehicle && !transport?.vehicleName) return null;

  const vehicleName = transport.selectedVehicle?.type || transport.vehicleName || "Vehicle";
  const isAC        = transport.selectedVehicle?.ac ?? transport.ac ?? false;
  const pkgName     = transport.name || transport.packageName || "Transport package";
  const totalCost   = transport.totalTransportCost || transport.selectedVehicle?.price || 0;
  const pricingType = transport.pricingType || "fixed";
  const perKm       = transport.selectedVehicle?.perKmprice || transport.perKmprice || 0;
  const toll        = transport.tollCharges     || 0;
  const permit      = transport.permitCharges   || 0;
  const other       = transport.otherCharges    || 0;
  const driver      = transport.driverAllowance || 0;
  const baseCost    = transport.vehicleCost     || 0;

  const breakdownItems = [
    { label: "Base cost",        val: baseCost },
    { label: "Driver allowance", val: driver },
    { label: "Toll charges",     val: toll },
    { label: "Permit",           val: permit },
    { label: "Other",            val: other },
  ].filter((i) => i.val > 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-theme-accent/60 hover:shadow-sm transition-all">
      <div className="h-1 bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-muted flex items-center justify-center flex-shrink-0">
              <Car className="h-5 w-5 text-theme-primary" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{vehicleName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{pkgName}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isAC
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}>
                  {isAC ? "✓ AC" : "Non-AC"}
                </span>
                <span className="text-[10px] bg-theme-muted text-theme-secondary border border-theme-accent/30 px-2 py-0.5 rounded-full font-semibold">
                  {pricingType === "perKm" || perKm > 0 ? `₹${fmt(perKm)}/km` : "Fixed rate"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">Total</p>
            <p className="text-xl font-black text-theme-primary">₹{fmt(totalCost)}</p>
          </div>
        </div>

        {breakdownItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {breakdownItems.map(({ label, val }) => (
              <div key={label} className="bg-slate-50 rounded-lg px-2.5 py-2">
                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">₹{fmt(val)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Row ───────────────────────────────────────────────────────────────
function ActivityRow({ act }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-theme-accent/50 hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
        <Palmtree className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-800 truncate">{act.name}</p>
          {act.isCustom && (
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0">
              Custom
            </span>
          )}
        </div>
        {act.city && (
          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            {act.city}
            {act.participants ? ` · ${act.participants} pax` : ""}
          </p>
        )}
      </div>
      <p className="text-sm font-black text-emerald-600 flex-shrink-0">₹{fmt(act.totalPrice)}</p>
    </div>
  );
}

// ── Pricing Breakdown ──────────────────────────────────────────────────────────
function PricingBreakdown({ hotelTotal, transportTotal, activitiesTotal, markup, grandTotal, optionName, isMulti }) {
  const rows = [
    { label: `Hotels`,     icon: <Hotel className="h-3.5 w-3.5 text-theme-primary" />,    val: hotelTotal,      show: hotelTotal > 0 },
    { label: "Transport",  icon: <Car className="h-3.5 w-3.5 text-theme-primary" />,       val: transportTotal,  show: transportTotal > 0 },
    { label: "Activities", icon: <Palmtree className="h-3.5 w-3.5 text-theme-primary" />,  val: activitiesTotal, show: activitiesTotal > 0 },
  ].filter((r) => r.show);

  const subtotal = hotelTotal + transportTotal + activitiesTotal;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {isMulti && (
        <div className="px-4 py-2.5 bg-theme-muted border-b border-theme-accent/20 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-theme-secondary">
            Price breakdown
          </p>
          <span className="text-[10px] font-semibold bg-white text-theme-primary border border-theme-accent/30 px-2 py-0.5 rounded-full">
            {optionName}
          </span>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {rows.map(({ label, icon, val }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-theme-muted flex items-center justify-center">
                {icon}
              </div>
              <span className="text-sm text-slate-600 font-medium">{label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">₹{fmt(val)}</span>
          </div>
        ))}

        {markup > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-sm text-amber-700 font-medium">Markup / service fee</span>
            </div>
            <span className="text-sm font-semibold text-amber-700">+₹{fmt(markup)}</span>
          </div>
        )}
      </div>

      {/* Grand total bar */}
      <div className="bg-gradient-to-r from-theme-dark to-theme-secondary px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Grand total</p>
          {markup > 0 && (
            <p className="text-[10px] text-white/30 mt-0.5">Incl. ₹{fmt(markup)} markup</p>
          )}
        </div>
        <p className="text-3xl font-black text-white tracking-tight">₹{fmt(grandTotal)}</p>
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
  const [activeOptionIdx, setActiveOptionIdx] = useState(0);
  const [linkedBookingExists, setLinkedBookingExists] = useState(true);

  useEffect(() => {
    setActiveOptionIdx(0);
  }, [quotation?.refNumber]);

  useEffect(() => {
    if (!quotation?.convertedToBooking || !quotation?.bookingId) {
      setLinkedBookingExists(false);
      return;
    }
    setLinkedBookingExists(true);
    getBookingById(quotation.bookingId)
      .then((b) => setLinkedBookingExists(!!b))
      .catch(() => setLinkedBookingExists(false));
  }, [quotation?.bookingId, quotation?.convertedToBooking]);

  if (!quotation) return null;

  // ── Resolve package options ────────────────────────────────────────────────
  const hasMultiOptions =
    Array.isArray(quotation.packageOptions) && quotation.packageOptions.length > 0;

  const packageOptions = hasMultiOptions
    ? quotation.packageOptions
    : [
        {
          name: "Option 1",
          hotelEntries: quotation.hotelSummary || [],
          hotelTotal: (quotation.hotelSummary || []).reduce(
            (s, h) => s + Number(h.hotelTotal || 0),
            0,
          ),
        },
      ];

  const activeOption    = packageOptions[activeOptionIdx] || packageOptions[0];
  const hotels          = activeOption?.hotelEntries || [];
  const activeHotelTotal =
    activeOption.hotelTotal ??
    hotels.reduce((s, h) => s + Number(h.hotelTotal || 0), 0);

  const transport       = quotation.transportSummary || null;
  const activities      = quotation.activitySummary  || [];
  const transportTotal  = Number(transport?.totalTransportCost || 0);
  const activitiesTotal = activities.reduce((s, a) => s + Number(a.totalPrice || 0), 0);
  const markup          = Number(quotation.markup || 0);

  const getOptionGrandTotal = (opt) => {
    const hotelT =
      opt.hotelTotal ??
      (opt.hotelEntries || []).reduce((s, h) => s + Number(h.hotelTotal || 0), 0);
    return hotelT + transportTotal + activitiesTotal + markup;
  };

  const activeGrandTotal = getOptionGrandTotal(activeOption);
  const isMulti          = packageOptions.length > 1;

  const statusCfg     = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.Draft;
  const customerLabel = quotation.customerName || quotation.leadName || "—";
  const createdDate   = quotation.createdAt?.seconds
    ? new Date(quotation.createdAt.seconds * 1000).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="shrink-0">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to" />

          <div className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {quotation.packageName || "Package Preview"}
                </h2>
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {quotation.status || "Draft"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-theme-muted flex items-center justify-center">
                    <Users className="h-3 w-3 text-theme-primary" />
                  </div>
                  {customerLabel}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {quotation.refNumber || "#REF-PENDING"}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{createdDate}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Option Tabs ── */}
        {isMulti && (
          <div className="border-t border-b border-slate-100 bg-slate-50/60 px-6 shrink-0">
            <div className="flex items-center gap-2 py-2.5 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0 mr-1">
                <Layers className="h-3.5 w-3.5 text-theme-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Options
                </span>
              </div>
              <div className="w-px h-4 bg-slate-300 shrink-0" />
              <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
                {packageOptions.map((opt, idx) => {
                  const isActive   = idx === activeOptionIdx;
                  const hotelCount = (opt.hotelEntries || []).length;
                  const optTotal   = getOptionGrandTotal(opt);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveOptionIdx(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
                        isActive
                          ? "bg-theme-dark text-white border-theme-dark shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-theme-accent/50 hover:text-theme-primary"
                      }`}
                    >
                      {opt.name}
                      {hotelCount > 0 ? (
                        <span className={`text-[10px] font-bold ${isActive ? "text-white/60" : "text-theme-primary"}`}>
                          ₹{fmt(optTotal)}
                        </span>
                      ) : (
                        <AlertCircle className={`h-3 w-3 ${isActive ? "text-amber-300" : "text-amber-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Hotels ── */}
          <section>
            <SectionHeading
              badge={isMulti ? activeOption.name : undefined}
              action={
                hotels.length > 0 ? (
                  <span className="text-[10px] font-semibold text-theme-primary bg-theme-muted px-2 py-0.5 rounded-full">
                    {hotels.reduce((s, h) => s + (parseInt(h.nights) || 0), 0)} nights total
                  </span>
                ) : null
              }
            >
              Accommodations
            </SectionHeading>

            {hotels.length > 0 ? (
              <div className="space-y-3">
                {hotels.map((entry, i) => (
                  <HotelCard key={i} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">No hotels added to {activeOption.name}.</p>
              </div>
            )}
          </section>

          {/* ── Options Comparison (multi only) ── */}
          {isMulti && (
            <section>
              <SectionHeading>All options — comparison</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packageOptions.map((opt, idx) => {
                  const isActive    = idx === activeOptionIdx;
                  const optHotelTot =
                    opt.hotelTotal ??
                    (opt.hotelEntries || []).reduce(
                      (s, h) => s + Number(h.hotelTotal || 0), 0,
                    );
                  const optTotal = getOptionGrandTotal(opt);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveOptionIdx(idx)}
                      className={`text-left p-3.5 rounded-xl border transition-all ${
                        isActive
                          ? "bg-theme-dark border-theme-dark shadow-sm"
                          : "bg-white border-slate-200 hover:border-theme-accent/60 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-800"}`}>
                          {opt.name}
                        </span>
                        <span className={`text-sm font-black ${isActive ? "text-white" : "text-theme-primary"}`}>
                          ₹{fmt(optTotal)}
                        </span>
                      </div>
                      {(opt.hotelEntries || []).length > 0 ? (
                        <div className="space-y-0.5">
                          {(opt.hotelEntries || []).map((h, i) => (
                            <p key={i} className={`text-[10px] truncate flex items-center gap-1 ${isActive ? "text-white/60" : "text-slate-500"}`}>
                              <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
                              {h.hotel} · {h.city} · {h.nights}N
                            </p>
                          ))}
                          <div className={`flex gap-2 mt-1.5 text-[9px] font-semibold ${isActive ? "text-white/40" : "text-slate-400"}`}>
                            <span>Hotels ₹{fmt(optHotelTot)}</span>
                            {transportTotal > 0 && <span>· Trans ₹{fmt(transportTotal)}</span>}
                            {activitiesTotal > 0 && <span>· Act ₹{fmt(activitiesTotal)}</span>}
                          </div>
                        </div>
                      ) : (
                        <p className={`text-[10px] flex items-center gap-1 ${isActive ? "text-amber-300" : "text-amber-500"}`}>
                          <AlertCircle className="h-3 w-3" /> No hotels added
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Transport ── */}
          {transport && (transport.selectedVehicle || transport.vehicleName) && (
            <section>
              <SectionHeading badge={isMulti ? "Shared" : undefined}>
                Transport
              </SectionHeading>
              <TransportCard transport={transport} />
            </section>
          )}

          {/* ── Activities ── */}
          {activities.length > 0 && (
            <section>
              <SectionHeading badge={isMulti ? "Shared" : undefined}>
                Activities
              </SectionHeading>
              <div className="space-y-2">
                {activities.map((act, i) => (
                  <ActivityRow key={i} act={act} />
                ))}
              </div>
            </section>
          )}

          {/* ── Pricing ── */}
          <section>
            <PricingBreakdown
              hotelTotal={activeHotelTotal}
              transportTotal={transportTotal}
              activitiesTotal={activitiesTotal}
              markup={markup}
              grandTotal={activeGrandTotal}
              optionName={activeOption.name}
              isMulti={isMulti}
            />

            {/* All-options totals (multi only) */}
            {isMulti && (
              <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Grand totals — all options
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {packageOptions.map((opt, idx) => {
                    const isActive = idx === activeOptionIdx;
                    const optTotal = getOptionGrandTotal(opt);
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveOptionIdx(idx)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-theme-dark"
                            : "bg-white hover:bg-theme-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-theme-accent" />
                          )}
                          <span className={`font-semibold ${isActive ? "text-white" : "text-slate-700"}`}>
                            {opt.name}
                          </span>
                        </div>
                        <span className={`font-black text-base ${isActive ? "text-white" : "text-theme-primary"}`}>
                          ₹{fmt(optTotal)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 bg-white shrink-0">
          {/* Left — secondary actions */}
          <div className="flex items-center gap-2">
            {onCopy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(quotation)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1.5 h-9 px-3"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            )}
            {onPDF && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPDF(quotation)}
                className="text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 h-9 px-3"
              >
                <FileText className="h-3.5 w-3.5 text-theme-primary" />
                Export PDF
              </Button>
            )}
          </div>

          {/* Right — primary actions */}
          <div className="flex items-center gap-2">
            {onSendReminder && quotation.status === "Sent" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSendReminder(quotation)}
                className="text-xs font-semibold border-amber-200 text-amber-600 hover:bg-amber-50 gap-1.5 h-9 px-3"
              >
                <BellRing className="h-3.5 w-3.5" />
                Reminder
              </Button>
            )}

            {onConvertToBooking && quotation.status === "Accepted" && (
              linkedBookingExists ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 h-9">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Booking Created
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onConvertToBooking(quotation)}
                  className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 px-4"
                >
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Convert to Booking
                </Button>
              )
            )}

            {onEdit && (
              <Button
                size="sm"
                onClick={() => onEdit(quotation)}
                className="text-xs font-semibold bg-theme-primary hover:bg-theme-secondary text-white gap-1.5 h-9 px-4 shadow-sm"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Quotation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}