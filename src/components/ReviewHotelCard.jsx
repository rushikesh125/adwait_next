"use client";

import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  MapPin, 
  Hotel, 
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
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
      onSave(updated);
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
    <Card className="w-full border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden bg-white rounded-3xl transition-all hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)]">
      <CardHeader className="border-b border-slate-50 bg-[#FBFDFF] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-theme-primary/10 rounded-2xl flex items-center justify-center">
              <Hotel className="h-6 w-6 text-theme-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-0.5">Hotel Record #{index + 1}</p>
              <CardTitle className="text-xl font-black text-theme-dark tracking-tight">
                {hotelData.name || "UNNAMED PROPERTY"}
              </CardTitle>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDelete} 
            className="h-10 w-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">Legal Property Name</Label>
            <Input 
              name="name" 
              value={hotelData.name} 
              onChange={handleHotelChange} 
              className="h-12 border-slate-200 rounded-xl focus:ring-theme-primary/20 font-bold"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">City / District</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <Input 
                name="city" 
                value={hotelData.city} 
                onChange={handleHotelChange} 
                className="h-12 pl-10 border-slate-200 rounded-xl font-medium"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-wider text-slate-400 ml-1">State</Label>
            <Input 
              name="state" 
              value={hotelData.state} 
              onChange={handleHotelChange} 
              className="h-12 border-slate-200 rounded-xl font-medium"
            />
          </div>
        </div>

        {/* Room Categories */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="h-4 w-4 text-theme-primary" />
            <h4 className="font-black text-theme-dark uppercase tracking-widest text-xs">Inventory Configurations</h4>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {hotelData.rooms?.map((room, roomIndex) => (
            <div key={roomIndex} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
              <div className="mb-6">
                <Label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Room Category</Label>
                <Input
                  placeholder="e.g. Executive Deluxe Room"
                  value={room.categoryName}
                  onChange={(e) => handleRoomChange(roomIndex, 'categoryName', e.target.value)}
                  className="h-12 font-bold bg-white border-slate-200 rounded-xl shadow-sm focus:ring-theme-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {room.seasons?.map((season, seasonIndex) => {
                  const isOpen = openSeasons[`${roomIndex}-${seasonIndex}`];
                  const availablePlans = ["ep", "cp", "map", "ap"];
                  const activePlans = Object.keys(season.pricing || {});
                  const missingPlans = availablePlans.filter(p => !activePlans.includes(p));

                  return (
                    <div key={seasonIndex} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all">
                      <div 
                        onClick={() => toggleSeason(roomIndex, seasonIndex)}
                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isOpen ? 'bg-slate-50 border-b' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-theme-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-theme-dark uppercase tracking-tight">{season.name || 'Undefined Season'}</span>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {season.start || 'Start'} — {season.end || 'End'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           {activePlans.map(p => (
                             <Badge key={p} className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none uppercase text-[9px] font-black">{p}</Badge>
                           ))}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
                          {/* Season Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Season Identifier</Label>
                              <Input value={season.name} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'name', e.target.value)} className="h-10 rounded-lg text-sm font-bold" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Valid From</Label>
                              <Input type="date" value={season.start} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'start', e.target.value)} className="h-10 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">Valid Until</Label>
                              <Input type="date" value={season.end} onChange={(e) => handleSeasonChange(roomIndex, seasonIndex, 'end', e.target.value)} className="h-10 rounded-lg text-sm" />
                            </div>
                          </div>

                          {/* Pricing Matrix */}
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-theme-primary" />
                                <span className="text-xs font-black text-theme-dark uppercase tracking-widest">Pricing Matrix</span>
                              </div>
                              <div className="flex gap-1.5">
                                {missingPlans.map(plan => (
                                  <Button 
                                    key={plan} 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={(e) => { e.stopPropagation(); addMealPlan(roomIndex, seasonIndex, plan); }} 
                                    className="text-[9px] h-7 font-black uppercase border-theme-primary/20 text-theme-primary hover:bg-theme-primary hover:text-white rounded-lg transition-all"
                                  >
                                    + {plan}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="overflow-hidden rounded-xl border border-slate-100 shadow-inner">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-[9px] uppercase font-black text-slate-400 tracking-[0.1em]">
                                  <tr>
                                    <th className="p-3 text-left w-24">Meal Plan</th>
                                    <th className="p-3 text-left">Double Rate</th>
                                    <th className="p-3 text-left">Extra Adult</th>
                                    <th className="p-3 text-left">Extra Child</th>
                                    <th className="p-3"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {activePlans.map((plan) => (
                                    <tr key={plan} className="group/row hover:bg-slate-50/50">
                                      <td className="p-3">
                                        <Badge className="bg-theme-primary text-white font-black uppercase text-[10px] px-2 py-0.5 rounded-md">{plan}</Badge>
                                      </td>
                                      <td className="p-2">
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">₹</span>
                                          <Input type="number" value={season.pricing[plan]?.double ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "double", e.target.value)} className="h-9 pl-6 text-xs font-bold border-slate-100 bg-white" />
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">₹</span>
                                          <Input type="number" value={season.pricing[plan]?.extraAdult ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraAdult", e.target.value)} className="h-9 pl-6 text-xs font-bold border-slate-100 bg-white" />
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]">₹</span>
                                          <Input type="number" value={season.pricing[plan]?.extraChild ?? ''} onChange={(e) => handlePricingChange(roomIndex, seasonIndex, plan, "extraChild", e.target.value)} className="h-9 pl-6 text-xs font-bold border-slate-100 bg-white" />
                                        </div>
                                      </td>
                                      <td className="p-2 text-center">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => removeMealPlan(roomIndex, seasonIndex, plan)} 
                                          className="h-8 w-8 text-slate-200 hover:text-red-400 transition-colors"
                                        >
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