"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CustomersPagination
 *
 * Props:
 *  currentPage   {number}   1-based current page
 *  totalPages    {number}
 *  totalCount    {number}   total records in collection
 *  pageSize      {number}
 *  hasMore       {boolean}  whether Firestore returned a next cursor
 *  loading       {boolean}
 *  onFirst       {Function}
 *  onPrev        {Function}
 *  onNext        {Function}
 *  onLast        {Function} — only available when totalPages is known
 *  isSearchMode  {boolean}  true when a search term is active (client-side pagination)
 */
export default function CustomersPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  hasMore,
  loading,
  onFirst,
  onPrev,
  onNext,
  onLast,
  isSearchMode,
}) {
  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const canGoPrev = currentPage > 1;
  const canGoNext = isSearchMode ? currentPage < totalPages : hasMore;

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
      {/* Record count */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-theme-primary" />
        ) : (
          <>
            <span>
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {startRecord}–{endRecord}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
              {isSearchMode ? "matching" : ""} customers
            </span>
            {isSearchMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
                Search mode — all records loaded
              </span>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-500 hover:text-theme-primary hover:bg-theme-muted disabled:opacity-30"
          onClick={onFirst}
          disabled={!canGoPrev || loading}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Prev */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-500 hover:text-theme-primary hover:bg-theme-muted disabled:opacity-30"
          onClick={onPrev}
          disabled={!canGoPrev || loading}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page indicator */}
        <div className="flex items-center gap-1 px-3">
         
            <span className="text-sm font-semibold text-slate-700 px-2">
              Page {currentPage}
            </span>
        
        </div>

        {/* Next */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-500 hover:text-theme-primary hover:bg-theme-muted disabled:opacity-30"
          onClick={onNext}
          disabled={!canGoNext || loading}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page — only when total is known */}
        {(isSearchMode || totalPages) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-theme-primary hover:bg-theme-muted disabled:opacity-30"
            onClick={onLast}
            disabled={!canGoNext || loading}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function renderPageNumbers(currentPage, totalPages, onFirst, onPrev, onNext) {
  if (!totalPages) {
    return (
      <span className="text-sm font-semibold text-slate-700 px-2">
        Page {currentPage}
      </span>
    );
  }

  const delta = 1; // pages on each side of current
  const pages = [];

  const left = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  return pages.map((p, i) =>
    p === "..." ? (
      <span key={`ellipsis-${i}`} className="text-slate-400 text-sm px-1">
        …
      </span>
    ) : (
      <button
        key={p}
        onClick={() => {
          const diff = p - currentPage;
          if (diff === 0) return;
          if (p === 1) onFirst();
          else if (diff > 0) {
            // Only +1 navigation is supported for cursor-based; for search it jumps
            Array.from({ length: diff }).forEach(() => onNext());
          } else {
            Array.from({ length: -diff }).forEach(() => onPrev());
          }
        }}
        className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
          p === currentPage
            ? "bg-theme-primary text-white shadow-sm"
            : "text-slate-600 hover:text-theme-primary hover:bg-theme-muted"
        }`}
      >
        {p}
      </button>
    )
  );
}