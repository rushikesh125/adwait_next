"use client"
import React, { useState } from 'react';


const EditHotel = ({ hotel, onClose, onSave, onDelete }) => {
    const [hotelData, setHotelData] = useState({
        ...hotel,
        rooms: hotel.rooms || []
    });

    const handleHotelChange = (e) => {
        const { name, value } = e.target;
        setHotelData({ ...hotelData, [name]: value });
    };

    const handleRoomChange = (index, key, value) => {
        const updatedRooms = [...hotelData.rooms];
        updatedRooms[index][key] = value;
        setHotelData({ ...hotelData, rooms: updatedRooms });
    };

    const handleSeasonChange = (roomIndex, seasonIndex, key, value) => {
        const updatedRooms = [...hotelData.rooms];
        updatedRooms[roomIndex].seasons[seasonIndex][key] = value;
        setHotelData({ ...hotelData, rooms: updatedRooms });
    };

    const handlePricingChange = (roomIndex, seasonIndex, plan, type, value) => {
        const updatedRooms = [...hotelData.rooms];
        if(Number(value)>=0){
        updatedRooms[roomIndex].seasons[seasonIndex].pricing[plan][type] = Number(value);
        }
        else{
            alert("Updated Price can not be less than 0.");
        }
        setHotelData({ ...hotelData, rooms: updatedRooms });
    };

    const addRoomCategory = () => {
        const newRoom = {
            categoryName: '',
            seasons: []
        };
        setHotelData({ ...hotelData, rooms: [...hotelData.rooms, newRoom] });
    };

    const addSeasonToRoom = (roomIndex) => {
        const newSeason = {
            name: '',
            start: '',
            end: '',
            pricing: {
                ep: { double: 0, extraAdult: 0, extraChild: 0 },
                cp: { double: 0, extraAdult: 0, extraChild: 0 },
                map: { double: 0, extraAdult: 0, extraChild: 0 },
                ap: { double: 0, extraAdult: 0, extraChild: 0 }
            }
        };
        const updatedRooms = [...hotelData.rooms];
        updatedRooms[roomIndex].seasons.push(newSeason);
        setHotelData({ ...hotelData, rooms: updatedRooms });
    };

    const handleSave = () => {
        onSave(hotelData);
        onClose();
    };

    return (
        <div className="edit-hotel-modal">
            <h2>Edit Hotel</h2>
            <input
                type="text"
                name="name"
                value={hotelData.name}
                onChange={handleHotelChange}
                placeholder="Hotel Name"
            />
            <input
                type="text"
                name="city"
                value={hotelData.city}
                onChange={handleHotelChange}
                placeholder="City"
            />

            <input
                type="text"
                name="state"
                value={hotelData.state}
                onChange={handleHotelChange}
                placeholder="State"
            />
            <input
                type="text"
                name="rating"
                value={hotelData.rating}
                onChange={handleHotelChange}
                placeholder="Rating (e.g., 5-star)"
            />
            <input
                type="text"
                name="GoogleReviewRating"
                value={hotelData.GoogleReviewRating}
                onChange={handleHotelChange}
                placeholder="Google Review Rating"
            />
            <input
                type="text"
                name="GoogleListingURL"
                value={hotelData.GoogleListingURL}
                onChange={handleHotelChange}
                placeholder="Google Listing URL"
            />



            <div className="edit-section">
                <h3>Rooms</h3>
                {hotelData.rooms?.map((room, roomIndex) => (
                    <div key={roomIndex} className="edit-room">
                        <input
                            type="text"
                            placeholder="Room Category Name"
                            value={room.categoryName}
                            onChange={(e) =>
                                handleRoomChange(roomIndex, 'categoryName', e.target.value)
                            }
                        />
                        <button onClick={() => addSeasonToRoom(roomIndex)}>+ Add Season</button>

                        {room.seasons?.map((season, seasonIndex) => (
                            <div key={seasonIndex} className="edit-season">
                                <h4>Season {seasonIndex + 1}</h4>
                                <input
                                    type="text"
                                    placeholder="Season Name"
                                    value={season.name}
                                    onChange={(e) =>
                                        handleSeasonChange(roomIndex, seasonIndex, 'name', e.target.value)
                                    }
                                />
                                <input
                                    type="date"
                                    value={season.start}
                                    onChange={(e) =>
                                        handleSeasonChange(roomIndex, seasonIndex, 'start', e.target.value)
                                    }
                                />
                                <input
                                    type="date"
                                    value={season.end}
                                    onChange={(e) =>
                                        handleSeasonChange(roomIndex, seasonIndex, 'end', e.target.value)
                                    }
                                />

                                <table className="pricing-table">
                                    <thead>
                                        <tr>
                                            <th>Meal Plan</th>
                                            <th>Rate (Double)</th>
                                            <th>Extra Person</th>
                                            <th>Extra Child</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {["ep", "cp", "map", "ap"].map((plan) => (
                                            <tr key={plan}>
                                                <td>{plan.toUpperCase()} Plan</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Double"
                                                        value={season.pricing?.[plan]?.double || 0}
                                                        onChange={(e) =>
                                                            handlePricingChange(roomIndex, seasonIndex, plan, "double", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Extra Adult"
                                                        value={season.pricing?.[plan]?.extraAdult || 0}
                                                        onChange={(e) =>
                                                            handlePricingChange(roomIndex, seasonIndex, plan, "extraAdult", e.target.value)
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder="Extra Child"
                                                        value={season.pricing?.[plan]?.extraChild || 0}
                                                        onChange={(e) =>
                                                            handlePricingChange(roomIndex, seasonIndex, plan, "extraChild", e.target.value)
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                ))}
                <button onClick={addRoomCategory}>+ Add Room Category</button>
            </div>

            <div className="edit-hotel-actions">
                <button className="save-btn" onClick={handleSave}> Save Changes</button>
                <button
                    className="delete-btn"
                    onClick={() => {
                        const confirmDelete = window.confirm("Are you sure you want to delete this hotel?");
                        if (confirmDelete) {
                            onDelete(hotelData.id);
                        }
                    }}
                >
                     Delete Hotel
                </button>

                <button className="cancel-btn" onClick={onClose}> Cancel</button>
            </div>
        </div>
    );
};

export default EditHotel;
