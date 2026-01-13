import React, { useState, useEffect } from "react";

const HotelRoomSelector = ({
  hotel,
  checkInDate,
  numDouble,
  setNumDouble,
  numExtraAdult,
  setNumExtraAdult,
  numExtraChild,
  setNumExtraChild,
  hotelTotal,
  setHotelTotal,
  setSelectedMealPlan,
  selectedMealPlan,
  setSelectedRoomCategory,
  selectedRoomCategory,
}) => {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

  // --- Logic: Date to Season Mapper ---
  const getApplicableSeason = (seasons) => {
    const checkInDateObj = new Date(checkInDate);
    checkInDateObj.setHours(0, 0, 0, 0);

    return (
      seasons.find((season) => {
        const start = new Date(season.start);
        const end = new Date(season.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return checkInDateObj >= start && checkInDateObj <= end;
      }) || null
    );
  };

  const currentCategory = hotel.rooms[selectedCategoryIndex];
  const applicableSeason = getApplicableSeason(currentCategory?.seasons || []);
  const pricingData = applicableSeason?.pricing[selectedMealPlan.toLowerCase()] || null;

  // Sync with Parent on Category Change
  useEffect(() => {
    if (currentCategory) {
      setSelectedRoomCategory(currentCategory.categoryName);
    }
  }, [selectedCategoryIndex, currentCategory, setSelectedRoomCategory]);

  // Calculate Totals for the Template
  useEffect(() => {
    if (pricingData) {
      const costPerNight =
        (pricingData.double || 0) * (numDouble[0] || 1) +
        (pricingData.extraAdult || 0) * (numExtraAdult[0] || 0) +
        (pricingData.extraChild || 0) * (numExtraChild[0] || 0);
      
      // Update parent state (hotelTotal is an array per your logic)
      const updatedTotal = [...hotelTotal];
      updatedTotal[0] = costPerNight;
      setHotelTotal(updatedTotal);
    }
  }, [pricingData, numDouble, numExtraAdult, numExtraChild]);

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Category Tabs */}
      <div className="flex border-b bg-gray-50 overflow-x-auto">
        {hotel.rooms.map((room, index) => (
          <button
            key={index}
            onClick={() => setSelectedCategoryIndex(index)}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoryIndex === index
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {room.categoryName}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Season Badge */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] uppercase tracking-widest font-black px-2 py-1 bg-amber-100 text-amber-700 rounded">
            Season: {applicableSeason ? applicableSeason.name : "Not Defined"}
          </span>
          <span className="text-xs font-bold text-gray-400">
            Rating: {hotel.GoogleReviewRating || "N/A"} ⭐
          </span>
        </div>

        {/* Pricing Table */}
        {applicableSeason ? (
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase">
                <tr>
                  <th className="px-3 py-2">Select</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Double</th>
                  <th className="px-3 py-2">Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {["EP", "CP", "MAP", "AP"].map((plan) => {
                  const data = applicableSeason.pricing[plan.toLowerCase()];
                  if (!data || data.double <= 0) return null;

                  return (
                    <tr key={plan} className={selectedMealPlan === plan ? "bg-blue-50" : ""}>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="radio"
                          name={`plan-${hotel.id}`}
                          checked={selectedMealPlan === plan}
                          onChange={() => setSelectedMealPlan(plan)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2 font-bold">{plan}</td>
                      <td className="px-3 py-2 font-medium">₹{data.double}</td>
                      <td className="px-3 py-2 text-gray-500">₹{data.extraAdult}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-red-500 text-sm font-medium">
            No seasonal pricing found for this date.
          </div>
        )}

        {/* Guest Input (Optional for Template, useful for Base Cost estimation) */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-dashed">
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Rooms</label>
                <input 
                    type="number" value={numDouble[0]} 
                    onChange={(e) => setNumDouble([parseInt(e.target.value) || 0])}
                    className="w-full p-1 border rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Extra Adult</label>
                <input 
                    type="number" value={numExtraAdult[0]} 
                    onChange={(e) => setNumExtraAdult([parseInt(e.target.value) || 0])}
                    className="w-full p-1 border rounded text-sm"
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Extra Child</label>
                <input 
                    type="number" value={numExtraChild[0]} 
                    onChange={(e) => setNumExtraChild([parseInt(e.target.value) || 0])}
                    className="w-full p-1 border rounded text-sm"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default HotelRoomSelector;