"use client";
import React, { useEffect, useState } from "react";
import { db, auth } from "@/firebase/config";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "firebase/firestore";
import { 
  Search, Copy, Edit3, Trash2, ExternalLink, Filter, Train, Calendar, Users 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function CreatedFormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchForms = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "trips"),
        where("agentId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setForms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this form?")) {
      await deleteDoc(doc(db, "trips", id));
      setForms(forms.filter(f => f.id !== id));
      toast.success("Form deleted");
    }
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/book/${id}`);
    toast.success("Link copied!");
  };

  const filteredForms = forms.filter(f => 
    f.tripName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-theme-dark tracking-tight">Active Booking Forms</h1>
            <p className="text-slate-500">Manage your generated links and track passenger entries.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search trip name..." 
                className="pl-10 w-64 bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="bg-white border-slate-200 hover:bg-slate-50">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </div>

        {/* List of Forms */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white animate-pulse rounded-2xl border border-slate-100" />)}
          </div>
        ) : filteredForms.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredForms.map((form) => (
              <div 
                key={form.id} 
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Info Part */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="bg-theme-muted p-4 rounded-2xl shrink-0">
                    <Train className="w-6 h-6 text-theme-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-theme-dark">{form.tripName}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center text-xs font-semibold text-slate-500">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-theme-secondary" />
                        {form.createdAt?.toDate().toLocaleDateString()}
                      </span>
                      <span className="flex items-center text-xs font-semibold text-slate-500">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-theme-secondary" />
                        {form.journeys?.length} Segments
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Part */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => copyLink(form.id)}
                    className="text-theme-primary hover:bg-theme-muted font-bold"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copy Link
                  </Button>
                  
                  <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden lg:block" />
                  
                  <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-600">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  
                  <a href={`/book/${form.id}`} target="_blank">
                    <Button variant="ghost" size="icon" className="hover:bg-slate-100 text-slate-600">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(form.id)}
                    className="hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-medium">No forms found. Create your first one to see it here!</p>
          </div>
        )}
      </div>
    </div>
  );
}