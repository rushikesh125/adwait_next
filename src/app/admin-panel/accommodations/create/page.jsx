"use client";
import React, { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection, getDocs, doc, getDoc, updateDoc,
  arrayUnion, addDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  X, MapPin, Hotel, Calendar, BedDouble, Plus, Check,
  Star, ExternalLink, AlertTriangle, Loader2, ArrowLeft,
  Building2, Sparkles, Globe, Navigation, Trash2,
  ChevronDown, ChevronUp, Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { updateHotelComplete, validateHotelData } from "@/firebase/accomodation";

// ─── Date Overlap Utilities ────────────────────────────────────────────────
const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const rangesOverlap = (startA, endA, startB, endB) => {
  const sA = parseDate(startA);
  const eA = parseDate(endA);
  const sB = parseDate(startB);
  const eB = parseDate(endB);
  if (!sA || !eA || !sB || !eB) return false;
  return sA <= eB && sB <= eA;
};

const getUsedPriorities = (seasons, currentIndex) => {
  const used = new Set();
  seasons.forEach((s, i) => {
    if (i !== currentIndex && s.priority != null) used.add(Number(s.priority));
  });
  return used;
};

const roomHasUnresolvedConflict = (seasons = []) => {
  for (let i = 0; i < seasons.length; i++) {
    for (let j = i + 1; j < seasons.length; j++) {
      const a = seasons[i], b = seasons[j];
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        if (a.priority == null || b.priority == null || Number(a.priority) === Number(b.priority)) return true;
      }
    }
  }
  return false;
};

const seasonConflictsWith = (season, seasons, selfIndex) =>
  seasons.filter((s, i) => i !== selfIndex && rangesOverlap(season.start, season.end, s.start, s.end)).map(s => s.name || "Season");

const seasonHasConflict = (season, seasons, selfIndex) => {
  for (let i = 0; i < seasons.length; i++) {
    if (i === selfIndex) continue;
    const other = seasons[i];
    if (rangesOverlap(season.start, season.end, other.start, other.end)) {
      if (season.priority == null || other.priority == null || Number(season.priority) === Number(other.priority)) return true;
    }
  }
  return false;
};
// ──────────────────────────────────────────────────────────────────────────

