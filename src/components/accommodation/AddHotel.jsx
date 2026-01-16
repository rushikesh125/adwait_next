"use client"
import React, { useEffect, useState } from "react";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    addDoc
} from "firebase/firestore";
import { db } from "@/firebase/config";

const AddHotel = ({ onClose, editHotelId = null, hotelToEdit = null }) => {
    const [states, setStates] = useState([]);

    const [doneOnes,setdoneOnes]=useState(false);
    // const [NagativePresent, setNagativePresent] = useState(false);
    const [selectedState, setSelectedState] = useState("");
    const [cities, setCities] = useState([]);
    const [cityInput, setCityInput] = useState("");
    const [filteredCities, setFilteredCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [cityConfirmed, setCityConfirmed] = useState(false);
    const [hotelName, setHotelName] = useState("");
    const [hotelRating, setHotelRating] = useState("");

    const [GoogleListingURL, setGoogleListingURL] = useState("");
    const [GoogleReviewRating, setGoogleReviewRating] = useState(null);
    const [hotelCreated, setHotelCreated] = useState(false);
    const [createdHotelId, setCreatedHotelId] = useState(null);
    const [seasonCount, setSeasonCount] = useState(0);
    const [seasons, setSeasons] = useState([]);
    const [currentSeasonIndex, setCurrentSeasonIndex] = useState(0);
    const [tempSeason, setTempSeason] = useState({ name: "", start: "", end: "" });
    const [categoryName, setCategoryName] = useState("");
    const [roomPricing, setRoomPricing] = useState([]);
    const [roomAdded, setRoomAdded] = useState(false);
    const [isAddingExtraSeason, setIsAddingExtraSeason] = useState(false);

    // NEW STATE: To store the pricing of the last successfully added room category
    const [lastSavedRoomPricing, setLastSavedRoomPricing] = useState([]);

    // Removed unused 'pricing' state

    const editMode = !!editHotelId;

    useEffect(() => {
        const fetchStates = async () => {
            const querySnapshot = await getDocs(collection(db, "locations"));
            const stateList = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));
            setStates(stateList);
        };
        fetchStates();
    }, []);

    useEffect(() => {
        if (!editMode) return;

        const loadHotel = async () => {
            const hotelRef = doc(db, "hotels", editHotelId);
            const hotelSnap = await getDoc(hotelRef);
            if (hotelSnap.exists()) {
                const data = hotelSnap.data();
                setHotelName(data.name);
                setHotelRating(data.rating);
                setSelectedState(data.state);
                setCityInput(data.city);
                setSelectedCity({ name: data.city });
                setCityConfirmed(true);
                setHotelCreated(true);
                setCreatedHotelId(editHotelId);
                // If editing, load existing room prices if available
                if (data.rooms && data.rooms.length > 0) {
                    const lastRoom = data.rooms[data.rooms.length - 1];
                    const loadedPricing = lastRoom.seasons.map(s => s.pricing);
                    setLastSavedRoomPricing(loadedPricing);
                    setRoomPricing(loadedPricing); // Pre-fill current pricing with last room's pricing
                    // Also set seasons and currentSeasonIndex based on loaded hotel data for edit mode
                    setSeasons(lastRoom.seasons.map(s => ({ name: s.name, start: s.start, end: s.end })));
                    setSeasonCount(lastRoom.seasons.length);
                    setCurrentSeasonIndex(lastRoom.seasons.length); // All seasons are "saved"
                }
            }
        };

        loadHotel();
    }, [editHotelId]);

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

        const matchingCities = cities.filter(cityObj =>
            cityObj.name.toLowerCase().includes(cityInput.toLowerCase())
        );

        const exactMatch = cities.some(
            cityObj => cityObj.name.toLowerCase() === cityInput.toLowerCase()
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
                alert(`❌ The city "${trimmedCity}" already exists in ${selectedState}.`);
                return;
            }

            const confirmed = window.confirm(`Do you want to add "${trimmedCity}" as a new city to ${selectedState}?`);
            if (confirmed) {
                const newCityObj = {
                    name: trimmedCity,
                    hotelIds: []
                };
                const stateRef = doc(db, "locations", selectedStateObj.id);
                await updateDoc(stateRef, {
                    cities: arrayUnion(newCityObj)
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

    const handleCreateOrUpdateHotel = async () => {
        console.log(hotelName, hotelRating, selectedCity, selectedState)
        if (!hotelName || !hotelRating || !selectedCity || !selectedState) return;
        if((!GoogleReviewRating || !GoogleListingURL) && !doneOnes) {
            alert("⚠ As best practice kindly enter hotel's google rating and link for more details");
            setdoneOnes(true);
            return;
        }else {

        try {
            if (!editMode) {
                const hotelSnapshot = await getDocs(collection(db, "hotels"));
                const duplicate = hotelSnapshot.docs.find(doc => {
                    const data = doc.data();
                    return (
                        data.name.trim().toLowerCase() === hotelName.trim().toLowerCase() &&
                        data.city === selectedCity.name &&
                        data.state === selectedState
                    );
                });

                    if (duplicate) {
                        alert(`❌ A hotel named "${hotelName}" already exists in ${selectedCity.name}, ${selectedState}.`);
                        return;
                    }

                const hotelRef = await addDoc(collection(db, "hotels"), {
                    name: hotelName,
                    GoogleReviewRating: GoogleReviewRating,
                    GoogleListingURL: GoogleListingURL,
                    rating: hotelRating,
                    state: selectedState,
                    city: selectedCity.name,
                    rooms: []
                });

                const newHotelId = hotelRef.id;
                console.log("New hotel created with ID:", newHotelId);
                setCreatedHotelId(newHotelId);
                setHotelCreated(true);

                    const stateDoc = states.find((s) => s.name === selectedState);
                    const stateRef = doc(db, "locations", stateDoc.id);
                    const stateSnap = await getDoc(stateRef);
                    if (!stateSnap.exists()) return;

                    const updatedCities = (stateSnap.data().cities || []).map((city) => {
                        if (city.name.toLowerCase() === selectedCity.name.toLowerCase()) {
                            return {
                                ...city,
                                hotelIds: [...(city.hotelIds || []), newHotelId]
                            };
                        }
                        return city;
                    });
                await updateDoc(stateRef, { cities: updatedCities });
                alert("Hotel created successfully!  You can now add room categories.");
            } else {
                const hotelRef = doc(db, "hotels", editHotelId);
                await updateDoc(hotelRef, {
                    name: hotelName,
                    rating: hotelRating
                });
                alert("Hotel updated  You can now manage room categories.");
                setHotelCreated(true);
            }
        } catch (error) {
            console.error("Error saving hotel:", error);
            alert("Failed to save hotel");
        }
    }
    };

    const handlePricingChange = (e, seasonIndex, plan, type) => {
        let value = e.target.value;

        if (Number(value) < 0) {
            alert("Price cannot be negative.");
            e.target.value = "";
            value = ""; // Use empty string for state update logic
        }

        setRoomPricing((prev) => {
            const updated = [...prev];

            if (!updated[seasonIndex]) {
                updated[seasonIndex] = {};
            }
            if (!updated[seasonIndex][plan]) {
                updated[seasonIndex][plan] = {};
            }
            updated[seasonIndex][plan][type] = value === "" ? 0 : Number(value);
            return updated;
        });
    };

    const handleRoomSubmit = async () => {
        const hasAtLeastOnePrice = roomPricing.some(season =>
            season && Object.values(season).some(plan =>
                plan && Object.values(plan).some(price => price > 0)
            )
        );

        if (!categoryName || !hasAtLeastOnePrice) {
            alert("Please provide a category name and at least one price for any meal plan.");
            return;
        }

        const newRoom = {
            categoryName,
            seasons: seasons.map((s, index) => {
                const seasonPricing = roomPricing[index] || {};
                const completePricing = {
                    ep: { double: 0, extraAdult: 0, extraChild: 0, ...(seasonPricing.ep || {}) },
                    cp: { double: 0, extraAdult: 0, extraChild: 0, ...(seasonPricing.cp || {}) },
                    map: { double: 0, extraAdult: 0, extraChild: 0, ...(seasonPricing.map || {}) },
                    ap: { double: 0, extraAdult: 0, extraChild: 0, ...(seasonPricing.ap || {}) },
                };
                return {
                    ...s,
                    pricing: completePricing,
                };
            }),
        };

        try {
            const hotelRef = doc(db, "hotels", createdHotelId);
            await updateDoc(hotelRef, {
                rooms: arrayUnion(newRoom),
            });
            alert("Room Category Saved 🎉");
            setRoomAdded(true);
            setLastSavedRoomPricing(roomPricing); // Store the current pricing for next category
        } catch (error) {
            console.error(error);
            alert("Error saving room.");
        }
    };


    return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4">
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg border border-theme-primary/20 my-6">
      
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b bg-theme-muted/40 sticky top-0 z-50">
        <h2 className="text-xl font-semibold text-theme-dark">
          {editMode ? "Edit Hotel" : "Add New Hotel"}
        </h2>
        <button
          className="text-theme-primary hover:text-theme-secondary font-semibold text-lg"
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Content Wrapper */}
      <div className="p-6 space-y-8">
        
        {/* --- STEP 1 --- */}
        <div className="space-y-4">
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

          {/* Search/Select City */}
          {selectedState && (
            <div>
              <label className="block text-sm font-medium text-theme-dark mb-1">
                Search or Select City
              </label>
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="w-full border border-theme-primary/30 rounded-md px-3 py-2"
                placeholder="Start typing city name..."
              />

              {cityInput && filteredCities.length > 0 && (
                <ul className="border border-gray-300 rounded-md mt-1 bg-white shadow-sm max-h-48 overflow-y-auto">
                  {filteredCities.map((city, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelectCity(city)}
                      className="px-3 py-2 hover:bg-theme-muted cursor-pointer text-sm"
                    >
                      {city === "Other"
                        ? `➕ Add "${cityInput}"`
                        : city.name}
                    </li>
                  ))}
                </ul>
              )}

              {selectedCity && (
                <p className="text-sm text-theme-dark mt-1">
                  Selected city: <strong>{selectedCity.name}</strong>
                </p>
              )}
            </div>
          )}

          {/* Hotel Info */}
          {cityConfirmed && !hotelCreated && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-theme-dark mb-1">
                  Hotel Name
                </label>
                <input
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-dark mb-1">
                  Google Review Rating (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={GoogleReviewRating}
                  onChange={(e) => setGoogleReviewRating(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-dark mb-1">
                  Google Listing URL
                </label>
                <input
                  type="text"
                  value={GoogleListingURL}
                  onChange={(e) => {
                    const url = e.target.value.trim();
                    if (url.startsWith("https://")) setGoogleListingURL(url);
                    else setGoogleListingURL("");
                  }}
                  placeholder="https://maps.google.com/..."
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-dark mb-1">
                  Hotel Rating
                </label>
                <select
                  value={hotelRating}
                  onChange={(e) => setHotelRating(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">-- Choose Rating --</option>
                  <option value="5-star">⭐ 5 Star</option>
                  <option value="4-star">⭐ 4 Star</option>
                  <option value="3-star">⭐ 3 Star</option>
                  <option value="2-star">⭐ 2 Star</option>
                  <option value="1-star">⭐ 1 Star</option>
                </select>
              </div>

              <button
                onClick={handleCreateOrUpdateHotel}
                className="bg-theme-primary hover:bg-theme-secondary text-white w-full py-2 rounded-lg font-medium shadow-sm"
              >
                {editMode ? "Update Hotel" : "+ Create Hotel"}
              </button>
            </div>
          )}
        </div>

        {/* ------- STEP 2: Seasons -------- */}
        {hotelCreated && seasons.length === 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-theme-dark">
              How many seasons?
            </label>
            <input
              type="number"
              min={1}
              className="w-32 border rounded px-2 py-1"
              value={seasonCount}
              onChange={(e) => setSeasonCount(parseInt(e.target.value))}
            />
            <button
              onClick={() => {
                if (seasonCount > 0) {
                  setSeasons(new Array(seasonCount).fill(null));
                  setCurrentSeasonIndex(0);
                }
              }}
              className="bg-theme-primary hover:bg-theme-secondary text-white px-4 py-1 rounded"
            >
              Proceed
            </button>
          </div>
        )}

        {/* ------- Existing Seasons Table ------- */}
        {seasons.some((s) => s !== null) && (
          <div className="space-y-2">
            <h3 className="font-semibold text-theme-dark">Seasons</h3>
            <table className="w-full text-sm border border-theme-primary/20 rounded-md overflow-hidden">
              <thead className="bg-theme-primary text-white">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season, index) =>
                  season ? (
                    <tr key={index} className="border-b last:border-none">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{season.name}</td>
                      <td className="px-3 py-2">{season.start}</td>
                      <td className="px-3 py-2">{season.end}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => {
                            setTempSeason(season);
                            setCurrentSeasonIndex(index);
                          }}
                          className="text-theme-primary hover:text-theme-secondary mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const updated = seasons.filter((_, i) => i !== index);
                            setSeasons(updated);
                            setSeasonCount(updated.length);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          ❌ Remove
                        </button>
                      </td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add More Season */}
        {seasons.length > 0 &&
          currentSeasonIndex >= seasonCount &&
          !isAddingExtraSeason && (
            <button
              className="bg-theme-accent text-white px-4 py-2 rounded shadow hover:bg-theme-secondary float-right"
              onClick={() => setIsAddingExtraSeason(true)}
            >
              ➕ Add Another Season
            </button>
          )}

        {isAddingExtraSeason && (
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 rounded bg-theme-primary text-white"
              onClick={() => {
                setSeasonCount(seasonCount + 1);
                setSeasons([...seasons, null]);
                setCurrentSeasonIndex(seasonCount);
                setIsAddingExtraSeason(false);
              }}
            >
              Confirm
            </button>
            <button
              className="px-3 py-1 rounded bg-gray-300"
              onClick={() => setIsAddingExtraSeason(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Season Input */}
        {seasons.length > 0 && currentSeasonIndex < seasonCount && (
          <div className="p-4 border rounded-md space-y-3 bg-theme-muted/20">
            <h4 className="font-semibold text-theme-dark">
              Season {currentSeasonIndex + 1}
            </h4>

            <input
              value={tempSeason.name}
              onChange={(e) => setTempSeason({ ...tempSeason, name: e.target.value })}
              placeholder="Season name"
              className="w-full border rounded px-3 py-2"
            />

            <input
              type="date"
              value={tempSeason.start}
              onChange={(e) => setTempSeason({ ...tempSeason, start: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            <input
              type="date"
              value={tempSeason.end}
              onChange={(e) => setTempSeason({ ...tempSeason, end: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />

            <button
              className="bg-theme-primary hover:bg-theme-secondary text-white py-2 rounded w-full"
              onClick={() => {
                const updated = [...seasons];
                updated[currentSeasonIndex] = tempSeason;
                setSeasons(updated);
                setTempSeason({ name: "", start: "", end: "" });
                setCurrentSeasonIndex(currentSeasonIndex + 1);
              }}
            >
              Save Season
            </button>
          </div>
        )}

        {/* -------- Add Room Category -------- */}
        {seasons.length > 0 && currentSeasonIndex >= seasonCount && (
          <div className="space-y-4">
            <h3 className="font-semibold text-theme-dark">Add Room Category</h3>

            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Room Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />

            {seasons.map((season, seasonIndex) => (
              <div key={seasonIndex} className="border rounded p-4 space-y-2 bg-white">
                <h4 className="font-medium text-theme-dark">{season.name}</h4>
                <table className="w-full text-sm border border-theme-primary/20 rounded-md overflow-hidden">
                  <thead className="bg-theme-primary text-white">
                    <tr>
                      <th className="px-3 py-2">Meal Plan</th>
                      <th className="px-3 py-2">Double</th>
                      <th className="px-3 py-2">Extra Adult</th>
                      <th className="px-3 py-2">Extra Child</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["ep", "cp", "map", "ap"].map((plan) => (
                      <tr key={plan} className="border-b last:border-none">
                        <td className="px-3 py-2">{plan.toUpperCase()}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            className="w-full border rounded px-2 py-1"
                            value={roomPricing[seasonIndex]?.[plan]?.double ?? 0}
                            onChange={(e) => handlePricingChange(e, seasonIndex, plan, "double")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            className="w-full border rounded px-2 py-1"
                            value={roomPricing[seasonIndex]?.[plan]?.extraAdult ?? 0}
                            onChange={(e) => handlePricingChange(e, seasonIndex, plan, "extraAdult")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            className="w-full border rounded px-2 py-1"
                            value={roomPricing[seasonIndex]?.[plan]?.extraChild ?? 0}
                            onChange={(e) => handlePricingChange(e, seasonIndex, plan, "extraChild")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <button
              onClick={handleRoomSubmit}
              className="bg-theme-primary hover:bg-theme-secondary text-white py-2 px-6 rounded-lg shadow-sm font-semibold w-full"
            >
              Save Room Category
            </button>
          </div>
        )}

        {/* -------- Add Another Category / Finish -------- */}
        {roomAdded && (
          <div className="border rounded p-6 bg-theme-muted/30 text-center space-y-4">
            <p className="font-semibold text-theme-dark">🎉 Room Category Added!</p>

            <button
              onClick={() => {
                setRoomAdded(false);
                setCategoryName("");
                setRoomPricing(JSON.parse(JSON.stringify(lastSavedRoomPricing)));
              }}
              className="bg-theme-primary hover:bg-theme-secondary text-white px-4 py-2 rounded"
            >
              ➕ Add Another Category
            </button>

            <button
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-theme-dark px-4 py-2 rounded"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default AddHotel;