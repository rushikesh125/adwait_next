"use client";

import React, { useEffect, useState, use } from "react";
import { useSelector } from "react-redux";
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
} from "lucide-react";
import QuotationModals from "@/app/agent-panel/my-quatation/QuotationModals";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getLeadById,
  getLeadNotes,
  addLeadNote,
  deleteLeadNote,
  updateLeadNote,
  getAgentQuotationsForLead,
} from "@/firebase/leadsService";
import toast, { Toaster } from "react-hot-toast";
import { icon } from "@fortawesome/fontawesome-svg-core";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LeadProfilePage({ params }) {
  const { lid } = use(params);
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const [lead, setLead] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (lid && user?.uid) loadData();
  }, [lid, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadData, quotesData, notesData] = await Promise.all([
        getLeadById(lid),
        getAgentQuotationsForLead(user.uid, lid),
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

    // Firestore Timestamp
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

  const handleOpenDetails = (quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleEditQuotation = (quote) => {
    // deep copy to avoid mutating original data
    const deepCopy = JSON.parse(JSON.stringify(quote));
    setEditingQuotation(deepCopy);
    setIsEditModalOpen(true);
  };
  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    await deleteLeadNote(lid, noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
    toast.success("Note removed");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditingQuotation((prev) => ({
      ...prev,
      [name]: value,
    }));
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
              <div className="flex items-center gap-4 pb-4 flex-nowrap">
                {/* STATUS */}
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Status:
                  </p>
                  <Badge className="bg-blue-50 text-theme-primary border-none lowercase text-xs">
                    {lead?.status || "new"}
                  </Badge>
                </div>

                {/* CREATED ON */}
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Created On:
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(lead?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={() => router.push(`/agent-panel/my-quatation/create?leadId=${lid}`)}
            className="bg-theme-primary text-white px-6 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" /> Create Quotation
          </Button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: TRIP REQUIREMENTS */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 ">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <ClipboardList className="h-4 w-4 text-theme-primary" />
                  Trip Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className=" space-y-4">
                <div className="space-y-4">
                  {[
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
                      icon: Hotel,
                      label: "Hotel Preference",
                      value: lead?.hotelPreference || "-",
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
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-theme-primary transition-colors">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                  {lead?.notes && (
                    <div className="pt-4 border-t">
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
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-slate-800 text-lg">
                            {quote.packageName}
                          </h4>
                          <Badge
                            className={`
      text-[10px] px-2 py-0 border-none uppercase tracking-wider
      ${
        quote.status === "confirmed"
          ? "bg-emerald-50 text-emerald-600"
          : quote.status === "rejected"
            ? "bg-rose-50 text-rose-600"
            : "bg-blue-50 text-blue-600"
      }
    `}
                          >
                            {quote.status || "Draft"}
                          </Badge>
                        </div>
                      </div>

                      <TooltipProvider>
                        <div className="flex items-center gap-1">
                          {/* View Quotation */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-theme-primary hover:text-white"
                                onClick={() => handleOpenDetails(quote)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              View Quotation
                            </TooltipContent>
                          </Tooltip>
                          {/* Edit Quotation */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-lg hover:bg-theme-primary hover:text-white"
                                onClick={() =>
                                  router.push(
                                    `/agent-panel/my-quatation/edit/${lid}`,
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Edit Quotation
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <QuotationModals
        isViewModalOpen={isModalOpen}
        setIsViewModalOpen={setIsModalOpen}
        viewingQuotation={selectedQuote}
        /* EDIT MODE */
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingQuotation={editingQuotation}
        handleEditChange={handleEditChange}
        /* keep rest as-is */
        AllDestinations={[]}
        SelectedDestination={null}
        setSelectedDestination={() => {}}
        selectedHotelToAdd={null}
        setSelectedHotelToAdd={() => {}}
        allHotels={[]}
        handleAddHotel={() => {}}
        handleRemoveHotel={() => {}}
        handleHotelChange={() => {}}
        handleHotelSummaryChange={() => {}}
        getAvailableMealPlans={() => []}
        toggleValue={false}
        handleToggle={() => {}}
        handleTransportSummaryChange={() => {}}
        selectedTransportStateId={null}
        setSelectedTransportStateId={() => {}}
        transportStates={[]}
        toTitleCase={(v) => v}
        handlePackageChange={() => {}}
        availableTransportPackagesForSelectedState={[]}
        handleVehicleChange={() => {}}
        isFetchingActivities={false}
        selectedActivityToAdd={null}
        setSelectedActivityToAdd={() => {}}
        availableActivities={[]}
        handleAddActivity={() => {}}
        handleRemoveActivity={() => {}}
        handleActivitySummaryChange={() => {}}
        handleMarkupInputChange={() => {}}
        handleUpdateQuotation={() => {}}
        handleSaveAs={() => {}}
        showSaveAsModal={false}
        setShowSaveAsModal={() => {}}
        newPackageName=""
        setNewPackageName={() => {}}
        newCustomerName=""
        setNewCustomerName={() => {}}
        handleConfirmSaveAs={() => {}}
      />
    </div>
  );
}
