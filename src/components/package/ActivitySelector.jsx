import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, PenLine, Plus, X } from "lucide-react";

const ActivitySelector = ({ selectedState, initialActivities = [], onDone }) => {
  const [activities, setActivities] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [selected, setSelected] = useState(initialActivities);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "",
    city: "",
    state: selectedState || "",
    description: "",
    participants: 1,
    pricePerPerson: 0,
  });

  useEffect(() => {
    if (!selectedState) return;
    setIsFetching(true);
    getDocs(query(collection(db, "activities"), where("state", "==", selectedState)))
      .then((snap) =>
        setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      )
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [selectedState]);

  const totalPrice = selected.reduce((s, a) => s + (a.totalPrice || 0), 0);

  const addActivity = (act) => {
    if (selected.some((a) => a.name === act.name)) {
      alert("Already added.");
      return;
    }
    const entry = {
      name: act.name,
      city: act.city,
      state: act.state,
      // Support both new tier format and old fitRate/groupRate format
      pricingTiers: act.pricingTiers || [
        { minPax: 1, maxPax: 10, pricePerPerson: act.fitRatePerPerson || 0, pricingType: "per_person" },
        { minPax: 11, maxPax: null, pricePerPerson: act.groupRatePerPerson || 0, pricingType: "per_person" }
      ],
      fitRatePerPerson: act.fitRatePerPerson || 0,
      groupRatePerPerson: act.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: 0,
      applicableTier: null,
      isCustom: false,
    };
    // Calculate initial price
    const priceInfo = getPriceForParticipants(entry.pricingTiers, 1);
    entry.totalPrice = priceInfo.isFlat ? priceInfo.totalPrice : priceInfo.pricePerPerson;
    entry.applicableTier = priceInfo.tier;
    entry.isFlat = priceInfo.isFlat || false;
    
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const getPriceForParticipants = (pricingTiers, pax) => {
    if (!pricingTiers || pricingTiers.length === 0) return { pricePerPerson: 0, tier: null };
    
    const applicableTier = pricingTiers.find(tier => 
      pax >= tier.minPax && (tier.maxPax === null || pax <= tier.maxPax)
    );
    
    if (!applicableTier) return { pricePerPerson: 0, tier: null };
    
    // Calculate price based on pricing type
    const pricingType = applicableTier.pricingType || "per_person";
    let pricePerPerson = applicableTier.pricePerPerson || 0;
    
    if (pricingType === "flat_fee") {
      // For flat fee, divide the total by pax to get per-person equivalent for display
      // But store the actual total separately
      return {
        pricePerPerson: applicableTier.pricePerPerson,
        tier: applicableTier,
        totalPrice: applicableTier.pricePerPerson, // Flat fee doesn't multiply by pax
        isFlat: true
      };
    } else {
      // For per_person, multiply normally
      return {
        pricePerPerson,
        tier: applicableTier,
        isFlat: false
      };
    }
  };

  const updateParticipants = (idx, val) => {
    const n = parseInt(val) || 1;
    const updated = selected.map((a, i) => {
      if (i !== idx) return a;
      
      let rate = 0;
      let totalPrice = 0;
      let applicableTier = null;
      let isFlat = false;
      
      if (a.isCustom) {
        rate = a.pricePerPerson || 0;
        totalPrice = rate * n;
      } else {
        const priceInfo = getPriceForParticipants(a.pricingTiers, n);
        applicableTier = priceInfo.tier;
        isFlat = priceInfo.isFlat || false;
        
        if (isFlat) {
          // Flat fee: total stays same regardless of participants
          totalPrice = priceInfo.totalPrice;
          rate = priceInfo.totalPrice;
        } else {
          // Per person: multiply by participants
          rate = priceInfo.pricePerPerson;
          totalPrice = rate * n;
        }
      }
      
      return { 
        ...a, 
        participants: n, 
        totalPrice,
        applicableTier,
        isFlat
      };
    });
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const removeActivity = (idx) => {
    const updated = selected.filter((_, i) => i !== idx);
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const addCustomActivity = () => {
    if (!customForm.name.trim()) { alert("Activity name is required."); return; }
    if (!customForm.city.trim()) { alert("City is required."); return; }
    const totalPrice =
      (parseFloat(customForm.pricePerPerson) || 0) *
      (parseInt(customForm.participants) || 1);
    const entry = {
      ...customForm,
      isCustom: true,
      totalPrice,
      pricingTiers: [
        { minPax: 1, maxPax: null, pricePerPerson: customForm.pricePerPerson, pricingType: "per_person" }
      ],
      fitRatePerPerson: customForm.pricePerPerson,
      groupRatePerPerson: customForm.pricePerPerson,
      applicableTier: null,
      isFlat: false,
    };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
    setShowCustomForm(false);
    setCustomForm({
      name: "",
      city: "",
      state: selectedState || "",
      description: "",
      participants: 1,
      pricePerPerson: 0,
    });
  };

  return (
    <div className="space-y-3">
      {/* Available activities grid */}
      {isFetching ? (
        <p className="text-xs text-muted-foreground">Loading activities…</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No activities found for {selectedState}.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {activities.map((act) => {
            const isAdded = selected.some((a) => a.name === act.name);
            return (
              <button
                key={act.id}
                onClick={() => !isAdded && addActivity(act)}
                disabled={isAdded}
                className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                  isAdded
                    ? "border-green-300 bg-green-50"
                    : "border-slate-200 hover:border-theme-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold truncate">{act.name}</p>
                  {isAdded && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  📍 {act.city} · ₹
                  {(act.fitRatePerPerson || act.groupRatePerPerson || 0).toLocaleString()}
                  /person
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Custom Activity toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomForm((p) => !p)}
        className="text-xs h-7 border-theme-primary/40 text-theme-primary"
      >
        <PenLine className="h-3 w-3 mr-1" /> Add Custom Activity
      </Button>

      {showCustomForm && (
        <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[10px]">Activity Name *</Label>
                <Input
                  value={customForm.name}
                  onChange={(e) =>
                    setCustomForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="text-xs h-7"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">City *</Label>
                <Input
                  value={customForm.city}
                  onChange={(e) =>
                    setCustomForm((p) => ({ ...p, city: e.target.value }))
                  }
                  className="text-xs h-7"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Participants</Label>
                <Input
                  type="number"
                  min="1"
                  value={customForm.participants}
                  onChange={(e) =>
                    setCustomForm((p) => ({
                      ...p,
                      participants: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="text-xs h-7"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Price/Person (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={customForm.pricePerPerson}
                  onChange={(e) =>
                    setCustomForm((p) => ({
                      ...p,
                      pricePerPerson: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="text-xs h-7"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Total:{" "}
                <span className="font-bold text-theme-primary">
                  ₹
                  {(
                    (parseFloat(customForm.pricePerPerson) || 0) *
                    (parseInt(customForm.participants) || 1)
                  ).toFixed(0)}
                </span>
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomForm(false)}
                  className="text-xs h-7 px-2"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={addCustomActivity}
                  className="bg-theme-primary hover:bg-theme-secondary text-xs h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected activities */}
      {selected.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Selected Activities
          </p>
          {selected.map((act, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 bg-white border rounded-lg text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium truncate">{act.name}</p>
                  {act.isCustom && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 flex-shrink-0"
                    >
                      Custom
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  📍 {act.city}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  min="1"
                  value={act.participants}
                  onChange={(e) => updateParticipants(i, e.target.value)}
                  className="w-12 h-6 border rounded text-xs text-center outline-none focus:ring-1 focus:ring-theme-primary"
                />
                <span className="text-[10px] text-muted-foreground">pax</span>
                <span className="text-xs font-bold text-theme-primary w-16 text-right">
                  ₹{act.totalPrice?.toFixed(0)}
                </span>
                <button
                  onClick={() => removeActivity(i)}
                  className="text-destructive hover:bg-destructive/10 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1">
            <span>Activities Total</span>
            <span className="text-theme-primary">₹{totalPrice.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySelector;