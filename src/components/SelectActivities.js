"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  User,
  MapPin,
  ChevronRight,
  Loader2,
  Trash2,
  Pencil,
  Badge,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    
    // Allow empty string while typing, but default to min on blur/finalize logic
    const safeValue = value === "" ? "" : Math.max(min, Number(value));

    setter((prev) =>
      prev.map((a) =>
        a.name === name ? { ...a, participants: safeValue } : a
      )
    );
  };

  /* ---------------- Totals ---------------- */
  const totalFIT = selectedActivitiesFit.reduce(
    (sum, a) => sum + (Number(a.participants || 0) * Number(a.fitRatePerPerson || 0)),
    0
  );

  const totalGroup = selectedActivitiesGroup.reduce(
    (sum, a) => sum + (Number(a.participants || 0) * Number(a.groupRatePerPerson || 0)),
    0
  );

  const totalOverall = totalFIT + totalGroup;

  /* ---------------- Finalize ---------------- */
  const handleFinalize = () => {
    const final = [
      ...selectedActivitiesFit.map((a) => ({
        ...a,
        type: "fit",
        participants: Number(a.participants) || 1,
        totalPrice: (Number(a.participants) || 1) * a.fitRatePerPerson,
      })),
      ...selectedActivitiesGroup.map((a) => ({
        ...a,
        type: "group",
        participants: Number(a.participants) || 10,
        totalPrice: (Number(a.participants) || 10) * a.groupRatePerPerson,
      })),
    ];

    onDone(final, totalOverall);
    setShowDropdown(false);
  };

  const handleClearAll = () => {
    setSelectedActivitiesFit([]);
    setSelectedActivitiesGroup([]);
  };

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

  return (
    <Card className="border-theme-muted shadow-sm">
      <CardHeader className="bg-theme-muted/40">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-theme-primary" />
              Activities & Sightseeing
            </CardTitle>
            <CardDescription>Select experiences and adjust quantities</CardDescription>
          </div>

          {(selectedActivitiesFit.length + selectedActivitiesGroup.length > 0) && (
            <Button variant="ghost" onClick={handleClearAll} className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="w-full">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <SelectValue placeholder="Choose Destination State" />}
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedState && (
          <>
            <Tabs value={pricingType} onValueChange={setPricingType} className="mt-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="fit" className="relative">
                  <User className="mr-2 h-4 w-4" /> FIT 
                  {selectedActivitiesFit.length > 0 && <span className="ml-2 bg-theme-primary text-white text-[10px] rounded-full px-1.5">{selectedActivitiesFit.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="group" className="relative">
                  <Users className="mr-2 h-4 w-4" /> GROUP
                  {selectedActivitiesGroup.length > 0 && <span className="ml-2 bg-theme-primary text-white text-[10px] rounded-full px-1.5">{selectedActivitiesGroup.length}</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activityLoading ? (
              <div className="h-[420px] flex items-center justify-center">
                <Loader2 className="animate-spin text-theme-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[420px] mt-4 pr-4">
                {activities.map((act) => {
                  const isFit = pricingType === "fit";
                  const list = isFit ? selectedActivitiesFit : selectedActivitiesGroup;
                  const selected = list.find((a) => a.name === act.name);
                  const rate = isFit ? act.fitRatePerPerson : act.groupRatePerPerson;

                  return (
                    <div key={act.name} className={`p-4 border rounded-xl mb-3 transition-colors ${selected ? 'border-theme-primary bg-theme-primary/5' : 'bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-slate-800">{act.name}</h4>
                          <p className="text-xs text-slate-500 uppercase tracking-wide">{act.city}</p>
                        </div>
                        {/* <Badge variant="outline" className="text-theme-primary border-theme-primary/30">
                          ₹{rate.toLocaleString()} / pax
                        </Badge> */}
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                          {selected ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-slate-600">Participants:</span>
                              <Input
                                type="number"
                                min={isFit ? 1 : 10}
                                value={selected.participants}
                                onChange={(e) => handleQtyChange(act.name, e.target.value, pricingType)}
                                className="w-20 h-8 border-theme-primary"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not selected</span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={selected ? "destructive" : "outline"}
                          onClick={() => handleToggle(act, pricingType)}
                          className="h-8"
                        >
                          {selected ? "Remove" : "Add to List"}
                        </Button>
                      </div>
                      
                      {selected && (
                        <div className="mt-2 text-right">
                          <p className="text-[10px] text-slate-500">
                            Subtotal: ₹{(selected.participants * rate).toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            )}

            <div className="mt-6 border-t pt-4 bg-white">
              <div className="flex justify-between items-end mb-4">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Estimated Total</div>
                <div className="text-2xl font-black text-theme-primary italic">
                  ₹{totalOverall.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setShowDropdown(false)} className="flex-1">Cancel</Button>
                <Button
                  className="flex-[2] bg-theme-primary text-white"
                  disabled={totalOverall === 0}
                  onClick={handleFinalize}
                >
                  Confirm Selection
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SelectActivities;