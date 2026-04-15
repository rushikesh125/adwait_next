"use client";
/**
 * /app/preview/[token]/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Public (no-auth) customer-facing itinerary preview page.
 *
 * Route: /preview/[token]
 *
 * Fetches the quotation via shareToken from Firestore collectionGroup.
 * Renders a mobile-first, WhatsApp-friendly travel itinerary.
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
  Sun,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  BedDouble,
  Utensils,
  Users,
  Star,
  FileText,
  Info,
  AlertTriangle,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Sub-components ────────────────────────────────────────────────────────────

function DayCard({ day, index }) {
  const [open, setOpen] = useState(index < 2);

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm">
      {/* Day header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
          <span className="text-white font-black text-sm leading-none">
            {day.dayNumber || index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800 truncate">
            {day.title || `Day ${day.dayNumber || index + 1}`}
          </p>
          {day.description && !open && (
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {day.description.slice(0, 70)}…
            </p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-stone-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />
        )}
      </button>

      {/* Day body */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-stone-100">
          {/* Photos */}
          {day.images?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {day.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Day ${day.dayNumber} photo ${i + 1}`}
                  className="h-36 w-60 object-cover rounded-xl flex-shrink-0 border border-stone-100"
                />
              ))}
            </div>
          )}

          {/* Description */}
          {day.description && (
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
              {day.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HotelCard({ hotel }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Hotel className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-800 text-sm truncate">
            {hotel.hotel || "Hotel"}
          </p>
          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {hotel.city}, {hotel.state}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-1 bg-stone-800 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            <Moon className="h-2.5 w-2.5" />
            {hotel.nights}N
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {[
          { label: "Check-in", val: formatDate(hotel.checkInDate) },
          { label: "Check-out", val: formatDate(hotel.checkOutDate) },
          {
            label: "Room",
            val: hotel.selectedRoomCategory || "—",
          },
          {
            label: "Meals",
            val: `${MEAL_ICONS[hotel.selectedMealPlan] || "🍽️"} ${hotel.selectedMealPlan || "—"}`,
            sub: MEAL_LABELS[hotel.selectedMealPlan],
          },
        ].map(({ label, val, sub }) => (
          <div
            key={label}
            className="bg-stone-50 rounded-xl px-3 py-2 border border-stone-100"
          >
            <p className="text-[9px] text-stone-400 uppercase tracking-wider font-medium">
              {label}
            </p>
            <p className="text-xs font-semibold text-stone-700 mt-0.5">
              {val}
            </p>
            {sub && <p className="text-[9px] text-stone-400">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistSection({ title, icon: Icon, items, colorClass, bgClass }) {
  const selected = (items || []).filter((i) => i.selected);
  if (!selected.length) return null;

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-bold flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="space-y-2">
        {selected.map((item, i) => (
          <li key={item.id || i} className="flex items-start gap-2.5 text-sm">
            <div
              className={`w-5 h-5 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0 mt-0.5`}
            >
              <Icon className={`h-3 w-3 ${colorClass}`} />
            </div>
            <span className="text-stone-600 leading-relaxed">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Loading / Error screens ───────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto animate-pulse">
          <MapPin className="h-8 w-8 text-amber-500" />
        </div>
        <p className="text-stone-600 font-medium">Loading your itinerary…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ title, message }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <div>
          <h2 className="font-bold text-stone-800 text-lg">{title}</h2>
          <p className="text-stone-500 text-sm mt-1">{message}</p>
        </div>
        <p className="text-xs text-stone-400">
          Please contact your travel agent for a new link.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PreviewPage() {
  const params = useParams();
  const token = params?.token;

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // "expired" | "notfound" | "error"

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

        // Expiry check
        if (data.shareExpiresAt && Date.now() > data.shareExpiresAt) {
          setError("expired");
          return;
        }

        // Rejected check
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

  const itinerary = quotation.itinerarySummary || null;
  const hotels = quotation.hotelSummary || [];
  const transport = quotation.transportSummary;
  const activities = quotation.activitySummary || [];
  const showPricing = quotation.showPricing === true;

  const totalNights = hotels.reduce(
    (s, h) => s + (parseInt(h.nights) || 0),
    0
  );
  const totalDays = (itinerary?.days?.length) || totalNights + 1;
  const destinations = [
    ...new Set(hotels.map((h) => h.city).filter(Boolean)),
  ];

  const firstCheckIn = hotels[0]?.checkInDate;
  const lastCheckOut = hotels[hotels.length - 1]?.checkOutDate;

  const inclusions =
    itinerary?.inclusions?.filter((i) => i.selected) || [];
  const exclusions =
    itinerary?.exclusions?.filter((i) => i.selected) || [];
  const tnc = itinerary?.tnc?.filter((i) => i.selected) || [];
  const cancellation =
    itinerary?.cancellation?.filter((i) => i.selected) || [];
  const impInfo = itinerary?.impInfo?.filter((i) => i.selected) || [];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-500 to-rose-500 text-white">
        {/* Poster image overlay */}
        {itinerary?.posterImage && (
          <img
            src={itinerary.posterImage}
            alt="Destination"
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        )}
        <div className="relative px-5 pt-10 pb-8 max-w-2xl mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold opacity-90">
              Adwait Tours
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
            {itinerary?.title ||
              quotation.packageName ||
              "Your Travel Itinerary"}
          </h1>

          {/* For customer */}
          {(quotation.customerName || quotation.leadName) && (
            <p className="text-sm opacity-80 mb-4">
              Prepared for{" "}
              <strong>
                {quotation.customerName || quotation.leadName}
              </strong>
            </p>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {destinations.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold">
                <MapPin className="h-3 w-3" />
                {destinations.join(" · ")}
              </div>
            )}
            {totalNights > 0 && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold">
                <Moon className="h-3 w-3" />
                {totalNights}N / {totalDays}D
              </div>
            )}
            {firstCheckIn && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold">
                <Calendar className="h-3 w-3" />
                {formatDateShort(firstCheckIn)}
                {lastCheckOut && ` → ${formatDateShort(lastCheckOut)}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8 pt-6">

        {/* ── Day-wise itinerary ── */}
        {itinerary?.days?.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-stone-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Day-wise Plan
            </h2>
            <div className="space-y-2.5">
              {itinerary.days.map((day, i) => (
                <DayCard key={day.id || i} day={day} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Accommodation ── */}
        {hotels.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-stone-800 flex items-center gap-2">
              <Hotel className="h-4 w-4 text-blue-500" />
              Accommodation
            </h2>
            <div className="space-y-2.5">
              {hotels.map((h, i) => (
                <HotelCard key={i} hotel={h} />
              ))}
            </div>
          </section>
        )}

        {/* ── Transport ── */}
        {transport?.vehicleName && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-stone-800 flex items-center gap-2">
              <Car className="h-4 w-4 text-indigo-500" />
              Transport
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm px-4 py-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Car className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-stone-800 text-sm">
                  🚗 {transport.vehicleName}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {transport.ac ? "AC Vehicle" : "Non-AC"}
                  {transport.seats ? ` · ${transport.seats} seater` : ""}
                </p>
              </div>
              {showPricing && transport.totalTransportCost > 0 && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-stone-400">Transport</p>
                  <p className="font-black text-indigo-600 text-sm">
                    ₹{Number(transport.totalTransportCost).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Activities ── */}
        {activities.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-stone-800 flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-emerald-500" />
              Activities & Sightseeing
            </h2>
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden divide-y divide-stone-100">
              {activities.map((act, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">
                      {act.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      📍 {act.city}
                      {act.participants > 1 ? ` · ${act.participants} persons` : ""}
                    </p>
                  </div>
                  {showPricing && act.totalPrice > 0 && (
                    <p className="text-sm font-bold text-emerald-600 flex-shrink-0">
                      ₹{Number(act.totalPrice).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Pricing total (if enabled) ── */}
        {showPricing && quotation.grandTotal > 0 && (
          <section>
            <div className="rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 text-white p-5 shadow-xl">
              <p className="text-sm font-semibold opacity-70 mb-1">
                Total Package Cost
              </p>
              <p className="text-4xl font-black tracking-tight">
                ₹
                {Number(quotation.grandTotal).toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs opacity-50 mt-2">
                Inclusive of hotel, transport & activities as listed above.
              </p>
            </div>
          </section>
        )}

        {/* ── Inclusions ── */}
        {inclusions.length > 0 && (
          <section className="rounded-2xl bg-green-50 border border-green-100 p-4 space-y-3">
            <h2 className="text-sm font-black text-green-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              What's Included
            </h2>
            <ul className="space-y-2">
              {inclusions.map((item, i) => (
                <li key={item.id || i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Exclusions ── */}
        {exclusions.length > 0 && (
          <section className="rounded-2xl bg-red-50 border border-red-100 p-4 space-y-3">
            <h2 className="text-sm font-black text-red-800 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Not Included
            </h2>
            <ul className="space-y-2">
              {exclusions.map((item, i) => (
                <li key={item.id || i} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── T&Cs ── */}
        {(tnc.length > 0 || cancellation.length > 0) && (
          <section className="rounded-2xl bg-amber-50 border border-amber-100 p-4 space-y-4">
            {tnc.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Terms & Conditions
                </h3>
                <ul className="space-y-1.5">
                  {tnc.map((item, i) => (
                    <li key={item.id || i} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 flex-shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cancellation.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Cancellation Policy
                </h3>
                <ul className="space-y-1.5">
                  {cancellation.map((item, i) => (
                    <li key={item.id || i} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-400 flex-shrink-0" />
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
          <section className="rounded-2xl bg-blue-50 border border-blue-100 p-4 space-y-2">
            <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
              <Info className="h-4 w-4" /> Important Information
            </h3>
            <ul className="space-y-1.5">
              {impInfo.map((item, i) => (
                <li key={item.id || i} className="flex items-start gap-2 text-xs text-blue-700">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-400 flex-shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-6 space-y-1">
          <p className="text-xs text-stone-400 font-medium">
            Prepared by{" "}
            <strong className="text-stone-600">Adwait Tours</strong>
          </p>
          <p className="text-xs text-stone-400">
            📞 +91 9884798483 · www.adwaittours.com
          </p>
          <p className="text-[10px] text-stone-300 mt-2">
            This preview link expires in 60 days from generation
          </p>
        </footer>
      </div>
    </div>
  );
}