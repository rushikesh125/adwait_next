"use client";
import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config";
import { 
  X, 
  MapPin, 
  Tag, 
  Users, 
  User, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";

const EditActivity = ({ onClose, activityId, onSave }) => {
    const [activityData, setActivityData] = useState(null);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedState, setSelectedState] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [activityName, setActivityName] = useState("");
    const [fitRate, setFitRate] = useState("");
    const [groupRate, setGroupRate] = useState("");

    // Fetch States
    useEffect(() => {
        const fetchStates = async () => {
            const snapshot = await getDocs(collection(db, "locations"));
            const stateList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setStates(stateList);
        };
        fetchStates();
    }, []);

    // Fetch Activity Data
    useEffect(() => {
        const fetchActivity = async () => {
            if (activityId) {
                setLoading(true);
                const docRef = doc(db, "activities", activityId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setActivityData(data);
                    setActivityName(data.name);
                    setFitRate(data.fitRatePerPerson);
                    setGroupRate(data.groupRatePerPerson);
                    setSelectedState(data.state);
                    setSelectedCity(data.city);
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
                if (docSnap.exists()) {
                    setCities(docSnap.data().cities || []);
                }
            }
        };
        if (selectedState) fetchCities();
    }, [selectedState, states]);

    // Negative Value Prevention Logic
    const handleNumberChange = (setter) => (e) => {
        const value = e.target.value;
        const num = value === "" ? 0 : parseInt(value);
        setter(Math.max(0, num));
    };

    const handleUpdate = async () => {
        if (!activityName || !selectedState || !selectedCity) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const activityRef = doc(db, "activities", activityId);
            await updateDoc(activityRef, {
                name: activityName,
                state: selectedState,
                city: selectedCity,
                fitRatePerPerson: Number(fitRate),
                groupRatePerPerson: Number(groupRate),
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
        try {
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

                        {/* Rates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" /> FIT Rate (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={fitRate}
                                    onChange={handleNumberChange(setFitRate)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Group Rate (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={groupRate}
                                    onChange={handleNumberChange(setGroupRate)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-theme-primary/20 outline-none transition-all"
                                />
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