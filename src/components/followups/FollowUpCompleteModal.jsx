"use client";

/**
 * FollowUpCompleteModal.jsx
 *
 * Modal for marking a follow-up as complete.
 *
 * Props
 * ──────
 * open       {boolean}  – controlled visibility
 * followUp   {object}   – the follow-up being completed
 * onClose    ()         – called on cancel / backdrop click
 * onConfirm  (completionNotes: string, isColdLead: boolean) => Promise<void>
 */

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  X,
  Snowflake,
  Loader2,
  CalendarClock,
  Phone,
  Video,
  Mail,
  Users,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MODE_ICONS = {
  Call:        Phone,
  Video:       Video,
  Email:       Mail,
  "In-Person": Users,
  WhatsApp:    MessageSquare,
};

const MAX_NOTES = 1000;

// ─────────────────────────────────────────────────────────────────────────────

export default function FollowUpCompleteModal({ open, followUp, onClose, onConfirm }) {
  const [notes, setNotes]         = useState("");
  const [isColdLead, setIsColdLead] = useState(false);
  const [scheduleNext, setScheduleNext] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const textareaRef               = useRef(null);

  // Reset state every time the modal opens for a (potentially different) follow-up
  useEffect(() => {
    if (open) {
      setNotes("");
      setIsColdLead(false);
      setScheduleNext(true);
      setError("");
      setLoading(false);
      // Auto-focus textarea after transition
      const t = setTimeout(() => textareaRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, followUp?.id]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onClose]);

  if (!open || !followUp) return null;

  const ModeIcon = MODE_ICONS[followUp.mode] || CalendarClock;
  const remaining = MAX_NOTES - notes.length;

  const handleConfirm = async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Please add completion notes before marking as done.");
      textareaRef.current?.focus();
      return;
    }
    if (trimmed.length > MAX_NOTES) {
      setError(`Notes must be under ${MAX_NOTES} characters.`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      // Cold lead supersedes scheduling — don't queue another follow-up
      // for a lead that's being archived
      await onConfirm(trimmed, isColdLead, isColdLead ? false : scheduleNext);
      // parent closes modal via setCompleting(false) in FollowUpCard
    } catch (err) {
      // Validation errors are already toasted upstream; only show unexpected ones
      if (err?.message !== "validation") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fuCompleteIn 0.18s ease-out" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fu-complete-title"
      >
        <style>{`
          @keyframes fuCompleteIn {
            from { opacity: 0; transform: scale(0.96) translateY(10px); }
            to   { opacity: 1; transform: scale(1)  translateY(0);      }
          }
        `}</style>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 id="fu-complete-title" className="text-sm font-bold text-slate-900">
                Mark Follow-Up Complete
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Summarise the outcome of this interaction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Follow-up summary pill ── */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
            <div className="p-1.5 rounded-lg bg-white text-slate-500 shadow-sm shrink-0">
              <ModeIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                {followUp.mode} follow-up
              </p>
              <p className="text-[10px] text-slate-400">
                Scheduled: {formatDateTime(followUp.dateTime)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pt-4 pb-5 space-y-4">

          {/* Completion notes textarea */}
          <div>
            <label
              htmlFor="fu-completion-notes"
              className="block text-xs font-bold text-slate-600 mb-1.5"
            >
              Completion Notes <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <textarea
                id="fu-completion-notes"
                ref={textareaRef}
                rows={4}
                maxLength={MAX_NOTES}
                placeholder="What happened? e.g. Customer interested, wants revised budget, call back next week…"
                value={notes}
                disabled={loading}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (error) setError("");
                }}
                className={`w-full resize-none rounded-xl border text-sm px-3.5 py-3 leading-relaxed text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
                  error
                    ? "border-red-300 focus:ring-red-200 bg-red-50/30"
                    : "border-slate-200 focus:ring-theme-primary/20 focus:border-theme-primary bg-slate-50"
                }`}
              />
              {/* Character counter */}
              <span
                className={`absolute bottom-2.5 right-3 text-[10px] font-bold transition-colors ${
                  remaining < 100
                    ? remaining < 20 ? "text-red-500" : "text-amber-500"
                    : "text-slate-300"
                }`}
              >
                {remaining}
              </span>
            </div>
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Schedule-next toggle — hidden once Cold Lead is enabled */}
          {!isColdLead && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setScheduleNext((v) => !v)}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all group ${
                scheduleNext
                  ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
              } disabled:opacity-50`}
            >
              <div
                className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  scheduleNext
                    ? "bg-blue-500 border-blue-500"
                    : "border-slate-300 group-hover:border-slate-400"
                }`}
              >
                {scheduleNext && <CalendarClock className="h-3 w-3 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-700">
                  Schedule next follow-up
                </p>
                <p className="text-[10px] text-slate-500">
                  Open the new follow-up form after marking this one complete
                </p>
              </div>
              <div
                className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${
                  scheduleNext ? "bg-blue-500" : "bg-slate-200"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                    scheduleNext ? "left-3.5" : "left-0.5"
                  }`}
                />
              </div>
            </button>
          )}

          {/* Cold lead toggle */}
          <button
            type="button"
            disabled={loading}
            onClick={() => setIsColdLead((v) => !v)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all group ${
              isColdLead
                ? "bg-slate-800 border-slate-700 shadow-md"
                : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            {/* Toggle indicator */}
            <div className={`shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isColdLead ? "bg-blue-400 border-blue-400" : "border-slate-300 group-hover:border-slate-400"
            }`}>
              {isColdLead && <Snowflake className="h-3 w-3 text-white" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold transition-colors ${isColdLead ? "text-white" : "text-slate-700"}`}>
                Mark as Cold Lead
              </p>
              <p className={`text-[10px] transition-colors ${isColdLead ? "text-slate-300" : "text-slate-400"}`}>
                Auto-close to Closed Lost after 7 days
              </p>
            </div>

            <div className={`h-4 w-7 rounded-full transition-all relative shrink-0 ${
              isColdLead ? "bg-blue-400" : "bg-slate-200"
            }`}>
              <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                isColdLead ? "left-3.5" : "left-0.5"
              }`} />
            </div>
          </button>

          {/* Cold lead warning */}
          {isColdLead && (
            <div
              className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3"
              style={{ animation: "fuCompleteIn 0.15s ease-out" }}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This lead's status will be updated to{" "}
                <span className="font-bold">Cold Lead</span> and will no longer appear in
                active follow-up queues. It will auto-close to{" "}
                <span className="font-bold">Closed Lost</span> after 7 days unless reversed.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2.5 px-5 pb-5">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl h-10 text-sm border-slate-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !notes.trim()}
            className={`flex-1 rounded-xl h-10 text-sm text-white shadow-md transition-all disabled:opacity-50 ${
              isColdLead
                ? "bg-slate-800 hover:bg-slate-900 shadow-slate-800/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isColdLead ? (
                  <Snowflake className="h-4 w-4 mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                {isColdLead ? "Complete & Mark Cold" : "Mark Complete"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
