"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Loader2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { auth } from "@/firebase/config";

export function ImageSearchPanel({
  open,
  onClose,
  context,
  onSelect,
}) {
 const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [nextStart, setNextStart] = useState(null);
  const [searching, setSearching] = useState(false);

  const isPoster = context?.type === "poster";
  const maxSelect = isPoster ? 1 : 2;

  // Auto-build smart query
  // Auto-build better smart query
  useEffect(() => {
    if (!open || !context) return;

    let smartQuery = "";

    if (isPoster) {
      smartQuery = `beautiful ${context.tripTitle || "India"} travel itinerary poster landscape high resolution`;
    } else {
      const dayInfo = context.dayTitle 
        ? `${context.dayTitle}` 
        : `Day ${context.dayIdx + 1}`;
      
      smartQuery = `${dayInfo} ${context.dayDescription?.slice(0, 80) || ""} 
                   ${context.cities?.join(" ") || ""} India tourism photography`;
    }

    setQuery(smartQuery.trim().replace(/\s+/g, " "));
    setSelected([]);
    setResults([]);
    setNextStart(null);

    // Auto search
    setTimeout(() => {
      if (smartQuery) handleSearch(smartQuery);
    }, 300);
  }, [open, context]);

  const handleSearch = async (searchQuery = query, start = 1) => {
    if (!searchQuery?.trim()) return;

    setSearching(true);
    setLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("Please sign in again");
        return;
      }

      const res = await fetch(
        `/api/search-images?q=${encodeURIComponent(searchQuery)}&start=${start}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("Search API Error:", errData);
        throw new Error(errData.error || `Error ${res.status}`);
      }

      const data = await res.json();

      if (start === 1) {
        setResults(data.results || []);
      } else {
        setResults((prev) => [...prev, ...(data.results || [])]);
      }
      setNextStart(data.nextStart);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to search images");
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const toggleSelect = (url) => {
    if (selected.includes(url)) {
      setSelected(selected.filter((u) => u !== url));
    } else if (selected.length < maxSelect) {
      setSelected([...selected, url]);
    } else {
      toast.error(`You can select maximum ${maxSelect} image${maxSelect > 1 ? 's' : ''}`);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one image");
      return;
    }
    onSelect(selected);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-[70] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {isPoster ? "Select Cover Image" : "Select Day Images"}
            </h3>
            <p className="text-xs text-slate-500">
              {isPoster ? "1 image" : "Up to 2 images"} • Google Image Search
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for images..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={() => handleSearch()} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
              <p className="text-slate-500">Searching high-quality images...</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {results.map((img, idx) => {
              const isSelected = selected.includes(img.url);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(img.url)}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-blue-600 ring-2 ring-blue-500" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  <img
                    src={img.thumbnail || img.url}
                    alt={img.title}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
                      <div className="bg-white rounded-full p-1.5 shadow">
                        <Check className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                    <p className="text-[10px] text-white line-clamp-2">{img.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {results.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-400">
              No results yet. Try searching above.
            </div>
          )}

          {nextStart && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => handleSearch(query, nextStart)}
                disabled={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="flex-1"
          >
            Add Selected ({selected.length}/{maxSelect})
          </Button>
        </div>
      </div>
    </>
  );
}