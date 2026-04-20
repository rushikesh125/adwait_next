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
  Clock3,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
  cloneLead,
  rejectAllQuotationsForLead,
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
  const [statusFilter, setStatusFilter] = useState("All");
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
    const activePipeline = newLeads + contacted + quotationSent;
    const needsAttention = newLeads + contacted;

    const conversionRate =
      totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(2) : 0;

    return {
      totalLeads,
      quotationSent,
      closedLost,
      closedWon,
      contacted,
      newLeads,
      activePipeline,
      needsAttention,
      conversionRate,
    };
  }, [leads]);

  const statusCards = [
    {
      key: "All",
      label: "All Leads",
      value: overviewMetrics.totalLeads,
      helper: "Complete enquiry base",
      icon: Briefcase,
      tone: "border-slate-200 bg-white text-slate-900",
      iconTone: "bg-slate-100 text-slate-700",
    },
    {
      key: "New",
      label: "New",
      value: overviewMetrics.newLeads,
      helper: "Fresh enquiries",
      icon: Plus,
      tone: "border-blue-200 bg-blue-50 text-blue-900",
      iconTone: "bg-blue-100 text-blue-700",
    },
    {
      key: "Contacted",
      label: "Contacted",
      value: overviewMetrics.contacted,
      helper: "Follow-up in progress",
      icon: RefreshCw,
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      iconTone: "bg-amber-100 text-amber-700",
    },
    {
      key: "Quotation Sent",
      label: "Quotation Sent",
      value: overviewMetrics.quotationSent,
      helper: "Awaiting decision",
      icon: FilePlus2,
      tone: "border-violet-200 bg-violet-50 text-violet-900",
      iconTone: "bg-violet-100 text-violet-700",
    },
    {
      key: "Closed Won",
      label: "Closed Won",
      value: overviewMetrics.closedWon,
      helper: "Successful conversions",
      icon: TrendingUp,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      iconTone: "bg-emerald-100 text-emerald-700",
    },
    {
      key: "Closed Lost",
      label: "Closed Lost",
      value: overviewMetrics.closedLost,
      helper: "Dropped enquiries",
      icon: X,
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      iconTone: "bg-rose-100 text-rose-700",
    },
  ];

  const primaryInsight =
    overviewMetrics.newLeads > 0
      ? `${overviewMetrics.newLeads} new lead(s) are waiting for first contact.`
      : overviewMetrics.quotationSent > 0
        ? `${overviewMetrics.quotationSent} lead(s) already have quotations sent and need follow-up.`
        : "Your lead pipeline is up to date right now.";
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
    setForm((prev) => ({ ...prev, name: value }));
    setSelectedCustomer(null); // ❗ user is typing → unlink customer
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
    setForm((prev) => ({
      ...prev,
      name: customer.name,
      mobile: customer.mobile || "",
      email: customer.email || "",
    }));

    setSelectedCustomer(customer); // 🔥 store full object
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

        customerId: selectedCustomer?.id || null, // 🔥 LINK
        customerName: selectedCustomer?.name || form.name, // optional but useful

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
    }finally{
      setSelectedCustomer(null);
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
  const tid = toast.loading("Updating status...");

  try {
    await updateLeadStatus(id, status);

    if (status === "Closed Lost") {
      await rejectAllQuotationsForLead(id);
    }

    toast.success(`Status updated to ${status}`, { id: tid });
    loadLeads();
  } catch (error) {
    console.error(error);
    toast.error("Status update failed", { id: tid });
  }
};

  const handleCloneLead = async (id) => {
    const tid = toast.loading("Cloning lead...");
    try {
      await cloneLead(id);
      toast.success("Lead cloned successfully", { id: tid });
      loadLeads();
    } catch (error) {
      toast.error("Failed to clone lead", { id: tid });
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
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowDashboard((prev) => !prev)}
            className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-theme-primary/10 p-2">
                  <TrendingUp className="h-4 w-4 text-theme-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-theme-dark sm:text-xl">
                    Travel Leads
                  </h1>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    {showDashboard ? "Hide dashboard" : "Show dashboard"} to
                    view lead metrics and quick filters.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span className="hidden sm:inline">
                {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
              </span>
              {showDashboard ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          {showDashboard && (
            <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">
                    Track and convert travel inquiries into bookings.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
                      <User className="h-4 w-4 text-theme-primary" />
                      <span className="font-medium">{primaryInsight}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          statusFilter === "Active" ? "All" : "Active",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:border-slate-400 hover:shadow-sm cursor-pointer"
                    >
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Active
                      </span>
                      <span className="font-black text-slate-900">
                        {overviewMetrics.activePipeline}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          statusFilter === "Attention" ? "All" : "Attention",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-800 transition hover:border-blue-400 hover:shadow-sm cursor-pointer"
                    >
                      <Clock3 className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.14em]">
                        Attention
                      </span>
                      <span className="font-black">
                        {overviewMetrics.needsAttention}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("Quotation Sent")}
                      className="inline-flex items-center gap-2 rounded-full bg-theme-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-theme-secondary"
                    >
                      <span>Follow Up</span>
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-black">
                        {overviewMetrics.quotationSent}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
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
                    />
                    Refresh
                  </Button>
                  <Button
                    className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg px-5 cursor-pointer"
                    onClick={() => setShowAddLead(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Lead
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                {statusCards.map((card) => {
                  const isActive = statusFilter === card.key;
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setStatusFilter(card.key)}
                      className={`rounded-2xl border p-3 text-left shadow-sm transition-all ${
                        isActive
                          ? "border-theme-primary ring-2 ring-theme-primary/15 shadow-md"
                          : card.tone
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            {card.label}
                          </p>
                          <p className="mt-1.5 text-xl font-black">
                            {card.value}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {card.helper}
                          </p>
                        </div>
                        <div className={`rounded-xl p-2 ${card.iconTone}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <LeadsTable
              leads={leads}
              onStatusChange={handleStatusChange}
              onDeleteLead={handleDeleteLead}
              onCloneLead={handleCloneLead}
              onCreateQuotation={handleCreateQuotation}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </CardContent>
        </Card>
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
                    else
                      setForm((prev) => ({
                        ...prev,
                        [e.target.name]: e.target.value,
                      }));
                  }}
                  onSubmit={handleSubmit}
                  selectedCustomer={selectedCustomer}
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
    </div>
  );
}
