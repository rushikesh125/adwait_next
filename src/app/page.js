"use client";

import { useSelector } from "react-redux";
import Loading from "./loading";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Home() {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!initialized || loading) return;

    if (user?.role === "superadmin") {
      router.replace("/superadmin");
    } else if (user?.role === "admin" && user.approved === "accepted") {
      router.replace("/admin-panel");
    } else if (user?.role === "agent" && user.approved === "accepted") {
      router.replace("/agent-panel");
    } else if (user?.approved === "pending") {
      toast.error("Your account is pending admin approval.");
      router.replace("/login");
    } else if (!user) {
      router.replace("/login");
    }
  }, [user, initialized, loading]);

  return <Loading />;
}
