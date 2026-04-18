"use client";

/**
 * ItineraryEditor
 * ──────────────────────────────────────────────────────────────────────────────
 * A fully self-contained itinerary editor that works on LOCAL STATE only.
 * It NEVER reads from or writes to Firestore directly.
 *
 * Props
 * ─────
 *   initialData          – object (cloned template or null for blank)
 *   onChange             – (data) => void  called on every meaningful state change
 *   onCancel             – () => void       called when user clicks "Cancel / Discard"
 *   availableActivities  – array fetched by parent (state-scoped), passed down
 *                          so this component stays Firestore-free
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  X,
  Trash2,
  MapPin,
  FileText,
  ListChecks,
  Info,
  ChevronUp,
  ChevronDown,
  AudioLinesIcon,
  Send,
  Lock,
  MessageSquare,
  AlertCircle,
  ChevronDown as ChevronDownIcon,
  RefreshCw,
  Upload,
  ImageIcon,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/firebase/config";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// ImgBB upload helper — same approach as ItineraryForm
// ─────────────────────────────────────────────────────────────────────────────
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "YOUR_IMGBB_API_KEY";

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("ImgBB upload failed");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "ImgBB error");
  return json.data.display_url;
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageUploader — single image slot with preview, upload, replace, remove
// ─────────────────────────────────────────────────────────────────────────────
function ImageUploader({
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
      const url = await uploadToImgBB(file);
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
function MultiImageUploader({ values = [], onChange, max = 2 }) {
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
        <div key={idx} className="w-32 flex-shrink-0">
          <ImageUploader
            value={url}
            onChange={(newUrl) =>
              newUrl === null ? handleRemove(idx) : handleReplace(idx, newUrl)
            }
            label={`Photo ${idx + 1}`}
            aspectClass="aspect-video"
          />
        </div>
      ))}

      {canAdd && (
        <div className="w-32 flex-shrink-0">
          <ImageUploader
            value={null}
            onChange={(url) => url && handleAdd(url)}
            label={values.length === 0 ? "Add Photo" : `Add Photo ${values.length + 1}`}
            aspectClass="aspect-video"
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const mkId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Default checklist data
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_INCLUSIONS = [
  "Hotel to Airport transfer on the day of departure.",
  "All tours & transfers are on a shared coach basis.",
  "Airport to Hotel transfer on the day of arrival.",
  "All sightseeing entry fees",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_EXCLUSIONS = [
  "International or domestic flight tickets unless specified.",
  "Any item of personal nature like tips, laundry, telephone calls etc.",
  "Any other sightseeing other than those mentioned in the inclusions section.",
  "Any fee for video or camera permit.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_TNC = [
  "No rooms are booked or blocked yet, Rooms are subjected to availability.",
  "Package cost will vary depends on currency fluctuations.",
  "No flights are booked or blocked yet, Airfare & Seats are subjected to availability.",
  "Itinerary may change but the inclusions will remain same.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_CANCELLATION = [
  "These are non-refundable amounts as per the current components attached.",
  "Please check the exact cancellation and date change policy on the review page before proceeding further.",
  "Please note, TCS once collected cannot be refunded in case of any cancellation / modification.",
  "Cancellation charges shown is exclusive of all taxes and taxes will be added as per applicable.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

const DEFAULT_IMP_INFO = [
  "Ensure your passport is valid for at least six months beyond your intended date of return.",
  "Make sure you have enough blank pages for visa stamps.",
  "Obtain the appropriate visa (eg., tourist visa) for your destination country.",
  "Ensure the visa covers your entire stay.",
  "Ensure your travel insurance covers medical emergencies, trip cancellations, and loss of belongings.",
  "Carry a copy of your travel insurance policy.",
  "Carry an additional government-issued ID (e.g., Aadhar card, driving license).",
  "Some countries may require proof of COVID-19 vaccination.",
].map((text) => ({ id: mkId(), text, selected: true, isDefault: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Tabs config
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "itinerary", label: "Itinerary & Days", icon: MapPin },
  { id: "inclusions", label: "Inclusions & Exclusions", icon: ListChecks },
  { id: "tnc", label: "T&C's & Cancellation", icon: FileText },
  { id: "impinfo", label: "Important Information", icon: Info },
];

// ─────────────────────────────────────────────────────────────────────────────
// ChecklistSection
// ─────────────────────────────────────────────────────────────────────────────
function ChecklistSection({
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
            id={`sel-all-${addLabel}`}
            checked={allSelected}
            onCheckedChange={onSelectAll}
            className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <label
            htmlFor={`sel-all-${addLabel}`}
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
          placeholder="Type and press Enter or click Add…"
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
// ActivityDropdown
// ─────────────────────────────────────────────────────────────────────────────
function ActivityDropdown({
  dayIdx,
  activityIds,
  availableActivities,
  onToggle,
}) {
  const unselected = availableActivities.filter(
    (a) => !(activityIds || []).includes(a.id),
  );

  const handleChange = (e) => {
    const id = e.target.value;
    if (!id) return;
    onToggle(dayIdx, id);
    e.target.value = "";
  };

  return (
    <select
      onChange={handleChange}
      defaultValue=""
      disabled={unselected.length === 0}
      className="w-full px-3 py-2 text-sm border rounded-md bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <option value="" disabled>
        {unselected.length === 0
          ? "All activities added"
          : "Select an activity to add…"}
      </option>
      {unselected.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Chat Panel — shows history + refinement textarea
// ─────────────────────────────────────────────────────────────────────────────
function AIChatPanel({
  chatHistory,
  isGenerating,
  aiError,
  onGenerate,
  onRefine,
  hasGenerated,
}) {
  const [prompt, setPrompt] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    onRefine(trimmed);
    setPrompt("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 hover:from-blue-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <AudioLinesIcon className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700">
            AI Itinerary Assistant
          </span>
          {chatHistory.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-none text-[10px] px-1.5 py-0">
              {chatHistory.filter((m) => m.role === "user").length} refinement
              {chatHistory.filter((m) => m.role === "user").length !== 1
                ? "s"
                : ""}
            </Badge>
          )}
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {chatHistory.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AudioLinesIcon className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : msg.isError
                        ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm"
                        : "bg-slate-100 text-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {msg.isError && (
                      <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                    )}
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-600">
                        U
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-2 justify-start">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AudioLinesIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span className="text-[11px] text-slate-500 font-medium">
                {hasGenerated
                  ? "Refine the itinerary with a follow-up instruction"
                  : "Describe your itinerary or provide instructions for the AI"}
              </span>
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  hasGenerated
                    ? `e.g. "Add a food tour on Day 2" or "Make Day 1 more relaxed"…\n\nCtrl+Enter to send`
                    : `e.g. "5 nights in Rajasthan covering Jaipur and Udaipur, focus on heritage"…\n\nCtrl+Enter to send`
                }
                disabled={isGenerating}
                className="text-xs resize-none min-h-[72px] max-h-[140px] flex-1 disabled:opacity-60 leading-relaxed"
                rows={3}
              />
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isGenerating}
                className="h-9 w-9 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 mb-0.5"
                title="Send (Ctrl+Enter)"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">
              {hasGenerated
                ? "The AI will update the itinerary while keeping your manual edits in context."
                : "The AI will generate a full itinerary based on your description."}
            </p>
          </div>

          {!hasGenerated && (
            <Button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full rounded-lg px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold transition-all disabled:opacity-60 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Generating itinerary…
                </>
              ) : (
                <>
                  <AudioLinesIcon className="mr-2 h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          )}

          {aiError && chatHistory.length === 0 && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}

          {hasGenerated && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate from scratch
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: ItineraryEditor
// ─────────────────────────────────────────────────────────────────────────────
export default function ItineraryEditor({
  initialData = null,
  onChange,
  onCancel,
  availableActivities = [],
  canUseAI = false, 
   permissionsLoading = false,
}) {
  const init = useCallback(() => {
    if (initialData) {
      return {
        title: initialData.title || "",
        state: initialData.state || "",
        cities: initialData.cities || [],
        tags: initialData.tags || [],
        posterImage: initialData.posterImage || null,
        days: (initialData.days || []).map((d) => ({
          ...d,
          id: d.id || mkId(),
          activityIds: d.activityIds || [],
          images: d.images || [],
        })),
        inclusions:
          initialData.inclusions ||
          DEFAULT_INCLUSIONS.map((i) => ({ ...i, id: mkId() })),
        exclusions:
          initialData.exclusions ||
          DEFAULT_EXCLUSIONS.map((i) => ({ ...i, id: mkId() })),
        tnc:
          initialData.tnc || DEFAULT_TNC.map((i) => ({ ...i, id: mkId() })),
        cancellation:
          initialData.cancellation ||
          DEFAULT_CANCELLATION.map((i) => ({ ...i, id: mkId() })),
        impInfo:
          initialData.impInfo ||
          DEFAULT_IMP_INFO.map((i) => ({ ...i, id: mkId() })),
      };
    }
    return {
      title: "",
      state: "",
      cities: [],
      tags: [],
      posterImage: null,
      days: [
        {
          id: mkId(),
          dayNumber: 1,
          title: "",
          description: "",
          activityIds: [],
          images: [],
        },
      ],
      inclusions: DEFAULT_INCLUSIONS.map((i) => ({ ...i, id: mkId() })),
      exclusions: DEFAULT_EXCLUSIONS.map((i) => ({ ...i, id: mkId() })),
      tnc: DEFAULT_TNC.map((i) => ({ ...i, id: mkId() })),
      cancellation: DEFAULT_CANCELLATION.map((i) => ({ ...i, id: mkId() })),
      impInfo: DEFAULT_IMP_INFO.map((i) => ({ ...i, id: mkId() })),
    };
  }, [initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  const initState = init();

  const [activeTab, setActiveTab] = useState("itinerary");
  const [title, setTitle] = useState(initState.title);
  const [itinState, setItinState] = useState(initState.state);
  const [cities, setCities] = useState(initState.cities);
  const [cityInput, setCityInput] = useState("");
  const [posterImage, setPosterImage] = useState(initState.posterImage);
  const [days, setDays] = useState(initState.days);
  const [inclusions, setInclusions] = useState(initState.inclusions);
  const [exclusions, setExclusions] = useState(initState.exclusions);
  const [tnc, setTnc] = useState(initState.tnc);
  const [cancellation, setCancellation] = useState(initState.cancellation);
  const [impInfo, setImpInfo] = useState(initState.impInfo);

  const packageContext = useSelector((state) => state.package.packageContext);

  // ── AI Chat state ────────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // ── Bubble up every change ────────────────────────────────────────────────
  useEffect(() => {
    onChange?.({
      title,
      state: itinState,
      cities,
      tags: [],
      posterImage,
      days,
      inclusions,
      exclusions,
      tnc,
      cancellation,
      impInfo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    itinState,
    cities,
    posterImage,
    days,
    inclusions,
    exclusions,
    tnc,
    cancellation,
    impInfo,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Apply AI response — ONLY updates title, state, cities, days.
  // Checklist fields (inclusions, exclusions, tnc, cancellation, impInfo)
  // are intentionally left untouched — user manages them manually.
  // ─────────────────────────────────────────────────────────────────────────
  const applyAIResponse = (data) => {
    if (data.title) setTitle(data.title);
    if (data.state) setItinState(data.state);
    if (data.cities?.length) setCities(data.cities);
    if (data.days?.length) {
      setDays(
        data.days.map((d, i) => ({
          id: mkId(),
          dayNumber: d.dayNumber ?? i + 1,
          title: d.title || "",
          description: d.description || "",
          activityIds: [],
          // Keep images empty for AI-generated days — user uploads manually
          images: [],
        }))
      );
    }
    // posterImage intentionally not reset by AI
    // inclusions, exclusions, tnc, cancellation, impInfo intentionally NOT touched by AI
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Initial AI generation
  // ─────────────────────────────────────────────────────────────────────────
  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    setAiError(null);
    setChatHistory([]);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai-itinerary", {
        method: "POST",
        headers,
        body: JSON.stringify({
          packageContext,
          chatHistory: [],
          userPrompt: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      applyAIResponse(data);
      setHasGenerated(true);

      setChatHistory([
        {
          role: "assistant",
          content: `✅ Itinerary generated! ${
            data.days?.length ? `Created ${data.days.length} days` : ""
          } for ${data.title || "your trip"}. You can now refine it below.`,
        },
      ]);
    } catch (err) {
      console.error("[AI Itinerary]", err);
      const errMsg =
        err.message || "Generation failed. You can still fill in manually.";
      setAiError(errMsg);

      if (chatHistory.length > 0) {
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${errMsg}`, isError: true },
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // AI refinement — sends only itinerary/days context, NOT checklist fields
  // ─────────────────────────────────────────────────────────────────────────
  const handleRefine = async (userPrompt) => {
    if (!userPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAiError(null);

    const updatedHistory = [
      ...chatHistory,
      { role: "user", content: userPrompt },
    ];
    setChatHistory(updatedHistory);

    // Only send itinerary + days — checklist fields excluded intentionally
    const currentItinerary = {
      title,
      state: itinState,
      cities,
      days,
    };

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ai-itinerary", {
        method: "POST",
        headers,
        body: JSON.stringify({
          packageContext,
          chatHistory: updatedHistory,
          userPrompt,
          currentItinerary,
        }),
      });

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const errBody = await res.json();
          errMsg = errBody?.error || errMsg;
          if (errBody?.details) errMsg += ` — ${errBody.details}`;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      applyAIResponse(data);

      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Done! Updated the itinerary based on your request.${
            data.days?.length
              ? ` The plan now has ${data.days.length} days.`
              : ""
          }`,
        },
      ]);
    } catch (err) {
      console.error("[AI Itinerary Refine]", err);
      const errMsg =
        err.message ||
        "Could not apply your changes. Please try again or edit manually.";
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: errMsg, isError: true },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Generic checklist handlers factory ───────────────────────────────────
  const makeHandlers = (setter) => ({
    toggle: (id) =>
      setter((prev) =>
        prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
      ),
    selectAll: (checked) =>
      setter((prev) => prev.map((i) => ({ ...i, selected: !!checked }))),
    add: (text) =>
      setter((prev) => [
        ...prev,
        { id: mkId(), text, selected: true, isDefault: false },
      ]),
    remove: (id) => setter((prev) => prev.filter((i) => i.id !== id)),
  });

  const incH = makeHandlers(setInclusions);
  const excH = makeHandlers(setExclusions);
  const tncH = makeHandlers(setTnc);
  const canH = makeHandlers(setCancellation);
  const impH = makeHandlers(setImpInfo);

  // ── City tag input ────────────────────────────────────────────────────────
  const handleCityKey = (e) => {
    if (e.key === "Enter" && cityInput.trim()) {
      e.preventDefault();
      if (!cities.includes(cityInput.trim()))
        setCities((prev) => [...prev, cityInput.trim()]);
      setCityInput("");
    }
  };
  const removeCity = (city) =>
    setCities((prev) => prev.filter((c) => c !== city));

  // ── Day handlers ──────────────────────────────────────────────────────────
  const addDay = () =>
    setDays((prev) => [
      ...prev,
      {
        id: mkId(),
        dayNumber: prev.length + 1,
        title: "",
        description: "",
        activityIds: [],
        images: [],
      },
    ]);

  const removeDay = (idx) => {
    if (days[idx].title && !window.confirm("Delete this day?")) return;
    setDays((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((d, i) => ({ ...d, dayNumber: i + 1 }))
    );
  };

  const updateDay = (idx, field, value) =>
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });

  const updateDayImages = (idx, newImages) =>
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], images: newImages };
      return next;
    });

  const moveDayUp = (idx) => {
    if (idx === 0) return;
    setDays((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const moveDayDown = (idx) => {
    if (idx === days.length - 1) return;
    setDays((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  const toggleActivity = (dayIdx, actId) =>
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        const cur = d.activityIds || [];
        return {
          ...d,
          activityIds: cur.includes(actId)
            ? cur.filter((id) => id !== actId)
            : [...cur, actId],
        };
      })
    );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
     {/* ── AI Chat Panel ── */}
