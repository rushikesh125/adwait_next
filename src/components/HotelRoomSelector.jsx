// src/components/HotelRoomSelector.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  Star,
  ExternalLink,
  Users,
  BedDouble,
  Info,
  Utensils,
  Sun,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Sub-components
import SeasonInfo from "./hotel-selector/SeasonInfo";
import MealPlanTable from "./hotel-selector/MealPlanTable";
import GuestConfiguration from "./hotel-selector/GuestConfiguration";
import CostSummary from "./hotel-selector/CostSummary";

// Redux actions (adjust path as needed)
import { addHotelEntry, updateHotelEntry } from "@/store/packageSlice";

const HotelRoomSelector = ({
  hotel,
  checkInDate,
  noOfNights,
  numDouble,
  setNumDouble,
  numExtraAdult,
  setNumExtraAdult,
  numExtraChild,
  setNumExtraChild,
  hotelTotal,
  setHotelTotal,
  selectedMealPlan,
  setSelectedMealPlan,
  selectedRoomCategory,
  setSelectedRoomCategory,
  editingIndex = null, // if editing, this is the index in hotelEntries
}) => {
  const dispatch = useDispatch();

  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedPlans, setSelectedPlans] = useState({});

  // Derived values
  const currentCategory = hotel?.rooms?.[selectedCategoryIndex];
  const applicableSeason = useMemo(() => {
    if (!currentCategory?.seasons || !checkInDate) return null;

    const checkIn = new Date(checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    return currentCategory.seasons.find((season) => {
      const start = new Date(season.start);
      const end = new Date(season.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return checkIn >= start && checkIn <= end;
    }) || null;
  }, [currentCategory, checkInDate]);

  const currentPlan = selectedPlans[selectedCategoryIndex] || selectedMealPlan || "";
  const pricingData = applicableSeason?.pricing?.[currentPlan.toLowerCase()] || null;

  // Calculate total
  const calculateTotal = () => {
    if (!pricingData || !noOfNights) return 0;

    const costPerNight =
      (pricingData.double || 0) * (numDouble[0] || 0) +
      (pricingData.extraAdult || 0) * (numExtraAdult[0] || 0) +
      (pricingData.extraChild || 0) * (numExtraChild[0] || 0);

    const total = costPerNight * noOfNights;
    setHotelTotal([total]);
    return total;
  };

  useEffect(() => {
    calculateTotal();
  }, [numDouble, numExtraAdult, numExtraChild, currentPlan, noOfNights, pricingData]);

  // Sync selected plan to parent
  useEffect(() => {
    if (currentPlan) {
      setSelectedMealPlan(currentPlan);
      setSelectedRoomCategory(currentCategory?.categoryName || "");
    }
  }, [currentPlan, currentCategory, setSelectedMealPlan, setSelectedRoomCategory]);

  const handleSaveHotel = () => {
    if (!hotel || !currentCategory || !currentPlan) {
      alert("Please complete hotel selection");
      return;
    }

    const hotelData = {
      hotel: hotel.name,
      hotelId: hotel.id,
      city: hotel.city,
      state: hotel.state,
      checkInDate,
      nights: noOfNights,
      checkOutDate: new Date(
        new Date(checkInDate).setDate(new Date(checkInDate).getDate() + noOfNights)
      ).toISOString().split("T")[0],
      selectedRoomCategory: currentCategory.categoryName,
      selectedMealPlan: currentPlan,
      numDouble: numDouble[0],
      numExtraAdult: numExtraAdult[0],
      numExtraChild: numExtraChild[0],
      hotelTotal: hotelTotal[0] || 0,
      GoogleListingURL: hotel.GoogleListingURL || null,
    };

    if (editingIndex !== null) {
      dispatch(updateHotelEntry({ index: editingIndex, data: hotelData }));
    } else {
      dispatch(addHotelEntry(hotelData));
    }
  };

  if (!hotel?.rooms?.length) {
    return (
      <div className="p-8 text-center text-slate-500 border rounded-xl bg-slate-50">
        No room categories available for this hotel
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
          Room Categories
        </h3>
        <Tabs
          value={String(selectedCategoryIndex)}
          onValueChange={(val) => {
            const index = Number(val);
            setSelectedCategoryIndex(index);
            // Reset counts when changing category
            setNumDouble([1]);
            setNumExtraAdult([0]);
            setNumExtraChild([0]);
          }}
        >
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 bg-slate-100 p-1 rounded-xl">
            {hotel.rooms.map((room, idx) => (
              <TabsTrigger
                key={idx}
                value={String(idx)}
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary"
              >
                {room.categoryName}
              </TabsTrigger>
            ))}
          </TabsList>

          {hotel.rooms.map((room, idx) => (
            <TabsContent key={idx} value={String(idx)} className="mt-6 space-y-8">
              {/* Header Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <SeasonInfo season={applicableSeason} />

                {hotel.GoogleListingURL && (
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border">
                    <ExternalLink className="h-5 w-5 text-slate-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">Google Maps</p>
                      <a
                        href={hotel.GoogleListingURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1"
                      >
                        View Listing
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Meal Plans */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-slate-600" />
                  <h3 className="text-base font-semibold">Meal Plans</h3>
                </div>

                {applicableSeason ? (
                  <MealPlanTable
                    season={applicableSeason}
                    selectedPlan={currentPlan}
                    onPlanChange={(plan) =>
                      setSelectedPlans((prev) => ({ ...prev, [selectedCategoryIndex]: plan }))
                    }
                  />
                ) : (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-center gap-3">
                    <Info className="h-5 w-5" />
                    <p>No seasonal pricing available for selected dates.</p>
                  </div>
                )}
              </div>

              {/* Guest Configuration */}
              <GuestConfiguration
                numDouble={numDouble[0]}
                setNumDouble={(val) => setNumDouble([val])}
                numExtraAdult={numExtraAdult[0]}
                setNumExtraAdult={(val) => setNumExtraAdult([val])}
                numExtraChild={numExtraChild[0]}
                setNumExtraChild={(val) => setNumExtraChild([val])}
              />

              {/* Cost Summary */}
              {pricingData && currentPlan && (
                <CostSummary
                  perNightCost={pricingData.double * (numDouble[0] || 0) +
                    pricingData.extraAdult * (numExtraAdult[0] || 0) +
                    pricingData.extraChild * (numExtraChild[0] || 0)}
                  nights={noOfNights}
                  total={hotelTotal[0] || 0}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 pt-6 border-t">
        <Button
          onClick={handleSaveHotel}
          className="bg-primary hover:bg-primary/90 text-white px-8"
          disabled={!currentPlan || !pricingData}
        >
          {editingIndex !== null ? "Update Hotel" : "Save & Add Hotel"}
        </Button>

        <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default HotelRoomSelector;