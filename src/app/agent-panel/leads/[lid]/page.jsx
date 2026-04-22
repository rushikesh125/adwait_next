"use client";

import React, { useEffect, useState, use } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Plus,
  Calendar,
  Wallet,
  FileText,
  Pencil,
  MessageSquare,
  MessageCircle,
  Send,
  Clock,
  Loader2,
  Trash2,
  Edit3,
  Info,
  ExternalLink,
  Users,
  Hotel,
  Train,
  ClipboardList,
  TrendingUp,
  Car,
  Map,
  Tag,
  User,
  Star,
  Hash,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getLeadById,
  getLeadNotes,
  addLeadNote,
  deleteLeadNote,
  updateLeadNote,
  getQuotationsForLead,
  updateLeadDetails,
} from "@/firebase/leadsService";
import toast, { Toaster } from "react-hot-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import StatusBadge from "@/components/StatusBadge";
import { setEditingQuotation } from "@/store/packageSlice";

// ── Use the new preview modal instead of QuotationModals ──────────────────────
import QuotationPreviewModal from "@/app/agent-panel/my-quatation/QuotationPreviewModal";
import { deleteQuotation } from "@/firebase/quotations";
import {
  sharePackageSummaryOnWhatsApp,
} from "@/lib/copyPackageSummary";
import { normaliseQuotation } from "@/lib/quotationAdapter";

