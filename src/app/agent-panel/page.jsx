"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  FileCheck2,
  FileText,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";

import { db } from "@/firebase/config";
import { fetchAllVouchersForAgent } from "@/firebase/voucher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const quickActions = [
  {
    title: "Create Quotation",
    description: "Start a new customer package and pricing draft.",
    href: "/agent-panel/my-quatation/create",
    icon: FileText,
  },
  {
    title: "Add Lead",
    description: "Capture a new inquiry and move it into sales flow.",
    href: "/agent-panel/leads?open=new",
    icon: Briefcase,
  },
  {
    title: "Create Itinerary",
    description: "Publish a new trip form for travellers.",
    href: "/agent-panel/itinerary/create",
    icon: CalendarDays,
  },
  {
    title: "Create Voucher",
    description: "Issue a standalone hotel voucher quickly.",
    href: "/agent-panel/vouchers/create-hotel",
    icon: Ticket,
  },
];

const emptyDashboard = {
  leads: [],
  customers: [],
  quotations: [],
  itineraries: [],
  vouchers: [],
  metrics: {
    totalLeads: 0,
    newLeads: 0,
    totalCustomers: 0,
    totalQuotations: 0,
    acceptedQuotations: 0,
    totalVouchers: 0,
    totalItineraries: 0,
    publicItineraries: 0,
  },
};

