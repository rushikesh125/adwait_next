"use client";
import React, { useEffect, useState } from "react";
import { useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { 
  X, MapPin, Hotel, Calendar, BedDouble, Plus, Check, ChevronRight, Star,
  ExternalLink, AlertTriangle, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

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

const AddHotel = ({ onClose, editHotelId = null, hotelToEdit = null }) => {
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

  const [hotelCreated, setHotelCreated] = useState(false);
  const [createdHotelId, setCreatedHotelId] = useState(null);

  const [isCreatingHotel, setIsCreatingHotel] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isAddingCity, setIsAddingCity] = useState(false);

  const [seasonCount, setSeasonCount] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);
  const [tempSeason, setTempSeason] = useState({ name: "", start: "", end: "" , priority: ""});
  const [isAddingExtraSeason, setIsAddingExtraSeason] = useState(false);

  const [roomCategories, setRoomCategories] = useState([]);
  const [currentCategoryName, setCurrentCategoryName] = useState("");
  const [currentPricing, setCurrentPricing] = useState([]);

  const editMode = !!editHotelId;

  const assignedPriorities = useMemo(() => {
    return seasons
      .filter((s, i) => s && (!isAddingExtraSeason && i !== currentSeasonIndex))
      .map(s => Number(s.priority))
      .filter(p => !isNaN(p));
  }, [seasons, currentSeasonIndex, isAddingExtraSeason]);

  const priorityOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const snap = await getDocs(collection(db, "locations"));
        setStates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
        toast.error("Failed to load states");
      }
    };
    fetchStates();
  }, []);

  useEffect(() => {
    if (!editMode) return;
    const loadHotel = async () => {
      try {
        const hotelRef = doc(db, "hotels", editHotelId);
        const snap = await getDoc(hotelRef);
        if (!snap.exists()) return;

        const data = snap.data();
        setHotelName(data.name || "");
        setHotelRating(data.rating || "");
        setGoogleReviewRating(data.GoogleReviewRating || "");
        setGoogleListingURL(data.GoogleListingURL || "");
        setSelectedState(data.state || "");
        setCityInput(data.city || "");
        setSelectedCity({ name: data.city });
        setCityConfirmed(true);
        setHotelCreated(true);
        setCreatedHotelId(editHotelId);

        if (data.rooms?.length > 0) {
          setRoomCategories(data.rooms);
          const template = data.rooms[data.rooms.length - 1]?.seasons?.map(s => ({
            ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
            cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
            map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
            ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
            ...s.pricing
          })) || [];

          setCurrentPricing(template);
          setSeasons(
            data.rooms[data.rooms.length - 1]?.seasons?.map(s => ({
              name: s.name,
              start: s.start,
              end: s.end,
              priority: s.priority || ""
            })) || []
          );
          setSeasonCount(data.rooms[data.rooms.length - 1]?.seasons?.length || 0);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load hotel data");
      }
    };
    loadHotel();
  }, [editMode, editHotelId]);

  useEffect(() => {
    if (!selectedState) return;
    const stateDoc = states.find(s => s.name === selectedState);
    if (!stateDoc) return;

    const fetchCities = async () => {
      try {
        const snap = await getDoc(doc(db, "locations", stateDoc.id));
        if (snap.exists()) setCities(snap.data().cities || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load cities");
      }
    };
    fetchCities();
  }, [selectedState, states]);

  useEffect(() => {
    if (!cityInput.trim()) {
      setFilteredCities([]);
      return;
    }
    const lower = cityInput.toLowerCase();
    const matches = cities.filter(c => c.name.toLowerCase().includes(lower));
    const exact = cities.some(c => c.name.toLowerCase() === lower);
    const list = [...matches];
    if (!exact) list.push("Other");
    setFilteredCities(list);
  }, [cityInput, cities]);

  const handleSelectCity = (item) => {
    if (item === "Other") {
      const name = cityInput.trim();
      if (!name) return;
      if (cities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
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
      const stateDoc = states.find(s => s.name === selectedState);
      const newCity = { name: pendingNewCity, hotelIds: [] };
      await updateDoc(doc(db, "locations", stateDoc.id), { cities: arrayUnion(newCity) });
      setSelectedCity(newCity);
      setCityInput(pendingNewCity);
      setCityConfirmed(true);
      setPendingNewCity(null);
      toast.success(`City "${pendingNewCity}" added to ${selectedState}`);
    } catch (err) {
      console.error(err);
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
        const duplicate = snap.docs.some(d => {
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
          state: selectedState,
          city: selectedCity.name,
          rooms: []
        });
        hotelId = ref.id;
        setCreatedHotelId(hotelId);
        setHotelCreated(true);
        const stateDoc = states.find(s => s.name === selectedState);
        const citySnap = await getDoc(doc(db, "locations", stateDoc.id));
        const cityList = citySnap.data().cities.map(c =>
          c.name.toLowerCase() === selectedCity.name.toLowerCase()
            ? { ...c, hotelIds: [...(c.hotelIds || []), hotelId] }
            : c
        );
        await updateDoc(doc(db, "locations", stateDoc.id), { cities: cityList });
        toast.success("Hotel created! Now define pricing seasons.");
      } else {
        await updateDoc(doc(db, "hotels", editHotelId), {
          name: hotelName.trim(),
          rating: hotelRating,
          GoogleReviewRating: GoogleReviewRating || null,
          GoogleListingURL: GoogleListingURL || null,
        });
        toast.success("Hotel updated!");
        setHotelCreated(true);
      }
    } catch (err) {
      console.error(err);
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
    setCurrentPricing(prev => {
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
    const hasPrice = currentPricing.some(s =>
      s && ["ep", "cp", "map", "ap"].some(p =>
        s[p] && Object.values(s[p]).some(v => v > 0)
      )
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
          ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0, ...(currentPricing[i]?.ep  || {}) },
          cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0, ...(currentPricing[i]?.cp  || {}) },
          map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0, ...(currentPricing[i]?.map || {}) },
          ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0, ...(currentPricing[i]?.ap  || {}) },
        }
      }))
    };
    setIsSavingRoom(true);
    try {
      await updateDoc(doc(db, "hotels", createdHotelId), { rooms: arrayUnion(newRoom) });
      setRoomCategories(prev => [...prev, newRoom]);
      setCurrentCategoryName("");
      toast.success("Room category saved ✓");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save room category");
    } finally {
      setIsSavingRoom(false);
    }
  };

  const resetForNewCategory = () => {
    setCurrentCategoryName("");
    setCurrentPricing(seasons.filter(Boolean).map(() => ({
      ep:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      cp:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      ap:  { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }
    })));
  };

  const seasonOverlapMap = getSeasonOverlaps(seasons);
  const anySeasonOverlap = Array.from(seasonOverlapMap.values()).some(names => names.length > 0);

  const getTempSeasonConflicts = () => {
    if (!tempSeason.start || !tempSeason.end) return [];
    return seasons
      .map((s, i) => {
        if (!s) return null;
        if (!isAddingExtraSeason && i === currentSeasonIndex) return null;
        if (rangesOverlap(tempSeason.start, tempSeason.end, s.start, s.end)) {
          return s.name || `Season ${i + 1}`;
        }
        return null;
      })
      .filter(Boolean);
  };

  const tempSeasonConflicts = getTempSeasonConflicts();
  const tempHasConflict = tempSeasonConflicts.length > 0;
  const definedSeasons = seasons.filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto p-4 py-8">
      <div className="w-full max-w-4xl min-h-[50vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-8 py-5 border-b bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-theme-muted p-2 rounded-lg">
              <Hotel className="h-5 w-5 text-theme-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {editMode ? "Edit Property" : "Register Property"}
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Step {hotelCreated ? (seasons.length === 0 ? '2: Seasons' : '3: Rooms') : '1: Basic Info'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="h-5 w-5 text-slate-400 hover:text-slate-700" />
          </button>
        </div>
        <div className="p-8 space-y-10">
          <div className={`space-y-6 ${hotelCreated ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> State / Region
                </label>
                <select
                  value={selectedState}
                  onChange={e => {
                    setSelectedState(e.target.value);
                    setSelectedCity(null);
                    setCityInput("");
                    setCityConfirmed(false);
                    setPendingNewCity(null);
                  }}
                  className="w-full h-11 border border-slate-200 rounded-xl px-4 bg-slate-50 focus:bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/30 outline-none"
                >
                  <option value="">Select state</option>
                  {states.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              {selectedState && (
                <div className="space-y-2 relative">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" /> City
                  </label>
                  <input
                    value={cityInput}
                    onChange={e => {
                      setCityInput(e.target.value);
                      setPendingNewCity(null);
                      setCityConfirmed(false);
                    }}
                    placeholder="Start typing city name..."
                    className="w-full h-11 border border-slate-200 rounded-xl px-4 bg-slate-50 focus:bg-white focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/30 outline-none"
                  />
                  {cityInput && filteredCities.length > 0 && (
                    <div className="absolute w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto">
                      {filteredCities.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectCity(item)}
                          className="px-4 py-3 hover:bg-slate-100 cursor-pointer text-sm flex justify-between items-center"
                        >
                          {item === "Other" ? (
                            <span className="text-theme-primary flex items-center">
                              <Plus className="h-4 w-4 mr-2" /> Add "{cityInput.trim()}"
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
                        Add <span className="font-semibold">"{pendingNewCity}"</span> to {selectedState}?
                      </p>
                      <button
                        onClick={confirmAddCity}
                        disabled={isAddingCity}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isAddingCity
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</>
                          : <><Check className="h-3.5 w-3.5" /> Confirm</>
                        }
                      </button>
                      <button
                        onClick={() => setPendingNewCity(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {cityConfirmed && selectedCity && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        ✓ {selectedCity.name}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
            {cityConfirmed && !hotelCreated && (
              <div className="pt-6 border-t space-y-6 animate-in slide-in-from-top">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Hotel Name</label>
                    <input
                      value={hotelName}
                      onChange={e => setHotelName(e.target.value)}
                      placeholder="e.g. Taj Lake Palace"
                      className="w-full h-11 border rounded-xl px-4 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Star Rating</label>
                    <select
                      value={hotelRating}
                      onChange={e => setHotelRating(e.target.value)}
                      className="w-full h-11 border rounded-xl px-4 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                    >
                      <option value="">Select rating</option>
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={`${n}-star`}>{"★".repeat(n)} {n} Star</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" /> Google Rating
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={GoogleReviewRating ?? ""}
                      onChange={e => setGoogleReviewRating(e.target.value)}
                      className="w-full h-11 border rounded-xl px-4 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> Google Maps / Listing URL
                    </label>
                    <input
                      value={GoogleListingURL ?? ""}
                      onChange={e => setGoogleListingURL(e.target.value)}
                      placeholder="https://goo.gl/maps/..."
                      className="w-full h-11 border rounded-xl px-4 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20 outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={createOrUpdateHotel}
                  disabled={isCreatingHotel}
                  className="w-full h-12 bg-theme-primary hover:bg-theme-primary/90 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isCreatingHotel ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {editMode ? "Updating..." : "Creating..."}</>
                  ) : (
                    editMode ? "Update Hotel" : "Create Hotel"
                  )}
                </button>
              </div>
            )}
          </div>
          {hotelCreated && seasons.length === 0 && (
            <div className="bg-slate-50 p-8 rounded-2xl border border-dashed text-center space-y-5">
              <Calendar className="h-10 w-10 text-theme-primary mx-auto" />
              <h3 className="text-xl font-bold">Define Pricing Seasons</h3>
              <p className="text-slate-600">How many different price periods?</p>
              <div className="flex justify-center items-center gap-4">
                <input
                  type="number"
                  min="1"
                  value={seasonCount}
                  onChange={e => setSeasonCount(Number(e.target.value))}
                  className="w-20 h-11 text-center border rounded-xl font-bold"
                />
                <button
                  onClick={() => {
                    if (seasonCount < 1) return;
                    setSeasons(new Array(seasonCount).fill(null));
                    setCurrentSeasonIndex(0);
                    setCurrentPricing(new Array(seasonCount).fill(null).map(() => ({})));
                  }}
                  className="px-8 h-11 bg-theme-primary text-white rounded-xl font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          )}
          {seasons.length > 0 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="uppercase text-sm font-bold tracking-wide text-slate-700">Pricing Seasons</h3>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{seasons.filter(Boolean).length} defined</Badge>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr className="text-slate-600">
                      <th className="px-6 py-3 text-left font-medium">Season</th>
                      <th className="px-6 py-3 text-left font-medium">From</th>
                      <th className="px-6 py-3 text-left font-medium">To</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {seasons.map((s, i) => {
                      if (!s) return null;
                      const conflicts = seasonOverlapMap.get(i);
                      const hasConflict = !!conflicts && conflicts.length > 0 && !s.priority;
                      return (
                        <tr key={i} className={`${hasConflict ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}>
                          <td className="px-6 py-4 font-medium">
                            <span className={hasConflict ? 'text-red-700' : ''}>
                              {s.name}
                              {s.priority && (
                                <span className="ml-2 text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                                  Priority: {s.priority}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className={`px-6 py-4 ${hasConflict ? 'text-red-600' : 'text-slate-600'}`}>
                            {s.start}
                          </td>
                          <td className={`px-6 py-4 ${hasConflict ? 'text-red-600' : 'text-slate-600'}`}>
                            {s.end}
                          </td>
                          <td className="px-6 py-4">
                            {hasConflict ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="h-3 w-3" />
                                Overlaps: {conflicts.join(', ')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                                <Check className="h-3 w-3" /> OK
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button
                              onClick={() => {
                                setTempSeason(s);
                                setCurrentSeasonIndex(i);
                              }}
                              className="text-theme-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSeasons(prev => prev.filter((_, idx) => idx !== i));
                                setCurrentPricing(prev => prev.filter((_, idx) => idx !== i));
                              }}
                              className="text-red-600 hover:underline"
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
              <div className="flex justify-end">
                <button
                  onClick={() => setIsAddingExtraSeason(true)}
                  className="flex items-center gap-1.5 text-theme-primary font-medium hover:underline"
                >
                  <Plus className="h-4 w-4" /> Add season
                </button>
              </div>
            </div>
          )}
          {(currentSeasonIndex < seasons.length || isAddingExtraSeason) && (
            <div className={`p-6 border rounded-2xl space-y-5 ${tempHasConflict && !tempSeason.priority ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="font-bold flex items-center gap-2">
                <Calendar className={`h-5 w-5 ${tempHasConflict && !tempSeason.priority ? 'text-red-500' : 'text-theme-primary'}`} />
                {isAddingExtraSeason ? "New Season" : `Season ${currentSeasonIndex + 1}`}
                {tempHasConflict && !tempSeason.priority && (
                  <span className="ml-auto text-xs font-semibold text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Date conflict
                  </span>
                )}
              </h4>
              <div className={`grid gap-4 ${(tempHasConflict || tempSeason.priority) ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                <input
                  value={tempSeason.name || ""}
                  onChange={e => setTempSeason(p => ({ ...p, name: e.target.value }))}
                  placeholder="Season name"
                  className="h-11 border rounded-xl px-4 focus:border-theme-primary outline-none"
                />
                <input
                  type="date"
                  value={tempSeason.start || ""}
                  onChange={e => setTempSeason(p => ({ ...p, start: e.target.value }))}
                  className="h-11 border rounded-xl px-4 focus:border-theme-primary outline-none"
                />
                <input
                  type="date"
                  value={tempSeason.end || ""}
                  onChange={e => setTempSeason(p => ({ ...p, end: e.target.value }))}
                  className="h-11 border rounded-xl px-4 focus:border-theme-primary outline-none"
                />
                {(tempHasConflict || tempSeason.priority) && (
                  <select
                    value={tempSeason.priority || ""}
                    onChange={(e) => setTempSeason(p => ({ ...p, priority: e.target.value }))}
                    className="h-11 border rounded-xl px-4 focus:border-theme-primary outline-none bg-white"
                  >
                    <option value="">Select Priority</option>
                    {priorityOptions.map(num => (
                      <option 
                        key={num} 
                        value={num} 
                        disabled={assignedPriorities.includes(num)}
                      >
                        {num} {assignedPriorities.includes(num) ? "(Assigned)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {tempHasConflict && !tempSeason.priority && (
                <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">
                    <span className="font-semibold">Date conflict:</span> These dates overlap with {' '}
                    <span className="font-semibold">{tempSeasonConflicts.join(', ')}</span>.
                    Provide the priority to the conflicted seasons
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!tempSeason.name || !tempSeason.start || !tempSeason.end) {
                      toast.error("Fill all season fields");
                      return;
                    }
                    if (tempHasConflict && !tempSeason.priority) {
                      toast.error("Please assign a priority to resolve the conflict");
                      return;
                    }
                    if (isAddingExtraSeason) {
                      setSeasons(prev => [...prev, { ...tempSeason }]);
                      setCurrentPricing(prev => [...prev, {}]);
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
                  className={`flex-1 h-11 rounded-xl font-medium text-white transition-all ${
                    tempHasConflict && !tempSeason.priority
                      ? 'bg-slate-300 cursor-not-allowed opacity-60'
                      : 'bg-theme-primary hover:bg-theme-primary/90'
                  }`}
                >
                  Save Season
                </button>
                <button
                  onClick={() => {
                    setTempSeason({ name: "", start: "", end: "", priority: "" });
                    setIsAddingExtraSeason(false);
                  }}
                  className="h-11 px-6 border rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {hotelCreated && seasons.length > 0 && currentSeasonIndex >= seasons.length && (
            <div className="space-y-8 pt-4 border-t">
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BedDouble className="h-6 w-6 text-theme-primary" />
                    <h3 className="text-xl font-bold">Room Categories & Pricing</h3>
                  </div>
                  <input
                    value={currentCategoryName}
                    onChange={e => setCurrentCategoryName(e.target.value)}
                    placeholder="e.g. Premium Deluxe • Suite • Executive"
                    className="h-11 border rounded-xl px-4 focus:border-theme-primary outline-none sm:w-80"
                  />
                </div>
                {roomCategories.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-600">Saved categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {roomCategories.map((r, i) => (
                        <div key={i} className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
                          {r.categoryName}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {definedSeasons.map((season, idx) => (
                    <div key={idx} className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 py-3 font-medium flex justify-between">
                        <span>{season.name}</span>
                        <span className="text-slate-500 text-sm">
                          {season.start} → {season.end}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[750px]">
                          <thead className="bg-slate-50/70">
                            <tr className="text-slate-600">
                              <th className="px-6 py-3 text-left">Plan</th>
                              <th className="px-6 py-3 text-left">Double</th>
                              <th className="px-6 py-3 text-left">Extra Adult</th>
                              <th className="px-6 py-3 text-left">Extra Child</th>
                              <th className="px-6 py-3 text-left text-theme-primary">CNB (No Bed)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {["ep", "cp", "map", "ap"].map(plan => (
                              <tr key={plan} className="hover:bg-slate-50/40">
                                <td className="px-6 py-3 font-bold uppercase bg-slate-50/30">{plan}</td>
                                {["double", "extraAdult", "extraChild", "cnb"].map(key => (
                                  <td key={key} className="px-6 py-3">
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={currentPricing[idx]?.[plan]?.[key] ?? ""}
                                        onChange={e => handlePricingChange(idx, plan, key, e.target.value)}
                                        className={`w-full h-9 pl-8 pr-3 border rounded outline-none text-right ${key === 'cnb' ? 'border-theme-primary/30 focus:border-theme-primary' : 'border-slate-200 focus:border-theme-primary'}`}
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
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={saveRoomCategory}
                    disabled={isSavingRoom}
                    className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSavingRoom ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
                    ) : (
                      <><Plus className="h-5 w-5" /> Save Room Category</>
                    )}
                  </button>
                  {roomCategories.length > 0 && (
                    <button
                      onClick={onClose}
                      className="h-14 px-8 border-2 border-slate-300 hover:bg-slate-50 rounded-xl font-bold"
                    >
                      Finish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {roomCategories.length > 0 && !currentCategoryName && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-5">
              <Check className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="text-2xl font-bold text-green-800">Category Added!</h3>
              <p className="text-slate-700">Add another room type or finish setup.</p>
              <div className="flex justify-center gap-4 pt-4">
                <button
                  onClick={resetForNewCategory}
                  className="px-8 h-12 bg-theme-primary text-white rounded-xl font-bold shadow-md"
                >
                  + Add Another Room
                </button>
                <button
                  onClick={onClose}
                  className="px-8 h-12 border-2 border-slate-300 rounded-xl font-bold hover:bg-slate-50"
                >
                  Done for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddHotel;