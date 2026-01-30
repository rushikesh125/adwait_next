"use client";

import React, { useEffect, useState } from "react";
import { 
  Briefcase, 
  Plus, 
  X, 
  LayoutGrid, 
  RefreshCw, 
  TrendingUp, 
  Clock 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/leads/LeadForm";
import LeadsTable from "@/components/leads/LeadsTable";
import { addLead, getAllLeads, updateLeadStatus } from "@/firebase/leadsService";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    travelDate: "",
    days: "",
    destination: "",
    adults: "",
    hotelPreference: "",
    transportPreference: "",
    budget: "",
    notes: "",
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await getAllLeads();
      setLeads(data);
      console.log(data)
    } catch (error) {
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation check
    if (!form.name.trim() || !form.destination.trim()) {
    toast.error("Please fill in basic details (Name & Destination)");
    return;
  }

    const toastId = toast.loading("Creating lead...");
    try {
      await addLead({
        ...form,
        status: "New",
        createdAt: new Date().toISOString(),
      });

      toast.success("Lead added successfully", { id: toastId });
      setShowAddLead(false);
      setForm({
        name: "",
        travelDate: "",
        days: "",
        destination: "",
        adults: "",
        hotelPreference: "",
        transportPreference: "",
        budget: "",
        notes: "",
      });
      loadLeads();
    } catch (error) {
      toast.error("Error creating lead", { id: toastId });
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateLeadStatus(id, status);
      toast.success(`Status updated to ${status}`);
      loadLeads();
    } catch (error) {
      toast.error("Status update failed");
    }
  };

  const handleCreateQuotation = (lead) => {
    router.push(
      `/agent-panel?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 w-full pb-12">
      <Toaster position="top-right" />

      {/* Modern Modal Overlay */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-dark/20 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-theme-muted rounded-lg">
                  <Briefcase className="h-5 w-5 text-theme-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-theme-dark">Capture New Inquiry</h2>
                  <p className="text-sm text-slate-500">Enter travel requirements and preferences</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddLead(false)}
                className="rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <LeadForm
                form={form}
                onChange={(e) =>
                  setForm({ ...form, [e.target.name]: e.target.value })
                }
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-theme-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-theme-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-theme-dark">Travel Leads</h1>
            </div>
            <p className="text-slate-500">Track and convert travel inquiries into bookings.</p>
          </div>

          <div className="flex items-center gap-3">
             <Button
              variant="outline"
              onClick={loadLeads}
              disabled={loading}
              className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20 px-6" 
              onClick={() => setShowAddLead(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-muted rounded-full text-theme-primary text-xs font-bold uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Active Pipeline
              </div>
              <div className="h-4 w-[1px] bg-slate-200" />
              <span className="text-sm text-slate-500 font-medium">
                Total {leads.length} inquiries found
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="min-h-[400px]">
              <LeadsTable
                leads={leads}
                onStatusChange={handleStatusChange}
                onCreateQuotation={handleCreateQuotation}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}