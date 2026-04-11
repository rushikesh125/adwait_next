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
  Send,
} from "lucide-react";
import { Coffee, Utensils, ChefHat } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectTriggerClass =
  "h-11 w-full bg-white border-slate-200 px-3 py-2.5 text-sm leading-6 focus:ring-theme-primary";

function FieldLabel({ icon: Icon, children, required = false, optional = false }) {
  return (
    <Label className="flex items-center gap-2 text-slate-700 font-medium">
      {Icon ? <Icon className="h-4 w-4 text-theme-primary/60" /> : null}
      <span>{children}</span>
      {required ? <span className="text-red-500">*</span> : null}
      {optional ? (
        <span className="text-xs font-normal text-slate-400">(Optional)</span>
      ) : null}
    </Label>
  );
}

export default function LeadForm({
  form,
  onChange,
  onSubmit,
  submitLabel = "Save Lead",
}) {
  const childCount = Math.max(0, Number(form.children || 0));
  const childAges = Array.isArray(form.childAges) ? form.childAges : [];

  const updateChildCount = (value) => {
    const nextCount = Math.max(0, Number(value || 0));
    const nextAges = Array.from(
      { length: nextCount },
      (_, index) => childAges[index] ?? "",
    );

    onChange({ target: { name: "children", value } });
    onChange({ target: { name: "childAges", value: nextAges } });
  };

  const updateChildAge = (index, value) => {
    const nextAges = Array.from(
      { length: childCount },
      (_, ageIndex) => (ageIndex === index ? value : childAges[ageIndex] ?? ""),
    );

    onChange({ target: { name: "childAges", value: nextAges } });
  };

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            Fields marked <span className="text-red-500">*</span> are required.
          </span>{" "}
          All other fields are optional.
        </div>

        {/* --- Section 1: Basic Trip Info --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-5 w-5 text-theme-primary" />
            <h4 className="text-sm font-bold text-theme-dark uppercase tracking-wider">
              Trip Details
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 relative">
              <FieldLabel icon={User} required>
                Lead Name
              </FieldLabel>
              <Input
                name="name"
                value={form.name}
                placeholder="Enter full name"
                onChange={onChange}
                autoComplete="off"
                className="h-11 border-slate-200 focus-visible:ring-theme-primary transition-all pr-10"
                required
              />
              {/* Optional: Visual indicator that it's a searchable field */}
              <div className="absolute right-3 top-[38px] text-slate-300">
                {" "}
                <Users className="h-4 w-4" />
              </div>{" "}
            </div>

            <div className="space-y-2">
              <FieldLabel icon={MapPin} required>
                Travel To
              </FieldLabel>
              <Input
                name="destination"
                value={form.destination}
                placeholder="City or Country"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <FieldLabel icon={Calendar} required>
                Travel Date
              </FieldLabel>
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
              <FieldLabel icon={Clock} required>
                Number of Days
              </FieldLabel>
              <Input
                type="text"
                name="days"
                value={form.days}
                placeholder="Duration"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>
            {/* Departure City */}
            <div className="space-y-2">
              <FieldLabel icon={MapPin} required>
                Departure City
              </FieldLabel>
              <Input
                name="departureCity"
                value={form.departureCity}
                placeholder="City name"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>
            {/* Type of Trip */}
            <div className="space-y-2">
              <FieldLabel icon={Users} required>
                Type of Trip
              </FieldLabel>
              <Select
                value={form.tripType}
                onValueChange={(value) =>
                  onChange({
                    target: {
                      name: "tripType",
                      value,
                    },
                  })
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>

                <SelectContent
                  side="bottom"
                  position="popper"
                  align="start"
                  className="w-[var(--radix-select-trigger-width)]"
                >
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Honeymoon">Honeymoon</SelectItem>
                  <SelectItem value="Group">Group</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Couple">Couple</SelectItem>
                  <SelectItem value="Study">Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* --- Section 2: Preferences & Logistics --- */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Hotel className="h-5 w-5 text-theme-primary" />
            <h4 className="text-sm font-bold text-theme-dark uppercase tracking-wider">
              Preferences
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <FieldLabel icon={Users} required>
                Adults
              </FieldLabel>
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
              <FieldLabel icon={Users} optional>
                Children
              </FieldLabel>
              <Input
                type="number"
                name="children"
                value={form.children}
                placeholder="Number of children"
                onChange={(e) => updateChildCount(e.target.value)}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
              />
            </div>

            {childCount > 0 && (
              <div className="space-y-3 md:col-span-2">
                <FieldLabel icon={Coffee} required>
                  Child Ages
                </FieldLabel>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Array.from({ length: childCount }).map((_, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs font-medium text-slate-500">
                        Child {index + 1} Age <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={childAges[index] ?? ""}
                        placeholder="Age"
                        onChange={(e) => updateChildAge(index, e.target.value)}
                        className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                        required
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Please enter the age of each child. These ages are mandatory.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <FieldLabel icon={Hotel} optional>
                Hotel Preference
              </FieldLabel>

              <div className="flex flex-wrap gap-4">
                {["3 Star", "4 Star", "5 Star"].map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="hotelPreference"
                      value={category}
                      checked={form.hotelPreference === category}
                      onChange={onChange}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel icon={Utensils} required>
                Meal Plan
              </FieldLabel>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mealPlan"
                    value="CP"
                    checked={form.mealPlan === "CP"}
                    onChange={onChange}
                  />
                  CP - Breakfast
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mealPlan"
                    value="MAP"
                    checked={form.mealPlan === "MAP"}
                    onChange={onChange}
                  />
                  MAP - Breakfast & Dinner
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mealPlan"
                    value="AP"
                    checked={form.mealPlan === "AP"}
                    onChange={onChange}
                  />
                  AP - Breakfast, Lunch & Dinner
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel icon={Wallet} optional>
                Budget (approx)
              </FieldLabel>
              <Input
                type="number"
                name="budget"
                value={form.budget}
                placeholder="Enter amount"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
              />
            </div>
            {/* No of Rooms Required */}
            <div className="space-y-2">
              <FieldLabel icon={Hotel} required>
                No. of Rooms Required
              </FieldLabel>
              <Input
                type="number"
                name="rooms"
                value={form.rooms}
                placeholder="Number of rooms"
                onChange={onChange}
                className="h-11 border-slate-200 focus-visible:ring-theme-primary"
                required
              />
            </div>

            {/* Vehicle for Sightseeing */}
            <div className="space-y-2">
              <FieldLabel icon={Plane} optional>
                Vehicle for Sightseeing
              </FieldLabel>

              <Select
                value={form.sightseeingVehicle}
                onValueChange={(value) =>
                  onChange({
                    target: {
                      name: "sightseeingVehicle",
                      value,
                    },
                  })
                }
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>

                <SelectContent
                  align="start"
                  side="bottom"
                  position="popper"
                  className="w-[var(--radix-select-trigger-width)]"
                >
                  <SelectItem value="Sedan">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Tempo Traveller">
                    Tempo Traveller
                  </SelectItem>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="Not Required">Not Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Need Help With Ticket Booking */}
            <div className="space-y-2">
              <FieldLabel icon={Send} optional>
                Need Help With Tickets Booking?
              </FieldLabel>

              <div className="flex flex-wrap gap-4">
                {["Flight", "Train", "Bus", "Not Required"].map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.ticketHelp.includes(item)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...form.ticketHelp, item]
                          : form.ticketHelp.filter((v) => v !== item);

                        onChange({
                          target: {
                            name: "ticketHelp",
                            value: updated,
                          },
                        });
                      }}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 3: Notes --- */}
        <div className="space-y-2">
          <FieldLabel icon={FileText} optional>
            Additional Requirements
          </FieldLabel>
          <Textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Include any specific details (e.g. Vegetarian meals, wheel-chair access)"
            className="border-slate-200 focus-visible:ring-theme-primary resize-none p-4 min-h-[100px]"
            rows={3}
          />
        </div>

        {/* Footer Submit */}
        <div className="pt-6 flex justify-end">
          <Button
            size="lg"
            type="submit"
            className=" cursor-pointer bg-theme-primary hover:bg-theme-secondary text-white px-10 shadow-lg shadow-theme-primary/20 rounded-xl"
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