export default function LeadProfilePage({ params }) {
  const { lid } = use(params);
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [lead, setLead] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isLeadEditOpen, setIsLeadEditOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Preview modal state ───────────────────────────────────────────────────
  const [previewQuotation, setPreviewQuotation] = useState(null);

  useEffect(() => {
    if (lid && user?.uid) loadData();
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
    });
  }, [lead]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadData, quotesData, notesData] = await Promise.all([
        getLeadById(lid),
        getQuotationsForLead(lid),
        getLeadNotes(lid),
      ]);
      setLead(leadData);
      setQuotations(quotesData);
      setNotes(notesData);
    } catch (error) {
      toast.error("Error loading lead");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    let date;
    if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }
    if (isNaN(date)) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addLeadNote(lid, newNote, user.displayName || "Agent");
      setNewNote("");
      loadData();
      toast.success("Note added");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  // ── Open preview modal ────────────────────────────────────────────────────
  const handleOpenDetails = (quote) => {
    setPreviewQuotation(quote);
  };

  // ── Edit: store in Redux + navigate to create page with both IDs ──────────
  const handleEditQuotation = (quote) => {
    if (!quote?.id) {
      toast.error("Cannot edit: quotation ID missing.");
      return;
    }
    // Deep-clone to avoid Redux serialization issues
    dispatch(setEditingQuotation(JSON.parse(JSON.stringify(quote))));

    const params = new URLSearchParams();
    params.set("quotationId", quote.id);
    params.set("leadId", lid); // keeps lead association on save

    router.push(`/agent-panel/my-quatation/create?${params.toString()}`);
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    await deleteLeadNote(lid, noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
    toast.success("Note removed");
  };

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
      loadData();
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };
  const handleDeleteQuotation = async (quoteId) => {
    if (!quoteId || !user?.uid) {
      toast.error("Missing required data");
      return;
    }

    const confirmDelete = confirm(
      "Are you sure you want to delete this quotation?",
    );
    if (!confirmDelete) return;

    try {
      await deleteQuotation(user.uid, quoteId); // ✅ pass agentId

      setQuotations((prev) => prev.filter((q) => q.id !== quoteId));

      toast.success("Quotation deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete quotation");
    }
  };

  const handleShareQuotationOnWhatsApp = (quote) => {
    sharePackageSummaryOnWhatsApp(
      {
        ...normaliseQuotation(quote),
        hotels: [],
      },
      lead?.mobile || quote?.customerMobile || quote?.mobile || "",
    );
  };
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-theme-primary" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-10">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white border-b px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-xl border-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 capitalize">
                {lead?.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Status:
                  </p>
                  <StatusBadge
                    status={lead?.status || "New"}
                    fallback="New"
                    className="border-none text-xs"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Created On:
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(lead?.createdAt)}
                  </p>
                </div>
                {lead?.mobile && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">
                      {lead.mobile}
                    </p>
                  </div>
                )}
                {lead?.email && (
                  <div className="flex items-center gap-1 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <p className="max-w-[260px] truncate text-sm font-semibold text-slate-700">
                      {lead.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsLeadEditOpen(true)}
              className="rounded-xl border-slate-200"
            >
              <Edit3 className="h-4 w-4 mr-2" /> Edit Lead
            </Button>
            <Button
              onClick={() =>
                router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)
              }
              className="bg-theme-primary text-white px-6 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" /> Create Quotation
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: TRIP REQUIREMENTS */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <ClipboardList className="h-4 w-4 text-theme-primary" />
                  Trip Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: User,
                      label: "Lead Name",
                      value: lead?.name || "-",
                    },
                    {
                      icon: Phone,
                      label: "Mobile",
                      value: lead?.mobile || "-",
                    },
                    {
                      icon: Mail,
                      label: "Email",
                      value: lead?.email || "-",
                    },
                    {
                      icon: MapPin,
                      label: "Destination",
                      value: lead?.destination || "-",
                    },
                    {
                      icon: Calendar,
                      label: "Travel Date",
                      value: formatDate(lead?.travelDate),
                    },
                    {
                      icon: Clock,
                      label: "Duration",
                      value: lead?.days ? `${lead.days} Days` : "-",
                    },
                    {
                      icon: MapPin,
                      label: "Departure City",
                      value: lead?.departureCity || "-",
                    },
                    {
                      icon: Users,
                      label: "Trip Type",
                      value: lead?.tripType || "-",
                    },
                    {
                      icon: Users,
                      label: "Adults",
                      value: lead?.adults ?? "-",
                    },
                    {
                      icon: Users,
                      label: "Children",
                      value: lead?.children ?? "0",
                    },
                    {
                      icon: Hash,
                      label: "Child Ages",
                      value:
                        Array.isArray(lead?.childAges) && lead.childAges.length > 0
                          ? lead.childAges.join(", ")
                          : lead?.children
                            ? "-"
                            : "N/A",
                    },
                    {
                      icon: Hotel,
                      label: "Hotel Preference",
                      value: lead?.hotelPreference || "-",
                    },
                    {
                      icon: Tag,
                      label: "Meal Plan",
                      value: lead?.mealPlan || "-",
                    },
                    {
                      icon: Hotel,
                      label: "Rooms Required",
                      value: lead?.rooms ? `${lead.rooms}` : "-",
                    },
                    {
                      icon: Car,
                      label: "Sightseeing Vehicle",
                      value: lead?.sightseeingVehicle || "-",
                    },
                    {
                      icon: Train,
                      label: "Booking Help",
                      value:
                        Array.isArray(lead?.ticketHelp) &&
                        lead.ticketHelp.length > 0
                          ? lead.ticketHelp.join(", ")
                          : "-",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors group hover:border-slate-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white text-slate-400 shadow-sm group-hover:text-theme-primary transition-colors">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-bold text-slate-700">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {lead?.notes && (
                    <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <p className="text-xs font-semibold text-slate-500 mb-1">
                        Additional Requirements
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {lead.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* INTERNAL NOTES */}
            <Card className="border-none shadow-sm rounded-2xl flex flex-col h-[450px] bg-white">
              <CardHeader className="border-b border-slate-50 py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-theme-primary" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {notes.length === 0 && (
                  <p className="text-xs text-slate-400 text-center pt-6">
                    No notes yet. Add one below.
                  </p>
                )}
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group relative bg-slate-50 rounded-xl p-4 border border-transparent hover:border-slate-200 transition-all"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-black text-theme-primary uppercase">
                        {note.createdBy}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600">{note.text}</p>
                    <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="h-2 w-2" />{" "}
                      {note.createdAt?.toDate().toLocaleString("en-GB")}
                    </p>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input
                    placeholder="Note lead progress..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="bg-slate-50 border-none rounded-xl text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-theme-primary rounded-xl shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* RIGHT: QUOTATIONS LIST */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-full bg-white">
              <CardHeader className="px-8 py-6 border-b border-slate-50">
                <CardTitle className="text-lg font-bold">
                  Package Quotations
                </CardTitle>
                <p className="text-sm text-slate-500">
                  Track all quotations sent to convert this lead.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {quotations.length > 0 ? (
                  quotations.map((quote) => (
                    <div
                      key={quote.id}
                      className="p-8 hover:bg-slate-50/50 transition-all flex items-center justify-between border-b last:border-0 border-slate-50"
                    >
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-theme-primary">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-slate-800 text-lg">
                              {quote.packageName}
                            </h4>
                            <StatusBadge
                              status={quote.status || "Draft"}
                              fallback="Draft"
                              className="border-none text-[10px] px-2 py-0 uppercase tracking-wider"
                            />
                          </div>
                          {quote.refNumber && (
                            <p className="text-xs text-slate-400 font-mono">
                              Ref: {quote.refNumber}
                            </p>
                          )}
                          {quote.grandTotal > 0 && (
                            <p className="text-sm font-semibold text-theme-primary">
                              ₹
                              {Number(quote.grandTotal).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      </div>

                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          {/* View — opens QuotationPreviewModal */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-green-500 cursor-pointer hover:text-white text-green-600"
                                onClick={() => handleShareQuotationOnWhatsApp(quote)}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Share on WhatsApp
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-theme-primary cursor-pointer hover:text-white"
                                onClick={() => handleOpenDetails(quote)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              View Quotation
                            </TooltipContent>
                          </Tooltip>

                          {/* Edit — redirects to Create_new_package in edit mode */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-theme-primary cursor-pointer hover:text-white"
                                onClick={() => handleEditQuotation(quote)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Edit Quotation
                            </TooltipContent>
                          </Tooltip>
                          {/* Delete */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-red-500 cursor-pointer hover:text-white"
                                onClick={() => handleDeleteQuotation(quote.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Delete Quotation
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                    <p className="text-slate-400 font-medium">
                      No quotations generated yet.
                    </p>
                    <Button
                      onClick={() =>
                        router.push(
                          `/agent-panel/my-quatation/create?leadId=${lid}`,
                        )
                      }
                      className="bg-theme-primary text-white rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create First Quotation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* ── Edit Lead Dialog ── */}
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

      {/* ── Quotation Preview Modal ── */}
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
    </div>
  );
}
