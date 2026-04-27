"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "@/firebase/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Loader2 } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildMonthlyData(invoices, year) {
  const map = Array.from({ length: 12 }, (_, i) => ({
    month: MONTHS[i],
    revenue: 0,
    paid: 0,
  }));

  invoices.forEach((inv) => {
    const ts = inv.createdAt;
    const date = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!date || date.getFullYear() !== year) return;
    const m = date.getMonth();
    map[m].revenue += Number(inv.grandTotal || 0);
    map[m].paid += Number(inv.amountReceived || 0);
  });

  return map;
}

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

export default function RevenueChart({ agentId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ revenue: 0, paid: 0, due: 0 });
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "invoices"), where("agentId", "==", agentId))
        );
        const invoices = snap.docs.map((d) => d.data());
        const monthly = buildMonthlyData(invoices, year);
        setData(monthly);

        const totalRevenue = invoices.reduce((s, i) => s + Number(i.grandTotal || 0), 0);
        const totalPaid = invoices.reduce((s, i) => s + Number(i.amountReceived || 0), 0);
        setTotals({ revenue: totalRevenue, paid: totalPaid, due: totalRevenue - totalPaid });
      } catch {
        // silently skip if invoices collection unavailable
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId, year]);

  if (loading) {
    return (
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-xl text-slate-900">Revenue — {year}</CardTitle>
          <CardDescription>Monthly invoiced vs collected amounts.</CardDescription>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Invoiced</p>
            <p className="text-lg font-black text-slate-800">{fmt(totals.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Collected</p>
            <p className="text-lg font-black text-emerald-600">{fmt(totals.paid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Outstanding</p>
            <p className="text-lg font-black text-rose-500">{fmt(totals.due)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
            No invoice data for {year} yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="revenue" name="Invoiced" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="paid" name="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
