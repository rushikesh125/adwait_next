"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, Send, Layers, Info, CheckCircle2, Copy, ExternalLink, RefreshCw, ArrowLeft, Globe, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { setTripName, addJourney, resetForm, setJourneys } from "@/store/tripSlice";
import JourneyCard from "@/components/forms/JourneyCard"; 
// Change this line
import { createTripForm, getTripById, updateTripForm } from "@/firebase/form-services";// Ensure these exist
import { auth } from "@/firebase/config";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setTripName ,addJourney, resetForm, setJourneys} from "@/store/tripSlice";

export default function CreateTripPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("id"); // Check if we are in 'Update' mode

  const { tripName, journeys } = useSelector((state) => state.trip);
  const [status, setStatus] = useState("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedTripId, setSavedTripId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(!!tripId);

  // 1. Fetch data if tripId exists (Update Mode)
  useEffect(() => {
    if (tripId) {
      const loadTripData = async () => {
        try {
          const data = await getTripById(tripId);
          if (data) {
            dispatch(setTripName(data.tripName));
            dispatch(setJourneys(data.journeys || []));
            setStatus(data.status || "public");
          }
        } catch (error) {
          toast.error("Failed to load trip data");
        } finally {
          setInitialLoading(false);
        }
      };
      loadTripData();
    } else {
      dispatch(resetForm()); // Clear form for new trip
    }
  }, [tripId, dispatch]);

  const handleSubmit = async () => {
    if (!tripName.trim()) return toast.error("Please enter a Trip Name");
    if (journeys.length === 0) return toast.error("Please add at least one journey");
    
    setIsSubmitting(true);
    const agentId = auth.currentUser?.uid;
    const payload = { tripName, journeys, status, updatedAt: new Date() };

    try {
      let result;
      if (tripId) {
        // UPDATE MODE
        result = await updateTripForm(tripId, payload);
        toast.success("Itinerary Updated!");
        router.back()// Redirect back after update
      } else {
        // CREATE MODE
        result = await createTripForm(agentId, { ...payload, createdAt: new Date() });
        if (result) {
          setSavedTripId(result);
          toast.success("Form Published!");
        }
      }
    } catch (error) {
      toast.error("Process failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading details...</div>;

  if (savedTripId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="bg-theme-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-theme-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Success!</h2>
          <p className="text-slate-500 text-sm mb-6">Your form is now <span className="font-bold text-theme-primary uppercase">{status}</span></p>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setSavedTripId(null); dispatch(resetForm()); }} className="text-xs h-10 px-4">
               Create New
            </Button>
            <Link href="/dashboard">
              <Button className="bg-theme-dark text-white text-xs h-10 px-6">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 h-16 flex items-center">
        <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-sm font-bold text-slate-800">
              {tripId ? "Update Itinerary" : "New Itinerary"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* STATUS PICKER */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[110px] h-8 text-[10px] font-bold uppercase bg-slate-50 border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3 h-3 text-green-500" /> Public</span></SelectItem>
                <SelectItem value="draft"><span className="flex items-center gap-2"><FileText className="w-3 h-3 text-slate-400" /> Draft</span></SelectItem>
                <SelectItem value="closed"><span className="flex items-center gap-2"><Lock className="w-3 h-3 text-amber-500" /> Closed</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-10 px-6">
        <form autoComplete="off" className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
                <Info className="w-4 h-4 text-theme-primary" />
                <h3 className="text-xs font-bold text-slate-700 uppercase">Trip Identity</h3>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Reference Name</label>
              <Input
                value={tripName}
                onChange={(e) => dispatch(setTripName(e.target.value))}
                placeholder="Name your trip..."
                className="theme-input h-10 text-base font-semibold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Segments</span>
                <Separator className="bg-slate-200 flex-1" />
            </div>
            <div className="space-y-4">
              {journeys.map((j, index) => (
                <JourneyCard key={j.id} journey={j} index={index} total={journeys.length} />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch(addJourney())}
                disabled={journeys.length >= 6}
                className="w-full h-12 border-dashed border-2 border-slate-200 text-slate-400 hover:text-theme-primary hover:border-theme-primary text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Journey Segment
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || journeys.length === 0}
              className="bg-theme-primary hover:bg-theme-secondary text-white font-bold text-xs h-11 px-10 shadow-sm"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : (tripId ? "Save Changes" : "Publish Form")}
            </Button>
          </div>
        </form>
      </main>

      <style jsx global>{`
        .theme-input {
          border-radius: 0 !important; border: none !important;
          border-bottom: 1.5px solid #e2e8f0 !important;
          padding: 0 !important; background: transparent !important;
          transition: border-color 0.2s ease !important;
        }
        .theme-input:focus { border-bottom-color: var(--theme-primary, #1E88E5) !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
}