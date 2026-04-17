"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_PERMISSIONS } from "@/app/hooks/useAgentPermissions";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Hotel,
  ShieldCheck,
  ShieldOff,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PERMISSION_META = [
  {
    key: "itinerary_ai",
    label: "AI Itinerary Creation",
    description: "Generate day-by-day itineraries using Gemini AI",
    Icon: CalendarDays,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
    activeBg: "bg-sky-600",
  },
  {
    key: "hotel_fetch_ai",
    label: "Hotel Address, Map link & Contact Fetch",
    description: "Auto-lookup hotel address, phone and map link via API",
    Icon: Hotel,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    activeBg: "bg-violet-600",
  },
];

const Toggle = ({ enabled, onChange, activeBg = "bg-sky-600" }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      enabled ? activeBg : "bg-slate-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

const AccessBadge = ({ count, total }) => {
  if (count === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        <ShieldOff className="w-3 h-3" /> No access
      </span>
    );
  if (count === total)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <ShieldCheck className="w-3 h-3" /> Full access
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Sparkles className="w-3 h-3" /> {count}/{total} features
    </span>
  );
};

const AgentRow = ({ agent, permissions, onToggle, onSave, saving }) => {
  const [expanded, setExpanded] = useState(false);
  const enabledCount = Object.values(permissions).filter(Boolean).length;

  const initials = (agent.name || "??")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{agent.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{agent.email}</p>
        </div>
        <AccessBadge count={enabledCount} total={PERMISSION_META.length} />
        <span className="text-slate-400 ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-slate-100">
          {PERMISSION_META.map((meta) => (
            <div
              key={meta.key}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>
                <meta.Icon className={`w-4 h-4 ${meta.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{meta.description}</p>
              </div>
              <Toggle
                enabled={!!permissions[meta.key]}
                onChange={(val) => onToggle(agent.id, meta.key, val)}
                activeBg={meta.activeBg}
              />
            </div>
          ))}
          <div className="px-4 py-3 bg-slate-50 flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => onSave(agent.id, permissions)}
              disabled={saving === agent.id}
              className="bg-slate-900 hover:bg-sky-600 text-white text-xs px-4"
            >
              {saving === agent.id ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AgentPermissionsPage() {
  const [agents, setAgents] = useState([]);
  const [permissionsMap, setPermissionsMap] = useState({});
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [saving, setSaving] = useState(null);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);


  

  const fetchAgents = useCallback(async () => {
    
    
    setLoadingAgents(true);
    try {
      const snap = await getDocs(collection(db, "agents"));
      const agentList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAgents(agentList);

      const permResults = await Promise.all(
        agentList.map(async (agent) => {
          try {
            const ref = doc(db, "agentPermissions", agent.id);
            const permSnap = await getDoc(ref);

            if (permSnap.exists()) {
              const savedData = permSnap.data();
              
              const merged = { ...DEFAULT_PERMISSIONS };
              Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
                if (key in savedData) {
                  merged[key] = savedData[key];
                }
              });
              return { id: agent.id, perms: merged };
            } else {
              
              await setDoc(ref, DEFAULT_PERMISSIONS);
              return { id: agent.id, perms: { ...DEFAULT_PERMISSIONS } };
            }
          } catch (err) {
        console.error("[AgentPermissions] perm fetch error for agent:", agent.id, err.code, err.message);
        return { id: agent.id, perms: { ...DEFAULT_PERMISSIONS } };
      }
        })
      );

      const map = {};
      permResults.forEach(({ id, perms }) => { map[id] = perms; });
      setPermissionsMap(map);
    } catch (err) {
      console.error("[AgentPermissions] fetchAgents:", err);
      toast.error("Failed to load agents.");
    } finally {
      setLoadingAgents(false);
    }
  }, [refreshKey]);
  

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  

  const handleToggle = (id, key, value) => {
    setPermissionsMap((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };




  const handleSave = async (id, permissions) => {
    setSaving(id);
    try {
      const ref = doc(db, "agentPermissions", id);
      await setDoc(ref, permissions, { merge: true });
      toast.success("Permissions saved successfully.");
    } catch (err) {
      console.error("[AgentPermissions] save error:", err);
      toast.error("Failed to save permissions.");
    } finally {
      setSaving(null);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalWithAccess = agents.filter((a) => {
    const perms = permissionsMap[a.id] || {};
    return Object.values(perms).some(Boolean);
  }).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent AI Permissions</h1>
            <p className="text-sm text-slate-500 mt-1">Control which AI-powered features each agent can access.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loadingAgents}
            className="border-slate-200 text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingAgents ? "animate-spin" : ""}`} />
            Refresh
          </Button>
         
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total agents</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{agents.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Have AI access</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalWithAccess}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">AI features</p>
            <p className="text-2xl font-bold text-sky-600 mt-1">{PERMISSION_META.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Available AI features</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {PERMISSION_META.map((meta) => (
              <div key={meta.key} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50">
                <div className={`w-7 h-7 rounded-md ${meta.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <meta.Icon className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{meta.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{meta.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search agents by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {loadingAgents ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-sm text-slate-400">Loading agents...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search ? `No agents found for "${search}"` : "No agents found."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAgents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                permissions={permissionsMap[agent.id] || DEFAULT_PERMISSIONS}
                onToggle={handleToggle}
                onSave={handleSave}
                saving={saving}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center pb-4">
          Permissions take effect immediately after saving. Agents without access will see a locked state on the relevant feature.
        </p>
      </div>
    </div>
  );
}