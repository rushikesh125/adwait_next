import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  PenLine,
  Plus,
  X,
  Activity,
  CheckCircle2,
} from "lucide-react";

const ActivitySelector = ({ selectedState, initialActivities = [], onDone }) => {
  const [activities, setActivities] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [selected, setSelected] = useState(initialActivities);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "", city: "", state: selectedState || "", description: "", participants: 1, pricePerPerson: 0,
  });

  useEffect(() => {
    if (!selectedState) return;
    setIsFetching(true);
    getDocs(query(collection(db, "activities"), where("state", "==", selectedState)))
      .then((snap) => setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [selectedState]);

  const totalPrice = selected.reduce((s, a) => s + (a.totalPrice || 0), 0);

  const addActivity = (act) => {
    if (selected.some((a) => a.name === act.name)) { alert("Already added."); return; }
    const entry = {
      name: act.name, city: act.city, state: act.state,
      fitRatePerPerson: act.fitRatePerPerson || 0,
      groupRatePerPerson: act.groupRatePerPerson || 0,
      participants: 1,
      totalPrice: parseFloat(act.fitRatePerPerson || act.groupRatePerPerson || 0),
      isCustom: false,
    };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
  };

  const updateParticipants = (idx, val) => {
    const n = parseInt(val) || 1;
    const updated = selected.map((a, i) => {
      if (i !== idx) return a;
      const rate = a.isCustom ? a.pricePerPerson || 0 : n > 10 ? a.groupRatePerPerson : a.fitRatePerPerson;
      return { ...a, participants: n, totalPrice: rate * n };
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
    const totalPrice = (parseFloat(customForm.pricePerPerson) || 0) * (parseInt(customForm.participants) || 1);
    const entry = { ...customForm, isCustom: true, totalPrice, fitRatePerPerson: customForm.pricePerPerson, groupRatePerPerson: customForm.pricePerPerson };
    const updated = [...selected, entry];
    setSelected(updated);
    onDone?.(updated, updated.reduce((s, a) => s + (a.totalPrice || 0), 0));
    setShowCustomForm(false);
    setCustomForm({ name: "", city: "", state: selectedState || "", description: "", participants: 1, pricePerPerson: 0 });
  };

  return (
    <div className="space-y-4">
      {isFetching ? (
        <p className="text-sm text-muted-foreground">Loading activities…</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activities found for {selectedState}.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activities.map((act) => {
            const isAdded = selected.some((a) => a.name === act.name);
            return (
              <button
                key={act.id} onClick={() => !isAdded && addActivity(act)} disabled={isAdded}
                className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                  isAdded ? "border-green-300 bg-green-50" : "border-slate-200 hover:border-theme-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{act.name}</p>
                  {isAdded && <CheckCircle className="h-4 w-4 text-green-600" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  📍 {act.city} • ₹{(act.fitRatePerPerson || act.groupRatePerPerson || 0).toLocaleString()}/person
                </p>
              </button>
            );
          })}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => setShowCustomForm((p) => !p)} className="text-xs border-theme-primary/40 text-theme-primary">
        <PenLine className="h-3 w-3 mr-1" /> Add Custom Activity
      </Button>
      {showCustomForm && (
        <Card className="border-dashed border-2 border-theme-primary/40 bg-theme-muted/10">
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">Activity Name *</Label>
                <Input value={customForm.name} onChange={(e) => setCustomForm((p) => ({ ...p, name: e.target.value }))} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City *</Label>
                <Input value={customForm.city} onChange={(e) => setCustomForm((p) => ({ ...p, city: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Participants</Label>
                <Input type="number" min="1" value={customForm.participants} onChange={(e) => setCustomForm((p) => ({ ...p, participants: parseInt(e.target.value) || 1 }))} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price/Person (₹)</Label>
                <Input type="number" min="0" value={customForm.pricePerPerson} onChange={(e) => setCustomForm((p) => ({ ...p, pricePerPerson: parseFloat(e.target.value) || 0 }))} className="text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-theme-primary">₹{((parseFloat(customForm.pricePerPerson) || 0) * (parseInt(customForm.participants) || 1)).toFixed(0)}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCustomForm(false)} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={addCustomActivity} className="bg-theme-primary hover:bg-theme-secondary text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {selected.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selected Activities</p>
          {selected.map((act, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-white border rounded-xl text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">{act.name}</p>
                  {act.isCustom && <Badge variant="outline" className="text-[10px] px-1.5">Custom</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">📍 {act.city}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input type="number" min="1" value={act.participants} onChange={(e) => updateParticipants(i, e.target.value)} className="w-16 h-7 text-xs text-center" />
                <span className="text-xs text-muted-foreground">pax</span>
                <span className="text-xs font-bold text-theme-primary w-20 text-right">₹{act.totalPrice?.toFixed(0)}</span>
                <button onClick={() => removeActivity(i)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Activities Total</span>
            <span className="text-theme-primary">₹{totalPrice.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivitySelector;