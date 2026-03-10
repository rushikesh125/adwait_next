"use client";
import React, { useState, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  updateHotelComplete,
  deleteHotel as deleteHotelFromDB,
  validateHotelData,
} from "@/firebase/accomodation";
import toast from "react-hot-toast";

// ─── Date Overlap Utilities ────────────────────────────────────────────────

/**
 * Parses a date string like "2024-01-15" or "15/01/2024" into a Date object.
 * Returns null if invalid.
 */
const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Returns true if [startA, endA] overlaps with [startB, endB].
 * Touching boundaries (same day) are considered overlapping.
 */
const rangesOverlap = (startA, endA, startB, endB) => {
  const sA = parseDate(startA);
  const eA = parseDate(endA);
  const sB = parseDate(startB);
  const eB = parseDate(endB);
  if (!sA || !eA || !sB || !eB) return false;
  return sA <= eB && sB <= eA;
};

/**
 * Given an array of seasons for ONE room, returns a Map:
 *   seasonIndex → [conflicting season names]
 */
const getSeasonOverlapsForRoom = (seasons) => {
  const conflicts = new Map(); // index → Set of conflicting season names

  for (let i = 0; i < seasons.length; i++) {
    for (let j = i + 1; j < seasons.length; j++) {
      const a = seasons[i];
      const b = seasons[j];
      if (rangesOverlap(a.start, a.end, b.start, b.end)) {
        if (!conflicts.has(i)) conflicts.set(i, new Set());
        if (!conflicts.has(j)) conflicts.set(j, new Set());
        conflicts.get(i).add(b.name || `Season ${j + 1}`);
        conflicts.get(j).add(a.name || `Season ${i + 1}`);
      }
    }
  }

  // Convert Sets to arrays for easy rendering
  const result = new Map();
  conflicts.forEach((names, idx) => {
    result.set(idx, Array.from(names));
  });
  return result;
};

/**
 * Returns true if any room in hotelData has overlapping seasons.
 */
const hasAnyOverlap = (rooms) => {
  return rooms.some((room) => {
    const conflicts = getSeasonOverlapsForRoom(room.seasons || []);
    return conflicts.size > 0;
  });
};

// ──────────────────────────────────────────────────────────────────────────

