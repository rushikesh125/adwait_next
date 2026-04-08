"use client";

import React, { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadForm from "@/components/leads/LeadForm";
import LeadsTable from "@/components/leads/LeadsTable";
import CustomerForm from "@/components/customers/CustomerForm";
import {
  addLead,
  getAllLeads,
  updateLeadStatus,
  deleteLead,
} from "@/firebase/leadsService";
import { addCustomer } from "@/firebase/customersService";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);

  const router = useRouter();
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
  });

  const [form, setForm] = useState({
    name: "",
    travelDate: "",
    days: "",
    destination: "",
    adults: "",
    children: "",
    hotelPreference: "",
    transportPreference: "",
    budget: "",
    notes: "",
    mealPlan: "",
    hotelCategory: "",
    departureCity: "",
    tripType: "",
    rooms: "",
    sightseeingVehicle: "",
    ticketHelp: [],
  });

  // --- Logic Functions ---

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await getAllLeads();
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
  }, []);

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
        children: "",
        hotelPreference: "",
        transportPreference: "",
        budget: "",
        notes: "",
        mealPlan: "",
        hotelCategory: "",
        departureCity: "",
        tripType: "",
        rooms: "",
        sightseeingVehicle: "",
        ticketHelp: [],
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
                onClick={() => setShowAddLead(false)}
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
