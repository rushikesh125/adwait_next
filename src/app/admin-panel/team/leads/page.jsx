"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Briefcase,
  Loader2,
  Search,
  MapPin,
  Calendar,
  Phone,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { getLeadsByAdmin, getAgentsByAdmin, assignLeadToAgent } from "@/firebase/adminService";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["All", "New", "Contacted", "Quotation Sent", "Closed Won", "Closed Lost"];

export default function AdminTeamLeadsPage() {
  const { user } = useSelector((s) => s.auth);
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [assigningLead, setAssigningLead] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        getLeadsByAdmin(user.uid, user.orgId),
        getAgentsByAdmin(user.uid, user.orgId),
      ]);
      setLeads(l);
      setAgents(a.filter((ag) => ag.approved === "accepted"));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid, user?.orgId]);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter !== "All") result = result.filter((l) => l.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.destination?.toLowerCase().includes(q) ||
          l.mobile?.includes(q) ||
          l.assignedAgentName?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [leads, search, statusFilter]);

  const handleAssign = async () => {
    if (!assigningLead || !selectedAgentId) return;
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;
    setSaving(true);
    try {
      await assignLeadToAgent(assigningLead.id, agent);
      toast.success(`Lead assigned to ${agent.name}`);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === assigningLead.id
            ? { ...l, agentId: agent.id, assignedAgentId: agent.id, assignedAgentName: agent.name }
            : l,
        ),
      );
      setAssigningLead(null);
      setSelectedAgentId("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign lead");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-500" /> Team Leads
          </h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} total leads across your team</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4 px-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search leads..."
                className="pl-9 h-9 rounded-xl text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    statusFilter === s
                      ? "bg-theme-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
            </div>
          ) : !filtered.length ? (
            <p className="text-sm text-slate-400 text-center py-12">No leads found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Mobile</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Destination</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Travel Date</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Agent</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Received</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-800">{lead.name || "—"}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {lead.mobile ? (
                        <a href={`tel:${lead.mobile}`} className="hover:text-theme-primary hover:underline flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />{lead.mobile}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {lead.destination ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />{lead.destination}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {lead.travelDate ? (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />{lead.travelDate}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} fallback="New" />
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {lead.assignedAgentName || (
                        <span className="text-amber-500 font-medium text-xs">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(lead.createdAt)}</TableCell>
                    <TableCell>
                      {!lead.agentId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1.5 text-xs h-8 border-slate-200"
                          onClick={() => { setAssigningLead(lead); setSelectedAgentId(""); }}
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!assigningLead} onOpenChange={(open) => { if (!open) setAssigningLead(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Lead</DialogTitle>
            <DialogDescription>
              Assign <strong>{assigningLead?.name}</strong> to an agent.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Select an agent…" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAssigningLead(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-theme-primary hover:bg-theme-secondary text-white"
              onClick={handleAssign}
              disabled={!selectedAgentId || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