const EditHotel = ({ hotel, onClose, onSave, onDelete }) => {
  const [hotelData, setHotelData] = useState({
    ...hotel,
    name: hotel.name || "",
    city: hotel.city || "",
    state: hotel.state || "",
    rating: hotel.rating || "",
    GoogleReviewRating: hotel.GoogleReviewRating ?? "",
    GoogleListingURL: hotel.GoogleListingURL ?? "",
    rooms: hotel.rooms || [],
  });

  const [openSeasons, setOpenSeasons] = useState({});
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneContext, setCloneContext] = useState(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingClone, setPendingClone] = useState(null);
  const [cloneForm, setCloneForm] = useState({ name: "", start: "", end: "" });
  const [seasonToDelete, setSeasonToDelete] = useState(null);

  const toggleSeason = (roomIdx, seasonIdx) => {
    const key = `${roomIdx}-${seasonIdx}`;
    setOpenSeasons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Meal Plan Management ──────────────────────────────────────────────

  const removeMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = { ...seasons[seasonIndex].pricing };
      delete pricing[plan];
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const addMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = {
        ...seasons[seasonIndex].pricing,
        [plan]: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      };
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  // ── Field Handlers ────────────────────────────────────────────────────

  const handleHotelChange = (e) => {
    const { name, value } = e.target;
    setHotelData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoomChange = (roomIndex, key, value) => {
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      rooms[roomIndex] = { ...rooms[roomIndex], [key]: value };
      return { ...prev, rooms };
    });
  };

  const handleSeasonChange = (roomIndex, seasonIndex, key, value) => {
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      seasons[seasonIndex] = { ...seasons[seasonIndex], [key]: value };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const handlePricingChange = (roomIndex, seasonIndex, plan, type, value) => {
    const numValue = value === "" ? 0 : Number(value);
    if (numValue < 0) return;
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = {
        ...seasons[seasonIndex].pricing,
        [plan]: {
          ...(seasons[seasonIndex].pricing?.[plan] || {
            double: 0,
            extraAdult: 0,
            extraChild: 0,
            cnb: 0,
          }),
          [type]: numValue,
        },
      };
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  // ── Room / Season Management ──────────────────────────────────────────

  const addRoomCategory = () => {
  const sourceRoom = hotelData.rooms.find(r => r.seasons && r.seasons.length > 0);

  const copiedSeasons = sourceRoom
    ? sourceRoom.seasons.map(season => ({
        ...season,
        pricing: Object.fromEntries(
          Object.keys(season.pricing || {}).map(plan => [
            plan,
            { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }
          ])
        )
      }))
    : [];

  const newRoom = { categoryName: '', seasons: copiedSeasons };
  setHotelData(prev => ({ ...prev, rooms: [newRoom, ...prev.rooms] }));
};
  const removeRoomCategory = (roomIndex) => {
    setHotelData((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== roomIndex),
    }));
  };

  const addSeasonToRoom = (roomIndex) => {
    const newSeason = {
      name: "",
      start: "",
      end: "",
      pricing: {
        ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
      },
    };
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      rooms[roomIndex] = {
        ...rooms[roomIndex],
        seasons: [...(rooms[roomIndex].seasons || []), newSeason],
      };
      return { ...prev, rooms };
    });
    const newSeasonIdx = hotelData.rooms[roomIndex].seasons?.length || 0;
    setOpenSeasons((prev) => ({
      ...prev,
      [`${roomIndex}-${newSeasonIdx}`]: true,
    }));
  };

  const removeSeason = (roomIndex, seasonIndex) => {
    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const seasons = rooms[roomIndex].seasons.filter(
        (_, i) => i !== seasonIndex,
      );
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  // ── Save / Delete ─────────────────────────────────────────────────────

  const handleSave = async () => {
    // Block save if any room has overlapping season dates
    if (hasAnyOverlap(hotelData.rooms)) {
      toast.error("Please resolve overlapping season dates before saving.");
      return;
    }

    const validation = validateHotelData(hotelData);
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    const loadingToast = toast.loading("Updating hotel...");
    try {
      const success = await updateHotelComplete(hotel.id, hotelData);
      toast.dismiss(loadingToast);
      if (success) {
        if (onSave) onSave(hotelData);
        onClose();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error in handleSave:", error);
      toast.error("Failed to save hotel");
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${hotelData.name}"? This action cannot be undone.`,
      )
    )
      return;

    const loadingToast = toast.loading("Deleting hotel...");
    try {
      const success = await deleteHotelFromDB(hotel.id);
      toast.dismiss(loadingToast);
      if (success) {
        if (onDelete) onDelete(hotel.id);
        onClose();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error deleting hotel:", error);
      toast.error("Failed to delete hotel");
    }
  };

  // ── Clone with overlap check ──────────────────────────────────────────

  const handleCloneConfirm = () => {
    const { roomIndex, seasonIndex } = cloneContext;
    const { name, start, end } = cloneForm;

    if (!name || !start || !end) {
      toast.error("Fill all fields");
      return;
    }

    // Check if cloned season dates would overlap with any existing season (except itself)
    const room = hotelData.rooms[roomIndex];
    const overlappingWithClone = room.seasons.filter((s, i) => {
      if (i === seasonIndex) return false; // skip source
      if (s.name === name) return false; // will be overwritten, handled separately
      return rangesOverlap(start, end, s.start, s.end);
    });

    if (overlappingWithClone.length > 0) {
      const conflictNames = overlappingWithClone
        .map((s) => `"${s.name || "Unnamed Season"}"`)
        .join(", ");
      toast.error(
        `Cloned dates overlap with existing season(s): ${conflictNames}. Please choose different dates.`,
      );
      return;
    }

    setHotelData((prev) => {
      const rooms = [...prev.rooms];
      const sourceSeason = rooms[roomIndex].seasons[seasonIndex];
      const exists = rooms[roomIndex].seasons.some((s) => s.name === name);

      if (exists) {
        setPendingClone({ roomIndex, seasonIndex });
        setShowOverwriteConfirm(true);
        return prev;
      }

      const clonedSeason = {
        name,
        start,
        end,
        pricing: JSON.parse(JSON.stringify(sourceSeason.pricing)),
      };

      const seasons = [...rooms[roomIndex].seasons, clonedSeason];
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });

    toast.success("Rates cloned");
    setCloneForm({ name: "", start: "", end: "" });
    setShowCloneModal(false);
  };

  // Compute overlap data for all rooms
  const roomOverlapMaps = hotelData.rooms.map((room) =>
    getSeasonOverlapsForRoom(room.seasons || []),
  );
  const anyOverlap = roomOverlapMaps.some((m) => m.size > 0);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-xl font-semibold">Edit Hotel</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Update hotel information and pricing
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <CardContent className="p-6 space-y-6">
            {/* Global overlap warning banner */}
            {anyOverlap && (
              <Alert variant="destructive" className="border-red-400 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  One or more seasons have overlapping date ranges. Please
                  resolve all conflicts before saving. Conflicting seasons are
                  highlighted below.
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Hotel Name *</Label>
                  <Input
                    name="name"
                    value={hotelData.name}
                    onChange={handleHotelChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input
                    name="city"
                    value={hotelData.city}
                    onChange={handleHotelChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Input
                    name="state"
                    value={hotelData.state}
                    onChange={handleHotelChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Star Rating</Label>
                  <Input
                    name="rating"
                    value={hotelData.rating}
                    onChange={handleHotelChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Google Review Rating</Label>
                  <Input
                    name="GoogleReviewRating"
                    value={hotelData.GoogleReviewRating}
                    onChange={handleHotelChange}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Google Listing URL</Label>
                  <Input
                    name="GoogleListingURL"
                    value={hotelData.GoogleListingURL}
                    onChange={handleHotelChange}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Rooms Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Room Categories
                </h3>
                <Button
                  onClick={addRoomCategory}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Category
                </Button>
              </div>

              {hotelData.rooms?.map((room, roomIndex) => {
                const overlapMap = roomOverlapMaps[roomIndex];
                const roomHasConflict = overlapMap.size > 0;

                return (
                  <Card
                    key={roomIndex}
                    className={`border ${roomHasConflict ? "border-red-300" : "border-gray-200"}`}
                  >
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Input
                          placeholder="Room category name"
                          value={room.categoryName}
                          onChange={(e) =>
                            handleRoomChange(
                              roomIndex,
                              "categoryName",
                              e.target.value,
                            )
                          }
                          className="max-w-md bg-white"
                        />
                        {roomHasConflict && (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1 text-xs"
                          >
                            <AlertTriangle className="h-3 w-3" /> Date Conflict
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => addSeasonToRoom(roomIndex)}
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Season
                        </Button>
                        <Button
                          onClick={() => removeRoomCategory(roomIndex)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-2">
                      {room.seasons?.map((season, seasonIndex) => {
                        const isOpen =
                          openSeasons[`${roomIndex}-${seasonIndex}`];
                        const availablePlans = ["ep", "cp", "map", "ap"];
                        const activePlans = Object.keys(season.pricing || {});
                        const missingPlans = availablePlans.filter(
                          (p) => !activePlans.includes(p),
                        );
                        const conflictingWith = overlapMap.get(seasonIndex); // array of season names, or undefined
                        const hasConflict = !!conflictingWith;

                        return (
                          <div
                            key={seasonIndex}
                            className={`rounded-lg border overflow-hidden ${hasConflict ? "border-red-400 ring-1 ring-red-300" : "border-gray-200"}`}
                          >
                            {/* Season header */}
                            <div
                              onClick={() =>
                                toggleSeason(roomIndex, seasonIndex)
                              }
                              className={`flex items-center justify-between p-3 cursor-pointer ${
                                hasConflict
                                  ? "bg-red-50 hover:bg-red-100"
                                  : isOpen
                                    ? "bg-theme-primary/5"
                                    : "bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4 shrink-0" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0" />
                                )}
                                <span className="font-medium text-sm truncate">
                                  {season.name || "Unnamed Season"}
                                </span>
                                {season.start && season.end && (
                                  <span className="text-xs text-muted-foreground">
                                    {season.start} → {season.end}
                                  </span>
                                )}
                                {hasConflict && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] flex items-center gap-1 shrink-0"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Overlaps: {conflictingWith.join(", ")}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-2 shrink-0">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCloneContext({ roomIndex, seasonIndex });
                                    setShowCloneModal(true);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-500 h-7 text-xs"
                                >
                                  Clone Rates
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSeasonToDelete({
                                      roomIndex,
                                      seasonIndex,
                                    });
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Conflict inline alert */}
                            {hasConflict && (
                              <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-700">
                                  <span className="font-semibold">
                                    Date conflict:
                                  </span>{" "}
                                  This season's dates overlap with{" "}
                                  <span className="font-semibold">
                                    {conflictingWith.join(", ")}
                                  </span>
                                  . Please adjust the start/end dates to resolve
                                  this conflict.
                                </p>
                              </div>
                            )}

                            {/* Season body */}
                            {isOpen && (
                              <div className="p-4 space-y-4 bg-white">
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">
                                      Season Name
                                    </Label>
                                    <Input
                                      value={season.name}
                                      onChange={(e) =>
                                        handleSeasonChange(
                                          roomIndex,
                                          seasonIndex,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">
                                      Start Date
                                    </Label>
                                    <Input
                                      type="date"
                                      value={season.start}
                                      onChange={(e) =>
                                        handleSeasonChange(
                                          roomIndex,
                                          seasonIndex,
                                          "start",
                                          e.target.value,
                                        )
                                      }
                                      className={`h-8 ${hasConflict ? "border-red-400 focus:border-red-500 bg-red-50" : ""}`}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">End Date</Label>
                                    <Input
                                      type="date"
                                      value={season.end}
                                      onChange={(e) =>
                                        handleSeasonChange(
                                          roomIndex,
                                          seasonIndex,
                                          "end",
                                          e.target.value,
                                        )
                                      }
                                      className={`h-8 ${hasConflict ? "border-red-400 focus:border-red-500 bg-red-50" : ""}`}
                                    />
                                  </div>
                                </div>

                                {/* Meal Plans & Pricing */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                                      <Utensils className="h-3.5 w-3.5" /> Meal
                                      Plans & Pricing
                                    </Label>
                                    {missingPlans.length > 0 && (
                                      <div className="flex gap-1">
                                        {missingPlans.map((plan) => (
                                          <Button
                                            key={plan}
                                            onClick={() =>
                                              addMealPlan(
                                                roomIndex,
                                                seasonIndex,
                                                plan,
                                              )
                                            }
                                            className="text-[10px] h-6 px-2 bg-slate-100 uppercase text-slate-700 hover:bg-slate-200"
                                            variant="ghost"
                                          >
                                            + {plan}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {activePlans.length > 0 ? (
                                    <table className="w-full text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50">
                                          <th className="text-left p-2 font-medium">
                                            Plan
                                          </th>
                                          <th className="p-2 font-medium">
                                            Double
                                          </th>
                                          <th className="p-2 font-medium">
                                            Extra Adult
                                          </th>
                                          <th className="p-2 font-medium">
                                            Extra Child
                                          </th>
                                          <th className="p-2 font-medium">
                                            CNB
                                          </th>
                                          <th className="p-2 w-8"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {activePlans.map((plan) => (
                                          <tr
                                            key={plan}
                                            className="border-t border-slate-100"
                                          >
                                            <td className="p-2">
                                              <Badge
                                                variant="outline"
                                                className="uppercase text-[10px]"
                                              >
                                                {plan}
                                              </Badge>
                                            </td>
                                            {[
                                              "double",
                                              "extraAdult",
                                              "extraChild",
                                              "cnb",
                                            ].map((type) => (
                                              <td key={type} className="p-1">
                                                <div className="relative">
                                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                                    ₹
                                                  </span>
                                                  <Input
                                                    type="number"
                                                    value={
                                                      season.pricing?.[plan]?.[
                                                        type
                                                      ] ?? 0
                                                    }
                                                    onChange={(e) =>
                                                      handlePricingChange(
                                                        roomIndex,
                                                        seasonIndex,
                                                        plan,
                                                        type,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="h-8 pl-6"
                                                  />
                                                </div>
                                              </td>
                                            ))}
                                            <td className="p-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                  removeMealPlan(
                                                    roomIndex,
                                                    seasonIndex,
                                                    plan,
                                                  )
                                                }
                                                className="h-7 w-7 text-slate-400 hover:text-red-500"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-3">
                                      No meal plans added. Add one using the
                                      buttons above.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <Button
            onClick={handleDelete}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Hotel
          </Button>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={anyOverlap}
              title={
                anyOverlap
                  ? "Resolve overlapping season dates before saving"
                  : undefined
              }
              className={anyOverlap ? "opacity-50 cursor-not-allowed" : ""}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Clone Modal */}
      {showCloneModal && cloneContext && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-base">Clone Season Rates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cloned rates will be copied from{" "}
                <span className="font-medium">
                  {hotelData.rooms[cloneContext.roomIndex]?.seasons[
                    cloneContext.seasonIndex
                  ]?.name || "Unnamed Season"}
                </span>
                .
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">New Season Name</Label>
                <Input
                  placeholder="e.g. Peak Season 2025"
                  value={cloneForm.name}
                  onChange={(e) =>
                    setCloneForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={cloneForm.start}
                  onChange={(e) =>
                    setCloneForm((f) => ({ ...f, start: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={cloneForm.end}
                  onChange={(e) =>
                    setCloneForm((f) => ({ ...f, end: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCloneModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCloneConfirm}>Clone</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overwrite Confirm */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Overwrite
                Season?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A season named{" "}
                <span className="font-medium">"{cloneForm.name}"</span> already
                exists. Do you want to overwrite its rates?
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOverwriteConfirm(false);
                    setPendingClone(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const { roomIndex, seasonIndex } = pendingClone;
                    setHotelData((prev) => {
                      const rooms = [...prev.rooms];
                      const source = rooms[roomIndex].seasons[seasonIndex];
                      const seasons = rooms[roomIndex].seasons.map((s) =>
                        s.name === cloneForm.name
                          ? {
                              name: cloneForm.name,
                              start: cloneForm.start,
                              end: cloneForm.end,
                              pricing: JSON.parse(
                                JSON.stringify(source.pricing),
                              ),
                            }
                          : s,
                      );
                      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
                      return { ...prev, rooms };
                    });
                    toast.success("Rates overwritten");
                    setShowOverwriteConfirm(false);
                    setShowCloneModal(false);
                    setCloneForm({ name: "", start: "", end: "" });
                  }}
                >
                  Overwrite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Season Confirm */}
      {seasonToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" /> Delete Season
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium">
                  "
                  {hotelData.rooms[seasonToDelete.roomIndex]?.seasons[
                    seasonToDelete.seasonIndex
                  ]?.name || "this season"}
                  "
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSeasonToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const { roomIndex, seasonIndex } = seasonToDelete;
                    removeSeason(roomIndex, seasonIndex);
                    toast.success("Season deleted successfully");
                    setSeasonToDelete(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EditHotel;
