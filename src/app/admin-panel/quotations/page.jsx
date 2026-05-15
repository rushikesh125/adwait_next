"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  FileText, Loader2, Search, RefreshCw, ChevronLeft, ChevronRight, Filter,
  Eye, Edit3, X, Hotel, Car, Activity, MapPin, Calendar, Users,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { setEditingQuotation } from "@/store/packageSlice";
import StatusBadge from "@/components/StatusBadge";
import { getAgentsByAdmin, getQuotationsByAdmin } from "@/firebase/adminService";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["All", "Draft", "Sent", "Accepted", "Rejected"];

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function AdminQuotationsPage() {
  const { user } = useSelector((s) => s.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const [quotations, setQuotations] = useState([]);
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const agents = await getAgentsByAdmin(user.uid);
      const map = {};
      agents.forEach((a) => { map[a.id] = a.name || a.email || "Agent"; });
      setAgentMap(map);
      const agentIds = agents.map((a) => a.id);
      const q = await getQuotationsByAdmin(agentIds);
      setQuotations(q);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid]);

  const filtered = useMemo(() => {
    let data = quotations;
    if (statusFilter !== "All") data = data.filter((q) => (q.status || "Draft") === statusFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter((q) =>
        q.leadName?.toLowerCase().includes(s) ||
        q.customerName?.toLowerCase().includes(s) ||
        q.destination?.toLowerCase().includes(s) ||
        q.title?.toLowerCase().includes(s) ||
        q.refNumber?.toLowerCase().includes(s) ||
        q.customerMobile?.toLowerCase().includes(s) ||
        q.mobile?.toLowerCase().includes(s) ||
        q.customerEmail?.toLowerCase().includes(s) ||
        q.email?.toLowerCase().includes(s)
      );
    }
    return data;
  }, [quotations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_OPTIONS.slice(1).forEach((s) => {
      counts[s] = quotations.filter((q) => (q.status || "Draft") === s).length;
    });
    return counts;
  }, [quotations]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-theme-primary p-2 rounded-lg text-white"><FileText size={20} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Quotations</h1>
              <p className="text-xs text-slate-400">{quotations.length} total across team</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-6 space-y-5">
        {/* Status summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATUS_OPTIONS.slice(1).map((s) => (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
              className={`bg-white rounded-2xl border p-4 shadow-sm text-left transition-all ${statusFilter === s ? "ring-2 ring-theme-primary border-theme-primary" : "border-slate-200 hover:border-slate-300"}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s}</p>
              <p className="text-2xl font-black leading-none mt-1 text-slate-800">{statusCounts[s] || 0}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by customer, destination..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-sm"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-40 rounded-xl border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <div className="flex items-center gap-2"><Filter className="w-4 h-4" /><SelectValue /></div>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {["Customer / Lead", "Destination", "Travel Dates", "Nights", "Status", "Agent", "Created", "Actions"].map((h) => (
                  <TableHead key={h} className="text-xs uppercase tracking-wider font-bold text-slate-500 py-3">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-theme-primary" /></TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-16 text-center text-slate-400 text-sm">No quotations found</TableCell></TableRow>
              ) : paged.map((q) => (
                <TableRow key={`${q.agentId}-${q.id}`} className="hover:bg-slate-50/60">
                  <TableCell>
                    <p className="font-semibold text-slate-800">{q.leadName || q.customerName || "—"}</p>
                    {q.customerMobile && <p className="text-xs text-slate-400">{q.customerMobile}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{q.destination || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {q.startDate && <div>{q.startDate}</div>}
                    {q.endDate && <div className="text-slate-400">to {q.endDate}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{q.numNights ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={q.status || "Draft"} fallback="Draft"
                      className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 font-medium">
                    {agentMap[q.agentId] || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(q.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-theme-primary"
                        onClick={() => setViewingQuotation(q)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        onClick={() => {
                          dispatch(setEditingQuotation(q));
                          const p = new URLSearchParams();
                          p.set("quotationId", q.id);
                          if (q.customerId) p.set("customerId", q.customerId);
                          if (q.leadId) p.set("leadId", q.leadId);
                          router.push(`/admin-panel/quotations/create?${p.toString()}`);
                        }} title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {!loading && filtered.length > pageSize && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-2 self-center">{currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quotation detail slide-over */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewingQuotation(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewingQuotation.leadName || viewingQuotation.customerName || "Quotation"}</h2>
                <p className="text-xs text-slate-400">{viewingQuotation.destination}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={viewingQuotation.status || "Draft"} fallback="Draft"
                  className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setViewingQuotation(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              {/* Customer info */}
              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</p>
                <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                  <p className="font-semibold text-slate-800">{viewingQuotation.leadName || viewingQuotation.customerName || "—"}</p>
                  {viewingQuotation.customerMobile && <p className="text-slate-500">{viewingQuotation.customerMobile}</p>}
                  {viewingQuotation.customerEmail && <p className="text-slate-500">{viewingQuotation.customerEmail}</p>}
                </div>
              </section>

              {/* Trip details */}
              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trip Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {viewingQuotation.destination && (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div><p className="text-xs text-slate-400">Destination</p><p className="font-semibold text-slate-800">{viewingQuotation.destination}</p></div>
                    </div>
                  )}
                  {(viewingQuotation.numNights || viewingQuotation.numDays) && (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div><p className="text-xs text-slate-400">Duration</p><p className="font-semibold text-slate-800">{viewingQuotation.numNights ?? "—"}N / {viewingQuotation.numDays ?? "—"}D</p></div>
                    </div>
                  )}
                  {(viewingQuotation.adults || viewingQuotation.children) && (
                    <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                      <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div><p className="text-xs text-slate-400">Guests</p><p className="font-semibold text-slate-800">{viewingQuotation.adults || 0} Adults{viewingQuotation.children ? `, ${viewingQuotation.children} Children` : ""}</p></div>
                    </div>
                  )}
                  {viewingQuotation.startDate && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400">Travel Dates</p>
                      <p className="font-semibold text-slate-800">{viewingQuotation.startDate}{viewingQuotation.endDate ? ` → ${viewingQuotation.endDate}` : ""}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Hotels */}
              {viewingQuotation.hotelSummary?.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5" /> Hotels</p>
                  <div className="space-y-2">
                    {viewingQuotation.hotelSummary.map((h, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3">
                        <p className="font-semibold text-slate-800">{h.hotel || h.hotelName || "Hotel"}</p>
                        <p className="text-xs text-slate-500">{h.city} · {h.nights ?? "?"} nights · {h.selectedMealPlan || h.mealPlan || "—"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Transport */}
              {viewingQuotation.transportSummary && (
                <section className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Car className="h-3.5 w-3.5" /> Transport</p>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="font-semibold text-slate-800">{viewingQuotation.transportSummary.vehicle || viewingQuotation.transportSummary.type || "—"}</p>
                    {viewingQuotation.transportSummary.state && <p className="text-xs text-slate-500">{viewingQuotation.transportSummary.state}</p>}
                  </div>
                </section>
              )}

              {/* Activities */}
              {viewingQuotation.activitySummary?.length > 0 && (
                <section className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Activities</p>
                  <div className="space-y-1">
                    {viewingQuotation.activitySummary.map((a, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl px-3 py-2 text-slate-700 text-sm">{a.activity || a.name || a}</div>
                    ))}
                  </div>
                </section>
              )}

              {/* Pricing */}
              {viewingQuotation.totalCost != null && (
                <section className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pricing</p>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    {viewingQuotation.totalCost != null && (
                      <div className="flex justify-between"><span className="text-slate-500">Total Cost</span><span className="font-bold text-slate-800">₹{Number(viewingQuotation.totalCost).toLocaleString("en-IN")}</span></div>
                    )}
                    {viewingQuotation.sellingPrice != null && (
                      <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-semibold text-slate-700">Selling Price</span><span className="font-black text-theme-primary text-base">₹{Number(viewingQuotation.sellingPrice).toLocaleString("en-IN")}</span></div>
                    )}
                  </div>
                </section>
              )}

              {/* Agent */}
              <section className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Agent</p>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="font-semibold text-slate-800">{agentMap[viewingQuotation.agentId] || "—"}</p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex gap-3">
              <Button className="flex-1 bg-theme-primary hover:bg-theme-secondary text-white rounded-xl gap-2"
                onClick={() => {
                  dispatch(setEditingQuotation(viewingQuotation));
                  const p = new URLSearchParams();
                  p.set("quotationId", viewingQuotation.id);
                  if (viewingQuotation.customerId) p.set("customerId", viewingQuotation.customerId);
                  if (viewingQuotation.leadId) p.set("leadId", viewingQuotation.leadId);
                  router.push(`/admin-panel/quotations/create?${p.toString()}`);
                }}>
                <Edit3 className="h-4 w-4" /> Edit Quotation
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setViewingQuotation(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
