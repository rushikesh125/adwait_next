"use client"
import React, { useState, useEffect } from "react";



import { getHotelsByCity } from "@/firebase/itinerary_service";
import HotelRoomSelector from "./HotelRoomSelector";
import SelectActivities from "./SelectActivities";

const ItineraryStep = ({ data, update, onNext, onPrev }) => {
  // Initialize days array based on the duration.days from Step 1
  const [days, setDays] = useState(
    data.days.length > 0 
      ? data.days 
      : Array.from({ length: data.duration.days }, (_, i) => ({
          dayNumber: i + 1,
          city: "",
          hotel: null,
          activities: [],
          hotelTotal: [0], // For the HotelRoomSelector logic
          selectedMealPlan: "",
          selectedRoomCategory: ""
        }))
  );

  const updateDay = (index, field, value) => {
    const updatedDays = [...days];
    updatedDays[index][field] = value;
    setDays(updatedDays);
    update("days", updatedDays); // Sync with master state
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Plan Itinerary</h2>
        <p className="text-gray-500">Configure hotels and activities for each day.</p>
      </div>

      <div className="space-y-8">
        {days.map((day, index) => (
          <DaySection 
            key={index}
            index={index}
            day={day}
            updateDay={updateDay}
          />
        ))}
      </div>

      <div className="flex justify-between mt-10 pt-6 border-t border-gray-200">
        <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition" onClick={onPrev}>
          Back
        </button>
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          onClick={onNext}
        >
          Review Package
        </button>
      </div>
    </div>
  );
};

// Sub-component for each day to keep it clean
const DaySection = ({ index, day, updateDay }) => {
  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);

  const handleCityChange = async (city) => {
    updateDay(index, "city", city);
    if (city.length > 2) {
      setLoadingHotels(true);
      const fetchedHotels = await getHotelsByCity(city);
      setHotels(fetchedHotels);
      setLoadingHotels(false);
    }
  };

  return (
    <div className="p-5 border-2 border-blue-50 rounded-xl bg-gray-50/50">
      <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center">
        <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 text-sm">
          {index + 1}
        </span>
        Day {index + 1}
      </h3>

      <div className="grid grid-cols-1 gap-6">
        {/* City Selection */}
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-2">Target City</label>
          <input
            type="text"
            className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search city (e.g. Srinagar)..."
            value={day.city}
            onChange={(e) => handleCityChange(e.target.value)}
          />
        </div>

        {/* Hotel Selection Logic */}
        {day.city && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-700 mb-3 underline">Stay Arrangements</h4>
            {loadingHotels ? (
              <p className="text-sm text-gray-400">Loading hotels in {day.city}...</p>
            ) : hotels.length > 0 ? (
              <div className="space-y-4">
                 <select 
                    className="w-full p-2 border rounded-md"
                    onChange={(e) => updateDay(index, "hotel", hotels.find(h => h.id === e.target.value))}
                  >
                    <option value="">-- Choose Hotel --</option>
                    {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                 </select>

                 {day.hotel && (
                    <HotelRoomSelector 
                      hotel={day.hotel}
                      checkInDate={new Date()} // Dummy date for price calculation
                      numDouble={[1]} // Default
                      setNumDouble={(val) => {}} // Templates don't need fixed pax
                      numExtraAdult={[0]}
                      setNumExtraAdult={() => {}}
                      numExtraChild={[0]}
                      setNumExtraChild={() => {}}
                      hotelTotal={day.hotelTotal}
                      setHotelTotal={(val) => updateDay(index, "hotelTotal", val)}
                      selectedMealPlan={day.selectedMealPlan}
                      setSelectedMealPlan={(val) => updateDay(index, "selectedMealPlan", val)}
                      selectedRoomCategory={day.selectedRoomCategory}
                      setSelectedRoomCategory={(val) => updateDay(index, "selectedRoomCategory", val)}
                    />
                 )}
              </div>
            ) : (
              <p className="text-sm text-red-400">No hotels found for this city.</p>
            )}
          </div>
        )}

        {/* Activities Selection */}
        <div className="mt-4">
          <h4 className="font-bold text-gray-700 mb-3 underline">Sightseeing & Activities</h4>
          <SelectActivities 
            onDone={(activities, total) => {
              updateDay(index, "activities", activities);
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default ItineraryStep;