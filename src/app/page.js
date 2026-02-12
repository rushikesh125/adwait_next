"use client";

import { useSelector } from "react-redux";
import Loading from "./loading";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import NotLoggedIn from "@/components/NotLoggedIn";

export default function Home() {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === "admin") {
      router.push("/admin-panel");
    } else if (user && user.role === "agent") {
      router.push("/agent-panel");
    }else if(user && user.role === "superadmin"){
      router.push("/superadmin")
    }
  }, [user]);
  if (loading) {
    return <Loading />;
  }
  if (!initialized && !user) {
    return <NotLoggedIn/>
  }
  return <h1>Hi</h1>;
}
