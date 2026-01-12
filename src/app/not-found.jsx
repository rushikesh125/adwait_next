"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoveLeft, Map, Search, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFE] relative overflow-hidden p-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-theme-muted/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-theme-secondary/10 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-10">
        {/* Large 404 Visual */}
        <div className="relative">
          <h1 className="text-[150px] sm:text-[200px] font-black leading-none tracking-tighter text-slate-100 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 rotate-6 hover:rotate-0 transition-transform duration-500">
              <Map className="w-16 h-16 text-theme-primary animate-bounce" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4 max-w-md mx-auto">
          <h2 className="text-3xl font-extrabold text-theme-dark tracking-tight italic uppercase">
            Lost in <span className="text-theme-primary">Translation?</span>
          </h2>
          <p className="text-slate-500 font-medium">
            The page you are looking for has traveled elsewhere or never existed in our itinerary. Let's get you back on track!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="w-full sm:w-auto border-slate-200 h-12 px-8 font-semibold hover:bg-white hover:border-theme-primary transition-all group"
          >
            <MoveLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>

          <Button 
            onClick={() => router.push("/")}
            className="w-full sm:w-auto bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to h-12 px-8 font-bold shadow-lg shadow-theme-primary/25 transition-all active:scale-95"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Search Suggestion (Optional UI element) */}
        <div className="pt-8 flex items-center justify-center gap-2 text-slate-400">
          <Search className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Adwait Tours Support System
          </span>
        </div>
      </div>

      {/* Floating Elements for "Adventure" feel */}
      <div className="hidden lg:block absolute top-1/4 left-1/4 animate-bounce delay-75">
        <div className="w-2 h-2 rounded-full bg-theme-accent" />
      </div>
      <div className="hidden lg:block absolute bottom-1/3 right-1/4 animate-bounce delay-500">
        <div className="w-3 h-3 rounded-full bg-theme-secondary opacity-50" />
      </div>
    </div>
  );
}