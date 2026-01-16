"use client"
import React, { useState, useEffect } from "react";
// import AddHotel from "./AccommodationScreens/AddHotel";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import AddHotel from "@/components/accommodation/AddHotel";
import EditHotel from "@/components/accommodation/EditHotel";
// import EditHotel from "./AccommodationScreens/EditHotel";

const Accommodation = () => {
    const [hotels, setHotels] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddHotelModal, setShowAddHotelModal] = useState(false);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        fetchHotels();
    }, []);

    const fetchHotels = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "hotels"));
            // const hotelList = querySnapshot.docs.map(doc => ({
            //     id: doc.id,
            //     ...doc.data()
            // }));

            const hotelList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    rooms: data.rooms || []  // fallback for safety
                };
            });

            const uniqueHotelsMap = new Map();
            const uniqueHotels = hotelList.filter(hotel => {
                const key = `${hotel.name.toLowerCase()}-${hotel.state.toLowerCase()}-${hotel.city.toLowerCase()}`;
                if (!uniqueHotelsMap.has(key)) {
                    uniqueHotelsMap.set(key, true);
                    return true;
                }
                return false;
            });

            setHotels(uniqueHotels);
        } catch (error) {
            console.error("Error fetching hotels:", error);
        }
    };

    const handleAddHotel = () => {
        setShowAddHotelModal(true);
    };

    const filteredHotels = hotels.filter(hotel => {
        const query = searchQuery.toLowerCase();
        return (
            hotel.name?.toLowerCase().includes(query) ||
            hotel.city?.toLowerCase().includes(query) ||
            hotel.state?.toLowerCase().includes(query)
        );
    });

    const groupedHotels = filteredHotels.reduce((acc, hotel) => {
        const key = `${hotel.state}-${hotel.city}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(hotel);
        return acc;
    }, {});



    const handleEditHotel = (hotel) => {
        setSelectedHotel(hotel);
        setIsEditModalOpen(true);
    };


    const handleSaveHotel = async (updatedHotel) => {
        try {
            // Update hotel in the database
            await updateDoc(doc(db, 'hotels', updatedHotel.id), updatedHotel);
            // Refresh hotel list
            fetchHotels();
        } catch (error) {
            console.error('Error updating hotel:', error);
        }
    };

    const handleDeleteHotel = async (hotelId) => {
        try {
            // Delete hotel from the database
            await deleteDoc(doc(db, 'hotels', hotelId));
            // Refresh hotel list
            fetchHotels();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error deleting hotel:', error);
        }
    };



    return (
  <div className="min-h-screen bg-theme-muted/40 px-4 md:px-10 py-8">
    {/* Header */}
    <div className="mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-3">
        <h1 className="text-3xl font-semibold text-theme-dark tracking-wide">
          Accommodation & Meals Management
        </h1>

        <button
          className="bg-theme-primary hover:bg-theme-secondary text-white px-5 py-2 rounded-lg shadow-sm text-sm font-medium"
          onClick={handleAddHotel}
        >
          + Add Hotel
        </button>
      </div>

      <p className="text-theme-dark/60 mt-2 text-sm max-w-xl">
        Manage accommodations, room categories & hotel ratings. Includes grouping by state/city.
      </p>
    </div>

    {/* Search */}
    <div className="mb-6">
      <input
        type="text"
        className="w-full md:max-w-lg border border-theme-primary/30 rounded-md px-4 py-2 bg-white focus:ring-2 focus:ring-theme-primary outline-none"
        placeholder="🔍 Search hotels by name, city, or state..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>

    {/* Hotels */}
    <div>
      <h2 className="text-2xl font-semibold text-theme-dark mb-4">
        Available Hotels
      </h2>

      {Object.entries(groupedHotels).length === 0 ? (
        <p className="text-theme-dark/60 text-center pt-10">No hotels found.</p>
      ) : (
        Object.entries(groupedHotels).map(([location, hotelsInGroup]) => (
          <div key={location} className="mb-10">
            <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-theme-dark">
              📍 {location.replace("-", ", ")}
            </h3>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hotelsInGroup.map((hotel) => (
                <div
                  key={hotel.id}
                  className="bg-white border border-theme-primary/20 rounded-lg shadow-sm p-4 space-y-2 hover:shadow-md transition cursor-pointer"
                  onClick={() => handleEditHotel(hotel)}
                >
                  <h4 className="font-semibold text-theme-primary underline decoration-theme-accent underline-offset-2">
                    {hotel.name
                      ?.toLowerCase()
                      .split(" ")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </h4>

                  <p className="text-sm text-theme-dark">
                    <strong className="font-medium">Rooms:</strong>{" "}
                    {hotel.rooms?.map((r) => r.categoryName).join(", ") || "—"}
                  </p>

                  <p className="text-sm text-theme-dark">
                    <strong className="font-medium">Rating:</strong> {hotel.rating} 🌟
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>

    {/* Add Hotel Modal */}
    {showAddHotelModal && (
      <AddHotel
        onClose={() => {
          setShowAddHotelModal(false);
          fetchHotels();
        }}
        hotelToEdit={null}
      />
    )}

    {/* Edit Hotel + Backdrop */}
    {isEditModalOpen && selectedHotel && (
      <>
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsEditModalOpen(false)}
        />
        <EditHotel
          hotel={selectedHotel}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveHotel}
          onDelete={handleDeleteHotel}
        />
      </>
    )}
  </div>
);
};

export default Accommodation;
