"use client";

import React from "react";
import { 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Hotel, 
  Plane, 
  Wallet, 
  FileText,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function LeadForm({ form, onChange, onSubmit }) {
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {/* --- Section 1: Basic Trip Info --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-5 w-5 text-theme-primary" />
            <h4 className="text-sm font-bold text-theme-dark uppercase tracking-wider">Trip Details</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <User className="h-4 w-4 text-theme-primary/60" /> Lead Name
              </Label>
              <Input
                name="name"
                value={form.name}
                placeholder="Full Name"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <MapPin className="h-4 w-4 text-theme-primary/60" /> Travel To
              </Label>
              <Input
                name="Destination"
                value={form.Destination}
                placeholder="City or Country"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="h-4 w-4 text-theme-primary/60" /> Travel Date
              </Label>
              <Input
                type="date"
                name="travelDate"
                value={form.travelDate}
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary cursor-pointer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Clock className="h-4 w-4 text-theme-primary/60" /> Number of Days
              </Label>
              <Input
                type="number"
                name="days"
                value={form.days}
                placeholder="Duration"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* --- Section 2: Preferences & Logistics --- */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Hotel className="h-5 w-5 text-theme-primary" />
            <h4 className="text-sm font-bold text-theme-dark uppercase tracking-wider">Preferences</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Users className="h-4 w-4 text-theme-primary/60" /> Adults
              </Label>
              <Input
                type="number"
                name="adults"
                value={form.adults}
                placeholder="Number of travelers"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Wallet className="h-4 w-4 text-theme-primary/60" /> Budget (approx)
              </Label>
              <Input
                type="number"
                name="budget"
                value={form.budget}
                placeholder="Enter amount"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Hotel className="h-4 w-4 text-theme-primary/60" /> Hotel Preference
              </Label>
              <Input
                name="hotelPreference"
                value={form.hotelPreference}
                placeholder="e.g. 4 Star, Resort"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-medium">
                <Plane className="h-4 w-4 text-theme-primary/60" /> Transport Preference
              </Label>
              <Input
                name="transportPreference"
                value={form.transportPreference}
                placeholder="Flight / Train / Private Car"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
              />
            </div>
          </div>
        </div>

        {/* --- Section 3: Notes --- */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-slate-700 font-medium">
            <FileText className="h-4 w-4 text-theme-primary/60" /> Additional Requirements
          </Label>
          <Textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Include any specific details (e.g. Vegetarian meals, wheel-chair access, honeymoon amenities)"
            className="border-slate-200 focus-visible:ring-theme-primary resize-none p-4"
            rows={4}
          />
        </div>

        {/* Footer Submit */}
        <div className="pt-6 flex justify-end">
          <Button 
            size="lg" 
            type="submit"
            className="bg-theme-primary hover:bg-theme-secondary text-white px-10 shadow-lg shadow-theme-primary/20 rounded-xl"
          >
            <Send className="h-4 w-4 mr-2" />
            Save Lead & Notify Team
          </Button>
        </div>
      </form>
    </div>
  );
}