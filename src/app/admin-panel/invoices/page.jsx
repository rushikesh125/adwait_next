"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Receipt, Loader2, Search, RefreshCw, Download, Trash2, Eye, Filter, Edit3,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { getAgentsByAdmin, getInvoicesByAdmin } from "@/firebase/adminService";
import { deleteInvoice } from "@/firebase/invoicesService";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Paid", "Partial", "Overdue", "Cancelled"];

const formatCurrency = (n) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

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

export default function AdminInvoicesPage() {
  const { user } = useSelector((s) => s.auth);
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const agents = await getAgentsByAdmin(user.uid);
      const map = {};
      agents.forEach((a) => { map[a.id] = a.name || a.email || "Agent"; });
      setAgentMap(map);
      const agentIds = agents.map((a) => a.id);
      const inv = await getInvoicesByAdmin(agentIds);
      setInvoices(inv);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "All") list = list.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
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
    } catch { toast.error("Delete failed"); }
    finally { setDeletingId(null); }
  };

const handleDownload = async (invoice) => {
  console.log("[AdminInvoicesPage handleDownload] Invoice:", invoice);
  setDownloadingId(invoice.id);
  try {
    await generateInvoicePDF(invoice);
  } catch (err) {
    console.error("[AdminInvoicesPage handleDownload] Full error:", err);
    console.error("[AdminInvoicesPage handleDownload] Stack:", err?.stack);
    toast.error(`PDF generation failed: ${err?.message || "Unknown error"}`);
  } finally {
    setDownloadingId(null);
  }
};

  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const totalReceived = invoices.reduce((s, i) => s + (Number(i.amountReceived) || 0), 0);
  const totalDue = totalInvoiced - totalReceived;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-theme-primary" /> Invoices
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""} across team</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Total Invoiced" value={formatCurrency(totalInvoiced)} color="text-slate-800" />
          <SummaryCard label="Amount Received" value={formatCurrency(totalReceived)} color="text-emerald-600" />
          <SummaryCard label="Outstanding Due" value={formatCurrency(totalDue)} color={totalDue > 0 ? "text-rose-600" : "text-emerald-600"} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by invoice #, customer name…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-theme-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Receipt className="w-12 h-12 mb-3 text-slate-200" />
            <p className="font-medium">No invoices found</p>
          </div>
        ) : (
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Invoice #", "Customer", "Date", "Grand Total", "Received", "Due", "Status", "Agent", ""].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 ${["Grand Total", "Received", "Due"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv, i) => (
                      <tr key={inv.id} className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-theme-primary text-sm">{inv.invoiceNumber || "—"}</p>
                          {inv.bookingRef && <p className="text-[10px] text-slate-400">Booking: {inv.bookingRef}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800">{inv.customerName || "—"}</p>
                          {inv.customerMobile && <p className="text-[11px] text-slate-400">{inv.customerMobile}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(inv.invoiceDate)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-800">{formatCurrency(inv.grandTotal)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{formatCurrency(inv.amountReceived)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-rose-600">{formatCurrency(inv.amountDue)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={inv.status || "Draft"} fallback="Draft"
                            className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">
                          {agentMap[inv.agentId] || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-theme-primary"
                              onClick={() => router.push(`/admin-panel/invoices/${inv.id}`)} title="View">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              onClick={() => router.push(`/admin-panel/invoices/${inv.id}`)} title="Edit">
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-theme-primary"
                              onClick={() => handleDownload(inv)} disabled={downloadingId === inv.id} title="Download PDF">
                              {downloadingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                              onClick={() => handleDelete(inv.id)} disabled={deletingId === inv.id} title="Delete">
                              {deletingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
