"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import RequireAuth from "@/components/RequireAuth";

// Icons
import { 
  LayoutDashboard, ShieldCheck, UserCog, Database, 
  BarChart3, Settings, LogOut, Menu, X, Bell, Lock, Globe, 
  TruckElectric,
  ActivityIcon,
  HardDriveUpload,
  BookPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import UserDropdown from "@/components/UserDropdown";

const adminNav = [
  { name: "Overview", href: "/admin-panel", icon: LayoutDashboard },
  { name: "Accommodations", href: "/admin-panel/accommodations", icon: ShieldCheck },
  { name: "Transports", href: "/admin-panel/transports", icon: TruckElectric },
  { name: "Tour activities", href: "/admin-panel/activities", icon: ActivityIcon },
  { name: "Itinerary", href: "/admin-panel/itinerary", icon: BookPlus },
  // { name: "Settings", href: "/admin-panel/settings", icon: Settings },
];

const SidebarContent = ({ mobile = false, isSidebarOpen, pathname, router, onCloseMobile, onLogout }) => (
  <div className="flex flex-col h-full bg-[#0F172A] text-slate-300">
    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="min-w-[36px] h-9 bg-linear-to-tr from-theme-primary to-theme-secondary rounded-lg flex items-center justify-center">
          <Lock className="text-white w-4 h-4" />
        </div>
        {(isSidebarOpen || mobile) && (
          <span className="font-bold text-lg text-white uppercase italic">
            Adwait <span className="text-theme-primary">Admin</span>
          </span>
        )}
      </div>
      {mobile && (
        <Button variant="ghost" size="icon" onClick={onCloseMobile} className="text-slate-400 lg:hidden">
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>

    <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
      {adminNav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <button
            key={item.name}
            onClick={() => router.push(item.href)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group
              ${isActive ? "bg-theme-primary text-white shadow-lg" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "group-hover:text-theme-primary"}`} />
            {(isSidebarOpen || mobile) && <span className="text-sm font-semibold">{item.name}</span>}
          </button>
        );
      })}
    </nav>

    <div className="p-4 border-t border-slate-800">
      <button onClick={onLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all">
        <LogOut className="w-5 h-5" />
        {(isSidebarOpen || mobile) && <span className="text-sm">Exit System</span>}
      </button>
    </div>
  </div>
);

const AdminPanelLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Admin signed out");
      router.replace("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <RequireAuth allowedRoles={["admin"]}>
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden">

      {/* MOBILE DRAWER */}
      <div className={`fixed inset-0 z-100 lg:hidden transition-opacity duration-300 ${isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-72 transition-transform duration-300 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <SidebarContent mobile={true} isSidebarOpen={isSidebarOpen} pathname={pathname} router={router} onCloseMobile={() => setIsMobileOpen(false)} onLogout={handleLogout} />
        </div>
      </div>

      {/* DESKTOP SIDEBAR - Fixed position */}
      <aside className={`hidden lg:flex flex-col border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"} h-screen flex-shrink-0`}>
        <SidebarContent mobile={false} isSidebarOpen={isSidebarOpen} pathname={pathname} router={router} onCloseMobile={() => setIsMobileOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* MAIN CONTENT - Scrollable area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between flex-shrink-0 z-40">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex text-slate-600" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <UserDropdown user={user}/>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto ">
          <div className="mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
    </RequireAuth>
  );
};

export default AdminPanelLayout;
