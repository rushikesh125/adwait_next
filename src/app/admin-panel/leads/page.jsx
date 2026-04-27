"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Briefcase, Loader2, Search, RefreshCw, Phone, Calendar,
  MapPin, UserPlus, Trash2, Plus, X, Eye, Edit3,
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
import {
  getLeadsByAdmin, getAgentsByAdmin, assignLeadToAgent,
} from "@/firebase/adminService";
import { updateLeadStatus, deleteLead, addLead } from "@/firebase/leadsService";
import { addFollowUp } from "@/firebase/followUpService";
import { enquiryInitialValues } from "@/lib/enquiryForm";
import LeadForm from "@/components/leads/LeadForm";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["All", "New", "Contacted", "Quotation Sent", "Closed Won", "Closed Lost"];
const STATUS_COLORS = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-amber-100 text-amber-700",
  "Quotation Sent": "bg-violet-100 text-violet-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-rose-100 text-rose-700",
};

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function AdminLeadsPage() {
  const { user } = useSelector((s) => s.auth);
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [agentMap, setAgentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Assign dialog
  const [assigningLead, setAssigningLead] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  // Create lead dialog
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...enquiryInitialValues, email: "", mobile: "" });
  const [createAgentId, setCreateAgentId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        getLeadsByAdmin(user.uid),
        getAgentsByAdmin(user.uid),
      ]);
      setLeads(l);
      setAgents(a);
      const map = {};
      a.forEach((ag) => { map[ag.id] = ag.name || ag.email || "Agent"; });
      setAgentMap(map);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid]);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter !== "All") result = result.filter((l) => l.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter(
      (l) => l.name?.toLowerCase().includes(q) || l.destination?.toLowerCase().includes(q) || l.mobile?.includes(q)
    );
    return result;
  }, [leads, search, statusFilter]);

  const metrics = useMemo(() => {
    const counts = {};
    STATUS_OPTIONS.slice(1).forEach((s) => { counts[s] = leads.filter((l) => l.status === s).length; });
    return counts;
  }, [leads]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Status update failed"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lead deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleAssign = async () => {
    if (!assigningLead || !selectedAgentId) return;
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;
    setSaving(true);
    try {
      await assignLeadToAgent(assigningLead.id, agent);
      setLeads((prev) => prev.map((l) =>
        l.id === assigningLead.id ? { ...l, agentId: agent.id, assignedAgentName: agent.name } : l
      ));
      toast.success(`Assigned to ${agent.name}`);
      setAssigningLead(null);
    } catch { toast.error("Assignment failed"); }
    finally { setSaving(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const agent = agents.find((a) => a.id === createAgentId);
    try {
      const leadId = await addLead({
        ...form,
        agentId: agent?.id || null,
        assignedAgentId: agent?.id || null,
        assignedAgentName: agent?.name || "",
        adminId: user.uid,
        status: "New",
      });
      try {
        await addFollowUp(leadId, {
          dateTime: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
          mode: "Call", notes: "Initial follow-up for new lead", quotationIds: [],
        });
      } catch {}
      toast.success("Lead created");
      setShowCreate(false);
      setForm({ ...enquiryInitialValues, email: "", mobile: "" });
      setCreateAgentId("");
      load();
    } catch { toast.error("Failed to create lead"); }
    finally { setCreating(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-blue-500" /> Leads
          </h1>
          <p className="text-sm text-slate-500 mt-1">{leads.length} total leads across your team</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" className="gap-2 rounded-xl bg-theme-primary hover:bg-theme-secondary text-white" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {STATUS_OPTIONS.slice(1).map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
            className={`rounded-xl border p-3 text-left transition-all text-sm font-semibold ${statusFilter === s ? "ring-2 ring-theme-primary border-theme-primary bg-theme-muted" : "bg-white border-slate-200 hover:border-slate-300"}`}>
            <p className="text-xs text-slate-500 font-medium">{s}</p>
            <p className={`text-xl font-black mt-0.5 ${STATUS_COLORS[s]?.split(" ")[1] || "text-slate-800"}`}>{metrics[s] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4 px-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search leads..." className="pl-9 h-9 rounded-xl text-sm"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${statusFilter === s ? "bg-theme-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-theme-primary" /></div>
          ) : !filtered.length ? (
            <p className="text-sm text-slate-400 text-center py-12">No leads found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  {["Name", "Mobile", "Destination", "Travel Date", "Status", "Agent", "Received", "Actions"].map((h) => (
                    <TableHead key={h} className="text-xs uppercase tracking-wider font-bold text-slate-500">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-slate-50/60">
                    <TableCell className="font-semibold text-slate-800">{lead.name || "—"}</TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {lead.mobile ? <a href={`tel:${lead.mobile}`} className="hover:text-theme-primary flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{lead.mobile}</a> : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {lead.destination ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" />{lead.destination}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {lead.travelDate ? <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />{lead.travelDate}</span> : "—"}
                    </TableCell>
                    <TableCell>
                      <Select value={lead.status || "New"} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-36 rounded-lg border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.slice(1).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.agentId ? (
                        <span className="text-slate-700 font-medium">{agentMap[lead.agentId] || lead.assignedAgentName || "—"}</span>
                      ) : (
                        <button onClick={() => { setAssigningLead(lead); setSelectedAgentId(""); }}
                          className="flex items-center gap-1 text-xs text-amber-600 font-semibold hover:text-amber-700">
                          <UserPlus className="h-3 w-3" /> Assign
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(lead.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-theme-primary"
                          onClick={() => router.push(`/admin-panel/leads/${lead.id}`)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700"
                          onClick={() => router.push(`/admin-panel/leads/${lead.id}`)} title="Edit">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={() => handleDelete(lead.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={!!assigningLead} onOpenChange={(o) => { if (!o) setAssigningLead(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Lead</DialogTitle>
            <DialogDescription>Assign <strong>{assigningLead?.name}</strong> to an agent.</DialogDescription>
          </DialogHeader>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Select an agent…" /></SelectTrigger>
            <SelectContent>
              {agents.filter((a) => a.approved === "accepted").map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAssigningLead(null)}>Cancel</Button>
            <Button className="rounded-xl bg-theme-primary text-white" onClick={handleAssign} disabled={!selectedAgentId || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-slate-900">New Lead</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Assign to Agent (optional)</label>
                <Select value={createAgentId} onValueChange={setCreateAgentId}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Leave unassigned or pick an agent…" /></SelectTrigger>
                  <SelectContent>
                    {agents.filter((a) => a.approved === "accepted").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LeadForm
                form={form}
                onChange={(e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
                onSubmit={handleCreate}
              />
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button className="bg-theme-primary text-white rounded-xl" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Lead
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
