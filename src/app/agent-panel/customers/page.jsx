"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Users, UserPlus, Search, X, RefreshCw, Filter } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersTable from "@/components/customers/CustomersTable";
import CustomersPagination from "@/components/customers/CustomersPagination";
import {
  addCustomer,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
} from "@/firebase/customersService";
import toast, { Toaster } from "react-hot-toast";

// ─── Logging helpers ──────────────────────────────────────────────────────────

function logInfo(context, msg) {
  console.info(`[CustomersPage] ${context}: ${msg}`);
}
function logError(context, error) {
  console.error(`[CustomersPage] ${context}:`, error?.message ?? error);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { user } = useSelector((state) => state.auth);
  // ── Server-pagination state ──────────────────────────────────────────────

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [pageSize, setPageSize] = useState(50);

  // ── Search / filter state ────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [allCustomers, setAllCustomers] = useState([]); // only populated in search mode
  const [allCustomersLoaded, setAllCustomersLoaded] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
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

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isSearchMode = search.trim().length > 0;

  // ─── Server Pagination ────────────────────────────────────────────────────

  /**
   * Go back one page using the cached pages array (no Firestore call).
   */

  // ─── Search mode: load all ────────────────────────────────────────────────

  const loadAllCustomers = useCallback(async () => {
    if (allCustomersLoaded) return; // already in cache
    logInfo("loadAllCustomers", "fetching entire collection for search");
    setLoading(true);
    try {
      const data = await getAllCustomers(user?.orgId);
      setAllCustomers(data);
      setAllCustomersLoaded(true);
      logInfo("loadAllCustomers", `fetched ${data.length} total records`);
    } catch (error) {
      logError("loadAllCustomers", error);
      toast.error("Failed to load customers for search.");
    } finally {
      setLoading(false);
    }
  }, [allCustomersLoaded]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  // When search term appears, load all customers (once)
  useEffect(() => {
    if (isSearchMode) {
      loadAllCustomers();
      setSearchPage(1);
    }
  }, [isSearchMode]);

  // ─── Derived display data ─────────────────────────────────────────────────

  /**
   * Filtered + client-paginated customers for search mode.
   */
  const filteredAll = useMemo(() => {
    if (!isSearchMode) return [];
    const term = search.toLowerCase();
    return allCustomers.filter((c) =>
      `${c.name} ${c.mobile} ${c.email}`.toLowerCase().includes(term),
    );
  }, [search, allCustomers, isSearchMode]);

  const searchTotalPages = Math.max(
    1,
    Math.ceil(filteredAll.length / pageSize),
  );

  const searchPageCustomers = useMemo(() => {
    const start = (searchPage - 1) * pageSize;
    return filteredAll.slice(start, start + pageSize);
  }, [filteredAll, searchPage, pageSize]);

  /**
   * What actually renders in the table.
   */
  const displayedCustomers = isSearchMode
    ? searchPageCustomers
    : (pageSize[currentPage - 1]?.customers ?? []);

  // Count shown in pagination footer
  const displayTotalCount = isSearchMode ? filteredAll.length : totalCount;
  const displayCurrentPage = isSearchMode ? searchPage : currentPage;
  const displayTotalPages = isSearchMode
    ? searchTotalPages
    : Math.ceil(totalCount / pageSize);

  // ─── CRUD handlers ────────────────────────────────────────────────────────

  /**
   * Full reset: clear page cache, reload from scratch.
   */
  

  const handleEditCustomer = (customer) => {
    setEditMode(true);
    setSelectedCustomer(customer);
    setForm(customer);
    setShowAddCustomer(true);
  };
  useEffect(() => {
    const totalPages = Math.ceil(displayTotalCount / pageSize);
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [pageSize, displayTotalCount]);
  const handleCloseModal = () => {
    setShowAddCustomer(false);
    setEditMode(false);
    setSelectedCustomer(null);
    setForm({ name: "", mobile: "", email: "", city: "", state: "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        await updateCustomer(selectedCustomer.id, form);
        toast.success("Customer updated successfully", { id: toastId });
        logInfo("handleSubmit", `updated customer ${selectedCustomer.id}`);
      } else {
        const newId = await addCustomer({
          ...form,
          orgId: user?.orgId,
          status: "New",
          date: new Date().toLocaleDateString(),
        });
        toast.success("Customer added successfully", { id: toastId });
        logInfo("handleSubmit", `added customer ${newId}`);
      }
      // Invalidate caches and reload
      await hardRefresh();
      handleCloseModal();
    } catch (error) {
      logError("handleSubmit", error);
      toast.error("Operation failed", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this customer? This action cannot be undone.",
    );
    if (!confirmed) return;

    const toastId = toast.loading("Deleting...");
    try {
      await deleteCustomer(id);
      toast.success("Customer deleted", { id: toastId });
      logInfo("handleDelete", `deleted customer ${id}`);
      await hardRefresh();
    } catch (error) {
      logError("handleDelete", error);
      toast.error("Failed to delete customer", { id: toastId });
    }
  };

  // ─── Pagination handlers ──────────────────────────────────────────────────

  const handlePaginationFirst = () => {
    if (isSearchMode) {
      setSearchPage(1);
    } else {
      setCurrentPage(1);
    }
  };

  const handlePaginationPrev = () => {
    if (isSearchMode) {
      setSearchPage((p) => Math.max(1, p - 1));
    } else {
      goToPrevPage();
    }
  };

  const handlePaginationNext = () => {
    if (isSearchMode) {
      setSearchPage((p) => Math.min(searchTotalPages, p + 1));
    } else {
      handleNextPage();
    }
  };

  const handlePaginationLast = () => {
    if (isSearchMode) {
      setSearchPage(searchTotalPages);
    }
    // "Last" not available in server-pagination mode (we don't know the final cursor)
  };
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllCustomers(user?.orgId);
      setAllCustomers(data);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [user?.orgId]);
  const hardRefresh = useCallback(async () => {
    logInfo("hardRefresh", "reloading customers");

    setAllCustomers([]);
    setAllCustomersLoaded(false);
    setCurrentPage(1);
    setSearch("");

    await loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase();
    return allCustomers.filter((c) =>
      `${c.name} ${c.mobile} ${c.email}`.toLowerCase().includes(term),
    );
  }, [search, allCustomers]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / pageSize),
  );

  const pagedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);
  useEffect(() => {
    loadCustomers();
  }, []);
  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/50 w-full pb-12">
      <Toaster position="top-right" />

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      {showAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-dark/20 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-theme-dark">
                  {editMode ? "Edit Customer Details" : "Register New Customer"}
                </h2>
                <p className="text-sm text-slate-500">
                  Please provide accurate contact information.
                </p>
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
        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-theme-muted rounded-lg">
                <Users className="h-6 w-6 text-theme-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-theme-dark">
                CRM Directory
              </h1>
            </div>
            <p className="text-slate-500">
              Manage your customer relationships, leads, and contact history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={hardRefresh}
              disabled={loading}
              className="border-theme-primary text-theme-primary hover:bg-theme-muted"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
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

        {/* ── Main Card ──────────────────────────────────────────────────── */}
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, mobile, or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchPage(1);
                  }}
                  className="pl-10 h-11 border-slate-200 focus:ring-theme-primary focus:border-theme-primary rounded-xl"
                />
                {search && (
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      setSearch("");
                      setSearchPage(1);
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Result count pill */}
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-100/50 px-4 py-2 rounded-lg">
                <Filter className="h-4 w-4" />
                <span>
                  {isSearchMode
                    ? `${filteredAll.length} match${filteredAll.length !== 1 ? "es" : ""}`
                    : `${totalCount} total customer${totalCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="min-h-[400px]">
              <CustomersTable
                customers={pagedCustomers}
                setCustomers={
                  // not used for mutations anymore, kept for compatibility
                  isSearchMode
                    ? setAllCustomers
                    : (updater) => {
                        setPages((prev) => {
                          const copy = [...prev];
                          if (copy[currentPage - 1]) {
                            copy[currentPage - 1] = {
                              ...copy[currentPage - 1],
                              customers:
                                typeof updater === "function"
                                  ? updater(copy[currentPage - 1].customers)
                                  : updater,
                            };
                          }
                          return copy;
                        });
                      }
                }
                onEdit={handleEditCustomer}
                onDelete={handleDelete}
              />
            </div>

            {/* ── Pagination ─────────────────────────────────────────────── */}
            <CustomersPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={filteredCustomers.length}
              pageSize={pageSize}
              loading={loading}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              setPageSize={setPageSize}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
