"use client";

/**
 * ItineraryEditor
 * ──────────────────────────────────────────────────────────────────────────────
 * A fully self-contained itinerary editor that works on LOCAL STATE only.
 * It NEVER reads from or writes to Firestore directly.
 *
 * Props
 * ─────
 *   initialData  – object (cloned template or null for blank)
 *   onChange     – (data) => void  called on every meaningful state change
 *   onCancel     – () => void       called when user clicks "Cancel / Discard"
 *   availableActivities – array fetched by parent (state-scoped), passed down
 *                         so this component stays Firestore-free
 *
 * Shape emitted via onChange
 * ─────────────────────────
 * {
 *   title, state, cities, tags,
 *   days: [{ id, dayNumber, title, description, activityIds[] }],
 *   inclusions:   [{ id, text, selected, isDefault }],
 *   exclusions:   [{ id, text, selected, isDefault }],
 *   tnc:          [{ id, text, selected, isDefault }],
 *   cancellation: [{ id, text, selected, isDefault }],
 *   impInfo:      [{ id, text, selected, isDefault }],
 * }
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Trash2,
  MapPin,
  FileText,
  ListChecks,
  Info,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Badge }    from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const mkId = () =>
  `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Default checklist data  (mirrors ItineraryForm exactly)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_INCLUSIONS = [
  "Hotel to Airport transfer on the day of departure.",
  "All tours & transfers are on a shared coach basis.",
  "Airport to Hotel transfer on the day of arrival.",
  "All sightseeing entry fees",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_EXCLUSIONS = [
  "International or domestic flight tickets unless specified.",
  "Any item of personal nature like tips, laundry, telephone calls etc.",
  "Any other sightseeing other than those mentioned in the inclusions section.",
  "Any fee for video or camera permit.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_TNC = [
  "No rooms are booked or blocked yet, Rooms are subjected to availability.",
  "Package cost will vary depends on currency fluctuations.",
  "No flights are booked or blocked yet, Airfare & Seats are subjected to availability.",
  "Itinerary may change but the inclusions will remain same.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_CANCELLATION = [
  "These are non-refundable amounts as per the current components attached.",
  "Please check the exact cancellation and date change policy on the review page before proceeding further.",
  "Please note, TCS once collected cannot be refunded in case of any cancellation / modification.",
  "Cancellation charges shown is exclusive of all taxes and taxes will be added as per applicable.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_IMP_INFO = [
  "Ensure your passport is valid for at least six months beyond your intended date of return.",
  "Make sure you have enough blank pages for visa stamps.",
  "Obtain the appropriate visa (eg., tourist visa) for your destination country.",
  "Ensure the visa covers your entire stay.",
  "Ensure your travel insurance covers medical emergencies, trip cancellations, and loss of belongings.",
  "Carry a copy of your travel insurance policy.",
  "Carry an additional government-issued ID (e.g., Aadhar card, driving license).",
  "Some countries may require proof of COVID-19 vaccination.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Tabs config
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "itinerary",  label: "Itinerary & Days",          icon: MapPin      },
  { id: "inclusions", label: "Inclusions & Exclusions",   icon: ListChecks  },
  { id: "tnc",        label: "T&C's & Cancellation",      icon: FileText    },
  { id: "impinfo",    label: "Important Information",      icon: Info        },
];

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistSection  (identical logic to ItineraryForm)
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistSection({ items, onToggle, onSelectAll, onAdd, onRemove, addLabel = "Add Item" }) {
  const [newItem, setNewItem] = useState("");
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewItem("");
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id={`sel-all-${addLabel}`}
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`sel-all-${addLabel}`}
            className="text-sm font-medium text-blue-600 cursor-pointer select-none"
          >
            Select All
          </label>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              id={item.id}
              checked={item.selected}
              onCheckedChange={() => onToggle(item.id)}
              className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 flex-shrink-0"
            />
            <label
              htmlFor={item.id}
              className="text-sm text-slate-700 flex-1 cursor-pointer select-none"
            >
              {item.text}
            </label>
            {item.isDefault ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-[10px] text-red-500 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                Remove Default
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
          }}
          placeholder="Type and press Enter or click Add…"
          className="text-sm h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          className="bg-blue-700 hover:bg-blue-800 text-white h-9 px-4 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityDropdown  (native select, no search — mirrors ItineraryForm)
// ─────────────────────────────────────────────────────────────────────────────
function ActivityDropdown({ dayIdx, activityIds, availableActivities, onToggle }) {
  const unselected = availableActivities.filter(
    (a) => !(activityIds || []).includes(a.id)
  );

  const handleChange = (e) => {
    const id = e.target.value;
    if (!id) return;
    onToggle(dayIdx, id);
    e.target.value = "";
  };

  return (
    <select
      onChange={handleChange}
      defaultValue=""
      disabled={unselected.length === 0}
      className="w-full px-3 py-2 text-sm border rounded-md bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <option value="" disabled>
        {unselected.length === 0 ? "All activities added" : "Select an activity to add…"}
      </option>
      {unselected.map((a) => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: ItineraryEditor
// ─────────────────────────────────────────────────────────────────────────────
export default function ItineraryEditor({
  initialData  = null,
  onChange,
  onCancel,
  availableActivities = [],
}) {
  // ── Initialise all state from initialData or defaults ────────────────────
  const init = useCallback(() => {
    if (initialData) {
      return {
        title:        initialData.title        || "",
        state:        initialData.state        || "",
        cities:       initialData.cities       || [],
        tags:         initialData.tags         || [],
        days:         (initialData.days || []).map((d) => ({
          ...d,
          id:          d.id          || mkId(),
          activityIds: d.activityIds || [],
        })),
        inclusions:   initialData.inclusions   || DEFAULT_INCLUSIONS.map((i) => ({ ...i, id: mkId() })),
        exclusions:   initialData.exclusions   || DEFAULT_EXCLUSIONS.map((i) => ({ ...i, id: mkId() })),
        tnc:          initialData.tnc          || DEFAULT_TNC.map((i)         => ({ ...i, id: mkId() })),
        cancellation: initialData.cancellation || DEFAULT_CANCELLATION.map((i) => ({ ...i, id: mkId() })),
        impInfo:      initialData.impInfo      || DEFAULT_IMP_INFO.map((i)    => ({ ...i, id: mkId() })),
      };
    }
    return {
      title: "", state: "", cities: [], tags: [],
      days: [{
        id: mkId(), dayNumber: 1, title: "", description: "", activityIds: [],
      }],
      inclusions:   DEFAULT_INCLUSIONS.map((i)   => ({ ...i, id: mkId() })),
      exclusions:   DEFAULT_EXCLUSIONS.map((i)   => ({ ...i, id: mkId() })),
      tnc:          DEFAULT_TNC.map((i)           => ({ ...i, id: mkId() })),
      cancellation: DEFAULT_CANCELLATION.map((i) => ({ ...i, id: mkId() })),
      impInfo:      DEFAULT_IMP_INFO.map((i)     => ({ ...i, id: mkId() })),
    };
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const initState = init();

  const [activeTab,    setActiveTab]    = useState("itinerary");
  const [title,        setTitle]        = useState(initState.title);
  const [itinState,    setItinState]    = useState(initState.state);
  const [cities,       setCities]       = useState(initState.cities);
  const [cityInput,    setCityInput]    = useState("");
  const [days,         setDays]         = useState(initState.days);
  const [inclusions,   setInclusions]   = useState(initState.inclusions);
  const [exclusions,   setExclusions]   = useState(initState.exclusions);
  const [tnc,          setTnc]          = useState(initState.tnc);
  const [cancellation, setCancellation] = useState(initState.cancellation);
  const [impInfo,      setImpInfo]      = useState(initState.impInfo);

  // ── Bubble up every change ───────────────────────────────────────────────
  useEffect(() => {
    onChange?.({
      title, state: itinState, cities, tags: [],
      days, inclusions, exclusions, tnc, cancellation, impInfo,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, itinState, cities, days, inclusions, exclusions, tnc, cancellation, impInfo]);

  // ── Generic checklist handlers factory ──────────────────────────────────
  const makeHandlers = (setter) => ({
    toggle:    (id)      => setter((prev) => prev.map((i) => i.id === id ? { ...i, selected: !i.selected } : i)),
    selectAll: (checked) => setter((prev) => prev.map((i) => ({ ...i, selected: !!checked }))),
    add:       (text)    => setter((prev) => [...prev, { id: mkId(), text, selected: true, isDefault: false }]),
    remove:    (id)      => setter((prev) => prev.filter((i) => i.id !== id)),
  });

  const incH = makeHandlers(setInclusions);
  const excH = makeHandlers(setExclusions);
  const tncH = makeHandlers(setTnc);
  const canH = makeHandlers(setCancellation);
  const impH = makeHandlers(setImpInfo);

  // ── City tag input ───────────────────────────────────────────────────────
  const handleCityKey = (e) => {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      if (!cities.includes(cityInput.trim()))
        setCities((prev) => [...prev, cityInput.trim()]);
      setCityInput("");
    }
  };
  const removeCity = (city) => setCities((prev) => prev.filter((c) => c !== city));

  // ── Day handlers ─────────────────────────────────────────────────────────
  const addDay = () =>
    setDays((prev) => [
      ...prev,
      { id: mkId(), dayNumber: prev.length + 1, title: "", description: "", activityIds: [] },
    ]);

  const removeDay = (idx) => {
    if (days[idx].title && !window.confirm("Delete this day?")) return;
    setDays((prev) =>
      prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 }))
    );
  };

  const updateDay = (idx, field, value) =>
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });

  const moveDayUp = (idx) => {
    if (idx === 0) return;
    setDays((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const moveDayDown = (idx) => {
    if (idx === days.length - 1) return;
    setDays((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const toggleActivity = (dayIdx, actId) =>
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const cur = d.activityIds || [];
        return {
          ...d,
          activityIds: cur.includes(actId)
            ? cur.filter((id) => id !== actId)
            : [...cur, actId],
        };
      })
    );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">

      {/* ── Tab strip ── */}
      <div className="flex gap-1 flex-wrap pb-4 border-b border-slate-200 mb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1 — ITINERARY & DAYS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "itinerary" && (
        <div className="space-y-5">

          {/* ── Header info ── */}
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Header Info
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">

              {/* Title */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">Itinerary Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5N Golden Triangle"
                  className="text-sm"
                />
              </div>

              {/* State (read-only display — inherited from hotel selection) */}
              {itinState && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500">Base State</Label>
                  <div className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                    {itinState}
                  </div>
                </div>
              )}

              {/* Cities */}
              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Cities Covered <span className="text-slate-400">(type and press Enter)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md bg-white min-h-[42px] focus-within:ring-1 focus-within:ring-blue-500">
                  {cities.map((city) => (
                    <Badge
                      key={city}
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-2 py-0.5 flex items-center gap-1 text-xs"
                    >
                      {city}
                      <button
                        type="button"
                        onClick={() => removeCity(city)}
                        className="hover:text-red-600 p-0.5 rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="flex-1 outline-none text-sm min-w-[100px] bg-transparent"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={handleCityKey}
                    placeholder={cities.length === 0 ? "Add city…" : ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Day program ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">Day-wise Program</h3>

            {days.map((day, idx) => (
              <Card
                key={day.id}
                className="relative border-l-4 border-l-blue-500 border border-slate-200 shadow-none"
              >
                {/* Day header */}
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600 tracking-widest">
                    DAY {day.dayNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* Move up / down */}
                    <button
                      type="button"
                      onClick={() => moveDayUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                      title="Move day up"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDayDown(idx)}
                      disabled={idx === days.length - 1}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                      title="Move day down"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeDay(idx)}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                      title="Delete day"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Day title */}
                  <Input
                    placeholder="Day title…"
                    value={day.title}
                    onChange={(e) => updateDay(idx, "title", e.target.value)}
                    className="font-semibold text-sm"
                  />

                  {/* Day description */}
                  <Textarea
                    placeholder="What happens today? Describe the plan, transfers, meals, sightseeing…"
                    value={day.description}
                    onChange={(e) => updateDay(idx, "description", e.target.value)}
                    className="min-h-[90px] text-sm resize-y"
                  />

                  {/* Linked activities */}
                  {availableActivities.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500 font-medium">
                        Linked Activities
                      </Label>

                      {/* Selected activity badges */}
                      {(day.activityIds || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {day.activityIds.map((actId) => {
                            const act = availableActivities.find((a) => a.id === actId);
                            return (
                              <Badge
                                key={actId}
                                variant="outline"
                                className="flex items-center gap-1 pr-1 bg-blue-50 border-blue-200 text-blue-700 text-xs"
                              >
                                {act ? act.name : <span className="italic text-slate-400">Loading…</span>}
                                <button
                                  type="button"
                                  onClick={() => toggleActivity(idx, actId)}
                                  className="hover:text-red-500 p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <ActivityDropdown
                        dayIdx={idx}
                        activityIds={day.activityIds || []}
                        availableActivities={availableActivities}
                        onToggle={toggleActivity}
                      />
                    </div>
                  )}
                </CardContent>

                {/* Add next day button — inside last card */}
                {idx === days.length - 1 && (
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={addDay}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-xs font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Next Day
                    </button>
                  </div>
                )}
              </Card>
            ))}

            {days.length === 0 && (
              <button
                type="button"
                onClick={addDay}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Day
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2 — INCLUSIONS & EXCLUSIONS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "inclusions" && (
        <Card className="border border-slate-200 shadow-none">
          <CardContent className="p-4 space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-2">Inclusions</h3>
              <ChecklistSection
                items={inclusions}
                onToggle={incH.toggle}
                onSelectAll={incH.selectAll}
                onAdd={incH.add}
                onRemove={incH.remove}
                addLabel="Add Inclusion"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-2">Exclusions</h3>
              <ChecklistSection
                items={exclusions}
                onToggle={excH.toggle}
                onSelectAll={excH.selectAll}
                onAdd={excH.add}
                onRemove={excH.remove}
                addLabel="Add Exclusion"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3 — T&C's & CANCELLATION
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "tnc" && (
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Terms &amp; Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChecklistSection
                items={tnc}
                onToggle={tncH.toggle}
                onSelectAll={tncH.selectAll}
                onAdd={tncH.add}
                onRemove={tncH.remove}
                addLabel="Add Term"
              />
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Cancellation Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChecklistSection
                items={cancellation}
                onToggle={canH.toggle}
                onSelectAll={canH.selectAll}
                onAdd={canH.add}
                onRemove={canH.remove}
                addLabel="Add Cancellation Policy"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4 — IMPORTANT INFORMATION
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "impinfo" && (
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ChecklistSection
              items={impInfo}
              onToggle={impH.toggle}
              onSelectAll={impH.selectAll}
              onAdd={impH.add}
              onRemove={impH.remove}
              addLabel="Add Important Info"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Cancel / Discard button ── */}
      {onCancel && (
        <div className="pt-4 border-t border-slate-200 mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Discard Itinerary
          </Button>
        </div>
      )}
    </div>
  );
}