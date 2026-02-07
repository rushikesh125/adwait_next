"use client";

import React, { useEffect, useState, use } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { 
  Mail, Phone, MapPin, ArrowLeft, Plus, Calendar, Wallet, FileText, 
  MessageSquare, Send, Clock, Loader2, Trash2, Edit3, Info, 
  ExternalLink, Users, Hotel, Train, ClipboardList, TrendingUp, Car, Map, Tag, User
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  getLeadById, getLeadNotes, addLeadNote, 
  deleteLeadNote, updateLeadNote, getAgentQuotationsForLead 
} from "@/firebase/leadsService";
import toast, { Toaster } from "react-hot-toast";

export default function LeadProfilePage({ params }) {
  const { lid } = use(params);
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const [lead, setLead] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState("");
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

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addLeadNote(lid, newNote, user.displayName || "Agent");
      setNewNote("");
      loadData();
      toast.success("Note added");
    } catch (error) { toast.error("Failed to add note"); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    await deleteLeadNote(lid, noteId);
    setNotes(notes.filter(n => n.id !== noteId));
    toast.success("Note removed");
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-theme-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-10">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="bg-white border-b px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl border-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 capitalize">{lead?.name}</h1>
                <Badge className="bg-orange-50 text-orange-600 border-none px-3">{lead?.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">Inquiry ID: {lid}</p>
            </div>
          </div>
          <Button onClick={() => router.push(`/agent-panel?leadId=${lid}`)} className="bg-theme-primary text-white px-6 rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Create Quotation
          </Button>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: TRIP REQUIREMENTS */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                  <ClipboardList className="h-4 w-4 text-theme-primary" /> Trip Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase">Destination</p>
                    <p className="text-lg font-bold text-slate-800 capitalize">{lead?.destination || lead?.Destination}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100">
                    <p className="text-[10px] font-bold text-green-400 uppercase">Budget</p>
                    <p className="text-lg font-bold text-slate-800">₹{lead?.budget}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {[
                    { icon: Calendar, label: "Travel Date", value: lead?.travelDate },
                    { icon: Clock, label: "Duration", value: `${lead?.days} Days` },
                    { icon: Users, label: "Passengers", value: `${lead?.adults} Adults` },
                    { icon: Hotel, label: "Hotel Stars", value: `${lead?.hotelPreference} Star` },
                    { icon: Train, label: "Preference", value: lead?.transportPreference },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-theme-primary transition-colors">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">User Message</p>
                  <p className="text-sm text-amber-900 italic leading-relaxed">"{lead?.extra_notes}"</p>
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
                  <div key={note.id} className="group relative bg-slate-50 rounded-xl p-4 border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] font-black text-theme-primary uppercase">{note.createdBy}</span>
                      <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600">{note.text}</p>
                    <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                      <Clock className="h-2 w-2" /> {note.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Input placeholder="Note lead progress..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="bg-slate-50 border-none rounded-xl text-sm" />
                  <Button type="submit" size="icon" className="bg-theme-primary rounded-xl shrink-0"><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </Card>
          </div>

          {/* RIGHT: QUOTATIONS LIST */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-full bg-white">
              <CardHeader className="px-8 py-6 border-b border-slate-50">
                <CardTitle className="text-lg font-bold">Package Quotations</CardTitle>
                <p className="text-sm text-slate-500">Track all quotations sent to convert this lead.</p>
              </CardHeader>
              <CardContent className="p-0">
                {quotations.length > 0 ? quotations.map((quote) => (
                  <div key={quote.id} className="p-8 hover:bg-slate-50/50 transition-all flex items-center justify-between border-b last:border-0 border-slate-50">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-theme-primary"><FileText className="h-6 w-6" /></div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-lg">{quote.packageName}</h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {quote.createdAt?.toDate().toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-slate-900 font-bold"><Wallet className="h-3 w-3" /> ₹{quote.grandTotal}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" className="hover:bg-theme-primary hover:text-white rounded-xl" onClick={() => { setSelectedQuote(quote); setIsModalOpen(true); }}>
                      View Details <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )) : (
                  <div className="p-20 text-center space-y-4">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300">
                        <TrendingUp className="h-8 w-8" />
                    </div>
                    <p className="text-slate-400 font-medium">No quotations generated yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* QUOTATION DETAILS DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
          <DialogHeader className="bg-theme-primary p-8 text-white relative">
            <div className="space-y-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none mb-2">Quote ID: {selectedQuote?.id?.slice(-8)}</Badge>
              <DialogTitle className="text-3xl font-bold">{selectedQuote?.packageName}</DialogTitle>
              <DialogDescription className="text-blue-50 flex items-center gap-4">
                <span className="flex items-center gap-1"><User className="h-4 w-4" /> {selectedQuote?.customerName}</span>
                <span className="flex items-center gap-1"><Tag className="h-4 w-4" /> Status: {selectedQuote?.status}</span>
              </DialogDescription>
            </div>
            <div className="absolute top-8 right-8 text-right">
                <p className="text-sm font-medium text-blue-100">Grand Total</p>
                <p className="text-4xl font-black">₹{selectedQuote?.grandTotal?.toLocaleString()}</p>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-8 bg-slate-50">
            <div className="space-y-8">
              
              {/* HOTELS SECTION */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-theme-primary" /> Accommodation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedQuote?.hotelSummary?.map((hotel, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800">{hotel.hotel}</h4>
                          <Badge className="bg-slate-100 text-slate-600 border-none">{hotel.selectedRoomCategory}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                          <p>In: <b>{hotel.checkInDate}</b></p>
                          <p>Out: <b>{hotel.checkOutDate}</b></p>
                          <p>Meal: <b>{hotel.selectedMealPlan}</b></p>
                          <p>Nights: <b>{hotel.nights}</b></p>
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center">
                           <span className="text-[10px] text-slate-400">Hotel Total</span>
                           <span className="text-sm font-bold text-slate-700">₹{hotel.hotelTotal}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* TRANSPORT & ACTIVITIES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Transport */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Car className="h-4 w-4 text-theme-primary" /> Transport
                  </h3>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <p className="font-bold text-slate-800 mb-1">{selectedQuote?.transportSummary?.vehicleName}</p>
                    <div className="flex gap-3 text-xs text-slate-500">
                        <Badge variant="outline" className="font-normal">{selectedQuote?.transportSummary?.ac ? "AC" : "Non-AC"}</Badge>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {selectedQuote?.transportSummary?.seats} Seats</span>
                    </div>
                  </div>
                </section>

                {/* Activities */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Map className="h-4 w-4 text-theme-primary" /> Activities
                  </h3>
                  <div className="space-y-3">
                    {selectedQuote?.activitySummary?.map((act, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{act.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{act.city} • {act.type}</p>
                        </div>
                        <p className="font-bold text-slate-700">₹{act.totalPrice}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-6 bg-white border-t flex justify-end">
            <Button className="bg-theme-primary rounded-xl px-8" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}