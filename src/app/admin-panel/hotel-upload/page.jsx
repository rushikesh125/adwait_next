"use client";
import React, { useState, useRef, useCallback } from "react";
import {
  Upload, FileSpreadsheet, X, Check, AlertTriangle, ChevronDown,
  ChevronUp, Plus, Trash2, Star, MapPin, BedDouble,
  Utensils, ExternalLink, Loader2, RefreshCw, Eye,
  Hotel, Sparkles, ClipboardCheck, ArrowRight, Edit3,
  BadgeCheck, BarChart3, Calendar, Save, Navigation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import toast, { Toaster } from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLANS = [
  { key: "ep",  label: "EP",  full: "European Plan",          badgeCls: "bg-sky-50 text-sky-700 border-sky-200",     headerCls: "bg-sky-100 text-sky-800" },
  { key: "cp",  label: "CP",  full: "Continental Plan",       badgeCls: "bg-violet-50 text-violet-700 border-violet-200", headerCls: "bg-violet-100 text-violet-800" },
  { key: "map", label: "MAP", full: "Modified American Plan", badgeCls: "bg-amber-50 text-amber-700 border-amber-200",  headerCls: "bg-amber-100 text-amber-800" },
  { key: "ap",  label: "AP",  full: "American Plan",          badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200", headerCls: "bg-emerald-100 text-emerald-800" },
];

const OCC_TYPES = [
  { key: "double",     label: "Double",      short: "Dbl" },
  { key: "extraAdult", label: "Extra Adult", short: "E.Adult" },
  { key: "extraChild", label: "Extra Child", short: "E.Child" },
  { key: "cnb",        label: "CNB",         short: "CNB", hint: "Child No Bed (0-4 yrs)" },
];

const STAR_OPTIONS = ["5-star", "4-star", "3-star", "2-star", "1-star"];

// ─── Date helpers ──────────────────────────────────────────────────────────────
const parseDate = (str) => {
  if (!str) return null;
  const p = str.split("/");
  if (p.length === 3) {
    const d = new Date(`${p[2]}-${p[1]}-${p[0]}`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
};

const rangesOverlap = (sA, eA, sB, eB) => {
  const a1 = parseDate(sA), a2 = parseDate(eA), b1 = parseDate(sB), b2 = parseDate(eB);
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 <= b2 && b1 <= a2;
};

const roomHasConflict = (seasons = []) => {
  for (let i = 0; i < seasons.length; i++)
    for (let j = i + 1; j < seasons.length; j++) {
      const a = seasons[i], b = seasons[j];
      if (rangesOverlap(a.start, a.end, b.start, b.end))
        if (a.priority == null || b.priority == null || Number(a.priority) === Number(b.priority)) return true;
    }
  return false;
};

const fmt = (n) => (n == null || n === 0) ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

// ─── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, processing }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => !processing && ref.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
        ${drag ? "border-theme-primary bg-theme-muted scale-[1.01]" : "border-slate-200 bg-slate-50/60 hover:border-theme-primary/50 hover:bg-theme-muted/40"}
        ${processing ? "pointer-events-none opacity-60" : ""}`}
    >
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all
        ${drag ? "bg-theme-primary text-white" : "bg-white text-theme-primary border border-slate-100 shadow-sm"}`}>
        {processing ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileSpreadsheet className="h-7 w-7" />}
      </div>
      <p className="font-bold text-slate-800 text-lg mb-1">
        {processing ? "Processing…" : drag ? "Drop it!" : "Drop your Excel file here"}
      </p>
      <p className="text-sm text-slate-400 mb-5">
        {processing ? "Extracting hotel & pricing data" : "Click to browse · .xlsx · .xls"}
      </p>
      {!processing && (
        <div className="flex flex-wrap justify-center gap-2">
          {["Multiple hotels", "N seasons", "All 4 meal plans", "Double + Extras + CNB"].map((t) => (
            <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-100 text-slate-500 font-medium shadow-sm">✓ {t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary }) {
  const stats = [
    { icon: Hotel,     label: "Hotels",          value: summary.totalHotels,  col: "text-theme-primary", bg: "bg-theme-muted/60" },
    { icon: BedDouble, label: "Room Categories",  value: summary.totalRooms,   col: "text-violet-600",    bg: "bg-violet-50" },
    { icon: Calendar,  label: "Season Blocks",    value: summary.totalSeasons, col: "text-emerald-600",   bg: "bg-emerald-50" },
    { icon: MapPin,    label: "States",           value: summary.states?.length || 0, col: "text-amber-600", bg: "bg-amber-50" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(({ icon: Icon, label, value, col, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg} ${col}`}><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pricing Table for a Season ────────────────────────────────────────────────
// pricing shape: { ep: {double, extraAdult, extraChild, cnb}, cp: {...}, map: {...}, ap: {...} }
function PricingTable({ pricing, seasonIndex, roomIndex, hotelIndex, onUpdate, isEditing }) {
  const activePlans = PLANS.filter((p) => pricing?.[p.key] !== undefined);
  const missingPlans = PLANS.filter((p) => pricing?.[p.key] === undefined);

  const setVal = (planKey, occKey, val) => {
    const updated = {
      ...(pricing || {}),
      [planKey]: { ...(pricing?.[planKey] || {}), [occKey]: Number(val) || 0 },
    };
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", updated);
  };

  const addPlan = (planKey) => {
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", {
      ...(pricing || {}),
      [planKey]: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
    });
  };

  const removePlan = (planKey) => {
    const next = { ...(pricing || {}) };
    delete next[planKey];
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", next);
  };

  if (!activePlans.length && !isEditing)
    return <p className="text-xs text-slate-300 italic py-1">No pricing data</p>;

  return (
    <div className="space-y-2">
      {/* Add missing plans (edit mode) */}
      {isEditing && missingPlans.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {missingPlans.map((p) => (
            <button key={p.key} onClick={() => addPlan(p.key)}
              className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 hover:bg-theme-muted hover:text-theme-primary transition-colors border border-slate-200">
              + {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 font-semibold text-slate-400 uppercase tracking-wide w-16">Plan</th>
              {OCC_TYPES.map((o) => (
                <th key={o.key} className="px-3 py-2 text-center font-semibold text-slate-500 whitespace-nowrap" title={o.hint || o.label}>
                  {o.label}
                  {o.hint && <span className="block text-[9px] text-slate-400 font-normal">{o.hint}</span>}
                </th>
              ))}
              {isEditing && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {activePlans.map((plan) => {
              const row = pricing?.[plan.key] || {};
              return (
                <tr key={plan.key} className={`border-t border-slate-100 ${plan.key === "ep" ? "" : ""}`}>
                  {/* Plan badge */}
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${plan.badgeCls}`}>
                      {plan.label}
                    </span>
                  </td>
                  {/* Occupancy columns */}
                  {OCC_TYPES.map((occ) => {
                    const val = row[occ.key] ?? 0;
                    return (
                      <td key={occ.key} className="px-2 py-1.5 text-center">
                        {isEditing ? (
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2 text-slate-400 text-[10px] pointer-events-none">₹</span>
                            <input
                              type="number" min="0"
                              value={val}
                              onChange={(e) => setVal(plan.key, occ.key, e.target.value)}
                              className="h-7 w-24 border border-slate-200 rounded-lg pl-5 pr-2 text-right text-xs font-semibold bg-white focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 outline-none"
                            />
                          </div>
                        ) : (
                          <span className={`font-semibold ${val === 0 ? "text-slate-300" : "text-slate-700"}`}>
                            {fmt(val)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {/* Remove plan */}
                  {isEditing && (
                    <td className="px-1">
                      <button onClick={() => removePlan(plan.key)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Compact plan legend */}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {activePlans.map((p) => (
          <span key={p.key} className="text-[9px] text-slate-400">{p.label} = {p.full}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Season Card ───────────────────────────────────────────────────────────────
function SeasonCard({ season, seasonIndex, roomIndex, hotelIndex, allSeasons, onUpdate, onRemove, isEditing }) {
  const [open, setOpen] = useState(true);

  const conflicts = allSeasons.filter((s, i) => {
    if (i === seasonIndex) return false;
    return rangesOverlap(season.start, season.end, s.start, s.end) &&
      (season.priority == null || s.priority == null || Number(season.priority) === Number(s.priority));
  });
  const hasConflict = conflicts.length > 0;

  const upd = (key, val) => onUpdate(hotelIndex, roomIndex, seasonIndex, key, val);

  return (
    <div className={`rounded-xl border overflow-hidden ${hasConflict ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"}`}>
      {/* Header */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer select-none transition-colors
          ${hasConflict ? "bg-red-50 hover:bg-red-100" : open ? "bg-theme-muted/40 hover:bg-theme-muted/60" : "bg-slate-50 hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          <span className="font-semibold text-sm text-slate-800 truncate">{season.name || "Unnamed Season"}</span>
          {season.start && season.end && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <Calendar className="h-3 w-3" />{season.start} → {season.end}
            </span>
          )}
          {season.priority != null && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0 shrink-0">P{season.priority}</Badge>
          )}
          {hasConflict && (
            <Badge variant="destructive" className="text-[10px] shrink-0 flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Conflict
            </Badge>
          )}
        </div>
        {isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(hotelIndex, roomIndex, seasonIndex); }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-2 shrink-0 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="p-4 bg-white space-y-4 border-t border-slate-100">
          {/* Editable date / name fields */}
          {isEditing && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Season Name</label>
                <Input value={season.name} onChange={(e) => upd("name", e.target.value)} className="h-8 text-sm" placeholder="e.g. Peak Season" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Start Date</label>
                <Input value={season.start} onChange={(e) => upd("start", e.target.value)} placeholder="DD/MM/YYYY" className={`h-8 text-sm ${hasConflict ? "border-red-300" : ""}`} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">End Date</label>
                <Input value={season.end} onChange={(e) => upd("end", e.target.value)} placeholder="DD/MM/YYYY" className={`h-8 text-sm ${hasConflict ? "border-red-300" : ""}`} />
              </div>
            </div>
          )}

          {/* Pricing table */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Utensils className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Meal Plan Pricing</span>
            </div>
            <PricingTable
              pricing={season.pricing}
              seasonIndex={seasonIndex}
              roomIndex={roomIndex}
              hotelIndex={hotelIndex}
              onUpdate={onUpdate}
              isEditing={isEditing}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Room Card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, roomIndex, hotelIndex, onUpdate, onRemoveRoom, onAddSeason, onRemoveSeason, isEditing }) {
  const [open, setOpen] = useState(true);
  const hasConflict = roomHasConflict(room.seasons || []);

  return (
    <div className={`rounded-xl border ${hasConflict ? "border-red-200" : "border-slate-200"} overflow-hidden shadow-sm`}>
      <div
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors
          ${hasConflict ? "bg-red-50 hover:bg-red-100/70" : "bg-slate-50/80 hover:bg-slate-100/60"}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
          <BedDouble className="h-4 w-4 text-theme-primary shrink-0" />
          {isEditing ? (
            <Input
              value={room.categoryName}
              onChange={(e) => onUpdate(hotelIndex, roomIndex, null, "__roomName", e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[220px] h-7 text-sm font-semibold bg-white"
              placeholder="Room category name"
            />
          ) : (
            <span className="font-semibold text-sm text-slate-800 truncate">{room.categoryName || "Unnamed Room"}</span>
          )}
          <Badge variant="outline" className="text-[10px] shrink-0 text-slate-500 border-slate-200">
            {room.seasons?.length || 0} season{(room.seasons?.length || 0) !== 1 ? "s" : ""}
          </Badge>
          {hasConflict && (
            <Badge variant="destructive" className="text-[10px] flex items-center gap-1 shrink-0">
              <AlertTriangle className="h-3 w-3" /> Date conflict
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isEditing && (
            <>
              <button
                onClick={() => onAddSeason(hotelIndex, roomIndex)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-3 w-3" /> Season
              </button>
              <button
                onClick={() => onRemoveRoom(hotelIndex, roomIndex)}
                className="p-1.5 text-red-400 border border-red-100 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-2 bg-white">
          {(!room.seasons || room.seasons.length === 0) ? (
            <p className="text-xs text-slate-400 text-center py-5">
              No seasons.{isEditing && " Click '+ Season' to add one."}
            </p>
          ) : (
            room.seasons.map((season, sIdx) => (
              <SeasonCard
                key={sIdx}
                season={season}
                seasonIndex={sIdx}
                roomIndex={roomIndex}
                hotelIndex={hotelIndex}
                allSeasons={room.seasons}
                onUpdate={onUpdate}
                onRemove={onRemoveSeason}
                isEditing={isEditing}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Hotel Section ─────────────────────────────────────────────────────────────
function HotelSection({ hotel, hotelIndex, onHotelField, onUpdate, onRemoveRoom, onAddRoom, onAddSeason, onRemoveSeason }) {
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const anyConflict = (hotel.rooms || []).some((r) => roomHasConflict(r.seasons || []));

  const fld = (key, val) => onHotelField(hotelIndex, key, val);

  const starNum = parseInt(hotel.starRating) || 0;
  const starColor = starNum >= 5 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : starNum >= 4 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <Card className={`border ${anyConflict ? "border-red-200" : "border-slate-200"} shadow-sm overflow-hidden`}>
      {/* Hotel header */}
      <div className={`px-5 py-4 border-b ${anyConflict ? "border-red-100 bg-red-50/30" : "border-slate-100"} bg-gradient-to-r from-theme-muted/50 to-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm shrink-0 mt-0.5">
              <Hotel className="h-4 w-4 text-theme-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input value={hotel.name} onChange={(e) => fld("name", e.target.value)}
                  className="font-bold text-sm h-8 mb-2 max-w-xs" placeholder="Hotel name" />
              ) : (
                <h3 className="font-bold text-slate-900 text-base leading-tight mb-1 truncate">{hotel.name}</h3>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <Input value={hotel.city} onChange={(e) => fld("city", e.target.value)} className="h-6 w-24 text-xs px-2" placeholder="City" />
                      <span className="text-slate-300">/</span>
                      <Input value={hotel.state} onChange={(e) => fld("state", e.target.value)} className="h-6 w-28 text-xs px-2" placeholder="State" />
                    </div>
                  ) : (
                    <span className="font-medium">{[hotel.city, hotel.state].filter(Boolean).join(", ")}</span>
                  )}
                </div>
                {editing ? (
                  <select value={hotel.starRating || ""} onChange={(e) => fld("starRating", e.target.value)}
                    className="h-6 border border-slate-200 rounded px-1.5 text-xs bg-white outline-none focus:border-theme-primary">
                    <option value="">Stars</option>
                    {STAR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : hotel.starRating ? (
                  <Badge variant="outline" className={`text-[10px] flex items-center gap-1 ${starColor}`}>
                    <Star className="h-2.5 w-2.5" fill="currentColor" />{hotel.starRating}
                  </Badge>
                ) : null}
                {hotel.googleRating && !editing && (
                  <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50 gap-1">
                    <span className="font-black">G</span> {hotel.googleRating}
                  </Badge>
                )}
                {anyConflict && (
                  <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> Season conflicts
                  </Badge>
                )}
              </div>
              {editing && (
                <div className="mt-2 flex items-center gap-2">
                  <ExternalLink className="h-3 w-3 text-slate-400 shrink-0" />
                  <Input value={hotel.hotelLink || ""} onChange={(e) => fld("hotelLink", e.target.value)}
                    className="h-7 text-xs" placeholder="https://..." />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hotel.hotelLink && !editing && (
              <a href={hotel.hotelLink} target="_blank" rel="noopener noreferrer"
                className="p-1.5 text-slate-400 hover:text-theme-primary hover:bg-theme-muted rounded-lg transition-colors">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => setEditing((e) => !e)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                ${editing ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-theme-muted hover:text-theme-primary hover:border-theme-primary/30"}`}
            >
              {editing ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Edit3 className="h-3.5 w-3.5" /> Edit</>}
            </button>
            <button onClick={() => setCollapsed((c) => !c)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Hotel body */}
      {!collapsed && (
        <CardContent className="p-4 space-y-3">
          {anyConflict && (
            <Alert className="border-red-200 bg-red-50 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 text-xs font-medium">
                Some room categories have overlapping season dates. Review and resolve before saving.
              </AlertDescription>
            </Alert>
          )}
          {(hotel.rooms || []).length === 0 ? (
            <div className="text-center py-10">
              <BedDouble className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No room categories found.</p>
              {editing && (
                <button onClick={() => onAddRoom(hotelIndex)} className="mt-2 text-xs font-semibold text-theme-primary hover:underline">
                  + Add Room Category
                </button>
              )}
            </div>
          ) : (
            <>
              {hotel.rooms.map((room, rIdx) => (
                <RoomCard
                  key={rIdx} room={room} roomIndex={rIdx} hotelIndex={hotelIndex}
                  onUpdate={onUpdate} onRemoveRoom={onRemoveRoom}
                  onAddSeason={onAddSeason} onRemoveSeason={onRemoveSeason}
                  isEditing={editing}
                />
              ))}
              {editing && (
                <button
                  onClick={() => onAddRoom(hotelIndex)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm font-semibold text-slate-400 hover:border-theme-primary/40 hover:text-theme-primary hover:bg-theme-muted/30 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Room Category
                </button>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelUploadPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hotels, setHotels] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const processFile = useCallback(async (file) => {
    setError(""); setIsProcessing(true); setHotels(null); setSummary(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/hotel-upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to process file."); toast.error(data.error || "Failed."); return; }
      setHotels(data.hotels);
      setSummary(data.summary);
      toast.success(`${data.hotels.length} hotel${data.hotels.length !== 1 ? "s" : ""} extracted!`);
    } catch {
      setError("Network error. Please try again."); toast.error("Network error.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ── Mutators ────────────────────────────────────────────────────────────────
  const updateHotelField = (hIdx, key, val) =>
    setHotels((prev) => prev.map((h, i) => i !== hIdx ? h : { ...h, [key]: val }));

  const handleUpdate = (hIdx, rIdx, sIdx, key, value) => {
    setHotels((prev) =>
      prev.map((h, hi) => {
        if (hi !== hIdx) return h;
        return {
          ...h,
          rooms: h.rooms.map((r, ri) => {
            if (ri !== rIdx) return r;
            if (key === "__roomName") return { ...r, categoryName: value };
            return {
              ...r,
              seasons: r.seasons.map((s, si) =>
                si !== sIdx ? s : { ...s, [key]: value }
              ),
            };
          }),
        };
      })
    );
  };

  const handleRemoveRoom = (hIdx, rIdx) => {
    setHotels((prev) => prev.map((h, hi) => hi !== hIdx ? h : { ...h, rooms: h.rooms.filter((_, i) => i !== rIdx) }));
    toast.success("Room removed");
  };

  const handleAddRoom = (hIdx) => {
    setHotels((prev) => prev.map((h, hi) => hi !== hIdx ? h : {
      ...h, rooms: [{ categoryName: "", seasons: [] }, ...h.rooms],
    }));
  };

  const handleAddSeason = (hIdx, rIdx) => {
    const newSeason = {
      name: "", start: "", end: "", priority: null,
      pricing: {
        ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      },
    };
    setHotels((prev) => prev.map((h, hi) => hi !== hIdx ? h : {
      ...h,
      rooms: h.rooms.map((r, ri) => ri !== rIdx ? r : { ...r, seasons: [...r.seasons, newSeason] }),
    }));
  };

  const handleRemoveSeason = (hIdx, rIdx, sIdx) => {
    setHotels((prev) => prev.map((h, hi) => hi !== hIdx ? h : {
      ...h,
      rooms: h.rooms.map((r, ri) => ri !== rIdx ? r : { ...r, seasons: r.seasons.filter((_, i) => i !== sIdx) }),
    }));
    toast.success("Season removed");
  };

  const handleReset = () => { setHotels(null); setSummary(null); setError(""); };

  const totalConflicts = hotels
    ? hotels.reduce((a, h) => a + (h.rooms || []).filter((r) => roomHasConflict(r.seasons || [])).length, 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Nav */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-theme-muted rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-theme-primary" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm leading-none">Hotel Data Upload</h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">Upload → Review & Edit → Save to DB</p>
            </div>
          </div>
          {hotels && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                {hotels.length} hotel{hotels.length !== 1 ? "s" : ""} ready
              </span>
              {totalConflicts > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> New Upload
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Upload phase */}
        {!hotels && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-theme-muted rounded-xl shrink-0">
                  <BarChart3 className="h-5 w-5 text-theme-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Bulk Hotel Data Import</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload your hotel inventory Excel file. All hotels, rooms, seasons and meal-plan pricing (Double, Extra Adult, Extra Child, CNB) will be extracted for review.
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Upload, n: "1", title: "Upload", desc: "Drop your .xlsx file" },
                  { icon: Eye, n: "2", title: "Review & Edit", desc: "Verify extracted data" },
                  { icon: ClipboardCheck, n: "3", title: "Save to DB", desc: "Push to Firestore" },
                ].map(({ icon: Icon, n, title, desc }) => (
                  <div key={n} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-theme-primary/10 text-theme-primary text-xs font-black flex items-center justify-center shrink-0">{n}</div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <UploadZone onFile={processFile} processing={isProcessing} />
            </div>

            {/* Column reference */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-theme-primary" /> Expected Column Layout (26 columns)
              </p>
              <div className="overflow-x-auto">
                <table className="text-[10px] w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50">
                      {["State","City","Hotel Name","G.Rating","Hotel Link","Stars","Season Name","Start","End","Room Category",
                        "EP·Dbl","EP·EA","EP·EC","EP·CNB",
                        "CP·Dbl","CP·EA","CP·EC","CP·CNB",
                        "MAP·Dbl","MAP·EA","MAP·EC","MAP·CNB",
                        "AP·Dbl","AP·EA","AP·EC","AP·CNB"].map((h) => (
                        <th key={h} className="px-1.5 py-1.5 text-left font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Maharashtra","Mumbai","Hotel Taj","4.9","https://...","5","Season 1 (Peak)","01/01/2026","31/03/2026","Luxury Sea View",
                       "12000","0","0","0","14000","0","0","0","16000","0","0","0","14000","0","0","0"],
                      ["","","","","","","Season 1 (Peak)","01/01/2026","31/03/2026","Extra Bed (Adult)",
                       "3000","0","0","0","4500","0","0","0","5500","0","0","0","4500","0","0","0"],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        {row.map((cell, j) => (
                          <td key={j} className={`px-1.5 py-1.5 whitespace-nowrap ${!cell ? "text-slate-200" : "text-slate-700"}`}>{cell || "↑"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                EA = Extra Adult · EC = Extra Child · CNB = Child No Bed (0-4 yrs) · Dbl = Double occupancy.
                Hotel meta columns only need filling on the first row per hotel.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium flex items-center justify-between">
              {error}
              <button onClick={handleReset} className="text-xs underline hover:no-underline ml-4">Try again</button>
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {hotels && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Extracted Data</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click <span className="font-semibold text-theme-primary">Edit</span> on any hotel to modify inline.
                  </p>
                </div>
                <div>
                  {totalConflicts === 0
                    ? <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 font-semibold"><Check className="h-3.5 w-3.5" /> No conflicts</div>
                    : <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""}</div>
                  }
                </div>
              </div>
              <SummaryBar summary={summary} />
            </div>

            <Separator />

            <div className="space-y-4 pb-32">
              {hotels.map((hotel, hIdx) => (
                <HotelSection
                  key={hIdx} hotel={hotel} hotelIndex={hIdx}
                  onHotelField={updateHotelField} onUpdate={handleUpdate}
                  onRemoveRoom={handleRemoveRoom} onAddRoom={handleAddRoom}
                  onAddSeason={handleAddSeason} onRemoveSeason={handleRemoveSeason}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {hotels && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-100 shadow-2xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{hotels.length}</span> hotel{hotels.length !== 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-slate-900">{hotels.reduce((a, h) => a + (h.rooms?.length || 0), 0)}</span> rooms ·{" "}
              {totalConflicts > 0
                ? <span className="text-red-600 font-semibold">{totalConflicts} unresolved conflict{totalConflicts !== 1 ? "s" : ""}</span>
                : <span className="text-emerald-600 font-semibold">Ready to save</span>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Start Over
              </Button>
              <Button
                disabled={totalConflicts > 0}
                className="gap-1.5 bg-theme-primary hover:bg-theme-secondary text-white shadow-md"
                onClick={() => toast("DB saving coming soon! Data is ready.", { icon: "🚀" })}
              >
                <Save className="h-4 w-4" />
                Save All to Database
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}