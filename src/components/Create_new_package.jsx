"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useAgentPermissions } from "@/app/hooks/useAgentPermissions";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  doc,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
  setSelectedTransport,
  setSelectedActivities,
  setConfirmedMarkup,
  setPackageName,
  setCustomerName,
  setPackageContext,
  setEditingQuotation,
  clearEditingQuotation,
} from "@/store/packageSlice";
import toast from "react-hot-toast";

import { exportPackagePDF } from "@/lib/exportPackagePDF";
import { copyPackageSummary } from "@/lib/copyPackageSummary";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Hotel,
  Car,
  Palmtree,
  Plus,
  Trash2,
  Edit3,
  Wallet,
  FileText,
  Copy,
  CheckCircle,
  IndianRupee,
  Save,
  Star,
  PenLine,
  X,
  BedDouble,
  Utensils,
  Users,
  BusFront,
  Moon,
  Sun,
  Activity,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  PackagePlus,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  Search,
  Link2,
  Tag,
  BadgePercent,
} from "lucide-react";
import ItinerarySection from "./ItinerarySection";
import { generateQuotationRef } from "@/firebase/quotationRef";
import { getLeadsByAgent } from "@/firebase/leadsService";

import HotelRoomSelector from "@/components/package/HotelRoomSelector";
import CustomHotelForm from "@/components/package/CustomHotelForm";
import TransportSelector from "@/components/package/TransportSelector";
import ActivitySelector from "@/components/package/ActivitySelector";
import TransportSummaryCard from "@/components/package/TransportSummaryCard";
import ActivitySummaryCard from "@/components/package/ActivitySummaryCard";
import HotelItineraryCard from "@/components/package/HotelItineraryCard";
import { hotelHasRatesForStay } from "@/lib/hotelRateAvailability";
import {
  MEAL_PLANS,
  calcCustomHotelNightPrice,
  formatDate,
  renderStars,
  EMPTY_PRICING,
} from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_OPTIONS = 4;
const MAX_ROOM_CATEGORIES = 3;

// ─── Room Category helpers ─────────────────────────────────────────────────────
/**
 * Create a blank room-category row.
 * @param {number} index - 0-based index within the hotel entry
 * @param {string} inheritedMealPlan - meal plan to inherit from the primary room
 */
const createEmptyRoomCategory = (index = 0, inheritedMealPlan = "") => ({
  id: Date.now() + index, // ephemeral client-side id
  roomCategory: "",
  mealPlan: inheritedMealPlan,
  mealPlanOverridden: false, // true once the agent explicitly changed this row's meal plan
  numDouble: index === 0 ? 1 : 0, // first room defaults to 1 double; extras default to 0
  numExtraAdult: 0,
  numExtraChild: 0,
  numCNB: 0,
  price: 0, // resolved per-room-category total (nights × rate × occupancy)
});

/**
 * Migrate a legacy hotel entry (flat structure) to the new multi-room-category structure.
 * Safe to call on entries that are already migrated.
 */
const migrateHotelEntry = (entry) => {
  if (Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0) {
    return entry; // already migrated
  }
  // Build a single room-category from the flat fields
  const legacyRoom = {
    id: Date.now(),
    roomCategory: entry.selectedRoomCategory || entry.roomCategory || "",
    mealPlan: entry.selectedMealPlan || entry.mealPlan || "",
    mealPlanOverridden: false,
    numDouble: entry.numDouble ?? 1,
    numExtraAdult: entry.numExtraAdult ?? 0,
    numExtraChild: entry.numExtraChild ?? 0,
    numCNB: entry.numCNB ?? 0,
    price: entry.hotelTotal ?? 0,
  };
  return {
    ...entry,
    roomCategories: [legacyRoom],
    // keep legacy flat fields for backwards-compatible reads elsewhere
  };
};

/**
 * Compute the total price of a hotel entry from its room categories.
 */
const calcHotelEntryTotal = (entry) =>
  (entry.roomCategories || []).reduce((s, rc) => s + Number(rc.price || 0), 0);

/**
 * Sort hotel entries by checkInDate ascending.
 */
const sortEntriesByCheckIn = (entries) =>
  [...entries].sort((a, b) => {
    const da = a.checkInDate ? new Date(a.checkInDate) : new Date(0);
    const db_ = b.checkInDate ? new Date(b.checkInDate) : new Date(0);
    return da - db_;
  });

const createEmptyOption = (id, name = "") => ({
  id,
  name: name || `Option ${id}`,
  hotelEntries: [],
  checkInDate: "",
  checkOutDate: "",
  nights: 1,
  selectedState: "",
  selectedHotelId: null,
  showCustomHotelForm: false,
  isReadyToAddAnother: false,
  editingIndex: null,
  roomCategory: "",
  mealPlan: "",
  currentHotelTotal: 0,
  guests: { numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 },
  saveChanges: false,
  markup: null, // per-option resolved markup in ₹ (null = use shared lumpsum)
  // Multi-room-category state for the *current* hotel being configured
  roomCategoryRows: [createEmptyRoomCategory(0)], // array of room-category rows being built
});

