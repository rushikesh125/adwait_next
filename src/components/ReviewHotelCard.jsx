"use client";

import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Utensils, MapPin, Hotel, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const ReviewHotelCard = ({ hotel, onSave, onDelete, index }) => {
  const [hotelData, setHotelData] = useState({
    ...hotel,
    name: hotel.name || '',
    city: hotel.city || '',
    state: hotel.state || '',
    rating: hotel.rating || '',
    rooms: hotel.rooms || []
  });

  const [openSeasons, setOpenSeasons] = useState({});

  const toggleSeason = (roomIdx, seasonIdx) => {
    const key = `${roomIdx}-${seasonIdx}`;
    setOpenSeasons(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleHotelChange = (e) => {
    const { name, value } = e.target;
    setHotelData(prev => {
      const updated = { ...prev, [name]: value };
      onSave(updated); // Sync with parent state immediately
      return updated;
    });
  };

  const handleRoomChange = (roomIndex, key, value) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      rooms[roomIndex] = { ...rooms[roomIndex], [key]: value };
      const updated = { ...prev, rooms };
      onSave(updated);
      return updated;
    });
  };

  const handleSeasonChange = (roomIndex, seasonIndex, key, value) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      seasons[seasonIndex] = { ...seasons[seasonIndex], [key]: value };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      const updated = { ...prev, rooms };
      onSave(updated);
      return updated;
    });
  };

  const handlePricingChange = (roomIndex, seasonIndex, plan, type, value) => {
    const numValue = value === '' ? 0 : Number(value);
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = {
        ...seasons[seasonIndex].pricing,
        [plan]: {
          ...(seasons[seasonIndex].pricing?.[plan] || { double: 0, extraAdult: 0, extraChild: 0 }),
          [type]: numValue
        }
      };
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      const updated = { ...prev, rooms };
      onSave(updated);
      return updated;
    });
  };

  const addMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = { 
        ...seasons[seasonIndex].pricing,
        [plan]: { double: 0, extraAdult: 0, extraChild: 0 }
      };
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      const updated = { ...prev, rooms };
      onSave(updated);
      return updated;
    });
  };

  const removeMealPlan = (roomIndex, seasonIndex, plan) => {
    setHotelData(prev => {
      const rooms = [...prev.rooms];
      const seasons = [...rooms[roomIndex].seasons];
      const pricing = { ...seasons[seasonIndex].pricing };
      delete pricing[plan];
      seasons[seasonIndex] = { ...seasons[seasonIndex], pricing };
      rooms[roomIndex] = { ...rooms[roomIndex], seasons };
      const updated = { ...prev, rooms };
      onSave(updated);
      return updated;
    });
  };

  return (
    <Card className="w-full shadow-lg border-2 border-theme-primary/10 overflow-hidden bg-white">
      <CardHeader className="border-b bg-slate-50/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-theme-primary/10 rounded-full">
               <Hotel className="h-5 w-5 text-theme-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-theme-dark">
                {hotelData.name || "Unnamed Hotel"}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" /> {hotelData.city}, {hotelData.state}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:bg-red-50">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase text-slate-500">Hotel Name</Label>
            <Input name="name" value={hotelData.name} onChange={handleHotelChange} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase text-slate-500">City</Label>
            <Input name="city" value={hotelData.city} onChange={handleHotelChange} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase text-slate-500">State</Label>
            <Input name="state" value={hotelData.state} onChange={handleHotelChange} />
          </div>
        </div>

        <Separator />

        {/* Room Categories */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-theme-dark uppercase tracking-tight text-sm">Room Categories & Seasons</h4>
          </div>

          {hotelData.rooms?.map((room, roomIndex) => (
            <div key={roomIndex} className="border rounded-xl p-4 bg-slate-50/30">
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Category Name (e.g. Deluxe Room)"
                  value={room.categoryName}
                  onChange={(e) => handleRoomChange(roomIndex, 'categoryName', e.target.value)}
                  className="font-semibold bg-white"
                />
              </div>

              <div className="space-y-3">
                {room.seasons?.map((season, seasonIndex) => {
                  const isOpen = openSeasons[`${roomIndex}-${seasonIndex}`];
                  const availablePlans = ["ep", "cp", "map", "ap"];
                  const activePlans = Object.keys(season.pricing || {});
                  const missingPlans = availablePlans.filter(p => !activePlans.includes(p));

                  return (
                    <div key={seasonIndex} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                      <div 
                        onClick={() => toggleSeason(roomIndex, seasonIndex)}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isOpen ? 'border-b bg-theme-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <Badge variant="outline" className="font-bold">{season.name || 'Set Season Name'}</Badge>
                          <span className="text-xs text-slate-500">{season.start} — {season.end}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-4 space-y-4 animate-in slide-in-from-top-1">
                          <div className="grid grid-cols-3 gap-3">
                            <Input placeholder="Season Name" value={season.name} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'name', e.target.value)} />
                            <Input type="date" value={season.start} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'start', e.target.value)} />
                            <Input type="date" value={season.end} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'end', e.target.value)} />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold uppercase flex items-center gap-2"><Utensils className="h-3 w-3" /> Pricing Table</Label>
                              <div className="flex gap-1">
                                {missingPlans.map(plan => (
                                  <Button key={plan} variant="outline" size="xs" onClick={() => addMealPlan(roomIndex, seasonIndex, plan)} className="text-[10px] h-6 uppercase">+ {plan}</Button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                                  <tr>
                                    <th className="p-2 text-left">Plan</th>
                                    <th className="p-2 text-left">Double</th>
                                    <th className="p-2 text-left">Ext. Adult</th>
                                    <th className="p-2 text-left">Ext. Child</th>
                                    <th className="p-2"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {activePlans.map((plan) => (
                                    <tr key={plan}>
                                      <td className="p-2 font-bold uppercase text-theme-primary">{plan}</td>
                                      <td className="p-1"><Input type="number" value={season.pricing[plan]?.double ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "double", e.target.value)} className="h-8 text-xs" /></td>
                                      <td className="p-1"><Input type="number" value={season.pricing[plan]?.extraAdult ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraAdult", e.target.value)} className="h-8 text-xs" /></td>
                                      <td className="p-1"><Input type="number" value={season.pricing[plan]?.extraChild ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraChild", e.target.value)} className="h-8 text-xs" /></td>
                                      <td className="p-1 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => removeMealPlan(roomIndex, seasonIndex, plan)} className="h-7 w-7 text-slate-300 hover:text-red-500">
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewHotelCard;