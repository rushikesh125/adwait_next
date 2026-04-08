"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import Loading from "@/app/loading";
import UserProfilePanel from "@/components/UserProfilePanel";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, initialized } = useSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [initialized, loading, router, user]);

  if (loading || (initialized && !user)) {
    return <Loading />;
  }

  return <UserProfilePanel user={user} />;
}
