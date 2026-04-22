"use client";

import React, { useState, useRef } from "react";
import { Plus, X, Upload, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { auth } from "@/firebase/config";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// uploadToImgBB — shared upload helper
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadToImgBB(file, idToken) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Image upload failed");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Upload error");
  return json.data.display_url;
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageUploader — single image slot
// ─────────────────────────────────────────────────────────────────────────────
export function ImageUploader({
  value,
  onChange,
  label = "Image",
  aspectClass = "aspect-video",
  maxSizeMB = 5,
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxSizeMB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const url = await uploadToImgBB(file, idToken);
      onChange(url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-xs text-slate-500 font-medium">{label}</Label>
      )}
      {value ? (
        <div
          className={`relative group w-full ${aspectClass} rounded-lg overflow-hidden border border-slate-200 bg-slate-100`}
        >
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-md text-xs font-semibold shadow transition-all"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-semibold shadow transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`
            relative w-full ${aspectClass} rounded-lg border-2 border-dashed border-slate-300
            bg-slate-50 hover:bg-blue-50 hover:border-blue-400
            flex flex-col items-center justify-center gap-2
            cursor-pointer transition-all duration-150
            ${uploading ? "pointer-events-none opacity-70" : ""}
          `}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="text-xs text-slate-500">Uploading…</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-600">
                  Click or drag & drop
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG, WEBP · max {maxSizeMB} MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiImageUploader — up to `max` images side by side
// ─────────────────────────────────────────────────────────────────────────────
export function MultiImageUploader({ values = [], onChange, max = 2 }) {
  const canAdd = values.length < max;

  const handleAdd = (url) => onChange([...values, url]);
  const handleRemove = (idx) => onChange(values.filter((_, i) => i !== idx));
  const handleReplace = (idx, url) => {
    const updated = [...values];
    updated[idx] = url;
    onChange(updated);
  };

  return (
    <div className="flex gap-3 flex-wrap">
      {values.map((url, idx) => (
        <div key={idx} className="w-36 flex-shrink-0">
          <ImageUploader
            value={url}
            onChange={(newUrl) =>
              newUrl === null ? handleRemove(idx) : handleReplace(idx, newUrl)
            }
            label={`Image ${idx + 1}`}
            aspectClass="aspect-video"
          />
        </div>
      ))}
      {canAdd && (
        <div className="w-36 flex-shrink-0">
          <ImageUploader
            value={null}
            onChange={(url) => url && handleAdd(url)}
            label={values.length === 0 ? "Add Image" : `Add Image ${values.length + 1}`}
            aspectClass="aspect-video"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivitySelector
// ─────────────────────────────────────────────────────────────────────────────
export function ActivitySelector({
  dayIdx,
  activityIds,
  availableActivities,
  onToggle,
  state,
}) {
  const unselected = availableActivities.filter(
    (a) => !(activityIds || []).includes(a.id)
  );

  const handleChange = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    onToggle(dayIdx, selectedId);
    e.target.value = "";
  };

  return (
    <select
      onChange={handleChange}
      disabled={!state || unselected.length === 0}
      defaultValue=""
      className="w-full px-3 py-2 text-sm border rounded-md bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <option value="" disabled>
        {!state
          ? "Select a state first"
          : unselected.length === 0
          ? "All activities added"
          : "Select an activity to add..."}
      </option>
      {unselected.map((activity) => (
        <option key={activity.id} value={activity.id}>
          {activity.name}
        </option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistSection
// ─────────────────────────────────────────────────────────────────────────────
export function ChecklistSection({
  items,
  onToggle,
  onSelectAll,
  onAdd,
  onRemove,
  addLabel = "Add Item",
}) {
  const [newItem, setNewItem] = useState("");
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewItem("");
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id={`select-all-${addLabel}`}
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`select-all-${addLabel}`}
            className="text-sm font-medium text-blue-600 cursor-pointer select-none"
          >
            Select All
          </label>
        </div>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              id={item.id}
              checked={item.selected}
              onCheckedChange={() => onToggle(item.id)}
              className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 flex-shrink-0"
            />
            <label
              htmlFor={item.id}
              className="text-sm text-slate-700 flex-1 cursor-pointer select-none"
            >
              {item.text}
            </label>
            {item.isDefault ? (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-[10px] text-red-500 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                Remove Default
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-red-50"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Type and press Enter or click Add..."
          className="text-sm h-9"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          className="bg-blue-700 hover:bg-blue-800 text-white h-9 px-4 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiStateDropdown — checkbox-style multi-select inside a dropdown
// Props:
//   states        : string[]           – all available state names
//   selectedStates: string[]           – currently selected
//   onChange      : (states) => void
// ─────────────────────────────────────────────────────────────────────────────
export function MultiStateDropdown({ states = [], selectedStates = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (state) => {
    if (selectedStates.includes(state)) {
      onChange(selectedStates.filter((s) => s !== state));
    } else {
      onChange([...selectedStates, state]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        <span className="truncate">
          {selectedStates.length === 0
            ? "Select state(s)…"
            : selectedStates.join(", ")}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
          {states.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-2">No states available</p>
          ) : (
            states.map((state) => (
              <label
                key={state}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 cursor-pointer select-none"
              >
                <Checkbox
                  checked={selectedStates.includes(state)}
                  onCheckedChange={() => toggle(state)}
                  className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <span className="text-sm text-slate-700">{state}</span>
              </label>
            ))
          )}
        </div>
      )}

      {/* Selected badges */}
      {selectedStates.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedStates.map((s) => (
            <Badge
              key={s}
              className="bg-blue-100 text-blue-800 border-none px-2 py-0.5 flex items-center gap-1 text-xs"
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="hover:text-red-600 p-0.5 rounded-full"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}