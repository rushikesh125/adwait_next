"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import Loading from "../loading";
import Page403 from "@/components/Page403";

import Vouchers from "@/app/agent-panel/vouchers/page.jsx";
import {
  LayoutDashboard,
  Map,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  Briefcase,
  Component,
  Tickets,
  BookAIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase/config";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import UserDropdown from "@/components/UserDropdown";

const AgentPanelLayout = ({ children }) => {
  const { user, loading, initialized } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
    { name: "Customers", href: "/agent-panel/customers", icon: Users },
    { name: "Leads", href: "/agent-panel/leads", icon: Briefcase },
    { name: "Booking Form", href: "/agent-panel/bookingform", icon: Component },
    { name: "Vouchers", href: "/agent-panel/vouchers", icon: Tickets },
    { name: "Itinerary", href: "/agent-panel/itinerary", icon: BookAIcon},
  ];

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white">
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50 flex-shrink-0">
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

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group
                ${isActive ? "bg-theme-muted/50 text-theme-primary font-bold" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? "text-theme-primary" : "group-hover:text-theme-primary"}`}
              />
              {(isSidebarOpen || mobile) && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-50 flex-shrink-0">
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
    /* 1. Added h-screen and overflow-hidden to the outer wrapper */
    <div className="h-screen bg-[#FDFCFE] flex overflow-hidden">
      {/* MOBILE SIDEBAR */}
      <div
        className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 bg-white shadow-2xl transition-transform duration-300 transform ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <SidebarContent mobile={true} />
        </div>
      </div>

      {/* 2. Added h-screen and flex-shrink-0 to DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col border-r shadow-md border-slate-200 transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-20"} h-screen flex-shrink-0`}
      >
        <SidebarContent />
      </aside>

      {/* 3. MAIN SECTION - Added h-screen and overflow-hidden */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER - flex-shrink-0 keeps it from squishing */}
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between flex-shrink-0 z-40">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-slate-500"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <UserDropdown user={user} />
          </div>
        </header>

        {/* 4. CONTENT AREA - flex-1 and overflow-y-auto enables internal scrolling */}
        <main className="flex-1 overflow-y-auto bg-slate-100">
          <div className="mx-auto animate-in fade-in slide-in-from-bottom-3 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentPanelLayout;
