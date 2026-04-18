"use client";

import { useSelector } from "react-redux";

import RequireAuth from "@/components/RequireAuth";
import UserProfilePanel from "@/components/UserProfilePanel";

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);

  return (
    <RequireAuth>
      <UserProfilePanel user={user} />
    </RequireAuth>
  );
}
