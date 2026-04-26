"use client";

import React, { useMemo, useState } from "react";
import { XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  QUOTATION_REJECTION_REASONS,
  buildRejectionDetails,
  getQuotationReference,
} from "@/lib/quotationRejection";

const NO_REASON_VALUE = "__no_reason__";

export default function QuotationRejectionDialog({
  open,
  quotation,
  isSubmitting = false,
  onOpenChange,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const reference = useMemo(() => getQuotationReference(quotation), [quotation]);

  const resetForm = () => {
    setReason("");
    setComment("");
    setError("");
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetForm();
    onOpenChange?.(nextOpen);
  };

  const handleSubmit = async () => {
    const cleanReason = reason.trim();
    const cleanComment = comment.trim();

    if (!cleanReason && !cleanComment) {
      setError("Select a reason or enter a comment.");
      return;
    }

    setError("");
    await onConfirm?.({
      reason: cleanReason,
      comment: cleanComment,
      details: buildRejectionDetails({
        reason: cleanReason,
        comment: cleanComment,
      }),
    });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <XCircle className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Reject Quotation</DialogTitle>
              <DialogDescription>{reference}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Reason</Label>
            <Select
              value={reason || undefined}
              onValueChange={(value) =>
                setReason(value === NO_REASON_VALUE ? "" : value)
              }
            >
              <SelectTrigger id="rejection-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_REASON_VALUE}>No preset reason</SelectItem>
                {QUOTATION_REJECTION_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejection-comment">Comment</Label>
            <Textarea
              id="rejection-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Add a rejection comment..."
              className="min-h-24 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Rejecting..." : "Reject Quotation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
