"use client";
import React, { useState, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Upload,
  FileSpreadsheet,
  X,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Star,
  MapPin,
  BedDouble,
  Utensils,
  ExternalLink,
  Loader2,
  RefreshCw,
  Eye,
  Hotel,
  Sparkles,
  ClipboardCheck,
  Edit3,
  BadgeCheck,
  BarChart3,
  Calendar,
  Save,
  AlertCircle,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { saveAllHotels, generateHotelId } from "@/firebase/hotelUploadFirestore";

// ─── Constants ────────────────────────────────────────────────────────────────
const PLANS = [
  { key: "ep",  label: "EP",  full: "European Plan",          badgeCls: "bg-sky-50 text-sky-700 border-sky-200"       },
  { key: "cp",  label: "CP",  full: "Continental Plan",       badgeCls: "bg-violet-50 text-violet-700 border-violet-200" },
  { key: "map", label: "MAP", full: "Modified American Plan", badgeCls: "bg-amber-50 text-amber-700 border-amber-200"  },
  { key: "ap",  label: "AP",  full: "American Plan",          badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

const OCC_TYPES = [
  { key: "double",     label: "Double",      short: "Dbl"     },
  { key: "extraAdult", label: "Extra Adult", short: "E.Adult" },
  { key: "extraChild", label: "Extra Child", short: "E.Child" },
  { key: "cnb",        label: "CNB",         short: "CNB",    hint: "Child No Bed (0-4 yrs)" },
];

const STAR_OPTIONS = ["5-star", "4-star", "3-star", "2-star", "1-star"];

// ─── Logger ───────────────────────────────────────────────────────────────────
const log = {
  info:  (...args) => console.log("[HotelUpload]", ...args),
  warn:  (...args) => console.warn("[HotelUpload]", ...args),
  error: (...args) => console.error("[HotelUpload]", ...args),
};

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
  const a1 = parseDate(sA), a2 = parseDate(eA);
  const b1 = parseDate(sB), b2 = parseDate(eB);
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 <= b2 && b1 <= a2;
};

// ─── Priority helpers (ported from HotelFormPage) ─────────────────────────────
/**
 * Returns a Set of priority numbers already used by OTHER seasons in the same room.
 * Used to disable already-taken priority values in the dropdown.
 */
const getUsedPriorities = (seasons, currentIndex) => {
  const used = new Set();
  seasons.forEach((s, i) => {
    if (i !== currentIndex && s.priority != null) used.add(Number(s.priority));
  });
  return used;
};

/**
 * A room has an UNRESOLVED conflict when any two seasons overlap AND either:
 *   - at least one of them has no priority assigned (null), OR
 *   - both share the same priority number (tie — still ambiguous)
 *
 * If both overlapping seasons have DISTINCT non-null priorities, the conflict
 * is considered resolved (lower number wins / higher priority takes precedence).
 */
const roomHasConflict = (seasons = []) => {
  for (let i = 0; i < seasons.length; i++) {
    for (let j = i + 1; j < seasons.length; j++) {
      const a = seasons[i], b = seasons[j];
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        if (
          a.priority == null ||
          b.priority == null ||
          Number(a.priority) === Number(b.priority)
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Returns the names of all seasons (excluding self) that overlap with `season`
 * AND whose conflict with `season` is still unresolved.
 */
const getConflictingSeasonNames = (season, allSeasons, selfIndex) => {
  return allSeasons
    .filter((s, i) => {
      if (i === selfIndex) return false;
      if (!rangesOverlap(season.start, season.end, s.start, s.end)) return false;
      // Conflict is unresolved when priorities are missing or identical
      return (
        season.priority == null ||
        s.priority == null ||
        Number(season.priority) === Number(s.priority)
      );
    })
    .map((s) => s.name || "Unnamed Season");
};

/**
 * True when THIS season has at least one unresolved overlap with a sibling.
 */
const seasonHasUnresolvedConflict = (season, allSeasons, selfIndex) =>
  getConflictingSeasonNames(season, allSeasons, selfIndex).length > 0;

const fmt = (n) => (n == null || n === 0 ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

// ─── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, processing }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      toast.error("Only .xlsx and .xls files are supported.");
      log.warn("Rejected file drop — invalid type:", f.name);
      return;
    }
    onFile(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    onFile(f);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !processing && ref.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
        ${drag ? "border-theme-primary bg-theme-muted scale-[1.01]" : "border-slate-200 bg-slate-50/60 hover:border-theme-primary/50 hover:bg-theme-muted/40"}
        ${processing ? "pointer-events-none opacity-60" : ""}`}
    >
      <input ref={ref} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
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
            <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-100 text-slate-500 font-medium shadow-sm">
              ✓ {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Bar ───────────────────────────────────────────────────────────────
function SummaryBar({ hotels, summary }) {
  const liveRooms   = hotels.reduce((a, h) => a + (h.rooms?.length || 0), 0);
  const liveSeasons = hotels.reduce((a, h) => a + h.rooms.reduce((b, r) => b + (r.seasons?.length || 0), 0), 0);
  const liveStates  = [...new Set(hotels.map((h) => h.state).filter(Boolean))];

  const stats = [
    { icon: Hotel,    label: "Hotels",          value: hotels.length,    col: "text-theme-primary", bg: "bg-theme-muted/60" },
    { icon: BedDouble,label: "Room Categories", value: liveRooms,        col: "text-violet-600",    bg: "bg-violet-50"      },
    { icon: Calendar, label: "Season Blocks",   value: liveSeasons,      col: "text-emerald-600",   bg: "bg-emerald-50"     },
    { icon: MapPin,   label: "States",          value: liveStates.length, col: "text-amber-600",   bg: "bg-amber-50"       },
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

// ─── Remove Hotel Confirm Modal ────────────────────────────────────────────────
function RemoveHotelModal({ hotel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-50 rounded-xl">
              <Trash2 className="h-4 w-4 text-red-500" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Remove Hotel?</h2>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            <span className="font-semibold text-slate-800">{hotel.name}</span> will be removed from
            this upload batch. It will <span className="font-semibold">not</span> be saved to the
            database. Any existing data in Firestore for this hotel is unaffected.
          </p>
        </div>
        <div className="px-6 py-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Save Results Modal ────────────────────────────────────────────────────────
function SaveResultsModal({ results, onClose }) {
  if (!results) return null;

  const created = results.filter((r) => r.action === "created");
  const updated = results.filter((r) => r.action === "updated");
  const errored = results.filter((r) => r.action === "error");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
            <h2 className="font-bold text-slate-900 text-base">Save Complete</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            { label: "Created", value: created.length, col: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Updated", value: updated.length, col: "text-blue-600",    bg: "bg-blue-50"    },
            { label: "Errors",  value: errored.length, col: "text-red-600",     bg: "bg-red-50"     },
          ].map(({ label, value, col, bg }) => (
            <div key={label} className={`flex flex-col items-center py-4 ${bg}`}>
              <span className={`text-2xl font-bold ${col}`}>{value}</span>
              <span className="text-xs text-slate-500 mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{r.id}</p>
                {r.action === "error" && r.error && (
                  <p className="text-[10px] text-red-500 mt-0.5 truncate">{r.error}</p>
                )}
              </div>
              <span className={`ml-3 shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full
                ${r.action === "created" ? "bg-emerald-50 text-emerald-700"
                  : r.action === "updated" ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-700"}`}>
                {r.action === "created" ? "✦ New" : r.action === "updated" ? "↻ Updated" : "✕ Error"}
              </span>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full h-10 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Table ─────────────────────────────────────────────────────────────
function PricingTable({ pricing, seasonIndex, roomIndex, hotelIndex, onUpdate, isEditing }) {
  const activePlans = PLANS.filter((p) => pricing?.[p.key] !== undefined);
  const missingPlans = PLANS.filter((p) => pricing?.[p.key] === undefined);

  const setVal = (planKey, occKey, val) => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", {
      ...(pricing || {}),
      [planKey]: { ...(pricing?.[planKey] || {}), [occKey]: num },
    });
  };

  const addPlan = (planKey) =>
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", {
      ...(pricing || {}),
      [planKey]: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
    });

  const removePlan = (planKey) => {
    const next = { ...(pricing || {}) };
    delete next[planKey];
    onUpdate(hotelIndex, roomIndex, seasonIndex, "pricing", next);
  };

  if (!activePlans.length && !isEditing)
    return <p className="text-xs text-slate-300 italic py-1">No pricing data</p>;

  return (
    <div className="space-y-2">
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
                <tr key={plan.key} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${plan.badgeCls}`}>
                      {plan.label}
                    </span>
                  </td>
                  {OCC_TYPES.map((occ) => {
                    const val = row[occ.key] ?? 0;
                    return (
                      <td key={occ.key} className="px-2 py-1.5 text-center">
                        {isEditing ? (
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2 text-slate-400 text-[10px] pointer-events-none">₹</span>
                            <input type="number" min="0" value={val}
                              onChange={(e) => setVal(plan.key, occ.key, e.target.value)}
                              className="h-7 w-24 border border-slate-200 rounded-lg pl-5 pr-2 text-right text-xs font-semibold bg-white focus:border-theme-primary focus:ring-1 focus:ring-theme-primary/20 outline-none" />
                          </div>
                        ) : (
                          <span className={`font-semibold ${val === 0 ? "text-slate-300" : "text-slate-700"}`}>{fmt(val)}</span>
                        )}
                      </td>
                    );
                  })}
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
      <div className="flex flex-wrap gap-2 pt-0.5">
        {activePlans.map((p) => (
          <span key={p.key} className="text-[9px] text-slate-400">{p.label} = {p.full}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Season Card ───────────────────────────────────────────────────────────────
// UPDATED: full priority system ported from HotelFormPage
function SeasonCard({ season, seasonIndex, roomIndex, hotelIndex, allSeasons, onUpdate, onRemove, isEditing }) {
  const [open, setOpen] = useState(true);

  // ── Conflict detection ──────────────────────────────────────────────────────
  const hasUnresolvedConflict = seasonHasUnresolvedConflict(season, allSeasons, seasonIndex);
  const conflictingNames      = getConflictingSeasonNames(season, allSeasons, seasonIndex);

  // ── Priority helpers ────────────────────────────────────────────────────────
  const usedPriorities  = getUsedPriorities(allSeasons, seasonIndex);
  // Show priority field when: this season is in any overlap (resolved or not),
  // OR a priority has already been assigned to it.
  const isInAnyOverlap  = allSeasons.some((s, i) => {
    if (i === seasonIndex) return false;
    return rangesOverlap(season.start, season.end, s.start, s.end);
  });
  const showPriorityField = isInAnyOverlap || season.priority != null;

  // ── Field updater ───────────────────────────────────────────────────────────
  const upd = (key, val) => {
    log.info(`[SeasonCard] hotel=${hotelIndex} room=${roomIndex} season=${seasonIndex} key=${key}`, val);
    onUpdate(hotelIndex, roomIndex, seasonIndex, key, val);
  };

  const handlePriorityChange = (raw) => {
    if (raw === "") {
      upd("priority", null);
      return;
    }
    const num = Number(raw);
    if (isNaN(num) || num < 1 || num > 10) {
      log.warn(`[SeasonCard] Invalid priority value: ${raw}`);
      return;
    }
    if (usedPriorities.has(num)) {
      toast.error(`Priority ${num} is already used by another season in this room.`);
      log.warn(`[SeasonCard] Duplicate priority blocked: ${num}`);
      return;
    }
    upd("priority", num);
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${hasUnresolvedConflict ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"}`}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer select-none transition-colors
          ${hasUnresolvedConflict
            ? "bg-red-50 hover:bg-red-100"
            : open
              ? "bg-theme-muted/40 hover:bg-theme-muted/60"
              : "bg-slate-50 hover:bg-slate-100"
          }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {open
            ? <ChevronUp   className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          }
          <span className="font-semibold text-sm text-slate-800 truncate">
            {season.name || "Unnamed Season"}
          </span>
          {season.start && season.end && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <Calendar className="h-3 w-3" />
              {season.start} → {season.end}
            </span>
          )}
          {/* Priority badge — shown when a priority has been set */}
          {season.priority != null && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0 shrink-0">
              P{season.priority}
            </Badge>
          )}
          {/* Conflict badge — shown when conflict is UNRESOLVED */}
          {hasUnresolvedConflict && (
            <Badge variant="destructive" className="text-[10px] shrink-0 flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              Overlaps: {conflictingNames.join(", ")}
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

      {/* ── Inline conflict explanation (only when unresolved) ──────────────── */}
      {hasUnresolvedConflict && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">
            <span className="font-semibold">Date conflict</span> with{" "}
            <span className="font-semibold">{conflictingNames.join(", ")}</span>.{" "}
            {isEditing
              ? "Assign a unique priority to resolve, or adjust the dates."
              : "Switch to Edit mode to assign priorities or fix dates."}
          </p>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {open && (
        <div className="p-4 bg-white space-y-4 border-t border-slate-100">
          {isEditing && (
            <div className={`grid gap-3 ${showPriorityField ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
              {/* Season Name */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                  Season Name
                </label>
                <Input
                  value={season.name}
                  onChange={(e) => upd("name", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g. Peak Season"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                  Start Date
                </label>
                <Input
                  value={season.start}
                  onChange={(e) => upd("start", e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`h-8 text-sm ${hasUnresolvedConflict ? "border-red-300 bg-red-50" : ""}`}
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                  End Date
                </label>
                <Input
                  value={season.end}
                  onChange={(e) => upd("end", e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className={`h-8 text-sm ${hasUnresolvedConflict ? "border-red-300 bg-red-50" : ""}`}
                />
              </div>

              {/* Priority — only rendered when this season overlaps with another */}
              {showPriorityField && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                    Priority
                  </label>
                  <select
                    value={season.priority ?? ""}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className={`h-8 w-full border rounded-lg px-3 text-sm bg-white outline-none transition-all
                      focus:ring-2 focus:ring-theme-primary/20
                      ${hasUnresolvedConflict && season.priority == null
                        ? "border-red-300 focus:border-red-400"
                        : "border-slate-200 focus:border-theme-primary"
                      }`}
                  >
                    <option value="">Select…</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                      <option
                        key={num}
                        value={num}
                        disabled={usedPriorities.has(num)}
                        title={usedPriorities.has(num) ? `Priority ${num} already used` : ""}
                      >
                        {num}{usedPriorities.has(num) ? " (taken)" : ""}
                      </option>
                    ))}
                  </select>
                  {hasUnresolvedConflict && season.priority == null && (
                    <p className="text-[10px] text-red-500 mt-1">Required to resolve overlap</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Read-only summary row when not editing */}
          {!isEditing && showPriorityField && season.priority != null && (
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                Priority {season.priority}
              </Badge>
              <span className="text-[11px] text-slate-400">
                Higher-priority season rates take precedence during overlap
              </span>
            </div>
          )}

          {/* Pricing */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Utensils className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Meal Plan Pricing
              </span>
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
  // Use updated roomHasConflict — only flags UNRESOLVED conflicts
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
            <span className="font-semibold text-sm text-slate-800 truncate">
              {room.categoryName || "Unnamed Room"}
            </span>
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
          {!room.seasons || room.seasons.length === 0 ? (
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
function HotelSection({ hotel, hotelIndex, onHotelField, onUpdate, onRemoveRoom, onAddRoom, onAddSeason, onRemoveSeason, onRemoveHotel }) {
  const [editing, setEditing]           = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Use updated roomHasConflict — only counts UNRESOLVED conflicts
  const anyConflict = (hotel.rooms || []).some((r) => roomHasConflict(r.seasons || []));
  const fld = (key, val) => onHotelField(hotelIndex, key, val);

  const previewId = generateHotelId(hotel.state, hotel.city, hotel.name);

  const starNum = parseInt(hotel.starRating) || 0;
  const starColor =
    starNum >= 5 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : starNum >= 4 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <>
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
                        <Input value={hotel.city} onChange={(e) => fld("city", e.target.value)}
                          className="h-6 w-24 text-xs px-2" placeholder="City" />
                        <span className="text-slate-300">/</span>
                        <Input value={hotel.state} onChange={(e) => fld("state", e.target.value)}
                          className="h-6 w-28 text-xs px-2" placeholder="State" />
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

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-300 font-mono">ID:</span>
                  <span className="text-[9px] text-slate-400 font-mono truncate max-w-[260px]">{previewId}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {hotel.hotelLink && !editing && (
                <a href={hotel.hotelLink} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-theme-primary hover:bg-theme-muted rounded-lg transition-colors">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <button
                onClick={() => setConfirmRemove(true)}
                title="Remove from batch"
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <button
                onClick={() => setEditing((e) => !e)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                  ${editing
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-theme-muted hover:text-theme-primary hover:border-theme-primary/30"}`}
              >
                {editing ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Edit3 className="h-3.5 w-3.5" /> Edit</>}
              </button>

              <button
                onClick={() => setCollapsed((c) => !c)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
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
                  Some room categories have overlapping season dates without resolved priorities.
                  Click <strong>Edit</strong> on this hotel, then assign unique priority numbers
                  to each overlapping season to resolve.
                </AlertDescription>
              </Alert>
            )}

            {(hotel.rooms || []).length === 0 ? (
              <div className="text-center py-10">
                <BedDouble className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No room categories found.</p>
                {editing && (
                  <button onClick={() => onAddRoom(hotelIndex)}
                    className="mt-2 text-xs font-semibold text-theme-primary hover:underline">
                    + Add Room Category
                  </button>
                )}
              </div>
            ) : (
              <>
                {hotel.rooms.map((room, rIdx) => (
                  <RoomCard
                    key={rIdx}
                    room={room}
                    roomIndex={rIdx}
                    hotelIndex={hotelIndex}
                    onUpdate={onUpdate}
                    onRemoveRoom={onRemoveRoom}
                    onAddSeason={onAddSeason}
                    onRemoveSeason={onRemoveSeason}
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

      {confirmRemove && (
        <RemoveHotelModal
          hotel={hotel}
          onConfirm={() => {
            log.info(`Removing hotel "${hotel.name}" from batch (index ${hotelIndex})`);
            onRemoveHotel(hotelIndex);
            setConfirmRemove(false);
          }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelUploadPage() {
  const { user } = useSelector((state) => state.auth);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hotels, setHotels]             = useState(null);
  const [summary, setSummary]           = useState(null);
  const [error, setError]               = useState("");
  const [isSaving, setIsSaving]         = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });
  const [saveResults, setSaveResults]   = useState(null);
  const [showResults, setShowResults]   = useState(false);

  // ── File processing ─────────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    log.info("Processing file:", file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
    setError("");
    setIsProcessing(true);
    setHotels(null);
    setSummary(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res  = await fetch("/api/hotel-upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || "Failed to process file.";
        log.error("API error:", msg);
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!data.hotels || data.hotels.length === 0) {
        const msg = "No hotel data found in the file. Check column layout.";
        log.warn(msg);
        setError(msg);
        toast.error(msg);
        return;
      }

      // Normalise priority values coming from the parser — coerce to Number or null
      const normalised = data.hotels.map((hotel) => ({
        ...hotel,
        rooms: (hotel.rooms || []).map((room) => ({
          ...room,
          seasons: (room.seasons || []).map((s) => ({
            ...s,
            priority: s.priority != null ? Number(s.priority) : null,
          })),
        })),
      }));

      log.info(`Extracted ${normalised.length} hotels, sheet: "${data.sheetName}"`);
      setHotels(normalised);
      setSummary(data.summary);
      toast.success(`${normalised.length} hotel${normalised.length !== 1 ? "s" : ""} extracted!`);
    } catch (err) {
      const msg = "Network error. Please try again.";
      log.error("Fetch error:", err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ── Mutators ────────────────────────────────────────────────────────────────
  const updateHotelField = (hIdx, key, val) =>
    setHotels((prev) => prev.map((h, i) => (i !== hIdx ? h : { ...h, [key]: val })));

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
              seasons: r.seasons.map((s, si) => {
                if (si !== sIdx) return s;
                // Normalise priority on every write to keep types consistent
                if (key === "priority") {
                  return { ...s, priority: value != null ? Number(value) : null };
                }
                return { ...s, [key]: value };
              }),
            };
          }),
        };
      })
    );
  };

  const handleRemoveHotel = (hIdx) => {
    let removedName = "";
    setHotels((prev) => {
      const removed = prev[hIdx];
      removedName = removed?.name ?? "";
      const next = prev.filter((_, i) => i !== hIdx);
      log.info(`Hotel removed from batch: "${removedName}" (${next.length} remaining)`);
      return next;
    });
    toast.success(`"${removedName}" removed from batch`);
  };

  const handleRemoveRoom = (hIdx, rIdx) => {
    setHotels((prev) =>
      prev.map((h, hi) => hi !== hIdx ? h : { ...h, rooms: h.rooms.filter((_, i) => i !== rIdx) })
    );
    toast.success("Room removed");
  };

  const handleAddRoom = (hIdx) => {
    setHotels((prev) =>
      prev.map((h, hi) =>
        hi !== hIdx ? h : { ...h, rooms: [{ categoryName: "", seasons: [] }, ...h.rooms] }
      )
    );
  };

  const handleAddSeason = (hIdx, rIdx) => {
    const newSeason = {
      name: "", start: "", end: "",
      // Start without a priority — it will appear once an overlap is detected
      priority: null,
      pricing: {
        ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      },
    };
    setHotels((prev) =>
      prev.map((h, hi) =>
        hi !== hIdx ? h : {
          ...h,
          rooms: h.rooms.map((r, ri) =>
            ri !== rIdx ? r : { ...r, seasons: [...r.seasons, newSeason] }
          ),
        }
      )
    );
  };

  const handleRemoveSeason = (hIdx, rIdx, sIdx) => {
    setHotels((prev) =>
      prev.map((h, hi) =>
        hi !== hIdx ? h : {
          ...h,
          rooms: h.rooms.map((r, ri) =>
            ri !== rIdx ? r : { ...r, seasons: r.seasons.filter((_, i) => i !== sIdx) }
          ),
        }
      )
    );
    toast.success("Season removed");
  };

  const handleReset = () => {
    log.info("Resetting upload page");
    setHotels(null);
    setSummary(null);
    setError("");
    setSaveResults(null);
    setShowResults(false);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const totalConflicts = hotels
    ? hotels.reduce(
        (a, h) => a + (h.rooms || []).filter((r) => roomHasConflict(r.seasons || [])).length,
        0
      )
    : 0;

  const validateBatch = () => {
    if (!hotels || hotels.length === 0) {
      toast.error("No hotels to save.");
      return false;
    }

    // Guard: unresolved date conflicts
    if (totalConflicts > 0) {
      toast.error(
        `Resolve ${totalConflicts} date conflict${totalConflicts !== 1 ? "s" : ""} before saving. ` +
        "Click Edit on the affected hotel and assign unique priorities to each overlapping season."
      );
      log.warn(`Save blocked — ${totalConflicts} unresolved conflicts`);
      return false;
    }

    // Guard: duplicate priorities within any room
    for (const hotel of hotels) {
      for (const room of hotel.rooms || []) {
        const priorities = (room.seasons || [])
          .map((s) => s.priority)
          .filter((p) => p != null);
        if (new Set(priorities).size !== priorities.length) {
          toast.error(
            `"${hotel.name}" → "${room.categoryName || "Unnamed Room"}": duplicate priority numbers found. Each season must have a unique priority.`
          );
          log.warn(`Duplicate priorities in hotel="${hotel.name}" room="${room.categoryName}"`);
          return false;
        }
      }
    }

    // Guard: required hotel fields
    for (const h of hotels) {
      if (!h.name?.trim() || !h.city?.trim() || !h.state?.trim()) {
        toast.error(`Hotel "${h.name || "Unknown"}" is missing name, city, or state.`);
        log.warn("Validation failed — missing fields on hotel:", h);
        return false;
      }
    }

    return true;
  };

  // ── Save to DB ───────────────────────────────────────────────────────────────
  const handleSaveToDB = async () => {
    if (!validateBatch()) return;

    log.info(`Starting DB save for ${hotels.length} hotels`);
    setIsSaving(true);
    setSaveProgress({ done: 0, total: hotels.length });
    setSaveResults(null);

    try {
      const results = await saveAllHotels(hotels, (done, total) => {
        setSaveProgress({ done, total });
        log.info(`Save progress: ${done}/${total}`);
      }, user?.orgId);

      setSaveResults(results);
      setShowResults(true);

      const created = results.filter((r) => r.action === "created").length;
      const updated = results.filter((r) => r.action === "updated").length;
      const errored = results.filter((r) => r.action === "error").length;

      log.info(`Save complete — created: ${created}, updated: ${updated}, errors: ${errored}`);

      if (errored === 0) {
        toast.success(`Saved! ${created} created, ${updated} updated.`, { duration: 5000 });
      } else {
        toast.error(`${errored} hotel(s) failed to save. See results for details.`, { duration: 6000 });
        results
          .filter((r) => r.action === "error")
          .forEach((r) => log.error(`Failed hotel "${r.name}":`, r.error));
      }
    } catch (err) {
      log.error("Unexpected save error:", err);
      toast.error("Save failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
      setSaveProgress({ done: 0, total: 0 });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative bg-slate-50 border">
      <Toaster position="top-right" />

      {/* Nav */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5">
                <span><span className="font-semibold text-slate-900">{hotels.length}</span> hotel{hotels.length !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span><span className="font-semibold text-slate-900">{hotels.reduce((a, h) => a + (h.rooms?.length || 0), 0)}</span> rooms</span>
              </div>

              {totalConflicts > 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {totalConflicts} unresolved conflict{totalConflicts !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <Check className="h-3.5 w-3.5" /> Ready
                </span>
              )}

              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> New Upload
              </Button>

              <Button
                size="sm"
                disabled={totalConflicts > 0 || isSaving || hotels.length === 0}
                className="gap-1.5 bg-theme-primary hover:bg-theme-secondary text-white shadow-md text-xs min-w-[100px]"
                onClick={handleSaveToDB}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {saveProgress.total > 0 ? `${saveProgress.done}/${saveProgress.total}` : "Saving…"}
                  </>
                ) : (
                  <><Save className="h-3.5 w-3.5" /> Save to DB</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Upload phase ──────────────────────────────────────────────────── */}
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
                    Upload your hotel inventory Excel file. All hotels, rooms, seasons and meal-plan pricing
                    (Double, Extra Adult, Extra Child, CNB) will be extracted for review.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Upload,         n: "1", title: "Upload",        desc: "Drop your .xlsx file"   },
                  { icon: Eye,            n: "2", title: "Review & Edit",  desc: "Verify extracted data" },
                  { icon: ClipboardCheck, n: "3", title: "Save to DB",    desc: "Push to Firestore"      },
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

              <div className="flex items-center gap-3 bg-theme-muted/40 border border-theme-primary/20 rounded-xl p-4 mb-4">
                <div className="p-2 bg-theme-primary/10 rounded-lg shrink-0">
                  <Download className="h-4 w-4 text-theme-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Download Template</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Get the Excel template with all required columns and sample data to fill in your hotel information.
                  </p>
                </div>
                <a
                  href="/hotel-upload-template.xlsx"
                  download="hotel-upload-template.xlsx"
                  className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary/90 transition-colors shrink-0 font-medium text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
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
                        "EP·Dbl","EP·EA","EP·EC","EP·CNB","CP·Dbl","CP·EA","CP·EC","CP·CNB",
                        "MAP·Dbl","MAP·EA","MAP·EC","MAP·CNB","AP·Dbl","AP·EA","AP·EC","AP·CNB"].map((h) => (
                        <th key={h} className="px-1.5 py-1.5 text-left font-semibold text-slate-500 border-b border-slate-100 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Maharashtra","Mumbai","Hotel Taj","4.9","https://...","5","Season 1 (Peak)","01/01/2026","31/03/2026","Luxury Sea View","12000","0","0","0","14000","0","0","0","16000","0","0","0","14000","0","0","0"],
                      ["","","","","","","Season 1 (Peak)","01/01/2026","31/03/2026","Extra Bed (Adult)","3000","0","0","0","4500","0","0","0","5500","0","0","0","4500","0","0","0"],
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

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium flex items-center justify-between">
              {error}
              <button onClick={handleReset} className="text-xs underline hover:no-underline ml-4">Try again</button>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Results ───────────────────────────────────────────────────────── */}
        {hotels && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Extracted Data</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click <span className="font-semibold text-theme-primary">Edit</span> on any hotel to modify inline.
                    Overlapping seasons will show a{" "}
                    <span className="font-semibold text-blue-600">Priority</span> dropdown — assign
                    unique numbers to resolve. Use the{" "}
                    <span className="font-semibold text-red-500">trash icon</span> to remove a hotel.
                  </p>
                </div>
                <div>
                  {totalConflicts === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 font-semibold">
                      <Check className="h-3.5 w-3.5" /> No conflicts
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 font-semibold">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {totalConflicts} unresolved conflict{totalConflicts !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>

              <SummaryBar hotels={hotels} summary={summary} />
            </div>

            <Separator />

            {hotels.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Hotel className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="font-semibold text-slate-500">All hotels removed from batch.</p>
                <p className="text-sm text-slate-400 mt-1">Upload a new file or refresh to start over.</p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm font-semibold text-theme-primary border border-theme-primary/30 px-4 py-2 rounded-lg hover:bg-theme-muted/30 transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Upload New File
                </button>
              </div>
            ) : (
              <div className="space-y-4 pb-32">
                {hotels.map((hotel, hIdx) => (
                  <HotelSection
                    key={`${hotel.name}-${hotel.city}-${hotel.state}-${hIdx}`}
                    hotel={hotel}
                    hotelIndex={hIdx}
                    onHotelField={updateHotelField}
                    onUpdate={handleUpdate}
                    onRemoveHotel={handleRemoveHotel}
                    onRemoveRoom={handleRemoveRoom}
                    onAddRoom={handleAddRoom}
                    onAddSeason={handleAddSeason}
                    onRemoveSeason={handleRemoveSeason}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showResults && (
        <SaveResultsModal results={saveResults} onClose={() => setShowResults(false)} />
      )}
    </div>
  );
}