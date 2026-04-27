"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, FileText, TrendingUp, TrendingDown,
  Send, Clock, Phone, MessageCircle, Mail, AlertCircle,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import {
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from "@/firebase/notificationsService";

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_META = {
  quotation_accepted: { icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
  quotation_rejected: { icon: TrendingDown, color: "text-rose-600",    bg: "bg-rose-50"    },
  quotation_sent:     { icon: Send,         color: "text-blue-600",    bg: "bg-blue-50"    },
  default:            { icon: FileText,     color: "text-slate-600",   bg: "bg-slate-100"  },
};

const MODE_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail };

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDue(dt) {
  if (!dt) return "";
  const date = dt.toDate ? dt.toDate() : new Date(dt);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m overdue`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h overdue`;
  if (diffMins < 2880) return "Yesterday";
  const diffDays = Math.floor(diffMins / 1440);
  return `${diffDays}d overdue`;
}

function buildWhatsAppUrl(mobile, leadName) {
  const phone = String(mobile || "").replace(/\D/g, "");
  const msg = [
    `Hi ${leadName} 👋`,
    ``,
    `Just following up on your travel inquiry with us.`,
    ``,
    `Feel free to reachout to us if need any clarification or modifications! We'd love to help! 🌍✈️`,
    ``,
    `Warm regards,`,
    `Adwait Tours`,
    `📞 +91 9884798483`,
  ].join("\n");
  const base = phone ? `https://wa.me/${phone}` : `https://wa.me`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}

// ── Follow-up fetcher ─────────────────────────────────────────────────────────
async function fetchDueFollowUps(userId) {
  const leadsSnap = await getDocs(
    query(collection(db, "leads"), where("agentId", "==", userId))
  );

  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const reminders = [];

  await Promise.all(
    leadsSnap.docs.map(async (leadDoc) => {
      const lead = { id: leadDoc.id, ...leadDoc.data() };

      let mobile = lead.mobile || lead.phone || lead.contact || "";
      if (!mobile && lead.customerId) {
        const customerSnap = await getDoc(doc(db, "customers", lead.customerId));
        if (customerSnap.exists()) {
          const cData = customerSnap.data();
          mobile = cData.mobile || cData.phone || cData.contact || "";
        }
      }

      const fuSnap = await getDocs(
        collection(db, "leads", lead.id, "followups")
      );
      fuSnap.docs.forEach((d) => {
        const fu = { id: d.id, leadId: lead.id, ...d.data() };
        if (fu.status === "Completed") return;

        const dt = fu.dateTime?.toDate
          ? fu.dateTime.toDate()
          : fu.dateTime
          ? new Date(fu.dateTime)
          : null;

        if (!dt || dt > soonThreshold) return;

        reminders.push({
          ...fu,
          isOverdue: dt < now,
          dueDate: dt,
          leadName: lead.name || fu.leadName || "Lead",
          leadMobile: mobile,
        });
      });
    })
  );

  return reminders.sort((a, b) => a.dueDate - b.dueDate);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationCenter({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToNotifications(userId, setNotifications);
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchDueFollowUps(userId).then(setFollowUps).catch(() => {});
  }, [userId]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const totalBadge = unreadNotifications + followUps.length;

  const handleNotificationClick = async (n) => {
    if (!n.read) await markNotificationRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleFollowUpView = (fu) => {
    setOpen(false);
    router.push(`/agent-panel/leads/${fu.leadId}`);
  };

  const handleWhatsApp = (fu) => {
    const url = buildWhatsAppUrl(fu.leadMobile, fu.leadName);
    if (url) window.open(url, "_blank");
  };

  const handleMarkAll = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-slate-600"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-96 rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadNotifications > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-theme-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            {followUps.length > 0 && (
              <div>
                <div className="bg-amber-50/60 px-4 py-2 flex items-center gap-2 border-b border-amber-100">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Follow-up Reminders ({followUps.length})
                  </span>
                </div>

                {followUps.map((fu) => {
                  const ModeIcon = MODE_ICON[fu.mode] ?? Clock;
                  const waUrl = buildWhatsAppUrl(fu.leadMobile, fu.leadName);

                  return (
                    <div
                      key={`fu-${fu.id}`}
                      className="border-b border-slate-50 px-4 py-3 bg-amber-50/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${fu.isOverdue ? "bg-red-100" : "bg-amber-100"}`}>
                          <ModeIcon className={`h-4 w-4 ${fu.isOverdue ? "text-red-600" : "text-amber-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{fu.leadName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fu.mode} follow-up ·{" "}
                            <span className={fu.isOverdue ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                              {fu.isOverdue ? formatDue(fu.dueDate) : "Due soon"}
                            </span>
                          </p>
                          {fu.notes && (
                            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{fu.notes}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleFollowUpView(fu)}
                              className="text-[11px] font-semibold text-theme-primary hover:underline"
                            >
                              View Lead →
                            </button>
                            {waUrl && (
                              <button
                                onClick={() => handleWhatsApp(fu)}
                                className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors"
                              >
                                <MessageCircle className="h-3 w-3" />
                                Send WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {notifications.length > 0 && (
              <div>
                {followUps.length > 0 && (
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Recent Activity
                    </span>
                  </div>
                )}
                <div className="divide-y divide-slate-50">
                  {notifications.map((n) => {
                    const meta = TYPE_META[n.type] ?? TYPE_META.default;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${!n.read ? "bg-blue-50/40" : ""}`}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}>
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm text-slate-800 ${!n.read ? "font-semibold" : "font-medium"}`}>
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.message}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {followUps.length === 0 && notifications.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                You&apos;re all caught up!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
