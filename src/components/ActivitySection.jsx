"use client";
import React, { useState, useEffect, useMemo } from "react";
import { fetchActivities, fetchLocations } from "@/firebase/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Ensure you have this shadcn component
import { Checkbox } from "@/components/ui/checkbox"; // Ensure you have this shadcn component
import { MapPin, Users, Ticket } from "lucide-react";
import "@/components/css/SelectActivities.css"
const ActivitySection = ({ onActivitiesChange }) => {
  // State
  const [locations, setLocations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [pricingType, setPricingType] = useState("fit"); // 'fit' or 'group'
  const [selectedItems, setSelectedItems] = useState([]); 

  // Load States on mount
  useEffect(() => {
    fetchLocations().then(setLocations);
  }, []);

  // Load Activities when State changes
  useEffect(() => {
    if (!selectedState) return;
    setLoading(true);
    fetchActivities().then((allActs) => {
      const filtered = allActs.filter(a => a.state === selectedState);
      setActivities(filtered);
      setLoading(false);
    });
  }, [selectedState]);

  // Propagate changes to parent whenever selection changes
  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    onActivitiesChange(selectedItems, total);
  }, [selectedItems, onActivitiesChange]);

  // Handlers
  const handleToggleActivity = (activity) => {
    const exists = selectedItems.find(item => item.id === activity.id && item.pricingType === pricingType);
    
    if (exists) {
      // Remove if exists
      setSelectedItems(prev => prev.filter(item => !(item.id === activity.id && item.pricingType === pricingType)));
    } else {
      // Add new
      const rate = pricingType === "fit" ? Number(activity.fitRatePerPerson) : Number(activity.groupRatePerPerson);
      const minParticipants = pricingType === "fit" ? 1 : 10;
      
      const newItem = {
        ...activity,
        pricingType,
        participants: minParticipants,
        rate: rate,
        totalPrice: rate * minParticipants
      };
      setSelectedItems(prev => [...prev, newItem]);
    }
  };

  const handleParticipantChange = (id, type, count) => {
    const val = parseInt(count) || 0;
    setSelectedItems(prev => prev.map(item => {
      if (item.id === id && item.pricingType === type) {
        return { ...item, participants: val, totalPrice: item.rate * val };
      }
      return item;
    }));
  };

  // Derived Summary
  const fitTotal = selectedItems.filter(i => i.pricingType === 'fit').reduce((sum, i) => sum + i.totalPrice, 0);
  const groupTotal = selectedItems.filter(i => i.pricingType === 'group').reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <Card className="border-t-4 border-theme-accent mb-6 shadow-sm">
      <CardHeader>
        <CardTitle className="text-theme-dark flex items-center gap-2">
          <Ticket className="w-5 h-5" /> Activities & Sightseeing
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-gray-50 p-4 rounded-lg">
          <div className="w-full md:w-1/3">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Filter by State</label>
            <select 
              className="w-full p-2 border rounded-md text-sm"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">-- Select State --</option>
              {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded border shadow-sm">
            <span className={`text-sm font-bold ${pricingType === 'fit' ? 'text-theme-primary' : 'text-gray-400'}`}>FIT (Individual)</span>
            <Switch 
              checked={pricingType === 'group'} 
              onCheckedChange={(checked) => setPricingType(checked ? 'group' : 'fit')} 
            />
            <span className={`text-sm font-bold ${pricingType === 'group' ? 'text-theme-primary' : 'text-gray-400'}`}>Group (10+)</span>
          </div>
        </div>

        {/* Activity List */}
        {selectedState && (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {loading ? <p className="text-sm text-gray-500">Loading activities...</p> : 
             activities.length === 0 ? <p className="text-sm text-gray-500">No activities found in this state.</p> :
             activities.map(act => {
               // Check if this specific activity is selected in the CURRENT pricing mode
               const isSelected = selectedItems.some(item => item.id === act.id && item.pricingType === pricingType);
               const currentItem = selectedItems.find(item => item.id === act.id && item.pricingType === pricingType);
               const displayRate = pricingType === 'fit' ? act.fitRatePerPerson : act.groupRatePerPerson;

               return (
                 <div key={act.id} className={`flex items-center justify-between p-3 rounded border transition-colors ${isSelected ? 'bg-theme-muted/20 border-theme-accent' : 'border-gray-100 hover:bg-gray-50'}`}>
                   <div className="flex items-center gap-3 flex-1">
                     <Checkbox 
                       checked={isSelected}
                       onCheckedChange={() => handleToggleActivity(act)}
                     />
                     <div>
                       <p className="font-medium text-gray-800 text-sm">{act.name}</p>
                       <p className="text-xs text-gray-500 flex items-center gap-1">
                         <MapPin size={10} /> {act.city} • ₹{displayRate}/person
                       </p>
                     </div>
                   </div>

                   {isSelected && (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                        <Users size={14} className="text-gray-400" />
                        <input 
                          type="number" 
                          min={pricingType === 'group' ? 10 : 1}
                          className="w-16 p-1 text-sm border rounded text-center"
                          value={currentItem?.participants || 0}
                          onChange={(e) => handleParticipantChange(act.id, pricingType, e.target.value)}
                        />
                        <span className="text-sm font-bold text-theme-primary w-20 text-right">
                          ₹{currentItem?.totalPrice}
                        </span>
                     </div>
                   )}
                 </div>
               );
             })
            }
          </div>
        )}

        {/* Summary Footer */}
        {selectedItems.length > 0 && (
          <div className="bg-theme-muted/50 p-4 rounded-lg border border-theme-muted mt-4">
            <h4 className="font-bold text-theme-dark text-sm mb-2">Activities Summary</h4>
            <div className="space-y-1 text-sm">
               {selectedItems.map((item, idx) => (
                 <div key={`${item.id}-${item.pricingType}-${idx}`} className="flex justify-between text-gray-600">
                   <span>{item.name} ({item.pricingType.toUpperCase()}) x {item.participants}</span>
                   <span>₹{item.totalPrice}</span>
                 </div>
               ))}
            </div>
            <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-theme-dark">
              <span>Total Activity Cost</span>
              <span>₹{fitTotal + groupTotal}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivitySection;