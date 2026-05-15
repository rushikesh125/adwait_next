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
  MessageSquare,
  Send,
  Clock,
  Loader2,
  Trash2,
  Edit3,
  Info,
  ExternalLink,
  Hotel,
  Car,
  Map,
  User,
  Hash,
  Tag,
  Eye,
  ClipboardList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getCustomerById,
  getAgentQuotationsForCustomer,
  addCustomerNote,
  getCustomerNotes,
  deleteCustomerNote,
  updateCustomerNote,
  getCustomerLeads,
} from "@/firebase/customersService";
import toast, { Toaster } from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";

export default function CustomerProfilePage({ params }) {
  const { cid } = use(params);
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const [customer, setCustomer] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [customerLeads, setCustomerLeads] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);

  // State for the Quotation Detail Modal
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const customerMetrics = [
    {
      label: "Active Enquiries",
      value: customerLeads.length,
      icon: ClipboardList,
    },
    {
      label: "Package Quotations",
      value: quotations.length,
      icon: FileText,
    },
    {
      label: "Notes",
      value: notes.length,
      icon: MessageSquare,
    },
  ];

  useEffect(() => {
    if (cid && user?.uid) loadData();
  }, [cid, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customerData, quotesData, notesData, leadsData] =
        await Promise.all([
          getCustomerById(cid),
          getAgentQuotationsForCustomer(user.uid, cid),
          getCustomerNotes(cid),
          getCustomerLeads(cid),
        ]);
      setCustomer(customerData);
      setQuotations(quotesData);
      setNotes(notesData);
      setCustomerLeads(leadsData);
    } catch (error) {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  // ... (Keep handleAddNote, handleDeleteNote, handleUpdateNote same as your previous code)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addCustomerNote(cid, newNote, user.displayName || "Agent");
      setNewNote("");
      loadData();
      toast.success("Note added");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteCustomerNote(cid, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Delete failed");
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

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditValue(note.text);
  };

  const handleUpdateNote = async (noteId) => {
    try {
      await updateCustomerNote(cid, noteId, editValue);
      setEditingNoteId(null);
      loadData();
      toast.success("Note updated");
    } catch (error) {
      toast.error("Update failed");
    }
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

      {/* HEADER SECTION (Keep your existing header) */}
      <div className="bg-white border-b px-2 md:px-4 lg:px-8 py-5">
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
          </div>
          <Button
            onClick={() =>
              router.push(`/agent-panel/my-quotation/create?customerId=${cid}`)
            }
            className="bg-theme-primary text-white px-4 lg:px-6 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" /> Generate Quote
          </Button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-2 md:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: INFO & NOTES (Keep your existing Left column code) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader className="border-b border-slate-50 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <Info className="h-4 w-4 text-theme-primary" /> General
                  Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <h1 className="text-2xl font-bold text-slate-900 capitalize">
                  {customer?.name}
                </h1>

                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Status
                    </p>
                    <StatusBadge
                      status={customer?.status || "New"}
                      fallback="New"
                      className="border-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Created On
                    </p>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatDate(customer?.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4 pt-2">
                  {[
                    { icon: Mail, label: "Email", value: customer?.email },
                    { icon: Phone, label: "Mobile", value: customer?.mobile, href: customer?.mobile ? `tel:${customer.mobile}` : null },
                    {
                      icon: MapPin,
                      label: "Location",
                      value: `${customer?.city}, ${customer?.state}`,
                    },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-slate-400" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {item.label}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {item.href ? (
                            <a href={item.href} className="hover:text-theme-primary hover:underline">{item.value}</a>
                          ) : item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {customerMetrics.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-center gap-2 text-slate-400">
                        <Icon className="h-4 w-4" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">
                          {label}
                        </p>
                      </div>
                      <p className="mt-2 text-xl font-bold text-slate-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* NOTES ENGINE (Keep your existing notes code) */}
            <Card className="border-none shadow-sm rounded-2xl flex flex-col h-[500px] bg-white">
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
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full text-sm p-2 rounded-md border focus:ring-theme-primary outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            className="h-7 bg-theme-primary text-[10px]"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingNoteId(null)}
                            className="h-7 text-[10px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] font-black text-theme-primary uppercase">
                            {note.createdBy}
                          </span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(note)}
                              className="text-slate-400 hover:text-theme-primary"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 italic">
                          "{note.text}"
                        </p>
                        <p className="text-[9px] text-slate-400 mt-2">
                          <Clock className="h-2 w-2 inline mr-1" />{" "}
                          {note.createdAt?.toDate().toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-slate-50 border-none rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-theme-primary rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* RIGHT: QUOTATIONS LIST */}
          <div className="lg:col-span-8">
            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="px-8 py-6 border-b border-slate-50">
                  <CardTitle className="text-lg font-bold">
                    Associated Enquiries
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Leads linked to this customer profile.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {customerLeads.length === 0 ? (
                    <div className="px-8 py-10 text-sm text-slate-500">
                      No linked enquiries yet.
                    </div>
                  ) : (
                    customerLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex flex-col gap-4 border-b border-slate-50 p-6 last:border-0 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="font-semibold text-slate-800">
                              {lead.destination || "Travel enquiry"}
                            </h4>
                            <StatusBadge
                              status={lead.status || "New"}
                              fallback="New"
                              className="text-[10px] px-2 py-0 h-5"
                            />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Created: {formatDate(lead.createdAt)}</span>
                            <span>Travel: {formatDate(lead.travelDate)}</span>
                            <span>Duration: {lead.days ? `${lead.days} days` : "-"}</span>
                            <span>Trip: {lead.tripType || "-"}</span>
                            <span>Meal: {lead.mealPlan || "-"}</span>
                            <span>Rooms: {lead.rooms || "-"}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() =>
                              router.push(`/agent-panel/my-quotation/create?leadId=${lead.id}`)
                            }
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Quotation
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-xl hover:bg-theme-primary hover:text-white"
                            onClick={() =>
                              router.push(`/agent-panel/leads/${lead.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Open Lead
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-full bg-white">
                <CardHeader className="px-8 py-6 border-b border-slate-50">
                  <CardTitle className="text-lg font-bold">
                    Package Quotations
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    View and manage itineraries sent to this client.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {quotations.length === 0 ? (
                    <div className="px-8 py-10 text-sm text-slate-500">
                      No package quotations created for this customer yet.
                    </div>
                  ) : (
                    quotations.map((quote) => (
                      <div
                        key={quote.id}
                        className="p-6 md:p-8 hover:bg-slate-50/50 transition-all flex flex-col gap-4 border-b last:border-0 border-slate-50 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex items-center gap-6">
                          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-theme-primary">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-lg">
                              {quote.packageName || "Custom Package"}
                            </h4>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                              {quote.refNumber && <span>Ref: {quote.refNumber}</span>}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />{" "}
                                {quote.createdAt?.toDate().toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1 text-slate-900 font-bold">
                                <Wallet className="h-3 w-3" /> ₹{quote.grandTotal}
                              </span>
                              <StatusBadge
                                status={quote.status || "Draft"}
                                fallback="Draft"
                                className="text-[10px] px-2 py-0 h-5"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() =>
                              router.push(
                                `/agent-panel/my-quotation/create?quotationId=${quote.id}&customerId=${cid}`,
                              )
                            }
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="hover:bg-theme-primary hover:text-white rounded-xl"
                            onClick={() => handleOpenDetails(quote)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      
    </div>
  );
}

const Separator = ({ className }) => (
  <div className={`h-[1px] w-full ${className}`} />
);
