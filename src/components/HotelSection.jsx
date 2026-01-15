import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Plus } from "lucide-react";
import toast from "react-hot-toast";

const HotelSection = ({ 
  hotels, 
  locations, 
  hotelEntries, 
  setHotelEntries, 
  checkInDate, 
  setCheckInDate 
}) => {
  // Local state for the current hotel being added
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [nights, setNights] = useState(1);
  const [roomCategory, setRoomCategory] = useState("");
  const [mealPlan, setMealPlan] = useState("EP");
  const [rooms, setRooms] = useState({ double: 1, extraAdult: 0, extraChild: 0 });
  
  // Derived state
  const availableHotels = hotels.filter(h => h.state === selectedState);
  const cities = [...new Set(availableHotels.map(h => h.city))];
  const currentHotel = hotels.find(h => h.id === selectedHotelId);
  
  const calculateHotelCost = () => {
    if (!currentHotel || !roomCategory) return 0;
    
    // Find room logic (Simplified from your original HotelRoomSelector for brevity)
    const roomData = currentHotel.rooms.find(r => r.categoryName === roomCategory);
    if (!roomData) return 0;

    // Season Logic
    const checkIn = new Date(checkInDate);
    const season = roomData.seasons?.find(s => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      return checkIn >= start && checkIn <= end;
    });

    if (!season || !season.pricing?.[mealPlan.toLowerCase()]) return 0;
    
    const price = season.pricing[mealPlan.toLowerCase()];
    const perNight = (price.double * rooms.double) + (price.extraAdult * rooms.extraAdult) + (price.extraChild * rooms.extraChild);
    return perNight * nights;
  };

  const handleAddHotel = () => {
    if (!currentHotel) return toast.error("Select a hotel");
    
    const cost = calculateHotelCost();
    const checkOut = new Date(checkInDate);
    checkOut.setDate(checkOut.getDate() + parseInt(nights));

    const newEntry = {
      hotel: currentHotel.name,
      hotelId: currentHotel.id,
      city: currentHotel.city,
      state: currentHotel.state,
      checkInDate: checkInDate,
      checkOutDate: checkOut.toISOString().split('T')[0],
      nights: parseInt(nights),
      selectedRoomCategory: roomCategory,
      selectedMealPlan: mealPlan,
      numDouble: rooms.double,
      numExtraAdult: rooms.extraAdult,
      numExtraChild: rooms.extraChild,
      hotelTotal: cost / parseInt(nights), // Store per night cost
      totalCost: cost
    };

    setHotelEntries([...hotelEntries, newEntry]);
    
    // Reset for next hotel (Logic from your code: set next checkin to this checkout)
    setCheckInDate(newEntry.checkOutDate);
    setSelectedHotelId("");
    setRoomCategory("");
  };

  const removeHotel = (index) => {
    const updated = hotelEntries.filter((_, i) => i !== index);
    setHotelEntries(updated);
  };

  return (
    <Card className="border-t-4 border-theme-primary mb-6">
      <CardHeader>
        <CardTitle className="text-theme-dark flex items-center gap-2">
          🏨 Hotel Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date & State Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Check-in</label>
            <input 
              type="date" 
              className="w-full p-2 border rounded-md focus:ring-2 ring-theme-primary"
              value={checkInDate} 
              onChange={(e) => setCheckInDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Nights</label>
            <input 
              type="number" min="1"
              className="w-full p-2 border rounded-md"
              value={nights} 
              onChange={(e) => setNights(e.target.value)} 
            />
          </div>
          <div>
             <label className="text-xs font-bold text-gray-500">State</label>
             <select 
               className="w-full p-2 border rounded-md"
               value={selectedState}
               onChange={(e) => { setSelectedState(e.target.value); setSelectedCity(""); }}
             >
               <option value="">Select State</option>
               {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
             </select>
          </div>
          <div>
             <label className="text-xs font-bold text-gray-500">City</label>
             <select 
               className="w-full p-2 border rounded-md"
               value={selectedCity}
               onChange={(e) => setSelectedCity(e.target.value)}
               disabled={!selectedState}
             >
               <option value="">Select City</option>
               {cities.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
        </div>

        {/* Hotel List Radio Selection */}
        {selectedCity && (
          <div className="bg-theme-muted/30 p-4 rounded-lg border border-theme-muted">
            <h4 className="font-semibold text-theme-secondary mb-2">Available Hotels</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {availableHotels.filter(h => h.city === selectedCity).map(hotel => (
                <label key={hotel.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                  <input 
                    type="radio" 
                    name="selectedHotel" 
                    checked={selectedHotelId === hotel.id}
                    onChange={() => { setSelectedHotelId(hotel.id); setRoomCategory(""); }}
                  />
                  <span>{hotel.name}</span>
                  {hotel.GoogleReviewRating && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 rounded">★ {hotel.GoogleReviewRating}</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Room Details (Only show if hotel selected) */}
        {currentHotel && (
          <div className="space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currentHotel.rooms.map((room, idx) => (
                <button
                  key={idx}
                  onClick={() => setRoomCategory(room.categoryName)}
                  className={`p-2 rounded border text-sm transition-colors ${roomCategory === room.categoryName ? 'bg-theme-primary text-white border-theme-primary' : 'hover:bg-gray-50'}`}
                >
                  {room.categoryName}
                </button>
              ))}
            </div>

            {/* Meal Plan & Guest Count */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <select className="p-2 border rounded" value={mealPlan} onChange={(e) => setMealPlan(e.target.value)}>
                {['EP', 'CP', 'MAP', 'AP'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" placeholder="Double Rooms" className="p-2 border rounded" value={rooms.double} onChange={e=>setRooms({...rooms, double: parseInt(e.target.value)||0})} />
              <input type="number" placeholder="Extra Adult" className="p-2 border rounded" value={rooms.extraAdult} onChange={e=>setRooms({...rooms, extraAdult: parseInt(e.target.value)||0})} />
              <input type="number" placeholder="Extra Child" className="p-2 border rounded" value={rooms.extraChild} onChange={e=>setRooms({...rooms, extraChild: parseInt(e.target.value)||0})} />
              
              <Button onClick={handleAddHotel} className="bg-theme-secondary hover:bg-theme-dark text-white">
                <Plus size={16} className="mr-1"/> Add Hotel
              </Button>
            </div>
          </div>
        )}

        {/* Selected List */}
        {hotelEntries.length > 0 && (
          <div className="mt-6">
            <h4 className="font-bold text-gray-700 mb-2">Selected Itinerary</h4>
            <div className="space-y-2">
              {hotelEntries.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-l-4 border-l-theme-accent">
                  <div>
                    <p className="font-bold text-theme-dark">{entry.hotel}</p>
                    <p className="text-xs text-gray-600">
                      {entry.city} | {entry.checkInDate} ({entry.nights}N) | {entry.selectedRoomCategory} | {entry.selectedMealPlan}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold">₹{entry.totalCost}</span>
                    <button onClick={() => removeHotel(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HotelSection;