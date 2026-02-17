"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import emailjs from "@emailjs/browser";
import { Shield, UserRound, Loader2, Search, Badge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
// import UserRow from "./UserRow"; 
import UserDropdown from "@/components/UserDropdown";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import UserRow from "@/components/UserCard";

export default function Dashboard() {
  const [admins, setAdmins] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.auth);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const adminSnap = await getDocs(collection(db, "admins"));
      const agentSnap = await getDocs(collection(db, "agents"));
      setAdmins(adminSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setAgents(agentSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const sendStatusEmail = async (userEmail, userName, status, reason = "") => {
    try {
      // Create a separate template in EmailJS for status updates
      await emailjs.send(
        "service_gmfmqbu", 
        "template_status_update", // Update with your actual template ID
        {
          to_name: userName,
          to_email: userEmail,
          status: status,
          reason: reason || "Your account status has been updated by the administrator.",
        },
        "GjevhIIhLITokCOAK"
      );
    } catch (err) { console.error("Mail Error:", err); }
  };

  const handleStatusUpdate = async (type, id, newStatus, reason = "") => {
    try {
      const userList = type === "admins" ? admins : agents;
      const targetUser = userList.find(u => u.id === id);
      
      const ref = doc(db, type, id);
      await updateDoc(ref, { approved: newStatus });
      
      // Trigger Email
      await sendStatusEmail(targetUser.email, targetUser.name, newStatus, reason);
      
      toast.success(`User marked as ${newStatus}`);
      fetchUsers();
    } catch (error) { toast.error("Update failed"); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    await deleteDoc(doc(db, type, id));
    fetchUsers();
    toast.success("User deleted");
  };

  useEffect(() => { fetchUsers(); }, []);

  const UserTable = ({ data, type }) => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">User</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500 hidden md:table-cell">Email</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500 hidden sm:table-cell">Phone</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500">Status</th>
              <th className="p-4 text-xs font-bold uppercase text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <UserRow key={u.id} user={u} type={type} onChange={handleStatusUpdate} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Toaster />
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-600" />
          <h1 className="font-bold text-xl">Adwait Tours Admin</h1>
        </div>
        <UserDropdown user={user}/>
      </header>

      <main className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
            <p className="text-slate-500">Manage access levels and approvals for your team.</p>
          </div>
        </div>

        <Tabs defaultValue="admins" className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="admins" className="gap-2">Admins <Badge variant="secondary">{admins.length}</Badge></TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">Agents <Badge variant="secondary">{agents.length}</Badge></TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-blue-600 mb-2" /> Loading...</div>
          ) : (
            <>
              <TabsContent value="admins"><UserTable data={admins} type="admins" /></TabsContent>
              <TabsContent value="agents"><UserTable data={agents} type="agents" /></TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}