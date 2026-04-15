"use client";
/**
 * ShareQuotationDialog.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal dialog for agents to generate, configure, and share a public preview
 * link for a quotation.
 *
 * Props:
 *   open          – boolean
 *   onClose       – () => void
 *   quotation     – quotation object from Firestore
 *   agentId       – string
 *   onTokenSaved  – (updatedFields) => void  (to refresh parent state)
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Link2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  Share2,
  Eye,
  EyeOff,
  Clock,
  MessageCircle,
  Loader2,
  ShieldOff,
} from "lucide-react";
import {
  createShareToken,
  updateSharePricing,
  revokeShareToken,
  buildPreviewUrl,
  isShareActive,
} from "@/firebase/quotationShare";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatExpiry(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysLeft(ms) {
  if (!ms) return 0;
  return Math.max(0, Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24)));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShareQuotationDialog({
  open,
  onClose,
  quotation,
  agentId,
  onTokenSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPricing, setShowPricing] = useState(
    quotation?.showPricing ?? false
  );
  const [localToken, setLocalToken] = useState(quotation?.shareToken || null);
  const [localExpiry, setLocalExpiry] = useState(
    quotation?.shareExpiresAt || null
  );

  // Sync if quotation prop changes (e.g. after parent refreshes)
  useEffect(() => {
    setLocalToken(quotation?.shareToken || null);
    setLocalExpiry(quotation?.shareExpiresAt || null);
    setShowPricing(quotation?.showPricing ?? false);
  }, [quotation?.shareToken, quotation?.shareExpiresAt, quotation?.showPricing]);

  const hasActiveLink =
    localToken &&
    localExpiry &&
    Date.now() < localExpiry &&
    quotation?.status !== "Rejected";

  const previewUrl = localToken ? buildPreviewUrl(localToken) : "";

  // ── Generate / Refresh token ──────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!agentId || !quotation?.id) return;
    setLoading(true);
    try {
      const result = await createShareToken(
        agentId,
        quotation.id,
        showPricing
      );
      setLocalToken(result.token);
      setLocalExpiry(result.expiresAt);
      onTokenSaved?.({
        shareToken: result.token,
        shareExpiresAt: result.expiresAt,
        showPricing,
      });
      toast.success("Share link created!");
    } catch (err) {
      toast.error("Failed to create link: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle pricing visibility ─────────────────────────────────────────────
  const handlePricingToggle = async (val) => {
    setShowPricing(val);
    if (hasActiveLink && agentId && quotation?.id) {
      try {
        await updateSharePricing(agentId, quotation.id, val);
        onTokenSaved?.({ showPricing: val });
        toast.success(val ? "Pricing now visible" : "Pricing hidden");
      } catch {
        toast.error("Failed to update pricing visibility");
      }
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success("Link copied!");
    } catch {
      toast.error("Copy failed — please copy manually");
    }
  };

  // ── Share on WhatsApp ─────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!previewUrl) return;
    const name = quotation?.customerName || quotation?.leadName || "there";
    const pkg = quotation?.packageName || "your travel package";
    const msg = [
      `Hi ${name} 👋`,
      ``,
      `Here's your personalised travel itinerary for *${pkg}*:`,
      ``,
      `🔗 ${previewUrl}`,
      ``,
      `Feel free to review the day-by-day plan and reach out with any questions. We're happy to customise it further!`,
      ``,
      `Warm regards,`,
      `*Adwait Tours* 🌏`,
    ].join("\n");

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ── Revoke ────────────────────────────────────────────────────────────────
  const handleRevoke = async () => {
    if (!agentId || !quotation?.id) return;
    if (!window.confirm("Revoke this share link? The customer won't be able to view the itinerary.")) return;
    setRevoking(true);
    try {
      await revokeShareToken(agentId, quotation.id);
      setLocalToken(null);
      setLocalExpiry(null);
      onTokenSaved?.({ shareToken: null, shareExpiresAt: null });
      toast.success("Share link revoked");
    } catch (err) {
      toast.error("Failed to revoke: " + err.message);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-theme-primary" />
            Share Itinerary Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Quotation context */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Quotation for</p>
            <p className="font-semibold text-slate-800 text-sm">
              {quotation?.customerName || quotation?.leadName || "—"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {quotation?.packageName || "Unnamed Package"}
            </p>
          </div>

          {/* Pricing toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2.5">
              {showPricing ? (
                <Eye className="h-4 w-4 text-theme-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-slate-400" />
              )}
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Show pricing to customer
                </p>
                <p className="text-[11px] text-slate-400">
                  {showPricing
                    ? "Grand total will be visible on the preview page"
                    : "Pricing is hidden — only itinerary is shown"}
                </p>
              </div>
            </div>
            <Switch
              checked={showPricing}
              onCheckedChange={handlePricingToggle}
              className="data-[state=checked]:bg-theme-primary"
            />
          </div>

          {/* Link display */}
          {hasActiveLink ? (
            <div className="space-y-3">
              {/* URL box */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-0">
                  <Link2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 truncate font-mono">
                    {previewUrl}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="h-9 w-9 p-0 flex-shrink-0"
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewUrl, "_blank")}
                  className="h-9 w-9 p-0 flex-shrink-0"
                  title="Open preview"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {/* Expiry badge */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Expires{" "}
                  <strong className="text-slate-700">
                    {formatExpiry(localExpiry)}
                  </strong>{" "}
                  ({daysLeft(localExpiry)} days left)
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs h-9"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  Send on WhatsApp
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="flex-1 text-xs h-9"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Copy Link
                </Button>
              </div>

              {/* Secondary actions */}
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-theme-primary transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Refresh link (resets expiry)
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {revoking ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ShieldOff className="h-3 w-3" />
                  )}
                  Revoke
                </button>
              </div>
            </div>
          ) : (
            /* No active link — show generate button */
            <div className="space-y-3">
              {localToken && !hasActiveLink && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  This share link has expired or been revoked. Generate a new one.
                </div>
              )}
              {quotation?.status === "Rejected" && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <ShieldOff className="h-3.5 w-3.5 flex-shrink-0" />
                  Share links are disabled for rejected quotations.
                </div>
              )}
              {quotation?.status !== "Rejected" && (
                <Button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-theme-primary hover:bg-theme-secondary text-sm h-10"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Generating…" : "Generate Share Link"}
                </Button>
              )}
              <p className="text-[11px] text-slate-400 text-center">
                Link will be valid for 60 days and auto-expires.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}