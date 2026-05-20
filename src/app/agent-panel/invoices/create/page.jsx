"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
  createInvoice,
  updateInvoice,
  getInvoiceById,
  computeLineItem,
  computeInvoiceTotals,
} from "@/firebase/invoicesService";
import { getBookingById, updateBooking } from "@/firebase/bookingsService";
import { getQuotationById } from "@/firebase/quotations";
import { getAllCustomers, getCustomerById } from "@/firebase/customersService";
import { getLeadById } from "@/firebase/leadsService";
import { ArrowLeft, Plus, Trash2, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Partial", "Overdue", "Cancelled"];

const newLineItem = () => ({
  _key: Math.random().toString(36).slice(2),
  itemName: "",
  description: "",
  quantity: 1,
  unitPrice: "",
  discountType: "percentage",
  discountValue: 0,
  gstRate: 0,
  subtotal: 0,
  discountAmount: 0,
  taxableAmount: 0,
  gstAmount: 0,
  total: 0,
});

// FIX: Added payments: [] to emptyForm so payment import logic always has a valid array
const emptyForm = () => ({
  customerName: "",
  customerEmail: "",
  customerMobile: "",
  customerAddress: "",
  customerId: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "Draft",
  gstType: "intra",
  lineItems: [newLineItem()],
  notes: "",
  termsAndConditions: "",
  sourceType: "manual",
  bookingId: null,
  quotationId: null,
  leadId: null,
  bookingRef: "",
  payments: [],
});

function CreateInvoiceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const agentId = user?.uid;

  const editId = searchParams.get("id");
  const bookingIdParam = searchParams.get("bookingId");
  const isEdit = !!editId;

  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit || !!bookingIdParam);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);
  const [totals, setTotals] = useState({
    subtotal: 0, discountTotal: 0, taxableAmount: 0,
    gstTotal: 0, grandTotal: 0, cgst: 0, sgst: 0, igst: 0,
  });

  // FIX: Track the intended submit action separately from form state
  // to avoid the async setState + immediate read race condition
  const submitActionRef = useRef(null);

  // Load customers
  useEffect(() => {
    if (!agentId || !user?.orgId) return;
    getAllCustomers(user.orgId).catch(() => []).then(setCustomers);
  }, [agentId, user?.orgId]);

  // FIX: Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load booking data if creating from booking
  useEffect(() => {
    if (!bookingIdParam || isEdit || !user?.orgId) return;
    (async () => {
      try {
        const booking = await getBookingById(bookingIdParam, user.orgId);
        if (!booking) { toast.error("Booking not found"); return; }

        let quotation = null;
        if (booking.quotationId && booking.agentId) {
          quotation = await getQuotationById(booking.agentId, booking.quotationId, user.orgId).catch(() => null);
        }

        const customerId = quotation?.customerId || booking.customerId || null;
        let customer = null;
        if (customerId) {
          customer = await getCustomerById(customerId, user.orgId).catch(() => null);
        }
        let lead = null;
        if (!customer) {
          const leadId = quotation?.leadId || booking.leadId || null;
          if (leadId) lead = await getLeadById(leadId, user.orgId).catch(() => null);
        }

        const lineItems = [];
        if (quotation) {
          lineItems.push({
            ...newLineItem(),
            itemName: quotation.packageName || `Tour Package — ${booking.destination || ""}`,
            description: buildPackageDescription(quotation),
            quantity: 1,
            unitPrice: Number(booking.totalAmount) || 0,
            gstRate: 0,
          });
        } else {
          lineItems.push({
            ...newLineItem(),
            itemName: `Tour Package — ${booking.destination || "Tour"}`,
            description: "",
            quantity: 1,
            unitPrice: Number(booking.totalAmount) || 0,
            gstRate: 0,
          });
        }

        const existingPayments = (booking.payments || [])
          .filter((p) => Number(p.amount) > 0)
          .map((p, i) => ({
            id: `bk_${bookingIdParam}_${i}`,
            amount: Number(p.amount),
            date: p.date || new Date().toISOString().slice(0, 10),
            mode: p.mode || "Cash",
            paymentAccountName: p.mode || "Cash",
            paymentAccountType: p.mode || "Cash",
            reference: p.reference || "",
            notes: p.notes || "",
            importedFromBooking: true,
          }));

        setForm((prev) => ({
          ...prev,
          customerName: customer?.name || lead?.name || booking.customerName || "",
          customerMobile: customer?.mobile || lead?.mobile || booking.customerMobile || booking.mobile || "",
          customerEmail: customer?.email || lead?.email || "",
          customerAddress: [customer?.city, customer?.state].filter(Boolean).join(", "),
          customerId: customerId || "",
          invoiceDate: new Date().toISOString().slice(0, 10),
          status: "Draft",
          sourceType: "booking",
          bookingId: bookingIdParam,
          quotationId: booking.quotationId || null,
          leadId: booking.leadId || null,
          bookingRef: booking.bookingRef || "",
          lineItems,
          payments: existingPayments,
        }));
      } catch (err) {
        toast.error("Failed to load booking data");
      } finally {
        setFetching(false);
      }
    })();
  }, [bookingIdParam, isEdit, user?.orgId]);

  // Load existing invoice for editing
  useEffect(() => {
    if (!editId || !user?.orgId) return;
    (async () => {
      try {
        const inv = await getInvoiceById(editId, user.orgId);
        if (!inv) { toast.error("Invoice not found"); router.push("/agent-panel/invoices"); return; }
        setForm({
          customerName: inv.customerName || "",
          customerEmail: inv.customerEmail || "",
          customerMobile: inv.customerMobile || "",
          customerAddress: inv.customerAddress || "",
          customerId: inv.customerId || "",
          invoiceDate: inv.invoiceDate || "",
          dueDate: inv.dueDate || "",
          status: inv.status || "Draft",
          gstType: inv.gstType || "intra",
          lineItems: (inv.lineItems || [newLineItem()]).map((li) => ({
            ...li,
            itemName: li.itemName || "",
            _key: li._key || Math.random().toString(36).slice(2),
          })),
          notes: inv.notes || "",
          termsAndConditions: inv.termsAndConditions || "",
          sourceType: inv.sourceType || "manual",
          bookingId: inv.bookingId || null,
          quotationId: inv.quotationId || null,
          leadId: inv.leadId || null,
          bookingRef: inv.bookingRef || "",
          // FIX: Preserve existing payments when editing
          payments: inv.payments || [],
        });
      } catch (err) {
        toast.error("Failed to load invoice");
      } finally {
        setFetching(false);
      }
    })();
  }, [editId, user?.orgId]);

  // Recompute totals whenever line items or gstType change
  useEffect(() => {
    const computed = computeInvoiceTotals(form.lineItems, form.gstType);
    setTotals(computed);
  }, [form.lineItems, form.gstType]);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateLineItem = (key, field, value) => {
    setForm((prev) => {
      const updated = prev.lineItems.map((li) => {
        if (li._key !== key) return li;
        const next = { ...li, [field]: value };
        return computeLineItem(next);
      });
      return { ...prev, lineItems: updated };
    });
  };

  const addLineItem = () =>
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, newLineItem()] }));

  const removeLineItem = (key) =>
    setForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((li) => li._key !== key) }));

  const handleSelectCustomer = (customer) => {
    setField("customerName", customer.name || "");
    setField("customerEmail", customer.email || "");
    setField("customerMobile", customer.mobile || "");
    setField("customerId", customer.id || "");
    setCustomerSearch(customer.name || "");
    setShowCustomerDropdown(false);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile?.includes(customerSearch) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // FIX: Accept the desired status as a parameter instead of relying on async setState.
  // This eliminates the race condition where "Save as Draft" read form.status before
  // the setState from setField("status", "Draft") had flushed.
  const handleSubmit = async (overrideStatus = null) => {
    if (!user?.orgId) { toast.error("Organization is not assigned"); return; }
    if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!form.invoiceDate) { toast.error("Invoice date is required"); return; }
    if (form.lineItems.length === 0) { toast.error("Add at least one line item"); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        // Use overrideStatus if provided, otherwise keep form.status
        status: overrideStatus ?? form.status,
        agentId,
        orgId: user.orgId,
        adminId: user.adminId || null,
        lineItems: form.lineItems.map(({ _key, ...rest }) => rest),
      };

      if (isEdit) {
        await updateInvoice(editId, payload, user.orgId);
        toast.success("Invoice updated");
        router.push(`/agent-panel/invoices/${editId}`);
      } else {
        const invoiceId = await createInvoice(payload);

        // Back-fill invoicePaymentId on booking payments
        if (payload.bookingId && (form.payments || []).length > 0) {
          try {
            const booking = await getBookingById(payload.bookingId, user.orgId);
            if (booking?.payments?.length) {
              let filteredIdx = 0;
              const updatedBookingPayments = booking.payments.map((p) => {
                if (Number(p.amount) > 0 && !p.invoicePaymentId) {
                  const invPay = form.payments[filteredIdx++];
                  return invPay ? { ...p, invoicePaymentId: invPay.id } : p;
                }
                return p;
              });
              await updateBooking(payload.bookingId, { payments: updatedBookingPayments }, user.orgId);
            }
          } catch (e) {
            console.warn("[CreateInvoice] Could not back-fill invoicePaymentId:", e);
          }
        }

        toast.success("Invoice created");
        router.push(`/agent-panel/invoices/${invoiceId}`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/agent-panel/invoices")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">
                {isEdit ? "Edit Invoice" : "New Invoice"}
              </h1>
              {form.bookingRef && (
                <p className="text-xs text-slate-400 mt-0.5">Linked to Booking: {form.bookingRef}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {/* FIX: Pass "Draft" directly to handleSubmit instead of relying on async setState */}
            <Button
              onClick={() => handleSubmit("Draft")}
              variant="outline"
              className="rounded-xl font-bold h-9 text-xs"
              disabled={loading}
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit()}
              className="rounded-xl font-bold h-9 bg-theme-primary hover:bg-theme-primary/90 text-white text-xs"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Update Invoice"
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT: main form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer Details */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                {/* FIX: Customer search dropdown — wrapped in ref div for click-outside detection */}
                <div ref={customerDropdownRef}>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                    Search Existing Customer
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, mobile, email…"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="pl-9 rounded-xl text-sm"
                    />
                    {customerSearch && (
                      <button
                        onClick={() => { setCustomerSearch(""); setShowCustomerDropdown(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                    {/* FIX: Dropdown is now inside the relative container for correct positioning */}
                    {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {filteredCustomers.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm"
                            onMouseDown={(e) => {
                              // FIX: Use onMouseDown + preventDefault to prevent input blur
                              // from firing before the click registers
                              e.preventDefault();
                              handleSelectCustomer(c);
                            }}
                          >
                            <span className="font-semibold text-slate-800">{c.name}</span>
                            {c.mobile && (
                              <span className="text-slate-400 ml-2 text-xs">{c.mobile}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-1" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-1.5 block">
                      Customer Name *
                    </Label>
                    <Input
                      value={form.customerName}
                      onChange={(e) => setField("customerName", e.target.value)}
                      className="rounded-xl text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Mobile</Label>
                    <Input
                      value={form.customerMobile}
                      onChange={(e) => setField("customerMobile", e.target.value)}
                      className="rounded-xl text-sm"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Email</Label>
                    <Input
                      value={form.customerEmail}
                      onChange={(e) => setField("customerEmail", e.target.value)}
                      className="rounded-xl text-sm"
                      placeholder="email@example.com"
                      type="email"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Address</Label>
                    <Input
                      value={form.customerAddress}
                      onChange={(e) => setField("customerAddress", e.target.value)}
                      className="rounded-xl text-sm"
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Line Items
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold h-8 gap-1"
                  onClick={addLineItem}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                {form.lineItems.map((item, idx) => (
                  <LineItemRow
                    key={item._key}
                    item={item}
                    index={idx}
                    onChange={(field, value) => updateLineItem(item._key, field, value)}
                    onRemove={() => removeLineItem(item._key)}
                    canRemove={form.lineItems.length > 1}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Notes & Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    className="rounded-xl text-sm resize-none"
                    rows={3}
                    placeholder="Any notes for the customer…"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Terms & Conditions</Label>
                  <Textarea
                    value={form.termsAndConditions}
                    onChange={(e) => setField("termsAndConditions", e.target.value)}
                    className="rounded-xl text-sm resize-none"
                    rows={3}
                    placeholder="Payment terms, cancellation policy…"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Invoice settings + Summary */}
          <div className="space-y-5">
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Invoice Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Invoice Date *</Label>
                  <Input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => setField("invoiceDate", e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setField("dueDate", e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 mb-1.5 block">GST Type</Label>
                  <Select value={form.gstType} onValueChange={(v) => setField("gstType", v)}>
                    <SelectTrigger className="rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intra">Intrastate (CGST + SGST)</SelectItem>
                      <SelectItem value="inter">Interstate (IGST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Totals Summary */}
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-2">
                <TotalRow label="Subtotal" value={totals.subtotal} />
                {totals.discountTotal > 0 && (
                  <TotalRow label="Discount" value={-totals.discountTotal} color="text-rose-600" />
                )}
                <TotalRow label="Taxable Amount" value={totals.taxableAmount} />
                {form.gstType === "inter" ? (
                  totals.igst > 0 && <TotalRow label="IGST" value={totals.igst} />
                ) : (
                  <>
                    {totals.cgst > 0 && <TotalRow label="CGST" value={totals.cgst} />}
                    {totals.sgst > 0 && <TotalRow label="SGST" value={totals.sgst} />}
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-black text-slate-800 text-sm">Grand Total</span>
                  <span className="font-black text-theme-primary text-lg">
                    ₹{Number(totals.grandTotal).toLocaleString("en-IN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineItemRow({ item, index, onChange, onRemove, canRemove }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Item {index + 1}
        </span>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-300 hover:text-red-500 hover:bg-red-50"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div>
        <Label className="text-xs font-bold text-slate-500 mb-1 block">Item Name</Label>
        <Input
          value={item.itemName}
          onChange={(e) => onChange("itemName", e.target.value)}
          className="rounded-xl text-sm bg-white font-semibold"
          placeholder="e.g. Goa Holiday Package"
        />
      </div>

      <div>
        <Label className="text-xs font-bold text-slate-500 mb-1 block">
          Description{" "}
          <span className="text-slate-400 font-normal">(hotels, dates, inclusions)</span>
        </Label>
        <Textarea
          value={item.description}
          onChange={(e) => onChange("description", e.target.value)}
          className="rounded-xl text-sm bg-white resize-none"
          rows={4}
          placeholder={"e.g.\nHotel Grand – Goa | Check-in: 10 Dec → Check-out: 13 Dec (3N)\nIncluded: Breakfast, Airport Transfer\nExcluded: Airfare, Personal expenses"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-bold text-slate-500 mb-1 block">Quantity</Label>
          <Input
            type="number"
            value={item.quantity}
            min={1}
            onChange={(e) => onChange("quantity", Number(e.target.value) || 1)}
            className="rounded-xl text-sm bg-white"
          />
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-500 mb-1 block">Unit Price (₹)</Label>
          <Input
            type="number"
            value={item.unitPrice}
            min={0}
            onChange={(e) => onChange("unitPrice", e.target.value)}
            className="rounded-xl text-sm bg-white"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-bold text-slate-500 mb-1 block">Discount</Label>
          <Input
            type="number"
            value={item.discountValue}
            min={0}
            onChange={(e) => onChange("discountValue", Number(e.target.value) || 0)}
            className="rounded-xl text-sm bg-white"
            placeholder="0"
          />
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-500 mb-1 block">Type</Label>
          <Select value={item.discountType} onValueChange={(v) => onChange("discountType", v)}>
            <SelectTrigger className="rounded-xl text-sm bg-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">%</SelectItem>
              <SelectItem value="amount">₹</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-bold text-slate-500 mb-1 block">GST Rate</Label>
          <Select
            value={String(item.gstRate)}
            onValueChange={(v) => onChange("gstRate", Number(v))}
          >
            <SelectTrigger className="rounded-xl text-sm bg-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">None</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Item total */}
      <div className="flex justify-end items-center gap-4 pt-1 border-t border-slate-100">
        {item.discountAmount > 0 && (
          <span className="text-xs text-slate-400">
            Discount:{" "}
            <span className="text-rose-500 font-semibold">
              -₹{Number(item.discountAmount).toLocaleString("en-IN")}
            </span>
          </span>
        )}
        {item.gstAmount > 0 && (
          <span className="text-xs text-slate-400">
            GST:{" "}
            <span className="font-semibold text-slate-600">
              ₹{Number(item.gstAmount).toLocaleString("en-IN")}
            </span>
          </span>
        )}
        <span className="text-sm font-black text-slate-800">
          ₹{Number(item.total || 0).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

function TotalRow({ label, value, color }) {
  const num = Number(value) || 0;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${color || "text-slate-800"}`}>
        {num < 0 ? "-" : ""}₹{Math.abs(num).toLocaleString("en-IN")}
      </span>
    </div>
  );
}

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const MEAL_PLAN_LABELS = {
  EP: "EP (Room Only)",
  CP: "CP (Bed & Breakfast)",
  MAP: "MAP (Breakfast & Dinner)",
  AP: "AP (All Meals)",
};

function buildPackageDescription(quotation) {
  const lines = [];

  if (quotation.hotelSummary?.length) {
    quotation.hotelSummary.forEach((h) => {
      const name = h.hotel || h.hotelName || "Hotel";
      const city = h.city ? ` – ${h.city}` : "";
      const nights = h.nights ? ` (${h.nights}N)` : "";
      const room = h.selectedRoomCategory ? `, ${h.selectedRoomCategory}` : "";
      const meal = h.selectedMealPlan
        ? `, ${MEAL_PLAN_LABELS[h.selectedMealPlan] || h.selectedMealPlan}`
        : "";
      const cin = fmtDate(h.checkInDate || h.checkIn);
      const cout = fmtDate(h.checkOutDate || h.checkOut);
      const dates = cin && cout ? ` | ${cin} → ${cout}` : "";
      lines.push(`🏨 ${name}${city}${nights}${room}${meal}${dates}`);

      const occupancy = [];
      if (Number(h.numDouble) > 0)     occupancy.push(`${h.numDouble} Room${h.numDouble > 1 ? "s" : ""}`);
      if (Number(h.numExtraAdult) > 0) occupancy.push(`${h.numExtraAdult} Extra Adult`);
      if (Number(h.numExtraChild) > 0) occupancy.push(`${h.numExtraChild} Extra Child`);
      if (Number(h.numCNB) > 0)        occupancy.push(`${h.numCNB} Child Without Bed`);
      if (occupancy.length) lines.push(`   ${occupancy.join(" · ")}`);
    });
  }

  if (quotation.transportSummary?.vehicleName) {
    const t = quotation.transportSummary;
    lines.push(`🚗 Transport: ${t.vehicleName}${t.ac ? " (AC)" : ""}${t.state ? ` – ${t.state}` : ""}`);
  }

  if (quotation.activitySummary?.length) {
    const acts = quotation.activitySummary.map((a) => a.name).join(", ");
    lines.push(`🎯 Activities: ${acts}`);
  }

  const itinerary = quotation.itinerarySummary;
  const included = (itinerary?.inclusions || []).filter((i) => i.selected).map((i) => i.text);
  if (included.length) {
    lines.push(`\n✅ Included:\n${included.map((i) => `  • ${i}`).join("\n")}`);
  }

  const excluded = (itinerary?.exclusions || []).filter((i) => i.selected).map((i) => i.text);
  if (excluded.length) {
    lines.push(`\n❌ Excluded:\n${excluded.map((i) => `  • ${i}`).join("\n")}`);
  }

  return lines.join("\n");
}

export default function CreateInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
        </div>
      }
    >
      <CreateInvoiceInner />
    </Suspense>
  );
}