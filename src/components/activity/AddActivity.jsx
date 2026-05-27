"use client";
import React, { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    addDoc,
    query,
    where,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { 
    X, 
    Plus, 
    MapPin, 
    Search, 
    User, 
    Users, 
    Tag, 
    CheckCircle2, 
    Loader2, 
    PlusCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

const AddActivity = ({ onClose }) => {
    const { user } = useSelector((state) => state.auth);
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [cities, setCities] = useState([]);
    const [cityInput, setCityInput] = useState("");
    const [filteredCities, setFilteredCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [cityConfirmed, setCityConfirmed] = useState(false);
    const [activityName, setActivityName] = useState("");
    const [pricingTiers, setPricingTiers] = useState([
        { minPax: 1, maxPax: 5, pricePerPerson: "", pricingType: "per_person" },
        { minPax: 6, maxPax: 10, pricePerPerson: "", pricingType: "per_person" },
        { minPax: 11, maxPax: null, pricePerPerson: "", pricingType: "per_person" }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchStates = async () => {
            if (!user?.orgId) return;
            const querySnapshot = await getDocs(
                collection(db, "locations")
            );
            const stateList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setStates(stateList);
        };
        fetchStates();
    }, [user?.orgId]);

    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (!selectedState) return;
            const selectedDoc = states.find((s) => s.name === selectedState);
            if (!selectedDoc) return;
            const docSnap = await getDoc(doc(db, "locations", selectedDoc.id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCities(data.cities || []);
            }
        };
        fetchCitiesForState();
    }, [selectedState, states]);

    useEffect(() => {
        if (cityInput.trim() === "" || cityConfirmed) {
            setFilteredCities([]);
            return;
        }

        const matchingCities = cities.filter((cityObj) =>
            cityObj.name.toLowerCase().includes(cityInput.toLowerCase())
        );

        const exactMatch = cities.some(
            (cityObj) => cityObj.name.toLowerCase() === cityInput.toLowerCase()
        );

        const suggestions = [...matchingCities];
        if (!exactMatch && cityInput.length > 1) suggestions.push("Other");

        setFilteredCities(suggestions);
    }, [cityInput, cities, cityConfirmed]);

    const handleNumberChange = (setter) => (e) => {
        const val = e.target.value;
        const num = val === "" ? "" : Math.max(0, parseInt(val) || 0);
        setter(num);
    };

    const updateTier = (index, field, value) => {
        const updated = [...pricingTiers];
        if (field === "pricePerPerson") {
            updated[index].pricePerPerson = value === "" ? "" : Math.max(0, parseInt(value) || 0);
        } else if (field === "minPax") {
            updated[index].minPax = parseInt(value) || 1;
        } else if (field === "maxPax") {
            updated[index].maxPax = value === "" ? null : parseInt(value) || null;
        } else if (field === "pricingType") {
            updated[index].pricingType = value;
        }
        setPricingTiers(updated);
    };

    const addTier = () => {
        const lastTier = pricingTiers[pricingTiers.length - 1];
        const newMinPax = lastTier.maxPax ? lastTier.maxPax + 1 : 21;
        setPricingTiers([
            ...pricingTiers,
            { minPax: newMinPax, maxPax: null, pricePerPerson: "" }
        ]);
    };

    const removeTier = (index) => {
        if (pricingTiers.length <= 1) {
            toast.error("Must have at least one tier");
            return;
        }
        setPricingTiers(pricingTiers.filter((_, i) => i !== index));
    };

    const handleSelectCity = async (cityObj) => {
        const selectedStateObj = states.find((s) => s.name === selectedState);
        if (!selectedStateObj) return;

        if (cityObj === "Other") {
            const trimmedCity = cityInput.trim();
            const confirmed = window.confirm(`Add "${trimmedCity}" as a new city to ${selectedState}?`);
            
            if (confirmed) {
                setIsSubmitting(true);
                try {
                    const newCityObj = { name: trimmedCity, activityIds: [] };
                    const stateRef = doc(db, "locations", selectedStateObj.id);
                    await updateDoc(stateRef, { cities: arrayUnion(newCityObj) });
                    
                    setCityInput(newCityObj.name);
                    setSelectedCity(newCityObj);
                    setCityConfirmed(true);
                    toast.success(`City "${trimmedCity}" added!`);
                } catch (err) {
                    toast.error("Failed to add city");
                } finally {
                    setIsSubmitting(false);
                }
            }
        } else {
            setCityInput(cityObj.name);
            setSelectedCity(cityObj);
            setCityConfirmed(true);
        }
        setFilteredCities([]);
    };

    const handleAddActivity = async () => {
        if (!selectedState || !selectedCity || !activityName) {
            toast.error("Please complete location and activity name");
            return;
        }

        // Validate tiers
        if (pricingTiers.length === 0) {
            toast.error("Add at least one pricing tier");
            return;
        }

        const invalidTier = pricingTiers.some(tier => !tier.pricePerPerson && tier.pricePerPerson !== 0);
        if (invalidTier) {
            toast.error("All tiers must have a price per person");
            return;
        }

        setIsSubmitting(true);
        try {
            if (!user?.orgId) {
                toast.error("Organization is not assigned");
                return;
            }
            const activityData = {
                name: activityName.trim(),
                state: selectedState,
                city: selectedCity.name,
                orgId: user.orgId,
                pricingTiers: pricingTiers.map(tier => ({
                    minPax: tier.minPax,
                    maxPax: tier.maxPax,
                    pricePerPerson: Number(tier.pricePerPerson),
                    pricingType: tier.pricingType || "per_person"
                }))
            };

            const activityRef = await addDoc(collection(db, "activities"), activityData);
            const newActivityId = activityRef.id;

            const stateDoc = states.find((s) => s.name === selectedState);
            const stateRef = doc(db, "locations", stateDoc.id);
            const stateSnap = await getDoc(stateRef);
            
            if (stateSnap.exists()) {
                const updatedCities = (stateSnap.data().cities || []).map((city) => {
                    if (city.name.toLowerCase() === selectedCity.name.toLowerCase()) {
                        return {
                            ...city,
                            activityIds: [...(city.activityIds || []), newActivityId],
                        };
                    }
                    return city;
                });
                await updateDoc(stateRef, { cities: updatedCities });
            }

            toast.success("Activity created successfully!");
            onClose();
        } catch (error) {
            toast.error("Creation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-theme-primary/10 rounded-xl text-theme-primary">
                            <PlusCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-none">New Experience</h2>
                            <p className="text-xs text-slate-500 mt-1.5">Add a new activity to your catalog</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6  max-h-[85vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Step 1: Location */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> 1. Select State
                            </label>
                            <select
                                value={selectedState}
                                onChange={(e) => {
                                    setSelectedState(e.target.value);
                                    setSelectedCity(null);
                                    setCityInput("");
                                    setCityConfirmed(false);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all cursor-pointer"
                            >
                                <option value="">Where is this located?</option>
                                {states.map((state) => (
                                    <option key={state.id} value={state.name}>{state.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedState && (
                            <div className="space-y-1.5 relative z-20">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <Search className="w-3 h-3" /> 2. {cityConfirmed ? "Confirmed City" : "Find or Add City"}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={cityInput}
                                        onChange={(e) => {
                                            setCityInput(e.target.value);
                                            setCityConfirmed(false);
                                        }}
                                        disabled={isSubmitting}
                                        placeholder="Type city name..."
                                        className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all ${cityConfirmed ? 'border-green-200 ring-4 ring-green-50' : 'border-slate-200'}`}
                                    />
                                    {cityConfirmed && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                                </div>

                                {filteredCities.length > 0 && (
                                    <ul className="absolute z-[110] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto p-2 animate-in slide-in-from-top-2">
                                        {filteredCities.map((city, i) => (
                                            <li
                                                key={i}
                                                className={`px-4 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                                                    city === "Other" 
                                                    ? "text-theme-primary bg-theme-primary/5 hover:bg-theme-primary/10 border border-dashed border-theme-primary/30 mt-1" 
                                                    : "hover:bg-slate-50 text-slate-700"
                                                }`}
                                                onClick={() => handleSelectCity(city)}
                                            >
                                                {city === "Other" ? (
                                                    <span className="flex items-center gap-2 italic">
                                                        <Plus className="w-4 h-4" /> Add "{cityInput}" as new city
                                                    </span>
                                                ) : city.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Details */}
                    {cityConfirmed && (
                        <div className="space-y-5 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Experience Name
                                </label>
                                <input
                                    type="text"
                                    value={activityName}
                                    onChange={(e) => setActivityName(e.target.value)}
                                    placeholder="e.g., Shikara Ride at Dal Lake"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all font-semibold"
                                />
                            </div>

                            {/* Pricing Tiers */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pricing Tiers</label>
                                    <button
                                        onClick={addTier}
                                        className="text-[10px] text-theme-primary hover:text-theme-secondary font-bold flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" /> Add Tier
                                    </button>
                                </div>

                                <div className="space-y-2 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                    {pricingTiers.map((tier, idx) => (
                                        <div key={idx} className="flex items-end gap-2 p-3 bg-white rounded-lg border border-slate-200">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500">Min Pax</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={tier.minPax}
                                                    onChange={(e) => updateTier(idx, "minPax", e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500">Max Pax</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={tier.maxPax || ""}
                                                    onChange={(e) => updateTier(idx, "maxPax", e.target.value)}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500">Price (₹)</label>
                                                <input
                                                    type="number"
                                                    value={tier.pricePerPerson}
                                                    onChange={(e) => updateTier(idx, "pricePerPerson", e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500">Type</label>
                                                <select
                                                    value={tier.pricingType || "per_person"}
                                                    onChange={(e) => updateTier(idx, "pricingType", e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                                >
                                                    <option value="per_person">Per Person</option>
                                                    <option value="flat_fee">Flat Fee</option>
                                                </select>
                                            </div>
                                            {pricingTiers.length > 1 && (
                                                <button
                                                    onClick={() => removeTier(idx)}
                                                    className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-slate-500 hover:bg-slate-200 transition-all text-sm font-bold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddActivity}
                        disabled={isSubmitting || !cityConfirmed}
                        className="flex items-center gap-2 bg-theme-primary hover:bg-theme-secondary text-white px-8 py-3 rounded-xl shadow-xl shadow-theme-primary/20 transition-all active:scale-95 text-sm font-bold disabled:opacity-50 disabled:grayscale"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <><CheckCircle2 className="w-4 h-4" /> Create Activity</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddActivity;
