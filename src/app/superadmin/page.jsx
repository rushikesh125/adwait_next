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
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";

/* ─────────────────────────────────────────────────────────────
   MODULE-LEVEL CONSTANTS
───────────────────────────────────────────────────────────── */
const STATUS_MAP = {
  accepted: {
    label: "Active",
    theme: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    theme: "bg-red-50 text-red-600 border-red-200",
  },
  suspended: {
    label: "Suspended",
    theme: "bg-slate-100 text-slate-500 border-slate-200",
  },
  pending: {
    label: "Pending",
    theme: "bg-amber-50 text-amber-600 border-amber-200",
  },
};

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
}) => {
  const current = STATUS_MAP[user.approved] || STATUS_MAP.pending;

  return (
    <tr
      className="group hover:bg-[#1E88E5]/[0.03] transition-colors duration-200"
      style={{ animation: `fadeInUp 0.35s ease ${index * 45}ms both` }}
    >
      <td className="px-4 sm:px-8 py-4 sm:py-5 align-middle">
        <div className="flex items-center gap-3 sm:gap-4">
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
      <td className="px-8 py-5 align-middle hidden md:table-cell">
        <div className="flex flex-col space-y-1">
          <span className="text-[13px] font-medium text-slate-600 flex items-center gap-2">
            <Mail size={12} className="text-slate-300" /> {user.email}
          </span>
          <span className="text-[13px] font-medium text-slate-500 flex items-center gap-2">
            <Phone size={12} className="text-slate-300" /> {user.phone || "—"}
          </span>
        </div>
      </td>
      <td className="px-4 sm:px-8 py-4 sm:py-5 align-middle">
        <Badge
          variant="outline"
          className={`${current.theme} border font-bold uppercase text-[10px] px-2.5 py-0.5 rounded-lg whitespace-nowrap`}
        >
          {current.label}
        </Badge>
      </td>
      <td className="px-4 sm:px-8 py-4 sm:py-5 align-middle text-right">
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
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left min-w-[480px]">
      <thead className="bg-slate-50/80 border-b border-slate-100">
        <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          <th className="px-4 sm:px-8 py-4">User Profile</th>
          <th className="px-8 py-4 hidden md:table-cell">Contact Info</th>
          <th className="px-4 sm:px-8 py-4">Status</th>
          <th className="px-4 sm:px-8 py-4 text-right">Actions</th>
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
        "template_1tiwdgl",
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
        "template_1tiwdgl",
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
      color: "text-[#1E88E5]",
      bg: "bg-[#1E88E5]/10",
    },
    {
      label: "Active Admins",
      value: activeAdmins,
      icon: <ShieldCheck size={18} />,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Pending Review",
      value: pendingCount,
      icon: <AlertCircle size={18} />,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const rowHandlers = {
    onApprove: handleApprove,
    onOpenReject: handleOpenReject,
    onSuspend: handleSuspend,
    onDelete: handleDelete,
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900">
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "14px", fontWeight: 600, fontSize: "13px" },
          }}
        />

        <header
          className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl px-4 sm:px-8 h-16 flex items-center justify-between"
          style={{ animation: "slideDown 0.4s ease both" }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-[#1E88E5] p-2 rounded-xl shadow-lg shadow-blue-500/25">
              <Shield className="text-white w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#1E88E5] to-[#7C3AED]">
              Adwait Admin
            </span>
          </div>
          <UserDropdown user={currentUser} />
        </header>

        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-6 sm:space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {stats.map(({ label, value, icon, color, bg }, i) => (
              <Card
                key={label}
                className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl"
                style={{ animation: `fadeInUp 0.4s ease ${i * 80}ms both` }}
              >
                <CardHeader className="pb-3 pt-5 px-6">
                  <div className="flex items-center justify-between">
                    <CardDescription className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      {label}
                    </CardDescription>
                    <div className={`p-2 rounded-xl ${bg} ${color}`}>
                      {icon}
                    </div>
                  </div>
                  <CardTitle className={`text-3xl font-black mt-1 ${color}`}>
                    {value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div style={{ animation: "fadeInUp 0.45s ease 220ms both" }}>
            <Tabs defaultValue="admins">
              {/* Filter Controls Bar */}
              <div className="bg-white border border-slate-100 p-4 rounded-3xl mb-6 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative w-full lg:flex-1">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-11 h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all"
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
                    <SelectTrigger className="h-12 w-full lg:w-48 rounded-2xl border-slate-100 bg-slate-50/50 font-semibold text-slate-600">
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
                    className="h-12 w-12 lg:w-auto px-0 lg:px-4 rounded-2xl border-slate-100 text-slate-600"
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

              <Card className="rounded-3xl overflow-hidden border border-slate-200/60 shadow-lg">
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
        </main>

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
    </>
  );
}
