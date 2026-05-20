"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Building2 } from "lucide-react";

import Loading from "@/app/loading";
import Page403 from "@/components/Page403";
import { Button } from "./ui/button";
import Link from "next/link";

const ORG_REQUIRED_ROLES = new Set(["admin", "agent"]);

function OrgAssignmentRequired({ role }) {
  const roleLabel = role === "admin" ? "admin" : "agent";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-required-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Building2 className="h-6 w-6" />
        </div>

        <h1
          id="org-required-title"
          className="mt-4 text-xl font-bold tracking-tight text-slate-900"
        >
          Organization not assigned
        </h1>
        <Link href="/login">
  <Button
    className="
      mt-5 w-full rounded-xl
      bg-gradient-to-r from-slate-900 to-slate-700
      text-white shadow-lg
      hover:scale-[1.02] hover:from-slate-800 hover:to-slate-600
      transition-all duration-200
    "
  >
    Go to Login
  </Button>
</Link>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your {roleLabel} account is not assigned to any organization yet.
          Please contact the super admin to assign your organization before
          using the dashboard.
        </p>
      </div>
    </div>
  );
}

export default function RequireAuth({ children, allowedRoles = [] }) {
  const router = useRouter();
  const { user, loading, initialized } = useSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [initialized, loading, router, user]);

  if (loading || !initialized) {
    return <Loading />;
  }

  if (!user) {
    return <Loading />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Page403 />;
  }

  if (ORG_REQUIRED_ROLES.has(user.role) && !user.orgId) {
    return <OrgAssignmentRequired role={user.role} />;
  }

  return children;
}
