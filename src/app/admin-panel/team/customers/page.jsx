"use client";

import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  UserCircle,
  Loader2,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCustomersByAdmin } from "@/firebase/adminService";
import toast from "react-hot-toast";

export default function AdminTeamCustomersPage() {
  const { user } = useSelector((s) => s.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const c = await getCustomersByAdmin(user.uid, user.orgId);
      setCustomers(c);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.uid, user?.orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.mobile?.includes(q) ||
        c.city?.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCircle className="h-6 w-6 text-slate-600" /> Team Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">{customers.length} customers linked to your team's leads</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 py-4 px-5">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              className="pl-9 h-9 rounded-xl text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-theme-primary" />
            </div>
          ) : !filtered.length ? (
            <p className="text-sm text-slate-400 text-center py-12">No customers found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Mobile</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">City</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Status</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-bold text-slate-500">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <UserCircle className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="font-semibold text-slate-800">{c.name || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {c.mobile ? (
                        <a href={`tel:${c.mobile}`} className="hover:text-theme-primary hover:underline flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />{c.mobile}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="hover:text-theme-primary hover:underline flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />{c.email}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {c.city ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />{c.city}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {c.status && (
                        <Badge variant="outline" className="text-xs border-slate-200 text-slate-500 capitalize">
                          {c.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{c.source || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
