import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, deleteDoc, getDocs, collection } from "firebase/firestore";
import { db } from "@/firebase/config";

const EditActivity = ({ onClose, activityId }) => {
    const [activityData, setActivityData] = useState(null);
    const [states, setStates] = useState([]);
    const [cities, setCities] = useState([]);

    const [selectedState, setSelectedState] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [activityName, setActivityName] = useState("");
    const [fitRate, setFitRate] = useState("");
    const [groupRate, setGroupRate] = useState("");

    useEffect(() => {
        const fetchStates = async () => {
            const snapshot = await getDocs(collection(db, "locations"));
            const stateList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setStates(stateList);
        };
        fetchStates();
    }, []);

    useEffect(() => {
        const fetchActivity = async () => {
            if (activityId) {
                const docRef = doc(db, "activities", activityId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setActivityData(data);
                    setActivityName(data.name);
                    setFitRate(data.fitRatePerPerson);
                    setGroupRate(data.groupRatePerPerson);
                    setSelectedState(data.state);
                    setSelectedCity(data.city);
                }
            }
        };
        fetchActivity();
    }, [activityId]);

    useEffect(() => {
        const fetchCities = async () => {
            const selected = states.find((s) => s.name === selectedState);
            if (selected) {
                const docSnap = await getDoc(doc(db, "locations", selected.id));
                if (docSnap.exists()) {
                    setCities(docSnap.data().cities || []);
                }
            }
        };
        if (selectedState) {
            fetchCities();
        }
    }, [selectedState, states]);

    const handleUpdate = async () => {
        try {
            const activityRef = doc(db, "activities", activityId);
            await updateDoc(activityRef, {
                name: activityName,
                state: selectedState,
                city: selectedCity,
                fitRatePerPerson: Number(fitRate),
                groupRatePerPerson: Number(groupRate),
            });
            alert("Activity updated ✅");
            onClose();
        } catch (error) {
            console.error("Error updating activity:", error);
            alert("Failed to update activity ❌");
        }
    };

    const handleDelete = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete this activity?");
        if (!confirmDelete) return;
        try {
            await deleteDoc(doc(db, "activities", activityId));
            alert("Activity deleted 🗑️");
            onClose();
        } catch (error) {
            console.error("Error deleting activity:", error);
            alert("Failed to delete activity ❌");
        }
    };

    if (!activityData) return <div className="edit-activity-overlay">Loading...</div>;

 return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-theme-primary/20 overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-theme-muted/40">
        <h2 className="text-xl font-semibold text-theme-dark flex items-center gap-2">
          ✏ Edit Activity
        </h2>
        <button
          className="text-theme-primary hover:text-theme-secondary font-semibold text-lg"
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Body */}
      {!activityData ? (
        <div className="p-6 text-center text-theme-dark">
          Loading...
        </div>
      ) : (
        <div className="p-6 space-y-5">
          
          {/* Select State */}
          <div>
            <label className="block text-sm font-medium text-theme-dark mb-1">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-theme-primary outline-none"
            >
              <option value="">-- Choose State --</option>
              {states.map((state) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-theme-dark mb-1">
              City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-theme-primary outline-none"
            >
              <option value="">-- Choose City --</option>
              {cities.map((city, index) => (
                <option key={index} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Activity Name */}
          <div>
            <label className="block text-sm font-medium text-theme-dark mb-1">
              Activity Name
            </label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
            />
          </div>

          {/* FIT Rate */}
          <div>
            <label className="block text-sm font-medium text-theme-dark mb-1">
              FIT Rate Per Person (₹)
            </label>
            <input
              type="number"
              value={fitRate}
              onChange={(e) => setFitRate(e.target.value)}
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
            />
          </div>

          {/* Group Rate */}
          <div>
            <label className="block text-sm font-medium text-theme-dark mb-1">
              Group Rate Per Person (Min 10 Pax) (₹)
            </label>
            <input
              type="number"
              value={groupRate}
              onChange={(e) => setGroupRate(e.target.value)}
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t">
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-theme-dark"
              onClick={onClose}
            >
              ❌ Cancel
            </button>

            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDelete}
              >
                🗑 Delete
              </button>

              <button
                className="px-5 py-2 rounded bg-theme-primary hover:bg-theme-secondary text-white"
                onClick={handleUpdate}
              >
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);


};

export default EditActivity;
