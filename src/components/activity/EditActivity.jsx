"use client";
import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { 
  X, 
  MapPin, 
  Tag, 
  Plus,
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { belongsToOrg } from "@/firebase/orgScope";

const EditActivity = ({ onClose, activityId, onSave }) => {
    const { user } = useSelector((state) => state.auth);
    const [activityData, setActivityData] = useState(null);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedState, setSelectedState] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [activityName, setActivityName] = useState("");
    const [pricingTiers, setPricingTiers] = useState([]);

    // Fetch States
    useEffect(() => {
        const fetchStates = async () => {
            if (!user?.orgId) return;
            const snapshot = await getDocs(
                query(collection(db, "locations"), where("orgId", "==", user.orgId))
            );
            const stateList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setStates(stateList);
        };
        fetchStates();
    }, [user?.orgId]);

    // Fetch Activity Data
    useEffect(() => {
        const fetchActivity = async () => {
            if (activityId) {
                setLoading(true);
                const docRef = doc(db, "activities", activityId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && belongsToOrg(docSnap.data(), user?.orgId)) {
                    const data = docSnap.data();
                    setActivityData(data);
                    setActivityName(data.name);
                    setSelectedState(data.state);
                    setSelectedCity(data.city);
                    
                    // Handle both old (fitRate/groupRate) and new (pricingTiers) formats
                    if (data.pricingTiers && Array.isArray(data.pricingTiers)) {
                        setPricingTiers(data.pricingTiers);
                    } else {
                        // Backward compatibility: convert old format to new
                        const tiers = [];
                        if (data.fitRatePerPerson) {
                            tiers.push({ minPax: 1, maxPax: 10, pricePerPerson: data.fitRatePerPerson, pricingType: "per_person" });
                        }
                        if (data.groupRatePerPerson) {
                            tiers.push({ minPax: 11, maxPax: null, pricePerPerson: data.groupRatePerPerson, pricingType: "per_person" });
                        }
                        setPricingTiers(tiers.length > 0 ? tiers : [{ minPax: 1, maxPax: null, pricePerPerson: 0, pricingType: "per_person" }]);
                    }
                }
                setLoading(false);
            }
        };
        fetchActivity();
    }, [activityId]);

    // Fetch Cities based on State
    useEffect(() => {
        const fetchCities = async () => {
            const selected = states.find((s) => s.name === selectedState);
            if (selected) {
                const docSnap = await getDoc(doc(db, "locations", selected.id));
                if (docSnap.exists() && belongsToOrg(docSnap.data(), user?.orgId)) {
                    setCities(docSnap.data().cities || []);
                }
            }
        };
        if (selectedState) fetchCities();
    }, [selectedState, states, user?.orgId]);

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

    const handleUpdate = async () => {
        if (!activityName || !selectedState || !selectedCity) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (pricingTiers.length === 0) {
            toast.error("Add at least one pricing tier");
            return;
        }

        const invalidTier = pricingTiers.some(tier => !tier.pricePerPerson && tier.pricePerPerson !== 0);
        if (invalidTier) {
            toast.error("All tiers must have a price per person");
            return;
        }

        if (!user?.orgId) {
            toast.error("Organization is not assigned");
            return;
        }
        setIsSubmitting(true);
        try {
            const activityRef = doc(db, "activities", activityId);
            const existing = await getDoc(activityRef);
            if (!existing.exists() || !belongsToOrg(existing.data(), user.orgId)) {
                toast.error("Activity not found");
                return;
            }
            await updateDoc(activityRef, {
                name: activityName,
                state: selectedState,
                city: selectedCity,
                orgId: user.orgId,
                pricingTiers: pricingTiers.map(tier => ({
                    minPax: tier.minPax,
                    maxPax: tier.maxPax,
                    pricePerPerson: Number(tier.pricePerPerson),
                    pricingType: tier.pricingType || "per_person"
                }))
            });
            toast.success("Experience updated successfully!");
            onSave(); // Trigger refresh in parent
            onClose();
        } catch (error) {
            toast.error("Update failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to remove this experience permanently?")) return;
        if (!user?.orgId) {
            toast.error("Organization is not assigned");
            return;
        }
        try {
            const existing = await getDoc(doc(db, "activities", activityId));
            if (!existing.exists() || !belongsToOrg(existing.data(), user?.orgId)) {
                toast.error("Activity not found");
                return;
            }
            await deleteDoc(doc(db, "activities", activityId));
            toast.success("Experience removed");
            onSave();
            onClose();
        } catch (error) {
            toast.error("Deletion failed");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Edit Experience</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Modify rates or location details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-theme-primary animate-spin mb-4" />
                        <p className="text-slate-400 text-sm font-medium">Fetching details...</p>
                    </div>
                ) : (
                    <div className="p-8 space-y-6">
                        
                        {/* Location Selectors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> State
                                </label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                >
                                    <option value="">Select State</option>
                                    {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> City
                                </label>
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                >
                                    <option value="">Select City</option>
                                    {cities.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Activity Name */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Experience Name
                            </label>
                            <input
                                type="text"
                                value={activityName}
                                onChange={(e) => setActivityName(e.target.value)}
                                placeholder="e.g. Paragliding at Solang Valley"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all font-semibold"
                            />
                        </div>

                        {/* Pricing Tiers */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pricing Tiers</label>
                                <button
                                    onClick={addTier}
                                    className="text-[10px] text-theme-primary hover:text-theme-secondary font-bold flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add Tier
                                </button>
                            </div>

                            <div className="space-y-2 bg-slate-50/50 rounded-xl p-3 border border-slate-100 max-h-80 overflow-y-auto">
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

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-4">
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all text-sm font-bold"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-all text-sm font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdate}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 bg-theme-primary hover:bg-theme-secondary text-white px-8 py-2.5 rounded-xl shadow-lg shadow-theme-primary/20 transition-all active:scale-95 text-sm font-bold disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditActivity;
