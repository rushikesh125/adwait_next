// src/components/SelectActivities.jsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  User,
  MapPin,
  ChevronRight,
  Loader2,
  ShoppingCart,
  Trash2,
  Pencil,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { fetchAllStates, fetchActivitiesByState } from "@/firebase/activities_service";

const SelectActivities = ({ onDone }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [selectedActivitiesFit, setSelectedActivitiesFit] = useState([]);
  const [selectedActivitiesGroup, setSelectedActivitiesGroup] = useState([]);
  const [pricingType, setPricingType] = useState("fit");

  /* ---------------- Load States ---------------- */
  useEffect(() => {
    if (showDropdown && states.length === 0) {
      setLoading(true);
      fetchAllStates()
        .then(setStates)
        .finally(() => setLoading(false));
    }
  }, [showDropdown, states.length]);

  /* ---------------- Load Activities ---------------- */
  useEffect(() => {
    if (!selectedState) return;
    setActivityLoading(true);
    fetchActivitiesByState(selectedState)
      .then(setActivities)
      .finally(() => setActivityLoading(false));
  }, [selectedState]);

  /* ---------------- Toggle Activity ---------------- */
  const handleToggle = (act, type) => {
    const isFit = type === "fit";
    const list = isFit ? selectedActivitiesFit : selectedActivitiesGroup;
    const setter = isFit ? setSelectedActivitiesFit : setSelectedActivitiesGroup;

    const exists = list.find((a) => a.name === act.name);

    if (exists) {
      setter(list.filter((a) => a.name !== act.name));
    } else {
      setter([
        ...list,
        {
          ...act,
          participants: isFit ? 1 : 10,
        },
      ]);
    }
  };

  /* ---------------- Quantity Change ---------------- */
  const handleQtyChange = (name, value, type) => {
    const isFit = type === "fit";
    const setter = isFit ? setSelectedActivitiesFit : setSelectedActivitiesGroup;
    const min = isFit ? 1 : 10;
    const safeValue = Math.max(min, Number(value) || min);

    setter((prev) =>
      prev.map((a) =>
        a.name === name ? { ...a, participants: safeValue } : a
      )
    );
  };

  /* ---------------- Totals ---------------- */
  const totalFIT = selectedActivitiesFit.reduce(
    (sum, a) => sum + a.participants * Number(a.fitRatePerPerson || 0),
    0
  );

  const totalGroup = selectedActivitiesGroup.reduce(
    (sum, a) => sum + Number(a.groupRatePerPerson || 0),
    0
  );

  const totalOverall = totalFIT + totalGroup;

  /* ---------------- Finalize ---------------- */
  const handleFinalize = () => {
    const final = [
      ...selectedActivitiesFit.map((a) => ({
        ...a,
        type: "fit",
        totalPrice: a.participants * a.fitRatePerPerson,
      })),
      ...selectedActivitiesGroup.map((a) => ({
        ...a,
        type: "group",
        totalPrice: a.groupRatePerPerson, // ✅ FIXED
      })),
    ];

    onDone(final, totalOverall);
    setShowDropdown(false);
  };

  const handleClearAll = () => {
    setSelectedActivitiesFit([]);
    setSelectedActivitiesGroup([]);
  };

  /* ---------------- Closed State ---------------- */
  if (!showDropdown) {
    return (
      <div className="flex gap-4">
        <Button
          onClick={() => setShowDropdown(true)}
          className="flex-1 bg-theme-primary text-white py-6"
        >
          <MapPin className="mr-2 h-5 w-5" />
          Select Activities
        </Button>

        {(selectedActivitiesFit.length + selectedActivitiesGroup.length > 0) && (
          <Button variant="outline" onClick={() => setShowDropdown(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit ({selectedActivitiesFit.length + selectedActivitiesGroup.length})
          </Button>
        )}
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <Card className="border-theme-muted shadow-sm">
      <CardHeader className="bg-theme-muted/40">
        <div className="flex justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-theme-primary" />
              Activities & Sightseeing
            </CardTitle>
            <CardDescription>Select experiences by group size</CardDescription>
          </div>

          {(selectedActivitiesFit.length + selectedActivitiesGroup.length > 0) && (
            <Button variant="ghost" onClick={handleClearAll} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Destination */}
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <SelectValue placeholder="Select State" />
            )}
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Activities */}
        {selectedState && (
          <>
            <Tabs value={pricingType} onValueChange={setPricingType} className="mt-6">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="fit">
                  <User className="mr-2 h-4 w-4" />
                  FIT
                </TabsTrigger>
                <TabsTrigger value="group">
                  <Users className="mr-2 h-4 w-4" />
                  GROUP
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <ScrollArea className="h-[420px] mt-4 pr-4">
              {activities.map((act) => {
                const list =
                  pricingType === "fit"
                    ? selectedActivitiesFit
                    : selectedActivitiesGroup;

                const selected = list.find((a) => a.name === act.name);
                const rate =
                  pricingType === "fit"
                    ? act.fitRatePerPerson
                    : act.groupRatePerPerson;

                return (
                  <div key={act.name} className="p-4 border rounded-xl mb-3">
                    <h4 className="font-semibold">{act.name}</h4>
                    <p className="text-sm text-slate-500">{act.city}</p>

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-theme-primary font-medium">
                        ₹{rate.toLocaleString()}
                        {pricingType === "fit" && " / person"}
                      </span>

                      {selected && (
                        <Input
                          type="number"
                          min={pricingType === "fit" ? 1 : 10}
                          value={selected.participants}
                          onChange={(e) =>
                            handleQtyChange(act.name, e.target.value, pricingType)
                          }
                          className="w-20"
                        />
                      )}

                      <Button
                        size="sm"
                        variant={selected ? "destructive" : "outline"}
                        onClick={() => handleToggle(act, pricingType)}
                      >
                        {selected ? "Remove" : "Select"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>

            {/* Summary */}
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-theme-primary">
                  ₹{totalOverall.toLocaleString("en-IN")}
                </span>
              </div>

              <Button
                className="w-full mt-4 bg-theme-primary text-white py-6"
                disabled={totalOverall === 0}
                onClick={handleFinalize}
              >
                Confirm & Add to Package
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectActivities;
