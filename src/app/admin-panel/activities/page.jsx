"use client";
import React, { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import EditActivity from "@/components/activity/EditActivity";
import AddActivity from "@/components/activity/AddActivity";

// Icons
import { 
  MapPin, 
  Search, 
  Plus, 
  Users, 
  User, 
  Pencil, 
  Trash2, 
  Activity as ActivityIcon,
  Globe
} from "lucide-react";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "activities"));
      const activityList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const uniqueMap = new Map();
      const uniqueActivities = activityList.filter((activity) => {
        const key = `${activity.name?.toLowerCase()}-${activity.state?.toLowerCase()}-${activity.city?.toLowerCase()}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, true);
          return true;
        }
        return false;
      });

      setActivities(uniqueActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    try {
      await deleteDoc(doc(db, "activities", activityId));
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleEditActivity = (id) => {
    setEditingActivityId(id);
  };

  const handleEditSave = () => {
    setEditingActivityId(null);
    fetchActivities();
  };

  const handleCloseEditModal = () => {
    setEditingActivityId(null);
  };

  const filteredActivities = activities.filter((activity) => {
    const query = searchQuery.toLowerCase();
    return (
      activity.name?.toLowerCase().includes(query) ||
      activity.city?.toLowerCase().includes(query) ||
      activity.state?.toLowerCase().includes(query)
    );
  });

  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const key = `${activity.state}-${activity.city}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(activity);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 md:px-10 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <div className="p-2 bg-theme-primary/10 rounded-lg">
              <ActivityIcon className="w-6 h-6 text-theme-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Activity Management
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Curate and manage travel experiences across your active destinations.
          </p>
        </div>

        <button
          className="flex items-center gap-2 bg-theme-primary hover:bg-theme-secondary text-white px-6 py-3 rounded-xl shadow-lg shadow-theme-primary/20 transition-all active:scale-95 font-semibold text-sm"
          onClick={() => setShowAddActivityModal(true)}
        >
          <Plus className="w-4 h-4" /> Create New Activity
        </button>
      </div>

      {/* Dashboard Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Experiences</p>
            <p className="text-2xl font-bold text-slate-800">{activities.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Unique Cities</p>
            <p className="text-2xl font-bold text-slate-800">{Object.keys(groupedActivities).length}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative mb-10 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
        <input
          type="text"
          className="w-full border-0 rounded-2xl pl-12 pr-4 py-4 bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-theme-primary outline-none transition-all placeholder:text-slate-400"
          placeholder="Search activities, cities or states..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Activities Grid */}
      <div className="space-y-12">
        {Object.entries(groupedActivities).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">No experiences found matching your criteria.</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([location, acts]) => (
            <div key={location} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-1 w-12 bg-theme-primary rounded-full"></div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500 fill-red-50" />
                  {location.split('-').join(', ')}
                </h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">
                  {acts.length} Items
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {acts.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                  >
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-theme-primary transition-colors">
                          {activity.name}
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100 uppercase">
                          {activity.city}
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                          {activity.state}
                        </span>
                      </div>

                      <div className="space-y-2 py-3 border-y border-slate-50 mb-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5" /> FIT Rate
                          </span>
                          <span className="font-bold text-slate-700">₹{activity.fitRatePerPerson}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                            <Users className="w-3.5 h-3.5" /> Group Rate
                          </span>
                          <span className="font-bold text-theme-primary text-base">₹{activity.groupRatePerPerson}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex p-3 bg-slate-50/80 gap-2 mt-auto border-t border-slate-100">
                      <button
                        onClick={() => handleEditActivity(activity.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white border border-slate-200 hover:border-theme-primary hover:text-theme-primary transition-all text-xs font-bold text-slate-600 shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-slate-400 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showAddActivityModal && (
        <AddActivity
          onClose={() => {
            setShowAddActivityModal(false);
            fetchActivities();
          }}
        />
      )}

      {editingActivityId && (
        <EditActivity
          activityId={editingActivityId}
          onClose={handleCloseEditModal}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};

export default Activities;