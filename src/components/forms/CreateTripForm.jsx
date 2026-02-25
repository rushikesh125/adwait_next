"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Plus, Send, Layers, Train, Info, CheckCircle2, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setTripName, addJourney, resetForm } from "@/store/tripSlice";
import JourneyCard from "./JourneyCard";
import { createTripForm } from "@/firebase/services";
import { auth } from "@/firebase/config";
import toast from "react-hot-toast";

export default function CreateTripForm() {
  const dispatch = useDispatch();
  const { tripName, journeys } = useSelector((state) => state.trip);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedTripId, setSavedTripId] = useState(null);

  const handleCreate = async () => {
    if (!tripName.trim()) return toast.error("Please enter a Trip Name");
    if (journeys.some(j => !j.trainNo || !j.date)) {
      return toast.error("Please fill in Train No and Date for all journeys");
    }

    setIsSubmitting(true);
    const agentId = auth.currentUser?.uid;
    
    const result = await createTripForm(agentId, { tripName, journeys });
    
    if (result) {
      setSavedTripId(result);
      toast.success("Form Published Successfully!");
    }
    setIsSubmitting(false);
  };

  const copyToClipboard = () => {
    const link = `${window.location.origin}/book/${savedTripId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const handleResetAndClose = () => {
    setSavedTripId(null);
    dispatch(resetForm());
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogTrigger asChild>
        <Button className="bg-theme-primary hover:bg-theme-secondary text-white font-semibold px-8 py-7 rounded-2xl shadow-xl shadow-theme-primary/20 gap-3 text-lg transition-transform active:scale-95">
          <Plus className="w-6 h-6" />
          Create New Form
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-[95vw] lg:max-w-7xl p-0 border-none shadow-2xl rounded-3xl gap-0"
        style={{
          height: "90vh",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Conditional Rendering: Success State vs Form State */}
        {savedTripId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 bg-white text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-theme-dark mb-2">Form Created!</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Your group booking link is ready. Share this with your passengers to collect their details.
            </p>

            <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex-1 flex items-center px-4 py-2 bg-white rounded-xl border border-slate-100 overflow-hidden">
                <p className="text-sm font-medium text-theme-secondary truncate">
                  {`${window.location.origin}/book/${savedTripId}`}
                </p>
              </div>
              <Button 
                onClick={copyToClipboard}
                className="bg-theme-primary hover:bg-theme-secondary text-white px-6 rounded-xl font-bold"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
            </div>

            <div className="flex gap-4 mt-10">
              <Button 
                variant="outline" 
                onClick={handleResetAndClose}
                className="rounded-xl border-slate-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Create Another
              </Button>
              <a href={`/book/${savedTripId}`} target="_blank" rel="noreferrer">
                <Button className="bg-theme-dark text-white rounded-xl px-8">
                  View Live Form <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* ── HEADER ── */}
            <div
              style={{ flexShrink: 0 }}
              className="bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to px-8 py-6 text-white"
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold flex items-center gap-3">
                  <Layers className="w-8 h-8" />
                  Trip Configuration Portal
                </DialogTitle>
                <p className="text-white/80 text-sm mt-1">
                  Add up to 6 journey segments for this trip.
                </p>
              </DialogHeader>
            </div>

            {/* ── TRIP NAME & STATS ── */}
            <div
              style={{ flexShrink: 0 }}
              className="px-8 py-5 bg-white border-b border-slate-200"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-xs font-black text-theme-dark uppercase tracking-widest">
                    Trip Reference Name
                  </label>
                  <Input
                    value={tripName}
                    onChange={(e) => dispatch(setTripName(e.target.value))}
                    placeholder="e.g. Summer Special - Delhi to Manali"
                    className="h-12 border-slate-200 text-lg font-semibold focus-visible:ring-2 focus-visible:ring-theme-primary rounded-xl px-5"
                  />
                </div>
                <div className="bg-theme-muted p-4 rounded-xl border border-theme-accent/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-theme-secondary uppercase">Segments</p>
                    <p className="text-2xl font-black text-theme-dark">{journeys.length} / 6</p>
                  </div>
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm text-theme-primary">
                    <Info className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── SCROLLABLE JOURNEY CARDS ── */}
            <div
              style={{
                flex: "1 1 0%",
                overflowY: "auto",
                overflowX: "hidden",
                backgroundColor: "#f8fafc",
                padding: "24px 32px",
              }}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Journey Segments
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                {journeys.map((j, index) => (
                  <div
                    key={j.id}
                    className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  >
                    <JourneyCard journey={j} index={index} total={journeys.length} />
                  </div>
                ))}
              </div>
            </div>

            {/* ── FIXED ACTION BAR ── */}
            <div
              style={{ flexShrink: 0 }}
              className="px-8 py-5 border-t border-slate-200 bg-white rounded-b-3xl flex flex-col sm:flex-row items-center gap-4"
            >
              <Button
                variant="outline"
                onClick={() => dispatch(addJourney())}
                disabled={journeys.length >= 6}
                className="w-full sm:w-auto px-8 h-12 rounded-2xl border-2 border-dashed border-theme-primary text-theme-primary hover:bg-theme-muted font-bold text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Connecting Journey
              </Button>

              <div className="flex-1" />

              <Button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 h-12 rounded-2xl bg-theme-dark hover:bg-black text-white font-bold text-base shadow-xl transition-all active:scale-95"
              >
                {isSubmitting ? (
                  "Processing Itinerary..."
                ) : (
                  <span className="flex items-center gap-2">
                    Finalize & Generate Link <Send className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}