"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Plus, ExternalLink, Copy, Search,
  MoreVertical, Ticket, Trash2, Edit3, Lock, Globe, FileText,
  Loader2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import toast from "react-hot-toast";

export default function AgentDashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTrips = async () => {
    if (!auth.currentUser) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, "trips"),
        where("agentId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTrips(data);
    } catch (error) {
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const copyBookingLink = (id) => {
    const link = `${window.location.origin}/book/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const updateStatus = async (tripId, newStatus) => {
    try {
      await updateDoc(doc(db, "trips", tripId), { status: newStatus });
      setTrips(trips.map(t => t.id === tripId ? { ...t, status: newStatus } : t));
      toast.success(`Trip status: ${newStatus}`);
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async (tripId) => {
    if (!confirm("Delete this form permanently?")) return;
    try {
      await deleteDoc(doc(db, "trips", tripId));
      setTrips(trips.filter(t => t.id !== tripId));
      toast.success("Deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const filteredTrips = trips.filter(t => 
    t.tripName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-theme-primary rounded-lg">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Agent Console</h1>
          </div>
          <Link href="./bookingform/create">
            <Button size="sm" className="bg-theme-primary hover:bg-theme-primary/90 text-white font-bold px-4">
              <Plus className="w-4 h-4 mr-1.5" /> New Trip
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8">
          <div className="flex gap-10">
            <StatGroup label="Live Now" value={trips.filter(t => t.status === 'public').length} />
            <StatGroup label="Total Trips" value={trips.length} />
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Filter trips..." 
              className="pl-9 bg-white border-slate-200 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-theme-primary/40" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching Trips</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] font-black text-slate-500 text-[10px] uppercase tracking-wider">Trip Detail</TableHead>
                  <TableHead className="hidden lg:table-cell font-black text-slate-500 text-[10px] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-right font-black text-slate-500 text-[10px] uppercase tracking-wider">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow key={trip.id} className="group transition-colors border-slate-100">
                    <TableCell className="py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 text-base leading-tight">
                          {trip.tripName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {trip.createdAt?.toDate().toLocaleDateString()}
                          </span>
                          <span className="lg:hidden md:inline-block">
                             • <StatusBadge status={trip.status} compact />
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell text-center">
                      <StatusBadge status={trip.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* THE NEW COPY LINK BUTTON */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                disabled={trip.status !== 'public'}
                                onClick={() => copyBookingLink(trip.id)}
                                className="h-9 w-9 border-slate-200 text-slate-600 hover:border-theme-primary hover:text-theme-primary transition-all shadow-sm"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border-none">
                              <p className="text-[10px] font-bold uppercase">Copy Booking Link</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Link href={`/book/${trip.id}`} target="_blank">
                           <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:bg-slate-100">
                              <ExternalLink className="w-4 h-4" />
                           </Button>
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-9 w-9 bg-slate-50 border border-slate-200">
                              <MoreVertical className="w-4 h-4 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-xl border-slate-200">
                            <DropdownMenuItem className="rounded-md font-semibold text-slate-700">
                                <Link href={`./bookingform/create?id=${trip.id}`} className="flex items-center w-full">
                                    <Edit3 className="w-4 h-4 mr-2 text-blue-500" /> Update Trip
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyBookingLink(trip.id)} disabled={trip.status !== 'public'} className="rounded-md font-semibold">
                              <Copy className="w-4 h-4 mr-2 text-slate-400" /> Copy Link
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="my-1.5" />
                            
                            <DropdownMenuItem onClick={() => updateStatus(trip.id, "public")} disabled={trip.status === 'public'} className="rounded-md font-semibold text-green-600 focus:text-green-700 focus:bg-green-50">
                              <Globe className="w-4 h-4 mr-2" /> Publish Live
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(trip.id, "draft")} disabled={trip.status === 'draft'} className="rounded-md font-semibold">
                              <FileText className="w-4 h-4 mr-2" /> Move to Draft
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateStatus(trip.id, "closed")} disabled={trip.status === 'closed'} className="rounded-md font-semibold text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                              <Lock className="w-4 h-4 mr-2" /> Stop Responses
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="my-1.5" />
                            
                            <DropdownMenuItem onClick={() => handleDelete(trip.id)} className="rounded-md font-semibold text-red-600 focus:bg-red-50 focus:text-red-700">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status, compact = false }) {
  const config = {
    public: { label: "Public", class: "bg-green-50 text-green-600 border-green-100" },
    draft: { label: "Draft", class: "bg-slate-100 text-slate-500 border-slate-200" },
    closed: { label: "Closed", class: "bg-amber-50 text-amber-600 border-amber-100" }
  };
  const active = config[status] || config.draft;
  
  if (compact) return <span className={`font-bold uppercase ${active.class.split(' ')[1]}`}>{active.label}</span>;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${active.class}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${status === 'public' ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
      {active.label}
    </span>
  );
}

function StatGroup({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
    </div>
  );
}