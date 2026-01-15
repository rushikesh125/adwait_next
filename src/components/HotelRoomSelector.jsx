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
  setSelectedRoomCategory, // <--- NEW PROP: Function to set the room category in parent
  selectedRoomCategory, // <--- NEW PROP: Current room category from parent (for display/initialization)
}) => {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedPlans, setSelectedPlans] = useState({});
  const [perNightCost, setPerNightCost] = useState(0);

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + (hotel.nights || 1));

  const getNights = () => {
    const timeDiff = checkOut - checkIn;
    return Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  };

  const nights = getNights();

  const getApplicableSeason = (seasons) => {
    // Current date for comparison is checkInDate as per the logic
    const checkInDateObj = new Date(checkInDate);
    // Adjust checkInDateObj to midnight to ensure correct comparison if season dates are midnight
    checkInDateObj.setHours(0, 0, 0, 0);

    return (
      seasons.find((season) => {
        const start = new Date(season.start);
        const end = new Date(season.end);
        // Adjust season dates to midnight for consistent comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999); // End of the day for the 'end' date

        return checkInDateObj >= start && checkInDateObj <= end;
      }) || null
    );
  };

  // Ensure initial selectedPlan is set correctly when category changes or component mounts
  useEffect(() => {
    if (currentCategory) {
      // Set the initially selected meal plan in the parent state if it exists for this category
      const initialPlan = selectedPlans[selectedCategoryIndex] || "";
      setSelectedMealPlan(initialPlan);

      // --- NEW LOGIC FOR ROOM CATEGORY ---
      // Set the selected room category in the parent state when a category is chosen
      setSelectedRoomCategory(currentCategory.categoryName);
    }
  }, [selectedCategoryIndex, selectedPlans, setSelectedMealPlan, setSelectedRoomCategory, hotel]); // Added setSelectedRoomCategory to dependencies

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
  };

  const currentCategory = hotel.rooms[selectedCategoryIndex];
  const applicableSeason = getApplicableSeason(currentCategory?.seasons || []);
  const localSelectedPlan = selectedPlans[selectedCategoryIndex] || ""; // Use a local variable
  const pricingData = applicableSeason?.pricing[localSelectedPlan.toLowerCase()] || null;


  const updateArrayState = (setter, index, value) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const calculateTotal = () => {
    if (!pricingData) return 0;

    const costPerNight =
      (pricingData.double || 0) * (numDouble[0] || 0) +
      (pricingData.extraAdult || 0) * (numExtraAdult[0] || 0) +
      (pricingData.extraChild || 0) * (numExtraChild[0] || 0);

    setPerNightCost(costPerNight);

    const total = costPerNight * nights;
    updateArrayState(setHotelTotal, 0, total);
    return total;
  };

  // Recalculate total when relevant state changes
  useEffect(() => {
    calculateTotal();
  }, [numDouble[0], numExtraAdult[0], numExtraChild[0], localSelectedPlan, nights, pricingData]);


  const renderPlanTable = () => {
    if (!applicableSeason) return <p>No seasonal pricing available.</p>;

    const planNames = ["EP", "CP", "MAP", "AP"];

    return (
      <table className="pricing-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Plan</th>
            <th>Double</th>
            <th>Extra Adult</th>
            <th>Extra Child</th>
          </tr>
        </thead>
        <tbody>
          {planNames.map((plan) => {
            const data = applicableSeason.pricing[plan.toLowerCase()];
            const hasPricing = data && (data.double > 0 || data.extraAdult > 0 || data.extraChild > 0);

            // Only render the row if pricing data exists and is not all zero.
            return hasPricing ? (
              <tr key={plan}>
                <td>
                  <input
                    type="radio"
                    name={`mealPlan-${selectedCategoryIndex}`}
                    value={plan}
                    checked={localSelectedPlan === plan} // Use local state for checking
                    onChange={() => {
                      setSelectedPlans((prev) => ({
                        ...prev,
                        [selectedCategoryIndex]: plan,
                      }));
                      setSelectedMealPlan(plan); // This is setting the parent's meal plan state
                    }}
                  />
                </td>
                <td>{plan}</td>
                <td>₹{data.double || 0}</td>
                <td>₹{data.extraAdult || 0}</td>
                <td>₹{data.extraChild || 0}</td>
              </tr>
            ) : null;
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="room-selection">
      <h3>Select Room Category</h3>
      <div className="room-tabs">
        {hotel.rooms.map((room, index) => (
          <button
            key={index}
            className={selectedCategoryIndex === index ? "active" : ""}
            onClick={() => {
              setSelectedCategoryIndex(index);
              updateArrayState(setNumDouble, 0, 1);
              updateArrayState(setNumExtraAdult, 0, 0);
              updateArrayState(setNumExtraChild, 0, 0);
              // When category changes, ensure the meal plan state in parent is updated
              // If there's a pre-selected plan for this category, set it. Otherwise, clear it.
              setSelectedMealPlan(selectedPlans[index] || "");

              // --- NEW: Update parent's selectedRoomCategory when a tab is clicked ---
              setSelectedRoomCategory(room.categoryName);
            }}
          >
            {room.categoryName}
          </button>
        ))}
      </div>

      {/* Display selected room category (optional, for debugging/user feedback) */}
      {selectedRoomCategory && (
        <p>
          <strong>Current Room Category Selected:</strong> {selectedRoomCategory}
        </p>

      )}

      <div className="season-info">
        <p>
          <strong>Season:</strong>{" "}{applicableSeason ? applicableSeason.name : "N/A"}
          <br />

          <strong>Google Review Ratings</strong>{" "}{hotel.GoogleReviewRating || "N/A"}
          <br />

          <strong>Google Listing URL: </strong>
      {hotel.GoogleListingURL ? (
      <a
        href={hotel.GoogleListingURL}
        target="_blank"
        rel="noopener noreferrer"
        >
        {hotel.GoogleListingURL}
        </a>
        ) : (
          "N/A"
      )}

        </p>
        {renderPlanTable()}
      </div>

      <div className="room-inputs">
        <h4>Enter number of guests for this hotel</h4>
        <label>
          Double Rooms:
          <input
            type="number"
            min={0}
            value={numDouble[0] || 0}
            onChange={(e) => updateArrayState(setNumDouble, 0, parseInt(e.target.value))}
          />
        </label>
        <label>
          Extra Adults:
          <input
            type="number"
            min={0}
            value={numExtraAdult[0] || 0}
            onChange={(e) => updateArrayState(setNumExtraAdult, 0, parseInt(e.target.value))}
          />
        </label>
        <label>
          Extra Children:
          <input
            type="number"
            min={0}
            value={numExtraChild[0] || 0}
            onChange={(e) => updateArrayState(setNumExtraChild, 0, parseInt(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
};

export default HotelRoomSelector;