"use client";

import React, { useState } from "react";
import {
  X, MapPin, Star, Building2, Globe, ExternalLink,
  BedDouble, Calendar, ChevronDown, ChevronUp,
  Pencil, Phone, Navigation, Utensils, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const PLAN_LABELS = { ep: "EP", cp: "CP", map: "MAP", ap: "AP" };
const PLAN_FULL = {
  ep: "European Plan (Room Only)",
  cp: "Continental Plan (B'fast)",
  map: "Modified American Plan (B'fast + Dinner)",
  ap: "American Plan (All Meals)",
};

const rangesOverlap = (startA, endA, startB, endB) => {
  const p = s => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
  const [sA, eA, sB, eB] = [p(startA), p(endA), p(startB), p(endB)];
  if (!sA || !eA || !sB || !eB) return false;
  return sA <= eB && sB <= eA;
};

const formatDate = (str) => {
  if (!str) return "—";
  const d = new Date(str);
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (val) => {
  const n = Number(val);
  if (!n) return <span className="text-slate-300">—</span>;
  return <span>₹{n.toLocaleString("en-IN")}</span>;
};

// ── Season Pricing Card ────────────────────────────────────────────────────
const SeasonBlock = ({ season, allSeasons, selfIndex }) => {
  const [open, setOpen] = useState(false);
  const activePlans = Object.keys(season.pricing || {});

  // Conflict check (read-only display only)
  let isConflict = false;
  const conflictsWith = [];
  for (let i = 0; i < allSeasons.length; i++) {
    if (i === selfIndex) continue;
    const other = allSeasons[i];
    if (rangesOverlap(season.start, season.end, other.start, other.end)) {
      if (season.priority == null || other.priority == null || Number(season.priority) === Number(other.priority)) {
        isConflict = true;
        conflictsWith.push(other.name || `Season ${i + 1}`);
      }
    }
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${isConflict ? "border-red-200" : "border-slate-200"}`}>
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${isConflict ? "bg-red-50" : open ? "bg-theme-primary/5" : "bg-slate-50 hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold text-sm text-slate-800 truncate">{season.name || "Unnamed Season"}</span>
          {season.start && season.end && (
            <span className="text-xs text-slate-400 hidden sm:inline shrink-0">
              {formatDate(season.start)} → {formatDate(season.end)}
            </span>
          )}
          {season.priority != null && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0 shrink-0">P{season.priority}</Badge>
          )}
          {isConflict && (
            <Badge className="bg-red-100 text-red-600 text-[10px] border-0 flex items-center gap-1 shrink-0">
              <AlertTriangle className="h-2.5 w-2.5" /> Overlap
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] text-slate-500 shrink-0 ml-2">
          {activePlans.length} plan{activePlans.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {open && (
        <div className="bg-white p-4 border-t border-slate-100">
          {activePlans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 w-32">Meal Plan</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 text-right">Double</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 text-right">Extra Adult</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 text-right">Extra Child</th>
                    <th className="px-3 py-2 font-semibold text-slate-500 text-right text-theme-primary">CNB</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlans.map(plan => {
                    const p = season.pricing[plan] || {};
                    return (
                      <tr key={plan} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="uppercase text-[10px] font-bold w-fit">{PLAN_LABELS[plan] || plan}</Badge>
                            <span className="text-[10px] text-slate-400">{PLAN_FULL[plan] || ""}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700">{formatCurrency(p.double)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(p.extraAdult)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(p.extraChild)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(p.cnb)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-3">No meal plans configured for this season.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Room Category Block ────────────────────────────────────────────────────
const RoomBlock = ({ room }) => {
  const [open, setOpen] = useState(false);
  const seasons = room.seasons || [];

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader
        className="py-3 px-4 bg-slate-50/80 cursor-pointer select-none flex flex-row items-center justify-between hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-theme-primary/10 rounded-lg">
            <BedDouble className="h-4 w-4 text-theme-primary" />
          </div>
          <span className="font-bold text-slate-800 text-sm">{room.categoryName || "Unnamed Room"}</span>
          <Badge variant="outline" className="text-[10px] text-slate-500">
            {seasons.length} season{seasons.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </CardHeader>

      {open && (
        <CardContent className="p-3 space-y-2 bg-white">
          {seasons.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No seasons defined for this room.</p>
          ) : (
            seasons.map((season, idx) => (
              <SeasonBlock
                key={idx}
                season={season}
                allSeasons={seasons}
                selfIndex={idx}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
};

// ── Main Modal ─────────────────────────────────────────────────────────────
const HotelDetailModal = ({ hotel, onClose, onEdit }) => {
  if (!hotel) return null;

  const toTitleCase = (str) => (str || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const starCount = parseInt(hotel.rating) || 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-theme-primary/10 rounded-xl shrink-0">
              <Building2 className="h-5 w-5 text-theme-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-lg leading-tight truncate">{toTitleCase(hotel.name)}</h2>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{hotel.city}, {hotel.state}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button
              onClick={onEdit}
              size="sm"
              className="bg-theme-primary text-white hover:bg-theme-primary/90 h-9 px-4 gap-2"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Property
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">

            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Star Rating */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-1.5">Star Rating</p>
                <div className="flex items-center gap-1">
                  {starCount > 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < starCount ? "fill-amber-500 text-amber-500" : "text-amber-200 fill-amber-100"}`} />
                    ))
                  ) : (
                    <span className="text-slate-400 text-sm">Not set</span>
                  )}
                </div>
                <p className="text-xs text-amber-700 font-semibold mt-1">{hotel.rating || "—"}</p>
              </div>

              {/* Google Rating */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center text-[9px] font-black text-blue-600">G</span>
                  Google Rating
                </p>
                <p className="text-2xl font-black text-slate-800">{hotel.GoogleReviewRating || "—"}</p>
                {hotel.GoogleListingURL && (
                  <a href={hotel.GoogleListingURL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1.5">
                    <ExternalLink className="h-3 w-3" /> View on Maps
                  </a>
                )}
              </div>

              {/* TripAdvisor Rating */}
              <div className="bg-green-50/60 border border-green-100 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-white border border-green-100 inline-flex items-center justify-center text-[9px] font-black text-green-600">T</span>
                  TripAdvisor
                </p>
                <p className="text-2xl font-black text-slate-800">{hotel.TripAdvisorRating || "—"}</p>
                {hotel.TripAdvisorURL && (
                  <a href={hotel.TripAdvisorURL} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="text-[10px] text-green-600 hover:underline flex items-center gap-1 mt-1.5">
                    <Globe className="h-3 w-3" /> View on TripAdvisor
                  </a>
                )}
              </div>
            </div>

            {/* Address & Phone */}
            {(hotel.address || hotel.phone) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hotel.address && (
                  <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <Navigation className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Address</p>
                      <p className="text-sm text-slate-700">{hotel.address}</p>
                    </div>
                  </div>
                )}
                {hotel.phone && (
                  <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Contact</p>
                      <p className="text-sm text-slate-700">{hotel.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Rooms & Pricing */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-theme-primary/10 rounded-lg">
                  <BedDouble className="h-4 w-4 text-theme-primary" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Room Categories & Pricing</h3>
                <Badge variant="outline" className="text-xs text-slate-500 ml-1">
                  {hotel.rooms?.length || 0} categor{hotel.rooms?.length === 1 ? "y" : "ies"}
                </Badge>
              </div>

              {!hotel.rooms?.length ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                  <BedDouble className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No room categories added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hotel.rooms.map((room, i) => (
                    <RoomBlock key={i} room={room} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <p className="text-[11px] text-slate-400 font-medium">ID: {hotel.id}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-9">Close</Button>
            <Button onClick={onEdit} className="bg-theme-primary text-white hover:bg-theme-primary/90 h-9 gap-2">
              <Pencil className="h-3.5 w-3.5" /> Edit Property
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailModal;