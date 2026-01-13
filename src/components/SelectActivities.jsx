import React, { useState, useEffect } from "react";

import { Search, Plus, X, Check } from "lucide-react";
import { getAllActivities } from "@/firebase/itinerary_service";

const SelectActivities = ({ onDone }) => {
  const [activities, setActivities] = useState([]);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      const data = await getAllActivities();
      setActivities(data);
      setLoading(false);
    };
    fetchActivities();
  }, []);

  const toggleActivity = (activity) => {
    const isSelected = selectedActivities.find((a) => a.id === activity.id);
    let updated;
    if (isSelected) {
      updated = selectedActivities.filter((a) => a.id !== activity.id);
    } else {
      updated = [...selectedActivities, activity];
    }
    setSelectedActivities(updated);
    
    // Calculate subtotal for these selected activities
    const total = updated.reduce((sum, act) => sum + (Number(act.price) || 0), 0);
    onDone(updated, total);
  };

  const filteredActivities = activities.filter((act) =>
    act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Search Header */}
      <div className="p-3 bg-gray-50 border-b flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search activities..."
            className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-center py-4 text-gray-400 text-sm">Loading activities...</div>
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => {
            const isSelected = selectedActivities.find((a) => a.id === activity.id);
            return (
              <div
                key={activity.id}
                onClick={() => toggleActivity(activity)}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                  ? "bg-blue-50 border-blue-200 border" 
                  : "bg-white border-transparent border hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{activity.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium">{activity.location || "Local"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-600">₹{activity.price}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-transparent"
                  }`}>
                    <Check size={12} strokeWidth={4} />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-gray-400 text-sm">No activities found.</div>
        )}
      </div>

      {/* Selected Summary Footer */}
      {selectedActivities.length > 0 && (
        <div className="p-3 bg-blue-600 text-white flex justify-between items-center">
          <span className="text-xs font-medium">{selectedActivities.length} Activities Selected</span>
          <span className="text-sm font-bold">
            Total: ₹{selectedActivities.reduce((sum, a) => sum + (Number(a.price) || 0), 0)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SelectActivities;