"use client";

import React, { useEffect, useState, use } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  ArrowLeft,
  Plus,
  Calendar,
  FileText,
  Pencil,
  MessageSquare,
  MessageCircle,
  Send,
  Clock,
  Loader2,
  Trash2,
  Edit3,
  ExternalLink,
  Users,
  Hotel,
  Train,
  ClipboardList,
  TrendingUp,
  Car,
  Tag,
  User,
  Hash,
  MapPin,
  CalendarClock,
  CheckCircle2,
  LayoutGrid,
} from "lucide-react";
import LeadForm from "@/components/leads/LeadForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getLeadById,
  getLeadNotes,
  addLeadNote,
  deleteLeadNote,
  getQuotationsForLead,
  updateLeadDetails,
} from "@/firebase/leadsService";
import {
  addFollowUp,
  getFollowUpsForLead,
  updateFollowUp,
  deleteFollowUp,
} from "@/firebase/followUpService";
import { updateQuotation } from "@/firebase/quotations"; // ← PATCH 1
import toast, { Toaster } from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import StatusBadge from "@/components/StatusBadge";
import { setEditingQuotation } from "@/store/packageSlice";
import QuotationPreviewModal from "@/app/agent-panel/my-quotation/QuotationPreviewModal";
import { deleteQuotation } from "@/firebase/quotations";
import { sharePackageSummaryOnWhatsApp } from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";

// ── Follow-up components ──────────────────────────────────────────────────────
import FollowUpSection from "@/components/followups/FollowUpSection";
import FollowUpForm from "@/components/followups/FollowUpForm";
function QuotationSentFollowUpPrompt({ open, quotation, onSchedule, onSkip }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "fadeInScale 0.18s ease-out" }}
      >
        <style>{`
          @keyframes fadeInScale {
            from { opacity: 0; transform: scale(0.96) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-100">
              <CalendarClock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule a Follow-Up?</h3>
              <p className="text-xs text-slate-400 mt-0.5">Quotation has been sent</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            <span className="font-semibold">{quotation?.packageName}</span> was marked as{" "}
            <span className="font-semibold text-amber-600">Sent</span>. Do you want to
            schedule a follow-up to check in with the customer?
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 rounded-xl h-10 text-sm"
          >
            Skip
          </Button>
          <Button
            onClick={onSchedule}
            className="flex-1 rounded-xl h-10 bg-theme-primary hover:bg-theme-secondary text-white text-sm shadow-md shadow-theme-primary/20"
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            Set Follow-Up
          </Button>
        </div>
      </div>
    </div>
  );
}
export default QuotationSentFollowUpPrompt;