"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import emailjs from "@emailjs/browser";
import {
  Shield,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  MoreHorizontal,
  Check,
  X,
  Ban,
  Trash2,
  Users,
  AlertCircle,
  Search,
  Filter,
  XCircle,
  KeyRound,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UserDropdown from "@/components/UserDropdown";
import { auth } from "@/firebase/config";
import SuperadminLeftMenu from "@/components/SuperadminLeftMenu";
import RequireAuth from "@/components/RequireAuth";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import StatusBadge from "@/components/StatusBadge";

/* ─────────────────────────────────────────────────────────────
   MODULE-LEVEL CONSTANTS
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   STABLE COMPONENTS (Outside Dashboard)
───────────────────────────────────────────────────────────── */

const UserRow = ({
  user,
  type,
  index,
  onApprove,
  onOpenReject,
  onSuspend,
  onDelete,
  onResetPassword,
}) => {
  return (
    <tr
      className="group hover:bg-[#1E88E5]/[0.03] transition-colors duration-200"
      style={{ animation: `fadeInUp 0.35s ease ${index * 45}ms both` }}
    >
      <td className="px-3 sm:px-6 py-3 sm:py-3.5 align-middle">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 ${type === "admins" ? "bg-[#1E88E5]/10 text-[#1E88E5]" : "bg-slate-100 text-slate-500"}`}
          >
            {type === "admins" ? (
              <ShieldCheck size={18} />
            ) : (
              <UserRound size={18} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">
              {user.name}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {type.slice(0, -1)}
            </p>
            <div className="flex flex-col mt-1 space-y-0.5 md:hidden">
              <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <Mail size={10} className="text-slate-300 flex-shrink-0" />{" "}
                {user.email}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-3.5 align-middle hidden md:table-cell">
        <div className="flex flex-col space-y-1">
          <span className="text-[13px] font-medium text-slate-600 flex items-center gap-2">
            <Mail size={12} className="text-slate-300" /> {user.email}
          </span>
          <span className="text-[13px] font-medium text-slate-500 flex items-center gap-2">
            <Phone size={12} className="text-slate-300" /> {user.phone || "—"}
          </span>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-3.5 align-middle">
        <StatusBadge
          status={user.approved || "pending"}
          fallback="Pending"
          className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-lg whitespace-nowrap"
        />
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-3.5 align-middle text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9 hover:bg-white hover:shadow-md transition-all duration-200"
            >
              <MoreHorizontal size={18} className="text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 p-1.5 rounded-2xl shadow-xl border-slate-100"
          >
            {user.approved !== "accepted" && (
              <DropdownMenuItem
                onClick={() => onApprove(type, user.id)}
                className="rounded-xl text-emerald-600 font-semibold cursor-pointer"
              >
                <Check className="mr-2.5 w-4 h-4" /> Approve
              </DropdownMenuItem>
            )}
            {user.approved === "pending" && (
              <DropdownMenuItem
                onClick={() => onOpenReject({ ...user, type })}
                className="rounded-xl text-amber-600 font-semibold cursor-pointer"
              >
                <X className="mr-2.5 w-4 h-4" /> Reject
              </DropdownMenuItem>
            )}
            {user.approved === "accepted" && (
              <DropdownMenuItem
                onClick={() => onSuspend(type, user.id)}
                className="rounded-xl text-slate-600 font-semibold cursor-pointer"
              >
                <Ban className="mr-2.5 w-4 h-4" /> Suspend
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onResetPassword({ ...user, type })}
              className="rounded-xl text-blue-600 font-semibold cursor-pointer"
            >
              <KeyRound className="mr-2.5 w-4 h-4" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => onDelete(type, user.id)}
              className="rounded-xl text-red-600 font-semibold cursor-pointer"
            >
              <Trash2 className="mr-2.5 w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
};

const UserTable = ({
  list,
  type,
  loading,
  onApprove,
  onOpenReject,
  onSuspend,
  onDelete,
  onResetPassword,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left min-w-[480px]">
      <thead className="bg-slate-50/80 border-b border-slate-100">
        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          <th className="px-3 sm:px-6 py-3">User Profile</th>
          <th className="px-6 py-3 hidden md:table-cell">Contact Info</th>
          <th className="px-3 sm:px-6 py-3">Status</th>
          <th className="px-3 sm:px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {loading ? (
          <tr>
            <td colSpan={4} className="py-20 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#1E88E5] w-7 h-7" />
                <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Fetching data…
                </p>
              </div>
            </td>
          </tr>
        ) : list.length > 0 ? (
          list.map((u, i) => (
            <UserRow
              key={u.id}
              user={u}
              type={type}
              index={i}
              onApprove={onApprove}
              onOpenReject={onOpenReject}
              onSuspend={onSuspend}
              onDelete={onDelete}
              onResetPassword={onResetPassword}
            />
          ))
        ) : (
          <tr>
            <td
              colSpan={4}
              className="py-20 text-center text-slate-400 text-sm font-medium"
            >
              No matching {type === "admins" ? "Administrators" : "Agents"}{" "}
              found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   DASHBOARD PAGE COMPONENT
───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [admins, setAdmins] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useSelector((state) => state.auth);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [adminSnap, agentSnap] = await Promise.all([
        getDocs(collection(db, "admins")),
        getDocs(collection(db, "agents")),
      ]);
      setAdmins(adminSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAgents(agentSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      toast.error("Failed to sync users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtering Logic
  const filterData = (data) => {
    return data.filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.approved === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredAdmins = useMemo(
    () => filterData(admins),
    [admins, searchQuery, statusFilter],
  );
  const filteredAgents = useMemo(
    () => filterData(agents),
    [agents, searchQuery, statusFilter],
  );

  /* ── Handlers ── */
 const handleApprove = async (type, id) => {
    const userToApprove = [...admins, ...agents].find(u => u.id === id);
    if (!userToApprove) return;

    const loadingToast = toast.loading("Approving and notifying...");

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, type, id), { approved: "accepted" });

      // 2. Send via EmailJS
      const emailParams = {
        to_name: userToApprove.name,
        to_email: userToApprove.email,
        user_role: type === "admins" ? "Administrator" : "Agent",
        status: "Approved", // Dynamic status
        admin_message: "Your application has been reviewed and approved. You now have full access to the platform.",
      };

      await emailjs.send(
        "service_gmfmqbu",
        process.env.NEXT_PUBLIC_EMAILJS_APPROVAL_TEMPLATE_ID,
        emailParams,
        "GjevhIIhLITokCOAK"
      );

      toast.success("User approved and notified", { id: loadingToast });
      fetchUsers();
    } catch (error) {
      console.error("Approval Error:", error);
      toast.error("Status updated, but notification failed.", { id: loadingToast });
    }
  };

  const handleSuspend = async (type, id) => {
    try {
      await updateDoc(doc(db, type, id), { approved: "suspended" });
      toast.success("User suspended");
      fetchUsers();
    } catch {
      toast.error("Update failed");
    }
  };

 const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return toast.error("Please provide a reason");

    const loadingToast = toast.loading("Processing rejection...");

    try {
      // 1. Update Firestore
      await updateDoc(doc(db, selectedUser.type, selectedUser.id), {
        approved: "rejected",
      });

      // 2. Send via EmailJS
      const emailParams = {
        to_name: selectedUser.name,
        to_email: selectedUser.email,
        user_role: selectedUser.type === "admins" ? "Administrator" : "Agent",
        status: "Rejected", // Dynamic status
        admin_message: rejectReason,
      };

      await emailjs.send(
        "service_gmfmqbu",
        process.env.NEXT_PUBLIC_EMAILJS_APPROVAL_TEMPLATE_ID,
        emailParams,
        "GjevhIIhLITokCOAK"
      );

      toast.success(`Notification sent to ${selectedUser.name}`, { id: loadingToast });
      setIsRejectModalOpen(false);
      setRejectReason("");
      fetchUsers();
    } catch (error) {
      console.error("Email Error:", error);
      toast.error("Status updated, but notification failed.", { id: loadingToast });
    }
  };
  const handleDelete = async (type, id) => {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await deleteDoc(doc(db, type, id));
      toast.success("User removed");
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleOpenReject = (user) => {
    setSelectedUser(user);
    setIsRejectModalOpen(true);
  };

  const handleOpenResetPassword = (user) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsResetPasswordModalOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!newPassword.trim()) return toast.error("Please enter a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setResettingPassword(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated. Please sign in again.");
      const res = await fetch("/api/superadmin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: resetPasswordUser.uid || resetPasswordUser.id, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");
      toast.success(`Password updated for ${resetPasswordUser.name}`);
      setIsResetPasswordModalOpen(false);
      setResetPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update password");
    } finally {
      setResettingPassword(false);
    }
  };

  const totalUsers = admins.length + agents.length;
  const activeAdmins = admins.filter((a) => a.approved === "accepted").length;
  const pendingCount = [...admins, ...agents].filter(
    (u) => u.approved === "pending",
  ).length;

  const stats = [
    {
      label: "Total Personnel",
      value: totalUsers,
      icon: <Users size={18} />,
      tone: "border-sky-200 bg-sky-50 text-sky-900",
    },
    {
      label: "Active Admins",
      value: activeAdmins,
      icon: <ShieldCheck size={18} />,
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      label: "Pending Review",
      value: pendingCount,
      icon: <AlertCircle size={18} />,
      tone: "border-amber-200 bg-amber-50 text-amber-900",
    },
  ];

  const rowHandlers = {
    onApprove: handleApprove,
    onOpenReject: handleOpenReject,
    onSuspend: handleSuspend,
    onDelete: handleDelete,
    onResetPassword: handleOpenResetPassword,
  };

  return (
    <RequireAuth allowedRoles={["superadmin"]}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans antialiased text-slate-900">
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "14px", fontWeight: 600, fontSize: "13px" },
          }}
        />

        <header
          className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-4 sm:px-6 h-14 flex items-center justify-between"
          style={{ animation: "slideDown 0.4s ease both" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-[#1E88E5] p-1.5 rounded-lg shadow-lg shadow-blue-500/25">
              <Shield className="text-white w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1E88E5] to-[#7C3AED]">
              Adwait Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserDropdown user={currentUser} />
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
            <SuperadminLeftMenu />

            <div className="space-y-6">
              <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,_#ffffff,_#f8fafc)] px-6 py-8 sm:px-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <Badge
                        variant="outline"
                        className="border-sky-200 bg-sky-50 text-sky-700"
                      >
                        Super Admin Dashboard
                      </Badge>
                      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                        Hello, {currentUser?.name || "Super Admin"}
                      </h1>
                      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                        Manage platform users, approvals, and access statuses from one place.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={fetchUsers}
                      disabled={loading}
                      className="border-slate-200 bg-white"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map(({ label, value, icon, tone }, i) => (
                  <div
                    key={label}
                    className={`flex min-h-[148px] flex-col justify-between rounded-3xl border p-6 shadow-sm ${tone}`}
                    style={{ animation: `fadeInUp 0.4s ease ${i * 80}ms both` }}
                  >
                    <div className="text-4xl font-black tracking-tight">{value}</div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="break-words text-sm font-semibold uppercase leading-5 tracking-[0.14em]">
                        {label}
                      </div>
                      <span className="opacity-70">{icon}</span>
                    </div>
                  </div>
                ))}
              </section>

          <div style={{ animation: "fadeInUp 0.45s ease 220ms both" }}>
            <Tabs defaultValue="admins">
              {/* Filter Controls Bar */}
              <div className="bg-white border border-slate-200 p-4 rounded-3xl mb-6 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative w-full lg:flex-1">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-11 h-11 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>

                <div className="flex w-full lg:w-auto gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-full lg:w-48 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold text-slate-600">
                      <div className="flex items-center gap-2">
                        <Filter size={16} />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="accepted">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={fetchUsers}
                    disabled={loading}
                    className="h-11 w-11 lg:w-auto px-0 lg:px-4 rounded-2xl border-slate-100 text-slate-600"
                  >
                    <RefreshCw
                      size={18}
                      className={loading ? "animate-spin" : ""}
                    />
                    <span className="hidden lg:inline ml-2 font-bold">
                      Refresh
                    </span>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <TabsList className="bg-slate-100 p-1 h-11 rounded-2xl w-full sm:w-auto">
                  <TabsTrigger
                    value="admins"
                    className="flex-1 sm:flex-none px-5 sm:px-8 h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1E88E5] font-bold text-sm transition-all"
                  >
                    Administrators
                    <span className="ml-2 text-[10px] bg-slate-200 rounded-full px-1.5 py-0.5 font-black">
                      {filteredAdmins.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="agents"
                    className="flex-1 sm:flex-none px-5 sm:px-8 h-full rounded-xl data-[state=active]:bg-white data-[state=active]:text-[#1E88E5] font-bold text-sm transition-all"
                  >
                    Agents
                    <span className="ml-2 text-[10px] bg-slate-200 rounded-full px-1.5 py-0.5 font-black">
                      {filteredAgents.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <Card className="rounded-3xl overflow-hidden border border-slate-200/60 shadow-sm">
                <TabsContent
                  value="admins"
                  className="mt-0 focus-visible:ring-0 outline-none"
                >
                  <UserTable
                    list={filteredAdmins}
                    type="admins"
                    loading={loading}
                    {...rowHandlers}
                  />
                </TabsContent>
                <TabsContent
                  value="agents"
                  className="mt-0 focus-visible:ring-0 outline-none"
                >
                  <UserTable
                    list={filteredAgents}
                    type="agents"
                    loading={loading}
                    {...rowHandlers}
                  />
                </TabsContent>
              </Card>
            </Tabs>
          </div>
          </div>
          </div>
        </main>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordModalOpen} onOpenChange={(open) => { if (!open) { setIsResetPasswordModalOpen(false); setNewPassword(""); setConfirmPassword(""); setResetPasswordUser(null); } }}>
          <DialogContent className="rounded-3xl p-6 sm:p-8 w-[calc(100%-2rem)] sm:max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" /> Set New Password
              </DialogTitle>
              <DialogDescription className="pt-1.5 text-sm">
                Set a new password for{" "}
                <strong className="text-slate-700">{resetPasswordUser?.name}</strong>{" "}
                ({resetPasswordUser?.email}). Share it with the user manually.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">New Password</label>
                <Input
                  type="text"
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-2xl text-sm font-mono"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Confirm Password</label>
                <Input
                  type="text"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`h-11 rounded-2xl text-sm font-mono ${confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus-visible:ring-red-400" : confirmPassword && confirmPassword === newPassword ? "border-emerald-400 focus-visible:ring-emerald-400" : ""}`}
                  autoComplete="new-password"
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 font-semibold">Passwords do not match</p>
                )}
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => { setIsResetPasswordModalOpen(false); setNewPassword(""); setConfirmPassword(""); setResetPasswordUser(null); }}
                className="rounded-xl font-bold w-full sm:w-auto"
                disabled={resettingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmResetPassword}
                disabled={resettingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black w-full sm:w-auto transition-colors"
              >
                {resettingPassword ? (
                  <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Updating…</>
                ) : (
                  <><KeyRound className="mr-2 w-4 h-4" /> Update Password</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
          <DialogContent className="rounded-3xl p-6 sm:p-8 w-[calc(100%-2rem)] sm:max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
                Reject Application
              </DialogTitle>
              <DialogDescription className="pt-1.5 text-sm">
                <strong className="text-slate-700">{selectedUser?.name}</strong>{" "}
                will be notified by email with the reason below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-5">
              <Textarea
                placeholder="Explain why this application is being declined…"
                className="min-h-[130px] rounded-2xl resize-none focus:ring-2 focus:ring-[#1E88E5] text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason("");
                }}
                className="rounded-xl font-bold w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 font-black w-full sm:w-auto transition-colors"
              >
                Reject &amp; Notify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RequireAuth>
  );
}
