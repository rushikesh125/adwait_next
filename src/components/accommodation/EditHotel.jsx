"use client";

import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  updateHotelComplete, 
  deleteHotel as deleteHotelFromDB,
  validateHotelData 
} from '@/firebase/accomodation';
import toast from 'react-hot-toast';

const EditHotel = ({ hotel, onClose, onSave, onDelete }) => {
  const [hotelData, setHotelData] = useState({
    ...hotel,
    name: hotel.name || '',
    city: hotel.city || '',
    state: hotel.state || '',
    rating: hotel.rating || '',
    GoogleReviewRating: hotel.GoogleReviewRating ?? '',
    GoogleListingURL: hotel.GoogleListingURL ?? '',
    rooms: hotel.rooms || []
  });

  const [openSeasons, setOpenSeasons] = useState({});

  const toggleSeason = (roomIdx, seasonIdx) => {
    const key = `${roomIdx}-${seasonIdx}`;
    setOpenSeasons(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Logic for Meal Plan Management ---
  const removeMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = { ...seasons[seasonIndex].pricing };
      
      // Remove the specific plan key
      delete pricing[plan];
      
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const addMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = { 
        ...seasons[seasonIndex].pricing,
        [plan]: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }
      };
      
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  // --- Preserved Existing Logic ---
  const handleHotelChange = (e) => {
    const { name, value } = e.target;
    setHotelData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoomChange = (roomIndex, key, value) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      rooms[roomIndex] = { ...rooms[roomIndex], [key]: value };
      return { ...prev, rooms };
    });
  };

  const handleSeasonChange = (roomIndex, seasonIndex, key, value) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      seasons[seasonIndex] = { ...seasons[seasonIndex], [key]: value };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const handlePricingChange = (roomIndex, seasonIndex, plan, type, value) => {
    const numValue = value === '' ? 0 : Number(value);
    if (numValue < 0) return;

    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = {
        ...seasons[seasonIndex].pricing,
        [plan]: {
          ...(seasons[seasonIndex].pricing?.[plan] || { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }),
          [type]: numValue
        }
      };
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const addRoomCategory = () => {
    const newRoom = { categoryName: '', seasons: [] };
    setHotelData(prev => ({ ...prev, rooms: [...prev.rooms, newRoom] }));
  };

  const removeRoomCategory = (roomIndex) => {
    setHotelData(prev => ({ ...prev, rooms: prev.rooms.filter((_, i) => i !== roomIndex) }));
  };

  const addSeasonToRoom = (roomIndex) => {
    const newSeason = {
      name: '', start: '', end: '',
      pricing: {
        ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
        ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 }
      }
    };
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      rooms[roomIndex] = { ...rooms[roomIndex], seasons: [...(rooms[roomIndex].seasons || []), newSeason] };
      return { ...prev, rooms };
    });
    const newSeasonIdx = (hotelData.rooms[roomIndex].seasons?.length || 0);
    setOpenSeasons(prev => ({ ...prev, [`${roomIndex}-${newSeasonIdx}`]: true }));
  };

  const removeSeason = (roomIndex, seasonIndex) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = rooms[roomIndex].seasons.filter((_, i) => i !== seasonIndex);
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      return { ...prev, rooms };
    });
  };

  const handleSave = async () => {
    // Validate data
    const validation = validateHotelData(hotelData);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Updating hotel...');

    try {
      // Update hotel in Firebase
      const success = await updateHotelComplete(hotel.id, hotelData);
      
      toast.dismiss(loadingToast);
      
      if (success) {
        // Call the onSave callback if provided
        if (onSave) {
          onSave(hotelData);
        }
        onClose();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error in handleSave:", error);
      toast.error("Failed to save hotel");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${hotelData.name}"? This action cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting hotel...');

    try {
      const success = await deleteHotelFromDB(hotel.id);
      
      toast.dismiss(loadingToast);
      
      if (success) {
        if (onDelete) {
          onDelete(hotel.id);
        }
        onClose();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error deleting hotel:", error);
      toast.error("Failed to delete hotel");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Card className="w-full max-w-6xl lg:max-w max-h-[95vh] sm:max-h-[90vh] overflow-scroll flex flex-col shadow-2xl border border-theme-primary/20">
        <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-theme-primary/5 to-theme-secondary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-theme-dark">Edit Hotel</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Update hotel information and pricing</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-destructive/10">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-4 sm:p-6 space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hotel Name *</Label>
                <Input name="name" value={hotelData.name} onChange={handleHotelChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">City *</Label>
                <Input name="city" value={hotelData.city} onChange={handleHotelChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">State *</Label>
                <Input name="state" value={hotelData.state} onChange={handleHotelChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Star Rating</Label>
                <Input name="rating" value={hotelData.rating} onChange={handleHotelChange} placeholder="e.g., 5-star" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Google Review Rating</Label>
                <Input name="GoogleReviewRating" type="number" step="0.1" min="0" max="5" value={hotelData.GoogleReviewRating} onChange={handleHotelChange} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Google Listing URL</Label>
                <Input name="GoogleListingURL" value={hotelData.GoogleListingURL} onChange={handleHotelChange} placeholder="https://goo.gl/maps/..." className="h-10" />
              </div>
            </div>

            <Separator />

            {/* Rooms Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-theme-dark">Room Categories</h3>
                <Button onClick={addRoomCategory} size="sm" className="bg-theme-primary"><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
              </div>

              {hotelData.rooms?.map((room, roomIndex) => (
                <Card key={roomIndex} className="border-2 border-theme-primary/10">
                  <CardHeader className="bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row gap-3 justify-between">
                      <Input
                        placeholder="Room Category Name"
                        value={room.categoryName}
                        onChange={(e) => handleRoomChange(roomIndex, 'categoryName', e.target.value)}
                        className="max-w-md bg-white"
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => addSeasonToRoom(roomIndex)} variant="outline" size="sm" className="text-green-600 border-green-200"><Plus className="h-4 w-4 mr-1" /> Season</Button>
                        <Button onClick={() => removeRoomCategory(roomIndex)} variant="outline" size="sm" className="text-red-600 border-red-200"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-4">
                    {room.seasons?.map((season, seasonIndex) => {
                      const isOpen = openSeasons[`${roomIndex}-${seasonIndex}`];
                      const availablePlans = ["ep", "cp", "map", "ap"];
                      const activePlans = Object.keys(season.pricing || {});
                      const missingPlans = availablePlans.filter(p => !activePlans.includes(p));

                      return (
                        <div key={seasonIndex} className="border rounded-lg overflow-hidden">
                          <div 
                            onClick={() => toggleSeason(roomIndex, seasonIndex)}
                            className={`flex items-center justify-between p-3 cursor-pointer ${isOpen ? 'bg-theme-primary/5' : 'bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              <Badge variant="outline" className="bg-white">{season.name || 'Unnamed Season'}</Badge>
                              <span className="text-xs text-muted-foreground">{season.start} to {season.end}</span>
                            </div>
                            <Button onClick={(e) => { e.stopPropagation(); removeSeason(roomIndex, seasonIndex); }} variant="ghost" size="sm" className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
                          </div>

                          {isOpen && (
                            <div className="p-4 bg-white border-t space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <Input placeholder="Season Name" value={season.name} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'name', e.target.value)} />
                                <Input type="date" value={season.start} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'start', e.target.value)} />
                                <Input type="date" value={season.end} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'end', e.target.value)} />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4" /> Meal Plans & Pricing</Label>
                                  {missingPlans.length > 0 && (
                                    <div className="flex gap-1">
                                      {missingPlans.map(plan => (
                                        <Button key={plan} variant="ghost" size="xs" onClick={() => addMealPlan(roomIndex, seasonIndex, plan)} className="text-[10px] h-6 px-2 bg-slate-100 uppercase">+ {plan}</Button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="border rounded-md overflow-x-auto">
                                  <table className="w-full text-sm min-w-[600px]">
                                    <thead className="bg-slate-50 border-b">
                                      <tr>
                                        <th className="p-2 text-left">Plan</th>
                                        <th className="p-2 text-left">Double</th>
                                        <th className="p-2 text-left">Extra Adult</th>
                                        <th className="p-2 text-left">Extra Child</th>
                                        <th className="p-2 text-left text-theme-primary">CNB</th>
                                        <th className="p-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {activePlans.map((plan) => (
                                        <tr key={plan} className="hover:bg-slate-50/50">
                                          <td className="p-2 font-bold uppercase text-theme-primary">{plan}</td>
                                          <td className="p-1">
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                              <Input 
                                                type="number" 
                                                value={season.pricing[plan]?.double ?? ''} 
                                                onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "double", e.target.value)} 
                                                className="h-8 pl-6" 
                                              />
                                            </div>
                                          </td>
                                          <td className="p-1">
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                              <Input 
                                                type="number" 
                                                value={season.pricing[plan]?.extraAdult ?? ''} 
                                                onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraAdult", e.target.value)} 
                                                className="h-8 pl-6" 
                                              />
                                            </div>
                                          </td>
                                          <td className="p-1">
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                              <Input 
                                                type="number" 
                                                value={season.pricing[plan]?.extraChild ?? ''} 
                                                onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraChild", e.target.value)} 
                                                className="h-8 pl-6" 
                                              />
                                            </div>
                                          </td>
                                          <td className="p-1">
                                            <div className="relative">
                                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                              <Input 
                                                type="number" 
                                                value={season.pricing[plan]?.cnb ?? ''} 
                                                onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "cnb", e.target.value)} 
                                                className="h-8 pl-6 border-theme-primary/30 focus:border-theme-primary" 
                                              />
                                            </div>
                                          </td>
                                          <td className="p-1 text-center">
                                            <Button variant="ghost" size="icon" onClick={() => removeMealPlan(roomIndex, seasonIndex, plan)} className="h-7 w-7 text-slate-400 hover:text-red-500">
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                      {activePlans.length === 0 && (
                                        <tr>
                                          <td colSpan="6" className="p-4 text-center text-muted-foreground italic">No meal plans added. Add one using the buttons above.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </ScrollArea>

        <div className="border-t p-4 bg-gray-50 flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete Hotel</Button>
          <Button onClick={handleSave} className="bg-theme-primary">Save Changes</Button>
        </div>
      </Card>
    </div>
  );
};

export default EditHotel;