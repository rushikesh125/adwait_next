"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FDFCFE]">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-theme-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-theme-secondary/10 rounded-full blur-[80px]" />

      <div className="relative flex flex-col items-center">
        {/* Modern Layered Spinner */}
        <div className="relative w-20 h-20 mb-8">
          {/* Outer Ring */}
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
          
          {/* Animated Gradient Ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-theme-primary border-r-theme-secondary rounded-full animate-spin shadow-lg shadow-theme-primary/20" />
          
          {/* Center Pulsing Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-gradient-to-tr from-theme-gradient-from to-theme-gradient-to rounded-lg flex items-center justify-center shadow-md animate-bounce">
              <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black tracking-tighter text-theme-dark uppercase italic">
            Adwait <span className="text-theme-primary">Tours</span>
          </h2>
          
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-theme-primary animate-[bounce_1s_infinite_0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-secondary animate-[bounce_1s_infinite_200ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-[bounce_1s_infinite_400ms]" />
            </div>
            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase ml-2">
              Loading Experience
            </p>
          </div>
        </div>
      </div>

      {/* Glassmorphism Bottom Card (Optional Badge) */}
      <div className="absolute bottom-10 px-6 py-2 bg-white/40 backdrop-blur-md border border-white/20 rounded-full shadow-sm">
        <p className="text-[10px] text-slate-500 font-medium">
          Secured by Firebase & Redux
        </p>
      </div>
    </div>
  );
}