<div className="mb-4">
  {canUseAI ? (
    <AIChatPanel
      chatHistory={chatHistory}
      isGenerating={isGenerating}
      aiError={aiError}
      onGenerate={handleGenerateWithAI}
      onRefine={handleRefine}
      hasGenerated={hasGenerated}
    />
  ) : (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
        <Lock className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600">
          AI Itinerary Assistant
        </p>
        <p className="text-xs text-slate-400">
          AI generation is disabled for your account. Contact your admin to enable it.
        </p>
      </div>
    </div>
  )}
</div>

      {/* ── Tab strip ── */}
      <div className="flex gap-1 flex-wrap pb-4 border-b border-slate-200 mb-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1 — ITINERARY & DAYS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "itinerary" && (
        <div className="space-y-5">
          {/* ── Header info ── */}
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Header Info
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Itinerary Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5N Golden Triangle"
                  className="text-sm"
                />
              </div>

              {itinState && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-500">
                    Base State
                  </Label>
                  <div className="text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                    {itinState}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Cities Covered{" "}
                  <span className="text-slate-400">(type and press Enter)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md bg-white min-h-[42px] focus-within:ring-1 focus-within:ring-blue-500">
                  {cities.map((city) => (
                    <Badge
                      key={city}
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-2 py-0.5 flex items-center gap-1 text-xs"
                    >
                      {city}
                      <button
                        type="button"
                        onClick={() => removeCity(city)}
                        className="hover:text-red-600 p-0.5 rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    className="flex-1 outline-none text-sm min-w-[100px] bg-transparent"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={handleCityKey}
                    placeholder={cities.length === 0 ? "Add city…" : ""}
                  />
                </div>
              </div>

              {/* ── Poster / Cover Image ── */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  Poster / Cover Image
                  <span className="font-normal text-slate-400 ml-1">
                    (optional)
                  </span>
                </Label>
                <p className="text-[11px] text-slate-400">
                  This image appears at the top of the itinerary in the PDF and quotation.
                </p>
                <div className="max-w-sm">
                  <ImageUploader
                    value={posterImage}
                    onChange={setPosterImage}
                    label=""
                    aspectClass="aspect-video"
                    maxSizeMB={8}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Day program ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700">
              Day-wise Program
            </h3>

            {days.map((day, idx) => (
              <Card
                key={day.id}
                className="relative border-l-4 border-l-blue-500 border border-slate-200 shadow-none"
              >
                <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-xs font-black text-blue-600 tracking-widest">
                    DAY {day.dayNumber}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveDayUp(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                      title="Move day up"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDayDown(idx)}
                      disabled={idx === days.length - 1}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                      title="Move day down"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDay(idx)}
                      className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                      title="Delete day"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <Input
                    placeholder="Day title…"
                    value={day.title}
                    onChange={(e) => updateDay(idx, "title", e.target.value)}
                    className="font-semibold text-sm"
                  />

                  <Textarea
                    placeholder="What happens today? Describe the plan, transfers, meals, sightseeing…"
                    value={day.description}
                    onChange={(e) =>
                      updateDay(idx, "description", e.target.value)
                    }
                    className="min-h-[90px] text-sm resize-y"
                  />

                  {/* ── Day Photos ── */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <Label className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <ImageIcon className="w-3 h-3" />
                      Day Photos
                      <span className="ml-auto text-[10px] text-slate-400 font-normal">
                        {(day.images || []).length} / 2 uploaded
                      </span>
                    </Label>
                    <MultiImageUploader
                      values={day.images || []}
                      onChange={(urls) => updateDayImages(idx, urls)}
                      max={2}
                    />
                  </div>

                  {availableActivities.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <Label className="text-xs text-slate-500 font-medium">
                        Linked Activities
                      </Label>

                      {(day.activityIds || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {day.activityIds.map((actId) => {
                            const act = availableActivities.find(
                              (a) => a.id === actId
                            );
                            return (
                              <Badge
                                key={actId}
                                variant="outline"
                                className="flex items-center gap-1 pr-1 bg-blue-50 border-blue-200 text-blue-700 text-xs"
                              >
                                {act ? (
                                  act.name
                                ) : (
                                  <span className="italic text-slate-400">
                                    Loading…
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleActivity(idx, actId)}
                                  className="hover:text-red-500 p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <ActivityDropdown
                        dayIdx={idx}
                        activityIds={day.activityIds || []}
                        availableActivities={availableActivities}
                        onToggle={toggleActivity}
                      />
                    </div>
                  )}
                </CardContent>

                {idx === days.length - 1 && (
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={addDay}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-xs font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Add Next Day
                    </button>
                  </div>
                )}
              </Card>
            ))}

            {days.length === 0 && (
              <button
                type="button"
                onClick={addDay}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Day
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2 — INCLUSIONS & EXCLUSIONS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inclusions" && (
        <Card className="border border-slate-200 shadow-none">
          <CardContent className="p-4 space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-2">
                Inclusions
              </h3>
              <ChecklistSection
                items={inclusions}
                onToggle={incH.toggle}
                onSelectAll={incH.selectAll}
                onAdd={incH.add}
                onRemove={incH.remove}
                addLabel="Add Inclusion"
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 border-b pb-2">
                Exclusions
              </h3>
              <ChecklistSection
                items={exclusions}
                onToggle={excH.toggle}
                onSelectAll={excH.selectAll}
                onAdd={excH.add}
                onRemove={excH.remove}
                addLabel="Add Exclusion"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3 — T&C's & CANCELLATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tnc" && (
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Terms &amp; Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChecklistSection
                items={tnc}
                onToggle={tncH.toggle}
                onSelectAll={tncH.selectAll}
                onAdd={tncH.add}
                onRemove={tncH.remove}
                addLabel="Add Term"
              />
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Cancellation Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ChecklistSection
                items={cancellation}
                onToggle={canH.toggle}
                onSelectAll={canH.selectAll}
                onAdd={canH.add}
                onRemove={canH.remove}
                addLabel="Add Cancellation Policy"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4 — IMPORTANT INFORMATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "impinfo" && (
        <Card className="border border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ChecklistSection
              items={impInfo}
              onToggle={impH.toggle}
              onSelectAll={impH.selectAll}
              onAdd={impH.add}
              onRemove={impH.remove}
              addLabel="Add Important Info"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Cancel / Discard button ── */}
      {onCancel && (
        <div className="pt-4 border-t border-slate-200 mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" /> Discard Itinerary
          </Button>
        </div>
      )}
    </div>
  );
}

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Please sign in again to use AI itinerary generation.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
