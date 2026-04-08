"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageLengthsForPagination } from "@/lib/pagination_size";

export default function CustomersPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onPrev,
  onNext,
  setPageSize,
}) {
  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (totalCount === 0) return null;
  const getPageNumbers = () => {
    const pages = [];
    const delta = 1; // how many pages around current

    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) pages.push(1);
    if (left > 2) pages.push("...");

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) pages.push("...");
    if (right < totalPages) pages.push(totalPages);

    return pages;
  };
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-theme-primary" />
        ) : (
          <span>
            Showing{" "}
            <span className="font-semibold text-slate-700">
              {startRecord}–{endRecord}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
            customers
          </span>
        )}
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">
        {/* DROPDOWN */}
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="h-8 border rounded-lg px-2 text-xs"
        >
          {pageLengthsForPagination.map((num) => (
            <option key={num} value={num}>
              {num} / page
            </option>
          ))}
        </select>

        {/* PREV */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!canGoPrev || loading}
          className="h-8 flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        {/* PAGE INFO */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={i} className="px-2 text-slate-400 text-xs">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => {
                  if (p === currentPage) return;
                  if (p > currentPage) {
                    for (let i = currentPage; i < p; i++) onNext();
                  } else {
                    for (let i = currentPage; i > p; i--) onPrev();
                  }
                }}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                  p === currentPage
                    ? "bg-theme-primary text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* NEXT */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext || loading}
          className="h-8 flex items-center gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