// Step indicator
const StepIndicator = ({ current }) => {
  const steps = [
    { id: 1, label: "Basic Info", icon: Building2 },
    { id: 2, label: "Rooms & Seasons", icon: BedDouble },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = current === step.id;
        const isDone = current > step.id;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive ? "bg-theme-primary text-white shadow-md" : isDone ? "text-green-600" : "text-slate-400"}`}>
              {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              <span className="text-xs font-bold hidden sm:block">{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`h-px w-6 mx-1 transition-all ${isDone ? "bg-green-400" : "bg-slate-200"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── TripAdvisor Search Hook ───────────────────────────────────────────────
const useTripAdvisorSearch = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (query, city, state) => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const location = [city, state].filter(Boolean).join(", ");
      const searchQuery = location ? `${query} ${location}` : query;
      const res = await fetch(`/api/tripadvisor/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSuggestions(data?.data || []);
    } catch (err) {
      console.error("TripAdvisor search error:", err);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const fetchDetails = async (locationId) => {
    try {
      const res = await fetch(`/api/tripadvisor/details?locationId=${locationId}`);
      return await res.json();
    } catch (err) {
      console.error("TripAdvisor details error:", err);
      return null;
    }
  };

  return { suggestions, searching, search, fetchDetails, setSuggestions };
};
// ──────────────────────────────────────────────────────────────────────────

const inputCls = "w-full h-10 border border-slate-200 rounded-lg px-3 bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none text-sm text-slate-800 placeholder:text-slate-400 transition-all";

const emptyPricing = () => ({
  ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
});

const emptyRoom = (sourceRoom = null) => ({
  categoryName: "",
  seasons: sourceRoom?.seasons?.length
    ? sourceRoom.seasons.map(s => ({
        ...s,
        priority: s.priority != null ? Number(s.priority) : null,
        pricing: Object.fromEntries(
          Object.keys(s.pricing || {}).map(plan => [plan, { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }])
        ),
      }))
    : [],
});

// ─── Room Season Card ──────────────────────────────────────────────────────
const SeasonCard = ({ season, seasonIndex, roomIndex, allSeasons, onChange, onRemove, onClone }) => {
  const [open, setOpen] = useState(false);
  const isConflict = seasonHasConflict(season, allSeasons, seasonIndex);
  const conflictsWith = seasonConflictsWith(season, allSeasons, seasonIndex);
  const availablePlans = ["ep", "cp", "map", "ap"];
  const activePlans = Object.keys(season.pricing || {});
  const missingPlans = availablePlans.filter(p => !activePlans.includes(p));
  const usedPriorities = getUsedPriorities(allSeasons, seasonIndex);
  const showPriority = isConflict || season.priority != null;

  return (
    <div className={`rounded-xl border overflow-hidden ${isConflict ? "border-red-300 ring-1 ring-red-200" : "border-slate-200"}`}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none ${isConflict ? "bg-red-50 hover:bg-red-100" : open ? "bg-theme-primary/5" : "bg-slate-50 hover:bg-slate-100"}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
          <span className="font-semibold text-sm text-slate-800 truncate">{season.name || "Unnamed Season"}</span>
          {season.start && season.end && (
            <span className="text-xs text-slate-400 hidden sm:inline">{season.start} → {season.end}</span>
          )}
          {season.priority != null && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0">P{season.priority}</Badge>
          )}
          {isConflict && (season.priority == null) && (
            <Badge variant="destructive" className="text-[10px] flex items-center gap-1 shrink-0">
              <AlertTriangle className="h-2.5 w-2.5" /> Overlaps: {conflictsWith.join(", ")}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onClone(seasonIndex)} className="text-xs text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors">
            Clone
          </button>
          <button onClick={() => onRemove(seasonIndex)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Conflict alert */}
      {isConflict && season.priority == null && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">
            <span className="font-semibold">Date conflict</span> with{" "}
            <span className="font-semibold">{conflictsWith.join(", ")}</span>.
            Assign a priority to resolve.
          </p>
        </div>
      )}

      {/* Body */}
      {open && (
        <div className="p-4 bg-white space-y-4 border-t border-slate-100">
          {/* Date + Name + Priority row */}
          <div className={`grid gap-3 ${showPriority ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Season Name</label>
              <Input value={season.name} onChange={e => onChange(seasonIndex, "name", e.target.value)} className="h-9 text-sm" placeholder="e.g. Peak Season" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Start Date</label>
              <Input type="date" value={season.start} onChange={e => onChange(seasonIndex, "start", e.target.value)} className={`h-9 text-sm ${isConflict ? "border-red-300 bg-red-50" : ""}`} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">End Date</label>
              <Input type="date" value={season.end} onChange={e => onChange(seasonIndex, "end", e.target.value)} className={`h-9 text-sm ${isConflict ? "border-red-300 bg-red-50" : ""}`} />
            </div>
            {showPriority && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Priority</label>
                <select
                  value={season.priority ?? ""}
                  onChange={e => onChange(seasonIndex, "priority", e.target.value ? Number(e.target.value) : null)}
                  className="h-9 w-full border border-slate-200 rounded-lg px-3 text-sm bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                >
                  <option value="">Select</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num} disabled={usedPriorities.has(num)}>{num}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Meal Plans */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Utensils className="h-3.5 w-3.5" /> Meal Plans & Pricing
              </label>
              {missingPlans.length > 0 && (
                <div className="flex gap-1">
                  {missingPlans.map(plan => (
                    <button
                      key={plan}
                      onClick={() => onChange(seasonIndex, "__addPlan", plan)}
                      className="text-[10px] px-2 py-1 bg-slate-100 uppercase text-slate-700 hover:bg-slate-200 rounded font-semibold transition-colors"
                    >
                      + {plan}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activePlans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide w-16">Plan</th>
                      <th className="px-3 py-2 font-semibold text-slate-500">Double</th>
                      <th className="px-3 py-2 font-semibold text-slate-500">Extra Adult</th>
                      <th className="px-3 py-2 font-semibold text-slate-500">Extra Child</th>
                      <th className="px-3 py-2 font-semibold text-slate-500 text-theme-primary">CNB</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlans.map(plan => (
                      <tr key={plan} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="uppercase text-[10px] font-bold">{plan}</Badge>
                        </td>
                        {["double", "extraAdult", "extraChild", "cnb"].map(type => (
                          <td key={type} className="px-2 py-1.5">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">₹</span>
                              <Input
                                type="number"
                                min="0"
                                value={season.pricing?.[plan]?.[type] ?? 0}
                                onChange={e => onChange(seasonIndex, "__pricing", { plan, type, value: e.target.value })}
                                className="h-8 pl-6 pr-2 text-right text-sm"
                              />
                            </div>
                          </td>
                        ))}
                        <td className="px-1 py-1.5">
                          <button onClick={() => onChange(seasonIndex, "__removePlan", plan)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-3">No meal plans added. Use the buttons above.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Room Card ────────────────────────────────────────────────────────────
const RoomCard = ({ room, roomIndex, onRoomChange, onRemoveRoom, onSeasonChange, onAddSeason, onRemoveSeason, onCloneSeason }) => {
  const hasConflict = roomHasUnresolvedConflict(room.seasons || []);

  return (
    <Card className={`border ${hasConflict ? "border-red-300" : "border-slate-200"} shadow-sm`}>
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-slate-50/80 rounded-t-xl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Input
            placeholder="Room category name (e.g. Deluxe, Suite)"
            value={room.categoryName}
            onChange={e => onRoomChange(roomIndex, "categoryName", e.target.value)}
            className="max-w-xs bg-white h-9 text-sm font-semibold"
          />
          {hasConflict && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs shrink-0">
              <AlertTriangle className="h-3 w-3" /> Date Conflict
            </Badge>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onAddSeason(roomIndex)}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Season
          </button>
          <button
            onClick={() => onRemoveRoom(roomIndex)}
            className="p-1.5 text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        {(room.seasons || []).length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No seasons added. Click "+ Season" to add pricing seasons.</p>
        )}
        {(room.seasons || []).map((season, seasonIndex) => (
          <SeasonCard
            key={seasonIndex}
            season={season}
            seasonIndex={seasonIndex}
            roomIndex={roomIndex}
            allSeasons={room.seasons}
            onChange={(sIdx, key, value) => onSeasonChange(roomIndex, sIdx, key, value)}
            onRemove={sIdx => onRemoveSeason(roomIndex, sIdx)}
            onClone={sIdx => onCloneSeason(roomIndex, sIdx)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────
function HotelFormPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editHotelId = searchParams.get("id");
  const editMode = !!editHotelId;

  // Basic info
  const [states, setStates] = useState([]);
  const [doneOnes, setDoneOnes] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [cities, setCities] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [pendingNewCity, setPendingNewCity] = useState(null);

  const [hotelName, setHotelName] = useState("");
  const [hotelRating, setHotelRating] = useState("");
  const [GoogleListingURL, setGoogleListingURL] = useState("");
  const [GoogleReviewRating, setGoogleReviewRating] = useState("");
  const [TripAdvisorURL, setTripAdvisorURL] = useState("");
  const [TripAdvisorRating, setTripAdvisorRating] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");

  const [hotelSaved, setHotelSaved] = useState(false);
  const [savedHotelId, setSavedHotelId] = useState(null);

  const [isCreatingHotel, setIsCreatingHotel] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Rooms (unified — contains seasons + pricing inline, like EditHotel)
  const [rooms, setRooms] = useState([]);

  // Clone modal
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneContext, setCloneContext] = useState(null);
  const [cloneForm, setCloneForm] = useState({ name: "", start: "", end: "" });
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingClone, setPendingClone] = useState(null);

  // TripAdvisor
  const { suggestions, searching, search: taSearch, fetchDetails, setSuggestions } = useTripAdvisorSearch();
  const [showTaSuggestions, setShowTaSuggestions] = useState(false);
  const [taSearchTimeout, setTaSearchTimeout] = useState(null);

  const currentStep = hotelSaved ? 2 : 1;

  // Fetch states
  useEffect(() => {
    getDocs(collection(db, "locations"))
      .then(snap => setStates(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => toast.error("Failed to load states"));
  }, []);

  // Load hotel in edit mode
  useEffect(() => {
    if (!editMode) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "hotels", editHotelId));
        if (!snap.exists()) return;
        const data = snap.data();
        setHotelName(data.name || "");
        setHotelRating(data.rating || "");
        setGoogleReviewRating(data.GoogleReviewRating || "");
        setGoogleListingURL(data.GoogleListingURL || "");
        setTripAdvisorRating(data.TripAdvisorRating || "");
        setTripAdvisorURL(data.TripAdvisorURL || "");
        setHotelAddress(data.address || "");
        setHotelPhone(data.phone || "");
        setSelectedState(data.state || "");
        setCityInput(data.city || "");
        setSelectedCity({ name: data.city });
        setCityConfirmed(true);
        setHotelSaved(true);
        setSavedHotelId(editHotelId);

        const loadedRooms = (data.rooms || []).map(room => ({
          ...room,
          seasons: (room.seasons || []).map(s => ({
            ...s,
            priority: s.priority != null ? Number(s.priority) : null,
          })),
        }));
        setRooms(loadedRooms);
      } catch {
        toast.error("Failed to load hotel data");
      }
    };
    load();
  }, [editMode, editHotelId]);

  // Fetch cities
  useEffect(() => {
    if (!selectedState) return;
    const stateDoc = states.find(s => s.name === selectedState);
    if (!stateDoc) return;
    getDoc(doc(db, "locations", stateDoc.id))
      .then(snap => { if (snap.exists()) setCities(snap.data().cities || []); })
      .catch(() => toast.error("Failed to load cities"));
  }, [selectedState, states]);

  // Filter cities
  useEffect(() => {
    if (!cityInput.trim()) { setFilteredCities([]); return; }
    const lower = cityInput.toLowerCase();
    const matches = cities.filter(c => c.name.toLowerCase().includes(lower));
    const exact = cities.some(c => c.name.toLowerCase() === lower);
    setFilteredCities(exact ? matches : [...matches, "Other"]);
  }, [cityInput, cities]);

  // TripAdvisor hotel name search
  const handleHotelNameChange = (val) => {
    setHotelName(val);
    if (taSearchTimeout) clearTimeout(taSearchTimeout);
    if (val.length >= 2) {
      setShowTaSuggestions(true);
      const t = setTimeout(() => taSearch(val, selectedCity?.name, selectedState), 500);
      setTaSearchTimeout(t);
    } else {
      setShowTaSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleSelectTASuggestion = async (suggestion) => {
    setHotelName(suggestion.name);
    setShowTaSuggestions(false);
    setSuggestions([]);
    toast.loading("Fetching hotel details...", { id: "ta-fetch" });
    const details = await fetchDetails(suggestion.location_id);
    toast.dismiss("ta-fetch");
    if (details) {
      if (details.rating) setTripAdvisorRating(details.rating);
      if (details.web_url) setTripAdvisorURL(details.web_url);
      if (details.address_obj) {
        setHotelAddress([details.address_obj.street1, details.address_obj.city, details.address_obj.state, details.address_obj.country].filter(Boolean).join(", "));
      }
      setHotelPhone(details.phone || "Not Available");
      const numRating = parseFloat(details.rating);
      if (numRating >= 4.5) setHotelRating("5-star");
      else if (numRating >= 3.5) setHotelRating("4-star");
      else if (numRating >= 2.5) setHotelRating("3-star");
      else if (numRating >= 1.5) setHotelRating("2-star");
      else if (numRating >= 0.5) setHotelRating("1-star");
    }
  };

  const handleSelectCity = (item) => {
    if (item === "Other") {
      const name = cityInput.trim();
      if (!name) return;
      if (cities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        toast.error(`City "${name}" already exists.`); return;
      }
      setPendingNewCity(name);
      setFilteredCities([]);
      return;
    }
    setSelectedCity(item);
    setCityInput(item.name);
    setCityConfirmed(true);
    setFilteredCities([]);
  };

  const confirmAddCity = async () => {
    if (!pendingNewCity) return;
    setIsAddingCity(true);
    try {
      const stateDoc = states.find(s => s.name === selectedState);
      const newCity = { name: pendingNewCity, hotelIds: [] };
      await updateDoc(doc(db, "locations", stateDoc.id), { cities: arrayUnion(newCity) });
      setSelectedCity(newCity);
      setCityInput(pendingNewCity);
      setCityConfirmed(true);
      setPendingNewCity(null);
      toast.success(`City "${pendingNewCity}" added to ${selectedState}`);
    } catch {
      toast.error("Failed to add city");
    } finally {
      setIsAddingCity(false);
    }
  };

  // Save/update basic hotel info (Step 1)
  const handleSaveBasicInfo = async () => {
    if (!hotelName.trim() || !hotelRating || !selectedCity || !selectedState) {
      toast.error("Please fill hotel name, rating, state & city."); return;
    }
    if ((!GoogleReviewRating || !GoogleListingURL) && !doneOnes) {
      toast("Best practice: add Google rating & listing link before saving.", { icon: "💡", duration: 4000 });
      setDoneOnes(true);
      return;
    }
    setIsCreatingHotel(true);
    try {
      const payload = {
        name: hotelName.trim(), rating: hotelRating,
        GoogleReviewRating: GoogleReviewRating || null,
        GoogleListingURL: GoogleListingURL || null,
        TripAdvisorRating: TripAdvisorRating || null,
        TripAdvisorURL: TripAdvisorURL || null,
        address: hotelAddress || null,
        phone: hotelPhone || null,
        state: selectedState,
        city: selectedCity.name,
      };

      if (editMode) {
        await updateDoc(doc(db, "hotels", editHotelId), payload);
        setSavedHotelId(editHotelId);
        toast.success("Basic info updated!");
      } else {
        const snap = await getDocs(collection(db, "hotels"));
        const duplicate = snap.docs.some(d => {
          const h = d.data();
          return h.name?.trim().toLowerCase() === hotelName.trim().toLowerCase() &&
            h.city?.toLowerCase() === selectedCity.name.toLowerCase() &&
            h.state?.toLowerCase() === selectedState.toLowerCase();
        });
        if (duplicate) { toast.error(`Hotel "${hotelName}" already exists in this city.`); return; }

        const ref = await addDoc(collection(db, "hotels"), { ...payload, rooms: [] });
        setSavedHotelId(ref.id);

        // Update city hotelIds
        const stateDoc = states.find(s => s.name === selectedState);
        const citySnap = await getDoc(doc(db, "locations", stateDoc.id));
        const cityList = citySnap.data().cities.map(c =>
          c.name.toLowerCase() === selectedCity.name.toLowerCase()
            ? { ...c, hotelIds: [...(c.hotelIds || []), ref.id] }
            : c
        );
        await updateDoc(doc(db, "locations", stateDoc.id), { cities: cityList });
        toast.success("Hotel created! Now add room categories.");
      }
      setHotelSaved(true);
    } catch {
      toast.error("Error saving hotel");
    } finally {
      setIsCreatingHotel(false);
    }
  };

  // ─── Room Handlers ─────────────────────────────────────────────────────
  const addRoomCategory = () => {
    const sourceRoom = rooms.find(r => r.seasons?.length > 0) || null;
    setRooms(prev => [emptyRoom(sourceRoom), ...prev]);
  };

  const removeRoomCategory = (roomIndex) => {
    setRooms(prev => prev.filter((_, i) => i !== roomIndex));
  };

  const handleRoomChange = (roomIndex, key, value) => {
    setRooms(prev => {
      const next = [...prev];
      next[roomIndex] = { ...next[roomIndex], [key]: value };
      return next;
    });
  };

  const addSeasonToRoom = (roomIndex) => {
    const newSeason = { name: "", start: "", end: "", priority: null, pricing: emptyPricing() };
    setRooms(prev => {
      const next = [...prev];
      next[roomIndex] = { ...next[roomIndex], seasons: [...(next[roomIndex].seasons || []), newSeason] };
      return next;
    });
  };

  const removeSeasonFromRoom = (roomIndex, seasonIndex) => {
    setRooms(prev => {
      const next = [...prev];
      next[roomIndex] = { ...next[roomIndex], seasons: next[roomIndex].seasons.filter((_, i) => i !== seasonIndex) };
      return next;
    });
  };

  const handleSeasonChange = (roomIndex, seasonIndex, key, value) => {
    setRooms(prev => {
      const next = [...prev];
      const seasons = [...next[roomIndex].seasons];
      const s = { ...seasons[seasonIndex] };

      if (key === "__pricing") {
        const { plan, type, val: v2 = value } = value;
        const num = value.value === "" ? 0 : Number(value.value);
        if (num < 0) return prev;
        s.pricing = {
          ...s.pricing,
          [plan]: { ...(s.pricing?.[plan] || {}), [type]: num },
        };
      } else if (key === "__addPlan") {
        s.pricing = { ...s.pricing, [value]: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 } };
      } else if (key === "__removePlan") {
        const p = { ...s.pricing };
        delete p[value];
        s.pricing = p;
      } else {
        s[key] = value;
      }

      seasons[seasonIndex] = s;
      next[roomIndex] = { ...next[roomIndex], seasons };
      return next;
    });
  };

  const openCloneModal = (roomIndex, seasonIndex) => {
    setCloneContext({ roomIndex, seasonIndex });
    setCloneForm({ name: "", start: "", end: "" });
    setShowCloneModal(true);
  };

  const handleCloneConfirm = () => {
    const { roomIndex, seasonIndex } = cloneContext;
    const { name, start, end } = cloneForm;
    if (!name || !start || !end) { toast.error("Fill all clone fields"); return; }

    const room = rooms[roomIndex];
    const overlap = room.seasons.filter((s, i) => {
      if (i === seasonIndex) return false;
      if (s.name === name) return false;
      return rangesOverlap(start, end, s.start, s.end);
    });
    if (overlap.length > 0) {
      toast.error(`Cloned dates overlap: ${overlap.map(s => `"${s.name || "Season"}"`).join(", ")}`);
      return;
    }

    const sourceSeason = room.seasons[seasonIndex];
    const exists = room.seasons.some((s, i) => i !== seasonIndex && s.name === name);
    if (exists) {
      setPendingClone({ roomIndex, seasonIndex });
      setShowOverwriteConfirm(true);
      return;
    }

    const cloned = { name, start, end, priority: null, pricing: JSON.parse(JSON.stringify(sourceSeason.pricing)) };
    setRooms(prev => {
      const next = [...prev];
      next[roomIndex] = { ...next[roomIndex], seasons: [...next[roomIndex].seasons, cloned] };
      return next;
    });
    toast.success("Season cloned");
    setShowCloneModal(false);
  };

  // Save all rooms to Firestore
  const handleSaveRooms = async () => {
    if (!savedHotelId) { toast.error("Save basic info first"); return; }

    // Validate
    for (const room of rooms) {
      if (!room.categoryName?.trim()) { toast.error("All rooms need a category name"); return; }
      const priorities = (room.seasons || []).map(s => s.priority).filter(Boolean);
      if (new Set(priorities).size !== priorities.length) { toast.error("Duplicate priorities in a room's seasons"); return; }
    }

    const anyConflict = rooms.some(r => roomHasUnresolvedConflict(r.seasons));
    if (anyConflict) { toast.error("Resolve all date conflicts before saving"); return; }

    setIsSaving(true);
    try {
      if (editMode) {
        const normalized = { name: hotelName, city: selectedCity?.name || "", state: selectedState, rating: hotelRating, GoogleReviewRating, GoogleListingURL, TripAdvisorRating, TripAdvisorURL, address: hotelAddress, phone: hotelPhone, rooms };
        const validation = validateHotelData(normalized);
        if (!validation.isValid) { validation.errors.forEach(e => toast.error(e)); return; }
        const success = await updateHotelComplete(savedHotelId, normalized);
        if (success) toast.success("Hotel saved successfully!");
      } else {
        await updateDoc(doc(db, "hotels", savedHotelId), { rooms });
        toast.success("Rooms saved successfully!");
      }
    } catch {
      toast.error("Failed to save rooms");
    } finally {
      setIsSaving(false);
    }
  };

  const anyConflict = rooms.some(r => roomHasUnresolvedConflict(r.seasons));

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-theme-primary/10 rounded-lg">
                <Hotel className="h-4 w-4 text-theme-primary" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-sm leading-none">
                  {editMode ? "Edit Property" : "Register Property"}
                </h1>
                <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                  {editMode ? `Editing ID: ${editHotelId?.slice(0, 8)}...` : "Add a new accommodation"}
                </p>
              </div>
            </div>
          </div>
          <StepIndicator current={currentStep} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4  min-h-80 sm:px-6 py-8 space-y-6">

        {/* ── STEP 1: Basic Info ──────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border  border-slate-100 shadow-sm overflow-hidden ${hotelSaved && !editMode ? "opacity-60 pointer-events-none select-none" : ""}`}>
          <div className="flex items-center gap-3  px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="p-1.5 bg-theme-primary/10 rounded-lg">
              <Building2 className="h-4 w-4 text-theme-primary" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Property Details</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Location */}
            <div className="grid min-h-30 grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">State / Region</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedState}
                    onChange={e => { setSelectedState(e.target.value); setSelectedCity(null); setCityInput(""); setCityConfirmed(false); setPendingNewCity(null); }}
                    className={`${inputCls} pl-10`}
                  >
                    <option value="">Select state</option>
                    {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedState && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">City</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      value={cityInput}
                      onChange={e => { setCityInput(e.target.value); setPendingNewCity(null); setCityConfirmed(false); }}
                      placeholder="Start typing city name..."
                      className={`${inputCls} pl-10`}
                    />
                    {cityInput && filteredCities.length > 0 && (
                      <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                        {filteredCities.map((item, i) => (
                          <div key={i} onClick={() => handleSelectCity(item)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center border-b border-slate-50 last:border-0">
                            {item === "Other" ? (
                              <span className="text-theme-primary flex items-center gap-2 font-medium"><Plus className="h-4 w-4" /> Add "{cityInput.trim()}"</span>
                            ) : item.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingNewCity && (
                      <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-800 flex-1">Add <span className="font-semibold">"{pendingNewCity}"</span> to {selectedState}?</p>
                        <button onClick={confirmAddCity} disabled={isAddingCity} className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-60">
                          {isAddingCity ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</> : <><Check className="h-3.5 w-3.5" /> Confirm</>}
                        </button>
                        <button onClick={() => setPendingNewCity(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                      </div>
                    )}
                    {cityConfirmed && selectedCity && (
                      <div className="mt-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                          <Check className="h-3 w-3" /> {selectedCity.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {cityConfirmed && (
              <div className="pt-4 border-t border-slate-100 space-y-5 animate-in slide-in-from-top duration-200">
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Hotel Name */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Hotel Name</label>
                    <p className="text-[10px] text-slate-400 mb-1.5">Start typing to get TripAdvisor suggestions</p>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        value={hotelName}
                        onChange={e => handleHotelNameChange(e.target.value)}
                        onFocus={() => hotelName.length >= 2 && setShowTaSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTaSuggestions(false), 200)}
                        placeholder="e.g. Taj Lake Palace"
                        className={`${inputCls} pl-10 pr-10`}
                      />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-primary animate-spin" />}
                      {showTaSuggestions && suggestions.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-theme-primary" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">TripAdvisor Suggestions</span>
                          </div>
                          {suggestions.map(s => (
                            <div key={s.location_id} onMouseDown={() => handleSelectTASuggestion(s)} className="px-4 py-3 hover:bg-theme-primary/5 cursor-pointer border-b border-slate-50 last:border-0">
                              <div className="font-medium text-sm text-slate-800">{s.name}</div>
                              {s.address_obj && <div className="text-xs text-slate-400 mt-0.5">{[s.address_obj.city, s.address_obj.state].filter(Boolean).join(", ")}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Star Rating</label>
                    <select value={hotelRating} onChange={e => setHotelRating(e.target.value)} className={inputCls}>
                      <option value="">Select rating</option>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={`${n}-star`}>{n} Star {"★".repeat(n)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Hotel Address</label>
                    <input value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} className={inputCls} placeholder="Auto-filled from TripAdvisor" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Contact Number</label>
                    <input value={hotelPhone} onChange={e => setHotelPhone(e.target.value)} className={inputCls} placeholder="Auto-filled from TripAdvisor" />
                  </div>
                </div>

                {/* Ratings & Links */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Google */}
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[10px] font-black text-blue-600">G</div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Google</span>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Google Rating</label>
                      <div className="relative">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" fill="currentColor" />
                        <input type="number" step="0.1" min="0" max="5" value={GoogleReviewRating ?? ""} onChange={e => setGoogleReviewRating(e.target.value)} placeholder="4.5" className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Google Maps URL</label>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input value={GoogleListingURL ?? ""} onChange={e => setGoogleListingURL(e.target.value)} placeholder="https://goo.gl/maps/..." className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                  </div>

                  {/* TripAdvisor */}
                  <div className="space-y-3 p-4 rounded-xl bg-green-50/40 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-green-100 text-[10px] font-black text-green-600">T</div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">TripAdvisor</span>
                      {TripAdvisorRating && (
                        <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 ml-auto gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Auto-filled
                        </Badge>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">TripAdvisor Rating</label>
                      <div className="relative">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" fill="currentColor" />
                        <input type="number" step="0.1" min="0" max="5" value={TripAdvisorRating ?? ""} onChange={e => setTripAdvisorRating(e.target.value)} placeholder="4.5" className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">TripAdvisor URL</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input value={TripAdvisorURL ?? ""} onChange={e => setTripAdvisorURL(e.target.value)} placeholder="https://tripadvisor.com/..." className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveBasicInfo}
                  disabled={isCreatingHotel}
                  className="w-full h-11 bg-theme-primary hover:bg-theme-primary/90 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCreatingHotel ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {editMode ? "Updating..." : "Creating..."}</>
                  ) : editMode ? "Update Basic Info" : "Save & Continue to Rooms →"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP 2: Rooms & Seasons ──────────────────────────────────────── */}
        {hotelSaved && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-theme-primary/10 rounded-lg">
                  <BedDouble className="h-4 w-4 text-theme-primary" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Room Categories & Pricing</h3>
              </div>
              <button
                onClick={addRoomCategory}
                className="flex items-center gap-1.5 text-sm font-semibold text-theme-primary border border-theme-primary/30 bg-theme-primary/5 hover:bg-theme-primary/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Category
              </button>
            </div>

            <div className="p-6 space-y-4">
              {anyConflict && (
                <Alert variant="destructive" className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-medium">Overlapping seasons detected. Assign unique priorities to resolve before saving.</AlertDescription>
                </Alert>
              )}

              {rooms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
                    <BedDouble className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No room categories yet</p>
                  <p className="text-slate-400 text-sm mt-1">Click "+ Add Category" to get started</p>
                </div>
              ) : (
                rooms.map((room, roomIndex) => (
                  <RoomCard
                    key={roomIndex}
                    room={room}
                    roomIndex={roomIndex}
                    onRoomChange={handleRoomChange}
                    onRemoveRoom={removeRoomCategory}
                    onSeasonChange={handleSeasonChange}
                    onAddSeason={addSeasonToRoom}
                    onRemoveSeason={removeSeasonFromRoom}
                    onCloneSeason={openCloneModal}
                  />
                ))
              )}

              {rooms.length > 0 && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveRooms}
                    disabled={isSaving || anyConflict}
                    className="flex-1 h-11 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Check className="h-4 w-4" /> Save All Rooms</>}
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="h-11 px-8 border-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-all"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Clone Modal ────────────────────────────────────────────────────── */}
      {showCloneModal && cloneContext && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">Clone Season Rates</CardTitle>
              <p className="text-sm text-slate-500">
                Rates copied from <span className="font-semibold">{rooms[cloneContext.roomIndex]?.seasons[cloneContext.seasonIndex]?.name || "Unnamed Season"}</span>.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">New Season Name</label>
                <Input placeholder="e.g. Peak Season 2026" value={cloneForm.name} onChange={e => setCloneForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Date</label>
                <Input type="date" value={cloneForm.start} onChange={e => setCloneForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">End Date</label>
                <Input type="date" value={cloneForm.end} onChange={e => setCloneForm(f => ({ ...f, end: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCloneModal(false)}>Cancel</Button>
                <Button onClick={handleCloneConfirm} className="bg-theme-primary text-white">Clone</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Overwrite Confirm ──────────────────────────────────────────────── */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Overwrite Season?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                A season named <span className="font-medium">"{cloneForm.name}"</span> already exists. Overwrite its rates?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowOverwriteConfirm(false); setPendingClone(null); }}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  const { roomIndex, seasonIndex } = pendingClone;
                  setRooms(prev => {
                    const next = [...prev];
                    const source = next[roomIndex].seasons[seasonIndex];
                    next[roomIndex] = {
                      ...next[roomIndex],
                      seasons: next[roomIndex].seasons.map(s =>
                        s.name === cloneForm.name
                          ? { ...s, start: cloneForm.start, end: cloneForm.end, priority: null, pricing: JSON.parse(JSON.stringify(source.pricing)) }
                          : s
                      ),
                    };
                    return next;
                  });
                  toast.success("Season overwritten");
                  setShowOverwriteConfirm(false);
                  setShowCloneModal(false);
                  setCloneForm({ name: "", start: "", end: "" });
                }}>Overwrite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function HotelFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
      <HotelFormPageInner />
    </Suspense>
  );
}