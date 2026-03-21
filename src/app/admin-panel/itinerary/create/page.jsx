"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  Save,
  GripVertical,
  Info,
  Minus,
  X,
  Loader2,
} from "lucide-react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/firebase/config";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";

export default function CreateItineraryTemplate() {
  const router = useRouter();

  // --- States ---
  const [states, setStates] = useState([]);
  const [isFetchingStates, setIsFetchingStates] = useState(true);
  const [availableActivities, setAvailableActivities] = useState([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState(false);

  const [metadata, setMetadata] = useState({
    title: "",
    state: "",
    city: "",
    nights: 1,
  });

  const [days, setDays] = useState([
    { id: "day-1", dayNumber: 1, title: "", description: "", activityIds: [] },
    { id: "day-2", dayNumber: 2, title: "", description: "", activityIds: [] },
  ]);

  // --- 1. Fetch Unique States from 'locations' ---
  useEffect(() => {
    async function fetchLocations() {
      try {
        const querySnapshot = await getDocs(collection(db, "locations"));
        const rawStates = querySnapshot.docs
          .map((doc) => doc.data().name)
          .filter(Boolean);
        const uniqueStates = [...new Set(rawStates)].sort();
        setStates(uniqueStates);
      } catch (error) {
        console.error("Firebase Error:", error);
        toast.error("Could not fetch states");
      } finally {
        setIsFetchingStates(false);
      }
    }
    fetchLocations();
  }, []);

  // --- 2. Fetch Activities based on State -> Location -> Activity IDs ---
  useEffect(() => {
    if (!metadata.state) {
      setAvailableActivities([]);
      return;
    }

    async function fetchLinkedActivities() {
  setIsFetchingActivities(true);
  try {
    const locationsRef = collection(db, "locations");
    const q = query(locationsRef, where("name", "==", metadata.state));
    const locationSnap = await getDocs(q);

    if (locationSnap.empty) {
      setAvailableActivities([]);
      return;
    }

    const locationData = locationSnap.docs[0].data();
    
    // --- NEW NESTED LOGIC ---
    // 1. Get the 'cities' array from the doc
    const citiesArray = locationData.cities || [];
    
    // 2. Extract all activityIds from every city in that state and flatten them
    const allActivityIds = citiesArray.flatMap(city => city.activityIds || []);

    // 3. Remove duplicates just in case
    const uniqueIds = [...new Set(allActivityIds)];

    if (uniqueIds.length > 0) {
      const activitiesRef = collection(db, "activities");
      // Use documentId() and chunk the query if more than 30
      const activitiesQuery = query(
        activitiesRef,
        where(documentId(), "in", uniqueIds.slice(0, 30))
      );

      const activitiesSnap = await getDocs(activitiesQuery);
      const fetched = activitiesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAvailableActivities(fetched);
    } else {
      setAvailableActivities([]);
    }
  } catch (error) {
    console.error("Error fetching activities:", error);
    toast.error("Error linking activities");
  } finally {
    setIsFetchingActivities(false);
  }
}

    fetchLinkedActivities();
  }, [metadata.state]);

  // --- 3. Handlers ---
  const updateNights = (val) => {
    const newNights = Math.max(0, metadata.nights + val);
    setMetadata((prev) => ({ ...prev, nights: newNights }));

    const targetDayCount = newNights + 1;
    setDays((prevDays) => {
      if (targetDayCount > prevDays.length) {
        const extra = Array.from(
          { length: targetDayCount - prevDays.length },
          (_, i) => ({
            id: `day-${prevDays.length + i + 1}-${Date.now()}`,
            dayNumber: prevDays.length + i + 1,
            title: "",
            description: "",
            activityIds: [],
          })
        );
        return [...prevDays, ...extra];
      }
      return prevDays.slice(0, targetDayCount);
    });
  };

  const addActivityToDay = (dayIdx, activityId) => {
    setDays((prev) => {
      const newDays = [...prev];
      if (!newDays[dayIdx].activityIds.includes(activityId)) {
        newDays[dayIdx].activityIds = [...newDays[dayIdx].activityIds, activityId];
      }
      return newDays;
    });
  };

  const removeActivityFromDay = (dayIdx, activityId) => {
    setDays((prev) => {
      const newDays = [...prev];
      newDays[dayIdx].activityIds = newDays[dayIdx].activityIds.filter(id => id !== activityId);
      return newDays;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Itinerary</h1>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <Save className="w-4 h-4 mr-2" /> Save Template
        </Button>
      </header>

      <main className="max-w-4xl mx-auto mt-8 px-4 space-y-6">
        {/* Template Metadata Card */}
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-md font-semibold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4" /> Template Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Template Title *</Label>
              <Input 
                placeholder="Ex: Royal Rajasthan Heritage" 
                value={metadata.title}
                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={metadata.state} onValueChange={(val) => setMetadata({ ...metadata, state: val })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={isFetchingStates ? "Loading..." : "Select State"} />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>City *</Label>
                <Input 
                  placeholder="Ex: Jaipur" 
                  value={metadata.city}
                  onChange={(e) => setMetadata({ ...metadata, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Nights</Label>
                <div className="flex items-center border rounded-md h-10 px-1 bg-white">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateNights(-1)}><Minus className="w-4 h-4" /></Button>
                  <span className="flex-1 text-center font-bold text-blue-600">{metadata.nights}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateNights(1)}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Plan */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Days Plan</h2>
          {days.map((day, idx) => (
            <Card key={day.id} className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-b">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Day {day.dayNumber}</span>
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
              </div>
              <CardContent className="p-5 space-y-4">
                <Input
                  placeholder="Day Heading..."
                  className="border-0 border-b rounded-none text-lg font-bold focus-visible:ring-0 shadow-none px-0"
                  value={day.title}
                  onChange={(e) => {
                    const d = [...days];
                    d[idx].title = e.target.value;
                    setDays(d);
                  }}
                />
                <Textarea
                  placeholder="Describe the day..."
                  className="bg-slate-50/50 min-h-[80px]"
                  value={day.description}
                  onChange={(e) => {
                    const d = [...days];
                    d[idx].description = e.target.value;
                    setDays(d);
                  }}
                />

                <div className="space-y-3 pt-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Activities</Label>
                  <div className="flex flex-wrap gap-2">
                    {day.activityIds.map((actId) => {
                      const activity = availableActivities.find((a) => a.id === actId);
                      return (
                        <Badge key={actId} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-2 py-1 flex items-center gap-1">
                          {activity?.name || "Loading..."}
                          <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeActivityFromDay(idx, actId)} />
                        </Badge>
                      );
                    })}
                  </div>

                  {/* FIXED ACTION BUTTON */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full md:w-[200px] h-8 text-xs border-dashed border-slate-300">
                        {isFetchingActivities ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Plus className="w-3 h-3 mr-2" />}
                        Add Activity
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[240px]">
                      {availableActivities.length > 0 ? (
                        availableActivities.map((activity) => (
                          <DropdownMenuItem 
                            key={activity.id} 
                            onClick={() => addActivityToDay(idx, activity.id)}
                            className="flex flex-col items-start cursor-pointer"
                            disabled={day.activityIds.includes(activity.id)}
                          >
                            <span className="font-medium">{activity.name}</span>
                            <span className="text-[10px] text-slate-500">₹{activity.fitRatePerPerson} / person</span>
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <div className="p-2 text-xs text-slate-500 text-center">
                          {metadata.state ? "No activities linked to this state" : "Select a state first"}
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}