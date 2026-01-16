"use client";
import React, { useState, useEffect } from "react";

// import AddActivity from "./ActivitiesScreens/AddActivity";
// import EditActivity from "./ActivitiesScreens/EditActivity";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import EditActivity from "@/components/activity/EditActivity";
import AddActivity from "@/components/activity/AddActivity";

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
    try {
      await deleteDoc(doc(db, "activities", activityId));
      fetchActivities();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleEditActivity = (id) => {
    console.log("Edit activity with ID:", id); // 👈 Added for debugging
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
    <div className="min-h-screen bg-theme-muted/40 px-4 md:px-10 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-theme-dark tracking-wide">
            Activity Management
          </h1>
          <p className="text-theme-dark/60 text-sm max-w-xl mt-1">
            Manage curated travel experiences, pricing and availability across
            destinations.
          </p>
        </div>

        <button
          className="bg-theme-primary hover:bg-theme-secondary text-white px-5 py-2 rounded-lg shadow-sm text-sm font-medium"
          onClick={() => setShowAddActivityModal(true)}
        >
          + Create Activity
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          className="w-full md:max-w-lg border border-theme-primary/30 rounded-md px-4 py-2 bg-white focus:ring-2 focus:ring-theme-primary outline-none"
          placeholder="🔍 Search by name, city or state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Activities */}
      <div>
        <h2 className="text-2xl font-semibold text-theme-dark mb-4">
          Activities by Location
        </h2>

        {Object.entries(groupedActivities).length === 0 ? (
          <p className="text-theme-dark/60 text-center pt-10">
            No activities found.
          </p>
        ) : (
          Object.entries(groupedActivities).map(([location, acts]) => (
            <div key={location} className="mb-10">
              <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-theme-dark">
                📍 {location.replace("-", ", ")}
              </h3>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {acts.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white border border-theme-primary/20 rounded-lg shadow-sm p-4 hover:shadow-md transition"
                  >
                    <h4 className="font-semibold text-theme-primary text-lg mb-1">
                      {activity.name}
                    </h4>
                    <p className="text-sm text-theme-dark">
                      <strong>State:</strong> {activity.state}
                    </p>
                    <p className="text-sm text-theme-dark">
                      <strong>City:</strong> {activity.city}
                    </p>
                    <p className="text-sm text-theme-dark">
                      <strong>FIT Rate:</strong> ₹{activity.fitRatePerPerson}
                    </p>
                    <p className="text-sm text-theme-dark mb-3">
                      <strong>Group (10+ Pax):</strong> ₹
                      {activity.groupRatePerPerson}
                    </p>

                    <div className="flex justify-between mt-3">
                      <button
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                      >
                        🗑 Delete
                      </button>
                      <button
                        onClick={() => handleEditActivity(activity.id)}
                        className="px-3 py-1 rounded bg-theme-primary hover:bg-theme-secondary text-white text-sm"
                      >
                        ✏ Edit
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
