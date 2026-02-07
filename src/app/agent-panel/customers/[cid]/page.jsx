"use client";

import React, { useEffect, useState, use } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { 
  Mail, Phone, MapPin, ArrowLeft, Plus, Calendar, Wallet, FileText, 
  MessageSquare, Send, Clock, Loader2, Trash2, Edit3, Info, 
  ExternalLink, Hotel, Car, Map, User, Hash, Tag
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  getCustomerById, getAgentQuotationsForCustomer, 
  addCustomerNote, getCustomerNotes, deleteCustomerNote, updateCustomerNote 
} from "@/firebase/customersService";
import toast, { Toaster } from "react-hot-toast";

export default function CustomerProfilePage({ params }) {
  const { cid } = use(params);
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const [customer, setCustomer] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  
  // State for the Quotation Detail Modal
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (cid && user?.uid) loadData();
  }, [cid, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customerData, quotesData, notesData] = await Promise.all([
        getCustomerById(cid),
        getAgentQuotationsForCustomer(user.uid, cid),
        getCustomerNotes(cid),
      ]);
      setCustomer(customerData);
      setQuotations(quotesData);
      setNotes(notesData);
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
    } catch (error) { toast.error("Failed to add note"); }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteCustomerNote(cid, noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } catch (error) { toast.error("Delete failed"); }
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
    } catch (error) { toast.error("Update failed"); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-theme-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-10">
      <Toaster position="top-right" />

      {/* HEADER SECTION (Keep your existing header) */}
      <div className="bg-white border-b px-2 md:px-4 lg:px-8 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-xl border-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => router.push(`/agent-panel?customerId=${cid}`)} className="bg-theme-primary text-white px-4 lg:px-6 rounded-xl">
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
                   <Info className="h-4 w-4 text-theme-primary" /> General Information
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-2 pt-4">
                 <h1 className="text-2xl font-bold text-slate-900 capitalize">{customer?.name}</h1>
                 <p className="text-sm text-slate-500 mb-4">Customer ID: {cid}</p>
                 <div className="grid grid-cols-2 gap-4 pb-4">
                   <div className="space-y-1">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                     <Badge className="bg-blue-50 text-theme-primary border-none">{customer?.status || "New"}</Badge>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created On</p>
                     <p className="text-sm font-semibold text-slate-700">{customer?.date}</p>
                   </div>
                 </div>
                 <div className="space-y-4 pt-2">
                   {[{ icon: Mail, label: "Email", value: customer?.email }, { icon: Phone, label: "Mobile", value: customer?.mobile }, { icon: MapPin, label: "Location", value: `${customer?.city}, ${customer?.state}` }].map((item, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                       <item.icon className="h-4 w-4 text-slate-400" />
                       <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</span>
                         <span className="text-sm font-medium text-slate-700">{item.value}</span>
                       </div>
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
                    <div key={note.id} className="group relative bg-slate-50 rounded-xl p-4 border border-transparent hover:border-slate-200 transition-all">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full text-sm p-2 rounded-md border focus:ring-theme-primary outline-none" />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="h-7 bg-theme-primary text-[10px]">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)} className="h-7 text-[10px]">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-black text-theme-primary uppercase">{note.createdBy}</span>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(note)} className="text-slate-400 hover:text-theme-primary"><Edit3 className="h-3 w-3" /></button>
                              <button onClick={() => handleDeleteNote(note.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 italic">"{note.text}"</p>
                          <p className="text-[9px] text-slate-400 mt-2"><Clock className="h-2 w-2 inline mr-1" /> {note.createdAt?.toDate().toLocaleString()}</p>
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
                <div className="p-4 border-t">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <Input placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="flex-1 bg-slate-50 border-none rounded-xl" />
                    <Button type="submit" size="icon" className="bg-theme-primary rounded-xl"><Send className="h-4 w-4" /></Button>
                  </form>
                </div>
             </Card>
          </div>

          {/* RIGHT: QUOTATIONS LIST */}
          <div className="lg:col-span-8">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-full bg-white">
              <CardHeader className="px-8 py-6 border-b border-slate-50">
                <CardTitle className="text-lg font-bold">Package Quotations</CardTitle>
                <p className="text-sm text-slate-500">View and manage itineraries sent to this client.</p>
              </CardHeader>
              <CardContent className="p-0">
                {quotations.map((quote) => (
                  <div key={quote.id} className="p-6 md:p-8 hover:bg-slate-50/50 transition-all flex items-center justify-between border-b last:border-0 border-slate-50">
                    <div className="flex items-center gap-6">
                      <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-theme-primary"><FileText className="h-6 w-6" /></div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-lg">{quote.packageName || "Custom Package"}</h4>
                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {quote.createdAt?.toDate().toLocaleDateString()}</span>
                          <span className="flex items-center gap-1 text-slate-900 font-bold"><Wallet className="h-3 w-3" /> ₹{quote.grandTotal}</span>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5">{quote.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="hover:bg-theme-primary hover:text-white rounded-xl" 
                      onClick={() => handleOpenDetails(quote)}
                    >
                      View Details <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* QUOTATION DETAILS DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl md:max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl">
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
                  <Hotel className="h-4 w-4 text-theme-primary" /> Accommodation details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedQuote?.hotelSummary?.map((hotel, idx) => (
                    <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800">{hotel.hotel}</h4>
                          <Badge className="bg-slate-100 text-slate-600 border-none">{hotel.selectedRoomCategory}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <p>In: <b>{hotel.checkInDate}</b></p>
                          <p>Out: <b>{hotel.checkOutDate}</b></p>
                          <p>Nights: <b>{hotel.nights}</b></p>
                          <p>Meal: <b>{hotel.selectedMealPlan}</b></p>
                        </div>
                        <Separator className="bg-slate-50" />
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-400">Total Price</span>
                           <span className="font-bold text-slate-700">₹{hotel.hotelTotal}</span>
                        </div>
                        {hotel.GoogleListingURL && (
                          <Button variant="link" className="p-0 h-auto text-xs text-theme-primary" onClick={() => window.open(hotel.GoogleListingURL, '_blank')}>
                            View on Google Maps <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        )}
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
                  <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-slate-100">
                    <div className="flex justify-between">
                      <p className="font-bold text-slate-800">{selectedQuote?.transportSummary?.vehicleName}</p>
                      <Badge variant="outline">{selectedQuote?.transportSummary?.ac ? "AC" : "Non-AC"}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                       <span>Seats: {selectedQuote?.transportSummary?.seats}</span>
                       <span>Rate: ₹{selectedQuote?.transportSummary?.price}/km</span>
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
                      <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm flex justify-between items-center border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800">{act.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{act.city}, {act.type}</p>
                        </div>
                        <p className="font-bold text-theme-primary">₹{act.totalPrice}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

            </div>
          </ScrollArea>
          
          <div className="p-6 bg-white border-t flex justify-between items-center">
            <div className="text-xs text-slate-400 font-medium">
              *Markup included: ₹{selectedQuote?.markup || 0}
            </div>
            <Button className="bg-theme-primary rounded-xl" onClick={() => setIsModalOpen(false)}>
              Close Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Separator = ({ className }) => <div className={`h-[1px] w-full ${className}`} />;