"use client";

import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Phone, MessageCircle, Mail, ChevronLeft, ChevronRight, CalendarClock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MODE_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail };

function getStatus(fu) {
  if (fu.status === "Completed") return "done";
  if (dayjs(fu.dateTime).isBefore(dayjs())) return "overdue";
  return "pending";
}
function dateKey(iso) { return dayjs(iso).format("YYYY-MM-DD"); }

function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS_STYLES = {
  overdue: { badge: "bg-red-100 text-red-700",   avatar: "bg-red-50 text-red-700",   border: "border-l-2 border-red-400" },
  pending: { badge: "bg-amber-100 text-amber-700", avatar: "bg-amber-50 text-amber-700", border: "" },
  done:    { badge: "bg-green-100 text-green-700", avatar: "bg-green-50 text-green-700", border: "" },
};

const CAL_FILTER_STYLES = {
  all:     "bg-blue-50 border-blue-400 text-blue-800",
  overdue: "bg-red-50 border-red-400 text-red-800",
  pending: "bg-amber-50 border-amber-400 text-amber-800",
  done:    "bg-green-50 border-green-400 text-green-800",
};

export default function FollowUpCalendar() {
  const { user } = useSelector((s) => s.auth);
  const router = useRouter();

  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedKey, setSelectedKey] = useState(dayjs().format("YYYY-MM-DD"));
  const [calFilter, setCalFilter] = useState("all");   // filter dots on calendar
  const [sbFilter, setSbFilter] = useState("all");     // filter sidebar list

  const load = async (silent = false) => {
    if (!user?.uid) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const q = query(collectionGroup(db, "followups"), where("agentId", "==", user.uid));
      const snap = await getDocs(q);
      setFollowUps(snap.docs.map((doc) => ({
        id: doc.id,
        leadId: doc.ref.parent.parent.id,
        ...doc.data(),
      })));
    } catch (err) {
      console.error("[FollowUpCalendar]", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid]);

  // ── Derived maps ──────────────────────────────────────────────────────────
  const fuMap = useMemo(() => {
    const map = {};
    followUps.forEach((fu) => {
      if (!fu.dateTime) return;
      const k = dateKey(fu.dateTime);
      if (!map[k]) map[k] = [];
      map[k].push(fu);
    });
    return map;
  }, [followUps]);

  const monthStats = useMemo(() => {
    const y = currentMonth.year(), m = currentMonth.month();
    const mfus = followUps.filter((fu) => {
      const d = dayjs(fu.dateTime);
      return d.year() === y && d.month() === m;
    });
    return {
      total:   mfus.length,
      overdue: mfus.filter((f) => getStatus(f) === "overdue").length,
      pending: mfus.filter((f) => getStatus(f) === "pending").length,
      done:    mfus.filter((f) => getStatus(f) === "done").length,
    };
  }, [followUps, currentMonth]);

  const selectedFus = useMemo(() => {
    const all = (fuMap[selectedKey] || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    if (sbFilter === "all") return all;
    return all.filter((f) => getStatus(f) === sbFilter);
  }, [fuMap, selectedKey, sbFilter]);

  const allSelectedFus = useMemo(() => fuMap[selectedKey] || [], [fuMap, selectedKey]);

  const daysInMonth = currentMonth.daysInMonth();
  const startDow = currentMonth.startOf("month").day();
  const today = dayjs().format("YYYY-MM-DD");

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filteredDayFus = (fus) => {
    if (calFilter === "all") return fus;
    return fus.filter((f) => getStatus(f) === calFilter);
  };

  const goToday = () => {
    setCurrentMonth(dayjs());
    setSelectedKey(dayjs().format("YYYY-MM-DD"));
  };

  return (
    <Card className="border-slate-200/80 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Follow-up calendar</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Scheduled follow-ups across all leads</p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </CardHeader>

      <CardContent className="p-0 mt-4">

        {/* ── Month stats strip ── */}
        <div className="grid grid-cols-4 border-y border-slate-100">
          {[
            { label: "This month", value: monthStats.total, color: "text-slate-800" },
            { label: "Overdue",    value: monthStats.overdue, color: "text-red-600" },
            { label: "Pending",   value: monthStats.pending, color: "text-amber-600" },
            { label: "Done",      value: monthStats.done,    color: "text-green-600" },
          ].map(({ label, value, color }, i) => (
            <div key={label} className={`py-3 px-4 ${i < 3 ? "border-r border-slate-100" : ""}`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex divide-x divide-slate-100">

          {/* ── Calendar pane ── */}
          <div className="flex-1 min-w-0 p-4">

            {/* Nav */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-800">
                {MONTHS[currentMonth.month()]} {currentMonth.year()}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToday}
                  className="h-7 px-3 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Today
                </button>
                <button onClick={() => setCurrentMonth((m) => m.subtract(1, "month"))}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentMonth((m) => m.add(1, "month"))}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar filter pills */}
            <div className="flex gap-1.5 mb-3">
              {["all", "overdue", "pending", "done"].map((f) => (
                <button
                  key={f}
                  onClick={() => setCalFilter(f)}
                  className={`h-6 px-3 rounded-full text-[11px] font-semibold border transition-all capitalize ${
                    calFilter === f
                      ? CAL_FILTER_STYLES[f]
                      : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-300 py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = currentMonth.date(day).format("YYYY-MM-DD");
                const allFus = fuMap[key] || [];
                const fus = filteredDayFus(allFus);
                const isToday = key === today;
                const isSelected = key === selectedKey;
                const hasOverdue = allFus.some((f) => getStatus(f) === "overdue");

                const ov = fus.filter((f) => getStatus(f) === "overdue").length;
                const pe = fus.filter((f) => getStatus(f) === "pending").length;
                const dn = fus.filter((f) => getStatus(f) === "done").length;

                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedKey(key); setSbFilter("all"); }}
                    className={`
                      min-h-[52px] rounded-lg p-1.5 flex flex-col gap-1 text-left transition-all border
                      ${isSelected ? "border-blue-400 bg-blue-50" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}
                      ${hasOverdue && !isSelected && calFilter === "all" ? "border-l-2 border-l-red-300 rounded-l-none" : ""}
                    `}
                  >
                    <span className={`text-[11px] font-semibold w-[18px] h-[18px] flex items-center justify-center rounded-full ${
                      isToday ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}>
                      {day}
                    </span>
                    {fus.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {ov > 0 && <span className="text-[9px] font-semibold px-1 rounded bg-red-100 text-red-700">{ov}</span>}
                        {pe > 0 && <span className="text-[9px] font-semibold px-1 rounded bg-amber-100 text-amber-700">{pe}</span>}
                        {dn > 0 && <span className="text-[9px] font-semibold px-1 rounded bg-green-100 text-green-700">{dn}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3">
              {[
                { color: "bg-red-400",   label: "Overdue" },
                { color: "bg-amber-400", label: "Pending" },
                { color: "bg-green-500", label: "Done" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-sm ${color}`} />
                  <span className="text-[11px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-slate-50/60">

            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">
                {dayjs(selectedKey).isSame(dayjs(), "day")
                  ? "Today — " + dayjs(selectedKey).format("D MMM")
                  : dayjs(selectedKey).format("ddd, D MMM YYYY")}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {allSelectedFus.length
                  ? `${allSelectedFus.length} follow-up${allSelectedFus.length > 1 ? "s" : ""}`
                  : "No follow-ups"}
              </p>

              {/* Sidebar filter pills */}
              {allSelectedFus.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {["all", "overdue", "pending", "done"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSbFilter(f)}
                      className={`h-5 px-2 rounded-full text-[10px] font-semibold border transition-all capitalize ${
                        sbFilter === f
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "border-slate-200 text-slate-400 hover:border-slate-400"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Follow-up list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <p className="text-xs text-slate-400 text-center pt-6">Loading…</p>
              ) : selectedFus.length === 0 ? (
                <div className="text-center pt-8 space-y-2">
                  <CalendarClock className="h-8 w-8 text-slate-200 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {allSelectedFus.length ? "No matches for filter" : "Nothing scheduled"}
                  </p>
                </div>
              ) : (
                selectedFus.map((fu) => {
                  const s = getStatus(fu);
                  const ss = STATUS_STYLES[s];
                  const ModeIcon = MODE_ICON[fu.mode] || Phone;
                  const ini = initials(fu.leadName);

                  return (
                    <button
                      key={fu.id}
                      onClick={() => router.push(`/agent-panel/leads/${fu.leadId}?tab=followups`)}
                      className={`w-full text-left rounded-xl border border-slate-100 bg-white p-3 hover:border-blue-300 hover:bg-blue-50/40 transition-all group ${s === "overdue" ? "border-l-2 border-l-red-400 rounded-l-none" : ""}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${ss.avatar}`}>
                          {ini}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-400 mb-0.5">{dayjs(fu.dateTime).format("h:mm A")}</p>
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                            {fu.leadName || "Lead"}
                          </p>
                          {fu.packageName && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{fu.packageName}</p>
                          )}
                          {fu.notes && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 italic">{fu.notes}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${ss.badge}`}>
                              {s === "overdue" ? "Overdue" : s === "done" ? "Done" : "Pending"}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <ModeIcon className="h-2.5 w-2.5" />
                              {fu.mode}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}