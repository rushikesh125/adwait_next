"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  Bell, CheckCheck, FileText, TrendingUp, TrendingDown,
  Send, Clock, Phone, MessageCircle, Mail, AlertCircle,
  Users, CalendarCheck, XCircle, ArrowLeft, Search,
  Trash2, Filter, Circle, CheckCircle2, Inbox,
} from "lucide-react";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/firebase/notificationsService";
import { useNotifications } from "@/hooks/useNotifications";
import {
  collection, query, where, orderBy, limit,
  onSnapshot, deleteDoc, doc, getDocs, writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/config";

const TYPE_META = {
  quotation_accepted: { icon: TrendingUp,    color: "text-emerald-600", bg: "bg-emerald-50",  label: "Quotation Accepted" },
  quotation_rejected: { icon: TrendingDown,  color: "text-rose-600",    bg: "bg-rose-50",     label: "Quotation Rejected" },
  quotation_sent:     { icon: Send,          color: "text-blue-600",    bg: "bg-blue-50",     label: "Quotation Sent"     },
  follow_up_reminder: { icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50",    label: "Follow-up"          },
  booking_confirmed:  { icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50",  label: "Booking Confirmed"  },
  booking_cancelled:  { icon: XCircle,       color: "text-rose-600",    bg: "bg-rose-50",     label: "Booking Cancelled"  },
  invoice_generated:  { icon: FileText,      color: "text-purple-600",  bg: "bg-purple-50",   label: "Invoice"            },
  lead_assigned:      { icon: Users,         color: "text-blue-600",    bg: "bg-blue-50",     label: "Lead Assigned"      },
  default:            { icon: Bell,          color: "text-slate-600",   bg: "bg-slate-100",   label: "Notification"       },
};

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fullDate(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Detail Panel ──────────────────────────────────────────────────────────────
function NotificationDetail({ notification, onClose, onDelete }) {
  const router = useRouter();
  if (!notification) return null;
  const meta = TYPE_META[notification.type] ?? TYPE_META.default;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-slate-800 truncate">{notification.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{fullDate(notification.createdAt)}</p>
        </div>
        <button
          onClick={() => onDelete(notification.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Detail body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Type badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.bg}`}>
            <Icon className={`h-6 w-6 ${meta.color}`} />
          </div>
          <div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {!notification.read && (
              <span className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                New
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-700 leading-relaxed">{notification.message}</p>
        </div>

        {/* Metadata if any */}
        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Details</p>
            <div className="space-y-2">
              {Object.entries(notification.metadata).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-slate-800 font-medium">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        {notification.link && notification.link !== "/" && (
          <button
            onClick={() => router.push(notification.link)}
            className="w-full py-2.5 rounded-xl bg-theme-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            View Details →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { user } = useSelector((state) => state.auth);
  const userId = user?.uid;
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // all | unread | read
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Load ALL notifications (more than the 50 in the hook)
  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    return unsub;
  }, [userId]);

  // Auto-mark as read when opened
  const handleSelect = async (n) => {
    setSelected(n);
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => x.id === n.id ? { ...x, read: true } : x)
      );
      if (selected?.id === n.id) setSelected({ ...n, read: true });
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "notifications", id));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleDeleteSelected = async () => {
    const batch = writeBatch(db);
    selectedIds.forEach((id) => batch.delete(doc(db, "notifications", id)));
    await batch.commit();
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    if (selectedIds.has(selected?.id)) setSelected(null);
    setSelectedIds(new Set());
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (selected) setSelected({ ...selected, read: true });
  };

  const toggleSelectId = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filtered list
  const filtered = notifications.filter((n) => {
    if (filter === "unread" && n.read) return false;
    if (filter === "read" && !n.read) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        n.title?.toLowerCase().includes(s) ||
        n.message?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-100">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 lg:px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Inbox className="h-5 w-5 text-slate-600" />
          <h1 className="text-base font-semibold text-slate-800">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-theme-primary hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left panel — list */}
        <div className={`flex flex-col bg-white border-r border-slate-200 flex-shrink-0
          ${selected ? "hidden lg:flex lg:w-[380px] xl:w-[420px]" : "w-full lg:w-[380px] xl:w-[420px]"}
        `}>
          {/* Search + filter bar */}
          <div className="px-4 py-3 border-b border-slate-100 space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              {["all", "unread", "read"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${
                    filter === f
                      ? "bg-theme-primary text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {isLoading && (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Bell className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? "Try a different search" : filter === "unread" ? "All caught up!" : "Nothing here yet"}
                </p>
              </div>
            )}

            {!isLoading && filtered.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.default;
              const Icon = meta.icon;
              const isSelected = selected?.id === n.id;
              const isChecked = selectedIds.has(n.id);

              return (
                <div
                  key={n.id}
                  onClick={() => handleSelect(n)}
                  className={`group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors
                    ${isSelected ? "bg-blue-50 border-l-2 border-theme-primary" : "hover:bg-slate-50 border-l-2 border-transparent"}
                    ${!n.read ? "bg-blue-50/30" : ""}
                  `}
                >
                  {/* Checkbox on hover */}
                  <div
                    onClick={(e) => toggleSelectId(n.id, e)}
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isChecked
                      ? <CheckCircle2 className="h-4 w-4 text-theme-primary" />
                      : <Circle className="h-4 w-4 text-slate-300" />
                    }
                  </div>

                  {/* Icon */}
                  <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl ${meta.bg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm truncate ${!n.read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                        {meta.label}
                      </span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — detail */}
        <div className={`flex-1 bg-white
          ${selected ? "flex flex-col" : "hidden lg:flex lg:items-center lg:justify-center"}
        `}>
          {selected ? (
            <NotificationDetail
              notification={selected}
              onClose={() => setSelected(null)}
              onDelete={handleDelete}
            />
          ) : (
            <div className="text-center px-8">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Select a notification</p>
              <p className="text-xs text-slate-400 mt-1">Click any notification to read it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}