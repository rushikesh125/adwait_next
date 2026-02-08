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

  // New state for Quick Add Customer Modal
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
  });

  const router = useRouter();
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

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
    bookingHelp: [],
  });

  useEffect(() => {
    loadLeads();
    loadCustomers();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Quick Add Customer Logic
  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Registering customer...");
    try {
      await addCustomer({
        ...customerForm,
        status: "New",
        date: new Date().toLocaleDateString(),
      });
      toast.success("Customer added!", { id: toastId });

      // Update Lead Form name with the newly created customer
      setForm((prev) => ({ ...prev, name: customerForm.name }));

      // Reset and close
      setShowQuickAddCustomer(false);
      setCustomerForm({ name: "", mobile: "", email: "", city: "", state: "" });
      setShowSuggestions(false);

      // Refresh local customer list for future suggestions
      loadCustomers();
    } catch (error) {
      toast.error("Failed to add customer", { id: toastId });
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, name: value });
    if (value.length > 1) {
      const filtered = customers.filter((cust) =>
        cust.name.toLowerCase().includes(value.toLowerCase()),
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
        bookingHelp: [],
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
      `/agent-panel?leadId=${lead.id}&leadName=${encodeURIComponent(lead.name)}`,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 w-full pb-8 sm:pb-12">
      <Toaster position="top-right" />

      {/* QUICK ADD CUSTOMER MODAL (Layered on top of Lead Modal) */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white w-full max-w-xl rounded-xl sm:rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-theme-primary/10 rounded-lg">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-theme-dark">
                  Quick Register
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickAddCustomer(false)}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
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
                onSubmit={handleCustomerSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* MAIN ADD LEAD MODAL */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-dark/20 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl sm:rounded-2xl shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0 sticky top-0 bg-white z-10 rounded-t-xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-theme-muted rounded-lg">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-theme-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold">Capture New Inquiry</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddLead(false)}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
              <div className="relative">
                <LeadForm
                  form={form}
                  onChange={(e) => {
                    if (e.target.name === "name") handleNameChange(e);
                    else setForm({ ...form, [e.target.name]: e.target.value });
                  }}
                  onSubmit={handleSubmit}
                  nameInputRef={nameInputRef}
                />

                {/* Suggestions Dropdown - Fixed Positioning */}
                {showSuggestions && filteredCustomers.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 sm:max-w-lg mt-1 bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5 top-30"
                    
                  >
                    <div className="bg-slate-50/80 backdrop-blur-sm px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between border-b border-slate-100 rounded-t-lg sm:rounded-t-xl">
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Database Matches
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-theme-primary bg-theme-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                        {filteredCustomers.length} Found
                      </span>
                    </div>

                    <ul className="max-h-60 sm:max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent divide-y divide-slate-100">
                      {filteredCustomers.map((customer) => (
                        <li
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 hover:bg-theme-muted/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2 sm:gap-3.5 mb-2 sm:mb-0">
                            <div className="p-1.5 sm:p-2.5 bg-slate-100 group-hover:bg-white rounded-lg transition-colors shadow-sm shrink-0">
                              <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 group-hover:text-theme-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-theme-dark group-hover:text-theme-primary transition-colors truncate">
                                {customer.name}
                              </p>
                              <div className="flex items-center gap-1.5 sm:gap-2.5 mt-0.5 sm:mt-1 text-xs sm:text-sm">
                                <span className="text-slate-600 font-medium truncate">
                                  {customer.mobile}
                                </span>
                                {customer.email && (
                                  <>
                                    <span className="text-slate-300 hidden sm:inline">•</span>
                                    <span className="text-slate-500 truncate hidden sm:inline">
                                      {customer.email?.split("@")[0]}...
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs bg-slate-100 group-hover:bg-theme-primary group-hover:text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-semibold uppercase tracking-wide transition-all self-start sm:self-auto">
                            {customer.city || "N/A"}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="w-full">
                      <Button
                        type="button"
                        onClick={() => setShowQuickAddCustomer(true)}
                        className="w-full bg-theme-accent hover:bg-theme-dark cursor-pointer rounded-t-none rounded-b-lg sm:rounded-b-xl py-4 sm:py-6 text-sm sm:text-base"
                      >
                        <PlusSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Add New Customer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REST OF YOUR PAGE (Header and LeadsTable) */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-theme-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold">Travel Leads</h1>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={loadLeads} 
              disabled={loading}
              className="text-sm sm:text-base px-3 sm:px-4"
            >
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
            <Button
              className="bg-theme-primary text-white text-sm sm:text-base px-3 sm:px-4"
              onClick={() => setShowAddLead(true)}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden ml-2">Add</span>
            </Button>
          </div>
        </div>
        <Card className="border-none shadow-xl rounded-xl sm:rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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