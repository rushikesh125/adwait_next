"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  FileText,
  Loader2,
  Search,
  RefreshCw,
  MapPin,
  Calendar,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { getAgentsByAdmin, getQuotationsByAdmin } from "@/firebase/adminService";
import toast from "react-hot-toast";

export default function AdminTeamQuotationsPage() {
  const { user } = useSelector((s) => s.auth);
  const [quotations, setQuotations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const agentList = await getAgentsByAdmin(user.uid, user.orgId);
      setAgents(agentList);
      const agentIds = agentList.map((a) => a.id);
      const q = await getQuotationsByAdmin(agentIds, user.orgId);
      setQuotations(q);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid, user?.orgId]);

  const agentMap = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a.name])), [agents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter(
      (qt) =>
        qt.destination?.toLowerCase().includes(q) ||
        qt.customerName?.toLowerCase().includes(q) ||
        agentMap[qt.agentId]?.toLowerCase().includes(q),
    );
  }, [quotations, search, agentMap]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatCurrency = (val) => {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" /> Team Quotations
          </h1>
          <p className="text-sm text-slate-500 mt-1">{quotations.length} quotations across your team</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4 px-5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search quotations..."
              className="pl-9 h-9 rounded-xl text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
            </div>
          ) : !filtered.length ? (
            <p className="text-sm text-slate-400 text-center py-12">No quotations found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Customer</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Destination</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Travel Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Agent</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((qt) => (
                  <TableRow key={qt.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-800">{qt.customerName || qt.name || "—"}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {qt.destination ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />{qt.destination}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {qt.travelDate ? (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />{qt.travelDate}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 text-sm">
                      {formatCurrency(qt.totalAmount ?? qt.grandTotal ?? qt.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={qt.status} fallback="Draft" />
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {agentMap[qt.agentId] || "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(qt.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
