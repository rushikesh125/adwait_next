"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import Loading from "@/app/loading";
import Page403 from "@/components/Page403";

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

  return children;
}