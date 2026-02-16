"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { fetchActivities, fetchLocations } from "@/firebase/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Users, Ticket } from "lucide-react";

const ActivitySection = ({ onActivitiesChange }) => {
  /* ───────────── State ───────────── */
  const [locations, setLocations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(false);

  // Selection
  const [pricingType, setPricingType] = useState("fit"); // fit | group
  const [selectedItems, setSelectedItems] = useState([]);


  /* ───────────── Load States ───────────── */
  useEffect(() => {
    let active = true;
    fetchLocations().then((data) => {
      if (active) setLocations(data);
    });
    return () => {
      active = false;
    };
  }, []);

  /* ───────────── Load Activities by State ───────────── */
useEffect(() => {
  let active = true;

  const loadActivities = async () => {
    if (!selectedState) {
      if (active) setActivities([]);
      return;
    }

    try {
      setLoading(true);
      const allActs = await fetchActivities();
      if (!active) return;

      const filtered = allActs.filter(
        (a) => a.state === selectedState
      );

      setActivities(filtered);
    } catch (err) {
      console.error("Error loading activities:", err);
    } finally {
      if (active) setLoading(false);
    }
  };

  loadActivities();

  return () => {
    active = false;
  };
}, [selectedState]);


  /* ───────────── Propagate to Parent ───────────── */
  useEffect(() => {
    const total = selectedItems.reduce(
      (sum, item) => sum + (item.totalPrice || 0),
      0
    );
    onActivitiesChange(selectedItems, total);
  }, [selectedItems, onActivitiesChange]);

  /* ───────────── Handlers ───────────── */
  const handleToggleActivity = useCallback(
    (activity) => {
      setSelectedItems((prev) => {
        const exists = prev.find(
          (item) =>
            item.id === activity.id &&
            item.pricingType === pricingType
        );

        if (exists) {
          return prev.filter(
            (item) =>
              !(
                item.id === activity.id &&
                item.pricingType === pricingType
              )
          );
        }

        const rate =
          pricingType === "fit"
            ? Number(activity.fitRatePerPerson || 0)
            : Number(activity.groupRatePerPerson || 0);

        const participants = pricingType === "fit" ? 1 : 10;

        return [
          ...prev,
          {
            ...activity,
            pricingType,
            participants,
            rate,
            totalPrice: rate * participants,
          },
        ];
      });
    },
    [pricingType]
  );

  const handleParticipantChange = useCallback(
    (id, type, value) => {
      const count = Math.max(
        type === "group" ? 10 : 1,
        parseInt(value, 10) || 0
      );

      setSelectedItems((prev) =>
        prev.map((item) =>
          item.id === id && item.pricingType === type
            ? {
                ...item,
                participants: count,
                totalPrice: item.rate * count,
              }
            : item
        )
      );
    },
    []
  );

  /* ───────────── Totals ───────────── */
  const totalCost = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + (item.totalPrice || 0),
        0
      ),
    [selectedItems]
  );

  return (
    <Card className="border-t-4 border-theme-accent shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-theme-dark">
          <Ticket className="w-5 h-5" />
          Activities & Sightseeing
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between bg-gray-50 p-4 rounded-lg">
          <div className="w-full md:w-1/3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">
              Filter by State
            </label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">-- Select State --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded border">
            <span
              className={`text-sm font-bold ${
                pricingType === "fit"
                  ? "text-theme-primary"
                  : "text-gray-400"
              }`}
            >
              FIT
            </span>
            <Switch
              checked={pricingType === "group"}
              onCheckedChange={(v) =>
                setPricingType(v ? "group" : "fit")
              }
            />
            <span
              className={`text-sm font-bold ${
                pricingType === "group"
                  ? "text-theme-primary"
                  : "text-gray-400"
              }`}
            >
              Group
            </span>
          </div>
        </div>

        {/* Activity List */}
        {selectedState && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {loading && (
              <p className="text-sm text-gray-500">
                Loading activities…
              </p>
            )}

            {!loading &&
              activities.map((act) => {
                const item = selectedItems.find(
                  (i) =>
                    i.id === act.id &&
                    i.pricingType === pricingType
                );

                const rate =
                  pricingType === "fit"
                    ? act.fitRatePerPerson
                    : act.groupRatePerPerson;

                return (
                  <div
                    key={act.id}
                    className={`flex justify-between items-center p-3 rounded border ${
                      item
                        ? "bg-theme-muted/20 border-theme-accent"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex gap-3 items-center flex-1">
                      <Checkbox
                        checked={!!item}
                        onCheckedChange={() =>
                          handleToggleActivity(act)
                        }
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {act.name}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={10} />
                          {act.city} • ₹{rate}/person
                        </p>
                      </div>
                    </div>

                    {item && (
                      <div className="flex items-center gap-2">
                        <Users size={14} />
                        <input
                          type="number"
                          min={pricingType === "group" ? 10 : 1}
                          className="w-16 p-1 border rounded text-center text-sm"
                          value={item.participants}
                          onChange={(e) =>
                            handleParticipantChange(
                              act.id,
                              pricingType,
                              e.target.value
                            )
                          }
                        />
                        <span className="text-sm font-bold text-theme-primary w-20 text-right">
                          ₹{item.totalPrice}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-theme-muted/50 p-4 rounded-lg border">
            <h4 className="text-sm font-bold mb-2">
              Activities Summary
            </h4>
            {selectedItems.map((item, i) => (
              <div
                key={`${item.id}-${item.pricingType}-${i}`}
                className="flex justify-between text-sm text-gray-600"
              >
                <span>
                  {item.name} ({item.pricingType.toUpperCase()}) x{" "}
                  {item.participants}
                </span>
                <span>₹{item.totalPrice}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>Total Activity Cost</span>
              <span className="text-theme-primary">
                ₹{totalCost}
              </span>
            </div>
          </div>
        )}

      </CardContent>
      

    </Card>
  );
};

export default ActivitySection;
