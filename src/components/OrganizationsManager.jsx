"use client";

/**
 * OrganizationsManager
 *
 * Super-admin UI for:
 *  1. Viewing all organizations with member counts
 *  2. Creating new organizations
 *  3. Assigning / unassigning admins & agents to an org
 *  4. Toggling org active state
 *
 * Uses a searchable combobox (UserCombobox) for all user assignments
 * to handle large lists with ease.
 */

import { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Building2,
  Plus,
  Users,
  ShieldCheck,
  UserRound,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  ToggleLeft,
  ToggleRight,
  Link2,
  Link2Off,
  Check,
  Pencil,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  assignAdminToOrg,
  assignAgentToOrg,
  assignAdminAgentsToOrg,
} from "@/firebase/organizationService";

// ── NEW: shadcn Command / Popover for searchable combobox ──
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */

const PLAN_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const PLAN_COLORS = {
  basic: "bg-slate-100 text-slate-600 border-slate-200",
  pro: "bg-sky-50 text-sky-700 border-sky-200",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200",
};

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function initials(name = "") {
  return (name || "??")
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ─────────────────────────────────────────────────────────────
   REUSABLE SEARCHABLE COMBOBOX
───────────────────────────────────────────────────────────── */

function UserCombobox({
  users = [],
  selectedUserId,
  onSelect,
  placeholder = "Search by name or email…",
  emptyMessage = "No user found.",
  className,
}) {
  const [open, setOpen] = useState(false);
  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-xl border-slate-200 h-10 font-normal text-sm",
            !selectedUser && "text-slate-400",
            className
          )}
        >
          {selectedUser ? (
            <span className="truncate">
              {selectedUser.name || selectedUser.email} ({selectedUser.email})
            </span>
          ) : (
            "Select user…"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border-slate-200 shadow-lg">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} className="h-9 text-sm border-0" />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-slate-400">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onSelect(user.id === selectedUserId ? "" : user.id);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      user.id === selectedUserId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {user.name || user.email}{" "}
                    <span className="text-slate-400">({user.email})</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

const MemberPill = ({ name, email, role, onRemove, onAdd, mode = "remove" }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group">
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
        role === "admin"
          ? "bg-gradient-to-br from-orange-400 to-rose-500"
          : "bg-gradient-to-br from-sky-400 to-indigo-500"
      }`}
    >
      {initials(name)}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-700 truncate">{name || "—"}</p>
      <p className="text-[10px] text-slate-400 truncate">{email || "—"}</p>
    </div>
    {mode === "remove" ? (
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 flex-shrink-0"
        title="Unassign from org"
      >
        <Link2Off size={14} />
      </button>
    ) : (
      <button
        onClick={onAdd}
        className="text-emerald-500 hover:text-emerald-700 flex-shrink-0"
        title="Assign to org"
      >
        <Link2 size={14} />
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   ORG CARD
───────────────────────────────────────────────────────────── */

function OrgCard({ org, onRefresh, allAdmins, allAgents }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState({ admins: [], agents: [] });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Assign dialogs
  const [assignAdminOpen, setAssignAdminOpen] = useState(false);
  const [assignAgentOpen, setAssignAgentOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assigningAdmin, setAssigningAdmin] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [bulkAssignAdminId, setBulkAssignAdminId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const [adminSnap, agentSnap] = await Promise.all([
        getDocs(query(collection(db, "admins"), where("orgId", "==", org.id))),
        getDocs(query(collection(db, "agents"), where("orgId", "==", org.id))),
      ]);
      setMembers({
        admins: adminSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        agents: agentSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    } catch {
      toast.error("Failed to load org members");
    } finally {
      setLoadingMembers(false);
    }
  }, [org.id]);

  useEffect(() => {
    if (expanded) fetchMembers();
  }, [expanded, fetchMembers]);

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      await updateDoc(doc(db, "organizations", org.id), {
        isActive: !org.isActive,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Organization ${org.isActive ? "deactivated" : "activated"}`);
      onRefresh();
    } catch {
      toast.error("Failed to update organization status");
    } finally {
      setToggling(false);
    }
  };

  const handleUnassignAdmin = async (adminId) => {
    try {
      await assignAdminToOrg(adminId, null);
      toast.success("Admin unassigned from org");
      fetchMembers();
      onRefresh();
    } catch {
      toast.error("Failed to unassign admin");
    }
  };

  const handleUnassignAgent = async (agentId) => {
    try {
      await assignAgentToOrg(agentId, null);
      toast.success("Agent unassigned from org");
      fetchMembers();
      onRefresh();
    } catch {
      toast.error("Failed to unassign agent");
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedAdminId) return;
    setAssigningAdmin(true);
    try {
      await assignAdminToOrg(selectedAdminId, org.id);
      toast.success("Admin assigned to organization");
      setAssignAdminOpen(false);
      setSelectedAdminId("");
      fetchMembers();
      onRefresh();
    } catch {
      toast.error("Failed to assign admin");
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) return;
    setAssigningAgent(true);
    try {
      await assignAgentToOrg(selectedAgentId, org.id);
      toast.success("Agent assigned to organization");
      setAssignAgentOpen(false);
      setSelectedAgentId("");
      fetchMembers();
      onRefresh();
    } catch {
      toast.error("Failed to assign agent");
    } finally {
      setAssigningAgent(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignAdminId) return;
    setBulkAssigning(true);
    try {
      const count = await assignAdminAgentsToOrg(bulkAssignAdminId, org.id);
      toast.success(
        count > 0
          ? `${count} agent(s) under that admin also assigned to this org`
          : "No agents found under that admin"
      );
      fetchMembers();
      onRefresh();
      setBulkAssignAdminId("");
    } catch {
      toast.error("Bulk assign failed");
    } finally {
      setBulkAssigning(false);
    }
  };

  // Unassigned users for comboboxes
  const unassignedAdmins = allAdmins.filter(
    (a) => !a.orgId && !members.admins.find((m) => m.id === a.id)
  );
  const unassignedAgents = allAgents.filter(
    (a) => !a.orgId && !members.agents.find((m) => m.id === a.id)
  );
  const orgAdmins = allAdmins.filter((a) => a.orgId === org.id);

  return (
    <div
      className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-all duration-200 ${
        org.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
      }`}
    >
      {/* ── Header row ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 select-none">
          {initials(org.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-800 truncate">{org.name}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                PLAN_COLORS[org.plan] || PLAN_COLORS.basic
              }`}
            >
              {(org.plan || "basic").toUpperCase()}
            </span>
            {!org.isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100">
                INACTIVE
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            /{org.slug} &nbsp;·&nbsp;
            <span className="text-slate-500 font-medium">
              {org._adminCount ?? "—"} admin{org._adminCount !== 1 ? "s" : ""}
            </span>
            &nbsp;·&nbsp;
            <span className="text-slate-500 font-medium">
              {org._agentCount ?? "—"} agent{org._agentCount !== 1 ? "s" : ""}
            </span>
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive();
          }}
          disabled={toggling}
          className={`flex-shrink-0 transition-colors ${
            org.isActive
              ? "text-emerald-500 hover:text-slate-400"
              : "text-slate-300 hover:text-emerald-500"
          }`}
          title={org.isActive ? "Deactivate org" : "Activate org"}
        >
          {toggling ? (
            <Loader2 size={18} className="animate-spin" />
          ) : org.isActive ? (
            <ToggleRight size={20} />
          ) : (
            <ToggleLeft size={20} />
          )}
        </button>

        <span className="text-slate-400 flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-5">
          {loadingMembers ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading members…</span>
            </div>
          ) : (
            <>
              {/* ── Admins section ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-orange-500" />
                    Admins ({members.admins.length})
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs rounded-xl border-slate-200 text-slate-600 font-semibold"
                    onClick={() => setAssignAdminOpen(true)}
                  >
                    <Plus size={12} className="mr-1" /> Assign Admin
                  </Button>
                </div>
                {members.admins.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No admins assigned yet.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {members.admins.map((a) => (
                      <MemberPill
                        key={a.id}
                        name={a.name}
                        email={a.email}
                        role="admin"
                        onRemove={() => handleUnassignAdmin(a.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Agents section ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserRound size={12} className="text-sky-500" />
                    Agents ({members.agents.length})
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs rounded-xl border-slate-200 text-slate-600 font-semibold"
                    onClick={() => setAssignAgentOpen(true)}
                  >
                    <Plus size={12} className="mr-1" /> Assign Agent
                  </Button>
                </div>
                {members.agents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No agents assigned yet.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {members.agents.map((a) => (
                      <MemberPill
                        key={a.id}
                        name={a.name}
                        email={a.email}
                        role="agent"
                        onRemove={() => handleUnassignAgent(a.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Bulk assign agents via admin ── */}
              {orgAdmins.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Bulk assign: add all agents under an admin
                  </p>
                  <div className="flex gap-2">
                    <UserCombobox
                      users={orgAdmins}
                      selectedUserId={bulkAssignAdminId}
                      onSelect={setBulkAssignAdminId}
                      placeholder="Search admin in this org…"
                      emptyMessage="No admin found in this org."
                    />
                    <Button
                      size="sm"
                      disabled={!bulkAssignAdminId || bulkAssigning}
                      onClick={handleBulkAssign}
                      className="h-9 px-4 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold"
                    >
                      {bulkAssigning ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        "Assign All"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Assign Admin Dialog (with combobox) ── */}
      <Dialog open={assignAdminOpen} onOpenChange={setAssignAdminOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              Assign Admin to {org.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Only unassigned admins (not yet in any org) are shown below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            {unassignedAdmins.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                All admins are already assigned to an organization.
              </p>
            ) : (
              <UserCombobox
                users={unassignedAdmins}
                selectedUserId={selectedAdminId}
                onSelect={setSelectedAdminId}
                placeholder="Search admin by name or email…"
                emptyMessage="No matching admin found."
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setAssignAdminOpen(false);
                setSelectedAdminId("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedAdminId || assigningAdmin || unassignedAdmins.length === 0}
              onClick={handleAssignAdmin}
              className="rounded-xl bg-[#1E88E5] hover:bg-[#1976D2] text-white font-bold"
            >
              {assigningAdmin ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Agent Dialog (with combobox) ── */}
      <Dialog open={assignAgentOpen} onOpenChange={setAssignAgentOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">
              Assign Agent to {org.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Only unassigned agents (not yet in any org) are shown below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            {unassignedAgents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                All agents are already assigned to an organization.
              </p>
            ) : (
              <UserCombobox
                users={unassignedAgents}
                selectedUserId={selectedAgentId}
                onSelect={setSelectedAgentId}
                placeholder="Search agent by name or email…"
                emptyMessage="No matching agent found."
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                setAssignAgentOpen(false);
                setSelectedAgentId("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedAgentId || assigningAgent || unassignedAgents.length === 0}
              onClick={handleAssignAgent}
              className="rounded-xl bg-[#1E88E5] hover:bg-[#1976D2] text-white font-bold"
            >
              {assigningAgent ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export default function OrganizationsManager({
  backHref,
  backLabel = "Back",
  embedded = false,
}) {
  const [orgs, setOrgs] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Create org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", plan: "basic" });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [orgSnap, adminSnap, agentSnap] = await Promise.all([
        getDocs(collection(db, "organizations")),
        getDocs(collection(db, "admins")),
        getDocs(collection(db, "agents")),
      ]);

      const adminList = adminSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const agentList = agentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const orgList = orgSnap.docs.map((d) => {
        const org = { id: d.id, ...d.data() };
        org._adminCount = adminList.filter((a) => a.orgId === org.id).length;
        org._agentCount = agentList.filter((a) => a.orgId === org.id).length;
        return org;
      });

      orgList.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      setOrgs(orgList);
      setAllAdmins(adminList);
      setAllAgents(agentList);
    } catch (err) {
      console.error("[OrganizationsManager] fetchAll:", err);
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleNameChange = (val) => {
    setForm((prev) => ({
      ...prev,
      name: val,
      slug: slugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val) => {
    setSlugManuallyEdited(true);
    setForm((prev) => ({ ...prev, slug: slugify(val) }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Organization name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");

    setCreating(true);
    try {
      const existing = await getDocs(
        query(
          collection(db, "organizations"),
          where("slug", "==", form.slug.trim())
        )
      );
      if (!existing.empty) {
        toast.error("An organization with this slug already exists");
        setCreating(false);
        return;
      }

      await addDoc(collection(db, "organizations"), {
        name: form.name.trim(),
        slug: form.slug.trim(),
        plan: form.plan,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`"${form.name}" created successfully`);
      setCreateOpen(false);
      setForm({ name: "", slug: "", plan: "basic" });
      setSlugManuallyEdited(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("[OrganizationsManager] create:", err);
      toast.error(err.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const unassignedAdmins = allAdmins.filter((a) => !a.orgId).length;
  const unassignedAgents = allAgents.filter((a) => !a.orgId).length;
  const activeOrgs = orgs.filter((o) => o.isActive).length;

  const filteredOrgs = orgs.filter((o) => {
    const term = search.toLowerCase();
    return (
      o.name?.toLowerCase().includes(term) ||
      o.slug?.toLowerCase().includes(term)
    );
  });

  return (
    <div className={embedded ? "" : "min-h-screen bg-slate-50 p-6 lg:p-10"}>
      <div className={embedded ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>
        {backHref && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="px-0 text-slate-600 hover:bg-transparent hover:text-slate-900"
          >
            <Link href={backHref}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Link>
          </Button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Organizations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create organizations and assign admins &amp; agents to them.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="border-slate-200 text-slate-600"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-[#1E88E5] hover:bg-[#1976D2] text-white font-bold rounded-xl px-4"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Org
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total orgs", value: orgs.length, color: "text-slate-800" },
            { label: "Active orgs", value: activeOrgs, color: "text-emerald-600" },
            {
              label: "Unassigned admins",
              value: unassignedAdmins,
              color: unassignedAdmins > 0 ? "text-amber-600" : "text-slate-800",
            },
            {
              label: "Unassigned agents",
              value: unassignedAgents,
              color: unassignedAgents > 0 ? "text-amber-600" : "text-slate-800",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                {label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search organizations by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <p className="text-sm text-slate-400">Loading organizations…</p>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-slate-200 rounded-2xl">
            <Building2 className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search
                ? `No organizations match "${search}"`
                : "No organizations yet. Create your first one."}
            </p>
            {!search && (
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="mt-1 bg-[#1E88E5] hover:bg-[#1976D2] text-white rounded-xl font-bold"
              >
                <Plus size={14} className="mr-1" /> Create Organization
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                onRefresh={() => setRefreshKey((k) => k + 1)}
                allAdmins={allAdmins}
                allAgents={allAgents}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center pb-4">
          Assignments take effect immediately. Admins and agents can only access
          data within their assigned organization.
        </p>
      </div>

      {/* ── Create Org Dialog ── */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setForm({ name: "", slug: "", plan: "basic" });
            setSlugManuallyEdited(false);
          }
        }}
      >
        <DialogContent className="rounded-3xl p-6 sm:p-8 w-[calc(100%-2rem)] sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-500" />
              Create Organization
            </DialogTitle>
            <DialogDescription className="pt-1.5 text-sm text-slate-500">
              Admins and agents will be scoped to their organization — no
              cross-org data access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Organization Name
              </label>
              <Input
                placeholder="e.g. Adwait Tours"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-11 rounded-2xl text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Slug{" "}
                <span className="normal-case font-normal text-slate-400">
                  (unique identifier, URL-safe)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                  /
                </span>
                <Input
                  placeholder="adwait-tours"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="h-11 rounded-2xl text-sm pl-6 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Plan
              </label>
              <select
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                className="w-full h-11 rounded-2xl border border-slate-200 px-3 text-sm"
              >
                {PLAN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setForm({ name: "", slug: "", plan: "basic" });
                setSlugManuallyEdited(false);
              }}
              className="rounded-xl font-bold w-full sm:w-auto"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.slug.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-8 font-black w-full sm:w-auto"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Building2 className="mr-2 w-4 h-4" />
                  Create Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}