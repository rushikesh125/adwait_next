"use client";
import React, { useEffect, useState } from "react";
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
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AddHotel = ({ onClose, editHotelId = null, hotelToEdit = null }) => {
  const [states, setStates] = useState([]);
  const [doneOnes, setDoneOnes] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [cities, setCities] = useState([]);
  const [cityInput, setCityInput] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [cityConfirmed, setCityConfirmed] = useState(false);

  const [hotelName, setHotelName] = useState("");
  const [hotelRating, setHotelRating] = useState("");
  const [GoogleListingURL, setGoogleListingURL] = useState("");
  const [GoogleReviewRating, setGoogleReviewRating] = useState("");

  const [hotelCreated, setHotelCreated] = useState(false);
  const [createdHotelId, setCreatedHotelId] = useState(null);

  // ── Season management ───────────────────────────────────────
  const [seasonCount, setSeasonCount] = useState(0);
  const [seasons, setSeasons] = useState([]);           // [{name, start, end}, ...]
  const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);
  const [tempSeason, setTempSeason] = useState({ name: "", start: "", end: "" });
  const [isAddingExtraSeason, setIsAddingExtraSeason] = useState(false);

  // ── Room category management ────────────────────────────────
  const [roomCategories, setRoomCategories] = useState([]); // array of already saved categories (for display)
  const [currentCategoryName, setCurrentCategoryName] = useState("");
  const [currentPricing, setCurrentPricing] = useState([]); // pricing[seasonIndex][plan][type]

  const editMode = !!editHotelId;

  // Fetch states
  useEffect(() => {
    const fetchStates = async () => {
      const snap = await getDocs(collection(db, "locations"));
      setStates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchStates();
  }, []);

  // Load hotel in edit mode
  useEffect(() => {
    if (!editMode) return;

    const loadHotel = async () => {
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

        // Initialize pricing grid using last saved room (or empty)
        const template = data.rooms[data.rooms.length - 1]?.seasons?.map(s => ({
          ep: { double: 0, extraAdult: 0, extraChild: 0 },
          cp: { double: 0, extraAdult: 0, extraChild: 0 },
          map: { double: 0, extraAdult: 0, extraChild: 0 },
          ap: { double: 0, extraAdult: 0, extraChild: 0 },
          ...s.pricing
        })) || [];

        setCurrentPricing(template);
        setSeasons(data.rooms[data.rooms.length - 1]?.seasons?.map(s => ({
          name: s.name,
          start: s.start,
          end: s.end
        })) || []);
        setSeasonCount(data.rooms[data.rooms.length - 1]?.seasons?.length || 0);
      }
    };
    loadHotel();
  }, [editMode, editHotelId]);

  // Fetch cities when state changes
  useEffect(() => {
    if (!selectedState) return;
    const stateDoc = states.find(s => s.name === selectedState);
    if (!stateDoc) return;

    const fetchCities = async () => {
      const snap = await getDoc(doc(db, "locations", stateDoc.id));
      if (snap.exists()) setCities(snap.data().cities || []);
    };
    fetchCities();
  }, [selectedState, states]);

  // City suggestions
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

  const handleSelectCity = async (item) => {
    if (item === "Other") {
      const name = cityInput.trim();
      if (!name) return;
      if (cities.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert(`City "${name}" already exists.`);
        return;
      }
      if (!window.confirm(`Add city "${name}" to ${selectedState}?`)) return;

      const stateDoc = states.find(s => s.name === selectedState);
      const newCity = { name, hotelIds: [] };
      await updateDoc(doc(db, "locations", stateDoc.id), {
        cities: arrayUnion(newCity)
      });

      setSelectedCity(newCity);
      setCityInput(name);
    } else {
      setSelectedCity(item);
      setCityInput(item.name);
    }
    setCityConfirmed(true);
    setFilteredCities([]);
  };

  const createOrUpdateHotel = async () => {
    if (!hotelName.trim() || !hotelRating || !selectedCity || !selectedState) {
      alert("Please fill hotel name, rating, state & city.");
      return;
    }

    if ((!GoogleReviewRating || !GoogleListingURL) && !doneOnes) {
      alert("⚠ Best practice: add Google rating & listing link");
      setDoneOnes(true);
      return;
    }

    try {
      let hotelId = createdHotelId;

      if (!editMode) {
        // Check duplicate
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
          alert(`Hotel "${hotelName}" already exists in this city.`);
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

        // Update city hotelIds
        const stateDoc = states.find(s => s.name === selectedState);
        const citySnap = await getDoc(doc(db, "locations", stateDoc.id));
        const cityList = citySnap.data().cities.map(c => 
          c.name.toLowerCase() === selectedCity.name.toLowerCase()
            ? { ...c, hotelIds: [...(c.hotelIds || []), hotelId] }
            : c
        );
        await updateDoc(doc(db, "locations", stateDoc.id), { cities: cityList });

        alert("Hotel created!");
      } else {
        await updateDoc(doc(db, "hotels", editHotelId), {
          name: hotelName.trim(),
          rating: hotelRating,
          GoogleReviewRating: GoogleReviewRating || null,
          GoogleListingURL: GoogleListingURL || null,
        });
        alert("Hotel updated!");
        setHotelCreated(true);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving hotel");
    }
  };

  const handlePricingChange = (seasonIdx, plan, type, value) => {
    const num = value === "" ? 0 : Number(value);
    if (num < 0) {
      alert("Price cannot be negative");
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
      alert("Please enter room category name");
      return;
    }

    const hasPrice = currentPricing.some(s => 
      s && ["ep","cp","map","ap"].some(p => 
        s[p] && Object.values(s[p]).some(v => v > 0)
      )
    );

    if (!hasPrice) {
      alert("Please set at least one positive price");
      return;
    }

    const newRoom = {
      categoryName: currentCategoryName.trim(),
      seasons: seasons.map((s, i) => ({
        name: s.name,
        start: s.start,
        end: s.end,
        pricing: {
          ep:   { double: 0, extraAdult: 0, extraChild: 0, ...(currentPricing[i]?.ep   || {}) },
          cp:   { double: 0, extraAdult: 0, extraChild: 0, ...(currentPricing[i]?.cp   || {}) },
          map:  { double: 0, extraAdult: 0, extraChild: 0, ...(currentPricing[i]?.map  || {}) },
          ap:   { double: 0, extraAdult: 0, extraChild: 0, ...(currentPricing[i]?.ap   || {}) },
        }
      }))
    };

    try {
      await updateDoc(doc(db, "hotels", createdHotelId), {
        rooms: arrayUnion(newRoom)
      });

      setRoomCategories(prev => [...prev, newRoom]);
      setCurrentCategoryName("");
      // Keep seasons & pricing grid for next category
      alert("Room category saved ✓");

    } catch (err) {
      console.error(err);
      alert("Failed to save room category");
    }
  };

  const resetForNewCategory = () => {
    setCurrentCategoryName("");
    setCurrentPricing(seasons.map(() => ({
      ep:   { double: 0, extraAdult: 0, extraChild: 0 },
      cp:   { double: 0, extraAdult: 0, extraChild: 0 },
      map:  { double: 0, extraAdult: 0, extraChild: 0 },
      ap:   { double: 0, extraAdult: 0, extraChild: 0 }
    })));
  };

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex justify-center items-start overflow-y-auto p-4 py-8">
      <div className="w-full max-w-4xl min-h-[50vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
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

          {/* ── 1. Basic Info ──────────────────────────────────────── */}
          <div className={`space-y-6 ${hotelCreated ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* State + City */}
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
                    onChange={e => setCityInput(e.target.value)}
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
                      {[5,4,3,2,1].map(n => (
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
                  className="w-full h-12 bg-theme-primary hover:bg-theme-primary/90 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  {editMode ? "Update Hotel" : "Create Hotel"}
                </button>
              </div>
            )}
          </div>

          {/* ── 2. Seasons ─────────────────────────────────────────── */}
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

          {/* Seasons list + add more */}
          {seasons.length > 0 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="uppercase text-sm font-bold tracking-wide text-slate-700">Pricing Seasons</h3>
                <Badge variant="outline">{seasons.filter(Boolean).length} defined</Badge>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr className="text-slate-600">
                      <th className="px-6 py-3 text-left font-medium">Season</th>
                      <th className="px-6 py-3 text-left font-medium">From</th>
                      <th className="px-6 py-3 text-left font-medium">To</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {seasons.map((s, i) => s && (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium">{s.name}</td>
                        <td className="px-6 py-4 text-slate-600">{s.start}</td>
                        <td className="px-6 py-4 text-slate-600">{s.end}</td>
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
                              const updated = seasons.filter((_, idx) => idx !== i);
                              setSeasons(updated);
                              setCurrentPricing(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
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

          {/* Season editor */}
          {(currentSeasonIndex < seasons.length || isAddingExtraSeason) && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5">
              <h4 className="font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-theme-primary" />
                {isAddingExtraSeason ? "New Season" : `Season ${currentSeasonIndex + 1}`}
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <input
                  value={tempSeason.name || ""}
                  onChange={e => setTempSeason(p => ({ ...p, name: e.target.value }))}
                  placeholder="Season name (e.g. Monsoon)"
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
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!tempSeason.name || !tempSeason.start || !tempSeason.end) {
                      alert("Fill all season fields");
                      return;
                    }
                    if (isAddingExtraSeason) {
                      setSeasons(prev => [...prev, tempSeason]);
                      setCurrentPricing(prev => [...prev, {}]);
                    } else {
                      const updated = [...seasons];
                      updated[currentSeasonIndex] = tempSeason;
                      setSeasons(updated);
                    }
                    setTempSeason({ name: "", start: "", end: "" });
                    setCurrentSeasonIndex(seasons.length);
                    setIsAddingExtraSeason(false);
                  }}
                  className="flex-1 h-11 bg-theme-primary text-white rounded-xl font-medium"
                >
                  Save Season
                </button>
                <button
                  onClick={() => {
                    setTempSeason({ name: "", start: "", end: "" });
                    setIsAddingExtraSeason(false);
                  }}
                  className="h-11 px-6 border rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── 3. Room Categories & Pricing ───────────────────────── */}
          {hotelCreated && seasons.length > 0 && currentSeasonIndex >= seasons.length && (
            <div className="space-y-8 pt-4 border-t">
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

              {/* Already saved categories (small preview) */}
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

              {/* Pricing tables – one per season */}
              <div className="space-y-6">
                {seasons.map((season, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-6 py-3 font-medium flex justify-between">
                      <span>{season.name}</span>
                      <span className="text-slate-500 text-sm">
                        {season.start} → {season.end}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-slate-50/70">
                          <tr className="text-slate-600">
                            <th className="px-6 py-3 text-left">Plan</th>
                            <th className="px-6 py-3 text-left">Double</th>
                            <th className="px-6 py-3 text-left">Extra Adult</th>
                            <th className="px-6 py-3 text-left">Extra Child</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {["ep", "cp", "map", "ap"].map(plan => (
                            <tr key={plan} className="hover:bg-slate-50/40">
                              <td className="px-6 py-3 font-bold uppercase bg-slate-50/30">{plan}</td>
                              {["double", "extraAdult", "extraChild"].map(key => (
                                <td key={key} className="px-6 py-3">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentPricing[idx]?.[plan]?.[key] ?? ""}
                                      onChange={e => handlePricingChange(idx, plan, key, e.target.value)}
                                      className="w-full h-9 pl-8 pr-3 border rounded border-slate-200 focus:border-theme-primary outline-none text-right"
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
                  className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus className="h-5 w-5" /> Save Room Category
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
          )}

          {/* After saving a category */}
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