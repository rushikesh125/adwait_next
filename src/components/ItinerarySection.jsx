"use client";

/**
 * ItinerarySection
 * ──────────────────────────────────────────────────────────────────────────────
 * Sits inside Create_new_package, below the hotel itinerary cards.
 *
 * Responsibilities
 * ────────────────
 * 1. Derive the list of cities from hotelEntries.
 * 2. Query Firestore `itinerary_templates` where cities array-contains any
 *    of those cities  (one query per city, results deduped by id).
 * 3. Show a card-based template picker if results exist, OR jump straight to
 *    the blank editor if none exist.
 * 4. On "Use this" → deep-clone the template into local state and open the
 *    editor pre-populated.  Original Firestore document is NEVER touched again.
 * 5. On every editor change → call onChange(itineraryData) so the parent
 *    can include it in the save payload.
 *
 * Props
 * ─────
 *   hotelEntries        – array from Redux (hotelEntries), used to derive cities
 *   selectedState       – string, passed to activities query inside ItineraryEditor
 *   onChange            – (data | null) => void
 *
 * IMPORTANT: This component performs NO Firestore writes at any point.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  MapPin,
  BookOpen,
  Plus,
  CheckCircle2,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import ItineraryEditor from "./ItineraryEditor";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Deep-clone any serialisable object — safe for Firestore data shapes. */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// ─────────────────────────────────────────────────────────────────────────────
// TemplateSummaryCard — compact preview card for the picker
// ─────────────────────────────────────────────────────────────────────────────
function TemplateSummaryCard({ template, onSelect, isSelected }) {
  const [expanded, setExpanded] = useState(false);

  const dayCount = template.days?.length ?? 0;
  const nightCount = dayCount > 0 ? dayCount - 1 : 0;
  const inclusionCount =
    template.inclusions?.filter((i) => i.selected).length ?? 0;
  const exclusionCount =
    template.exclusions?.filter((i) => i.selected).length ?? 0;
  const previewDays = expanded
    ? template.days
    : (template.days || []).slice(0, 2);

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all shadow-sm overflow-hidden ${
        isSelected
          ? "border-blue-500 bg-blue-50/60"
          : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Selected badge */}
      {isSelected && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" /> In use
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title + meta */}
        <div className="pr-16">
          <h4 className="font-bold text-slate-800 text-sm leading-tight">
            {template.title || "Untitled Template"}
          </h4>
          {template.state && (
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {template.state}
            </p>
          )}
        </div>

        {/* City badges */}
        {template.cities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.cities.map((c) => (
              <Badge
                key={c}
                className="text-[10px] bg-slate-100 text-slate-600 border-none px-1.5 py-0"
              >
                {c}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-0.5">
            🌙 {nightCount}N / {dayCount}D
          </span>
          {inclusionCount > 0 && <span>✅ {inclusionCount} inclusions</span>}
          {exclusionCount > 0 && <span>❌ {exclusionCount} exclusions</span>}
        </div>

        {/* Day preview */}
        {(template.days || []).length > 0 && (
          <div className="space-y-1.5">
            {previewDays.map((day) => (
              <div
                key={day.id || day.dayNumber}
                className="flex gap-2 items-start text-xs"
              >
                <span className="font-bold text-blue-600 flex-shrink-0 w-10">
                  Day {day.dayNumber}
                </span>
                <span className="text-slate-600 line-clamp-1">
                  {day.title || "—"}
                </span>
              </div>
            ))}
            {(template.days || []).length > 2 && (
              <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> +
                    {(template.days || []).length - 2} more days
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          {isSelected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelect(template, true)} /* true = open editor */
              className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 h-8"
            >
              <Edit3 className="w-3 h-3 mr-1" /> Edit / Customise
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onSelect(template, false)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white h-8"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> Use this template
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: ItinerarySection
// ─────────────────────────────────────────────────────────────────────────────
export default function ItinerarySection({
  hotelEntries = [],
  selectedState = "",
  orgId = null,
  onChange,
  itineraryData,
  setItineraryData,
  canUseAI = false,  
  permissionsLoading = false,
}) {
  // ── Derive cities from hotel entries ─────────────────────────────────────
  const cities = useMemo(
    () => [...new Set(hotelEntries.map((e) => e.city).filter(Boolean))],
    [hotelEntries],
  );

  // ── Component state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState("idle");
  // idle | loading | picker | editor | done

  const [templates, setTemplates] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // const [itineraryData, setItineraryData]     = useState(null);

  // Activities for the editor (state-scoped, read-only from Firestore)
  const [availableActivities, setAvailableActivities] = useState([]);

  // Track last-fetched city set so we don't re-query on unrelated re-renders
  const lastCitiesRef = useRef("");
  useEffect(() => {
    if (itineraryData) {
      setEditorOpen(true);
      setPhase("editor");
    }
  }, [itineraryData]);
  useEffect(() => {
  console.log("Itinerary Loaded:", itineraryData);
}, [itineraryData]);
  // ── Fetch templates whenever cities change ─────────────────────────────
  useEffect(() => {
    const key = cities.slice().sort().join("|");
    if (!orgId) return;
    if (itineraryData) return; // 🚀 ADD THIS LINE

    if (key === lastCitiesRef.current || cities.length === 0) return;
    lastCitiesRef.current = key;

    const fetchTemplates = async () => {
      setPhase("loading");
      setFetchError(null);
      try {
        // One query per city (Firestore array-contains doesn't support OR natively
        // without array-contains-any which is limited to 10 values — using Promise.all)
        const snapshots = await Promise.all(
          cities.map((city) =>
            getDocs(
              query(
                collection(db, "itinerary_templates"),
                where("orgId", "==", orgId),
                where("cities", "array-contains", city),
                where("status", "==", "Published"),
              ),
            ),
          ),
        );

        // Deduplicate by doc id
        const seen = new Set();
        const found = [];
        for (const snap of snapshots) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              found.push({ id: d.id, ...d.data() });
            }
          }
        }

        setTemplates(found);
        setPhase(found.length > 0 ? "picker" : "editor");

        // If no templates found, open blank editor immediately
        if (found.length === 0) {
          setItineraryData(null);
          setEditorOpen(true);
        }
      } catch (err) {
        console.error("ItinerarySection fetch error:", err);
        setFetchError(
          "Could not load itinerary templates. You can still create one below.",
        );
        setPhase("editor");
        setEditorOpen(true);
      }
    };

    fetchTemplates();
  }, [cities, orgId, itineraryData]);

  // ── Fetch activities for editor (state-scoped, read-only) ─────────────
  useEffect(() => {
    if (!selectedState || !orgId) return;
    getDocs(
      query(
        collection(db, "activities"),
        where("orgId", "==", orgId),
        where("state", "==", selectedState),
      ),
    )
      .then((snap) =>
        setAvailableActivities(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ),
      )
      .catch(console.error);
  }, [selectedState, orgId]);

  // ── Bubble itinerary data up to parent ──────────────────────────────────
  useEffect(() => {
    onChange?.(itineraryData);
  }, [itineraryData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectTemplate = (template, openEditorDirectly) => {
    const cloned = deepClone(template);
    setSelectedTemplateId(template.id);
    setItineraryData(cloned);
    setEditorOpen(true); // always open editor on select
    setPhase("editor");
  };

  const handleEditorChange = (data) => {
    setItineraryData(data);
  };

  const handleDiscard = () => {
    setSelectedTemplateId(null);
    setItineraryData(null);
    setEditorOpen(false);
    onChange?.(null);
    // Go back to picker if templates exist, else idle
    setPhase(templates.length > 0 ? "picker" : "idle");
  };

  const handleCreateCustom = () => {
    setSelectedTemplateId(null);
    setItineraryData(null);
    setEditorOpen(true);
    setPhase("editor");
  };

  // ── Nothing to show until hotels are saved ───────────────────────────────
  if (hotelEntries.length === 0) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-800">
            Itinerary
            {itineraryData && (
              <span className="ml-2 text-xs font-normal text-slate-500 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                ✓ Added
              </span>
            )}
          </h3>
        </div>

        {/* City context pills */}
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cities.map((c) => (
              <span
                key={c}
                className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200"
              >
                📍 {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── LOADING ── */}
      {phase === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          Looking for itinerary templates for {cities.join(", ")}…
        </div>
      )}

      {/* ── FETCH ERROR banner ── */}
      {fetchError && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {fetchError}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PHASE: PICKER  — templates found
      ══════════════════════════════════════════════════════════════════ */}
      {phase === "picker" && !editorOpen && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {templates.length} template{templates.length > 1 ? "s" : ""}{" "}
              available for {cities.join(" / ")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <p className="text-xs text-slate-500">
              Select a template to pre-fill the itinerary. You can customise
              every detail after selecting — nothing in the original template
              will be changed.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((t) => (
                <TemplateSummaryCard
                  key={t.id}
                  template={t}
                  isSelected={selectedTemplateId === t.id}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>

            {/* Create from scratch option */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">or</span>
              <button
                type="button"
                onClick={handleCreateCustom}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Create a custom itinerary from scratch
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Back to picker link (when editor is open and templates exist) ── */}
      {editorOpen && templates.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setEditorOpen(false);
            setPhase("picker");
          }}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 font-medium"
        >
          ← Back to template list
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PHASE: EDITOR  — either pre-populated or blank
      ══════════════════════════════════════════════════════════════════ */}
      {editorOpen && (
        <Card className="border-2 border-blue-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                {selectedTemplateId
                  ? "Customise template (for this quotation only)"
                  : "Create custom itinerary"}
              </CardTitle>
              {/* Quick discard */}
              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                title="Discard itinerary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedTemplateId && (
              <p className="text-[11px] text-blue-500 mt-1">
                Changes here only affect this quotation — the original template
                is unchanged.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4">
            <ItineraryEditor
              key={JSON.stringify(itineraryData)?.slice(0, 50)}
              initialData={itineraryData}
              onChange={handleEditorChange}
              onCancel={handleDiscard}
              availableActivities={availableActivities}
              canUseAI={canUseAI} 
              permissionsLoading={permissionsLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Idle state — no hotels yet (guarded above, but safety net) ── */}
      {phase === "idle" && cities.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400">
          Save at least one hotel to load itinerary options.
        </div>
      )}
    </div>
  );
}
