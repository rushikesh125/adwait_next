"use client";

import React from "react";

import { Badge } from "@/components/ui/badge";
import { getStatusClasses, getStatusLabel } from "@/lib/status";

export default function StatusBadge({
  status,
  className = "",
  fallback = "Unknown",
  variant = "outline",
}) {
  return (
    <Badge
      variant={variant}
      className={`${getStatusClasses(status)} border ${className}`.trim()}
    >
      {getStatusLabel(status, fallback)}
    </Badge>
  );
}
