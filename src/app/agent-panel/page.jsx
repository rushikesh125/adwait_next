"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  TrendingUp,
} from "lucide-react";

import { db } from "@/firebase/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FollowUpCalendar from "@/components/dashboard/FollowUpCalendar";

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Quotation Sent",
  "Closed Won",
  "Closed Lost",
];
const QUOTATION_STATUSES = ["Draft", "Sent", "Accepted", "Rejected"];
const QUICK_LINKS = [
  {
    title: "Create Quotation",
    description: "Start a new quotation for a customer enquiry.",
    href: "/agent-panel/my-quatation/create",
    icon: FileText,
  },
  {
    title: "Add Lead",
    description: "Capture a new enquiry and push it into the pipeline.",
    href: "/agent-panel/leads?open=new",
    icon: Briefcase,
  },
  {
    title: "Create Itinerary",
    description: "Build a fresh itinerary for ongoing trip planning.",
    href: "/agent-panel/itinerary/create",
    icon: CalendarDays,
  },
  {
    title: "Create Voucher",
    description: "Generate a hotel voucher for confirmed bookings.",
    href: "/agent-panel/vouchers/create-hotel",
    icon: Ticket,
  },
];

const emptyCounts = (statuses) =>
  statuses.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

function normalizeStatus(value, statuses, fallback) {
  const incoming = String(value || "")
    .trim()
    .toLowerCase();
  const match = statuses.find((status) => status.toLowerCase() === incoming);
  return match || fallback;
}

function StatusCard({ label, value, tone }) {
  return (
    <div
      className={`flex min-h-[148px] flex-col justify-between rounded-3xl border p-6 shadow-sm ${tone}`}
    >
      <div className="text-4xl font-black tracking-tight">{value}</div>
      <div className="mt-3 break-words text-sm font-semibold uppercase leading-5 tracking-[0.12em] sm:tracking-[0.16em]">
        {label}
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [leadCounts, setLeadCounts] = useState(() =>
    emptyCounts(LEAD_STATUSES),
  );
  const [quotationCounts, setQuotationCounts] = useState(() =>
    emptyCounts(QUOTATION_STATUSES),
  );

  const loadDashboard = useCallback(async () => {
    if (!user?.uid) return;

    setError("");
    setRefreshing(true);

    try {
      const [leadsSnap, quotationsSnap] = await Promise.all([
        getDocs(
          query(collection(db, "leads"), where("agentId", "==", user.uid)),
        ),
        getDocs(
          collection(db, "saved_packages_by_agents", user.uid, "packages"),
        ),
      ]);

      const nextLeadCounts = emptyCounts(LEAD_STATUSES);
      leadsSnap.docs.forEach((doc) => {
        const status = normalizeStatus(
          doc.data()?.status,
          LEAD_STATUSES,
          "New",
        );
        nextLeadCounts[status] += 1;
      });

      const nextQuotationCounts = emptyCounts(QUOTATION_STATUSES);
      quotationsSnap.docs.forEach((doc) => {
        const status = normalizeStatus(
          doc.data()?.status,
          QUOTATION_STATUSES,
          "Draft",
        );
        nextQuotationCounts[status] += 1;
      });

      setLeadCounts(nextLeadCounts);
      setQuotationCounts(nextQuotationCounts);
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setError("Dashboard data could not be loaded.");
      setLeadCounts(emptyCounts(LEAD_STATUSES));
      setQuotationCounts(emptyCounts(QUOTATION_STATUSES));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalQuotations = useMemo(
    () => Object.values(quotationCounts).reduce((sum, count) => sum + count, 0),
    [quotationCounts],
  );

  const conversionRate = useMemo(() => {
    if (!totalQuotations) return 0;
    return Math.round((quotationCounts.Accepted / totalQuotations) * 100);
  }, [quotationCounts, totalQuotations]);

  const leadTones = [
    "border-sky-200 bg-sky-50 text-sky-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-rose-200 bg-rose-50 text-rose-900",
  ];

  const quotationTones = [
    "border-slate-200 bg-slate-50 text-slate-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-rose-200 bg-rose-50 text-rose-900",
  ];

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-theme-primary" />
          <p className="mt-3 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <FollowUpCalendar />
        </section>
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,_#ffffff,_#f8fafc)] px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <Badge
                  variant="outline"
                  className="border-sky-200 bg-sky-50 text-sky-700"
                >
                  Business Dashboard
                </Badge>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Hello, {user?.name || "Agent"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  A simple view of your enquiries and quotations so you can
                  track progress and conversion at a glance.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={loadDashboard}
                disabled={refreshing}
                className="border-slate-200 bg-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <Card className="border-red-200 bg-red-50 text-red-700 shadow-sm">
            <CardContent className="px-6 py-4 text-sm">{error}</CardContent>
          </Card>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">Leads</CardTitle>
                <CardDescription>
                  Status-wise breakdown of your enquiry pipeline.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {LEAD_STATUSES.map((status, index) => (
                <StatusCard
                  key={status}
                  label={status}
                  value={leadCounts[status]}
                  tone={leadTones[index]}
                />
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">
                  Conversion Rate
                </CardTitle>
                <CardDescription>
                  Accepted quotations divided by total quotations.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <div className="text-5xl font-black tracking-tight text-emerald-700">
                  {conversionRate}%
                </div>
                <p className="mt-2 text-sm text-emerald-800">
                  {quotationCounts.Accepted} accepted out of {totalQuotations}{" "}
                  total quotations
                </p>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${conversionRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl text-slate-900">
                  Quotations
                </CardTitle>
                <CardDescription>
                  Current quotation status distribution across your pipeline.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {QUOTATION_STATUSES.map((status, index) => (
                <StatusCard
                  key={status}
                  label={status}
                  value={quotationCounts[status]}
                  tone={quotationTones[index]}
                />
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-slate-900">
                Quick Links
              </CardTitle>
              <CardDescription>
                Fast access to the workflows you use most often.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-theme-primary hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-theme-primary shadow-sm transition group-hover:bg-theme-primary group-hover:text-white">
                        <link.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900">
                        {link.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {link.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-theme-primary" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
