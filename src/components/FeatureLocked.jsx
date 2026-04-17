"use client";

import { ShieldOff, Lock } from "lucide-react";

export default function FeatureLocked({
  featureName = "This feature",
  description = "Contact your admin to get access.",
  compact = false,
}) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium cursor-not-allowed select-none border border-slate-200">
        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{featureName} — Access restricted</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[340px] px-6 py-12 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <ShieldOff className="w-7 h-7 text-slate-400" />
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold text-slate-700 mb-2">
        {featureName} is not enabled
      </h2>
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {/* Contact hint */}
      <p className="mt-5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
        Ask your <span className="font-semibold text-slate-600">admin</span> to
        enable this feature from the Agent Permissions panel.
      </p>
    </div>
  );
}