// ─── Validation helpers ───────────────────────────────────────────────────────
const validateOptions = (options) => {
  for (const opt of options) {
    if (!opt.hotelEntries || opt.hotelEntries.length === 0) {
      return {
        valid: false,
        error: `"${opt.name}" must have at least one hotel selected.`,
      };
    }
    // Validate room categories within each hotel entry
    for (const entry of opt.hotelEntries) {
      const rooms = entry.roomCategories || [];
      if (rooms.length === 0) {
        return {
          valid: false,
          error: `Hotel "${entry.hotel}" in "${opt.name}" must have at least one room category.`,
        };
      }
      for (const rc of rooms) {
        if (!rc.roomCategory) {
          return {
            valid: false,
            error: `All room categories in "${entry.hotel}" (${opt.name}) must have a room type selected.`,
          };
        }
        if (!rc.mealPlan) {
          return {
            valid: false,
            error: `All room categories in "${entry.hotel}" (${opt.name}) must have a meal plan selected.`,
          };
        }
      }
    }
  }

  const names = options.map((o) => o.name.trim().toLowerCase());
  const uniqueNames = new Set(names);
  if (uniqueNames.size !== names.length) {
    return { valid: false, error: "Option name must be unique." };
  }

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const a = options[i];
      const b = options[j];
      const aHotels = (a.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}`)
        .sort()
        .join(",");
      const bHotels = (b.hotelEntries || [])
        .map((h) => `${h.hotel}|${h.city}`)
        .sort()
        .join(",");
      const aDates = (a.hotelEntries || [])
        .map((h) => `${h.checkInDate}|${h.checkOutDate}`)
        .sort()
        .join(",");
      const bDates = (b.hotelEntries || [])
        .map((h) => `${h.checkInDate}|${h.checkOutDate}`)
        .sort()
        .join(",");
      const aMeals = (a.hotelEntries || [])
        .map(
          (h) =>
            `${h.hotel}|${h.city}|${(h.roomCategories || []).map((rc) => rc.mealPlan).join(":")}`,
        )
        .sort()
        .join(",");
      const bMeals = (b.hotelEntries || [])
        .map(
          (h) =>
            `${h.hotel}|${h.city}|${(h.roomCategories || []).map((rc) => rc.mealPlan).join(":")}`,
        )
        .sort()
        .join(",");
      if (aHotels === bHotels && aDates === bDates && aMeals === bMeals) {
        return {
          valid: false,
          error: `"${a.name}" and "${b.name}": Options must differ in hotel, dates, or meal plan.`,
        };
      }
    }
  }

  return { valid: true };
};

const normalizeDateForComparison = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatGapDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatGapLabels = (gaps) => gaps.map((gap) => gap.label).join(", ");

const getOptionHotelGaps = (option) => {
  const entries = (option?.hotelEntries || [])
    .map((entry) => ({
      ...entry,
      normalizedCheckIn: normalizeDateForComparison(entry.checkInDate),
      normalizedCheckOut: normalizeDateForComparison(entry.checkOutDate),
    }))
    .filter((entry) => entry.normalizedCheckIn && entry.normalizedCheckOut)
    .sort((a, b) => a.normalizedCheckIn - b.normalizedCheckIn);

  const gaps = [];

  for (let i = 0; i < entries.length - 1; i += 1) {
    const currentCheckOut = entries[i].normalizedCheckOut;
    const nextCheckIn = entries[i + 1].normalizedCheckIn;

    if (nextCheckIn > currentCheckOut) {
      const gapStart = new Date(currentCheckOut);
      const gapEnd = addDays(nextCheckIn, -1);

      gaps.push({
        start: gapStart,
        end: gapEnd,
        label:
          gapStart.getTime() === gapEnd.getTime()
            ? formatGapDate(gapStart)
            : `${formatGapDate(gapStart)} to ${formatGapDate(gapEnd)}`,
      });
    }
  }

  return gaps;
};

// ─── MultiRoomCategoryEditor ──────────────────────────────────────────────────
/**
 * Inline sub-component for managing multiple room-category rows for a single hotel.
 * Props:
 *   rows          – array of room-category rows (state from parent)
 *   onChange      – (updatedRows) => void
 *   hotelData     – the selected hotel object (for room categories list)
 *   nights        – number of nights (for price computation reference)
 *   checkInDate   – ISO string
 *   checkOutDate  – ISO string
 *   onTotalChange – (total: number) => void  called whenever total price changes
 *   onRoomCategoryChange – (category: string) => void  for primary row (index 0)
 *   onMealPlanChange     – (mealPlan: string) => void  for primary row (index 0)
 *   onGuestsChange       – (guests: object) => void    for primary row (index 0)
 *   HotelRoomSelector    – the existing component (passed as prop to avoid circular import issues)
 *   editingEntry         – full hotel entry when editing (for initial values)
 *   roomPriceRefs        – mutable ref to store latest prices per row (FIX)
 */
const MultiRoomCategoryEditor = ({
  rows,
  onChange,
  hotelData,
  nights,
  checkInDate,
  checkOutDate,
  onTotalChange,
  editingEntry, // full hotel entry when editing (for initial values)
  roomPriceRefs, // FIX: added ref for price sync
}) => {
  // Propagate total whenever rows change
  useEffect(() => {
    const total = rows.reduce((s, r) => s + Number(r.price || 0), 0);
    onTotalChange?.(total);
  }, [rows]);

  const primaryMealPlan = rows[0]?.mealPlan || "";

  /**
   * Update a single row by index.
   * Handles meal-plan sync: when row 0's mealPlan changes, cascade to non-overridden rows.
   */
  const updateRow = (index, patch) => {
    const updated = rows.map((row, i) => {
      if (i === index) {
        const newRow = { ...row, ...patch };
        // If the agent is explicitly setting mealPlan on this row and it's not row 0,
        // mark it as overridden so cascade won't overwrite it later.
        if ("mealPlan" in patch && i !== 0) {
          newRow.mealPlanOverridden = true;
        }
        return newRow;
      }
      // Cascade meal plan from row 0 to non-overridden rows
      if (index === 0 && "mealPlan" in patch && !row.mealPlanOverridden) {
        return { ...row, mealPlan: patch.mealPlan };
      }
      return row;
    });
    onChange(updated);
  };

  const addRow = () => {
    if (rows.length >= MAX_ROOM_CATEGORIES) {
      toast.error(`Maximum ${MAX_ROOM_CATEGORIES} room categories per hotel.`);
      return;
    }
    onChange([...rows, createEmptyRoomCategory(rows.length, primaryMealPlan)]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      toast.error("At least one room category is required.");
      return;
    }
    // FIX: delete the ref entry for the removed row
    const removedRow = rows[index];
    if (removedRow && roomPriceRefs?.current) {
      delete roomPriceRefs.current[removedRow.id];
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
        >
          {/* Row header */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-theme-primary uppercase tracking-wide flex items-center gap-1.5">
              <BedDouble className="h-3 w-3" />
              Room Category {index + 1}
              {index === 0 && (
                <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.5 rounded-full font-semibold">
                  Primary
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors"
                  aria-label="Remove room category"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* HotelRoomSelector with ref‑writing callbacks */}
          <HotelRoomSelector
            hotel={hotelData}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            nights={nights}
            onTotalChange={(price) => {
              console.log("ROOM", index, "PRICE:", price);
              // FIX: store latest price in the ref immediately
              if (roomPriceRefs?.current) {
                roomPriceRefs.current[row.id] = price;
              }
              updateRow(index, { price });
            }}
            onRoomCategoryChange={(roomCategory) =>
              updateRow(index, { roomCategory })
            }
            onMealPlanChange={(mealPlan) => updateRow(index, { mealPlan })}
            onGuestsChange={(guests) =>
              updateRow(index, {
                numDouble: guests.numDouble,
                numExtraAdult: guests.numExtraAdult,
                numExtraChild: guests.numExtraChild,
                numCNB: guests.numCNB,
              })
            }
            // When editing, pass initial values for this specific row
            initial={
              editingEntry?.roomCategories?.[index]
                ? {
                    selectedRoomCategory:
                      editingEntry.roomCategories[index].roomCategory,
                    selectedMealPlan:
                      editingEntry.roomCategories[index].mealPlan,
                    numDouble: editingEntry.roomCategories[index].numDouble,
                    numExtraAdult:
                      editingEntry.roomCategories[index].numExtraAdult,
                    numExtraChild:
                      editingEntry.roomCategories[index].numExtraChild,
                    numCNB: editingEntry.roomCategories[index].numCNB,
                  }
                : index === 0 && editingEntry && !editingEntry.roomCategories
                  ? editingEntry // legacy flat structure
                  : {}
            }
            // Pass the current meal plan to keep HotelRoomSelector in sync with cascade
            forcedMealPlan={
              index !== 0 && !row.mealPlanOverridden
                ? primaryMealPlan
                : undefined
            }
          />

          {/* Meal-plan override indicator for non-primary rows */}
          {index !== 0 && row.mealPlanOverridden && (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              <Info className="h-3 w-3 flex-shrink-0" />
              <span>
                Meal plan overridden — changes to Room 1 won't affect this room.{" "}
                <button
                  type="button"
                  className="underline font-medium hover:text-amber-800"
                  onClick={() =>
                    updateRow(index, {
                      mealPlan: primaryMealPlan,
                      mealPlanOverridden: false,
                    })
                  }
                >
                  Reset to Room 1
                </button>
              </span>
            </div>
          )}

          {/* Price display for this row */}
          {row.price > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-1.5 mt-1">
              <span>Room Category {index + 1} subtotal</span>
              <span className="font-bold text-slate-700">
                ₹{Number(row.price).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Add room category button */}
      {rows.length < MAX_ROOM_CATEGORIES && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="w-full text-xs h-8 border-dashed border-theme-primary/50 text-theme-primary hover:bg-theme-primary/5"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Room Category{" "}
          <span className="ml-1 text-[10px] text-slate-400">
            ({rows.length}/{MAX_ROOM_CATEGORIES})
          </span>
        </Button>
      )}

      {rows.length >= MAX_ROOM_CATEGORIES && (
        <p className="text-[10px] text-amber-600 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Maximum {MAX_ROOM_CATEGORIES} room categories per hotel
        </p>
      )}

      {/* Combined total */}
      {rows.length > 1 && (
        <div className="flex items-center justify-between rounded-lg bg-theme-primary/5 border border-theme-primary/20 px-3 py-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Hotel className="h-3.5 w-3.5 text-theme-primary" />
            Combined Hotel Total
          </span>
          <span className="font-black text-theme-primary text-sm">
            ₹
            {rows
              .reduce((s, r) => s + Number(r.price || 0), 0)
              .toLocaleString("en-IN")}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Create_new_package = ({
  userData,
  checkInDate: propCheckInDate,
  setCheckInDate: propSetCheckInDate,
  saveChanges: propSaveChanges,
  setSaveChanges: propSetSaveChanges,
  checkOutDate: propCheckOutDate,
  setCheckOutDate: propSetCheckOutDate,
  headerTitle = null,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const {
    selectedTransport,
    selectedActivities,
    activityTotalPrice,
    confirmedMarkup,
    packageName,
    customerName: reduxCustomerName,
    editingQuotation,
  } = useSelector((state) => state.package);

  const quotationId = searchParams.get("quotationId");
  const isEditMode = !!quotationId;
  const canOverwrite =
    isEditMode && !!editingQuotation && editingQuotation.status === "Draft";
  const customerId =
    searchParams.get("customerId") || searchParams.get("customerid");
  const leadId = searchParams.get("leadId");

  const saveChanges = propSaveChanges;
  const setSaveChanges = propSetSaveChanges;

  // ── Package Options State ───────────────────────────────────────────────────
  const [packageOptions, setPackageOptions] = useState([
    createEmptyOption(1, "Option 1"),
  ]);
  const [activeOptionId, setActiveOptionId] = useState(1);
  const [nextOptionId, setNextOptionId] = useState(2);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // ── Shared State ──────────────────────────────────────────────────────────
  const [itineraryData, setItineraryData] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [states, setStates] = useState([]);
  const [showTransportSection, setShowTransportSection] = useState(false);
  const [showActivitiesSection, setShowActivitiesSection] = useState(false);
  const [tollCharges, setTollCharges] = useState(0);
  const [permitCharges, setPermitCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [minKm, setMinKm] = useState(300);
  const [editableBaseCost, setEditableBaseCost] = useState(null);
  const [markupAmount, setMarkupAmount] = useState(0);
  const [markupType, setMarkupType] = useState("lumpsum");
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountNotes, setDiscountNotes] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState({
    type: "fixed",
    value: 0,
    notes: "",
    amount: 0,
  });
  const [showSaveModal, _setShowSaveModal] = useState(false);
  const setShowSaveModal = (v) => {
    if (!v) {
      setCustomerSearchText("");
      setShowCustomerDropdown(false);
      setShowInlineCreateCustomer(false);
    }
    if (v && isEditMode && user?.uid) {
      setSaveAsLeadId(leadId || "");
      setIsLoadingLeads(true);
      getLeadsByAgent(user.uid)
        .then(setAgentLeads)
        .catch(() => {})
        .finally(() => setIsLoadingLeads(false));
    }
    _setShowSaveModal(v);
  };
  const [customerName, setCustomerName] = useState("");
  const [optionValidationError, setOptionValidationError] = useState("");
  // ── Customer linking ──────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [customerSearchText, setCustomerSearchText] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerLink, setSelectedCustomerLink] = useState(null);
  const [showInlineCreateCustomer, setShowInlineCreateCustomer] =
    useState(false);
  const [newCustomerDraft, setNewCustomerDraft] = useState({
    name: "",
    mobile: "",
    email: "",
  });
  // ── Lead linking ──────────────────────────────────────────────────────────
  const [agentLeads, setAgentLeads] = useState([]);
  const [saveAsLeadId, setSaveAsLeadId] = useState("");
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  const { hasPermission, loading: permissionsLoading } = useAgentPermissions(
    user?.uid,
    user?.role,
  );
  const canUseItineraryAI =
    !permissionsLoading && hasPermission("itinerary_ai");

  // ── Active Option helpers ──────────────────────────────────────────────────
  const activeOption =
    packageOptions.find((o) => o.id === activeOptionId) || packageOptions[0];

  const updateActiveOption = useCallback(
    (updater) => {
      setPackageOptions((prev) =>
        prev.map((opt) =>
          opt.id === activeOptionId
            ? typeof updater === "function"
              ? updater(opt)
              : { ...opt, ...updater }
            : opt,
        ),
      );
    },
    [activeOptionId],
  );

  // Convenience destructures from active option
  const {
    hotelEntries,
    checkInDate,
    checkOutDate,
    nights,
    selectedState,
    selectedHotelId,
    showCustomHotelForm,
    isReadyToAddAnother,
    editingIndex,
    roomCategory,
    mealPlan,
    currentHotelTotal,
    guests,
    roomCategoryRows,
  } = activeOption;

  const setCheckInDate = (v) => updateActiveOption({ checkInDate: v });
  const setCheckOutDate = (v) => updateActiveOption({ checkOutDate: v });
  const setNights = (v) => updateActiveOption({ nights: v });
  const setSelectedState = (v) =>
    updateActiveOption({
      selectedState: v,
      selectedHotelId: null,
      showCustomHotelForm: false,
    });
  const setSelectedHotelId = (v) => updateActiveOption({ selectedHotelId: v });
  const setShowCustomHotelForm = (v) =>
    updateActiveOption({ showCustomHotelForm: v });
  const setIsReadyToAddAnother = (v) =>
    updateActiveOption({ isReadyToAddAnother: v });
  const setEditingIndex = (v) => updateActiveOption({ editingIndex: v });
  const setRoomCategory = (v) => updateActiveOption({ roomCategory: v });
  const setMealPlan = (v) => updateActiveOption({ mealPlan: v });
  const setCurrentHotelTotal = (v) =>
    updateActiveOption({ currentHotelTotal: v });
  const setGuests = (v) => updateActiveOption({ guests: v });

  /** Update the roomCategoryRows for the current hotel being configured */
  const setRoomCategoryRows = (updater) => {
    updateActiveOption((opt) => ({
      ...opt,
      roomCategoryRows:
        typeof updater === "function" ? updater(opt.roomCategoryRows) : updater,
    }));
  };

  // FIX: ref to store latest price per room (synchronous bridge)
  const roomPriceRefs = useRef({});
  // Helper to get total from refs
  const getLatestTotal = useCallback(
    () => Object.values(roomPriceRefs.current).reduce((sum, p) => sum + (p || 0), 0),
    [],
  );

  // ── Hotel dispatch-like helpers ────────────────────────────────────────────
  const addHotelEntryToOption = (entry) => {
    updateActiveOption((opt) => ({
      ...opt,
      // Always sort by checkInDate when adding
      hotelEntries: sortEntriesByCheckIn([...opt.hotelEntries, entry]),
    }));
  };

  const updateHotelEntryInOption = (index, data) => {
    updateActiveOption((opt) => {
      // When updating, re-sort so dates remain in order
      const updated = opt.hotelEntries.map((e, i) => (i === index ? data : e));
      return { ...opt, hotelEntries: sortEntriesByCheckIn(updated) };
    });
  };

  const deleteHotelEntryFromOption = (index) => {
    updateActiveOption((opt) => ({
      ...opt,
      hotelEntries: opt.hotelEntries.filter((_, i) => i !== index),
    }));
  };

  // ── Sync propCheckInDate with active option ────────────────────────────────
  useEffect(() => {
    if (propCheckInDate !== undefined && propCheckInDate !== checkInDate) {
      updateActiveOption({ checkInDate: propCheckInDate });
    }
  }, [propCheckInDate]);

  // ── Load customers ────────────────────────────────────────────────────────
  useEffect(() => {
    getDocs(collection(db, "customers")).then((snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const customerSuggestions = useMemo(() => {
    const term = customerSearchText.trim().toLowerCase();
    if (!term) return [];
    return customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.mobile?.includes(customerSearchText.trim()),
      )
      .slice(0, 8);
  }, [customers, customerSearchText]);

  const leadsForSelectedCustomer = useMemo(() => {
    if (!selectedCustomerLink) return agentLeads;
    return agentLeads.filter(
      (l) =>
        l.customerId === selectedCustomerLink.id &&
        !["Closed Won", "Closed Lost"].includes(l.status),
    );
  }, [agentLeads, selectedCustomerLink]);

  useEffect(() => {
    if (!isEditMode || !selectedCustomerLink || agentLeads.length === 0) return;
    const active = agentLeads.filter(
      (l) =>
        l.customerId === selectedCustomerLink.id &&
        !["Closed Won", "Closed Lost"].includes(l.status),
    );
    if (active.length === 0) {
      setSaveAsLeadId("");
      return;
    }
    const latest = [...active].sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    )[0];
    setSaveAsLeadId(latest.id);
  }, [selectedCustomerLink, agentLeads]);

  // ── Init / Load Data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (reduxCustomerName && !customerName) setCustomerName(reduxCustomerName);
  }, [reduxCustomerName]);

  useEffect(() => {
    if (!customerId) return;
    getDoc(doc(db, "customers", customerId)).then((snap) => {
      if (snap.exists()) setCustomerName(snap.data().name);
    });
  }, [customerId]);

  useEffect(() => {
    if (!leadId) return;
    getDoc(doc(db, "leads", leadId)).then((snap) => {
      if (snap.exists()) setCustomerName(snap.data().name);
    });
  }, [leadId]);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isEditMode || !editingQuotation || hydratedRef.current) return;
    hydratedRef.current = true;
    const q = editingQuotation;

    if (q.packageOptions?.length) {
      const hydrated = q.packageOptions.map((po, idx) => ({
        ...createEmptyOption(idx + 1, po.name || `Option ${idx + 1}`),
        // Migrate each hotel entry to ensure it has roomCategories
        hotelEntries: sortEntriesByCheckIn(
          (po.hotelEntries || []).map(migrateHotelEntry),
        ),
        checkInDate: po.hotelEntries?.[0]?.checkInDate || "",
        checkOutDate: po.hotelEntries?.[0]?.checkOutDate || "",
      }));
      setPackageOptions(hydrated);
      setNextOptionId(hydrated.length + 1);
    } else if (q.hotelSummary?.length) {
      setPackageOptions([
        {
          ...createEmptyOption(1, "Option 1"),
          hotelEntries: sortEntriesByCheckIn(
            q.hotelSummary.map(migrateHotelEntry),
          ),
          checkInDate: q.hotelSummary[0]?.checkInDate || "",
          checkOutDate: q.hotelSummary[0]?.checkOutDate || "",
        },
      ]);
    }

    if (q.transportSummary) {
      const t = q.transportSummary;
      dispatch(
        setSelectedTransport({
          name: t.packageName || "Custom",
          pricingType: t.pricingType || "fixed",
          isCustom: t.isCustom || false,
          selectedVehicle: {
            type: t.vehicleName || "",
            ac: t.ac ?? false,
            price: t.vehicleCost || 0,
            perKmprice: t.perKmprice || 0,
            isCustom: t.isCustom || false,
            driverAllowance: t.driverAllowance || 0,
          },
        }),
      );
      setMinKm(t.minKm || 300);
      setTollCharges(t.tollCharges || 0);
      setPermitCharges(t.permitCharges || 0);
      setOtherCharges(t.otherCharges || 0);
      if (t.vehicleCost) setEditableBaseCost(t.vehicleCost);
    }
    if (q.activitySummary?.length) {
      const totalPrice = q.activitySummary.reduce(
        (s, a) => s + (a.totalPrice || 0),
        0,
      );
      dispatch(
        setSelectedActivities({ activities: q.activitySummary, totalPrice }),
      );
    }
    if (q.markup) dispatch(setConfirmedMarkup(q.markup));
    dispatch(setPackageName(q.packageName || ""));
    setCustomerName(q.customerName || q.leadName || "");
    if (q.itinerarySummary) setItineraryData(q.itinerarySummary);
    dispatch(clearEditingQuotation());
    if (q.discount) {
      setAppliedDiscount(q.discount);
      setDiscountType(q.discount.type || "fixed");
      setDiscountValue(q.discount.value || 0);
      setDiscountNotes(q.discount.notes || "");
    }
  }, [isEditMode, editingQuotation]);

  useEffect(() => {
    getDocs(collection(db, "hotels")).then((snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        rooms: d.data().rooms || [],
      }));
      const unique = [
        ...new Map(
          list.map((h) => [
            `${h.name?.toLowerCase()}-${h.state?.toLowerCase()}-${h.city?.toLowerCase()}`,
            h,
          ]),
        ).values(),
      ];
      setHotels(unique);
    });
    getDocs(collection(db, "locations")).then((snap) =>
      setStates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, []);

  // Auto-calculate checkout date
  useEffect(() => {
    if (!checkInDate || !nights) return;
    const d = new Date(checkInDate);
    if (isNaN(d)) return;
    d.setDate(d.getDate() + parseInt(nights));
    updateActiveOption({ checkOutDate: d.toISOString().split("T")[0] });
  }, [checkInDate, nights, activeOptionId]);

  // Keep redux context in sync
  useEffect(() => {
    dispatch(
      setPackageContext({
        hotelEntries,
        selectedTransport,
        selectedActivities,
        selectedState,
        checkInDate,
        checkOutDate,
        packageName,
        customerName,
      }),
    );
  }, [
    activeOptionId,
    hotelEntries,
    selectedTransport,
    selectedActivities,
    selectedState,
    checkInDate,
    checkOutDate,
    packageName,
    customerName,
    dispatch,
  ]);

  const transportBreakdown = useMemo(() => {
    if (!selectedTransport?.selectedVehicle) return null;
    const vehicle = selectedTransport.selectedVehicle;
    const totalNights =
      packageOptions[0]?.hotelEntries?.reduce(
        (sum, e) => sum + (Number(e.nights) || 0),
        0,
      ) || 0;
    const days = totalNights > 0 ? totalNights + 1 : 1;
    const perKm = Number(vehicle.perKmprice || 0);
    const lumpsum = Number(vehicle.price || 0);
    const allowancePerDay = Number(vehicle.driverAllowance || 0);

    if (perKm > 0) {
      const calculatedBaseCost = Number(minKm || 0) * perKm * days;
      const baseCost =
        editableBaseCost !== null
          ? Number(editableBaseCost)
          : calculatedBaseCost;
      const driverAllowance = allowancePerDay * days;
      const toll = Math.max(0, Number(tollCharges || 0));
      const permit = Math.max(0, Number(permitCharges || 0));
      const other = Math.max(0, Number(otherCharges || 0));
      return {
        baseCost,
        driverAllowance,
        toll,
        permit,
        other,
        total: baseCost + driverAllowance + toll + permit + other,
        isPerKm: true,
      };
    }
    if (lumpsum > 0) {
      return {
        baseCost: lumpsum,
        driverAllowance: 0,
        toll: 0,
        permit: 0,
        other: 0,
        total: lumpsum,
        isPerKm: false,
      };
    }
    return null;
  }, [
    selectedTransport,
    packageOptions,
    minKm,
    editableBaseCost,
    tollCharges,
    permitCharges,
    otherCharges,
  ]);

  const transportTotalPrice = transportBreakdown?.total || 0;

  // ── Re-apply percentage markup whenever options or shared costs change ─────
  useEffect(() => {
    if (markupType !== "percentage" || !markupAmount) return;
    setPackageOptions((prev) =>
      prev.map((opt) => {
        const hotelTotal = (opt.hotelEntries || []).reduce(
          (s, e) => s + calcHotelEntryTotal(e),
          0,
        );
        const base = hotelTotal + transportTotalPrice + activityTotalPrice;
        return { ...opt, markup: (markupAmount / 100) * base };
      }),
    );
  }, [
    packageOptions
      .map((o) => o.hotelEntries.map((e) => calcHotelEntryTotal(e)).join(","))
      .join("|"),
    transportTotalPrice,
    activityTotalPrice,
    markupType,
    markupAmount,
  ]);

  // ── Filtered/Grouped Hotels ───────────────────────────────────────────────
  const filteredHotels = useMemo(
    () =>
      hotels.filter(
        (h) =>
          h.state?.toLowerCase() === selectedState.toLowerCase() &&
          hotelHasRatesForStay(h, { checkInDate, checkOutDate, nights }),
      ),
    [hotels, selectedState, checkInDate, checkOutDate, nights],
  );

  const groupedHotels = useMemo(
    () =>
      filteredHotels.reduce((acc, h) => {
        const c = h.city || "Other";
        if (!acc[c]) acc[c] = [];
        acc[c].push(h);
        return acc;
      }, {}),
    [filteredHotels],
  );

  const selectedHotelData = filteredHotels.find(
    (h) => h.id === selectedHotelId,
  );

  useEffect(() => {
    if (
      !selectedHotelId ||
      filteredHotels.some((h) => h.id === selectedHotelId)
    ) {
      return;
    }
    updateActiveOption({
      selectedHotelId: null,
      roomCategory: "",
      mealPlan: "",
      currentHotelTotal: 0,
      roomCategoryRows: [createEmptyRoomCategory(0)],
    });
    // FIX: clear price refs when hotel is deselected
    roomPriceRefs.current = {};
  }, [selectedHotelId, filteredHotels, activeOptionId]);

  // ── Per-option pricing helpers ────────────────────────────────────────────

  /** Hotel total for a given option — sums all hotel entries, each summing room categories */
  const getOptionHotelTotal = (opt) =>
    (opt.hotelEntries || []).reduce((s, e) => s + calcHotelEntryTotal(e), 0);

  const getOptionMarkup = (opt) => {
    if (markupType === "percentage") {
      if (typeof opt.markup === "number") return opt.markup;
      const hotelTotal = getOptionHotelTotal(opt);
      const base = hotelTotal + transportTotalPrice + activityTotalPrice;
      return (markupAmount / 100) * base;
    }
    return Number(confirmedMarkup) || 0;
  };

  const getOptionPreDiscountTotal = (opt) =>
    getOptionHotelTotal(opt) +
    transportTotalPrice +
    activityTotalPrice +
    getOptionMarkup(opt);

  const resolveDiscountAmountForOption = (opt) => {
    if (!appliedDiscount.value || appliedDiscount.value <= 0) return 0;
    const preDiscount = getOptionPreDiscountTotal(opt);
    if (appliedDiscount.type === "percentage") {
      return Math.round((appliedDiscount.value / 100) * preDiscount);
    }
    return Math.min(Number(appliedDiscount.value), preDiscount);
  };

  const getOptionGrandTotal = (opt) =>
    getOptionPreDiscountTotal(opt) - resolveDiscountAmountForOption(opt);

  // Convenience values for the active option
  const hotelTotalPrice = getOptionHotelTotal(activeOption);
  const activeOptionMarkup = getOptionMarkup(activeOption);
  const activeOptionPreDiscountTotal = getOptionPreDiscountTotal(activeOption);
  const activeOptionDiscountAmount =
    resolveDiscountAmountForOption(activeOption);
  const grandTotal = getOptionGrandTotal(activeOption);

  // Gap warnings
  const optionsWithHotelGaps = useMemo(
    () =>
      packageOptions
        .map((opt) => ({ ...opt, hotelGaps: getOptionHotelGaps(opt) }))
        .filter((opt) => opt.hotelGaps.length > 0),
    [packageOptions],
  );
  const activeOptionHotelGaps = useMemo(
    () => getOptionHotelGaps(activeOption),
    [activeOption],
  );
  const activeOptionHasHotelGap = activeOptionHotelGaps.length > 0;
  const hasHotelGapWarning = optionsWithHotelGaps.length > 0;
  const activeHotelGapWarningText = `There is no hotel selected for these dates: ${formatGapLabels(activeOptionHotelGaps)}.`;

  // ── Option Management ─────────────────────────────────────────────────────
  const handleAddOption = () => {
    if (packageOptions.length >= MAX_OPTIONS) {
      toast.error(`Maximum ${MAX_OPTIONS} package options allowed.`);
      return;
    }
    const newId = nextOptionId;
    setPackageOptions((prev) => [
      ...prev,
      createEmptyOption(newId, `Option ${newId}`),
    ]);
    setNextOptionId((n) => n + 1);
    setActiveOptionId(newId);
    setOptionValidationError("");
  };

  const handleRemoveOption = (id) => {
    if (packageOptions.length <= 1) {
      toast.error("At least one package option is required.");
      return;
    }
    setPackageOptions((prev) => prev.filter((o) => o.id !== id));
    if (activeOptionId === id) {
      setActiveOptionId(
        packageOptions.find((o) => o.id !== id)?.id || packageOptions[0].id,
      );
    }
    setOptionValidationError("");
  };

  const handleStartRename = (opt) => {
    setRenamingId(opt.id);
    setRenameValue(opt.name);
  };

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Option name cannot be empty.");
      return;
    }
    const duplicate = packageOptions.some(
      (o) =>
        o.id !== renamingId &&
        o.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error("Option name must be unique.");
      return;
    }
    setPackageOptions((prev) =>
      prev.map((o) => (o.id === renamingId ? { ...o, name: trimmed } : o)),
    );
    setRenamingId(null);
    setRenameValue("");
  };

  // ── Hotel handlers ────────────────────────────────────────────────────────

  /**
   * Compute the combined total for the current roomCategoryRows being edited.
   * (Used only for display, not for validation)
   */
  const computedRoomCategoryTotal = useMemo(
    () =>
      (roomCategoryRows || []).reduce((s, r) => s + Number(r.price || 0), 0),
    [roomCategoryRows],
  );

  /**
   * Validate room-category rows before saving.
   */
  const validateRoomCategoryRows = (rows) => {
    if (!rows || rows.length === 0) {
      return { valid: false, error: "At least one room category is required." };
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.roomCategory) {
        return {
          valid: false,
          error: `Room Category ${i + 1}: Please select a room type.`,
        };
      }
      if (!r.mealPlan) {
        return {
          valid: false,
          error: `Room Category ${i + 1}: Please select a meal plan.`,
        };
      }
      // NOTE: we skip price check here because price is now read from refs
    }
    return { valid: true };
  };
  const validateRoomCategoryRows_ConfigOnly = (rows) => {
    if (!rows || rows.length === 0) {
      return { valid: false, error: "At least one room category is required." };
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.roomCategory) {
        return {
          valid: false,
          error: `Room Category ${i + 1}: Please select a room type.`,
        };
      }
      if (!r.mealPlan) {
        return {
          valid: false,
          error: `Room Category ${i + 1}: Please select a meal plan.`,
        };
      }
    }
    return { valid: true };
  };

  const handleSaveHotel = () => {
    if (!selectedHotelData) {
      alert("Please select a hotel.");
      return;
    }

    // Validate room/meal selection
    const configValidation =
      validateRoomCategoryRows_ConfigOnly(roomCategoryRows);
    if (!configValidation.valid) {
      alert(configValidation.error);
      return;
    }

    // FIX: use ref-based total that is always synchronous
    const totalForEntry = getLatestTotal();
    if (totalForEntry <= 0) {
      alert("No valid hotel rate is available for the selected stay dates.");
      return;
    }

    // Derive primary room values from row 0 for backwards-compatibility fields
    const primaryRow = roomCategoryRows[0];

    const entry = {
      checkInDate,
      nights,
      checkOutDate,
      state: selectedState,
      hotel: selectedHotelData.name,
      city: selectedHotelData.city,
      GoogleListingURL: selectedHotelData.GoogleListingURL || null,
      // Legacy flat fields (row 0 values)
      numDouble: primaryRow.numDouble,
      numExtraAdult: primaryRow.numExtraAdult,
      numExtraChild: primaryRow.numExtraChild,
      numCNB: primaryRow.numCNB,
      selectedMealPlan: primaryRow.mealPlan,
      selectedRoomCategory: primaryRow.roomCategory,
      hotelTotal: totalForEntry,
      isCustom: false,
      // New multi-room-category structure — now we also persist the price from state for display,
      // but we rely on the ref-calculated total for the entry price.
      roomCategories: roomCategoryRows.map((r) => ({
        id: r.id,
        roomCategory: r.roomCategory,
        mealPlan: r.mealPlan,
        mealPlanOverridden: r.mealPlanOverridden || false,
        numDouble: r.numDouble,
        numExtraAdult: r.numExtraAdult,
        numExtraChild: r.numExtraChild,
        numCNB: r.numCNB,
        price: r.price || roomPriceRefs.current?.[r.id] || 0, // fallback to ref if state lagged
      })),
    };

    if (editingIndex !== null) {
      updateHotelEntryInOption(editingIndex, entry);
    } else {
      addHotelEntryToOption(entry);
    }

    setSaveChanges(true);
    setIsReadyToAddAnother(true);
    setEditingIndex(null);
    // Reset room category rows for next hotel
    updateActiveOption({ roomCategoryRows: [createEmptyRoomCategory(0)] });
    // FIX: clear refs after save
    roomPriceRefs.current = {};
  };

  const handleEditHotel = (index) => {
    const entry = hotelEntries[index];
    if (entry?.isCustom) {
      updateActiveOption({
        selectedState: entry.state,
        checkInDate: entry.checkInDate,
        nights: entry.nights,
        selectedHotelId: null,
        editingIndex: index,
        showCustomHotelForm: true,
        roomCategoryRows: [createEmptyRoomCategory(0)],
      });
    } else {
      // When editing, pre-populate roomCategoryRows from the entry's roomCategories
      const existingRows =
        Array.isArray(entry.roomCategories) && entry.roomCategories.length > 0
          ? entry.roomCategories.map((rc, i) => ({
              id: rc.id || Date.now() + i,
              roomCategory: rc.roomCategory || "",
              mealPlan: rc.mealPlan || "",
              mealPlanOverridden: rc.mealPlanOverridden || false,
              numDouble: rc.numDouble ?? (i === 0 ? 1 : 0),
              numExtraAdult: rc.numExtraAdult ?? 0,
              numExtraChild: rc.numExtraChild ?? 0,
              numCNB: rc.numCNB ?? 0,
              price: rc.price ?? 0,
            }))
          : [
              {
                id: Date.now(),
                roomCategory:
                  entry.selectedRoomCategory || entry.roomCategory || "",
                mealPlan: entry.selectedMealPlan || entry.mealPlan || "",
                mealPlanOverridden: false,
                numDouble: entry.numDouble ?? 1,
                numExtraAdult: entry.numExtraAdult ?? 0,
                numExtraChild: entry.numExtraChild ?? 0,
                numCNB: entry.numCNB ?? 0,
                price: entry.hotelTotal ?? 0,
              },
            ];

      updateActiveOption({
        selectedState: entry.state,
        checkInDate: entry.checkInDate,
        nights: entry.nights,
        selectedHotelId:
          hotels.find((h) => h.name === entry.hotel && h.city === entry.city)
            ?.id || null,
        editingIndex: index,
        showCustomHotelForm: false,
        roomCategoryRows: existingRows,
      });
      // FIX: prefill refs with current prices so validation works immediately
      const refs = {};
      existingRows.forEach((r) => {
        if (r.price > 0) refs[r.id] = r.price;
      });
      roomPriceRefs.current = refs;
    }
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const handleAddAnotherHotel = () => {
    updateActiveOption({
      checkInDate: checkOutDate,
      selectedState: "",
      selectedHotelId: null,
      nights: 1,
      roomCategory: "",
      mealPlan: "",
      guests: { numDouble: 1, numExtraAdult: 0, numExtraChild: 0, numCNB: 0 },
      currentHotelTotal: 0,
      isReadyToAddAnother: false,
      editingIndex: null,
      showCustomHotelForm: false,
      roomCategoryRows: [createEmptyRoomCategory(0)],
    });
    // FIX: reset price refs
    roomPriceRefs.current = {};
    setSaveChanges(false);
  };

  const handleCustomHotelAdd = (data) => {
    // Migrate custom hotel to multi-room-category structure if needed
    const migratedData = migrateHotelEntry(data);
    if (editingIndex !== null) {
      updateHotelEntryInOption(editingIndex, migratedData);
      setEditingIndex(null);
    } else {
      addHotelEntryToOption(migratedData);
    }
    setShowCustomHotelForm(false);
    setSaveChanges(true);
    setIsReadyToAddAnother(true);
  };

  const handleActivitiesDone = (activities, total) => {
    dispatch(setSelectedActivities({ activities, totalPrice: total }));
  };

  const handleApplyMarkup = () => {
    const amount = Number(markupAmount);
    if (amount < 0) {
      toast.error("Markup cannot be negative.");
      return;
    }
    if (markupType === "percentage") {
      if (amount > 100) {
        toast.error("Percentage markup cannot exceed 100%.");
        return;
      }
      const updated = packageOptions.map((opt) => {
        const hotelTotal = (opt.hotelEntries || []).reduce(
          (s, e) => s + calcHotelEntryTotal(e),
          0,
        );
        const base = hotelTotal + transportTotalPrice + activityTotalPrice;
        return { ...opt, markup: (amount / 100) * base };
      });
      setPackageOptions(updated);
      const activeOpt =
        updated.find((o) => o.id === activeOptionId) || updated[0];
      dispatch(setConfirmedMarkup(activeOpt.markup));
    } else {
      setPackageOptions((prev) =>
        prev.map((opt) => ({ ...opt, markup: null })),
      );
      dispatch(setConfirmedMarkup(amount));
    }
    toast.success("Markup applied!");
  };

  const handleApplyDiscount = () => {
    const val = Number(discountValue);
    if (val < 0) {
      toast.error("Discount value cannot be negative.");
      return;
    }
    if (discountType === "percentage" && val > 100) {
      toast.error("Percentage discount cannot exceed 100%.");
      return;
    }
    if (discountType === "fixed" && val > activeOptionPreDiscountTotal) {
      toast.error("Discount amount cannot exceed quotation total.");
      return;
    }
    const resolvedAmount =
      discountType === "percentage"
        ? Math.round((val / 100) * activeOptionPreDiscountTotal)
        : val;
    setAppliedDiscount({
      type: discountType,
      value: val,
      notes: discountNotes.trim(),
      amount: resolvedAmount,
    });
    toast.success("Discount applied!");
  };

  const handleCopyToClipboard = () =>
    copyPackageSummary({
      packageOptions,
      selectedTransport,
      selectedActivities,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      markupType,
      markupAmount,
      hotels,
      appliedDiscount,
    });

  const handleExportToPDF = () =>
    exportPackagePDF({
      packageOptions,
      selectedTransport,
      selectedActivities,
      transportTotalPrice,
      activityTotalPrice,
      confirmedMarkup,
      markupType,
      markupAmount,
      customerName,
      packageName,
      itineraryData,
      appliedDiscount,
    });

  // ── Save Package ──────────────────────────────────────────────────────────
  const handleSavePackage = async (mode = "new") => {
    if (!packageName.trim()) {
      alert("Please enter a package name.");
      return;
    }
    if (!customerName.trim()) {
      alert("Please enter a customer name.");
      return;
    }

    const validation = validateOptions(packageOptions);
    if (!validation.valid) {
      setOptionValidationError(validation.error);
      toast.error(validation.error);
      return;
    }
    setOptionValidationError("");

    const isOverwrite = mode === "overwrite" && isEditMode && canOverwrite;

    try {
      const agentId = user?.uid;
      if (!agentId) throw new Error("Not logged in");
      const effectiveLeadId = isEditMode ? saveAsLeadId || null : leadId;
      const linkedLead = effectiveLeadId
        ? agentLeads.find((l) => l.id === effectiveLeadId)
        : null;
      const c_data = {};
      if (effectiveLeadId) {
        c_data.leadId = effectiveLeadId;
        c_data.leadName = linkedLead?.name || customerName;
      }
      if (customerId) {
        c_data.customerId = customerId;
      } else if (selectedCustomerLink?.id) {
        c_data.customerId = selectedCustomerLink.id;
      } else if (linkedLead?.customerId) {
        c_data.customerId = linkedLead.customerId;
      }
      if (selectedCustomerLink?.name) {
        c_data.customerName = selectedCustomerLink.name;
      } else if (customerName) {
        c_data.customerName = customerName;
      }
      if (linkedLead?.mobile) c_data.customerMobile = linkedLead.mobile;
      if (linkedLead?.email) c_data.customerEmail = linkedLead.email;

      const refNumber = isOverwrite
        ? editingQuotation?.refNumber || (await generateQuotationRef())
        : await generateQuotationRef();

      const packageOptionsSummary = packageOptions.map((opt) => ({
        name: opt.name,
        // Persist with sorted entries and migrated room categories
        hotelEntries: sortEntriesByCheckIn(opt.hotelEntries).map(
          migrateHotelEntry,
        ),
        hotelTotal: getOptionHotelTotal(opt),
        markup: getOptionMarkup(opt),
        preDiscountTotal: getOptionPreDiscountTotal(opt),
        discountAmount: resolveDiscountAmountForOption(opt),
        grandTotal: getOptionGrandTotal(opt),
      }));

      const cleanedItinerary =
        itineraryData && Array.isArray(itineraryData.days)
          ? {
              ...itineraryData,
              days: itineraryData.days.filter(
                (day) =>
                  day.title?.trim() ||
                  day.description?.trim() ||
                  (day.images && day.images.length > 0) ||
                  (day.activityIds && day.activityIds.length > 0),
              ),
            }
          : null;

      const firstOptionHotels = sortEntriesByCheckIn(
        packageOptions[0]?.hotelEntries || [],
      ).map(migrateHotelEntry);

      const packagePayload = {
        packageName,
        ...c_data,
        refNumber,
        markup: confirmedMarkup || 0,
        markupType,
        markupAmount,
        discount: {
          type: appliedDiscount.type,
          value: appliedDiscount.value,
          amount: appliedDiscount.amount,
          notes: appliedDiscount.notes,
          appliedBy: user?.uid || "",
          appliedAt: new Date().toISOString(),
        },
        grandTotal: getOptionGrandTotal(packageOptions[0]) || 0,
        packageOptions: packageOptionsSummary,
        hotelSummary: firstOptionHotels,
        activitySummary: selectedActivities,
        transportSummary: selectedTransport
          ? {
              packageName: selectedTransport.name || "Custom",
              vehicleName: selectedTransport.selectedVehicle?.type || "",
              seats: selectedTransport.selectedVehicle?.seating || "",
              ac: selectedTransport.selectedVehicle?.ac || false,
              pricingType: selectedTransport.pricingType || "fixed",
              perKmprice: selectedTransport.selectedVehicle?.perKmprice || 0,
              minKm: minKm || 0,
              vehicleCost: transportBreakdown?.baseCost || 0,
              driverAllowance: transportBreakdown?.driverAllowance || 0,
              tollCharges: transportBreakdown?.toll || 0,
              permitCharges: transportBreakdown?.permit || 0,
              otherCharges: transportBreakdown?.other || 0,
              totalTransportCost: transportBreakdown?.total || 0,
              isCustom: selectedTransport.selectedVehicle?.isCustom || false,
            }
          : null,
        itinerarySummary:
          cleanedItinerary && cleanedItinerary.days.length > 0
            ? cleanedItinerary
            : null,
      };

      if (isOverwrite) {
        await updateDoc(
          doc(db, "saved_packages_by_agents", agentId, "packages", quotationId),
          { ...packagePayload, updatedAt: serverTimestamp() },
        );
      } else {
        await addDoc(
          collection(doc(db, "saved_packages_by_agents", agentId), "packages"),
          {
            ...packagePayload,
            status: "Draft",
            createdAt: serverTimestamp(),
          },
        );
      }
      toast(
        isOverwrite
          ? "Changes saved! ✅"
          : isEditMode
            ? "Saved as new quotation! ✅"
            : "Package saved successfully! ✅",
      );
      router.back();
      setShowSaveModal(false);
      dispatch(setPackageName(""));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save: " + err.message);
    }
  };

  const allHotelEntries = packageOptions.flatMap((o) => o.hotelEntries);
  const showRightPanel =
    selectedActivities.length > 0 ||
    allHotelEntries.length > 0 ||
    selectedTransport;

  // ── Sorted hotel entries for display (always date-ascending) ─────────────
  const sortedHotelEntries = useMemo(
    () => sortEntriesByCheckIn(hotelEntries),
    [hotelEntries],
  );

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto p-0 md:px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:gap-6 xl:gap-8">
          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex-1 space-y-4 lg:pr-2 pb-8 lg:pb-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            {/* Edit mode banner */}
            {isEditMode && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                  {canOverwrite ? (
                    <>
                      Editing a <strong>Draft</strong> — choose{" "}
                      <strong>Save Changes</strong> to update this quotation in
                      place, or <strong>Save as New</strong> to create a copy
                      with a new reference number.
                    </>
                  ) : (
                    <>
                      Editing a copy — saving will create a{" "}
                      <strong>new quotation with a new reference number</strong>
                      . The original stays unchanged.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* ── Package Options Tabs ────────────────────────────────────── */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-4 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-theme-primary" />
                    <CardTitle className="text-lg font-semibold">
                      Package Options
                    </CardTitle>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {packageOptions.length}/{MAX_OPTIONS}
                    </span>
                  </div>

                  <Button
                    onClick={handleAddOption}
                    disabled={packageOptions.length >= MAX_OPTIONS}
                    variant="outline"
                    size="sm"
                    className="text-theme-primary border-theme-primary hover:bg-theme-primary/5"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Option
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-3">
                <div className="flex flex-wrap gap-2">
                  {packageOptions.map((opt) => {
                    const isActive = activeOptionId === opt.id;
                    const hotelCount = opt.hotelEntries?.length || 0;
                    const optTotal = getOptionGrandTotal(opt);

                    return (
                      <div
                        key={opt.id}
                        onClick={() => setActiveOptionId(opt.id)}
                        className={`
              group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
              ${
                isActive
                  ? "border-theme-primary bg-theme-primary/5 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }
            `}
                      >
                        {/* Option Name */}
                        <div className="flex-1 min-w-0">
                          {renamingId === opt.id ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmRename();
                                if (e.key === "Escape") {
                                  setRenamingId(null);
                                  setRenameValue("");
                                }
                              }}
                              onBlur={handleConfirmRename}
                              className="w-full bg-transparent font-medium text-sm focus:outline-none border-b border-theme-primary"
                            />
                          ) : (
                            <div
                              className="font-medium text-sm truncate"
                              onDoubleClick={() => handleStartRename(opt)}
                            >
                              {opt.name}
                            </div>
                          )}
                        </div>

                        {/* Hotels Count */}
                        <div
                          className={`flex items-center gap-0.5 transition-opacity ${
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Hotel className="h-3.5 w-3.5" />
                          {hotelCount}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(opt);
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                            aria-label="Rename option"
                          >
                            <PenLine className="h-3 w-3" />
                          </button>
                          {packageOptions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOption(opt.id);
                              }}
                              className="p-1.5 hover:bg-red-50 rounded-lg  text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {optionValidationError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {optionValidationError}
                  </div>
                )}

                {packageOptions.length >= MAX_OPTIONS && (
                  <p className="mt-4 text-xs text-amber-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Maximum {MAX_OPTIONS} options allowed
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── 1. Date + Nights + State ── */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-theme-primary" />{" "}
                      Check-in
                    </Label>
                    <Input
                      type="date"
                      value={checkInDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium flex items-center gap-1 text-slate-500 uppercase tracking-wide">
                      <Moon className="h-3 w-3 text-theme-primary" /> Nights
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={nights ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNights(val === "" ? "" : Number(val));
                      }}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium flex items-center gap-1 text-slate-500 uppercase tracking-wide">
                      <Sun className="h-3 w-3 text-theme-primary" /> Check-out
                    </Label>
                    <Input
                      type="date"
                      value={checkOutDate}
                      readOnly
                      className="h-7 text-xs bg-slate-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium flex items-center gap-1 text-slate-500 uppercase tracking-wide">
                      <MapPin className="h-3 w-3 text-theme-primary" /> State
                    </Label>
                    <Select
                      value={selectedState}
                      onValueChange={(v) => setSelectedState(v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── 2. Hotel Selection ── */}
            {selectedState && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-theme-primary" />
                    Hotels in{" "}
                    <span className="text-theme-primary">{selectedState}</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      — for {activeOption.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {filteredHotels.length === 0 ? (
                    <div className="text-center py-6 space-y-2">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                        <Hotel className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-xs">
                        No hotels with rates found for the selected stay in{" "}
                        {selectedState}.
                      </p>
                      <Button
                        onClick={() => setShowCustomHotelForm(true)}
                        className="bg-theme-primary hover:bg-theme-secondary"
                        size="sm"
                      >
                        <PenLine className="h-3.5 w-3.5 mr-1.5" /> Add Custom
                        Hotel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`${
                          selectedHotelData && !showCustomHotelForm
                            ? "grid grid-cols-1 lg:grid-cols-2 gap-3"
                            : ""
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                            {Object.keys(groupedHotels).map((city) => (
                              <div key={city} className="space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-theme-secondary px-1">
                                  📍 {city}
                                </p>
                                {groupedHotels[city].map((h) => (
                                  <label
                                    key={h.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                      selectedHotelId === h.id
                                        ? "border-theme-primary bg-theme-primary/5"
                                        : "border-slate-100 hover:border-theme-primary/30 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`hotel-${activeOptionId}`}
                                      value={h.id}
                                      checked={selectedHotelId === h.id}
                                      onChange={() => {
                                        setSelectedHotelId(h.id);
                                        setShowCustomHotelForm(false);
                                        // Reset room category rows when switching hotels
                                        updateActiveOption({
                                          roomCategoryRows: [
                                            createEmptyRoomCategory(0),
                                          ],
                                        });
                                        // FIX: clear price refs on hotel change
                                        roomPriceRefs.current = {};
                                      }}
                                      className="accent-theme-primary flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-slate-800 truncate">
                                        {h.name}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                                        <span className="text-[9px] text-slate-500">
                                          {h.GoogleReviewRating || "N/A"} ·{" "}
                                          {h.city}
                                        </span>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCustomHotelForm((p) => !p)}
                              className="text-xs h-7 border-theme-primary/40 text-theme-primary hover:bg-theme-primary/5"
                            >
                              <PenLine className="h-3 w-3 mr-1" />
                              {showCustomHotelForm
                                ? "Hide Custom Form"
                                : "Add Custom Hotel"}
                            </Button>
                          </div>
                        </div>

                        {/* ── Multi-Room-Category Editor ── */}
                        {selectedHotelData && !showCustomHotelForm && (
                          <div className="border-t lg:border-t-0 lg:border-l border-slate-100 pt-3 lg:pt-0 lg:pl-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Hotel className="h-3.5 w-3.5 text-theme-primary" />
                              {selectedHotelData.name}
                              <span className="text-slate-400 font-normal">
                                — {selectedHotelData.city}
                              </span>
                            </p>

                            <MultiRoomCategoryEditor
                              rows={
                                roomCategoryRows || [createEmptyRoomCategory(0)]
                              }
                              onChange={(updatedRows) =>
                                setRoomCategoryRows(updatedRows)
                              }
                              hotelData={selectedHotelData}
                              nights={nights}
                              checkInDate={checkInDate}
                              checkOutDate={checkOutDate}
                              onTotalChange={(total) =>
                                updateActiveOption({ currentHotelTotal: total })
                              }
                              editingEntry={
                                editingIndex !== null
                                  ? hotelEntries[editingIndex]
                                  : null
                              }
                              // FIX: pass the ref
                              roomPriceRefs={roomPriceRefs}
                            />

                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <Button
                                onClick={handleSaveHotel}
                                className="bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                                size="sm"
                              >
                                {editingIndex !== null
                                  ? "✏️ Update Hotel"
                                  : "💾 Save Hotel"}
                              </Button>
                              {isReadyToAddAnother && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleAddAnotherHotel}
                                  className="text-xs h-8 border-theme-primary text-theme-primary hover:bg-theme-primary/5"
                                >
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                                  Another Hotel
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {showCustomHotelForm && (
                    <CustomHotelForm
                      defaultState={selectedState}
                      initial={
                        editingIndex !== null &&
                        hotelEntries[editingIndex]?.isCustom
                          ? hotelEntries[editingIndex]
                          : null
                      }
                      onAdd={handleCustomHotelAdd}
                      onCancel={() => {
                        setShowCustomHotelForm(false);
                        if (editingIndex !== null) setEditingIndex(null);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── 3. Hotel Itinerary for active option (date-sorted) ── */}
            {sortedHotelEntries.length > 0 && (
              <div className="space-y-2">
                {activeOptionHasHotelGap && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p>{activeHotelGapWarningText}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-bold text-slate-800">
                      {activeOption.name} — Hotels
                      <span className="ml-1.5 text-[11px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {sortedHotelEntries.length} hotel
                        {sortedHotelEntries.length > 1 ? "s" : ""}
                      </span>
                    </h3>
                  </div>
                  <span className="text-sm font-black text-theme-primary">
                    ₹{hotelTotalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="space-y-2">
                  {sortedHotelEntries.map((entry, displayIdx) => {
                    // Find the actual index in the un-sorted hotelEntries array
                    // so edit/delete operations work correctly
                    const actualIndex = hotelEntries.findIndex(
                      (e) =>
                        e.checkInDate === entry.checkInDate &&
                        e.hotel === entry.hotel &&
                        e.city === entry.city,
                    );
                    return (
                      <div
                        key={`${entry.hotel}-${entry.checkInDate}-${displayIdx}`}
                      >
                        <HotelItineraryCard
                          entry={entry}
                          index={actualIndex >= 0 ? actualIndex : displayIdx}
                          onEdit={handleEditHotel}
                          onDelete={(i) => deleteHotelEntryFromOption(i)}
                        />
                        {/* Room category breakup under the hotel card */}
                        {Array.isArray(entry.roomCategories) &&
                          entry.roomCategories.length > 1 && (
                            <div className="ml-4 mt-1 rounded-b-lg border border-t-0 border-slate-200 bg-slate-50 px-3 py-2 space-y-1">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                <BedDouble className="h-3 w-3" /> Room
                                Categories
                              </p>
                              {entry.roomCategories.map((rc, rcIdx) => (
                                <div
                                  key={rc.id || rcIdx}
                                  className="flex items-start justify-between text-[11px] text-slate-600"
                                >
                                  <div className="flex items-start gap-1.5">
                                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-theme-primary/10 text-[9px] font-bold text-theme-primary flex-shrink-0">
                                      {rcIdx + 1}
                                    </span>
                                    <div>
                                      <span className="font-semibold">
                                        {rc.roomCategory}
                                      </span>
                                      <span className="mx-1 text-slate-300">
                                        ·
                                      </span>
                                      <span className="text-slate-500">
                                        {rc.mealPlan}
                                      </span>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        {rc.numDouble > 0 &&
                                          `${rc.numDouble * 2} Adult${
                                            rc.numDouble * 2 > 1 ? "s" : ""
                                          }`}
                                        {rc.numExtraAdult > 0 &&
                                          ` + ${rc.numExtraAdult} Extra Adult`}
                                        {rc.numExtraChild > 0 &&
                                          ` + ${rc.numExtraChild} Child`}
                                        {rc.numCNB > 0 && ` + ${rc.numCNB} CNB`}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-slate-700 whitespace-nowrap ml-2">
                                    ₹
                                    {Number(rc.price || 0).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between border-t border-slate-200 pt-1 mt-1 text-xs">
                                <span className="font-bold text-slate-600">
                                  Hotel Total
                                </span>
                                <span className="font-black text-theme-primary">
                                  ₹
                                  {calcHotelEntryTotal(entry).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 4. Transport + Activities (shared across options) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transport */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-theme-primary" /> Transport
                    <span className="text-[10px] font-normal text-slate-400">
                      (shared)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {selectedTransport?.selectedVehicle && (
                    <TransportSummaryCard
                      transport={selectedTransport}
                      totalPrice={transportTotalPrice}
                      transportBreakdown={transportBreakdown}
                      minKm={minKm}
                      setMinKm={setMinKm}
                      tollCharges={tollCharges}
                      setTollCharges={setTollCharges}
                      permitCharges={permitCharges}
                      setPermitCharges={setPermitCharges}
                      otherCharges={otherCharges}
                      setOtherCharges={setOtherCharges}
                      editableBaseCost={editableBaseCost}
                      setEditableBaseCost={setEditableBaseCost}
                      onEdit={() => setShowTransportSection(true)}
                    />
                  )}
                  {!showTransportSection &&
                  !selectedTransport?.selectedVehicle ? (
                    <Button
                      onClick={() => setShowTransportSection(true)}
                      className="w-full bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                      size="sm"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Transport
                    </Button>
                  ) : showTransportSection ? (
                    <div className="mt-1">
                      <TransportSelector
                        onTransportSelect={(t) => {
                          dispatch(setSelectedTransport(t));
                          setShowTransportSection(false);
                        }}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Activities */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palmtree className="h-4 w-4 text-theme-primary" />{" "}
                    Activities
                    <span className="text-[10px] font-normal text-slate-400">
                      (shared)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  {selectedActivities.length > 0 && (
                    <ActivitySummaryCard
                      activities={selectedActivities}
                      totalPrice={activityTotalPrice}
                      onEdit={() => setShowActivitiesSection(true)}
                    />
                  )}
                  {!showActivitiesSection && selectedActivities.length === 0 ? (
                    <Button
                      onClick={() => setShowActivitiesSection(true)}
                      className="w-full bg-theme-primary hover:bg-theme-secondary text-xs h-8"
                      size="sm"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Activities
                    </Button>
                  ) : showActivitiesSection ? (
                    <div className="space-y-2 mt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          State for Activities
                        </Label>
                        <Select
                          value={selectedState}
                          onValueChange={setSelectedState}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedState && (
                        <ActivitySelector
                          selectedState={selectedState}
                          initialActivities={selectedActivities}
                          onDone={handleActivitiesDone}
                        />
                      )}
                      {selectedActivities.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowActivitiesSection(false)}
                          className="text-xs h-7 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Done —
                          Collapse
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivitiesSection(true)}
                      className="text-xs h-7 border-theme-primary/40 text-theme-primary"
                    >
                      <PenLine className="h-3 w-3 mr-1" /> Edit Activities
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── 5. Itinerary ── */}
            {sortedHotelEntries.length > 0 && (
              <ItinerarySection
                hotelEntries={sortedHotelEntries}
                selectedState={selectedState}
                itineraryData={itineraryData}
                setItineraryData={setItineraryData}
                onChange={(data) => setItineraryData(data)}
                canUseAI={canUseItineraryAI}
              />
            )}
          </div>

          {/* ══ RIGHT COLUMN — Sticky Pricing Panel ══════════════════════ */}
          {showRightPanel && (
            <div className="lg:w-80 xl:w-96 lg:min-w-[300px] lg:sticky lg:top-6 lg:self-start space-y-3 pt-4 lg:pt-0">
              {/* All Options Summary */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-theme-primary" />{" "}
                    Package Options
                  </h3>
                </div>
                <div className="p-3 space-y-2">
                  {packageOptions.map((opt) => {
                    const optHotelTotal = getOptionHotelTotal(opt);
                    const optMarkup = getOptionMarkup(opt);
                    const optPreDiscount = getOptionPreDiscountTotal(opt);
                    const optDiscount = resolveDiscountAmountForOption(opt);
                    const optGrandTotal = getOptionGrandTotal(opt);
                    const isActive = opt.id === activeOptionId;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setActiveOptionId(opt.id)}
                        className={`rounded-lg border p-2.5 cursor-pointer transition-all ${
                          isActive
                            ? "border-theme-primary bg-theme-primary/5"
                            : "border-slate-100 hover:border-theme-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-bold ${
                              isActive ? "text-theme-primary" : "text-slate-700"
                            }`}
                          >
                            {opt.name}
                          </span>
                          <div className="text-right">
                            {optDiscount > 0 && (
                              <p className="text-[10px] text-slate-400 line-through leading-tight">
                                ₹
                                {optPreDiscount.toLocaleString("en-IN", {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                            )}
                            <span className="text-xs font-black text-theme-primary">
                              ₹
                              {optGrandTotal.toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          </div>
                        </div>
                        {opt.hotelEntries.length > 0 ? (
                          <div className="space-y-0.5">
                            {sortEntriesByCheckIn(opt.hotelEntries).map(
                              (h, i) => (
                                <div key={i}>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    🏨 {h.hotel} · {h.city} · {h.nights}N
                                  </p>
                                  {/* Show room category summary if multiple */}
                                  {Array.isArray(h.roomCategories) &&
                                    h.roomCategories.length > 1 && (
                                      <div className="ml-4 space-y-0.5">
                                        {h.roomCategories.map((rc, rcI) => (
                                          <p
                                            key={rcI}
                                            className="text-[9px] text-slate-400"
                                          >
                                            • {rc.roomCategory} · {rc.mealPlan}{" "}
                                            · ₹
                                            {Number(
                                              rc.price || 0,
                                            ).toLocaleString("en-IN")}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              ),
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
                              <span>
                                Hotels: ₹{optHotelTotal.toLocaleString("en-IN")}
                              </span>
                              {transportTotalPrice > 0 && (
                                <span>
                                  · Trans: ₹
                                  {transportTotalPrice.toLocaleString("en-IN")}
                                </span>
                              )}
                              {activityTotalPrice > 0 && (
                                <span>
                                  · Act: ₹
                                  {activityTotalPrice.toLocaleString("en-IN")}
                                </span>
                              )}
                              {optMarkup > 0 && (
                                <span className="text-amber-500">
                                  · Markup: +₹
                                  {Math.round(optMarkup).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              )}
                              {optDiscount > 0 && (
                                <span className="text-rose-400">
                                  · Disc: −₹
                                  {optDiscount.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No hotels added
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Option Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">
                    {activeOption.name} — Breakdown
                  </h3>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {sortedHotelEntries.length}H ·{" "}
                    {selectedTransport ? "1T" : "0T"} ·{" "}
                    {selectedActivities.length}A
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    {
                      icon: <Hotel className="h-3 w-3 text-blue-600" />,
                      bg: "bg-blue-100",
                      label: `Hotels (${sortedHotelEntries.length})`,
                      val: hotelTotalPrice,
                    },
                    {
                      icon: <Car className="h-3 w-3 text-indigo-600" />,
                      bg: "bg-indigo-100",
                      label: "Transport",
                      val: transportTotalPrice,
                    },
                    {
                      icon: <Palmtree className="h-3 w-3 text-emerald-600" />,
                      bg: "bg-emerald-100",
                      label: `Activities (${selectedActivities.length})`,
                      val: activityTotalPrice,
                    },
                  ].map(({ icon, bg, label, val }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div
                          className={`w-5 h-5 rounded-md ${bg} flex items-center justify-center`}
                        >
                          {icon}
                        </div>
                        {label}
                      </div>
                      <span className="font-semibold">
                        ₹
                        {val.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ))}

                  {/* Hotel-level breakdown for active option */}
                  {sortedHotelEntries.length > 0 && (
                    <div className="ml-3 space-y-0.5 border-l-2 border-blue-100 pl-2">
                      {sortedHotelEntries.map((entry, i) => {
                        const entryTotal = calcHotelEntryTotal(entry);
                        const rooms = entry.roomCategories || [];
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="truncate max-w-[140px]">
                                {entry.hotel}
                              </span>
                              <span>₹{entryTotal.toLocaleString("en-IN")}</span>
                            </div>
                            {rooms.length > 1 &&
                              rooms.map((rc, rcI) => (
                                <div
                                  key={rcI}
                                  className="flex items-center justify-between text-[9px] text-slate-400 pl-2"
                                >
                                  <span>
                                    {rc.roomCategory} · {rc.mealPlan}
                                  </span>
                                  <span>
                                    ₹
                                    {Number(rc.price || 0).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Markup row */}
                  {activeOptionMarkup > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                          <Wallet className="h-3 w-3 text-amber-600" />
                        </div>
                        Markup
                        {markupType === "percentage" && (
                          <span className="text-[10px] text-slate-400">
                            ({markupAmount}%)
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-amber-600">
                        +₹
                        {Math.round(activeOptionMarkup).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 0 },
                        )}
                      </span>
                    </div>
                  )}

                  {/* Subtotal before discount */}
                  {activeOptionDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-1.5 mt-1">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold">
                        ₹
                        {activeOptionPreDiscountTotal.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Discount row */}
                  {activeOptionDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <BadgePercent className="h-3 w-3" />
                        {appliedDiscount.type === "percentage"
                          ? `${appliedDiscount.value}% discount`
                          : "Fixed discount"}{" "}
                        applied
                      </span>
                      <span className="font-bold text-rose-600">
                        −₹
                        {activeOptionDiscountAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Markup */}
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Wallet className="h-3.5 w-3.5 text-theme-primary" /> Add
                    Markup
                    {markupType === "percentage" && (
                      <span className="ml-auto text-[10px] font-normal text-slate-400">
                        Applied per-option
                      </span>
                    )}
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      value={markupAmount}
                      onChange={(e) => setMarkupAmount(Number(e.target.value))}
                      className="flex-1 text-xs h-8"
                      placeholder="0"
                    />
                    <Select value={markupType} onValueChange={setMarkupType}>
                      <SelectTrigger className="w-28 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lumpsum">Lumpsum (₹)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleApplyMarkup}
                      size="sm"
                      className="bg-theme-secondary hover:bg-theme-secondary/90 h-8 px-3 text-xs"
                    >
                      Apply
                    </Button>
                  </div>
                  {activeOptionMarkup > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {activeOption.name} markup:{" "}
                      <span className="font-bold text-theme-dark">
                        ₹
                        {Math.round(activeOptionMarkup).toLocaleString(
                          "en-IN",
                          { maximumFractionDigits: 0 },
                        )}
                      </span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Discount */}
              <Card className="shadow-sm border-rose-100">
                <CardContent className="p-3">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-rose-500" /> Apply Discount
                  </p>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="flex-1 text-xs h-8"
                      placeholder="0"
                    />
                    <Select
                      value={discountType}
                      onValueChange={setDiscountType}
                    >
                      <SelectTrigger className="w-28 text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (₹)</SelectItem>
                        <SelectItem value="percentage">Percent (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleApplyDiscount}
                      size="sm"
                      className="bg-rose-500 hover:bg-rose-600 h-8 px-3 text-xs text-white"
                    >
                      Apply
                    </Button>
                  </div>
                  <Input
                    value={discountNotes}
                    onChange={(e) => setDiscountNotes(e.target.value)}
                    placeholder="Note (e.g. Festive Offer, Repeat Customer)"
                    className="mt-1.5 text-xs h-8"
                  />
                  {activeOptionDiscountAmount > 0 && (
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-rose-600 font-medium flex items-center gap-1">
                        <BadgePercent className="h-3 w-3" />
                        {appliedDiscount.type === "percentage"
                          ? `${appliedDiscount.value}% discount`
                          : "Fixed discount"}{" "}
                        applied
                      </span>
                      <span className="font-bold text-rose-600">
                        −₹{activeOptionDiscountAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {appliedDiscount.notes && (
                    <p className="mt-1 text-[10px] text-slate-400 italic">
                      "{appliedDiscount.notes}"
                    </p>
                  )}
                  {appliedDiscount.value > 0 && (
                    <button
                      onClick={() =>
                        setAppliedDiscount({
                          type: "fixed",
                          value: 0,
                          notes: "",
                          amount: 0,
                        })
                      }
                      className="mt-1.5 text-[10px] text-rose-400 hover:text-rose-600 underline"
                    >
                      Remove discount
                    </button>
                  )}
                </CardContent>
              </Card>

              {/* Grand Total (active option) */}
              <div className="relative overflow-hidden rounded-xl bg-theme-dark text-white shadow-xl">
                <div className="relative p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-4 w-4 opacity-70" />
                      <h3 className="text-sm font-bold">{activeOption.name}</h3>
                    </div>
                    {sortedHotelEntries.length > 0 && (
                      <p className="text-[10px] text-white/50">
                        {sortedHotelEntries.reduce(
                          (s, e) => s + (parseInt(e.nights) || 0),
                          0,
                        )}
                        N · {sortedHotelEntries[0]?.numDouble || 0} room
                        {(sortedHotelEntries[0]?.numDouble || 0) > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  {activeOptionDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                      <span>Original</span>
                      <span className="line-through">
                        ₹
                        {activeOptionPreDiscountTotal.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                  {activeOptionDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-300 mb-1">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {appliedDiscount.notes || "Discount"}
                      </span>
                      <span>
                        −₹
                        {activeOptionDiscountAmount.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                  <p className="text-4xl font-black tracking-tight mb-4">
                    ₹
                    {grandTotal.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <Button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full py-5 bg-theme-primary hover:bg-theme-secondary font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {canOverwrite
                      ? "Save Quotation"
                      : isEditMode
                        ? "Save As New Quotation"
                        : "Save Package"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      <Copy className="h-3 w-3" /> WhatsApp
                    </button>
                    <button
                      onClick={handleExportToPDF}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      <FileText className="h-3 w-3" /> Export PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Save Modal ══════════════════════════════════════════════════════ */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-theme-dark text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {canOverwrite
                    ? "Save Draft Quotation"
                    : isEditMode
                      ? "Save As New Quotation"
                      : "Finalize Package"}
                </h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-white/60 text-xs mt-0.5">
                {canOverwrite
                  ? "Save changes in place or create a new copy"
                  : isEditMode
                    ? "A new quotation with a new reference number will be created"
                    : "Fill in details to save this package"}
              </p>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {isEditMode && !canOverwrite && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  Original quotation will not be modified
                </div>
              )}
              {canOverwrite && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  Editing a Draft — Save updates this quotation; Save as New
                  creates a copy.
                </div>
              )}

              {/* Options summary */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-xs text-slate-600">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                  Package Options
                </p>
                {packageOptions.map((opt) => {
                  const optGrandTotal = getOptionGrandTotal(opt);
                  const optDiscount = resolveDiscountAmountForOption(opt);
                  return (
                    <div
                      key={opt.id}
                      className="flex justify-between items-start py-1 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-slate-700">
                          {opt.name}
                        </span>
                        <span className="ml-1.5 text-[10px] text-slate-400">
                          {opt.hotelEntries.length} hotel
                          {opt.hotelEntries.length !== 1 ? "s" : ""}
                        </span>
                        {/* Room category summary per hotel */}
                        {sortEntriesByCheckIn(opt.hotelEntries).map(
                          (h, hIdx) =>
                            Array.isArray(h.roomCategories) &&
                            h.roomCategories.length > 1 ? (
                              <div key={hIdx} className="mt-1 ml-2 space-y-0.5">
                                <p className="text-[9px] text-slate-400 font-medium">
                                  {h.hotel}:
                                </p>
                                {h.roomCategories.map((rc, rcI) => (
                                  <p
                                    key={rcI}
                                    className="text-[9px] text-slate-400 ml-2"
                                  >
                                    • {rc.roomCategory} · {rc.mealPlan} · ₹
                                    {Number(rc.price || 0).toLocaleString(
                                      "en-IN",
                                    )}
                                  </p>
                                ))}
                              </div>
                            ) : null,
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="font-bold text-theme-primary">
                          ₹{optGrandTotal.toLocaleString("en-IN")}
                        </span>
                        {optDiscount > 0 && (
                          <div className="text-[10px] text-rose-500 flex items-center justify-end gap-1 mt-0.5">
                            <Tag className="h-2.5 w-2.5" />
                            −₹{optDiscount.toLocaleString("en-IN")}
                            {appliedDiscount.notes &&
                              ` · ${appliedDiscount.notes}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {optionValidationError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {optionValidationError}
                </div>
              )}

              {hasHotelGapWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>There are hotel gaps in this quotation.</p>
                    {optionsWithHotelGaps.map((opt) => (
                      <p
                        key={opt.id}
                        className="mt-1 text-[10px] text-amber-700/90"
                      >
                        {opt.name}: {formatGapLabels(opt.hotelGaps)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">Package Name *</Label>
                <Input
                  value={packageName}
                  onChange={(e) => dispatch(setPackageName(e.target.value))}
                  placeholder="e.g. Goa Delight 4N/5D"
                  className="h-8 text-xs"
                />
              </div>

              {/* Customer field */}
              {customerId ? (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Customer Name *</Label>
                  <Input
                    value={customerName}
                    disabled
                    className="h-8 text-xs bg-slate-100 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400">
                    ✓ Auto-filled from customer record
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Customer *</Label>
                  {selectedCustomerLink ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-theme-primary/40 bg-theme-muted/20 text-xs">
                      <Link2 className="h-3 w-3 text-theme-primary shrink-0" />
                      <span className="flex-1 font-medium text-slate-800">
                        {selectedCustomerLink.name}
                      </span>
                      <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wide">
                        Linked
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerLink(null);
                          setCustomerName("");
                          setCustomerSearchText("");
                          setShowCustomerDropdown(false);
                        }}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                      <Input
                        value={customerSearchText || customerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomerSearchText(val);
                          setCustomerName(val);
                          setShowCustomerDropdown(val.length > 0);
                          setShowInlineCreateCustomer(false);
                        }}
                        onFocus={() => {
                          if ((customerSearchText || customerName).length > 0)
                            setShowCustomerDropdown(true);
                        }}
                        onBlur={() =>
                          setTimeout(() => setShowCustomerDropdown(false), 200)
                        }
                        placeholder="Search by name or mobile..."
                        className="h-8 text-xs pl-8"
                      />
                      {showCustomerDropdown && (
                        <div
                          className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden mt-1 max-h-48"
                          style={{ maxHeight: "192px" }}
                        >
                          <div className="overflow-y-auto max-h-40">
                            {customerSuggestions.length > 0 ? (
                              <ul className="divide-y divide-slate-100">
                                {customerSuggestions.map((c) => (
                                  <li
                                    key={c.id}
                                    onMouseDown={() => {
                                      setSelectedCustomerLink({
                                        id: c.id,
                                        name: c.name,
                                      });
                                      setCustomerName(c.name);
                                      setCustomerSearchText("");
                                      setShowCustomerDropdown(false);
                                    }}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-theme-muted/40 cursor-pointer"
                                  >
                                    <div>
                                      <p className="text-xs font-semibold text-slate-800">
                                        {c.name}
                                      </p>
                                      {c.mobile && (
                                        <p className="text-[10px] text-slate-400">
                                          {c.mobile}
                                        </p>
                                      )}
                                    </div>
                                    {c.city && (
                                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-500">
                                        {c.city}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="px-3 py-2 text-xs text-slate-400 italic">
                                No customers found
                              </p>
                            )}
                            <button
                              type="button"
                              onMouseDown={() => {
                                setNewCustomerDraft({
                                  name: customerName,
                                  mobile: "",
                                  email: "",
                                });
                                setShowInlineCreateCustomer(true);
                                setShowCustomerDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-theme-primary hover:bg-theme-muted/30 border-t border-slate-100 font-medium"
                            >
                              <UserPlus className="h-3 w-3" /> Create new
                              customer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {leadId && !selectedCustomerLink && (
                    <p className="text-[10px] text-slate-400">
                      ✓ Name auto-filled from lead. Optionally link to a
                      customer.
                    </p>
                  )}

                  {showInlineCreateCustomer && (
                    <div className="border border-theme-primary/30 rounded-lg p-3 space-y-2 bg-slate-50 mt-1">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                        New Customer
                      </p>
                      <Input
                        value={newCustomerDraft.name}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Full name *"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={newCustomerDraft.mobile}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            mobile: e.target.value,
                          }))
                        }
                        placeholder="Mobile"
                        className="h-7 text-xs"
                      />
                      <Input
                        value={newCustomerDraft.email}
                        onChange={(e) =>
                          setNewCustomerDraft((p) => ({
                            ...p,
                            email: e.target.value,
                          }))
                        }
                        placeholder="Email"
                        className="h-7 text-xs"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs bg-theme-primary hover:bg-theme-secondary flex-1"
                          onClick={async () => {
                            if (!newCustomerDraft.name.trim()) return;
                            try {
                              const ref = await addDoc(
                                collection(db, "customers"),
                                {
                                  ...newCustomerDraft,
                                  status: "New",
                                  date: new Date().toLocaleDateString(),
                                },
                              );
                              const newCust = {
                                id: ref.id,
                                ...newCustomerDraft,
                              };
                              setCustomers((prev) => [...prev, newCust]);
                              setSelectedCustomerLink({
                                id: ref.id,
                                name: newCustomerDraft.name,
                              });
                              setCustomerName(newCustomerDraft.name);
                              setShowInlineCreateCustomer(false);
                              toast.success("Customer created and linked");
                            } catch (err) {
                              toast.error("Failed to create customer");
                            }
                          }}
                        >
                          Save & Link
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowInlineCreateCustomer(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lead selector — edit/clone mode only */}
              {isEditMode && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Link to Lead{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={saveAsLeadId || "none"}
                    onValueChange={(v) => {
                      const selectedLeadId = v === "none" ? "" : v;
                      setSaveAsLeadId(selectedLeadId);
                      if (!selectedLeadId) return;
                      const selectedLead = agentLeads.find(
                        (lead) => lead.id === selectedLeadId,
                      );
                      if (selectedLead) {
                        setCustomerName(
                          selectedLead.customerName || selectedLead.name || "",
                        );
                      }
                    }}
                    disabled={isLoadingLeads}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue
                        placeholder={
                          isLoadingLeads
                            ? "Loading leads..."
                            : "Select a lead..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No lead —</SelectItem>
                      {leadsForSelectedCustomer.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                          {lead.destination ? ` · ${lead.destination}` : ""}
                          {lead.status ? ` (${lead.status})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    {selectedCustomerLink
                      ? `Showing active leads for ${selectedCustomerLink.name}.`
                      : "Linking associates this quotation with a lead for tracking."}
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2 flex-wrap border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </Button>
              {canOverwrite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSavePackage("new")}
                  className="px-4"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save as New
                </Button>
              )}
              <Button
                onClick={() =>
                  handleSavePackage(canOverwrite ? "overwrite" : "new")
                }
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white px-5"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {canOverwrite
                  ? "Save Changes"
                  : isEditMode
                    ? "Save As New"
                    : "Save Package"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create_new_package;