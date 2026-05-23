"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  Save,
  X,
  Loader2,
  Trash2,
  Info,
  FileText,
  ListChecks,
  MapPin,
  ImageIcon,
  AudioLinesIcon,
  Send,
  Lock,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Sparkles,
  Search,
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
import { db, auth } from "@/firebase/config";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSelector } from "react-redux";

import {
  ImageUploader,
  MultiImageUploader,
  ActivitySelector,
  ChecklistSection,
  MultiStateDropdown,
} from "./../ItinerarySubComponents";
import { ImageSearchPanel } from "../ImageSearchPanel";
import {
  getAgentPreferences,
  setRemovedDefault,
  applyRemovedDefaults,
} from "@/firebase/agentPreferences";

// NEW: Image Search Panel
// import { ImageSearchPanel } from "./ImageSearchPanel";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const mkId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again to use AI generation.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default checklist data (unchanged)
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

const SECTIONS = [
  { id: "itinerary", label: "Itinerary & Days", icon: MapPin },
  { id: "inclusions", label: "Inclusions & Exclusions", icon: ListChecks },
  { id: "tnc", label: "T&C's & Cancellation", icon: FileText },
  { id: "impinfo", label: "Important Information", icon: Info },
];

// ─────────────────────────────────────────────────────────────────────────────
// AIChatPopup (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function AIChatPopup({
  open,
  onClose,
  chatHistory,
  isGenerating,
  aiError,
  onGenerate,
  onRefine,
  hasGenerated,
  canGenerate,
}) {
  const [prompt, setPrompt] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, open]);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    onRefine(trimmed);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        style={{ maxHeight: "calc(100vh - 5rem)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <AudioLinesIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                AI Itinerary Assistant
              </p>
              <p className="text-[10px] text-blue-100">
                {hasGenerated
                  ? "Refine your itinerary"
                  : "Generate day-wise itinerary"}
              </p>
            </div>
            {chatHistory.length > 0 && (
              <Badge className="bg-white/20 text-white border-none text-[10px] px-1.5 py-0 ml-1">
                {chatHistory.filter((m) => m.role === "user").length} msg
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {chatHistory.length === 0 && !isGenerating && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Ready to generate!
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Click Generate to create a day-wise itinerary. You can
                  describe your trip in the chat, or fill in the fields above —
                  AI will suggest missing details automatically.
                </p>
              </div>
            </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AudioLinesIcon className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : msg.isError
                      ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                      : "bg-slate-100 text-slate-700 rounded-bl-sm"
                }`}
              >
                {msg.isError && (
                  <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                )}
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-600">U</span>
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AudioLinesIcon className="w-3 h-3 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {aiError && chatHistory.length === 0 && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex-shrink-0 space-y-2">
          {!hasGenerated ? (
            <Button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating || !canGenerate}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl py-2.5 disabled:opacity-50 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Generating itinerary…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Itinerary with AI
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-500 font-medium">
                  Refine with a follow-up instruction · Ctrl+Enter to send
                </span>
              </div>
              <div className="flex gap-2 items-end">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`e.g. "Add a food tour on Day 2" or "Make Day 3 more relaxed"…`}
                  disabled={isGenerating}
                  className="text-xs resize-none min-h-[60px] max-h-[120px] flex-1 disabled:opacity-60 leading-relaxed rounded-xl bg-white"
                  rows={2}
                />
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-9 w-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 mb-0.5"
                  title="Send (Ctrl+Enter)"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-40 mt-1"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate from scratch
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: ItineraryForm
// ─────────────────────────────────────────────────────────────────────────────
export default function ItineraryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itineraryId = searchParams.get("itineraryid");

  const [activeSection, setActiveSection] = useState("itinerary");
  const [loading, setLoading] = useState(!!itineraryId);
  const [allStates, setAllStates] = useState([]);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const { user } = useSelector((state) => state.auth);
  const isValidCityName = (value) => /^[A-Za-z\s]+$/.test(value.trim());

  // ── Form state (unchanged) ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    states: [],
    cities: [],
    startCity: "",
    endCity: "",
    numDays: "",
    tags: [],
    isActive: true,
    version: 0,
    posterImage: null,
  });

  const [days, setDays] = useState([
    {
      id: "initial-day",
      dayNumber: 1,
      title: "",
      description: "",
      activityIds: [],
      images: [],
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

  // ── AI state (unchanged) ───────────────────────────────────────────────────
  const [chatPopupOpen, setChatPopupOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [canUseAI, setCanUseAI] = useState(false);

  // ── NEW: Image Search Panel State ──────────────────────────────────────────
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageSearchContext, setImageSearchContext] = useState(null); // { type: 'poster' | 'day', dayIdx?: number }

  // Check AI permission (unchanged)
  useEffect(() => {
    if (!user?.uid) return;
    setCanUseAI(true);
  }, [user?.uid]);

  const canGenerate = true;

  // ── Load states (unchanged) ────────────────────────────────────────────────
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        const uniqueStates = [
          ...new Set(snap.docs.map((d) => d.data().name)),
        ].sort();
        setAllStates(uniqueStates);
      } catch {
        toast.error("Failed to load states");
      }
    };
    fetchStates();
  }, []);

  // ── Load existing itinerary (unchanged) ────────────────────────────────────
  useEffect(() => {
    if (!itineraryId) return;
    const loadData = async () => {
      try {
        const snap = await getDoc(doc(db, "itinerary_templates", itineraryId));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            title: data.title || "",
            states: data.states || (data.state ? [data.state] : []),
            cities: data.cities || [],
            startCity: data.startCity || "",
            endCity: data.endCity || "",
            numDays: data.numDays ? String(data.numDays) : "",
            tags: data.tags || [],
            isActive: data.isActive ?? true,
            version: data.version || 0,
            posterImage: data.posterImage || null,
          });
          if (data.days)
            setDays(
              data.days.map((d) => ({
                ...d,
                activityIds: d.activityIds || [],
                images: d.images || [],
              })),
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

  // ── Load activities (unchanged) ────────────────────────────────────────────
  useEffect(() => {
    if (form.states.length === 0) {
      setAvailableActivities([]);
      return;
    }
    const fetchActivities = async () => {
      try {
        const snaps = await Promise.all(
          form.states.map((s) =>
            getDocs(
              query(collection(db, "activities"), where("state", "==", s)),
            ),
          ),
        );
        const seen = new Set();
        const all = [];
        for (const snap of snaps) {
          for (const d of snap.docs) {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              all.push({ id: d.id, ...d.data() });
            }
          }
        }
        setAvailableActivities(all);
      } catch {
        toast.error("Error fetching activities");
      }
    };
    fetchActivities();
  }, [form.states]);

  // ── Checklist helpers (unchanged) ──────────────────────────────────────────
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

  // ── Apply per-agent removed-default preferences on mount ──────────────────
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getAgentPreferences(user.uid);
        if (cancelled) return;
        const rd = prefs.removedDefaults || {};
        setInclusions((prev) => applyRemovedDefaults(prev, rd.inclusions));
        setExclusions((prev) => applyRemovedDefaults(prev, rd.exclusions));
        setTnc((prev) => applyRemovedDefaults(prev, rd.tnc));
        setCancellation((prev) => applyRemovedDefaults(prev, rd.cancellation));
        setImpInfo((prev) => applyRemovedDefaults(prev, rd.impinfo));
      } catch (err) {
        console.error("[itinerary/create] failed to load agent prefs:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Toggle a default item's "marked as default" state AND persist the
  // preference. Selection (the checkbox) is also flipped for the current
  // quotation so the UI immediately reflects the agent's intent — but the
  // persisted bit is independent: the agent can still uncheck a default
  // for one quotation without removing it as a default.
  //
  // `removed === true` → no longer a default (isMarkedAsDefault=false, unchecked)
  // `removed === false` → restored as a default (isMarkedAsDefault=true, checked)
  const makeToggleDefault = (setter, category) => (item, removed) => {
    setter((prev) =>
      prev.map((i) =>
        i.text === item.text && i.isDefault
          ? { ...i, isMarkedAsDefault: !removed, selected: !removed }
          : i,
      ),
    );
    if (user?.uid) {
      setRemovedDefault(user.uid, category, item.text, removed).catch((err) =>
        console.error(`[itinerary/create] persist ${category} pref failed:`, err),
      );
    }
  };

  const incToggleDefault = makeToggleDefault(setInclusions, "inclusions");
  const excToggleDefault = makeToggleDefault(setExclusions, "exclusions");
  const tncToggleDefault = makeToggleDefault(setTnc, "tnc");
  const canToggleDefault = makeToggleDefault(setCancellation, "cancellation");
  const impToggleDefault = makeToggleDefault(setImpInfo, "impinfo");

  // ── City handlers (unchanged) ──────────────────────────────────────────────
  const handleAddCity = (e) => {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      const value = cityInput.trim();
      if (!isValidCityName(value)) {
        toast.error("City name should only contain letters and spaces.");
        return;
      }
      if (!form.cities.includes(value)) {
        setForm((prev) => ({
          ...prev,
          cities: [...prev.cities, value],
        }));
      }
      setCityInput("");
    }
  };

  const removeCity = (city) =>
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.filter((c) => c !== city),
    }));

  // ── Day handlers (unchanged except image updates) ──────────────────────────
  const handleAddDay = () =>
    setDays((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        dayNumber: prev.length + 1,
        title: "",
        description: "",
        activityIds: [],
        images: [],
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

  const toggleActivity = (dayIdx, actId) =>
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const current = d.activityIds || [];
        return {
          ...d,
          activityIds: current.includes(actId)
            ? current.filter((id) => id !== actId)
            : [...current, actId],
        };
      }),
    );

  const updateDayImages = (dayIdx, newImages) =>
    setDays((prev) => {
      const updated = [...prev];
      updated[dayIdx] = { ...updated[dayIdx], images: newImages };
      return updated;
    });

  // ── NEW: Open Image Search ─────────────────────────────────────────────────
  const openImageSearch = (context) => {
    setImageSearchContext(context);
    setImageSearchOpen(true);
  };

  const handleImageSearchSelect = (selectedUrls) => {
    if (imageSearchContext?.type === "poster") {
      setForm((prev) => ({ ...prev, posterImage: selectedUrls[0] || null }));
    } else if (imageSearchContext?.type === "day" && typeof imageSearchContext.dayIdx === "number") {
      const currentDayImages = days[imageSearchContext.dayIdx]?.images || [];
      const combined = [...currentDayImages, ...selectedUrls].slice(0, 2); // respect max 2
      updateDayImages(imageSearchContext.dayIdx, combined);
    }
    setImageSearchOpen(false);
    setImageSearchContext(null);
  };

  // ── AI handlers (unchanged) ────────────────────────────────────────────────
  const applyAIResponse = (data) => {
    setForm((prev) => ({
      ...prev,
      ...(data.title ? { title: data.title } : {}),
      ...(data.states?.length && prev.states.length === 0
        ? { states: data.states }
        : {}),
      ...(data.cities?.length && prev.cities.length === 0
        ? { cities: data.cities }
        : {}),
      ...(data.startCity && !prev.startCity
        ? { startCity: data.startCity }
        : {}),
      ...(data.endCity && !prev.endCity ? { endCity: data.endCity } : {}),
      ...(data.numDays && !prev.numDays
        ? { numDays: String(data.numDays) }
        : {}),
    }));
    if (data.days?.length) {
      setDays(
        data.days.map((d, i) => ({
          id: mkId(),
          dayNumber: d.dayNumber ?? i + 1,
          title: d.title || "",
          description: d.description || "",
          activityIds: [],
          images: [],
        })),
      );
    }
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    setChatHistory([]);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai-itinerary-template", {
        method: "POST",
        headers,
        body: JSON.stringify({
          templateContext: {
            states: form.states,
            cities: form.cities,
            startCity: form.startCity,
            endCity: form.endCity,
            numDays: Number(form.numDays),
          },
          chatHistory: [],
          userPrompt: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      applyAIResponse(data);
      setHasGenerated(true);

      setChatHistory([
        {
          role: "assistant",
          content: `Itinerary generated! Created ${data.days?.length ?? 0} days for "${data.title || "your trip"}". You can now refine it with follow-up messages, or edit the days manually below.`,
        },
      ]);
    } catch (err) {
      console.error("[AI ItineraryForm]", err);
      const errMsg =
        err.message || "Generation failed. You can still fill in manually.";
      setAiError(errMsg);
      setChatHistory([
        {
          role: "assistant",
          content: `Could not generate: ${errMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (userPrompt) => {
    if (!userPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAiError(null);

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userPrompt },
    ];
    setChatHistory(updatedHistory);

    const currentItinerary = { title: form.title, days };

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai-itinerary-template", {
        method: "POST",
        headers,
        body: JSON.stringify({
          templateContext: {
            states: form.states,
            cities: form.cities,
            startCity: form.startCity,
            endCity: form.endCity,
            numDays: Number(form.numDays),
          },
          chatHistory: updatedHistory,
          userPrompt,
          currentItinerary,
        }),
      });

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          errMsg = errBody?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      applyAIResponse(data);

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Done! Updated the itinerary based on your request.${data.days?.length ? ` The plan now has ${data.days.length} days.` : ""}`,
        },
      ]);
    } catch (err) {
      console.error("[AI ItineraryForm Refine]", err);
      const errMsg =
        err.message ||
        "Could not apply changes. Please try again or edit manually.";
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: errMsg, isError: true },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save (unchanged) ───────────────────────────────────────────────────────
  const handleSave = async (isDraft = false) => {
    if (!form.title || form.states.length === 0 || form.cities.length === 0)
      return toast.error(
        "Required: Title, at least one State, and at least one City.",
      );
    if (!form.startCity.trim())
      return toast.error("Starting City is required.");
    if (!form.endCity.trim()) return toast.error("Ending City is required.");
    if (!form.numDays || Number(form.numDays) < 1)
      return toast.error("Number of Days must be at least 1.");
    if (!user?.uid || !user?.role)
      return toast.error("User should be logged in");
    if (!isValidCityName(form.startCity)) {
      return toast.error("Starting city must contain only letters.");
    }
    if (!isValidCityName(form.endCity)) {
      return toast.error("Ending city must contain only letters.");
    }
    if (form.cities.some((city) => !isValidCityName(city))) {
      return toast.error("All cities must contain only letters.");
    }

    const payload = {
      title: form.title,
      states: form.states,
      state: form.states[0] || "",
      cities: form.cities,
      startCity: form.startCity,
      endCity: form.endCity,
      numDays: Number(form.numDays),
      tags: form.tags,
      isActive: form.isActive,
      posterImage: form.posterImage,
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
      clientRole: user.role,
      clientId: user.uid,
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
      router.back();
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
      {/* Sticky Header (unchanged) */}
      <header className="sticky top-0 z-20 bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">
            {itineraryId ? "Edit" : "Create"} Itinerary Template
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            onClick={() => setChatPopupOpen(true)}
            variant="outline"
            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 relative"
          >
            <Sparkles className="w-4 h-4" />
            AI Generate
            {isGenerating && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            )}
            {hasGenerated && !isGenerating && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
            )}
          </Button>
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

      {/* Section Tabs (unchanged) */}
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
        {/* ITINERARY SECTION */}
        {activeSection === "itinerary" && (
          <>
            {/* Header Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  Step 1: Header Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Title, States, Cities, Start/End, NumDays (unchanged) */}
                <div className="space-y-1">
                  <Label>Itinerary Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="e.g. 6D5N Rajasthan Heritage Circuit"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Base State(s) *</Label>
                  <MultiStateDropdown
                    states={allStates}
                    selectedStates={form.states}
                    onChange={(states) =>
                      setForm((prev) => ({ ...prev, states }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cities Covered (type and press Enter) *</Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-white min-h-[45px] focus-within:ring-1 focus-within:ring-blue-500">
                    {form.cities.map((city) => (
                      <Badge
                        key={city}
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-2 py-1 flex items-center gap-1"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => removeCity(city)}
                          className="hover:text-red-600 p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      className="flex-1 outline-none text-sm min-w-[120px]"
                      value={cityInput}
                      onChange={(e) => {
                        const filtered = e.target.value.replace(/[^A-Za-z\s]/g, "");
                        setCityInput(filtered);
                      }}
                      onKeyDown={(e) => {
                        if (/[^A-Za-z\s]/.test(e.key) && e.key.length === 1) {
                          e.preventDefault();
                          return;
                        }
                        handleAddCity(e);
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text");
                        const filtered = pasted.replace(/[^A-Za-z\s]/g, "");
                        setCityInput((prev) => (prev + filtered).trimStart());
                      }}
                      placeholder="Add city..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Starting City *</Label>
                    <Input
                      value={form.startCity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^[A-Za-z\s]*$/.test(value)) {
                          setForm({ ...form, startCity: value });
                        }
                      }}
                      placeholder="e.g. Jaipur"
                    />
                    <p className="text-[11px] text-slate-400">
                      First destination of the trip
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label>Ending City *</Label>
                    <Input
                      value={form.endCity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^[A-Za-z\s]*$/.test(value)) {
                          setForm({ ...form, endCity: value });
                        }
                      }}
                      placeholder="e.g. Udaipur"
                    />
                    <p className="text-[11px] text-slate-400">
                      Final city before departure
                    </p>
                  </div>
                </div>

                <div className="space-y-1 max-w-xs">
                  <Label>Number of Trip Days *</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={form.numDays}
                    onChange={(e) =>
                      setForm({ ...form, numDays: e.target.value })
                    }
                    placeholder="e.g. 6"
                  />
                  <p className="text-[11px] text-slate-400">
                    Total days including arrival and departure
                  </p>
                </div>

                {/* Poster Image with Search Button */}
                <div className="space-y-1.5 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                      Poster / Cover Image
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openImageSearch({ type: "poster" })}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search Images
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Main image shown at the top of the itinerary.
                  </p>
                  <div className="max-w-lg">
                    <ImageUploader
                      value={form.posterImage}
                      onChange={(url) =>
                        setForm((prev) => ({ ...prev, posterImage: url }))
                      }
                      label=""
                      aspectClass="aspect-video"
                      maxSizeMB={8}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Day Program */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">
                  Step 2: Day Program
                </h2>
              </div>

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
                      placeholder="What happens today? Describe transfers, sightseeing, meals…"
                      value={day.description}
                      onChange={(e) =>
                        updateDayField(idx, "description", e.target.value)
                      }
                      className="min-h-[100px]"
                    />

                    {/* Day Images with Search Button */}
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Day Photos
                          <span className="ml-auto text-[10px] text-slate-400 font-normal">
                            {(day.images || []).length} / 2
                          </span>
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openImageSearch({
                              type: "day",
                              dayIdx: idx,
                              dayTitle: day.title,
                              dayDescription: day.description,
                            })
                          }
                          className="text-xs h-7"
                        >
                          <Search className="w-3.5 h-3.5 mr-1" />
                          Search
                        </Button>
                      </div>
                      <MultiImageUploader
                        values={day.images || []}
                        onChange={(urls) => updateDayImages(idx, urls)}
                        max={2}
                      />
                    </div>

                    {/* Linked Activities (unchanged) */}
                    <div className="space-y-2 border-t pt-3">
                      <Label className="text-xs text-slate-500">
                        Linked Activities
                      </Label>
                      {(day.activityIds || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {day.activityIds.map((actId) => {
                            const activity = availableActivities.find(
                              (a) => a.id === actId,
                            );
                            return (
                              <Badge
                                key={actId}
                                variant="outline"
                                className="flex items-center gap-1 pr-1 bg-blue-50 border-blue-200 text-blue-700"
                              >
                                {activity ? (
                                  activity.name
                                ) : (
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
                      <ActivitySelector
                        dayIdx={idx}
                        activityIds={day.activityIds || []}
                        availableActivities={availableActivities}
                        onToggle={toggleActivity}
                        state={form.states[0] || ""}
                      />
                    </div>
                  </CardContent>

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

        {/* Other sections unchanged */}
        {activeSection === "inclusions" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Inclusion &amp; Exclusion
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
                  onToggleDefault={incToggleDefault}
                  addLabel="Add Inclusion"
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
                  onToggleDefault={excToggleDefault}
                  addLabel="Add Exclusion"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "tnc" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  T&amp;C&apos;s
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChecklistSection
                  items={tnc}
                  onToggle={tncH.toggle}
                  onSelectAll={tncH.selectAll}
                  onAdd={tncH.add}
                  onRemove={tncH.remove}
                  onToggleDefault={tncToggleDefault}
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
                  onToggleDefault={canToggleDefault}
                  addLabel="Add Cancellation Policy"
                />
              </CardContent>
            </Card>
          </div>
        )}

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
                onToggleDefault={impToggleDefault}
                addLabel="Add Important Information"
              />
            </CardContent>
          </Card>
        )}
      </main>

      {/* AI Chat Popup (unchanged) */}
      <AIChatPopup
        open={chatPopupOpen}
        onClose={() => setChatPopupOpen(false)}
        chatHistory={chatHistory}
        isGenerating={isGenerating}
        aiError={aiError}
        onGenerate={handleGenerateWithAI}
        onRefine={handleRefine}
        hasGenerated={hasGenerated}
        canGenerate={canGenerate}
      />

      {/* NEW: Image Search Panel */}
      <ImageSearchPanel
        open={imageSearchOpen}
        onClose={() => {
          setImageSearchOpen(false);
          setImageSearchContext(null);
        }}
        context={imageSearchContext}
        onSelect={handleImageSearchSelect}
      />
    </div>
  );
}