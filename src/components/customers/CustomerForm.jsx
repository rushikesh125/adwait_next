"use client";

import React from "react";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  Save 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerForm({ form, onChange, onSubmit, editMode }) {
  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-theme-primary" />
              Customer Name
            </Label>
            <Input
              id="name"
              name="name" 
              value={form.name || " "}
              placeholder="John Doe"
              onChange={onChange}
              className="border-slate-200 focus-visible:ring-theme-primary h-11"
              required
            />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="mobile" className="text-slate-700 font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4 text-theme-primary" />
              Mobile Number
            </Label>
            <Input
              id="mobile"
              type="number"
              name="mobile"
              value={form.mobile}
              placeholder="9876543210"
              onChange={onChange}
               max={14}
              min ={10}
             
              className="border-slate-200 focus-visible:ring-theme-primary h-11"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-theme-primary" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="john@example.com"
              value={form.email}
              onChange={onChange}
              className="border-slate-200 focus-visible:ring-theme-primary h-11"
              required
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city" className="text-slate-700 font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-theme-primary" />
              City
            </Label>
            <Input
              id="city"
              name="city"
              value={form.city}
              placeholder="Mumbai"
              onChange={onChange}
              className="border-slate-200 focus-visible:ring-theme-primary h-11"
              required
            />
          </div>

          {/* State */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="state" className="text-slate-700 font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-theme-primary" />
              State / Province
            </Label>
            <Input
              id="state"
              name="state"
              value={form.state}
              placeholder="Maharashtra"
              onChange={onChange}
              className="border-slate-200 focus-visible:ring-theme-primary h-11"
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <p className="text-xs text-slate-400 mr-auto flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            All fields are required for lead generation.
          </p>
          
          <Button 
            type="submit" 
            size="lg" 
            className="bg-theme-primary hover:bg-theme-secondary text-white px-8 shadow-md shadow-theme-primary/10 transition-all active:scale-95"
          >
            {editMode ? (
              <><Save className="h-4 w-4 mr-2" /> Update Profile</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Save Customer</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}