"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Briefcase,
  Plus,
  X,
  RefreshCw,
  TrendingUp,
  User,
  PlusSquare,
  UserPlus,
  Trash2,
  FilePlus2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/leads/LeadForm";
import LeadsTable from "@/components/leads/LeadsTable";
import CustomerForm from "@/components/customers/CustomerForm";
import {
  addLead,
  getLeadsByAgent,
  updateLeadStatus,
  deleteLead,
} from "@/firebase/leadsService";
import { addCustomer } from "@/firebase/customersService";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { enquiryInitialValues, normalizeMobile } from "@/lib/enquiryForm";

export default function LeadsPage() {
  const { user } = useSelector((state) => state.auth);
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const overviewMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const quotationSent = leads.filter(
      (lead) => lead.status === "Quotation Sent",
    ).length;
    const closedLost = leads.filter(
      (lead) => lead.status === "Closed Lost",
    ).length;
    const closedWon = leads.filter(
      (lead) => lead.status === "Closed Won",
    ).length;
    const contacted = leads.filter(
      (lead) => lead.status === "Contacted",
    ).length;
    const newLeads = leads.filter((lead) => lead.status === "New").length;

    const conversionRate =
      totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(2) : 0;

    return {
      totalLeads,
      quotationSent,
      closedLost,
      closedWon,
      contacted,
      newLeads,
      conversionRate,
    };
  }, [leads]);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
  });

  const [form, setForm] = useState({
    ...enquiryInitialValues,
    email: "",
    mobile: "",
  });

  // --- Logic Functions ---

  const loadLeads = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const data = await getLeadsByAgent(user.uid);
      setLeads(data);
    } catch (error) {
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "customers"));
      const customerData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customerData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  useEffect(() => {
    loadLeads();
    loadCustomers();
  }, [user?.uid]);

  useEffect(() => {
    if (searchParams.get("open") === "new") {
      setShowAddLead(true);
    }
  }, [searchParams]);

  // Handle Name Search
  const handleNameChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, name: value });
    if (value.length > 1) {
      const filtered = customers.filter(
        (cust) =>
          cust.name.toLowerCase().includes(value.toLowerCase()) ||
          cust.mobile?.includes(value),
      );
      setFilteredCustomers(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCustomer = (customer) => {
    setForm({ ...form, name: customer.name });
    setShowSuggestions(false);
  };

  const handleQuickCustomerSubmit = async (e) => {
    e.preventDefault();
    const tid = toast.loading("Registering customer...");
    try {
      await addCustomer({
        ...customerForm,
        status: "New",
        date: new Date().toLocaleDateString(),
      });
      setForm((prev) => ({ ...prev, name: customerForm.name }));
      setShowQuickAddCustomer(false);
      setShowSuggestions(false);
      loadCustomers();
      toast.success("Customer added!", { id: tid });
    } catch (error) {
      toast.error("Failed to add customer", { id: tid });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Creating lead...");
    try {
      await addLead({
        ...form,
        email: form.email || "",
        mobile: form.mobile ? normalizeMobile(form.mobile) : "",
        agentId: user?.uid || null,
        assignedAgentId: user?.uid || null,
        assignedAgentName: user?.name || "",
        status: "New",
        createdAt: new Date().toISOString(),
      });
      toast.success("Lead added successfully", { id: toastId });
      setShowAddLead(false);
      if (searchParams.get("open") === "new") {
        router.replace("/agent-panel/leads");
      }
      setForm({
        ...enquiryInitialValues,
        email: "",
        mobile: "",
      });
      loadLeads();
    } catch (error) {
      toast.error("Error creating lead", { id: toastId });
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    const tid = toast.loading("Deleting lead...");
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
      toast.success("Lead deleted successfully", { id: tid });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete lead", { id: tid });
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
      `/agent-panel/my-quatation/create?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`,
    );
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50/50 w-full pb-8 sm:pb-12">
      <Toaster position="top-right" />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* OVERVIEW CARDS - CLEAN BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-8">
          
          {/* 1. Main Hero Card (Total & New Leads) - 8 Cols */}
          <div className="col-span-1 md:col-span-12 lg:col-span-8 bg-white rounded-[2rem] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-theme-primary/10 rounded-2xl">
                  <User className="h-6 w-6 text-theme-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Lead Volume</h3>
                  <p className="text-sm text-slate-500">Overall tracking & fresh inquiries</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Leads</p>
                <h4 className="text-5xl md:text-6xl font-black text-slate-900">{overviewMetrics.totalLeads}</h4>
              </div>
              <div className="pl-6 md:pl-8">
                <p className="text-sm font-semibold inline-flex items-center gap-1.5 text-indigo-500 uppercase tracking-wider mb-2">
                  <Plus className="h-4 w-4" /> New This Week
                </p>
                <h4 className="text-5xl md:text-6xl font-black text-indigo-600">{overviewMetrics.newLeads}</h4>
              </div>
            </div>
          </div>

          {/* 2. Conversion Rate (Accent Card) - 4 Cols */}
          <div className="col-span-1 md:col-span-12 lg:col-span-4 bg-theme-primary rounded-[2rem] p-6 md:p-8 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
              <TrendingUp className="w-48 h-48" />
            </div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="p-3 bg-white/20 rounded-2xl w-fit backdrop-blur-md border border-white/20 mb-6">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Conversion Rate</p>
                <div className="flex items-baseline gap-1">
                  <h4 className="text-6xl font-black">{overviewMetrics.conversionRate}</h4>
                  <span className="text-3xl font-bold text-white/80">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Pipeline Metrics - 4 Mini Cards (3 cols each) */}
          {[
            { label: "Contacted", value: overviewMetrics.contacted, icon: RefreshCw, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Quotes Sent", value: overviewMetrics.quotationSent, icon: FilePlus2, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
            { label: "Closed Won", value: overviewMetrics.closedWon, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Closed Lost", value: overviewMetrics.closedLost, icon: X, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          ].map((metric, i) => (
            <div key={i} className="col-span-1 md:col-span-6 lg:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
              <div className={`p-3.5 rounded-2xl ${metric.bg} ${metric.border} border shrink-0`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{metric.label}</p>
                <p className="text-2xl font-black text-slate-800">{metric.value}</p>
              </div>
            </div>
          ))}

        </div>
      
      </main>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-xl sm:rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div className="flex items-center gap-2 sm:gap-3">
                <UserPlus className="h-5 w-5 text-theme-primary" />
                <h2 className="text-lg font-bold">Quick Register Customer</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickAddCustomer(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6">
              <CustomerForm
                form={customerForm}
                onChange={(e) =>
                  setCustomerForm({
                    ...customerForm,

                    [e.target.name]: e.target.value,
                  })
                }
                onSubmit={handleQuickCustomerSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN ADD LEAD MODAL */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-dark/20 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl sm:rounded-2xl shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0 bg-white rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-theme-muted rounded-lg">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-theme-dark">
                  Capture New Inquiry
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAddLead(false);
                  if (searchParams.get("open") === "new") {
                    router.replace("/agent-panel/leads");
                  }
                }}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">
              <div className="relative">
                <LeadForm
                  form={form}
                  nameInputRef={nameInputRef}
                  onChange={(e) => {
                    if (e.target.name === "name") handleNameChange(e);
                    else setForm({ ...form, [e.target.name]: e.target.value });
                  }}
                  onSubmit={handleSubmit}
                />

                {/* DYNAMIC CUSTOMER SUGGESTIONS */}
                {showSuggestions && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 sm:max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] top-30 animate-in fade-in slide-in-from-top-2"
                  >
                    <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-between border-b rounded-t-xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {filteredCustomers.length > 0
                          ? "Matches Found"
                          : "No Matches"}
                      </span>
                    </div>

                    {filteredCustomers.length > 0 ? (
                      <ul className="max-h-60 overflow-y-auto divide-y">
                        {filteredCustomers.map((customer) => (
                          <li
                            key={customer.id}
                            onClick={() => selectCustomer(customer)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-theme-muted/50 cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                {customer.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {customer.mobile}
                              </p>
                            </div>
                            <div className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold uppercase">
                              {customer.city || "N/A"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm italic">
                        Customer not found in database.
                      </div>
                    )}

                    {/* This button stays visible even if filteredCustomers is empty */}
                    <Button
                      type="button"
                      onClick={() => {
                        setCustomerForm((prev) => ({
                          ...prev,
                          name: form.name,
                        }));
                        setShowQuickAddCustomer(true);
                      }}
                      className="w-full bg-theme-primary hover:bg-theme-dark text-white rounded-t-none rounded-b-xl py-6 cursor-pointer"
                    >
                      <PlusSquare className="mr-2 h-4 w-4" />
                      Add New Customer {form.name}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-theme-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-theme-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-theme-dark">
                Travel Leads
              </h1>
            </div>
            <p className="text-slate-500">
              Track and convert travel inquiries into bookings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadLeads}
              disabled={loading}
              className="bg-white"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </Button>
            <Button
              className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg px-6 cursor-pointer"
              onClick={() => setShowAddLead(true)}
            >
              <Plus className="h-5 w-5 mr-2" /> Add Lead
            </Button>
          </div>
        </div>

        {/* TABLE */}
        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <LeadsTable
              leads={leads}
              onStatusChange={handleStatusChange}
              onDeleteLead={handleDeleteLead} // New Prop
              onCreateQuotation={handleCreateQuotation}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
