"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import Loading from "../loading";
import Page403 from "@/components/Page403";

// Icons
import { 
  LayoutDashboard, ShieldCheck, UserCog, Database, 
  BarChart3, Settings, LogOut, Menu, X, Bell, Lock, Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import UserDropdown from "@/components/UserDropdown";

const AdminPanelLayout = ({ children }) => {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (loading) return <Loading />;
  
  // Guard Logic
  if (initialized && (!user || user.role !== "admin")) {
    return <Page403 />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Admin signed out");
      router.push("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const adminNav = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Agent Approvals", href: "/admin/approvals", icon: ShieldCheck },
    { name: "Manage Users", href: "/admin/users", icon: UserCog },
    { name: "Tour Database", href: "/admin/data-entry", icon: Database },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  // --- FIXED: Added ({ mobile = false }) to the argument list ---
  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-300">
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="min-w-[36px] h-9 bg-gradient-to-tr from-theme-primary to-theme-secondary rounded-lg flex items-center justify-center">
            <Lock className="text-white w-4 h-4" />
          </div>
          {(isSidebarOpen || mobile) && (
            <span className="font-bold text-lg text-white uppercase italic">
              Adwait <span className="text-theme-primary">Admin</span>
            </span>
          )}
        </div>
        {mobile && (
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="text-slate-400 lg:hidden">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
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
        <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all">
          <LogOut className="w-5 h-5" />
          {(isSidebarOpen || mobile) && <span className="text-sm">Exit System</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden">
      
      {/* MOBILE DRAWER */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-72 transition-transform duration-300 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <SidebarContent mobile={true} />
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden lg:block border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <SidebarContent mobile={false} />
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex text-slate-600" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-900">{user?.name || "Admin"}</p>
                <p className="text-[9px] text-theme-secondary font-bold uppercase mt-1 tracking-widest text-right">System Controller</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                {user?.name?.charAt(0) || "S"}
              </div>
            </div> */}
            <UserDropdown user={user}/>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6">
          <div className=" mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanelLayout;