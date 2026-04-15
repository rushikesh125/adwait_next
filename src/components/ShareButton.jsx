"use client";
/**
 * ShareButton.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in share button for the QuotationsTable row and QuotationPreviewModal.
 *
 * Renders a single icon button. On click, opens ShareQuotationDialog.
 *
 * Props:
 *   quotation     – quotation object
 *   agentId       – string
 *   onTokenSaved  – (fields) => void  to update parent/table state
 *   size          – "sm" | "md" (default "sm")
 *   variant       – "icon" | "button" (default "icon")
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import ShareQuotationDialog from "./ShareQuotationDialog";
import { isShareActive } from "@/firebase/quotationShare";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function ShareButton({
  quotation,
  agentId,
  onTokenSaved,
  variant = "icon",
  size = "sm",
}) {
  const [open, setOpen] = useState(false);
  const active = isShareActive(quotation);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className={`h-8 w-8 relative ${
                active
                  ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                  : "text-slate-400 hover:text-theme-primary"
              }`}
              title="Share itinerary"
            >
              <Share2 className="h-4 w-4" />
              {/* Green dot indicator when link is active */}
              {active && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size={size}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className={`gap-1.5 text-xs relative ${
                active
                  ? "border-amber-300 text-amber-600 hover:bg-amber-50"
                  : "border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
              }`}
            >
              <Share2 className="h-3.5 w-3.5" />
              {active ? "Shared" : "Share"}
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          {active ? "Share link active · click to manage" : "Share itinerary preview"}
        </TooltipContent>
      </Tooltip>

      <ShareQuotationDialog
        open={open}
        onClose={() => setOpen(false)}
        quotation={quotation}
        agentId={agentId}
        onTokenSaved={(fields) => {
          onTokenSaved?.(quotation.id, fields);
          // Merge fields into local quotation reference for immediate UI update
        }}
      />
    </>
  );
}
export default ShareButton;