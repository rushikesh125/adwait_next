"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Plus, ExternalLink, Copy, Calendar, Search,
  MoreVertical, Ticket, Trash2, Edit3, Lock, Globe, FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      console.error(error);
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const updateStatus = async (tripId, newStatus) => {
    try {
      await updateDoc(doc(db, "trips", tripId), { status: newStatus });
      setTrips(trips.map(t => t.id === tripId ? { ...t, status: newStatus } : t));
      toast.success(`Trip is now ${newStatus}`);
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-theme-muted rounded-lg">
              <Ticket className="w-5 h-5 text-theme-primary" />
            </div>
            <h1 className="text-xl font-bold text-theme-dark tracking-tight">Agent Portal</h1>
          </div>
          
          <Link href="./bookingform/create">
            <Button size="sm" className="bg-theme-primary hover:bg-theme-secondary text-white gap-2">
              <Plus className="w-4 h-4" /> Create Trip
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex gap-4">
             <StatMiniCard title="Public Forms" value={trips.filter(t => t.status === 'public').length} />
             <StatMiniCard title="Total" value={trips.length} />
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Filter by name..." 
              className="pl-9 h-10 bg-white border-slate-200 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <Card key={trip.id} className="bg-white border-slate-200 shadow-sm hover:border-theme-accent transition-all overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <StatusBadge status={trip.status} />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <Link href={`./bookingform/create?id=${trip.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit3 className="w-4 h-4 mr-2 text-slate-500" /> Update Details
                          </DropdownMenuItem>
                        </Link>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => updateStatus(trip.id, "public")} disabled={trip.status === 'public'}>
                          <Globe className="w-4 h-4 mr-2 text-green-600" /> Set as Public
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => updateStatus(trip.id, "draft")} disabled={trip.status === 'draft'}>
                          <FileText className="w-4 h-4 mr-2 text-slate-500" /> Set as Draft
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => updateStatus(trip.id, "closed")} disabled={trip.status === 'closed'}>
                          <Lock className="w-4 h-4 mr-2 text-amber-600" /> Set as Closed
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleDelete(trip.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 line-clamp-1 mb-1">
                    {trip.tripName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mb-6">
                    Created {trip.createdAt?.toDate().toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" size="sm" 
                      disabled={trip.status !== 'public'}
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book/${trip.id}`);
                        toast.success("Link copied");
                      }}
                      className="flex-1 h-9 text-[11px] font-bold uppercase border-slate-200 text-slate-600 hover:bg-theme-muted hover:text-theme-primary transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 mr-2" /> Copy Link
                    </Button>
                    <Link href={`/book/${trip.id}`} target="_blank">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 border border-transparent hover:border-slate-200">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    public: { label: "Public", class: "bg-green-50 text-green-700 border-green-200" },
    draft: { label: "Draft", class: "bg-slate-100 text-slate-600 border-slate-200" },
    closed: { label: "Closed", class: "bg-amber-50 text-amber-700 border-amber-200" }
  };
  const active = config[status] || config.draft;
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${active.class}`}>
      {active.label}
    </span>
  );
}

function StatMiniCard({ title, value }) {
  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-lg font-bold text-theme-dark">{value}</p>
    </div>
  );
}