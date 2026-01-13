"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  UserCircle2, 
  LogIn, 
  UserPlus, 
  ArrowRight,
  Fingerprint
} from "lucide-react";

const NotLoggedIn = () => {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4">
      {/* Decorative Blur Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-theme-muted/20 rounded-full blur-[100px] -z-10" />

      <div className="max-w-md w-full bg-white/70 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 text-center space-y-8">
        
        {/* Animated Visual Header */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-theme-muted rounded-3xl rotate-6 animate-pulse" />
          <div className="relative flex items-center justify-center w-full h-full bg-white rounded-3xl shadow-sm border border-slate-100 -rotate-3 transition-transform hover:rotate-0 duration-500">
            <Fingerprint className="w-12 h-12 text-theme-primary" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-theme-secondary rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-theme-dark tracking-tighter uppercase italic">
            Identification <span className="text-theme-primary">Required</span>
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            You need to be logged in to access the <span className="text-theme-dark font-bold">Adwait Tours</span> dashboard. Please sign in to verify your identity.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button 
            onClick={() => router.push("/login")}
            className="w-full h-14 bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to hover:shadow-xl transition-all font-bold text-lg rounded-2xl group"
          >
            <LogIn className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            Login Now
          </Button>

          <Button 
            variant="ghost"
            onClick={() => router.push("/signup")}
            className="w-full h-12 text-slate-500 hover:text-theme-primary hover:bg-theme-muted/30 font-semibold rounded-2xl"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create new account
          </Button>
        </div>

        {/* Footer Link */}
        <div className="pt-6 border-t border-slate-50">
          <button 
            onClick={() => router.push("/")}
            className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-theme-dark transition-colors"
          >
            <ArrowRight className="mr-2 h-3 w-3 rotate-180" />
            Back to Public Site
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotLoggedIn;