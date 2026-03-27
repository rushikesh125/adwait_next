"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  Save,
  X,
  Loader2,
  Check,
  Trash2,
  Info,
  FileText,
  ListChecks,
  MapPin,
} from "lucide-react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelector } from "react-redux";

// ─────────────────────────────────────────────────────────────────────────────
// Activity Selector – clean native select dropdown, no search bar
// ─────────────────────────────────────────────────────────────────────────────
function ActivitySelector({
  dayIdx,
  activityIds,
  availableActivities,
  onToggle,
  state,
}) {
  const unselected = availableActivities.filter(
    (a) => !(activityIds || []).includes(a.id),
  );

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    onToggle(dayIdx, selectedId);
    // Reset select back to placeholder
    e.target.value = "";
  };

  return (
    <select
      onChange={handleChange}
      disabled={!state || unselected.length === 0}
      defaultValue=""
      className="w-full px-3 py-2 text-sm border rounded-md bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <option value="" disabled>
        {!state
          ? "Select a state first"
          : unselected.length === 0
            ? "All activities added"
            : "Select an activity to add..."}
      </option>
      {unselected.map((activity) => (
        <option key={activity.id} value={activity.id}>
          {activity.name}
        </option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Checklist Section
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistSection({
  items,
  onToggle,
  onSelectAll,
  onAdd,
  onRemove,
  addLabel = "Add Item",
}) {
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
            id={`select-all-${addLabel}`}
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`select-all-${addLabel}`}
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
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Type and press Enter or click Add..."
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
// Default data
// ─────────────────────────────────────────────────────────────────────────────
const mkId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

const SECTIONS = [
  { id: "itinerary", label: "Itinerary & Days", icon: MapPin },
  { id: "inclusions", label: "Inclusions & Exclusions", icon: ListChecks },
  { id: "tnc", label: "T&C's & Cancellation", icon: FileText },
  { id: "impinfo", label: "Important Information", icon: Info },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ItineraryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("itineraryid");

  const [activeSection, setActiveSection] = useState("itinerary");
  const [loading, setLoading] = useState(!!itineraryId);
  const [states, setStates] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const {user} = useSelector(state=>state.auth)
  const [form, setForm] = useState({
    title: "",
    state: "",
    cities: [],
    tags: [],
    isActive: true,
    version: 0,
  });

  const [days, setDays] = useState([
    {
      id: "initial-day",
      dayNumber: 1,
      title: "",
      description: "",
      activityIds: [],
    },
  ]);

  const [inclusions, setInclusions] = useState(() =>
    DEFAULT_INCLUSIONS.map((i) => ({ ...i, id: mkId() })),
  );
  const [exclusions, setExclusions] = useState(() =>
    DEFAULT_EXCLUSIONS.map((i) => ({ ...i, id: mkId() })),
  );
  const [tnc, setTnc] = useState(() =>
    DEFAULT_TNC.map((i) => ({ ...i, id: mkId() })),
  );
  const [cancellation, setCancellation] = useState(() =>
    DEFAULT_CANCELLATION.map((i) => ({ ...i, id: mkId() })),
  );
  const [impInfo, setImpInfo] = useState(() =>
    DEFAULT_IMP_INFO.map((i) => ({ ...i, id: mkId() })),
  );

  // ── Load states ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        const uniqueStates = [
          ...new Set(snap.docs.map((d) => d.data().name)),
        ].sort();
        setStates(uniqueStates);
      } catch {
        toast.error("Failed to load states");
      }
    };
    fetchStates();
  }, []);

  // ── Load existing itinerary for edit ──────────────────────────────────────
  useEffect(() => {
    if (!itineraryId) return;
    const loadData = async () => {
      try {
        const snap = await getDoc(doc(db, "itinerary_templates", itineraryId));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            title: data.title || "",
            state: data.state || "",
            cities: data.cities || [],
            tags: data.tags || [],
            isActive: data.isActive ?? true,
            version: data.version || 0,
          });
          if (data.days)
            setDays(
              data.days.map((d) => ({ ...d, activityIds: d.activityIds || [] })),
            );
          if (data.inclusions) setInclusions(data.inclusions);
          if (data.exclusions) setExclusions(data.exclusions);
          if (data.tnc) setTnc(data.tnc);
          if (data.cancellation) setCancellation(data.cancellation);
          if (data.impInfo) setImpInfo(data.impInfo);
        }
      } catch {
        toast.error("Error loading template");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [itineraryId]);

  // ── Load activities when state changes ────────────────────────────────────
  useEffect(() => {
    if (!form.state) {
      setAvailableActivities([]);
      return;
    }
    const fetchActivities = async () => {
      try {
        const q = query(
          collection(db, "activities"),
          where("state", "==", form.state),
        );
        const snap = await getDocs(q);
        setAvailableActivities(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      } catch {
        toast.error("Error fetching activities");
      }
    };
    fetchActivities();
  }, [form.state]);

  // ── Checklist helpers ─────────────────────────────────────────────────────
  const makeHandlers = (setter) => ({
    toggle: (id) =>
      setter((prev) =>
        prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)),
      ),
    selectAll: (checked) =>
      setter((prev) => prev.map((i) => ({ ...i, selected: !!checked }))),
    add: (text) =>
      setter((prev) => [
        ...prev,
        { id: mkId(), text, selected: true, isDefault: false },
      ]),
    remove: (id) => setter((prev) => prev.filter((i) => i.id !== id)),
  });

  const incH = makeHandlers(setInclusions);
  const excH = makeHandlers(setExclusions);
  const tncH = makeHandlers(setTnc);
  const canH = makeHandlers(setCancellation);
  const impH = makeHandlers(setImpInfo);

  // ── Day handlers ──────────────────────────────────────────────────────────
  const handleAddCity = (e) => {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      if (!form.cities.includes(cityInput.trim()))
        setForm((prev) => ({
          ...prev,
          cities: [...prev.cities, cityInput.trim()],
        }));
      setCityInput("");
    }
  };

  const removeCity = (city) =>
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== city),
    }));

  const handleAddDay = () =>
    setDays((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        dayNumber: prev.length + 1,
        title: "",
        description: "",
        activityIds: [],
      },
    ]);

  const removeDay = (idx) => {
    if (days[idx].title && !window.confirm("Delete this day?")) return;
    setDays((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((d, i) => ({ ...d, dayNumber: i + 1 })),
    );
  };

  const updateDayField = (index, field, value) =>
    setDays((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  // Fixed: toggle adds if not present, removes if already present
  const toggleActivity = (dayIdx, actId) =>
    setDays((prev) => {
      const updated = prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const current = d.activityIds || [];
        return {
          ...d,
          activityIds: current.includes(actId)
            ? current.filter((id) => id !== actId)
            : [...current, actId],
        };
      });
      return updated;
    });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (isDraft = false) => {
    if (!form.title || !form.state || form.cities.length === 0)
      return toast.error("Required: Title, State, and at least 1 City.");
    if ( !user || !(user?.uid && user?.role)){
      return toast.error("User should be loggedin")
    }
    const payload = {
      ...form,
      days,
      inclusions,
      exclusions,
      tnc,
      cancellation,
      impInfo,
      durationNights: days.length - 1,
      version: (form.version || 0) + 1,
      updatedAt: serverTimestamp(),
      status: isDraft ? "Draft" : "Published",
      clientRole:user?.role,
      clientId:user?.uid
    };

    try {
      const loader = toast.loading("Saving...");
      if (itineraryId) {
        await updateDoc(doc(db, "itinerary_templates", itineraryId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "itinerary_templates"), payload);
      }
      toast.dismiss(loader);
      toast.success("Saved successfully");
      router.back()
    } catch {
      toast.error("Save failed");
    }
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">
            {itineraryId ? "Edit" : "Create"} Itinerary Template
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave(true)}>
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" /> Save Template
          </Button>
        </div>
      </header>

      {/* ── Section Tabs ── */}
      <div className="sticky top-[73px] z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 py-2 overflow-x-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto mt-6 px-4 space-y-6">
        {/* ══════════════════════════════════════
            SECTION 1 – ITINERARY & DAYS
        ══════════════════════════════════════ */}
        {activeSection === "itinerary" && (
          <>
            {/* Header Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  Step 1: Header Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Itinerary Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="e.g. 5N Golden Triangle"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Base State *</Label>
                    <Select
                      value={form.state}
                      onValueChange={(v) => setForm({ ...form, state: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cities Covered (Type and press Enter) *</Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[45px] focus-within:ring-1 focus-within:ring-blue-500">
                    {form.cities.map((city) => (
                      <Badge
                        key={city}
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-2 py-1 flex items-center gap-1"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCity(city);
                          }}
                          className="hover:text-red-600 p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      className="flex-1 outline-none text-sm min-w-[120px]"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      onKeyDown={handleAddCity}
                      placeholder="Add city..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Day Program */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">
                Step 2: Day Program
              </h2>

              {days.map((day, idx) => (
                <Card
                  key={day.id}
                  className="relative border-l-4 border-l-blue-500"
                >
                  <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                    <span className="text-xs font-black text-blue-600 tracking-widest">
                      DAY {day.dayNumber}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                      onClick={() => removeDay(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <Input
                      placeholder="Day Title..."
                      value={day.title}
                      onChange={(e) =>
                        updateDayField(idx, "title", e.target.value)
                      }
                      className="font-bold text-md"
                    />
                    <Textarea
                      placeholder="What happens today?"
                      value={day.description}
                      onChange={(e) =>
                        updateDayField(idx, "description", e.target.value)
                      }
                      className="min-h-[100px]"
                    />

                    {/* Linked Activities */}
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">
                        Linked Activities
                      </Label>

                      {/* Selected activity badges */}
                      {(day.activityIds || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {day.activityIds.map((actId) => {
                            const activity = availableActivities.find(
                              (a) => a.id === actId,
                            );
                            // Show badge only if activity data is loaded; otherwise show placeholder
                            return (
                              <Badge
                                key={actId}
                                variant="outline"
                                className="flex items-center gap-1 pr-1 bg-blue-50 border-blue-200 text-blue-700"
                              >
                                {activity ? activity.name : (
                                  <span className="text-slate-400 italic text-xs">
                                    Loading…
                                  </span>
                                )}
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

                      {/* Activity dropdown – no search bar */}
                      <ActivitySelector
                        dayIdx={idx}
                        activityIds={day.activityIds || []}
                        availableActivities={availableActivities}
                        onToggle={toggleActivity}
                        state={form.state}
                      />
                    </div>
                  </CardContent>

                  {/* Add Day button inside the last card */}
                  {idx === days.length - 1 && (
                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={handleAddDay}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all duration-150"
                      >
                        <Plus className="w-4 h-4" />
                        Add Next Day
                      </button>
                    </div>
                  )}
                </Card>
              ))}

              {/* Show Add Day button also when there are no days yet */}
              {days.length === 0 && (
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all duration-150"
                >
                  <Plus className="w-4 h-4" />
                  Add First Day
                </button>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════
            SECTION 2 – INCLUSIONS & EXCLUSIONS
        ══════════════════════════════════════ */}
        {activeSection === "inclusions" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Inclusion & Exclusion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2">
                  Include
                </h3>
                <ChecklistSection
                  items={inclusions}
                  onToggle={incH.toggle}
                  onSelectAll={incH.selectAll}
                  onAdd={incH.add}
                  onRemove={incH.remove}
                  addLabel="Add Inclusions"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2">
                  Exclude
                </h3>
                <ChecklistSection
                  items={exclusions}
                  onToggle={excH.toggle}
                  onSelectAll={excH.selectAll}
                  onAdd={excH.add}
                  onRemove={excH.remove}
                  addLabel="Add Exclusions"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════
            SECTION 3 – T&Cs & CANCELLATION
        ══════════════════════════════════════ */}
        {activeSection === "tnc" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  T&amp;C's
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChecklistSection
                  items={tnc}
                  onToggle={tncH.toggle}
                  onSelectAll={tncH.selectAll}
                  onAdd={tncH.add}
                  onRemove={tncH.remove}
                  addLabel="Add Terms"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  Cancellation Policy
                </CardTitle>
              </CardHeader>
              <CardContent>
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

        {/* ══════════════════════════════════════
            SECTION 4 – IMPORTANT INFORMATION
        ══════════════════════════════════════ */}
        {activeSection === "impinfo" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Important Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChecklistSection
                items={impInfo}
                onToggle={impH.toggle}
                onSelectAll={impH.selectAll}
                onAdd={impH.add}
                onRemove={impH.remove}
                addLabel="Add Important Information"
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}