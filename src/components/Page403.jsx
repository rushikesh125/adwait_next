"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);

  const handleBack = () => {
    if (user?.role === "admin") {
      router.push("/admin-panel");
    } else if (user?.role === "agent") {
      router.push("/agent-panel");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFE] relative overflow-hidden p-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-100/30 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Animated Icon Header */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
          <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full shadow-xl border border-red-50">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <div className="absolute -right-2 -bottom-2 bg-theme-dark p-2 rounded-lg shadow-lg">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-theme-dark tracking-tighter uppercase italic">
            Access <span className="text-red-500">Denied</span>
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Oops! It looks like you don't have the necessary permissions to view this page. This area is restricted to <span className="text-theme-primary font-bold uppercase underline underline-offset-4">Authorized Personnel</span> only.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => router.push("/login")}
            className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50 h-12 px-8 font-semibold transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Login
          </Button>

          <Button 
            onClick={handleBack}
            className="w-full sm:w-auto bg-theme-dark hover:bg-theme-dark/90 h-12 px-8 font-bold shadow-lg shadow-theme-dark/20 transition-all active:scale-95"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          Error Code: 403 • Restricted Area
        </p>
      </div>
    </div>
  );
}