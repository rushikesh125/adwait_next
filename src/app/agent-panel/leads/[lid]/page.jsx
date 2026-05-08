"use client";

import React, { useEffect, useState, use, useRef } from "react";
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
  markLeadAsCold
} from "@/firebase/leadsService";
import {
  addFollowUp,
  getFollowUpsForLead,
  updateFollowUp,
  deleteFollowUp,
} from "@/firebase/followUpService";
import {
  deleteQuotation,
  fetchAllHotels,
  updateQuotation,
} from "@/firebase/quotations"; // ← PATCH 1
import toast, { Toaster } from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import StatusBadge from "@/components/StatusBadge";
import { setEditingQuotation } from "@/store/packageSlice";
import QuotationPreviewModal from "@/app/agent-panel/my-quatation/QuotationPreviewModal";
import {
  buildQuotationSummaryPayload,
  sharePackageSummaryOnWhatsApp,
} from "@/lib/copyPackageSummary";

// ── Follow-up components ──────────────────────────────────────────────────────
import FollowUpSection from "@/components/followups/FollowUpSection";
import FollowUpForm from "@/components/followups/FollowUpForm";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "-";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (isNaN(date)) return "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function buildFollowUpNoteText(followUp, completionNotes) {
  const dt = followUp.dateTime
    ? new Date(followUp.dateTime).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
  return `FOLLOW-UP – ${dt} – ${followUp.mode}: ${completionNotes}`;
}

// ── Quotation-Sent Follow-Up Prompt ───────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
export default function LeadProfilePage({ params }) {
  const { lid } = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // ── Data state ────────────────────────────────────────────────────────────
  const [lead, setLead] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const hotelLookupRef = useRef(null);
  const hotelLookupPromiseRef = useRef(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isLeadEditOpen, setIsLeadEditOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(null);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [activeTab, setActiveTab] = useState("quotations");

  // Quotation-sent → follow-up prompt
  const [pendingFollowUpForQuotation, setPendingFollowUpForQuotation] = useState(null);
  const [showFollowUpAfterQuotationSent, setShowFollowUpAfterQuotationSent] = useState(false);
  const [showFollowUpFormDirect, setShowFollowUpFormDirect] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (lid && user?.uid) loadAll();
  }, [lid, user]);

  useEffect(() => {
    if (!lead) return;
    setLeadForm({
      name: lead.name || "",
      travelDate: lead.travelDate || "",
      days: lead.days || "",
      destination: lead.destination || "",
      adults: lead.adults || "",
      children: lead.children || "",
      hotelPreference: lead.hotelPreference || "",
      transportPreference: lead.transportPreference || "",
      budget: lead.budget || "",
      notes: lead.notes || "",
      mealPlan: lead.mealPlan || "",
      hotelCategory: lead.hotelCategory || "",
      departureCity: lead.departureCity || "",
      tripType: lead.tripType || "",
      rooms: lead.rooms || "",
      childAges: Array.isArray(lead.childAges) ? lead.childAges : [],
      sightseeingVehicle: lead.sightseeingVehicle || "",
      ticketHelp: lead.ticketHelp || [],
      mobile: lead.mobile || lead.phone || "",
      source: lead.source || "",
    });
  }, [lead]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [leadData, quotesData, notesData, fuData] = await Promise.all([
        getLeadById(lid),
        getQuotationsForLead(lid),
        getLeadNotes(lid),
        getFollowUpsForLead(lid),
      ]);
      setLead(leadData);
      setQuotations(quotesData);
      setNotes(notesData);
      setFollowUps(fuData);
      console.log("[LeadProfilePage] Loaded — lead:", leadData?.name, "| quotations:", quotesData.length, "| followUps:", fuData.length);
    } catch (error) {
      console.error("[LeadProfilePage] loadAll error:", error);
      toast.error("Error loading lead data");
    } finally {
      setLoading(false);
    }
  };

  const reloadFollowUps = async () => {
    try {
      const data = await getFollowUpsForLead(lid);
      setFollowUps(data);
    } catch (err) {
      console.error("[LeadProfilePage] reloadFollowUps error:", err);
    }
  };

  const reloadNotes = async () => {
    try {
      const data = await getLeadNotes(lid);
      setNotes(data);
    } catch (err) {
      console.error("[LeadProfilePage] reloadNotes error:", err);
    }
  };

  // ── Notes handlers ─────────────────────────────────────────────────────────
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addLeadNote(lid, newNote.trim(), user.displayName || "Agent");
      setNewNote("");
      await reloadNotes();
      toast.success("Note added");
    } catch (error) {
      console.error("[LeadProfilePage] addNote error:", error);
      toast.error("Failed to add note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteLeadNote(lid, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note removed");
    } catch (err) {
      console.error("[LeadProfilePage] deleteNote error:", err);
      toast.error("Failed to delete note");
    }
  };

  // ── Quotation handlers ─────────────────────────────────────────────────────
  const handleOpenDetails = (quote) => setPreviewQuotation(quote);

  const handleEditQuotation = (quote) => {
    if (!quote?.id) {
      toast.error("Cannot edit: quotation ID missing.");
      return;
    }
    dispatch(setEditingQuotation(JSON.parse(JSON.stringify(quote))));
    const p = new URLSearchParams();
    p.set("quotationId", quote.id);
    p.set("leadId", lid);
    router.push(`/agent-panel/my-quatation/create?${p.toString()}`);
  };

  const handleDeleteQuotation = async (quoteId) => {
    if (!quoteId || !user?.uid) { toast.error("Missing required data"); return; }
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await deleteQuotation(user.uid, quoteId);
      setQuotations((prev) => prev.filter((q) => q.id !== quoteId));
      toast.success("Quotation deleted");
    } catch (error) {
      console.error("[LeadProfilePage] deleteQuotation error:", error);
      toast.error("Failed to delete quotation");
    }
  };

  const getHotelLookup = async () => {
    if (hotelLookupRef.current) return hotelLookupRef.current;

    if (!hotelLookupPromiseRef.current) {
      hotelLookupPromiseRef.current = fetchAllHotels()
        .then((hotels) => {
          hotelLookupRef.current = hotels;
          return hotels;
        })
        .catch((error) => {
          console.error("[LeadProfilePage] fetchAllHotels error:", error);
          return [];
        })
        .finally(() => {
          hotelLookupPromiseRef.current = null;
        });
    }

    return hotelLookupPromiseRef.current;
  };

  const handleShareQuotationOnWhatsApp = async (quote) => {
    const hotels = await getHotelLookup();
    sharePackageSummaryOnWhatsApp(
      buildQuotationSummaryPayload(quote, hotels),
      lead?.mobile || quote?.customerMobile || quote?.mobile || "",
    );
  };

  // ── PATCH 1: Mark quotation as Sent + trigger follow-up prompt ─────────────
  const handleMarkQuotationAsSent = async (quote) => {
    if (quote.status === "Sent") return;
    const tid = toast.loading("Marking as sent…");
    try {
      await updateQuotation(user.uid, quote.id, { status: "Sent" });
      setQuotations((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, status: "Sent" } : q))
      );
      toast.success("Quotation marked as Sent", { id: tid });
      console.log("[LeadProfilePage] Quotation marked Sent, opening follow-up prompt:", quote.id);
      handleQuotationMarkedSent({ ...quote, status: "Sent" });
    } catch (err) {
      console.error("[LeadProfilePage] markQuotationSent error:", err);
      toast.error("Failed to update status", { id: tid });
    }
  };

  const handleQuotationMarkedSent = (quote) => {
    setPendingFollowUpForQuotation(quote);
    setShowFollowUpAfterQuotationSent(true);
  };

  // ── Lead update ────────────────────────────────────────────────────────────
  const handleLeadFormChange = (e) => {
    const { name, value } = e.target;
    setLeadForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateLead = async (e) => {
    e.preventDefault();
    try {
      await updateLeadDetails(lid, leadForm);
      toast.success("Lead updated");
      setIsLeadEditOpen(false);
      loadAll();
    } catch (error) {
      console.error("[LeadProfilePage] updateLead error:", error);
      toast.error("Failed to update lead");
    }
  };

  // ── Follow-Up handlers ─────────────────────────────────────────────────────
  const handleFollowUpAdd = async (formData) => {
    const tid = toast.loading("Scheduling follow-up…");
    try {
      await addFollowUp(lid, {
        ...formData,
        agentId: user?.uid || "",
        agentName: user?.displayName || "Agent",
      });
      toast.success("Follow-up scheduled", { id: tid });
      await reloadFollowUps();
      setActiveTab("followups");
    } catch (err) {
      console.error("[LeadProfilePage] addFollowUp error:", err);
      toast.error("Failed to schedule follow-up", { id: tid });
      throw err;
    }
  };

  const handleFollowUpEdit = async (followUpId, formData) => {
    const tid = toast.loading("Updating follow-up…");
    try {
      await updateFollowUp(lid, followUpId, formData);
      toast.success("Follow-up updated", { id: tid });
      await reloadFollowUps();
    } catch (err) {
      console.error("[LeadProfilePage] editFollowUp error:", err);
      toast.error("Failed to update follow-up", { id: tid });
      throw err;
    }
  };

  const handleFollowUpDelete = async (followUpId) => {
    if (!confirm("Delete this follow-up?")) return;
    const tid = toast.loading("Deleting…");
    try {
      await deleteFollowUp(lid, followUpId);
      setFollowUps((prev) => prev.filter((f) => f.id !== followUpId));
      toast.success("Follow-up removed", { id: tid });
    } catch (err) {
      console.error("[LeadProfilePage] deleteFollowUp error:", err);
      toast.error("Failed to delete", { id: tid });
    }
  };

const handleFollowUpMarkComplete = async (
  followUp,
  completionNotes,
  isColdLead = false
) => {
  const tid = toast.loading(
    isColdLead
      ? "Completing follow-up & marking lead cold…"
      : "Marking as completed…"
  );

  try {
    // Complete follow-up
    await updateFollowUp(lid, followUp.id, {
      status: "Completed",
      completionNotes,
      completedAt: new Date().toISOString(),
      isColdLead,
    });

    // Add lead note
    const noteText = buildFollowUpNoteText(
      followUp,
      completionNotes
    );

    await addLeadNote(
      lid,
      noteText,
      user?.displayName || "Agent"
    );

    // Mark lead as cold
    if (isColdLead) {
      await markLeadAsCold(
        lid,
        completionNotes
      );

      // instant UI update
      setLead((prev) => ({
        ...prev,
        isCold: true,
        status: "Cold Lead",
      }));
    }

    toast.success(
      isColdLead
        ? "Follow-up completed & lead marked cold"
        : "Follow-up completed",
      { id: tid }
    );

    await reloadFollowUps();
    await reloadNotes();

  } catch (err) {
    console.error(
      "[LeadProfilePage] markFollowUpComplete error:",
      err
    );

    toast.error(
      "Failed to complete follow-up",
      { id: tid }
    );

    throw err;
  }
};

  // ── Quotation-sent follow-up prompt handlers ───────────────────────────────
  const handleFollowUpAfterQuotationSentSchedule = () => {
    setShowFollowUpAfterQuotationSent(false);
    setShowFollowUpFormDirect(true);
  };

  const handleFollowUpAfterQuotationSentSkip = () => {
    setShowFollowUpAfterQuotationSent(false);
    setPendingFollowUpForQuotation(null);
  };

  const handleDirectFollowUpSubmit = async (formData) => {
    await handleFollowUpAdd({
      ...formData,
      quotationIds: pendingFollowUpForQuotation
        ? [...new Set([...(formData.quotationIds || []), pendingFollowUpForQuotation.id])]
        : formData.quotationIds,
      quotationNames: pendingFollowUpForQuotation
        ? [...new Set([...(formData.quotationNames || []), pendingFollowUpForQuotation.packageName || ""])]
        : formData.quotationNames,
    });
    setShowFollowUpFormDirect(false);
    setPendingFollowUpForQuotation(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const pendingCount = followUps.filter((f) => f.status !== "Completed").length;

  // PATCH 4: Overdue count for tab badge
  const overdueCount = followUps.filter(
    (f) => f.status !== "Completed" && new Date(f.dateTime) < new Date()
  ).length;

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin h-5 w-5" />
          <span className="text-sm font-medium">Loading lead…</span>
        </div>
      </div>
    );

  const tripFields = [
    { icon: User, label: "Lead Name", value: lead?.name || "-" },
    { icon: Phone, label: "Mobile", value: lead?.mobile || "-", href: lead?.mobile ? `tel:${lead.mobile}` : null },
    { icon: Mail, label: "Email", value: lead?.email || "-" },
    { icon: MapPin, label: "Destination", value: lead?.destination || "-" },
    { icon: Calendar, label: "Travel Date", value: formatDate(lead?.travelDate) },
    { icon: Clock, label: "Duration", value: lead?.days ? `${lead.days} Days` : "-" },
    { icon: MapPin, label: "Departure City", value: lead?.departureCity || "-" },
    { icon: Users, label: "Trip Type", value: lead?.tripType || "-" },
    { icon: Users, label: "Adults", value: lead?.adults ?? "-" },
    { icon: Users, label: "Children", value: lead?.children ?? "0" },
    {
      icon: Hash,
      label: "Child Ages",
      value:
        Array.isArray(lead?.childAges) && lead.childAges.length > 0
          ? lead.childAges.join(", ")
          : "N/A",
    },
    { icon: Hotel, label: "Hotel Preference", value: lead?.hotelPreference || "-" },
    { icon: Tag, label: "Meal Plan", value: lead?.mealPlan || "-" },
    { icon: Hotel, label: "Rooms Required", value: lead?.rooms ? `${lead.rooms}` : "-" },
    { icon: Car, label: "Sightseeing Vehicle", value: lead?.sightseeingVehicle || "-" },
    {
      icon: Train,
      label: "Booking Help",
      value:
        Array.isArray(lead?.ticketHelp) && lead.ticketHelp.length > 0
          ? lead.ticketHelp.join(", ")
          : "-",
    },
  ];

  // PATCH 4: badge color depends on overdue
  const TABS = [
    { key: "quotations", label: "Quotations", count: quotations.length },
    {
      key: "followups",
      label: "Follow-Ups",
      count: pendingCount,
      badge: overdueCount > 0 ? "red" : pendingCount > 0 ? "amber" : null,
    },
    { key: "notes", label: "Notes", count: notes.length },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-10">
      <Toaster position="top-right" />

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      {/* <div className="bg-white border-b px-6 lg:px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-xl border-slate-200 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 capitalize truncate">
                {lead?.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</p>
                  <StatusBadge status={lead?.status || "New"} fallback="New" className="border-none text-xs" />
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created:</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(lead?.createdAt)}</p>
                </div>
                {lead?.mobile && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a href={`tel:${lead.mobile}`} className="text-sm font-semibold text-slate-700 hover:text-theme-primary hover:underline">{lead.mobile}</a>
                  </div>
                )}
                {lead?.email && (
                  <div className="flex items-center gap-1 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <p className="max-w-[220px] truncate text-sm font-semibold text-slate-700">{lead.email}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsLeadEditOpen(true)}
              className="rounded-xl border-slate-200 h-9 px-3 text-sm"
            >
              <Edit3 className="h-4 w-4 mr-1.5" /> Edit Lead
            </Button>
            <Button
              onClick={() => router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)}
              className="bg-theme-primary text-white px-4 rounded-xl h-9 text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Quotation
            </Button>
          </div>
        </div>
      </div> */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-4">
  <div className="max-w-[1600px] mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

    {/* LEFT SIDE */}
    <div className="flex items-start gap-3 w-full">
      
      {/* BACK BUTTON */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => router.back()}
        className="rounded-xl border-slate-200 shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 w-full">

        {/* NAME */}
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 capitalize truncate">
          {lead?.name || "—"}
        </h1>

        {/* DETAILS */}
        <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-2 text-xs sm:text-sm">

          {/* STATUS */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Status:</span>
            <StatusBadge
              status={lead?.status || "New"}
              fallback="New"
              className="border-none text-xs"
            />
          </div>

          {/* CREATED */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Created:</span>
            <span className="text-slate-700 font-medium">
              {formatDate(lead?.createdAt)}
            </span>
          </div>

          {/* MOBILE */}
          {lead?.mobile && (
            <a
              href={`tel:${lead.mobile}`}
              className="flex items-center gap-1.5 text-slate-700 font-medium hover:text-theme-primary"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              <span className="truncate">{lead.mobile}</span>
            </a>
          )}

          {/* EMAIL */}
          {lead?.email && (
            <div className="flex items-center gap-1.5 text-slate-700 font-medium min-w-0">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[220px]">
                {lead.email}
              </span>
            </div>
          )}

        </div>
      </div>
    </div>

    {/* RIGHT SIDE BUTTONS */}
    <div className="flex w-full sm:w-auto gap-2">
      
      <Button
        variant="outline"
        onClick={() => setIsLeadEditOpen(true)}
        className="flex-1 sm:flex-none text-xs sm:text-sm h-9 flex items-center justify-center"
      >
        <Edit3 className="h-4 w-4 mr-1.5" />
        Edit Lead
      </Button>

      <Button
        onClick={() =>
          router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)
        }
        className="flex-1 sm:flex-none bg-theme-primary text-white text-xs sm:text-sm h-9 flex items-center justify-center"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Create Quotation
      </Button>

    </div>

  </div>
</div>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — Trip Requirements */}
          <div className="lg:col-span-4">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 py-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <ClipboardList className="h-4 w-4 text-theme-primary" />
                  Trip Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {tripFields.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 group hover:border-slate-200 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-white text-slate-400 shadow-sm group-hover:text-theme-primary transition-colors shrink-0">
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 leading-none mb-1">
                            {item.label}
                          </p>
                          <p className="break-words text-xs font-bold text-slate-700 leading-snug">
                            {item.href ? (
                              <a href={item.href} className="hover:text-theme-primary hover:underline">{item.value}</a>
                            ) : item.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lead?.notes && (
                    <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Additional Requirements
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">{lead.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Tabs */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Tab Bar */}
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? "bg-theme-primary text-white shadow-md shadow-theme-primary/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-black ${
                        activeTab === tab.key
                          ? "bg-white/20 text-white"
                          : tab.badge === "red"
                            ? "bg-red-100 text-red-700"
                            : tab.badge === "amber"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── QUOTATIONS TAB ────────────────────────────────────────── */}
            {activeTab === "quotations" && (
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="px-6 py-5 border-b border-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Package Quotations</CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Track all quotations sent to convert this lead.
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)}
                      className="bg-theme-primary text-white rounded-xl h-9 px-4 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {quotations.length > 0 ? (
                    quotations.map((quote) => (
                      <div
                        key={quote.id}
                        className="px-6 py-5 hover:bg-slate-50/50 transition-all flex items-center justify-between border-b last:border-0 border-slate-50"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-theme-primary shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-800 text-sm truncate">
                                {quote.packageName}
                              </h4>
                              <StatusBadge
                                status={quote.status || "Draft"}
                                fallback="Draft"
                                className="border-none text-[10px] px-2 py-0 uppercase tracking-wider shrink-0"
                              />
                            </div>
                            {quote.refNumber && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {quote.refNumber}
                              </p>
                            )}
                            {quote.grandTotal > 0 && (
                              <p className="text-xs font-semibold text-theme-primary mt-0.5">
                                ₹{Number(quote.grandTotal).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                        </div>

                        <TooltipProvider>
                          <div className="flex items-center gap-0.5 shrink-0">

                            {/* WhatsApp share */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-lg h-8 w-8 hover:bg-green-500 cursor-pointer hover:text-white text-green-600"
                                  onClick={() => handleShareQuotationOnWhatsApp(quote)}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Share on WhatsApp</TooltipContent>
                            </Tooltip>

                            {/* PATCH 1: Mark as Sent button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`rounded-lg h-8 w-8 transition-colors ${
                                    quote.status === "Sent"
                                      ? "text-amber-500 cursor-default"
                                      : "hover:bg-amber-50 hover:text-amber-600 text-slate-400"
                                  }`}
                                  onClick={() => handleMarkQuotationAsSent(quote)}
                                  disabled={quote.status === "Sent"}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {quote.status === "Sent" ? "Already Sent" : "Mark as Sent"}
                              </TooltipContent>
                            </Tooltip>

                            {/* View */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-lg h-8 w-8 hover:bg-theme-primary cursor-pointer hover:text-white"
                                  onClick={() => handleOpenDetails(quote)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">View Quotation</TooltipContent>
                            </Tooltip>

                            {/* Edit */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-lg h-8 w-8 hover:bg-theme-primary cursor-pointer hover:text-white"
                                  onClick={() => handleEditQuotation(quote)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Quotation</TooltipContent>
                            </Tooltip>

                            {/* Delete */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="rounded-lg h-8 w-8 hover:bg-red-500 cursor-pointer hover:text-white"
                                  onClick={() => handleDeleteQuotation(quote.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Delete Quotation</TooltipContent>
                            </Tooltip>

                          </div>
                        </TooltipProvider>
                      </div>
                    ))
                  ) : (
                    <div className="p-16 text-center space-y-4">
                      <div className="bg-slate-50 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <TrendingUp className="h-7 w-7" />
                      </div>
                      <p className="text-slate-400 font-medium text-sm">No quotations yet.</p>
                      <Button
                        onClick={() => router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)}
                        className="bg-theme-primary text-white rounded-xl h-9 text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Create First Quotation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── FOLLOW-UPS TAB ────────────────────────────────────────── */}
            {activeTab === "followups" && (
              <FollowUpSection
                followUps={followUps}
                leadQuotations={quotations}
                onAdd={handleFollowUpAdd}
                onEdit={handleFollowUpEdit}
                onDelete={handleFollowUpDelete}
                onMarkComplete={handleFollowUpMarkComplete}
              />
            )}

            {/* ── NOTES TAB ─────────────────────────────────────────────── */}
            {activeTab === "notes" && (
              <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col min-h-[500px]">
                <CardHeader className="border-b border-slate-50 py-4 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-theme-primary" /> Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center pt-6">
                      No notes yet. Add one below.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className={`group relative rounded-xl p-4 border transition-all ${
                          note.text?.startsWith("FOLLOW-UP")
                            ? "bg-emerald-50/60 border-emerald-100 hover:border-emerald-200"
                            : "bg-slate-50 border-transparent hover:border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {note.text?.startsWith("FOLLOW-UP") && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            <span className="text-[10px] font-black text-theme-primary uppercase">
                              {note.createdBy}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{note.text}</p>
                        <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                          <Clock className="h-2 w-2" />
                          {note.createdAt?.toDate?.().toLocaleString("en-GB") || "-"}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
                <div className="p-4 border-t">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <Input
                      placeholder="Note lead progress…"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-slate-50 border-none rounded-xl text-sm"
                    />
                    <Button type="submit" size="icon" className="bg-theme-primary rounded-xl shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit Lead Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isLeadEditOpen} onOpenChange={setIsLeadEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              Update this customer enquiry before preparing the quotation.
            </DialogDescription>
          </DialogHeader>
          {leadForm && (
            <LeadForm
              form={leadForm}
              onChange={handleLeadFormChange}
              onSubmit={handleUpdateLead}
              submitLabel="Update Lead"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Quotation Preview Modal ──────────────────────────────────────── */}
      {previewQuotation && (
        <QuotationPreviewModal
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
          onEdit={(q) => {
            setPreviewQuotation(null);
            handleEditQuotation(q);
          }}
        />
      )}

      {/* ── Quotation-Sent Follow-Up Prompt ─────────────────────────────── */}
      <QuotationSentFollowUpPrompt
        open={showFollowUpAfterQuotationSent}
        quotation={pendingFollowUpForQuotation}
        onSchedule={handleFollowUpAfterQuotationSentSchedule}
        onSkip={handleFollowUpAfterQuotationSentSkip}
      />

      {/* ── Direct Follow-Up Form (after quotation sent prompt) ─────────── */}
      <FollowUpForm
        open={showFollowUpFormDirect}
        onClose={() => {
          setShowFollowUpFormDirect(false);
          setPendingFollowUpForQuotation(null);
        }}
        onSubmit={handleDirectFollowUpSubmit}
        leadQuotations={quotations}
        initialData={
          pendingFollowUpForQuotation
            ? {
                dateTime: "",
                mode: "Call",
                notes: `Follow-up for ${pendingFollowUpForQuotation.packageName || "quotation"} – awaiting customer response.`,
                quotationIds: [pendingFollowUpForQuotation.id],
                quotationNames: [pendingFollowUpForQuotation.packageName || ""],
              }
            : null
        }
        isEdit={false}
      />
    </div>
  );
}
