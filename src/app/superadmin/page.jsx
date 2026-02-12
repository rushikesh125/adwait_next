"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  Users,
  UserCheck,
  Clock,
  LogOut,
  Shield,
  UserRound,
  LayoutDashboard,
  Loader2,
} from "lucide-react";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserCard from "@/components/UserCare";
import UserDropdown from "@/components/UserDropdown";
import { useSelector } from "react-redux";
// import UserCard from "@/components/UserCard";

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
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (type, id, status) => {
    const ref = doc(db, type, id);
    await updateDoc(ref, { approved: status });
    fetchUsers();
  };

  const handleDelete = async (type, id) => {
    const ref = doc(db, type, id);
    await deleteDoc(ref);
    fetchUsers();
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("adminName");
    window.location.href = "/";
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const totalApproved = [...admins, ...agents].filter((u) => u.approved).length;
  const totalPending = [...admins, ...agents].filter((u) => !u.approved).length;
  const adminName =
    typeof window !== "undefined"
      ? localStorage.getItem("adminName") || "Admin"
      : "Admin";

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* --- Responsive Header --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-theme-primary p-1.5 rounded-lg">
              <Shield className="w-5 h-5 md:w-6 md:h-6  text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-theme-primary">
              Adwait Tours
            </h1>
          </div>

          <UserDropdown user={user}/>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-bold text-theme-primary tracking-tight">
            Dashboard Overview
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Welcome back, {adminName}.
          </p>
        </div>

        {/* 📊 Statistics Grid - Highly Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">
                    Approved
                  </p>
                  <h3 className="text-3xl font-bold mt-1">{totalApproved}</h3>
                </div>
                <UserCheck className="w-8 h-8 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Pending
                  </p>
                  <h3 className="text-3xl font-bold mt-1 text-slate-900">
                    {totalPending}
                  </h3>
                </div>
                <Clock className="w-8 h-8 text-amber-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Total Users
                  </p>
                  <h3 className="text-3xl font-bold mt-1 text-slate-900">
                    {admins.length + agents.length}
                  </h3>
                </div>
                <Users className="w-8 h-8 text-slate-400 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- Tabs Section --- */}
        <Tabs defaultValue="admins" className="w-full space-y-6">
          <div className="flex items-center justify-between border-b pb-4 overflow-x-auto">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger
                value="admins"
                className="flex items-center gap-2 px-4 md:px-6"
              >
                <Shield className="w-4 h-4" />
                <span>Admins</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 text-[10px]"
                >
                  {admins.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="flex items-center gap-2 px-4 md:px-6"
              >
                <UserRound className="w-4 h-4" />
                <span>Agents</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 text-[10px]"
                >
                  {agents.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p>Loading records...</p>
            </div>
          ) : (
            <>
              <TabsContent value="admins" className="mt-0">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {admins.length > 0 ? (
                    admins.map((admin) => (
                      <UserCard
                        key={admin.id}
                        user={admin}
                        type="admins"
                        onChange={handleApproval}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    <EmptyState message="No administrators found." />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="agents" className="mt-0">
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {agents.length > 0 ? (
                    agents.map((agent) => (
                      <UserCard
                        key={agent.id}
                        user={agent}
                        type="agents"
                        onChange={handleApproval}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    <EmptyState message="No agent accounts found." />
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

// Helper Component for Empty States
function EmptyState({ message }) {
  return (
    <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-white/50">
      <LayoutDashboard className="w-10 h-10 text-slate-300 mb-3" />
      <p className="text-slate-500 font-medium">{message}</p>
    </div>
  );
}
