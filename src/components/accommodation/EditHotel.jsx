"use client"
import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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
        if(Number(value) >= 0){
            updatedRooms[roomIndex].seasons[seasonIndex].pricing[plan][type] = Number(value);
            setHotelData({ ...hotelData, rooms: updatedRooms });
        }
    };

    const addRoomCategory = () => {
        const newRoom = {
            categoryName: '',
            seasons: []
        };
        setHotelData({ ...hotelData, rooms: [...hotelData.rooms, newRoom] });
    };

    const removeRoomCategory = (roomIndex) => {
        const updatedRooms = hotelData.rooms.filter((_, index) => index !== roomIndex);
        setHotelData({ ...hotelData, rooms: updatedRooms });
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

    const removeSeason = (roomIndex, seasonIndex) => {
        const updatedRooms = [...hotelData.rooms];
        updatedRooms[roomIndex].seasons = updatedRooms[roomIndex].seasons.filter((_, index) => index !== seasonIndex);
        setHotelData({ ...hotelData, rooms: updatedRooms });
    };

    const handleSave = () => {
        onSave(hotelData);
        onClose();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6" 
            onClick={handleBackdropClick}
        >
            <Card className="w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-scroll">
                {/* Header */}
                <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-theme-primary/5 to-theme-secondary/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-theme-dark">Edit Hotel</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">Update hotel information and pricing</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={onClose}
                            className="h-9 w-9 rounded-full hover:bg-destructive/10"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                    <CardContent className="p-4 sm:p-6 space-y-8">
                        {/* Hotel Basic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-1 bg-theme-primary rounded-full" />
                                <h3 className="text-lg font-semibold text-theme-dark">Basic Information</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">Hotel Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={hotelData.name}
                                        onChange={handleHotelChange}
                                        placeholder="Enter hotel name"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city" className="text-sm font-medium">City *</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={hotelData.city}
                                        onChange={handleHotelChange}
                                        placeholder="Enter city"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="state" className="text-sm font-medium">State *</Label>
                                    <Input
                                        id="state"
                                        name="state"
                                        value={hotelData.state}
                                        onChange={handleHotelChange}
                                        placeholder="Enter state"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rating" className="text-sm font-medium">Star Rating</Label>
                                    <Input
                                        id="rating"
                                        name="rating"
                                        value={hotelData.rating}
                                        onChange={handleHotelChange}
                                        placeholder="e.g., 5-star"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="GoogleReviewRating" className="text-sm font-medium">Google Rating</Label>
                                    <Input
                                        id="GoogleReviewRating"
                                        name="GoogleReviewRating"
                                        value={hotelData.GoogleReviewRating}
                                        onChange={handleHotelChange}
                                        placeholder="e.g., 4.5"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="GoogleListingURL" className="text-sm font-medium">Google Listing URL</Label>
                                    <Input
                                        id="GoogleListingURL"
                                        name="GoogleListingURL"
                                        value={hotelData.GoogleListingURL}
                                        onChange={handleHotelChange}
                                        placeholder="https://..."
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Rooms Section */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-1 bg-theme-primary rounded-full" />
                                    <h3 className="text-lg font-semibold text-theme-dark">Room Categories & Pricing</h3>
                                </div>
                                <Button 
                                    onClick={addRoomCategory}
                                    size="sm"
                                    className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Room Category
                                </Button>
                            </div>
                            
                            {hotelData.rooms?.length === 0 ? (
                                <Alert className="bg-blue-50 border-blue-200">
                                    <AlertDescription className="text-blue-800">
                                        No room categories yet. Click "Add Room Category" button above to create your first room category.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="space-y-4">
                                    {hotelData.rooms?.map((room, roomIndex) => (
                                        <Card key={roomIndex} className="border-2 border-theme-primary/20 overflow-hidden">
                                            <CardHeader className="bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 pb-4">
                                                <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                                                    <div className="flex-1 space-y-2">
                                                        <Label className="text-sm font-medium">Room Category Name *</Label>
                                                        <Input
                                                            placeholder="e.g., Deluxe Room, Suite, Premium Villa"
                                                            value={room.categoryName}
                                                            onChange={(e) =>
                                                                handleRoomChange(roomIndex, 'categoryName', e.target.value)
                                                            }
                                                            className="h-10 bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            onClick={() => addSeasonToRoom(roomIndex)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full sm:w-auto bg-white hover:bg-green-50 border-green-300 text-green-700"
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Add Season
                                                        </Button>
                                                        <Button 
                                                            onClick={() => removeRoomCategory(roomIndex)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="bg-white hover:bg-red-50 border-red-300 text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="pt-4 space-y-4">
                                                {room.seasons?.length === 0 ? (
                                                    <Alert className="bg-amber-50 border-amber-200">
                                                        <AlertDescription className="text-amber-800">
                                                            No seasons defined for this room category. Click "Add Season" to create pricing for different periods.
                                                        </AlertDescription>
                                                    </Alert>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {room.seasons?.map((season, seasonIndex) => (
                                                            <Card key={seasonIndex} className="border-dashed border-2 bg-gray-50/50">
                                                                <CardHeader className="pb-3 bg-white">
                                                                    <div className="flex items-center justify-between">
                                                                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                                                                            <Calendar className="h-4 w-4 text-theme-primary" />
                                                                            Season {seasonIndex + 1}
                                                                        </CardTitle>
                                                                        <Button 
                                                                            onClick={() => removeSeason(roomIndex, seasonIndex)}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent className="space-y-4 pt-4">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Season Name *</Label>
                                                                            <Input
                                                                                placeholder="e.g., Peak Season"
                                                                                value={season.name}
                                                                                onChange={(e) =>
                                                                                    handleSeasonChange(roomIndex, seasonIndex, 'name', e.target.value)
                                                                                }
                                                                                className="h-10 bg-white"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Start Date *</Label>
                                                                            <Input
                                                                                type="date"
                                                                                value={season.start}
                                                                                onChange={(e) =>
                                                                                    handleSeasonChange(roomIndex, seasonIndex, 'start', e.target.value)
                                                                                }
                                                                                className="h-10 bg-white"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">End Date *</Label>
                                                                            <Input
                                                                                type="date"
                                                                                value={season.end}
                                                                                onChange={(e) =>
                                                                                    handleSeasonChange(roomIndex, seasonIndex, 'end', e.target.value)
                                                                                }
                                                                                className="h-10 bg-white"
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Pricing Table */}
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm font-medium">Meal Plan Pricing (₹)</Label>
                                                                        <div className="border rounded-lg overflow-hidden bg-white">
                                                                            <div className="overflow-x-auto">
                                                                                <table className="w-full">
                                                                                    <thead>
                                                                                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                                                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[80px]">Meal Plan</th>
                                                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[100px]">Double Room</th>
                                                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[100px]">Extra Adult</th>
                                                                                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[100px]">Extra Child</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-gray-200">
                                                                                        {["ep", "cp", "map", "ap"].map((plan, idx) => (
                                                                                            <tr key={plan} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                                                                <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-theme-primary/10 text-theme-primary">
                                                                                                        {plan.toUpperCase()}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="px-3 sm:px-4 py-3">
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        placeholder="0"
                                                                                                        value={season.pricing?.[plan]?.double || 0}
                                                                                                        onChange={(e) =>
                                                                                                            handlePricingChange(roomIndex, seasonIndex, plan, "double", e.target.value)
                                                                                                        }
                                                                                                        className="h-9 w-24 sm:w-28 text-sm"
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="px-3 sm:px-4 py-3">
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        placeholder="0"
                                                                                                        value={season.pricing?.[plan]?.extraAdult || 0}
                                                                                                        onChange={(e) =>
                                                                                                            handlePricingChange(roomIndex, seasonIndex, plan, "extraAdult", e.target.value)
                                                                                                        }
                                                                                                        className="h-9 w-24 sm:w-28 text-sm"
                                                                                                    />
                                                                                                </td>
                                                                                                <td className="px-3 sm:px-4 py-3">
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        placeholder="0"
                                                                                                        value={season.pricing?.[plan]?.extraChild || 0}
                                                                                                        onChange={(e) =>
                                                                                                            handlePricingChange(roomIndex, seasonIndex, plan, "extraChild", e.target.value)
                                                                                                        }
                                                                                                        className="h-9 w-24 sm:w-28 text-sm"
                                                                                                    />
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground mt-2">
                                                                            EP: European Plan | CP: Continental Plan | MAP: Modified American Plan | AP: American Plan
                                                                        </p>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="flex-shrink-0 border-t p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                        <Button 
                            variant="outline"
                            onClick={onClose}
                            className="w-full sm:w-auto h-10"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                const confirmDelete = window.confirm("Are you sure you want to delete this hotel? This action cannot be undone.");
                                if (confirmDelete) {
                                    onDelete(hotelData.id);
                                }
                            }}
                            className="w-full sm:w-auto h-10"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Hotel
                        </Button>
                        <Button 
                            onClick={handleSave}
                            className="bg-theme-primary hover:bg-theme-secondary w-full sm:w-auto h-10"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default EditHotel;