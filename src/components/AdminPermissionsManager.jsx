"use client";

/**
 * AdminPermissionsManager
 *
 * Reads admins from the "admins" Firestore collection and manages
 * their AI feature flags in the "adminPermissions" collection.
 *
 * Mirrors AgentPermissionsManager design/behaviour exactly.
 * Only SuperAdmin should be able to reach pages that render this component —
 * route-level enforcement is handled by RequireAuth.
 */

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_PERMISSIONS } from "@/app/hooks/useAgentPermissions";
import Link from "next/link";
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
  ShieldAlert,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowLeft,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — identical feature keys to AgentPermissionsManager
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = ({ enabled, onChange, activeBg = "bg-sky-600", disabled = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    aria-checked={enabled}
    role="switch"
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2
      focus-visible:ring-offset-2 focus-visible:ring-sky-500
      disabled:cursor-not-allowed disabled:opacity-60
      ${enabled ? activeBg : "bg-slate-200"}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow
        ring-0 transition duration-200 ease-in-out
        ${enabled ? "translate-x-4" : "translate-x-0"}`}
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

// ─────────────────────────────────────────────────────────────────────────────
// AdminRow — collapsible row per admin user
// ─────────────────────────────────────────────────────────────────────────────

const AdminRow = ({ admin, permissions, onToggle, saving }) => {
  const [expanded, setExpanded] = useState(false);

  const enabledCount = PERMISSION_META.filter(
    (m) => permissions[m.key] === true
  ).length;

  // Safe initials — guard empty/missing name
  const rawName = typeof admin.name === "string" ? admin.name.trim() : "";
  const initials = rawName
    ? rawName.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* ── Collapsed header row ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Avatar — orange/rose gradient to distinguish admins from agents */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none">
          {initials}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {admin.name || "—"}
            </p>
            {/* Visual role badge so it's clear this is an admin, not an agent */}
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">
              <ShieldAlert className="w-2.5 h-2.5" /> Admin
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {admin.email || "—"}
          </p>
        </div>

        <AccessBadge count={enabledCount} total={PERMISSION_META.length} />

        <span className="text-slate-400 ml-1 flex-shrink-0">
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {/* ── Expanded permission toggles ── */}
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
                onChange={(val) => onToggle(admin.id, meta.key, val)}
                activeBg={meta.activeBg}
                disabled={saving}
              />
            </div>
          ))}

          {saving && (
            <div className="px-4 py-2.5 bg-slate-50 flex justify-end border-t border-slate-50">
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPermissionsManager({
  backHref,
  backLabel = "Back",
  embedded = false,
}) {
  const [admins, setAdmins]             = useState([]);
  const [permissionsMap, setPermissionsMap] = useState({});
  const [loadingAdmins, setLoadingAdmins]   = useState(true);
  const [savingMap, setSavingMap]           = useState({});
  const [search, setSearch]                 = useState("");
  const [refreshKey, setRefreshKey]         = useState(0);

  // ── Fetch all admins + their permissions in parallel ─────────────────────
  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);

    try {
      const snap = await getDocs(collection(db, "admins"));

      if (snap.empty) {
        setAdmins([]);
        setPermissionsMap({});
        return;
      }

      const adminList = snap.docs.map((d) => {
        const data = d.data();
        return {
          id:    d.id,
          uid:   data.uid   || d.id,
          name:  typeof data.name  === "string" ? data.name.trim()  : "",
          email: typeof data.email === "string" ? data.email.trim() : "",
          role:  data.role  || "admin",
          phone: data.phone || "",
        };
      });

      setAdmins(adminList);

      // Fetch permissions for every admin in parallel
      const permResults = await Promise.all(
        adminList.map(async (admin) => {
          try {
            const ref  = doc(db, "adminPermissions", admin.id);
            const snap = await getDoc(ref);

            if (snap.exists()) {
              const saved  = snap.data();
              const merged = { ...DEFAULT_PERMISSIONS };

              Object.keys(DEFAULT_PERMISSIONS).forEach((key) => {
                if (key in saved) {
                  merged[key] = saved[key] === true; // strict boolean guard
                }
              });

              return { id: admin.id, perms: merged };
            }

            // Doc doesn't exist yet — bootstrap with all-false defaults
            await setDoc(ref, DEFAULT_PERMISSIONS);
            return { id: admin.id, perms: { ...DEFAULT_PERMISSIONS } };

          } catch (err) {
            // Per-admin error — log and fall back, don't crash the whole list
            console.error(
              "[AdminPermissions] perm fetch error for admin:",
              admin.id,
              err.code ?? err.message
            );
            return { id: admin.id, perms: { ...DEFAULT_PERMISSIONS } };
          }
        })
      );

      const map = {};
      permResults.forEach(({ id, perms }) => { map[id] = perms; });
      setPermissionsMap(map);

    } catch (err) {
      console.error("[AdminPermissions] fetchAdmins:", err.code ?? err.message);
      toast.error("Failed to load admins.");
    } finally {
      setLoadingAdmins(false);
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  // ── Optimistic toggle with rollback on failure ────────────────────────────
  const handleToggle = async (adminId, key, value) => {
    // Guard unknown keys before they reach Firestore
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_PERMISSIONS, key)) {
      console.error("[AdminPermissions] Unknown permission key:", key);
      return;
    }

    const previous = permissionsMap[adminId]?.[key] === true;

    // Optimistic update
    setPermissionsMap((prev) => ({
      ...prev,
      [adminId]: { ...(prev[adminId] ?? DEFAULT_PERMISSIONS), [key]: value },
    }));
    setSavingMap((prev) => ({ ...prev, [adminId]: true }));

    try {
      const ref = doc(db, "adminPermissions", adminId);
      await setDoc(ref, { [key]: value }, { merge: true });
      // Success — optimistic state is already correct
    } catch (err) {
      console.error(
        "[AdminPermissions] toggle save error for admin:",
        adminId,
        err.code ?? err.message
      );

      // Roll back optimistic update
      setPermissionsMap((prev) => ({
        ...prev,
        [adminId]: { ...(prev[adminId] ?? DEFAULT_PERMISSIONS), [key]: previous },
      }));

      toast.error("Failed to save permission change. Please try again.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [adminId]: false }));
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const filteredAdmins = admins.filter((a) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      a.name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term)
    );
  });

  const totalWithAccess = admins.filter((a) => {
    const perms = permissionsMap[a.id] ?? {};
    return Object.values(perms).some(Boolean);
  }).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={embedded ? "" : "min-h-screen bg-slate-50 p-6 lg:p-10"}>
      <div className={embedded ? "space-y-6" : "max-w-4xl mx-auto space-y-6"}>

        {/* Back link */}
        {backHref && (
          <div>
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
          </div>
        )}

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admin AI Permissions
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Control which AI-powered features each admin can access.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loadingAdmins}
            className="border-slate-200 text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingAdmins ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Total admins
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{admins.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Have AI access
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalWithAccess}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              AI features
            </p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{PERMISSION_META.length}</p>
          </div>
        </div>

        {/* ── Feature legend ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Available AI features
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
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

        {/* ── Search ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search admins by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>

        {/* ── Admin list ── */}
        {loadingAdmins ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm text-slate-400">Loading admins…</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search
                ? `No admins found for "${search}"`
                : "No admins found in the system."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAdmins.map((admin) => (
              <AdminRow
                key={admin.id}
                admin={admin}
                permissions={permissionsMap[admin.id] ?? { ...DEFAULT_PERMISSIONS }}
                onToggle={handleToggle}
                saving={!!savingMap[admin.id]}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center pb-4">
          Permissions take effect immediately. Admins without access will see a
          locked state on the relevant feature.
        </p>
      </div>
    </div>
  );
}