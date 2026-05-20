"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Users,
  Briefcase,
  CalendarCheck,
  FileText,
  Loader2,
  UserCircle,
  Inbox,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAdminDashboardStats } from "@/firebase/adminService";

export default function AdminTeamPage() {
  const { user } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getAdminDashboardStats(user.uid, user.orgId)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid, user?.orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-theme-primary" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Agents",
      value: stats?.agents?.length ?? 0,
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: Briefcase,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Unassigned",
      value: stats?.unassigned ?? 0,
      icon: Inbox,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Quotations",
      value: stats?.totalQuotations ?? 0,
      icon: FileText,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Bookings",
      value: stats?.totalBookings ?? 0,
      icon: CalendarCheck,
      color: "text-theme-primary",
      bg: "bg-theme-muted",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Performance across all agents in your team</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-xl p-2.5 ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!stats?.agents?.length ? (
              <p className="text-sm text-slate-400 text-center py-8">No agents assigned yet</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.agents.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <UserCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize border-slate-200 text-slate-500">
                      {a.approved === "accepted" ? "Active" : a.approved ?? "Pending"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Lead Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {!stats?.leadStatusCounts || !Object.keys(stats.leadStatusCounts).length ? (
              <p className="text-sm text-slate-400 text-center py-4">No leads yet</p>
            ) : (
              Object.entries(stats.leadStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{status}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 rounded-full bg-slate-100 w-28 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-theme-primary"
                        style={{ width: `${Math.min(100, (count / (stats.totalLeads || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 w-5 text-right">{count}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