function formatDate(value) {
  if (!value) return "No date";

  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSubtitle(primary, secondary) {
  if (primary && secondary) return `${primary} - ${secondary}`;
  return primary || secondary || "No additional details";
}

function statusTone(status) {
  const value = String(status || "").toLowerCase();

  if (["accepted", "active", "sent", "public"].includes(value)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (["pending", "generated", "new", "draft"].includes(value)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (["cancelled", "rejected", "closed", "suspended"].includes(value)) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

function SectionList({ title, description, items, actionHref, actionLabel }) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-theme-primary">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Nothing to show yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {item.status ? (
                  <Badge
                    variant="outline"
                    className={`border ${statusTone(item.status)}`}
                  >
                    {item.status}
                  </Badge>
                ) : null}
                <span className="text-[11px] text-slate-400">{item.date}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!user?.uid) return;

    setError("");
    setRefreshing(true);

    try {
      const leadsPromise = getDocs(
        query(
          collection(db, "leads"),
          where("agentId", "==", user.uid),
        ),
      );
      const customersPromise = getDocs(
        query(
          collection(db, "customers"),
          where("assignedAgentId", "==", user.uid),
        ),
      );
      const quotationsPromise = getDocs(
        query(
          collection(db, "saved_packages_by_agents", user.uid, "packages"),
          orderBy("createdAt", "desc"),
          limit(5),
        ),
      );
      const allQuotationsPromise = getDocs(
        collection(db, "saved_packages_by_agents", user.uid, "packages"),
      );
      const allItinerariesPromise = getDocs(
        query(collection(db, "trips"), where("agentId", "==", user.uid)),
      );
      const vouchersPromise = fetchAllVouchersForAgent(user.uid);
      const leadsCountPromise = getDocs(
        query(collection(db, "leads"), where("agentId", "==", user.uid)),
      );
      const customersCountPromise = getDocs(
        query(collection(db, "customers"), where("assignedAgentId", "==", user.uid)),
      );

      const [
        leadsSnap,
        customersSnap,
        quotationsSnap,
        allQuotationsSnap,
        allItinerariesSnap,
        vouchers,
        leadsCountSnap,
        customersCountSnap,
      ] = await Promise.all([
        leadsPromise,
        customersPromise,
        quotationsPromise,
        allQuotationsPromise,
        allItinerariesPromise,
        vouchersPromise,
        leadsCountPromise,
        customersCountPromise,
      ]);

      const leads = leadsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5)
        .map((lead) => ({
          id: lead.id,
          title: lead.name || "Unnamed lead",
          subtitle: formatSubtitle(
            lead.destination,
            lead.travelDate || lead.departureCity,
          ),
          status: lead.status || "New",
          date: formatDate(lead.createdAt),
        }));

      const customers = customersSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5)
        .map((customer) => ({
          id: customer.id,
          title: customer.name || "Unnamed customer",
          subtitle: formatSubtitle(customer.mobile, customer.city),
          status: customer.status || null,
          date: formatDate(customer.createdAt || customer.updatedAt),
        }));

      const quotations = quotationsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.packageName || data.customerName || "Untitled quotation",
          subtitle: formatSubtitle(
            data.customerName,
            data.destination || data.selectedDestination,
          ),
          status: data.status || "Draft",
          date: formatDate(data.createdAt),
        };
      });

      const normalizedVouchers = vouchers
        .slice(0, 5)
        .map((voucher) => ({
          id: voucher.id,
          title: voucher.voucherNumber || voucher.hotelName || "Voucher",
          subtitle: formatSubtitle(
            voucher.customerName,
            voucher.hotelName || voucher.destination,
          ),
          status: voucher.status || "Generated",
          date: formatDate(voucher.createdAt || voucher.issueDate),
        }));

      const allQuotations = allQuotationsSnap.docs.map((doc) => doc.data());
      const allItineraryDocs = allItinerariesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const allItineraries = allItineraryDocs.map(({ id, ...data }) => data);
      const allLeads = leadsCountSnap.docs.map((doc) => doc.data());
      const itineraries = [...allItineraryDocs]
        .sort((a, b) => {
          const first = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
          const second = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
          return second - first;
        })
        .slice(0, 5)
        .map((trip) => ({
          id: trip.id,
          title: trip.tripName || "Untitled itinerary",
          subtitle: `${Array.isArray(trip.journeys) ? trip.journeys.length : 0} segment(s)`,
          status: trip.status || "draft",
          date: formatDate(trip.updatedAt || trip.createdAt),
        }));

      setDashboard({
        leads,
        customers,
        quotations,
        itineraries,
        vouchers: normalizedVouchers,
        metrics: {
          totalLeads: leadsCountSnap.size,
          newLeads: allLeads.filter(
            (lead) => String(lead.status || "").toLowerCase() === "new",
          ).length,
          totalCustomers: customersCountSnap.size,
          totalQuotations: allQuotationsSnap.size,
          acceptedQuotations: allQuotations.filter(
            (quote) => String(quote.status || "").toLowerCase() === "accepted",
          ).length,
          totalVouchers: vouchers.length,
          totalItineraries: allItinerariesSnap.size,
          publicItineraries: allItineraries.filter(
            (trip) => String(trip.status || "").toLowerCase() === "public",
          ).length,
        },
      });
    } catch (err) {
      console.error("Failed to load dashboard", err);
      setError("Dashboard data could not be loaded.");
      setDashboard(emptyDashboard);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards = useMemo(
    () => [
      {
        label: "Leads",
        value: dashboard.metrics.totalLeads,
        hint: `${dashboard.metrics.newLeads} new`,
        icon: Briefcase,
        tone: "bg-sky-50 text-sky-700 border-sky-100",
      },
      {
        label: "Customers",
        value: dashboard.metrics.totalCustomers,
        hint: "Customer database",
        icon: Users,
        tone: "bg-violet-50 text-violet-700 border-violet-100",
      },
      {
        label: "Quotations",
        value: dashboard.metrics.totalQuotations,
        hint: `${dashboard.metrics.acceptedQuotations} accepted`,
        icon: FileCheck2,
        tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
      },
      {
        label: "Vouchers",
        value: dashboard.metrics.totalVouchers,
        hint: "Issued documents",
        icon: Ticket,
        tone: "bg-amber-50 text-amber-700 border-amber-100",
      },
      {
        label: "Itineraries",
        value: dashboard.metrics.totalItineraries,
        hint: `${dashboard.metrics.publicItineraries} public`,
        icon: CalendarDays,
        tone: "bg-rose-50 text-rose-700 border-rose-100",
      },
    ],
    [dashboard.metrics],
  );

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
    <div className="min-h-screen bg-slate-50/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.14),_transparent_32%),linear-gradient(135deg,_#ffffff,_#f8fafc)] px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <Badge
                  variant="outline"
                  className="border-sky-200 bg-sky-50 text-sky-700"
                >
                  Agent Workspace
                </Badge>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back, {user?.name || "Agent"}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  This dashboard brings your leads, quotations, vouchers, and
                  itinerary work into one place so you can jump straight into
                  today&apos;s priorities.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
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
                <Button asChild className="bg-theme-primary text-white hover:opacity-95">
                  <Link href="/agent-panel/my-quatation/create">
                    <Plus className="h-4 w-4" />
                    New Quotation
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <Card className="border-red-200 bg-red-50 text-red-700 shadow-sm">
            <CardContent className="px-6 py-4 text-sm">{error}</CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <Card key={card.label} className="border-slate-200/80 shadow-sm">
              <CardContent className="px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                  </div>
                  <div className={`rounded-2xl border p-3 ${card.tone}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">
                Quick Actions
              </CardTitle>
              <CardDescription>
                Shortcuts into the agent workflows you use most often.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-theme-primary hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-theme-primary shadow-sm">
                        <action.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-theme-primary" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">
                Today&apos;s Snapshot
              </CardTitle>
              <CardDescription>
                A quick read on the pipeline and documents under your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                    <MapPinned className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Leads needing attention
                    </p>
                    <p className="text-sm text-slate-500">
                      {dashboard.metrics.newLeads > 0
                        ? `${dashboard.metrics.newLeads} new lead(s) are waiting for follow-up.`
                        : "No brand-new leads are waiting right now."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Quotations performing well
                    </p>
                    <p className="text-sm text-slate-500">
                      {dashboard.metrics.acceptedQuotations} accepted quotation(s)
                      in your saved package history.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Vouchers issued
                    </p>
                    <p className="text-sm text-slate-500">
                      {dashboard.metrics.totalVouchers} voucher record(s) are
                      available for download or sharing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionList
            title="Recent Quotations"
            description="Your latest saved packages and proposal drafts."
            items={dashboard.quotations}
            actionHref="/agent-panel/my-quatation"
            actionLabel="View all"
          />

          <SectionList
            title="Recent Leads"
            description="Newest inquiries coming into the sales pipeline."
            items={dashboard.leads}
            actionHref="/agent-panel/leads"
            actionLabel="Open leads"
          />

          <SectionList
            title="Recent Vouchers"
            description="Latest voucher documents generated from quotations."
            items={dashboard.vouchers}
            actionHref="/agent-panel/vouchers"
            actionLabel="Open vouchers"
          />

          <SectionList
            title="Recent Itineraries"
            description="Trip forms and itinerary drafts updated recently."
            items={dashboard.itineraries}
            actionHref="/agent-panel/itinerary"
            actionLabel="Open itinerary"
          />
        </section>

        <section>
          <SectionList
            title="Recent Customers"
            description="Recently added customer records from the shared database."
            items={dashboard.customers}
            actionHref="/agent-panel/customers"
            actionLabel="Open customers"
          />
        </section>
      </div>
    </div>
  );
}
