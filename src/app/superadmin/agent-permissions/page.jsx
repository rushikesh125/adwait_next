"use client";

import RequireAuth from "@/components/RequireAuth";
import AgentPermissionsManager from "@/components/AgentPermissionsManager";
import SuperadminLeftMenu from "@/components/SuperadminLeftMenu";

export default function SuperAdminAgentPermissionsPage() {
  return (
    <RequireAuth allowedRoles={["superadmin"]}>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
            <SuperadminLeftMenu />
            <AgentPermissionsManager
              backHref="/superadmin"
              backLabel="Back to Super Admin"
              embedded
            />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
