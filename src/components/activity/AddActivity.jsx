import React, { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    addDoc,
} from "firebase/firestore";
import { db } from "@/firebase/config";

const AddActivity = ({ onClose }) => {
    const [states, setStates] = useState([]);
    const [selectedState, setSelectedState] = useState("");
    const [cities, setCities] = useState([]);
    const [cityInput, setCityInput] = useState("");
    const [filteredCities, setFilteredCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [cityConfirmed, setCityConfirmed] = useState(false);
    const [activityName, setActivityName] = useState("");
    const [fitRatePerPerson, setFitRatePerPerson] = useState("");
    const [groupRatePerPerson, setGroupRatePerPerson] = useState("");
    const [activityCreated, setActivityCreated] = useState(false);

    useEffect(() => {
        const fetchStates = async () => {
            const querySnapshot = await getDocs(collection(db, "locations"));
            const stateList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setStates(stateList);
        };
        fetchStates();
    }, []);

    useEffect(() => {
        const fetchCitiesForState = async () => {
            if (!selectedState) return;
            const selectedDoc = states.find((s) => s.name === selectedState);
            if (!selectedDoc) return;
            const docSnap = await getDoc(doc(db, "locations", selectedDoc.id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCities(data.cities || []);
            }
        };
        fetchCitiesForState();
    }, [selectedState, states]);

    useEffect(() => {
        if (cityInput.trim() === "") {
            setFilteredCities([]);
            return;
        }

        const matchingCities = cities.filter((cityObj) =>
            cityObj.name.toLowerCase().includes(cityInput.toLowerCase())
        );

        const exactMatch = cities.some(
            (cityObj) => cityObj.name.toLowerCase() === cityInput.toLowerCase()
        );

        const suggestions = [...matchingCities];
        if (!exactMatch) suggestions.push("Other");

        setFilteredCities(suggestions);
    }, [cityInput, cities]);

    const handleSelectCity = async (cityObj) => {
        const selectedStateObj = states.find((s) => s.name === selectedState);
        if (!selectedStateObj) return;

        if (cityObj === "Other") {
            const trimmedCity = cityInput.trim();
            const cityExists = cities.some(
                (c) => c.name.toLowerCase() === trimmedCity.toLowerCase()
            );

            if (cityExists) {
                alert(
                    `The city "${trimmedCity}" already exists in ${selectedState}.`
                );
                return;
            }

            const confirmed = window.confirm(
                `Do you want to add "${trimmedCity}" as a new city to ${selectedState}?`
            );
            if (confirmed) {
                const newCityObj = {
                    name: trimmedCity,
                    activityIds: [],
                };
                const stateRef = doc(db, "locations", selectedStateObj.id);
                await updateDoc(stateRef, {
                    cities: arrayUnion(newCityObj),
                });

                setCityInput(newCityObj.name);
                setSelectedCity(newCityObj);
                setCityConfirmed(true);
            }
        } else {
            setCityInput(cityObj.name);
            setSelectedCity(cityObj);
            setCityConfirmed(true);
        }

        setFilteredCities([]);
    };

    const handleAddActivity = async () => {
        if (
            !selectedState ||
            !selectedCity ||
            !activityName ||
            !fitRatePerPerson ||
            !groupRatePerPerson
        ) {
            alert("Please fill in all the fields.");
            return;
        }

        try {
            const activityData = {
                name: activityName.trim(),
                state: selectedState,
                city: selectedCity.name,
                fitRatePerPerson: Number(fitRatePerPerson),
                groupRatePerPerson: Number(groupRatePerPerson),
            };

            const activityRef = await addDoc(
                collection(db, "activities"),
                activityData
            );

            const newActivityId = activityRef.id;
            setActivityCreated(true);
            alert("Activity created successfully!");

            const stateDoc = states.find((s) => s.name === selectedState);
            const stateRef = doc(db, "locations", stateDoc.id);
            const stateSnap = await getDoc(stateRef);
            if (!stateSnap.exists()) return;

            const updatedCities = (stateSnap.data().cities || []).map((city) => {
                if (city.name.toLowerCase() === selectedCity.name.toLowerCase()) {
                    return {
                        ...city,
                        activityIds: [...(city.activityIds || []), newActivityId],
                    };
                }
                return city;
            });

            await updateDoc(stateRef, { cities: updatedCities });

            onClose(); // Close the modal after successful creation
        } catch (error) {
            console.error("Error adding activity:", error);
            alert("Failed to add activity");
        }
    };
return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-lg rounded-xl shadow-lg border border-theme-primary/20 overflow-y-auto max-h-[90vh]">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-theme-muted/40">
        <h2 className="text-xl font-semibold text-theme-dark">
          ➕ Add Activity
        </h2>
        <button
          className="text-theme-primary hover:text-theme-secondary font-semibold text-lg"
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Select State */}
        <div>
          <label className="block text-sm font-medium text-theme-dark mb-1">
            Select State
          </label>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedCity(null);
              setCityInput("");
              setCityConfirmed(false);
            }}
            className="w-full border border-theme-primary/30 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-theme-primary outline-none"
          >
            <option value="">-- Choose a state --</option>
            {states.map((state) => (
              <option key={state.id} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        {/* City Search */}
        {selectedState && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-dark">
              Search or Select City
            </label>

            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Start typing city name..."
              className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
            />

            {cityInput && filteredCities.length > 0 && (
              <ul className="bg-white border border-theme-primary/20 rounded-md shadow-sm max-h-40 overflow-y-auto">
                {filteredCities.map((city, i) => (
                  <li
                    key={i}
                    className={`px-3 py-2 cursor-pointer hover:bg-theme-muted/50 ${
                      city === "Other" ? "text-theme-primary font-medium" : ""
                    }`}
                    onClick={() => handleSelectCity(city)}
                  >
                    {city === "Other"
                      ? `➕ Add "${cityInput}" as new city`
                      : city.name}
                  </li>
                ))}
              </ul>
            )}

            {selectedCity && (
              <p className="text-sm text-theme-primary">
                Selected City: <strong>{selectedCity.name}</strong>
              </p>
            )}
          </div>
        )}

        {/* Activity Inputs */}
        {cityConfirmed && (
          <>
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

            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                FIT Rate Per Person (₹)
              </label>
              <input
                type="number"
                value={fitRatePerPerson}
                onChange={(e) => setFitRatePerPerson(e.target.value)}
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                Group Rate Per Person (10+ Pax) (₹)
              </label>
              <input
                type="number"
                value={groupRatePerPerson}
                onChange={(e) => setGroupRatePerPerson(e.target.value)}
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-theme-dark"
              >
                ❌ Cancel
              </button>
              <button
                onClick={handleAddActivity}
                className="px-5 py-2 rounded bg-theme-primary hover:bg-theme-secondary text-white"
              >
                ✔ Create Activity
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);


};

export default AddActivity;