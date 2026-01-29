"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Search, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Filter, 
  RefreshCw 
} from "lucide-react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersTable from "@/components/customers/CustomersTable";
import {
  addCustomer,
  getAllCustomers,
  udpateCustomer,
} from "@/firebase/customersService";
import toast, { Toaster } from "react-hot-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleEditCustomer = (customer) => {
    setEditMode(true);
    setSelectedCustomer(customer);
    setForm(customer);
    setShowAddCustomer(true);
  };

  const filteredCustomers = customers.filter((c) =>
    `${c.name} ${c.mobile} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCloseModal = () => {
    setShowAddCustomer(false);
    setEditMode(false);
    setSelectedCustomer(null);
    setForm({ name: "", mobile: "", email: "", city: "", state: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredFields = ["name", "mobile", "email", "city", "state"];

    for (let field of requiredFields) {
      if (!form[field] || form[field].toString().trim() === "") {
        toast.error(`Please fill the ${field} field`);
        return;
      }
    }

    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Mobile number must be exactly 10 digits");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const toastId = toast.loading(editMode ? "Updating..." : "Adding...");

    try {
      if (editMode) {
        await udpateCustomer(selectedCustomer.id, form);
        toast.success("Customer updated successfully", { id: toastId });
      } else {
        await addCustomer({
          ...form,
          status: "New",
          date: new Date().toLocaleDateString(),
        });
        toast.success("Customer added successfully", { id: toastId });
      }

      await loadCustomers();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      toast.error("Operation failed", { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 w-full pb-12">
      <Toaster position="top-right" />
      
      {/* Modal Overlay */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-dark/20 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-theme-dark">
                  {editMode ? "Edit Customer Details" : "Register New Customer"}
                </h2>
                <p className="text-sm text-slate-500">Please provide accurate contact information.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseModal}
                className="rounded-full hover:bg-theme-muted text-slate-500"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8">
              <CustomerForm
                form={form}
                onChange={handleChange}
                onSubmit={handleSubmit}
                editMode={editMode}
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-theme-muted rounded-lg">
                <Users className="h-6 w-6 text-theme-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-theme-dark">CRM Directory</h1>
            </div>
            <p className="text-slate-500">
              Manage your customer relationships, leads, and contact history.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadCustomers}
              disabled={loading}
              className="border-theme-primary text-theme-primary hover:bg-theme-muted"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="lg"
              className="bg-theme-primary hover:bg-theme-secondary text-white shadow-lg shadow-theme-primary/20"
              onClick={() => {
                setEditMode(false);
                setSelectedCustomer(null);
                setShowAddCustomer(true);
              }}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Main Dashboard Card */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, mobile, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 border-slate-200 focus:ring-theme-primary focus:border-theme-primary rounded-xl"
                />
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-100/50 px-4 py-2 rounded-lg">
                <Filter className="h-4 w-4" />
                <span>Showing {filteredCustomers.length} results</span>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Functional Preservation: CustomersTable receives same props */}
            <div className="min-h-[400px]">
               <CustomersTable
                customers={filteredCustomers}
                setCustomers={setCustomers}
                onEdit={handleEditCustomer}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}