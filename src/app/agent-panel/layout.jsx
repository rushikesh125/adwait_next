"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import Loading from "../loading";
import Page403 from "@/components/Page403";

// Icons
import {
  LayoutDashboard,
  Map,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import UserDropdown from "@/components/UserDropdown";

const AgentPanelLayout = ({ children }) => {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Mobile specific state
  const router = useRouter();
  const pathname = usePathname();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (loading) return <Loading />;
  if (initialized && (!user || user.role !== "agent")) {
    return <Page403 />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/agent-panel", icon: LayoutDashboard },
    { name: "My Qutations", href: "/agent-panel/my-quatation", icon: Map },
    { name: "Customers", href: "/agent-dashboard/customers", icon: Users },
    { name: "Bookings", href: "/agent-dashboard/bookings", icon: Briefcase },
    { name: "Settings", href: "/agent-dashboard/settings", icon: Settings },
  ];

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="min-w-[36px] h-9 bg-gradient-to-tr from-theme-gradient-from to-theme-gradient-to rounded-xl flex items-center justify-center shadow-lg">
            <Map className="text-white w-5 h-5" />
          </div>
          {(isSidebarOpen || mobile) && (
            <span className="font-black text-lg tracking-tighter text-theme-dark uppercase italic">
              Adwait <span className="text-theme-primary">Tours</span>
            </span>
          )}
        </div>
        {mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group
                ${
                  isActive
                    ? "bg-theme-muted/50 text-theme-primary font-bold"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
            >
              <item.icon
                className={`w-5 h-5 ${
                  isActive
                    ? "text-theme-primary"
                    : "group-hover:text-theme-primary"
                }`}
              />
              {(isSidebarOpen || mobile) && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl font-semibold transition-all"
        >
          <LogOut className="w-5 h-5" />
          {(isSidebarOpen || mobile) && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFE] flex overflow-hidden">
      {/* --- MOBILE SIDEBAR (Overlay) --- */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent mobile={true} />
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={`hidden lg:block border-r shadow-md border-slate-200 transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-20"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* --- MAIN SECTION --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Mobile Menu Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </Button>
            {/* Desktop Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-slate-500"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>

            <h1 className="lg:hidden font-bold text-theme-dark text-sm truncate uppercase tracking-widest">
              {navItems.find((i) => i.href === pathname)?.name || "Agent Panel"}
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-slate-500"
            >
              <Bell className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2 lg:gap-3 pl-2 border-l border-slate-100">
              {/* <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-theme-dark leading-none">{user?.name}</p>
                <p className="text-[9px] text-theme-primary font-black uppercase mt-1">Agent</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user?.name?.charAt(0) || "A"}
              </div> */}
              <UserDropdown user={user} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        {/* <main className="flex-1 overflow-hidden relative p-2 md:p-4 lg:p-6 bg-slate-100">
          <div className="mx-auto overflow-y-scroll">
            {children}
          </div>
        </main> */}
        <main className="flex-1 relative bg-slate-100 overflow-x-hidden">
          <div className="h-full  pr-1 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentPanelLayout;
