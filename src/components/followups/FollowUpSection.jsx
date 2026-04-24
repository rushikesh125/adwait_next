"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Pencil,
  Phone,
  MessageCircle,
  Mail,
  CalendarClock,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FollowUpForm from "./FollowUpForm";

const MODE_ICON = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
};

function formatDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (isNaN(d)) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(dt, status) {
  if (!dt || status === "Completed") return false;
  return new Date(dt) < new Date();
}

function StatusBadgeFollowUp({ status, dateTime }) {
  const overdue = isOverdue(dateTime, status);
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide border border-red-100">
        <AlertCircle className="h-3 w-3" /> Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wide border border-amber-100">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

// ── Completion Modal ────────────────────────────────────────────────────────
function CompletionModal({ followUp, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!notes.trim()) { setErr(true); return; }
    setLoading(true);
    try {
      await onConfirm(followUp, notes.trim());
      onClose();
    } catch (e) {
      console.error("[CompletionModal] error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeInScale 0.16s ease-out" }}
      >
        <style>{`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.96) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Mark as Completed</h3>
              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(followUp?.dateTime)}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Completion Notes <span className="text-red-400">*</span>
            </label>
            <Textarea
              rows={3}
              placeholder="What happened during this follow-up? (required)"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); if (e.target.value.trim()) setErr(false); }}
              className={`rounded-xl text-sm resize-none ${err ? "border-red-300 bg-red-50 focus:border-red-400" : "bg-slate-50 border-slate-200 focus:border-theme-primary"}`}
            />
            {err && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                Notes are required before completing
              </p>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed bg-blue-50/60 rounded-xl px-3 py-2.5 border border-blue-100/60">
            A note will be auto-added to the Notes tab with this follow-up summary.
          </p>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-10 text-sm border-slate-200"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Completing…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark Complete
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Follow-Up Card ──────────────────────────────────────────────────────────
function FollowUpCard({ followUp, onEdit, onDelete, onMarkComplete }) {
  const ModeIcon = MODE_ICON[followUp.mode] || Phone;
  const completed = followUp.status === "Completed";
  const overdue = isOverdue(followUp.dateTime, followUp.status);

  return (
    <div
      className={`rounded-xl border p-4 transition-all group ${
        completed
          ? "bg-emerald-50/40 border-emerald-100"
          : overdue
            ? "bg-red-50/30 border-red-100"
            : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${completed ? "bg-emerald-100" : overdue ? "bg-red-100" : "bg-blue-50"}`}>
            <ModeIcon className={`h-4 w-4 ${completed ? "text-emerald-600" : overdue ? "text-red-500" : "text-theme-primary"}`} />
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-800">
                {formatDateTime(followUp.dateTime)}
              </p>
              <StatusBadgeFollowUp status={followUp.status} dateTime={followUp.dateTime} />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Via</span>
              <span className="text-xs font-semibold text-slate-600">{followUp.mode}</span>
            </div>

            {/* Linked quotations */}
            {followUp.quotationNames?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {followUp.quotationNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 font-semibold"
                  >
                    <FileText className="h-2.5 w-2.5" />
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {followUp.notes && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mt-1">
                {followUp.notes}
              </p>
            )}

            {/* Completion notes */}
            {completed && followUp.completionNotes && (
              <div className="mt-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">
                  Completion Notes
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed">{followUp.completionNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!completed && (
          <TooltipProvider>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                    onClick={() => onMarkComplete(followUp)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Mark Complete</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-theme-muted hover:text-theme-primary"
                    onClick={() => onEdit(followUp)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                    onClick={() => onDelete(followUp.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Delete</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

// ── Main Section ────────────────────────────────────────────────────────────
export default function FollowUpSection({
  followUps = [],
  leadQuotations = [],
  onAdd,
  onEdit,
  onDelete,
  onMarkComplete,
}) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [completingFollowUp, setCompletingFollowUp] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "pending" | "completed"

  const handleEdit = (f) => { setEditing(f); setOpenForm(true); };

  const filtered = followUps.filter((f) => {
    if (activeFilter === "pending") return f.status !== "Completed";
    if (activeFilter === "completed") return f.status === "Completed";
    return true;
  });

  const pendingCount = followUps.filter((f) => f.status !== "Completed").length;
  const completedCount = followUps.filter((f) => f.status === "Completed").length;

  return (
    <>
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="px-6 py-5 border-b border-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800">Follow-Ups</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Track scheduled calls, messages & emails.
              </p>
            </div>
            <Button
              onClick={() => { setEditing(null); setOpenForm(true); }}
              className="bg-theme-primary hover:bg-theme-secondary text-white rounded-xl h-9 px-4 text-sm shadow-sm shadow-theme-primary/20"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New
            </Button>
          </div>

          {/* Summary pills */}
          {followUps.length > 0 && (
            <div className="flex gap-2 mt-4">
              {[
                { key: "all", label: "All", count: followUps.length },
                { key: "pending", label: "Pending", count: pendingCount, color: "amber" },
                { key: "completed", label: "Completed", count: completedCount, color: "green" },
              ].map(({ key, label, count, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    activeFilter === key
                      ? key === "pending"
                        ? "bg-amber-100 border-amber-200 text-amber-800"
                        : key === "completed"
                          ? "bg-emerald-100 border-emerald-200 text-emerald-800"
                          : "bg-theme-muted border-blue-200 text-theme-secondary"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {label}
                  <span
                    className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[9px] font-black ${
                      activeFilter === key ? "bg-white/60" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <CalendarClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">
                  {activeFilter === "completed"
                    ? "No completed follow-ups yet."
                    : activeFilter === "pending"
                      ? "No pending follow-ups."
                      : "No follow-ups scheduled."}
                </p>
                {activeFilter === "all" && (
                  <p className="text-xs text-slate-400 mt-1">
                    Schedule one to stay on top of this lead.
                  </p>
                )}
              </div>
              {activeFilter !== "completed" && (
                <Button
                  onClick={() => { setEditing(null); setOpenForm(true); }}
                  variant="outline"
                  className="rounded-xl h-9 text-sm border-slate-200 text-slate-600"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Schedule Follow-Up
                </Button>
              )}
            </div>
          ) : (
            filtered.map((f) => (
              <FollowUpCard
                key={f.id}
                followUp={f}
                onEdit={handleEdit}
                onDelete={onDelete}
                onMarkComplete={(fu) => setCompletingFollowUp(fu)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Form */}
      <FollowUpForm
        open={openForm}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        onSubmit={(data) => editing ? onEdit(editing.id, data) : onAdd(data)}
        leadQuotations={leadQuotations}
        initialData={editing}
        isEdit={!!editing}
      />

      {/* Completion Modal */}
      {completingFollowUp && (
        <CompletionModal
          followUp={completingFollowUp}
          onClose={() => setCompletingFollowUp(null)}
          onConfirm={onMarkComplete}
        />
      )}
    </>
  );
}