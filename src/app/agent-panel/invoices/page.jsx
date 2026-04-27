"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { getInvoicesByAgent, deleteInvoice } from "@/firebase/invoicesService";
import {
  Plus,
  Search,
  FileText,
  Loader2,
  Trash2,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import toast from "react-hot-toast";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";

const formatCurrency = (n) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Paid", "Partial", "Overdue", "Cancelled"];

export default function InvoicesPage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const agentId = user?.uid;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const data = await getInvoicesByAgent(agentId);
        setInvoices(data);
      } catch (err) {
        toast.error("Failed to load invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "All") list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoiceNumber?.toLowerCase().includes(q) ||
          i.customerName?.toLowerCase().includes(q) ||
          i.customerMobile?.includes(q)
      );
    }
    return list;
  }, [invoices, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice permanently?")) return;
    setDeletingId(id);
    try {
      await deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invoice deleted");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (invoice) => {
    setDownloadingId(invoice.id);
    try {
      await generateInvoicePDF(invoice);
    } catch {
      toast.error("PDF generation failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const totalReceived = invoices.reduce((s, i) => s + (Number(i.amountReceived) || 0), 0);
  const totalDue = totalInvoiced - totalReceived;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-slate-900 tracking-tight">Invoices</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold h-9 text-xs"
              onClick={() => router.push("/agent-panel/settings/payment-accounts")}
            >
              Payment Accounts
            </Button>
            <Button
              onClick={() => router.push("/agent-panel/invoices/create")}
              className="rounded-xl font-bold h-9 bg-theme-primary hover:bg-theme-primary/90 text-white text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Total Invoiced" value={formatCurrency(totalInvoiced)} color="text-slate-800" />
          <SummaryCard label="Amount Received" value={formatCurrency(totalReceived)} color="text-emerald-600" />
          <SummaryCard label="Outstanding Due" value={formatCurrency(totalDue)} color={totalDue > 0 ? "text-rose-600" : "text-emerald-600"} />
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by invoice #, customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3 text-slate-200" />
            <p className="font-medium">No invoices found</p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => router.push("/agent-panel/invoices/create")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create your first invoice
            </Button>
          </div>
        ) : (
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Invoice #
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Customer
                      </th>
                      <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Date
                      </th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Grand Total
                      </th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Received
                      </th>
                      <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Due
                      </th>
                      <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, i) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                        onClick={() => router.push(`/agent-panel/invoices/${inv.id}`)}
                      >
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/agent-panel/invoices/${inv.id}`); }}
                            className="font-bold text-theme-primary hover:underline text-sm"
                          >
                            {inv.invoiceNumber || "—"}
                          </button>
                          {inv.bookingRef && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Booking: {inv.bookingRef}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800">{inv.customerName || "—"}</p>
                          {inv.customerMobile && (
                            <a href={`tel:${inv.customerMobile}`} className="text-[11px] text-slate-400 hover:text-theme-primary hover:underline" onClick={(e) => e.stopPropagation()}>{inv.customerMobile}</a>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {formatDate(inv.invoiceDate)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">
                          {formatCurrency(inv.amountReceived)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-rose-600">
                          {formatCurrency(inv.amountDue)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge
                            status={inv.status || "Draft"}
                            fallback="Draft"
                            className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          />
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-700 hover:text-theme-primary"
                              onClick={() => handleDownload(inv)}
                              disabled={downloadingId === inv.id}
                              title="Download PDF"
                            >
                              {downloadingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-700 hover:text-red-500"
                              onClick={() => handleDelete(inv.id)}
                              disabled={deletingId === inv.id}
                              title="Delete"
                            >
                              {deletingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="px-5 py-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
