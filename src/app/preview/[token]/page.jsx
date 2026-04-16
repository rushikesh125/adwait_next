"use client";
/**
 * /app/preview/[token]/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Public (no-auth) customer-facing itinerary preview page.
 * Route: /preview/[token]
 *
 * Redesigned with modern blue theme + shadcn-style components.
 * All functionality preserved from original.
 */

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebase/config";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import {
  MapPin,
  Calendar,
  Hotel,
  Car,
  Palmtree,
  CheckCircle2,
  XCircle,
  Clock,
  Moon,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Star,
  FileText,
  Info,
  AlertTriangle,
  Plane,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

const MEAL_ICONS = { EP: "🍳", CP: "☕", MAP: "🍽️", AP: "🍱" };
const MEAL_LABELS = {
  EP: "Room Only",
  CP: "With Breakfast",
  MAP: "Breakfast & Dinner",
  AP: "All Meals",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives (shadcn-style)
// ─────────────────────────────────────────────────────────────────────────────

/** Card wrapper */
function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** Section heading */
function SectionHeading({
  icon: Icon,
  label,
  iconColor = "text-theme-primary",
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-xl bg-theme-muted flex items-center justify-center">
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
        {label}
      </h2>
    </div>
  );
}

/** Pill / badge */
function Pill({ children, variant = "default" }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";
  const variants = {
    default: "bg-white/20 text-white backdrop-blur-sm",
    blue: "bg-theme-muted text-theme-primary",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}

/** Info chip inside cards */
function InfoChip({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-700 leading-snug">{value}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DayCard
// ─────────────────────────────────────────────────────────────────────────────
function DayCard({ day, index }) {
  const [open, setOpen] = useState(index < 2);
  const dayNum = day.dayNumber || index + 1;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Day number badge */}
        <div className="flex-shrink-0 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-gradient-from to-theme-gradient-to flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm leading-none">
              {dayNum}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">
            {day.title || `Day ${dayNum}`}
          </p>
          {day.description && !open && (
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {day.description.slice(0, 72)}…
            </p>
          )}
        </div>

        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          )}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
          {day.images?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {day.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Day ${dayNum} photo ${i + 1}`}
                  className="h-40 w-64 object-cover rounded-xl flex-shrink-0 border border-slate-100"
                />
              ))}
            </div>
          )}
          {day.description && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {day.description}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HotelCard
// ─────────────────────────────────────────────────────────────────────────────
function HotelCard({ hotel }) {
  return (
    <Card>
      {/* Hotel identity row */}
      <div className="px-4 py-3.5 flex items-start gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-theme-muted flex items-center justify-center flex-shrink-0">
          <Hotel className="h-4.5 w-4.5 text-theme-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-tight truncate">
            {hotel.hotel || "Hotel"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-slate-400" />
            <p className="text-xs text-slate-500 truncate">
              {hotel.city}, {hotel.state}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-1 bg-slate-800 text-white text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide">
            <Moon className="h-2.5 w-2.5" />
            {hotel.nights}N
          </span>
        </div>
      </div>

      {/* Detail chips */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <InfoChip label="Check-in" value={formatDate(hotel.checkInDate)} />
        <InfoChip label="Check-out" value={formatDate(hotel.checkOutDate)} />
        <InfoChip label="Room Type" value={hotel.selectedRoomCategory || "—"} />
        <InfoChip
          label="Meal Plan"
          value={`${MEAL_ICONS[hotel.selectedMealPlan] || "🍽️"} ${hotel.selectedMealPlan || "—"}`}
          sub={MEAL_LABELS[hotel.selectedMealPlan]}
        />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading / Error screens
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-theme-muted flex items-center justify-center mx-auto animate-pulse">
          <Plane className="h-8 w-8 text-theme-primary" />
        </div>
        <p className="text-slate-600 font-medium text-sm">
          Loading your itinerary…
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ title, message }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-lg">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">{message}</p>
        </div>
        <p className="text-xs text-slate-400">
          Please contact your travel agent for a new link.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const params = useParams();
  const token = params?.token;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("notfound");
      setLoading(false);
      return;
    }

    const fetchQuotation = async () => {
      try {
        const cgRef = collectionGroup(db, "packages");
        const q = query(cgRef, where("shareToken", "==", token));
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("notfound");
          return;
        }

        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };

        if (data.shareExpiresAt && Date.now() > data.shareExpiresAt) {
          setError("expired");
          return;
        }

        if (data.status === "Rejected") {
          setError("rejected");
          return;
        }

        setQuotation(data);
      } catch (err) {
        console.error("[PreviewPage]", err);
        setError("error");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [token]);

  if (loading) return <LoadingScreen />;
  if (error === "expired")
    return (
      <ErrorScreen
        title="Link Expired"
        message="This itinerary preview link has expired. Please ask your travel agent for a fresh link."
      />
    );
  if (error === "rejected")
    return (
      <ErrorScreen
        title="Quotation Unavailable"
        message="This quotation is no longer active."
      />
    );
  if (error === "notfound" || error === "error")
    return (
      <ErrorScreen
        title="Preview Not Found"
        message="This link is invalid or has been revoked by the travel agent."
      />
    );
  if (!quotation) return null;

  // ── Derived data ────────────────────────────────────────────────────────────
  const itinerary = quotation.itinerarySummary || null;
  const hotels = quotation.hotelSummary || [];
  const transport = quotation.transportSummary;
  const activities = quotation.activitySummary || [];
  const showPricing = quotation.showPricing === true;

  const totalNights = hotels.reduce((s, h) => s + (parseInt(h.nights) || 0), 0);
  const totalDays = itinerary?.days?.length || totalNights + 1;
  const destinations = [...new Set(hotels.map((h) => h.city).filter(Boolean))];

  const firstCheckIn = hotels[0]?.checkInDate;
  const lastCheckOut = hotels[hotels.length - 1]?.checkOutDate;

  const inclusions = itinerary?.inclusions?.filter((i) => i.selected) || [];
  const exclusions = itinerary?.exclusions?.filter((i) => i.selected) || [];
  const tnc = itinerary?.tnc?.filter((i) => i.selected) || [];
  const cancellation = itinerary?.cancellation?.filter((i) => i.selected) || [];
  const impInfo = itinerary?.impInfo?.filter((i) => i.selected) || [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-theme-gradient-from to-theme-gradient-to text-white">
        {/* Poster image */}
        {itinerary?.posterImage && (
          <img
            src={itinerary.posterImage}
            alt="Destination"
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
        )}

        {/* Subtle geometric overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative px-5 pt-8 pb-10 max-w-2xl mx-auto">
          {/* Brand bar */}
          <div className="flex items-center justify-between mb-8">
            {/* Logo + Name */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-20 rounded-md bg-white overflow-hidden flex items-center justify-center">
                <img
                  src="/adwait-logo.jpg"
                  alt="Adwait Tours Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <span className="text-3xl font-bold tracking-wide opacity-95">
                Adwait Tours
              </span>
            </div>

            {/* Status */}
            {/* {quotation?.status && (
              <span className="text-[10px] font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-widest">
                {quotation.status}
              </span>
            )} */}
          </div>
              <hr className="my-5"/>
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight mb-2">
            {itinerary?.title ||
              quotation.packageName ||
              "Your Travel Itinerary"}
          </h1>

          {/* Customer name */}
          {(quotation.customerName || quotation.leadName) && (
            <p className="text-sm opacity-80 mb-5 font-medium">
              Prepared for{" "}
              <strong className="text-white">
                {quotation.customerName || quotation.leadName}
              </strong>
            </p>
          )}

          {/* Meta pills row */}
          <div className="flex flex-wrap gap-2 mt-4">
            {destinations.length > 0 && (
              <Pill variant="default">
                <MapPin className="h-3 w-3" />
                {destinations.join(" · ")}
              </Pill>
            )}
            {totalNights > 0 && (
              <Pill variant="default">
                <Moon className="h-3 w-3" />
                {totalNights}N / {totalDays}D
              </Pill>
            )}
            {firstCheckIn && (
              <Pill variant="default">
                <Calendar className="h-3 w-3" />
                {formatDateShort(firstCheckIn)}
                {lastCheckOut && (
                  <>
                    <ArrowRight className="h-2.5 w-2.5 opacity-60" />
                    {formatDateShort(lastCheckOut)}
                  </>
                )}
              </Pill>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-8 pt-7">
        {/* ── Day-wise plan ── */}
        {itinerary?.days?.length > 0 && (
          <section>
            <SectionHeading
              icon={Calendar}
              label="Day-wise Plan"
              iconColor="text-theme-primary"
            />
            <div className="space-y-2.5">
              {itinerary.days.map((day, i) => (
                <DayCard key={day.id || i} day={day} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Accommodation ── */}
        {hotels.length > 0 && (
          <section>
            <SectionHeading
              icon={Hotel}
              label="Accommodation"
              iconColor="text-theme-primary"
            />
            <div className="space-y-2.5">
              {hotels.map((h, i) => (
                <HotelCard key={i} hotel={h} />
              ))}
            </div>
          </section>
        )}

        {/* ── Transport ── */}
        {transport?.vehicleName && (
          <section>
            <SectionHeading
              icon={Car}
              label="Transport"
              iconColor="text-theme-primary"
            />
            <Card className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-theme-muted flex items-center justify-center flex-shrink-0">
                <Car className="h-4 w-4 text-theme-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">
                  {transport.vehicleName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {transport.ac && (
                    <span className="text-[10px] bg-theme-muted text-theme-primary font-semibold px-2 py-0.5 rounded-full">
                      AC
                    </span>
                  )}
                  {transport.seats && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {transport.seats} seater
                    </span>
                  )}
                </div>
              </div>
              {showPricing && transport.totalTransportCost > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-slate-400 font-medium">
                    Transport
                  </p>
                  <p className="font-black text-theme-primary text-sm">
                    ₹
                    {Number(transport.totalTransportCost).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* ── Activities ── */}
        {activities.length > 0 && (
          <section>
            <SectionHeading
              icon={Palmtree}
              label="Activities & Sightseeing"
              iconColor="text-emerald-600"
            />
            <Card className="overflow-hidden divide-y divide-slate-100">
              {activities.map((act, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {act.name}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {act.city}
                      {act.participants > 1 && ` · ${act.participants} persons`}
                    </p>
                  </div>
                  {showPricing && act.totalPrice > 0 && (
                    <p className="text-sm font-bold text-emerald-600 flex-shrink-0">
                      ₹{Number(act.totalPrice).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* ── Grand Total ── */}
        {showPricing && quotation.grandTotal > 0 && (
          <section>
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-theme-gradient-from to-theme-gradient-to text-white p-6 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-1">
                    Total Package Cost
                  </p>
                  <p className="text-4xl font-black tracking-tight">
                    ₹
                    {Number(quotation.grandTotal).toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs opacity-50 mt-2 leading-relaxed">
                    Inclusive of hotel, transport &amp; activities as listed
                    above.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Inclusions ── */}
        {inclusions.length > 0 && (
          <section>
            <div className="rounded-2xl bg-green-50 border border-green-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="text-sm font-bold text-green-800">
                  What's Included
                </h2>
              </div>
              <ul className="space-y-2">
                {inclusions.map((item, i) => (
                  <li
                    key={item.id || i}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-green-800 leading-relaxed">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Exclusions ── */}
        {exclusions.length > 0 && (
          <section>
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <h2 className="text-sm font-bold text-red-800">Not Included</h2>
              </div>
              <ul className="space-y-2">
                {exclusions.map((item, i) => (
                  <li
                    key={item.id || i}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700 leading-relaxed">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── T&C + Cancellation ── */}
        {(tnc.length > 0 || cancellation.length > 0) && (
          <section className="rounded-2xl bg-amber-50 border border-amber-100 p-4 space-y-5">
            {tnc.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-800">
                    Terms &amp; Conditions
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {tnc.map((item, i) => (
                    <li
                      key={item.id || i}
                      className="flex items-start gap-2 text-xs text-amber-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cancellation.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-800">
                    Cancellation Policy
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {cancellation.map((item, i) => (
                    <li
                      key={item.id || i}
                      className="flex items-start gap-2 text-xs text-amber-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ── Important Info ── */}
        {impInfo.length > 0 && (
          <section className="rounded-2xl bg-theme-muted border border-blue-100 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-theme-primary" />
              <h3 className="text-sm font-bold text-theme-dark">
                Important Information
              </h3>
            </div>
            <ul className="space-y-1.5">
              {impInfo.map((item, i) => (
                <li
                  key={item.id || i}
                  className="flex items-start gap-2 text-xs text-theme-secondary"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-theme-accent flex-shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="pt-4 border-t border-slate-200 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-theme-muted flex items-center justify-center">
              <Plane className="h-3.5 w-3.5 text-theme-primary" />
            </div>
            <span className="text-sm font-bold text-slate-700">
              Adwait Tours
            </span>
          </div>
          <p className="text-xs text-slate-500">
            📞 +91 9884798483 · www.adwaittours.com
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            This preview link expires 60 days from generation
          </p>
        </footer>
      </div>
    </div>
  );
}
