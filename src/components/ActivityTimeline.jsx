"use client";

/**
 * ActivityTimeline.jsx
 *
 * Unified activity timeline merging Follow-Ups, Notes and System Events
 * into a single chronological feed. Drop-in replacement for the separate
 * "followups" and "notes" tabs in LeadProfilePage.
 *
 * Props
 * ──────
 * followUps        {Array}   – from getFollowUpsForLead()
 * notes            {Array}   – from getLeadNotes()
 * leadQuotations   {Array}   – passed to FollowUpForm
 * lead             {Object}  – lead document (for name/mobile)
 *
 * Callbacks (same signatures as LeadProfilePage handlers)
 * ──────────────────────────────────────────────────────
 * onAddNote        (text, createdBy) => Promise
 * onDeleteNote     (noteId)          => Promise
 * onFollowUpAdd    (formData)        => Promise
 * onFollowUpEdit   (id, formData)    => Promise
 * onFollowUpDelete (id)              => Promise
 * onFollowUpMarkComplete (followUp, completionNotes, isColdLead) => Promise
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MessageSquare,
  CalendarClock,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  Plus,
  ChevronDown,
  AlertCircle,
  Filter,
  Phone,
  Video,
  Mail,
  Users,
  Edit3,
  X,
  Loader2,
  StickyNote,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FollowUpForm from "@/components/followups/FollowUpForm";
import FollowUpCompleteModal from "@/components/followups/FollowUpCompleteModal";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: "all",      label: "All" },
  { key: "followup", label: "Follow-Ups" },
  { key: "note",     label: "Notes" },
  { key: "system",   label: "System" },
];

const MODE_ICONS = {
  Call:     Phone,
  Video:    Video,
  Email:    Mail,
  "In-Person": Users,
  WhatsApp: MessageSquare,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  if (value?.seconds) return new Date(value.seconds * 1000);
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function formatTs(value) {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateOnly(value) {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getActivityDate(activity) {
  // Determine the canonical sort date for an activity item
  if (activity.kind === "followup") {
    // Sort by scheduled dateTime; fall back to createdAt
    return toDate(activity.dateTime) || toDate(activity.createdAt) || new Date(0);
  }
  return toDate(activity.createdAt) || toDate(activity.timestamp) || new Date(0);
}

function getFollowUpStatus(fu) {
  if (fu.status === "Completed") return "completed";
  const d = toDate(fu.dateTime);
  if (d && d < new Date()) return "overdue";
  return "pending";
}

// Build a unified, sorted activity list from raw data sources
function buildTimeline(followUps = [], notes = [], systemEvents = []) {
  const fuItems = followUps.map((f) => ({ ...f, kind: "followup" }));
  const noteItems = notes.map((n) => ({ ...n, kind: "note" }));
  const sysItems = systemEvents.map((s) => ({ ...s, kind: "system" }));

  return [...fuItems, ...noteItems, ...sysItems].sort(
    (a, b) => getActivityDate(b) - getActivityDate(a)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityTypeBadge({ kind, followUpStatus, mode }) {
  if (kind === "followup") {
    const cfg = {
      completed: { bg: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-200", label: "Completed Follow-Up" },
      overdue:   { bg: "bg-red-50",      text: "text-red-700",      border: "border-red-200",     label: "Overdue Follow-Up"   },
      pending:   { bg: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-200",   label: "Follow-Up"           },
    }[followUpStatus || "pending"];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        <CalendarClock className="h-2.5 w-2.5" />
        {cfg.label}
      </span>
    );
  }
  if (kind === "note") {
    const isFollowUpNote = false; // system-generated follow-up notes handled separately
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">
        <StickyNote className="h-2.5 w-2.5" />
        Note
      </span>
    );
  }
  if (kind === "system") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border bg-slate-50 text-slate-600 border-slate-200">
        <Zap className="h-2.5 w-2.5" />
        System
      </span>
    );
  }
  return null;
}

function TimelineDot({ kind, followUpStatus }) {
  if (kind === "followup") {
    const cfg = {
      completed: "bg-emerald-500 ring-emerald-100",
      overdue:   "bg-red-500 ring-red-100",
      pending:   "bg-amber-400 ring-amber-100",
    }[followUpStatus || "pending"];
    return <div className={`h-3 w-3 rounded-full ring-4 ${cfg} shrink-0 mt-1`} />;
  }
  if (kind === "note") {
    return (
      <div className="h-3 w-3 rounded-full bg-blue-400 ring-4 ring-blue-100 shrink-0 mt-1" />
    );
  }
  // system
  return (
    <div className="h-3 w-3 rounded-full bg-slate-300 ring-4 ring-slate-100 shrink-0 mt-1" />
  );
}

// ─── Follow-Up Activity Card ──────────────────────────────────────────────────

function FollowUpCard({ item, onEdit, onDelete, onMarkComplete }) {
  const status   = getFollowUpStatus(item);
  const ModeIcon = MODE_ICONS[item.mode] || CalendarClock;
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);

  const cardBg = {
    completed: "bg-emerald-50/40 border-emerald-100 hover:border-emerald-200",
    overdue:   "bg-red-50/40 border-red-100 hover:border-red-200",
    pending:   "bg-amber-50/30 border-amber-100 hover:border-amber-200",
  }[status];

  return (
    <>
      <div className={`rounded-xl border p-4 transition-all ${cardBg}`}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              status === "completed" ? "bg-emerald-100 text-emerald-600" :
              status === "overdue"   ? "bg-red-100 text-red-600"         :
                                       "bg-amber-100 text-amber-600"
            }`}>
              <ModeIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <ActivityTypeBadge kind="followup" followUpStatus={status} />
                <span className="text-xs font-bold text-slate-700">{item.mode}</span>
                {status === "overdue" && (
                  <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                    <AlertCircle className="h-2.5 w-2.5" /> Overdue
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Scheduled: {formatTs(item.dateTime)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <TooltipProvider>
            <div className="flex items-center gap-0.5 shrink-0">
              {status !== "completed" && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 rounded-lg hover:bg-emerald-500 hover:text-white text-slate-400"
                        onClick={() => setCompleting(true)}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark Complete</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 rounded-lg hover:bg-theme-primary hover:text-white text-slate-400"
                        onClick={() => onEdit(item)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-red-500 hover:text-white text-slate-400"
                    onClick={() => onDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Notes snippet */}
        {item.notes && (
          <div className="mt-3 ml-8">
            <p className={`text-xs text-slate-600 leading-relaxed ${!expanded && "line-clamp-2"}`}>
              {item.notes}
            </p>
            {item.notes.length > 120 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[10px] font-bold text-theme-primary hover:underline flex items-center gap-0.5"
              >
                {expanded ? "Show less" : "Show more"}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* Linked quotations */}
        {Array.isArray(item.quotationNames) && item.quotationNames.filter(Boolean).length > 0 && (
          <div className="mt-2 ml-8 flex flex-wrap gap-1">
            {item.quotationNames.filter(Boolean).map((name, i) => (
              <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                📄 {name}
              </span>
            ))}
          </div>
        )}

        {/* Completion details */}
        {status === "completed" && item.completionNotes && (
          <div className="mt-3 ml-8 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Completion notes</p>
            <p className="text-xs text-emerald-800 leading-relaxed">{item.completionNotes}</p>
          </div>
        )}
        {status === "completed" && item.isColdLead && (
          <div className="mt-2 ml-8">
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
              ❄️ Marked as Cold Lead
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 ml-8 flex items-center gap-3 pt-2 border-t border-black/5">
          <span className="text-[10px] font-black text-theme-primary uppercase tracking-wider">
            {item.agentName || "Agent"}
          </span>
          {item.completedAt && (
            <span className="text-[10px] text-slate-400">
              Completed {formatTs(item.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Complete modal */}
      {completing && (
        <FollowUpCompleteModal
          open={completing}
          followUp={item}
          onClose={() => setCompleting(false)}
          onConfirm={async (notes, isCold, scheduleNext) => {
            await onMarkComplete(item, notes, isCold, scheduleNext);
            setCompleting(false);
          }}
        />
      )}
    </>
  );
}

// ─── Note Activity Card ───────────────────────────────────────────────────────

function NoteCard({ item, onDelete }) {
  const isFollowUpNote = item.text?.startsWith("FOLLOW-UP");
  const isStatusNote = item.text?.startsWith("STATUS:");
  return (
    <div className={`rounded-xl border p-4 transition-all group ${
      isStatusNote
        ? "bg-slate-50 border-slate-200 hover:border-slate-300"
        : isFollowUpNote
          ? "bg-emerald-50/40 border-emerald-100 hover:border-emerald-200"
          : "bg-blue-50/30 border-blue-100 hover:border-blue-200"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`p-1.5 rounded-lg shrink-0 ${
            isStatusNote
              ? "bg-slate-200 text-slate-600"
              : isFollowUpNote ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
          }`}>
            {isStatusNote
              ? <Activity className="h-3.5 w-3.5" />
              : isFollowUpNote ? <CheckCircle2 className="h-3.5 w-3.5" /> : <StickyNote className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <ActivityTypeBadge kind="note" />
              {isFollowUpNote && (
                <span className="text-[10px] font-bold text-emerald-700">Auto-generated</span>
              )}
              {isStatusNote && (
                <span className="text-[10px] font-bold text-slate-600">Status change</span>
              )}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed mt-1.5 break-words">{item.text}</p>
            <div className="mt-2 flex items-center gap-3 pt-2 border-t border-black/5">
              <span className="text-[10px] font-black text-theme-primary uppercase tracking-wider">
                {item.createdBy || "Agent"}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatTs(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity shrink-0 mt-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── System Event Card ────────────────────────────────────────────────────────

function SystemCard({ item }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition-all hover:border-slate-200">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 shrink-0">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ActivityTypeBadge kind="system" />
            <span className="text-xs text-slate-600 font-medium">{item.text || item.message}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            {item.actor && (
              <span className="text-[10px] font-black text-theme-primary uppercase tracking-wider">{item.actor}</span>
            )}
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatTs(item.createdAt || item.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ date }) {
  const d = toDate(date);
  if (!d) return null;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label;
  if (d.toDateString() === today.toDateString()) label = "Today";
  else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
  else label = d.toLocaleString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Add Note Inline Form ─────────────────────────────────────────────────────

function AddNoteForm({ onAdd }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Note cannot be empty");
      inputRef.current?.focus();
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Note too long (max 2000 characters)");
      return;
    }
    setLoading(true);
    try {
      await onAdd(trimmed);
      setText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          placeholder="Add a note… (max 2000 chars)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          disabled={loading}
          className="bg-slate-50 border-slate-200 rounded-xl text-sm pr-12 focus:border-theme-primary focus:ring-theme-primary/20"
        />
        {text.length > 1800 && (
          <span className={`absolute right-3 top-2.5 text-[10px] font-bold ${text.length >= 2000 ? "text-red-500" : "text-amber-500"}`}>
            {2000 - text.length}
          </span>
        )}
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={loading || !text.trim()}
        className="bg-theme-primary rounded-xl shrink-0 h-9 w-9 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ followUps, notes }) {
  const pending   = followUps.filter((f) => f.status !== "Completed").length;
  const overdue   = followUps.filter((f) => f.status !== "Completed" && toDate(f.dateTime) < new Date()).length;
  const completed = followUps.filter((f) => f.status === "Completed").length;

  return (
    <div className="grid grid-cols-4 gap-2">
      {[
        { label: "Total",     value: followUps.length + notes.length, color: "text-slate-700",  bg: "bg-slate-50",   border: "border-slate-200" },
        { label: "Pending",   value: pending,   color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
        { label: "Overdue",   value: overdue,   color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200"   },
        { label: "Completed", value: completed, color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200" },
      ].map((s) => (
        <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-2.5 text-center`}>
          <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityTimeline({
  followUps = [],
  notes = [],
  systemEvents = [],
  leadQuotations = [],
  lead,
  onAddNote,
  onDeleteNote,
  onFollowUpAdd,
  onFollowUpEdit,
  onFollowUpDelete,
  onFollowUpMarkComplete,
}) {
  const [filter, setFilter]           = useState("all");
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [editingFollowUp, setEditingFollowUp]   = useState(null);

  // Build unified sorted timeline
  const timeline = useMemo(
    () => buildTimeline(followUps, notes, systemEvents),
    [followUps, notes, systemEvents]
  );

  // Apply filter
  const filtered = useMemo(() => {
    if (filter === "all") return timeline;
    return timeline.filter((item) => item.kind === filter);
  }, [timeline, filter]);

  // Group by calendar date for separators
  const grouped = useMemo(() => {
    const groups = [];
    let lastDate = null;
    for (const item of filtered) {
      const d = getActivityDate(item);
      const dateStr = d ? d.toDateString() : null;
      if (dateStr !== lastDate) {
        groups.push({ type: "separator", date: d, key: `sep-${dateStr}` });
        lastDate = dateStr;
      }
      groups.push({ type: "item", item, key: item.id || `${item.kind}-${Math.random()}` });
    }
    return groups;
  }, [filtered]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddNote = async (text) => {
    if (typeof onAddNote !== "function") return;
    await onAddNote(text);
  };

  const handleFollowUpSubmit = async (formData) => {
    // Validate required fields
    if (!formData.dateTime) {
      toast.error("Please select a date & time for the follow-up");
      throw new Error("validation");
    }
    if (!formData.mode) {
      toast.error("Please select a follow-up mode");
      throw new Error("validation");
    }
    if (editingFollowUp) {
      await onFollowUpEdit(editingFollowUp.id, formData);
    } else {
      await onFollowUpAdd(formData);
    }
    setShowFollowUpForm(false);
    setEditingFollowUp(null);
  };

  const handleEdit = (item) => {
    setEditingFollowUp(item);
    setShowFollowUpForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this follow-up?")) return;
    await onFollowUpDelete(id);
  };

  const handleDeleteNote = async (id) => {
    if (!confirm("Delete this note?")) return;
    await onDeleteNote(id);
  };

  const handleMarkComplete = async (followUp, notes, isCold, scheduleNext) => {
    if (!notes?.trim()) {
      toast.error("Please enter completion notes");
      throw new Error("validation");
    }
    await onFollowUpMarkComplete(followUp, notes, isCold);
    if (scheduleNext) {
      // Open a fresh follow-up form right after the current one is marked complete
      setEditingFollowUp(null);
      setShowFollowUpForm(true);
    }
  };

  // Overdue & pending counts for header badges
  const overdueCount = followUps.filter(
    (f) => f.status !== "Completed" && toDate(f.dateTime) < new Date()
  ).length;
  const pendingCount = followUps.filter((f) => f.status !== "Completed").length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
        {/* ── Header ── */}
        
        <CardHeader className="border-b border-slate-50 py-4 px-5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="h-4 w-4 text-theme-primary shrink-0" />
              <CardTitle className="text-sm font-bold text-slate-700">Activity Timeline</CardTitle>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {overdueCount} overdue
                </span>
              )}
              {pendingCount > 0 && overdueCount === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black border border-amber-200">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => { setEditingFollowUp(null); setShowFollowUpForm(true); }}
              className="bg-theme-primary text-white rounded-xl h-8 px-3 text-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Follow-Up
            </Button>
          </div>
 {/* ── Note compose bar ── */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/30">
          <AddNoteForm onAdd={handleAddNote} />
        </div>
          {/* Stats */}
          <div className="mt-4">
            <StatsBar followUps={followUps} notes={notes} />
          </div>

          {/* Filter Pills */}
          <div className="mt-3 flex gap-1.5 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  filter === opt.key
                    ? "bg-theme-primary text-white border-theme-primary shadow-sm"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {opt.key === "all" && <Filter className="h-2.5 w-2.5" />}
                {opt.label}
                {opt.key !== "all" && (
                  <span className={`ml-0.5 rounded-full px-1.5 text-[10px] font-black ${
                    filter === opt.key ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {opt.key === "followup" ? followUps.length :
                     opt.key === "note"     ? notes.length     :
                     opt.key === "system"   ? systemEvents.length : 0}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        {/* ── Timeline body ── */}
        <CardContent className="flex-1 overflow-y-auto p-4 max-h-[600px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                <Activity className="h-5 w-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-400 font-medium">
                {filter === "all" ? "No activity yet." : `No ${filter}s yet.`}
              </p>
              {filter === "followup" || filter === "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => { setEditingFollowUp(null); setShowFollowUpForm(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Follow-Up
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-100" />

              <div className="space-y-3 pl-6">
                {grouped.map((entry) => {
                  if (entry.type === "separator") {
                    return (
                      <div key={entry.key} className="-ml-6">
                        <DateSeparator date={entry.date} />
                      </div>
                    );
                  }
                  const { item } = entry;
                  const followUpStatus = item.kind === "followup" ? getFollowUpStatus(item) : null;

                  return (
                    <div key={entry.key} className="relative flex gap-3">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1">
                        <TimelineDot kind={item.kind} followUpStatus={followUpStatus} />
                      </div>

                      {/* Card */}
                      <div className="flex-1 min-w-0">
                        {item.kind === "followup" && (
                          <FollowUpCard
                            item={item}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onMarkComplete={handleMarkComplete}
                          />
                        )}
                        {item.kind === "note" && (
                          <NoteCard item={item} onDelete={handleDeleteNote} />
                        )}
                        {item.kind === "system" && (
                          <SystemCard item={item} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>

       
      </Card>

      {/* ── Follow-Up Form Modal ── */}
      <FollowUpForm
        open={showFollowUpForm}
        onClose={() => { setShowFollowUpForm(false); setEditingFollowUp(null); }}
        onSubmit={handleFollowUpSubmit}
        leadQuotations={leadQuotations}
        initialData={editingFollowUp}
        isEdit={!!editingFollowUp}
      />
    </>
  );
}