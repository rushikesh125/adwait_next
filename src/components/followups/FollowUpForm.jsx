"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Phone,
  MessageCircle,
  Mail,
  FileText,
} from "lucide-react";

const MODES = [
  { label: "Call", icon: Phone },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Email", icon: Mail },
];

export default function FollowUpForm({
  open,
  onClose,
  onSubmit,
  leadQuotations = [],
  initialData = null,
  isEdit = false,
}) {
  const [form, setForm] = useState({
    dateTime: "",
    mode: "Call",
    notes: "",
    quotationIds: [],
    quotationNames: [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          dateTime: initialData.dateTime || "",
          mode: initialData.mode || "Call",
          notes: initialData.notes || "",
          quotationIds: initialData.quotationIds || [],
          quotationNames: initialData.quotationNames || [],
        });
      } else {
        setForm({ dateTime: "", mode: "Call", notes: "", quotationIds: [], quotationNames: [] });
      }
      setErrors({});
    }
  }, [initialData, open]);

  const validate = () => {
    const err = {};
    if (!form.dateTime) err.dateTime = "Date & time is required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const toggleQuotation = (q) => {
    setForm((prev) => {
      const exists = prev.quotationIds.includes(q.id);
      return {
        ...prev,
        quotationIds: exists
          ? prev.quotationIds.filter((id) => id !== q.id)
          : [...prev.quotationIds, q.id],
        quotationNames: exists
          ? prev.quotationNames.filter((n) => n !== (q.packageName || ""))
          : [...prev.quotationNames, q.packageName || ""],
      };
    });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
      setForm({ dateTime: "", mode: "Call", notes: "", quotationIds: [], quotationNames: [] });
    } catch (err) {
      console.error("[FollowUpForm] submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <CalendarClock className="h-5 w-5 text-theme-primary" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-800">
              {isEdit ? "Edit Follow-Up" : "Schedule Follow-Up"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Date & Time */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Date & Time <span className="text-red-400">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={form.dateTime}
              onChange={(e) => {
                setForm({ ...form, dateTime: e.target.value });
                if (errors.dateTime) setErrors((p) => ({ ...p, dateTime: null }));
              }}
              className={`rounded-xl h-10 text-sm ${errors.dateTime ? "border-red-300 bg-red-50" : "bg-slate-50 border-slate-200"}`}
            />
            {errors.dateTime && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                {errors.dateTime}
              </p>
            )}
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Contact Mode <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              {MODES.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setForm({ ...form, mode: label })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    form.mode === label
                      ? "bg-theme-primary border-theme-primary text-white shadow-sm shadow-theme-primary/25"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-theme-primary/40 hover:text-theme-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Linked Quotations (optional) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Link Quotations
              </Label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {leadQuotations.length === 0 ? (
                <div className="p-4 flex items-center gap-2 text-slate-400">
                  <FileText className="h-4 w-4" />
                  <p className="text-xs">No quotations available for this lead</p>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                  {leadQuotations.map((q) => {
                    const checked = form.quotationIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        htmlFor={`q-${q.id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          checked ? "bg-blue-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          id={`q-${q.id}`}
                          checked={checked}
                          onCheckedChange={() => toggleQuotation(q)}
                          className="data-[state=checked]:bg-theme-primary data-[state=checked]:border-theme-primary"
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-700 truncate">
                            {q.packageName || "Unnamed"}
                          </span>
                          {q.status && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                              {q.status}
                            </Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</Label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add follow-up context or reminders…"
              rows={3}
              className="rounded-xl bg-slate-50 border-slate-200 text-sm resize-none focus:border-theme-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl h-10 text-sm border-slate-200"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl h-10 bg-theme-primary hover:bg-theme-secondary text-white text-sm shadow-sm shadow-theme-primary/25"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {isEdit ? "Updating…" : "Scheduling…"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                {isEdit ? "Update Follow-Up" : "Schedule Follow-Up"}
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}