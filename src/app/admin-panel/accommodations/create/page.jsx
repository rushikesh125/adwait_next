"use client";
import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import {
  X,
  MapPin,
  Hotel,
  Calendar,
  BedDouble,
  Plus,
  Check,
  ChevronRight,
  Star,
  ExternalLink,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Building2,
  Sparkles,
  Globe,
  Navigation,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast, { Toaster } from "react-hot-toast";

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

const getSeasonOverlaps = (seasons) => {
  const conflicts = new Map();
  for (let i = 0; i < seasons.length; i++) {
    for (let j = i + 1; j < seasons.length; j++) {
      const a = seasons[i];
      const b = seasons[j];
      if (!a || !b) continue;
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        if (!conflicts.has(i)) conflicts.set(i, new Set());
        if (!conflicts.has(j)) conflicts.set(j, new Set());
        conflicts.get(i).add(b.name || `Season ${j + 1}`);
        conflicts.get(j).add(a.name || `Season ${i + 1}`);
      }
    }
  }
  const result = new Map();
  conflicts.forEach((names, idx) => result.set(idx, Array.from(names)));
  return result;
};
// ──────────────────────────────────────────────────────────────────────────

// Step indicator component
const StepIndicator = ({ current }) => {
  const steps = [
    { id: 1, label: "Basic Info", icon: Building2 },
    { id: 2, label: "Seasons", icon: Calendar },
    { id: 3, label: "Rooms", icon: BedDouble },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = current === step.id;
        const isDone = current > step.id;
        return (
          <React.Fragment key={step.id}>
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? "bg-theme-primary text-white shadow-md"
                  : isDone
                    ? "text-green-600"
                    : "text-slate-400"
              }`}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-xs font-bold hidden sm:block">
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 mx-1 transition-all ${isDone ? "bg-green-400" : "bg-slate-200"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Section wrapper
const Section = ({ title, icon: Icon, children, className = "" }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}
  >
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
      <div className="p-1.5 bg-theme-primary/10 rounded-lg">
        <Icon className="h-4 w-4 text-theme-primary" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// Field wrapper
const Field = ({ label, children, hint }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const inputCls =
  "w-full h-11 border border-slate-200 rounded-xl px-4 bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none text-sm text-slate-800 placeholder:text-slate-400 transition-all";
const selectCls = `${inputCls} cursor-pointer`;

// ─── TripAdvisor Search Hook ───────────────────────────────────────────────
const useTripAdvisorSearch = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const search = async (query, city, state) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);

    try {
      const location = [city, state].filter(Boolean).join(", ");
      const searchQuery = location ? `${query} ${location}` : query;

      const res = await fetch(
        `/api/tripadvisor/search?query=${encodeURIComponent(searchQuery)}`,
      );

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
      const res = await fetch(
        `/api/tripadvisor/details?locationId=${locationId}`,
      );

      return await res.json();
    } catch (err) {
      console.error("TripAdvisor details error:", err);
      return null;
    }
  };

  return { suggestions, searching, search, fetchDetails, setSuggestions };
};
// ──────────────────────────────────────────────────────────────────────────

function AddHotelPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editHotelId = searchParams.get("id");
  const editMode = !!editHotelId;

  // Basic info state
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

  const [hotelCreated, setHotelCreated] = useState(false);
  const [createdHotelId, setCreatedHotelId] = useState(null);

  const [isCreatingHotel, setIsCreatingHotel] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  // TripAdvisor
  const {
    suggestions,
    searching,
    search: taSearch,
    fetchDetails,
    setSuggestions,
  } = useTripAdvisorSearch();
  const [showTaSuggestions, setShowTaSuggestions] = useState(false);
  const [taSearchTimeout, setTaSearchTimeout] = useState(null);

  // Seasons
  const [seasonCount, setSeasonCount] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);
  const [tempSeason, setTempSeason] = useState({
    name: "",
    start: "",
    end: "",
    priority: "",
  });
  const [isAddingExtraSeason, setIsAddingExtraSeason] = useState(false);

  // Rooms
  const [roomCategories, setRoomCategories] = useState([]);
  const [currentCategoryName, setCurrentCategoryName] = useState("");
  const [currentPricing, setCurrentPricing] = useState([]);

  // Current step for the step indicator
  const currentStep = !hotelCreated ? 1 : seasons.length === 0 ? 2 : 3;

  const assignedPriorities = useMemo(() => {
    return seasons
      .filter((s, i) => s && !isAddingExtraSeason && i !== currentSeasonIndex)
      .map((s) => Number(s.priority))
      .filter((p) => !isNaN(p));
  }, [seasons, currentSeasonIndex, isAddingExtraSeason]);

  const priorityOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Fetch states
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error("Failed to load states");
      }
    };
    fetchStates();
  }, []);

  // Load hotel in edit mode
  useEffect(() => {
    if (!editMode) return;
    const loadHotel = async () => {
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
        setSelectedState(data.state || "");
        setCityInput(data.city || "");
        setSelectedCity({ name: data.city });
        setCityConfirmed(true);
        setHotelCreated(true);
        setCreatedHotelId(editHotelId);

        if (data.rooms?.length > 0) {
          setRoomCategories(data.rooms);
          setCurrentPricing(
            data.rooms[data.rooms.length - 1]?.seasons?.map((s) => ({
              ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
              cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
              map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
              ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
              ...s.pricing,
            })) || [],
          );
          setSeasons(
            data.rooms[data.rooms.length - 1]?.seasons?.map((s) => ({
              name: s.name,
              start: s.start,
              end: s.end,
              priority: s.priority || "",
            })) || [],
          );
          setSeasonCount(
            data.rooms[data.rooms.length - 1]?.seasons?.length || 0,
          );
          setCurrentSeasonIndex(
            data.rooms[data.rooms.length - 1]?.seasons?.length || 0,
          );
        }
      } catch (err) {
        toast.error("Failed to load hotel data");
      }
    };
    loadHotel();
  }, [editMode, editHotelId]);

  // Fetch cities when state changes
  useEffect(() => {
    if (!selectedState) return;
    const stateDoc = states.find((s) => s.name === selectedState);
    if (!stateDoc) return;
    const fetchCities = async () => {
      try {
        const snap = await getDoc(doc(db, "locations", stateDoc.id));
        if (snap.exists()) setCities(snap.data().cities || []);
      } catch (err) {
        toast.error("Failed to load cities");
      }
    };
    fetchCities();
  }, [selectedState, states]);

  // Filter cities
  useEffect(() => {
    if (!cityInput.trim()) {
      setFilteredCities([]);
      return;
    }
    const lower = cityInput.toLowerCase();
    const matches = cities.filter((c) => c.name.toLowerCase().includes(lower));
    const exact = cities.some((c) => c.name.toLowerCase() === lower);
    const list = [...matches];
    if (!exact) list.push("Other");
    setFilteredCities(list);
  }, [cityInput, cities]);

  // TripAdvisor hotel name search with debounce
  const handleHotelNameChange = (val) => {
    setHotelName(val);
    if (taSearchTimeout) clearTimeout(taSearchTimeout);
    if (val.length >= 2) {
      setShowTaSuggestions(true);
      const t = setTimeout(() => {
        taSearch(val, selectedCity?.name, selectedState);
      }, 500);
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
  // Existing
  if (details.rating) setTripAdvisorRating(details.rating);
  if (details.web_url) setTripAdvisorURL(details.web_url);

  // ✅ Address
  if (details.address_obj) {
    const fullAddress = [
      details.address_obj.street1,
      details.address_obj.city,
      details.address_obj.state,
      details.address_obj.country,
    ]
      .filter(Boolean)
      .join(", ");

    setHotelAddress(fullAddress);
  }

  // ✅ Phone (fallback applied HERE)
  setHotelPhone(details.phone || "Not Available");

  // Existing star mapping
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
      if (cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        toast.error(`City "${name}" already exists.`);
        return;
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
      const stateDoc = states.find((s) => s.name === selectedState);
      const newCity = { name: pendingNewCity, hotelIds: [] };
      await updateDoc(doc(db, "locations", stateDoc.id), {
        cities: arrayUnion(newCity),
      });
      setSelectedCity(newCity);
      setCityInput(pendingNewCity);
      setCityConfirmed(true);
      setPendingNewCity(null);
      toast.success(`City "${pendingNewCity}" added to ${selectedState}`);
    } catch (err) {
      toast.error("Failed to add city");
    } finally {
      setIsAddingCity(false);
    }
  };

  const createOrUpdateHotel = async () => {
    if (!hotelName.trim() || !hotelRating || !selectedCity || !selectedState) {
      toast.error("Please fill hotel name, rating, state & city.");
      return;
    }
    if ((!GoogleReviewRating || !GoogleListingURL) && !doneOnes) {
      toast("Best practice: add Google rating & listing link before saving.", {
        icon: "💡",
        duration: 4000,
      });
      setDoneOnes(true);
      return;
    }
    setIsCreatingHotel(true);
    try {
      let hotelId = createdHotelId;
      if (!editMode) {
        const snap = await getDocs(collection(db, "hotels"));
        const duplicate = snap.docs.some((d) => {
          const h = d.data();
          return (
            h.name?.trim().toLowerCase() === hotelName.trim().toLowerCase() &&
            h.city?.toLowerCase() === selectedCity.name.toLowerCase() &&
            h.state?.toLowerCase() === selectedState.toLowerCase()
          );
        });
        if (duplicate) {
          toast.error(`Hotel "${hotelName}" already exists in this city.`);
          return;
        }
        const ref = await addDoc(collection(db, "hotels"), {
          name: hotelName.trim(),
          rating: hotelRating,
          GoogleReviewRating: GoogleReviewRating || null,
          GoogleListingURL: GoogleListingURL || null,
          TripAdvisorRating: TripAdvisorRating || null,
          TripAdvisorURL: TripAdvisorURL || null,
          address: hotelAddress || null,
          phone: hotelPhone || null,
          state: selectedState,
          city: selectedCity.name,
          rooms: [],
        });
        hotelId = ref.id;
        setCreatedHotelId(hotelId);
        setHotelCreated(true);
        const stateDoc = states.find((s) => s.name === selectedState);
        const citySnap = await getDoc(doc(db, "locations", stateDoc.id));
        const cityList = citySnap
          .data()
          .cities.map((c) =>
            c.name.toLowerCase() === selectedCity.name.toLowerCase()
              ? { ...c, hotelIds: [...(c.hotelIds || []), hotelId] }
              : c,
          );
        await updateDoc(doc(db, "locations", stateDoc.id), {
          cities: cityList,
        });
        toast.success("Hotel created! Now define pricing seasons.");
      } else {
        await updateDoc(doc(db, "hotels", editHotelId), {
          name: hotelName.trim(),
          rating: hotelRating,
          GoogleReviewRating: GoogleReviewRating || null,
          GoogleListingURL: GoogleListingURL || null,
          TripAdvisorRating: TripAdvisorRating || null,
          TripAdvisorURL: TripAdvisorURL || null,
        });
        toast.success("Hotel updated!");
        setHotelCreated(true);
      }
    } catch (err) {
      toast.error("Error saving hotel");
    } finally {
      setIsCreatingHotel(false);
    }
  };

  const handlePricingChange = (seasonIdx, plan, type, value) => {
    const num = value === "" ? 0 : Number(value);
    if (num < 0) {
      toast.error("Price cannot be negative");
      return;
    }
    setCurrentPricing((prev) => {
      const copy = [...prev];
      if (!copy[seasonIdx]) copy[seasonIdx] = {};
      if (!copy[seasonIdx][plan]) copy[seasonIdx][plan] = {};
      copy[seasonIdx][plan][type] = num;
      return copy;
    });
  };

  const saveRoomCategory = async () => {
    if (!currentCategoryName.trim()) {
      toast.error("Please enter room category name");
      return;
    }
    const hasPrice = currentPricing.some(
      (s) =>
        s &&
        ["ep", "cp", "map", "ap"].some(
          (p) => s[p] && Object.values(s[p]).some((v) => v > 0),
        ),
    );
    if (!hasPrice) {
      toast.error("Please set at least one positive price");
      return;
    }
    const definedSeasons = seasons.filter(Boolean);
    const newRoom = {
      categoryName: currentCategoryName.trim(),
      seasons: definedSeasons.map((s, i) => ({
        name: s.name,
        start: s.start,
        end: s.end,
        priority: s.priority || "",
        pricing: {
          ep: {
            double: 0,
            extraAdult: 0,
            extraChild: 0,
            cnb: 0,
            ...(currentPricing[i]?.ep || {}),
          },
          cp: {
            double: 0,
            extraAdult: 0,
            extraChild: 0,
            cnb: 0,
            ...(currentPricing[i]?.cp || {}),
          },
          map: {
            double: 0,
            extraAdult: 0,
            extraChild: 0,
            cnb: 0,
            ...(currentPricing[i]?.map || {}),
          },
          ap: {
            double: 0,
            extraAdult: 0,
            extraChild: 0,
            cnb: 0,
            ...(currentPricing[i]?.ap || {}),
          },
        },
      })),
    };
    setIsSavingRoom(true);
    try {
      await updateDoc(doc(db, "hotels", createdHotelId), {
        rooms: arrayUnion(newRoom),
      });
      setRoomCategories((prev) => [...prev, newRoom]);
      setCurrentCategoryName("");
      toast.success("Room category saved ✓");
    } catch (err) {
      toast.error("Failed to save room category");
    } finally {
      setIsSavingRoom(false);
    }
  };

  const resetForNewCategory = () => {
    setCurrentCategoryName("");
    setCurrentPricing(
      seasons.filter(Boolean).map(() => ({
        ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      })),
    );
  };

  const seasonOverlapMap = getSeasonOverlaps(seasons);
  const getTempSeasonConflicts = () => {
    if (!tempSeason.start || !tempSeason.end) return [];
    return seasons
      .map((s, i) => {
        if (!s) return null;
        if (!isAddingExtraSeason && i === currentSeasonIndex) return null;
        if (rangesOverlap(tempSeason.start, tempSeason.end, s.start, s.end))
          return s.name || `Season ${i + 1}`;
        return null;
      })
      .filter(Boolean);
  };
  const tempSeasonConflicts = getTempSeasonConflicts();
  const tempHasConflict = tempSeasonConflicts.length > 0;
  const definedSeasons = seasons.filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
            >
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
                  {editMode
                    ? `Editing ID: ${editHotelId?.slice(0, 8)}...`
                    : "Add a new accommodation"}
                </p>
              </div>
            </div>
          </div>
          <StepIndicator current={currentStep} />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── SECTION 1: Location & Basic Info ── */}
        <Section title="Property Details" icon={Building2}>
          <div
            className={`space-y-6 ${hotelCreated ? "opacity-50 pointer-events-none select-none" : ""}`}
          >
            {/* Location Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-h-40">
              <Field label="State / Region">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedCity(null);
                      setCityInput("");
                      setCityConfirmed(false);
                      setPendingNewCity(null);
                    }}
                    className={`${selectCls} pl-10`}
                  >
                    <option value="">Select state</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {selectedState && (
                <Field label="City">
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      value={cityInput}
                      onChange={(e) => {
                        setCityInput(e.target.value);
                        setPendingNewCity(null);
                        setCityConfirmed(false);
                      }}
                      placeholder="Start typing city name..."
                      className={`${inputCls} pl-10`}
                    />
                    {cityInput && filteredCities.length > 0 && (
                      <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto">
                        {filteredCities.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectCity(item)}
                            className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm flex justify-between items-center border-b border-slate-50 last:border-0"
                          >
                            {item === "Other" ? (
                              <span className="text-theme-primary flex items-center gap-2 font-medium">
                                <Plus className="h-4 w-4" /> Add "
                                {cityInput.trim()}"
                              </span>
                            ) : (
                              item.name
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingNewCity && (
                      <div className="mt-2 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-800 flex-1">
                          Add{" "}
                          <span className="font-semibold">
                            "{pendingNewCity}"
                          </span>{" "}
                          to {selectedState}?
                        </p>
                        <button
                          onClick={confirmAddCity}
                          disabled={isAddingCity}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-60"
                        >
                          {isAddingCity ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                              Adding...
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" /> Confirm
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setPendingNewCity(null)}
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {cityConfirmed && selectedCity && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 gap-1"
                        >
                          <Check className="h-3 w-3" /> {selectedCity.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Field>
              )}
            </div>

            {/* Hotel details — shown when city confirmed */}
            {cityConfirmed && (
              <div className="pt-5 border-t border-slate-100 space-y-5 animate-in slide-in-from-top duration-200">
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Hotel Name with TripAdvisor autocomplete */}
                  <Field
                    label="Hotel Name"
                    hint="Start typing to get TripAdvisor suggestions"
                  >
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        value={hotelName}
                        onChange={(e) => handleHotelNameChange(e.target.value)}
                        onFocus={() =>
                          hotelName.length >= 2 && setShowTaSuggestions(true)
                        }
                        onBlur={() =>
                          setTimeout(() => setShowTaSuggestions(false), 200)
                        }
                        placeholder="e.g. Taj Lake Palace"
                        className={`${inputCls} pl-10 pr-10`}
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-primary animate-spin" />
                      )}
                      {showTaSuggestions && suggestions.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-theme-primary" />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              TripAdvisor Suggestions
                            </span>
                          </div>
                          {suggestions.map((s) => (
                            <div
                              key={s.location_id}
                              onMouseDown={() => handleSelectTASuggestion(s)}
                              className="px-4 py-3 hover:bg-theme-primary/5 cursor-pointer border-b border-slate-50 last:border-0"
                            >
                              <div className="font-medium text-sm text-slate-800">
                                {s.name}
                              </div>
                              {s.address_obj && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {[s.address_obj.city, s.address_obj.state]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>

                  <Field label="Star Rating">
                    <select
                      value={hotelRating}
                      onChange={(e) => setHotelRating(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Select rating</option>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={`${n}-star`}>
                          {n} Star {"★".repeat(n)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Hotel Address">
                    <input value={hotelAddress} readOnly className={inputCls} />
                  </Field>

                  <Field label="Contact Number">
                    <input value={hotelPhone} readOnly className={inputCls} />
                  </Field>
                </div>

                {/* Ratings & Links Row */}
                <div className="grid md:grid-cols-2 gap-5">
                  {/* Google block */}
                  <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 text-[10px] font-black text-blue-600">
                        G
                      </div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Google
                      </span>
                    </div>
                    <Field label="Google Rating">
                      <div className="relative">
                        <Star
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none"
                          fill="currentColor"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={GoogleReviewRating ?? ""}
                          onChange={(e) =>
                            setGoogleReviewRating(e.target.value)
                          }
                          placeholder="4.5"
                          className={`${inputCls} pl-10`}
                        />
                      </div>
                    </Field>
                    <Field label="Google Maps URL">
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          value={GoogleListingURL ?? ""}
                          onChange={(e) => setGoogleListingURL(e.target.value)}
                          placeholder="https://goo.gl/maps/..."
                          className={`${inputCls} pl-10`}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* TripAdvisor block */}
                  <div className="space-y-3 p-4 rounded-xl bg-green-50/40 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-green-100 text-[10px] font-black text-green-600">
                        T
                      </div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        TripAdvisor
                      </span>
                      {TripAdvisorRating && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-green-50 text-green-700 border-green-200 ml-auto gap-1"
                        >
                          <Sparkles className="h-2.5 w-2.5" /> Auto-filled
                        </Badge>
                      )}
                    </div>
                    <Field label="TripAdvisor Rating">
                      <div className="relative">
                        <Star
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none"
                          fill="currentColor"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={TripAdvisorRating ?? ""}
                          onChange={(e) => setTripAdvisorRating(e.target.value)}
                          placeholder="4.5"
                          className={`${inputCls} pl-10`}
                        />
                      </div>
                    </Field>
                    <Field label="TripAdvisor URL">
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          value={TripAdvisorURL ?? ""}
                          onChange={(e) => setTripAdvisorURL(e.target.value)}
                          placeholder="https://tripadvisor.com/..."
                          className={`${inputCls} pl-10`}
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                <button
                  onClick={createOrUpdateHotel}
                  disabled={isCreatingHotel}
                  className="w-full h-12 bg-theme-primary hover:bg-theme-primary/90 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCreatingHotel ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                      {editMode ? "Updating..." : "Creating..."}
                    </>
                  ) : editMode ? (
                    "Update Hotel Details"
                  ) : (
                    "Create Hotel & Continue →"
                  )}
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* ── SECTION 2: Seasons ── */}
        {hotelCreated && seasons.length === 0 && (
          <Section title="Pricing Seasons" icon={Calendar}>
            <div className="text-center py-6 space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-theme-primary/10 mb-2">
                <Calendar className="h-7 w-7 text-theme-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Define Pricing Seasons
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  How many different price periods does this property have?
                </p>
              </div>
              <div className="flex justify-center items-center gap-3 pt-2">
                <input
                  type="number"
                  min="1"
                  value={seasonCount}
                  onChange={(e) => setSeasonCount(Number(e.target.value))}
                  className="w-20 h-11 text-center border border-slate-200 rounded-xl font-bold text-slate-800 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                />
                <button
                  onClick={() => {
                    if (seasonCount < 1) return;
                    setSeasons(new Array(seasonCount).fill(null));
                    setCurrentSeasonIndex(0);
                    setCurrentPricing(
                      new Array(seasonCount).fill(null).map(() => ({})),
                    );
                  }}
                  className="px-8 h-11 bg-theme-primary hover:bg-theme-primary/90 text-white rounded-xl font-semibold shadow-md transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* Season table */}
        {seasons.length > 0 && (
          <Section title="Pricing Seasons" icon={Calendar}>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {seasons.filter(Boolean).length} season
                  {seasons.filter(Boolean).length !== 1 ? "s" : ""} defined
                </Badge>
                <button
                  onClick={() => setIsAddingExtraSeason(true)}
                  className="flex items-center gap-1.5 text-sm text-theme-primary font-semibold hover:underline"
                >
                  <Plus className="h-4 w-4" /> Add season
                </button>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-5 py-3 text-left font-semibold">
                        Season
                      </th>
                      <th className="px-5 py-3 text-left font-semibold">
                        From
                      </th>
                      <th className="px-5 py-3 text-left font-semibold">To</th>
                      <th className="px-5 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {seasons.map((s, i) => {
                      if (!s) return null;
                      const conflicts = seasonOverlapMap.get(i);
                      const hasConflict =
                        !!conflicts && conflicts.length > 0 && !s.priority;
                      return (
                        <tr
                          key={i}
                          className={`transition-colors ${hasConflict ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-5 py-3.5 font-semibold text-slate-800">
                            {s.name}
                            {s.priority && (
                              <span className="ml-2 text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600">
                                P{s.priority}
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-5 py-3.5 ${hasConflict ? "text-red-600" : "text-slate-500"}`}
                          >
                            {s.start}
                          </td>
                          <td
                            className={`px-5 py-3.5 ${hasConflict ? "text-red-600" : "text-slate-500"}`}
                          >
                            {s.end}
                          </td>
                          <td className="px-5 py-3.5">
                            {hasConflict ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                <AlertTriangle className="h-3 w-3" /> Overlaps:{" "}
                                {conflicts.join(", ")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                <Check className="h-3 w-3" /> OK
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-3">
                            <button
                              onClick={() => {
                                setTempSeason(s);
                                setCurrentSeasonIndex(i);
                              }}
                              className="text-xs font-semibold text-theme-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSeasons((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                );
                                setCurrentPricing((prev) =>
                                  prev.filter((_, idx) => idx !== i),
                                );
                              }}
                              className="text-xs font-semibold text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        {/* Season editor */}
        {(currentSeasonIndex < seasons.length || isAddingExtraSeason) && (
          <div
            className={`p-6 rounded-2xl border-2 space-y-5 transition-all ${
              tempHasConflict && !tempSeason.priority
                ? "bg-red-50 border-red-200"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <h4 className="font-bold flex items-center gap-2 text-slate-800">
              <Calendar
                className={`h-5 w-5 ${tempHasConflict && !tempSeason.priority ? "text-red-500" : "text-theme-primary"}`}
              />
              {isAddingExtraSeason
                ? "New Season"
                : `Season ${currentSeasonIndex + 1}`}
              {tempHasConflict && !tempSeason.priority && (
                <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Date conflict
                </span>
              )}
            </h4>
            <div
              className={`grid gap-4 ${tempHasConflict || tempSeason.priority ? "md:grid-cols-4" : "md:grid-cols-3"}`}
            >
              <input
                value={tempSeason.name || ""}
                onChange={(e) =>
                  setTempSeason((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Season name"
                className={inputCls}
              />
              <input
                type="date"
                value={tempSeason.start || ""}
                onChange={(e) =>
                  setTempSeason((p) => ({ ...p, start: e.target.value }))
                }
                className={inputCls}
              />
              <input
                type="date"
                value={tempSeason.end || ""}
                onChange={(e) =>
                  setTempSeason((p) => ({ ...p, end: e.target.value }))
                }
                className={inputCls}
              />
              {(tempHasConflict || tempSeason.priority) && (
                <select
                  value={tempSeason.priority || ""}
                  onChange={(e) =>
                    setTempSeason((p) => ({ ...p, priority: e.target.value }))
                  }
                  className={selectCls}
                >
                  <option value="">Select Priority</option>
                  {priorityOptions.map((num) => (
                    <option
                      key={num}
                      value={num}
                      disabled={assignedPriorities.includes(num)}
                    >
                      {num}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {tempHasConflict && !tempSeason.priority && (
              <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-xl px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Date conflict:</span> Overlaps
                  with{" "}
                  <span className="font-semibold">
                    {tempSeasonConflicts.join(", ")}
                  </span>
                  . Assign a priority to resolve.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (
                    !tempSeason.name ||
                    !tempSeason.start ||
                    !tempSeason.end
                  ) {
                    toast.error("Fill all season fields");
                    return;
                  }
                  if (tempHasConflict && !tempSeason.priority) {
                    toast.error(
                      "Please assign a priority to resolve the conflict",
                    );
                    return;
                  }
                  if (isAddingExtraSeason) {
                    setSeasons((prev) => [...prev, { ...tempSeason }]);
                    setCurrentPricing((prev) => [...prev, {}]);
                  } else {
                    const updated = [...seasons];
                    updated[currentSeasonIndex] = tempSeason;
                    setSeasons(updated);
                  }
                  setTempSeason({ name: "", start: "", end: "", priority: "" });
                  setCurrentSeasonIndex(seasons.length);
                  setIsAddingExtraSeason(false);
                  toast.success("Season saved");
                }}
                className={`flex-1 h-11 rounded-xl font-semibold text-white transition-all ${
                  tempHasConflict && !tempSeason.priority
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-theme-primary hover:bg-theme-primary/90"
                }`}
              >
                Save Season
              </button>
              <button
                onClick={() => {
                  setTempSeason({ name: "", start: "", end: "", priority: "" });
                  setIsAddingExtraSeason(false);
                }}
                className="h-11 px-6 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION 3: Room Categories & Pricing ── */}
        {hotelCreated &&
          seasons.length > 0 &&
          currentSeasonIndex >= seasons.length && (
            <Section title="Room Categories & Pricing" icon={BedDouble}>
              <div className="space-y-7">
                {/* Saved categories */}
                {roomCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {roomCategories.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200"
                      >
                        <Check className="h-3 w-3 text-green-600" />{" "}
                        {r.categoryName}
                      </div>
                    ))}
                  </div>
                )}

                {/* Category name input */}
                <Field label="New Room Category Name">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        value={currentCategoryName}
                        onChange={(e) => setCurrentCategoryName(e.target.value)}
                        placeholder="e.g. Premium Deluxe  •  Suite  •  Executive"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>
                </Field>

                {/* Pricing tables per season */}
                <div className="space-y-5">
                  {definedSeasons.map((season, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 overflow-hidden shadow-sm"
                    >
                      <div className="bg-slate-50 px-5 py-3 flex items-center justify-between border-b border-slate-100">
                        <span className="font-bold text-slate-800 text-sm">
                          {season.name}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {season.start} → {season.end}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                          <thead className="bg-slate-50/70">
                            <tr className="text-slate-500 text-[11px] uppercase tracking-wide">
                              <th className="px-5 py-3 text-left font-semibold w-20">
                                Plan
                              </th>
                              <th className="px-5 py-3 text-left font-semibold">
                                Double
                              </th>
                              <th className="px-5 py-3 text-left font-semibold">
                                Extra Adult
                              </th>
                              <th className="px-5 py-3 text-left font-semibold">
                                Extra Child
                              </th>
                              <th className="px-5 py-3 text-left font-semibold text-theme-primary">
                                CNB (No Bed)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {["ep", "cp", "map", "ap"].map((plan) => (
                              <tr key={plan} className="hover:bg-slate-50/40">
                                <td className="px-5 py-3 font-black text-xs uppercase text-slate-600 bg-slate-50/50 tracking-widest">
                                  {plan}
                                </td>
                                {[
                                  "double",
                                  "extraAdult",
                                  "extraChild",
                                  "cnb",
                                ].map((key) => (
                                  <td key={key} className="px-5 py-2.5">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={
                                          currentPricing[idx]?.[plan]?.[key] ??
                                          ""
                                        }
                                        onChange={(e) =>
                                          handlePricingChange(
                                            idx,
                                            plan,
                                            key,
                                            e.target.value,
                                          )
                                        }
                                        className={`w-full h-9 pl-7 pr-3 border rounded-lg text-right text-sm outline-none transition-all focus:ring-1 ${
                                          key === "cnb"
                                            ? "border-theme-primary/30 focus:border-theme-primary focus:ring-theme-primary/20"
                                            : "border-slate-200 focus:border-theme-primary focus:ring-theme-primary/20"
                                        }`}
                                      />
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={saveRoomCategory}
                    disabled={isSavingRoom}
                    className="flex-1 h-13 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSavingRoom ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" /> Save Room Category
                      </>
                    )}
                  </button>
                  {roomCategories.length > 0 && (
                    <button
                      onClick={() => router.back()}
                      className="h-13 py-3.5 px-8 border-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-all"
                    >
                      Finish
                    </button>
                  )}
                </div>
              </div>
            </Section>
          )}

        {/* All done prompt */}
        {roomCategories.length > 0 && !currentCategoryName && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800">
              Category Saved!
            </h3>
            <p className="text-slate-600 text-sm">
              Add another room type or finish the property setup.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={resetForNewCategory}
                className="px-7 h-11 bg-theme-primary text-white rounded-xl font-bold shadow-md hover:bg-theme-primary/90 transition-all"
              >
                + Add Another Room
              </button>
              <button
                onClick={() => router.back()}
                className="px-7 h-11 border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddHotelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <AddHotelPageInner />
    </Suspense>
  );
}
