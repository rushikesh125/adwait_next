"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  FileText,
  TrendingUp,
  TrendingDown,
  Send,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  AlertCircle,
  X,
  CalendarCheck,
  XCircle,
  Users,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/firebase/notificationsService";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_META = {
  vendor_payment_due: { icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
  quotation_accepted: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  quotation_rejected: { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
  follow_up_reminder: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  booking_confirmed: { icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  booking_cancelled: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
  invoice_generated: { icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
  lead_assigned: { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  default: { icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
};

const MODE_ICON = { Call: Phone, WhatsApp: MessageCircle, Email: Mail };

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
// Add these alongside timeAgo() and formatDue() — no existing code changes

function getDueLabel(dateTime) {
  if (!dateTime) return "";
  const due = new Date(dateTime);
  const diffMins = Math.round((due - Date.now()) / 60000);
  if (diffMins <= 0) {
    const abs = Math.abs(diffMins);
    if (abs < 60)   return `${abs}m overdue`;
    if (abs < 1440) return `${Math.floor(abs / 60)}h overdue`;
    return `${Math.floor(abs / 1440)}d overdue`;
  }
  if (diffMins < 60) return `in ${diffMins}m`;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

function isOverdue(dateTime) {
  return !!dateTime && new Date(dateTime) < new Date();
}
function formatDue(dueDate) {
  const diffMins = Math.floor((Date.now() - dueDate) / 60000);
  if (diffMins < 2) return "just now";
  if (diffMins < 60) return `${diffMins}m overdue`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h overdue`;
  if (diffMins < 2880) return "Yesterday";
  return `${Math.floor(diffMins / 1440)}d overdue`;
}

function buildWhatsAppUrl(mobile, leadName) {
  const phone = String(mobile || "").replace(/\D/g, "");
  const msg = [
    `Hi ${leadName} 👋`,
    ``,
    `Just following up on your travel inquiry with us.`,
    ``,
    `Feel free to reach out if you need any clarification or modifications! We'd love to help! 🌍✈️`,
    ``,
    `Warm regards,`,
    `Adwait Tours`,
    `📞 +91 9884798483`,
  ].join("\n");
  const base = phone ? `https://wa.me/${phone}` : `https://wa.me`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

function PermissionBanner({ onAllow, onDismiss }) {
  return (
    <div className="mx-3 my-3 rounded-xl bg-blue-50 border border-blue-200 px-3 py-3 shrink-0">
      <div className="flex items-start gap-2">
        <Bell className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-blue-900">Enable notifications</p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            Get alerts even when this tab is in the background.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onAllow}
              className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Allow
            </button>
            <button
              onClick={onDismiss}
              className="text-[11px] font-medium text-blue-600 hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={onDismiss}>
          <X className="h-3.5 w-3.5 text-blue-400 hover:text-blue-600" />
        </button>
      </div>
    </div>
  );
}

export default function NotificationCenter({ userId }) {
  const {
    notifications,
    followUps,
    dueSoonFollowUps,
    totalBadge,
    unreadCount,
    permissionState,
    isLoading,
    askPermission,
  } = useNotifications(userId);

  const [open, setOpen] = useState(false);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bellWrapRef = useRef(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open && permissionState === "default") setShowPermBanner(true);
  }, [open, permissionState]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const insideBell = bellWrapRef.current?.contains(e.target);
      const mobilePanel = document.getElementById("notif-mobile-panel");
      const insideMobile = mobilePanel?.contains(e.target);
      if (!insideBell && !insideMobile) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open]);

 const handleNotificationClick = async (n) => {
  // ONLY remove quotation status notifications
  if (
    (n.type === "quotation_accepted" ||
      n.type === "quotation_rejected") &&
    !n.read
  ) {
    await markNotificationRead(n.id);
  }

  setOpen(false);

  if (
    n.type === "quotation_accepted" ||
    n.type === "quotation_rejected"
  ) {
    if (n.quotationId) {
      router.push(
        `/agent-panel/my-quatation?quoteId=${n.quotationId}`
      );
      return;
    }
  }

  if (n.link) router.push(n.link);
};

  const handleMarkAll = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
  };

  const handleAllowNotifications = async () => {
    const result = await askPermission();
    if (result !== "default") setShowPermBanner(false);
  };
const recentNotifications = notifications
  .filter((n) => {
    if (n.type === "follow_up_reminder") return false;

    // Remove quotation status notifications after read
    if (
      (n.type === "quotation_accepted" ||
        n.type === "quotation_rejected") &&
      n.read
    ) {
      return false;
    }

    return true;
  })
  .sort((a, b) => {
    const aTime = a.createdAt?.toDate
      ? a.createdAt.toDate()
      : new Date(a.createdAt || 0);

    const bTime = b.createdAt?.toDate
      ? b.createdAt.toDate()
      : new Date(b.createdAt || 0);

    return bTime - aTime;
  });
const isEmpty =
  !isLoading &&
  followUps.length === 0 &&
  dueSoonFollowUps.length === 0 &&  // ← ADD THIS LINE
  notifications.length === 0;
  return (
    <div className="relative" ref={bellWrapRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 text-slate-600"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${totalBadge > 0 ? `, ${totalBadge} unread` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-in zoom-in-50 duration-200">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </Button>

      {mounted && open && createPortal(
        <>
          <div
            id="notif-mobile-panel"
            className="
            fixed right-4 top-14 z-40 w-[calc(100vw-1rem)] max-w-sm rounded-2xl
            sm:right-4 sm:top-16 lg:top-20 sm:w-96 sm:max-w-[calc(100vw-1rem)]
            border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5
            animate-in fade-in slide-in-from-top-2 duration-200
          "
          >

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                Notifications
              </span>
              {totalBadge > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-600">
                  {totalBadge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-theme-primary hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Clear all</span>
                </button>
              )}

              <button onClick={() => setOpen(false)} className="sm:hidden p-1">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Permission Banner */}
          {showPermBanner && permissionState === "default" && (
            <PermissionBanner
              onAllow={handleAllowNotifications}
              onDismiss={() => setShowPermBanner(false)}
            />
          )}

          {/* Denied state */}
          {permissionState === "denied" && (
            <div className="mx-3 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-[11px] text-amber-700">
                🔕 Notifications are blocked. Enable in browser settings to get
                background alerts.
              </p>
            </div>
          )}

          {/* Scrollable content — taller on mobile */}
          <div className="max-h-[60vh] sm:max-h-[32rem] overflow-y-auto overscroll-contain">
            {isLoading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}
{/* ── NEW SECTION: insert BEFORE the existing Follow-up reminders section ── */}
{!isLoading && dueSoonFollowUps.length > 0 && (
  <section>
    <div className="sticky top-0 bg-rose-50/90 backdrop-blur-sm px-4 py-2 flex items-center gap-2 border-b border-rose-100 z-10">
      <Clock className="h-3.5 w-3.5 text-rose-600" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
        Due Soon ({dueSoonFollowUps.length})
      </span>
    </div>

    {dueSoonFollowUps.map((fu) => {
      const ModeIcon = MODE_ICON[fu.mode] ?? Clock;
      const overdue  = isOverdue(fu.dateTime);
      const dueLabel = getDueLabel(fu.dateTime);
      const waUrl    = fu.leadMobile
        ? buildWhatsAppUrl(fu.leadMobile, fu.leadName || "there")
        : null;

      return (
        <div
          key={`due-soon-${fu.id}`}
          className="border-b border-slate-50 px-4 py-3 hover:bg-rose-50/20 transition-colors"
        >
          <div className="flex items-start gap-3">

            {/* Icon — red ring when overdue */}
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              overdue ? "bg-red-100 ring-2 ring-red-200" : "bg-rose-100"
            }`}>
              <ModeIcon className={`h-4 w-4 ${overdue ? "text-red-600" : "text-rose-500"}`} />
            </div>

            <div className="min-w-0 flex-1">

              {/* Name + pill */}
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {fu.leadName || "Lead"}
                </p>
                <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${
                  overdue
                    ? "bg-red-100 text-red-700"
                    : "bg-rose-100 text-rose-600"
                }`}>
                  {dueLabel}
                </span>
              </div>

              {/* Mode */}
              <p className="mt-0.5 text-xs text-slate-500">
                {fu.mode} follow-up
              </p>

              {/* Notes preview */}
              {fu.notes && (
                <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                  {fu.notes}
                </p>
              )}

              {/* Actions */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push(`/agent-panel/leads/${fu.leadId}`);
                  }}
                  className="text-[11px] font-semibold text-theme-primary hover:underline"
                >
                  View Lead →
                </button>

                {waUrl && (
                  <button
                    onClick={() => window.open(waUrl, "_blank")}
                    className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </section>
)}
            {/* Follow-up reminders */}
            {!isLoading && followUps.length > 0 && (
              <section>
                <div className="sticky top-0 bg-amber-50/90 backdrop-blur-sm px-4 py-2 flex items-center gap-2 border-b border-amber-100 z-10">
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
                      className="border-b border-slate-50 px-4 py-3 bg-amber-50/20 hover:bg-amber-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${fu.isOverdue ? "bg-red-100" : "bg-amber-100"}`}
                        >
                          <ModeIcon
                            className={`h-4 w-4 ${fu.isOverdue ? "text-red-600" : "text-amber-600"}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {fu.leadName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {fu.mode} follow-up ·{" "}
                            <span
                              className={
                                fu.isOverdue
                                  ? "text-red-600 font-semibold"
                                  : "text-amber-600 font-medium"
                              }
                            >
                              {fu.isOverdue
                                ? formatDue(fu.dueDate)
                                : "Due soon"}
                            </span>
                          </p>
                          {fu.notes && (
                            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                              {fu.notes}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const leadId = fu.metadata?.leadId ?? fu.leadId;
                                setOpen(false);
                                if (fu.link) router.push(fu.link);
                                else if (leadId) router.push(`/agent-panel/leads/${leadId}`);
                              }}
                              className="text-[11px] font-semibold text-theme-primary hover:underline"
                            >
                              View Lead →
                            </button>
                            {waUrl && (
                              <button
                                onClick={() => window.open(waUrl, "_blank")}
                                className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-green-600 transition-colors"
                              >
                                <MessageCircle className="h-3 w-3" />
                                WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Regular notifications — show only 8 in popup */}
            {!isLoading && recentNotifications.length > 0 && (
              <section>
                {followUps.length > 0 && (
                  <div className="sticky top-0 bg-slate-50/90 backdrop-blur-sm px-4 py-2 border-b border-slate-100 z-10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Recent Activity
                    </span>
                  </div>
                )}
                <div className="divide-y divide-slate-50">
                  {recentNotifications.map((n) => {
                    const meta = TYPE_META[n.type] ?? TYPE_META.default;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 ${!n.read ? "bg-blue-50/40" : ""}`}
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm text-slate-800 ${!n.read ? "font-semibold" : "font-medium"}`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

             {isEmpty && (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Bell className="h-6 w-6 text-slate-400" />
                </div>

                <p className="text-sm font-medium text-slate-500">
                  You&apos;re all caught up!
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No notifications right now.
                </p>
              </div>
            )}
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}