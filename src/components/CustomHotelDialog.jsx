"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

const ROOM_CATEGORIES = ["Standard", "Deluxe", "Suite"];
const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];

export default function CustomHotelDialog({
  open,
  onClose,
  onSave,
  selectedState,
  customHotel,
  setCustomHotel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">
              Add Custom Hotel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Please provide accurate hotel information.
            </p>
          </div>
          <button onClick={onClose}>
            <XCircle className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-theme-primary">Hotel Name</Label>
              <Input
                placeholder="e.g. Hotel Sunstar"
                value={customHotel.name}
                onChange={(e) =>
                  setCustomHotel({ ...customHotel, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-theme-primary">City</Label>
              <Input
                placeholder="e.g. Raipur"
                value={customHotel.city}
                onChange={(e) =>
                  setCustomHotel({ ...customHotel, city: e.target.value })
                }
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-theme-primary">State</Label>
              <Input value={selectedState} disabled />
            </div>

            <div className="space-y-1.5">
              <Label className="text-theme-primary">Room Category</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-theme-primary"
                value={customHotel.roomCategory}
                onChange={(e) =>
                  setCustomHotel({
                    ...customHotel,
                    roomCategory: e.target.value,
                  })
                }
              >
                <option value="">Select Category</option>
                {ROOM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing */}
          {customHotel.roomCategory && (
            <div className="space-y-1.5">
              <Label className="text-theme-primary"> 
           
                Price per night ({customHotel.roomCategory})
              </Label>
              <Input
                type="number"
                placeholder="Enter price"
                value={customHotel.prices[customHotel.roomCategory]}
                onChange={(e) =>
                  setCustomHotel({
                    ...customHotel,
                    prices: {
                      ...customHotel.prices,
                      [customHotel.roomCategory]: e.target.value,
                    },
                  })
                }
              />
            </div>
          )}

          {/* Star Rating + Meal Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Star Rating */}
            <div className="space-y-1.5">
              <Label className="text-theme-primary">Hotel Star Rating</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-theme-primary"
                value={customHotel.starRating || ""}
                onChange={(e) =>
                  setCustomHotel({
                    ...customHotel,
                    starRating: e.target.value,
                  })
                }
              >
                <option value="">Select Rating</option>
                <option value="1 Star">1 Star</option>
                <option value="2 Star">2 Star</option>
                <option value="3 Star">3 Star</option>
                <option value="4 Star">4 Star</option>
                <option value="5 Star">5 Star</option>
              </select>
            </div>

            {/* Meal Plans */}
            <div className="space-y-1.5">
              <Label className="text-theme-primary">Meal Plans</Label>
              <div className="flex items-center gap-6 pt-1">
                {MEAL_PLANS.map((plan) => (
                  <label
                    key={plan}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-theme-primary"
                      checked={customHotel.mealPlans[plan]}
                      onChange={(e) =>
                        setCustomHotel({
                          ...customHotel,
                          mealPlans: {
                            ...customHotel.mealPlans,
                            [plan]: e.target.checked,
                          },
                        })
                      }
                    />
                    {plan}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Google Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label  className="text-theme-primary">Google Rating (optional)</Label>
              <Input
                placeholder="e.g. 4.3"
                value={customHotel.googleRating}
                onChange={(e) =>
                  setCustomHotel({
                    ...customHotel,
                    googleRating: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-theme-primary">Google Listing URL (optional)</Label>
              <Input
                placeholder="https://maps.google.com/..."
                value={customHotel.googleLink}
                onChange={(e) =>
                  setCustomHotel({
                    ...customHotel,
                    googleLink: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
          <Button  variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-theme-primary text-white" onClick={onSave}>
            Save Custom Hotel
          </Button>
        </div>
      </div>
    </div>
  );
}
