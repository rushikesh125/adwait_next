"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  getInvoiceById,
  deleteInvoice,
  addPaymentToInvoice,
  updatePaymentInInvoice,
  deletePaymentFromInvoice,
} from "@/firebase/invoicesService";
import { updateBooking, getBookingById } from "@/firebase/bookingsService";
import { getPaymentAccountsByAgent } from "@/firebase/paymentAccountsService";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import {
  ArrowLeft,
  Edit3,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Download,
  Plus,
  X,
  IndianRupee,
  CalendarCheck,
  XCircle,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";

const formatCurrency = (n) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const newPaymentForm = () => ({
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentAccountId: "",
  paymentAccountName: "",
  paymentAccountType: "",
  mode: "Cash",
  reference: "",
  notes: "",
});

const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Card", "Cheque", "Online"];

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const panelBase = pathname.startsWith("/admin") ? "/admin-panel" : "/agent-panel";
  const { user } = useSelector((state) => state.auth);
  const agentId = user?.uid;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(newPaymentForm());
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [inv, accounts] = await Promise.all([
          getInvoiceById(id),
          agentId ? getPaymentAccountsByAgent(agentId) : Promise.resolve([]),
        ]);
        if (!inv) { toast.error("Invoice not found"); router.push(`${panelBase}/invoices`); return; }
        setInvoice(inv);
        setPaymentAccounts(accounts);
      } catch (err) {
        toast.error("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, agentId]);

  const handleDelete = async () => {
    if (!confirm("Permanently delete this invoice?")) return;
    setDeleting(true);
    try {
      await deleteInvoice(id);
      toast.success("Invoice deleted");
      router.push(`${panelBase}/invoices`);
    } catch {
      toast.error("Delete failed");
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await generateInvoicePDF(invoice);
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPaymentDialog = (payment = null) => {
    if (payment) {
      setEditingPaymentId(payment.id);
      setPaymentForm({
        amount: String(payment.amount || ""),
        date: payment.date || new Date().toISOString().slice(0, 10),
        paymentAccountId: payment.paymentAccountId || "",
        paymentAccountName: payment.paymentAccountName || "",
        paymentAccountType: payment.paymentAccountType || "",
        mode: payment.mode || "Cash",
        reference: payment.reference || "",
        notes: payment.notes || "",
      });
    } else {
      setEditingPaymentId(null);
      const defaultAccount = paymentAccounts.find((a) => a.isDefault) || paymentAccounts[0];
      setPaymentForm({
        ...newPaymentForm(),
        paymentAccountId: defaultAccount?.id || "",
        paymentAccountName: defaultAccount?.name || "",
        paymentAccountType: defaultAccount?.type || "",
        mode: defaultAccount?.type === "Cash" ? "Cash" : "Bank Transfer",
      });
    }
    setPaymentDialogOpen(true);
  };

  const handleAccountChange = (accountId) => {
    const account = paymentAccounts.find((a) => a.id === accountId);
    setPaymentForm((prev) => ({
      ...prev,
      paymentAccountId: accountId,
      paymentAccountName: account?.name || "",
      paymentAccountType: account?.type || "",
      mode: account?.type === "Cash" ? "Cash" : account?.type === "UPI" ? "UPI" : "Bank Transfer",
    }));
  };

  const handleSavePayment = async () => {
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid payment amount"); return; }
    if (!paymentForm.date) { toast.error("Payment date is required"); return; }

    setSavingPayment(true);
    const paymentData = {
      amount,
      date: paymentForm.date,
      paymentAccountId: paymentForm.paymentAccountId,
      paymentAccountName: paymentForm.paymentAccountName || paymentForm.mode,
      paymentAccountType: paymentForm.paymentAccountType,
      mode: paymentForm.mode,
      reference: paymentForm.reference,
      notes: paymentForm.notes,
    };

    try {
      if (editingPaymentId) {
        // ── EDIT existing payment ──────────────────────────────────────────
        const result = await updatePaymentInInvoice(id, editingPaymentId, paymentData);
        setInvoice((prev) => ({ ...prev, ...result }));

        if (invoice.bookingId) {
          try {
            const booking = await getBookingById(invoice.bookingId);
            if (booking) {
              const newPaidAmount = result.amountReceived;
              const paymentStatus =
                newPaidAmount <= 0 ? "Unpaid" : newPaidAmount >= booking.totalAmount ? "Paid" : "Partial";
              const syncedBookingPayments = (booking.payments || []).map((p) =>
                p.invoicePaymentId === editingPaymentId
                  ? { ...p, amount, date: paymentData.date, mode: paymentData.paymentAccountName, reference: paymentData.reference, notes: paymentData.notes }
                  : p
              );
              await updateBooking(invoice.bookingId, { paidAmount: newPaidAmount, paymentStatus, payments: syncedBookingPayments });
            }
          } catch (e) {
            console.warn("[InvoiceDetail] Could not sync booking payment (non-critical):", e);
          }
        }
        toast.success("Payment updated");

      } else {
        // ── ADD new payment ────────────────────────────────────────────────
        const result = await addPaymentToInvoice(id, paymentData);
        setInvoice((prev) => ({ ...prev, ...result }));

        if (invoice.bookingId) {
          try {
            const booking = await getBookingById(invoice.bookingId);
            if (booking) {
              const newPaidAmount = result.amountReceived;
              const paymentStatus =
                newPaidAmount <= 0 ? "Unpaid" : newPaidAmount >= booking.totalAmount ? "Paid" : "Partial";

              const prevIds = new Set((invoice.payments || []).map((p) => p.id));
              const newInvPayment = result.payments.find((p) => !prevIds.has(p.id));

              const syncedBookingPayments = newInvPayment
                ? [
                    ...(booking.payments || []),
                    { amount: Number(newInvPayment.amount), date: newInvPayment.date, mode: newInvPayment.paymentAccountName || newInvPayment.mode || "Cash", reference: newInvPayment.reference || "", notes: newInvPayment.notes || "", invoicePaymentId: newInvPayment.id },
                  ]
                : booking.payments;

              await updateBooking(invoice.bookingId, { paidAmount: newPaidAmount, paymentStatus, payments: syncedBookingPayments });
            }
          } catch (e) {
            console.warn("[InvoiceDetail] Could not sync booking payment (non-critical):", e);
          }
        }
        toast.success("Payment recorded");
      }

      setPaymentDialogOpen(false);
      setEditingPaymentId(null);
    } catch (err) {
      toast.error(err.message || "Failed to save payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm("Remove this payment record?")) return;
    setDeletingPaymentId(paymentId);
    try {
      const result = await deletePaymentFromInvoice(id, paymentId);
      setInvoice((prev) => ({ ...prev, ...result }));

      // Sync booking payments[] + paidAmount if linked
      if (invoice.bookingId) {
        try {
          const booking = await getBookingById(invoice.bookingId);
          if (booking) {
            const newPaidAmount = result.amountReceived;
            const paymentStatus =
              newPaidAmount <= 0 ? "Unpaid" : newPaidAmount >= booking.totalAmount ? "Paid" : "Partial";

            // Remove the corresponding booking payment entry (matched by invoicePaymentId)
            const syncedBookingPayments = (booking.payments || []).filter(
              (p) => p.invoicePaymentId !== paymentId
            );

            await updateBooking(invoice.bookingId, {
              paidAmount: newPaidAmount,
              paymentStatus,
              payments: syncedBookingPayments,
            });
          }
        } catch (e) {
          console.warn("[InvoiceDetail] Could not sync booking payment (non-critical):", e);
        }
      }

      toast.success("Payment removed");
    } catch {
      toast.error("Failed to remove payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-theme-primary w-8 h-8" />
      </div>
    );
  }

  if (!invoice) return null;

  const lineItems = invoice.lineItems || [];
  const payments = invoice.payments || [];
  const balance = Number(invoice.amountDue) || 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`${panelBase}/invoices`)} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">
                  {invoice.invoiceNumber}
                </span>
                <StatusBadge
                  status={invoice.status || "Draft"}
                  fallback="Draft"
                  className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {invoice.customerName} · {formatDate(invoice.invoiceDate)}
                {invoice.bookingRef && ` · Booking: ${invoice.bookingRef}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleOpenPaymentDialog}
              className="rounded-xl font-bold h-9 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            >
              <IndianRupee className="w-4 h-4 mr-1.5" />
              Record Payment
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-xl font-bold h-9 text-xs"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`${panelBase}/invoices/create?id=${id}`)}
              className="rounded-xl font-bold h-9 text-xs"
            >
              <Edit3 className="w-4 h-4 mr-1.5" /> Edit
            </Button>
            <Button
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl h-9 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer Info */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Bill To
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              <p className="font-bold text-slate-800">{invoice.customerName || "—"}</p>
              {invoice.customerMobile && (
                <a href={`tel:${invoice.customerMobile}`} className="block text-sm text-slate-500 mt-0.5 hover:text-theme-primary hover:underline">{invoice.customerMobile}</a>
              )}
              {invoice.customerEmail && (
                <p className="text-sm text-slate-500">{invoice.customerEmail}</p>
              )}
              {invoice.customerAddress && (
                <p className="text-sm text-slate-500 mt-0.5">{invoice.customerAddress}</p>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-t border-slate-100">
                      <th className="text-left px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Description</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Qty</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Unit Price</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Discount</th>
                      <th className="text-right px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">GST</th>
                      <th className="text-right px-6 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-6 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-3">
                          {item.itemName && (
                            <p className="font-bold text-slate-800">{item.itemName}</p>
                          )}
                          {item.description && (
                            <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          {!item.itemName && !item.description && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-right text-rose-500 text-xs">
                          {item.discountAmount > 0
                            ? `-${formatCurrency(item.discountAmount)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-xs">
                          {item.gstRate > 0 ? (
                            <span>
                              <span className="text-slate-500">{item.gstRate}%</span>
                              <span className="block text-slate-600 font-medium">
                                {formatCurrency(item.gstAmount)}
                              </span>
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Payments ({payments.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold h-8 gap-1 text-emerald-600 border-emerald-300"
                onClick={handleOpenPaymentDialog}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {payments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {payments.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">
                            {pay.paymentAccountName || pay.mode}
                          </span>
                          {pay.reference && (
                            <span className="text-[11px] font-mono text-slate-400">{pay.reference}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(pay.date)}
                          {pay.mode && pay.paymentAccountName !== pay.mode && ` · ${pay.mode}`}
                          {pay.notes && ` · ${pay.notes}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-blue-500 hover:bg-blue-50"
                          onClick={() => handleOpenPaymentDialog(pay)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          disabled={deletingPaymentId === pay.id}
                          onClick={() => handleDeletePayment(pay.id)}
                        >
                          {deletingPaymentId === pay.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {(invoice.notes || invoice.termsAndConditions) && (
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="px-6 py-5 space-y-3">
                {invoice.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</p>
                    <p className="text-sm text-slate-600">{invoice.notes}</p>
                  </div>
                )}
                {invoice.termsAndConditions && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Terms & Conditions</p>
                    <p className="text-sm text-slate-500">{invoice.termsAndConditions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Financial Summary */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700">
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
              {invoice.discountTotal > 0 && (
                <Row label="Discount" value={`-${formatCurrency(invoice.discountTotal)}`} color="text-rose-600" />
              )}
              <Row label="Taxable Amount" value={formatCurrency(invoice.taxableAmount)} />
              {invoice.gstType === "inter" ? (
                invoice.igst > 0 && <Row label="IGST" value={formatCurrency(invoice.igst)} />
              ) : (
                <>
                  {invoice.cgst > 0 && <Row label="CGST" value={formatCurrency(invoice.cgst)} />}
                  {invoice.sgst > 0 && <Row label="SGST" value={formatCurrency(invoice.sgst)} />}
                </>
              )}
              <Separator />
              <Row label="Grand Total" value={formatCurrency(invoice.grandTotal)} bold />
              <Separator />
              <Row label="Amount Received" value={formatCurrency(invoice.amountReceived)} color="text-emerald-600" />
              <Row
                label="Balance Due"
                value={formatCurrency(balance)}
                color={balance > 0 ? "text-rose-600" : "text-emerald-600"}
                bold
              />
              <Separator />
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-slate-500">Payment Status</span>
                <StatusBadge
                  status={invoice.paymentStatus || "Unpaid"}
                  fallback="Unpaid"
                  className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="px-5 py-5 space-y-3">
              <Detail label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
              {invoice.dueDate && <Detail label="Due Date" value={formatDate(invoice.dueDate)} />}
              <Detail label="GST Type" value={invoice.gstType === "inter" ? "Interstate (IGST)" : "Intrastate (CGST+SGST)"} />
              {invoice.sourceType === "booking" && (
                <>
                  {invoice.bookingRef && <Detail label="Booking Ref" value={invoice.bookingRef} />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full rounded-xl mt-1 text-xs font-semibold text-theme-primary hover:bg-blue-50"
                    onClick={() => router.push(`${panelBase}/bookings/${invoice.bookingId}`)}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                    View Booking
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setEditingPaymentId(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900">
            {editingPaymentId ? "Edit Payment" : "Record Payment"}
          </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Amount (₹) *</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                className="rounded-xl"
                placeholder="0.00"
                autoFocus
              />
              {balance > 0 && (
                <button
                  className="text-xs text-theme-primary mt-1 hover:underline"
                  onClick={() => setPaymentForm((p) => ({ ...p, amount: String(balance) }))}
                >
                  Use balance: {formatCurrency(balance)}
                </button>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            {paymentAccounts.length > 0 ? (
              <div>
                <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Payment Account</Label>
                <Select value={paymentForm.paymentAccountId} onValueChange={handleAccountChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Payment Mode</Label>
                <Select
                  value={paymentForm.mode}
                  onValueChange={(v) => setPaymentForm((p) => ({ ...p, mode: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cash", "Bank Transfer", "UPI", "Card", "Cheque", "Online"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  <button
                    className="text-theme-primary hover:underline"
                    onClick={() => {
                      setPaymentDialogOpen(false);
                      router.push("/agent-panel/settings/payment-accounts");
                    }}
                  >
                    Set up payment accounts
                  </button>
                  {" "}for better tracking
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Reference / Cheque No.</Label>
              <Input
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))}
                className="rounded-xl"
                placeholder="UTR, Cheque number, etc."
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                className="rounded-xl"
                placeholder="Any note about this payment"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleSavePayment}
                disabled={savingPayment}
              >
                {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPaymentId ? "Update Payment" : "Save Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`${bold ? "font-black" : "font-semibold"} ${color || "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-700 mt-0.5">{value}</p>
    </div>
  );
}
