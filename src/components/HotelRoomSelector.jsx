// import React, { useState, useEffect } from "react";
// import { Star, ExternalLink, Users, BedDouble, Info } from "lucide-react";

// const HotelRoomSelector = ({
//   hotel,
//   checkInDate,
//   numDouble,
//   setNumDouble,
//   numExtraAdult,
//   setNumExtraAdult,
//   numExtraChild,
//   setNumExtraChild,
//   hotelTotal,
//   setHotelTotal,
//   setSelectedMealPlan,
//   selectedMealPlan,
//   setSelectedRoomCategory,
//   selectedRoomCategory,
// }) => {
//   const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
//   const [selectedPlans, setSelectedPlans] = useState({});
//   const [perNightCost, setPerNightCost] = useState(0);

//   // --- LOGIC (UNALTERED) ---
//   const checkIn = new Date(checkInDate);
//   const checkOut = new Date(checkIn);
//   checkOut.setDate(checkOut.getDate() + (hotel.nights || 1));

//   const getNights = () => {
//     const timeDiff = checkOut - checkIn;
//     return Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
//   };

//   const nights = getNights();

//   const getApplicableSeason = (seasons) => {
//     const checkInDateObj = new Date(checkInDate);
//     checkInDateObj.setHours(0, 0, 0, 0);

//     return (
//       seasons.find((season) => {
//         const start = new Date(season.start);
//         const end = new Date(season.end);
//         start.setHours(0, 0, 0, 0);
//         end.setHours(23, 59, 59, 999);
//         return checkInDateObj >= start && checkInDateObj <= end;
//       }) || null
//     );
//   };

//   useEffect(() => {
//     if (currentCategory) {
//       const initialPlan = selectedPlans[selectedCategoryIndex] || "";
//       setSelectedMealPlan(initialPlan);
//       setSelectedRoomCategory(currentCategory.categoryName);
//     }
//   }, [selectedCategoryIndex, selectedPlans, setSelectedMealPlan, setSelectedRoomCategory, hotel]);

//   const currentCategory = hotel.rooms[selectedCategoryIndex];
//   const applicableSeason = getApplicableSeason(currentCategory?.seasons || []);
//   const localSelectedPlan = selectedPlans[selectedCategoryIndex] || ""; 
//   const pricingData = applicableSeason?.pricing[localSelectedPlan.toLowerCase()] || null;

//   const updateArrayState = (setter, index, value) => {
//     setter((prev) => {
//       const updated = [...prev];
//       updated[index] = value;
//       return updated;
//     });
//   };

//   const calculateTotal = () => {
//     if (!pricingData) return 0;
//     const costPerNight =
//       (pricingData.double || 0) * (numDouble[0] || 0) +
//       (pricingData.extraAdult || 0) * (numExtraAdult[0] || 0) +
//       (pricingData.extraChild || 0) * (numExtraChild[0] || 0);
//     setPerNightCost(costPerNight);
//     const total = costPerNight * nights;
//     updateArrayState(setHotelTotal, 0, total);
//     return total;
//   };

//   useEffect(() => {
//     calculateTotal();
//   }, [numDouble[0], numExtraAdult[0], numExtraChild[0], localSelectedPlan, nights, pricingData]);

//   // --- STYLED RENDER FUNCTIONS ---

//   const renderPlanTable = () => {
//     if (!applicableSeason) return (
//       <div className="flex items-center gap-2 p-4 text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
//         <Info className="w-5 h-5" />
//         <p className="text-sm font-medium">No seasonal pricing available for the selected dates.</p>
//       </div>
//     );

//     const planNames = ["EP", "CP", "MAP", "AP"];

//     return (
//       <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
//         <table className="w-full text-left border-collapse">
//           <thead>
//             <tr className="bg-slate-50 border-b border-slate-200">
//               <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Select</th>
//               <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Plan</th>
//               <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Double</th>
//               <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Extra Adult</th>
//               <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 tracking-wider">Extra Child</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-slate-100">
//             {planNames.map((plan) => {
//               const data = applicableSeason.pricing[plan.toLowerCase()];
//               const hasPricing = data && (data.double > 0 || data.extraAdult > 0 || data.extraChild > 0);

//               return hasPricing ? (
//                 <tr key={plan} className={`transition-colors hover:bg-slate-50/50 ${localSelectedPlan === plan ? 'bg-theme-muted/30' : ''}`}>
//                   <td className="px-4 py-4">
//                     <input
//                       type="radio"
//                       className="w-4 h-4 accent-theme-primary cursor-pointer"
//                       name={`mealPlan-${selectedCategoryIndex}`}
//                       value={plan}
//                       checked={localSelectedPlan === plan}
//                       onChange={() => {
//                         setSelectedPlans((prev) => ({ ...prev, [selectedCategoryIndex]: plan }));
//                         setSelectedMealPlan(plan);
//                       }}
//                     />
//                   </td>
//                   <td className="px-4 py-4 font-bold text-slate-700">{plan}</td>
//                   <td className="px-4 py-4 text-slate-600">₹{data.double || 0}</td>
//                   <td className="px-4 py-4 text-slate-600">₹{data.extraAdult || 0}</td>
//                   <td className="px-4 py-4 text-slate-600">₹{data.extraChild || 0}</td>
//                 </tr>
//               ) : null;
//             })}
//           </tbody>
//         </table>
//       </div>
//     );
//   };

//   return (
//     <div className="space-y-6">
//       {/* Category Tabs */}
//       <div>
//         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Room Categories</h3>
//         <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
//           {hotel.rooms.map((room, index) => (
//             <button
//               key={index}
//               className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
//                 selectedCategoryIndex === index 
//                   ? "bg-white text-theme-primary shadow-sm" 
//                   : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
//               }`}
//               onClick={() => {
//                 setSelectedCategoryIndex(index);
//                 updateArrayState(setNumDouble, 0, 1);
//                 updateArrayState(setNumExtraAdult, 0, 0);
//                 updateArrayState(setNumExtraChild, 0, 0);
//                 setSelectedMealPlan(selectedPlans[index] || "");
//                 setSelectedRoomCategory(room.categoryName);
//               }}
//             >
//               {room.categoryName}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Info Bar */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
//           <div className="p-3 bg-theme-muted rounded-full">
//             <Star className="w-5 h-5 text-theme-primary fill-theme-primary" />
//           </div>
//           <div>
//             <p className="text-xs text-slate-400 font-medium">Google Rating</p>
//             <p className="text-lg font-bold text-slate-700">{hotel.GoogleReviewRating || "N/A"}</p>
//           </div>
//         </div>

//         <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
//           <div className="p-3 bg-blue-50 rounded-full">
//             <ExternalLink className="w-5 h-5 text-blue-600" />
//           </div>
//           <div className="truncate">
//             <p className="text-xs text-slate-400 font-medium">Hotel Location</p>
//             {hotel.GoogleListingURL ? (
//               <a href={hotel.GoogleListingURL} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:underline">
//                 View on Maps
//               </a>
//             ) : <p className="text-sm font-bold text-slate-700">N/A</p>}
//           </div>
//         </div>
//       </div>

//       {/* Pricing Table & Details */}
//       <div className="space-y-4">
//         <div className="flex items-center justify-between">
//           <h4 className="text-md font-bold text-theme-dark flex items-center gap-2">
//             Meal Plan & Pricing <span className="text-xs font-normal text-slate-400 capitalize">({applicableSeason?.name || 'No Season'})</span>
//           </h4>
//         </div>
//         {renderPlanTable()}
//       </div>

//       {/* Guest Inputs */}
//       <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-lg">
//         <div className="flex items-center gap-2 mb-6">
//           <Users className="w-5 h-5 text-theme-accent" />
//           <h4 className="font-bold">Occupancy Details</h4>
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="space-y-2">
//             <label className="text-xs font-semibold text-slate-400 uppercase">Double Rooms</label>
//             <div className="relative">
//               <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
//               <input
//                 type="number"
//                 min={0}
//                 className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-theme-primary outline-none transition-all"
//                 value={numDouble[0] || 0}
//                 onChange={(e) => updateArrayState(setNumDouble, 0, parseInt(e.target.value))}
//               />
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-xs font-semibold text-slate-400 uppercase">Extra Adults</label>
//             <input
//               type="number"
//               min={0}
//               className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 focus:ring-2 focus:ring-theme-primary outline-none transition-all"
//               value={numExtraAdult[0] || 0}
//               onChange={(e) => updateArrayState(setNumExtraAdult, 0, parseInt(e.target.value))}
//             />
//           </div>

//           <div className="space-y-2">
//             <label className="text-xs font-semibold text-slate-400 uppercase">Extra Children</label>
//             <input
//               type="number"
//               min={0}
//               className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 focus:ring-2 focus:ring-theme-primary outline-none transition-all"
//               value={numExtraChild[0] || 0}
//               onChange={(e) => updateArrayState(setNumExtraChild, 0, parseInt(e.target.value))}
//             />
//           </div>
//         </div>

//         <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
//           <p className="text-sm text-slate-400">Nightly Rate for selection:</p>
//           <p className="text-xl font-black text-theme-accent">₹{perNightCost.toLocaleString()}</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default HotelRoomSelector;
import React, { useState, useEffect } from "react";
import { 
  Hotel, 
  Calendar, 
  Users, 
  Star,
  ExternalLink,
  Utensils,
  BedDouble,
  UserPlus,
  Baby,
  Sun,
  CheckCircle2,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const HotelRoomSelector = ({
  hotel,
  checkInDate,
  numDouble,
  setNumDouble,
  numExtraAdult,
  setNumExtraAdult,
  numExtraChild,
  setNumExtraChild,
  hotelTotal,
  setHotelTotal,
  setSelectedMealPlan,
  selectedMealPlan,
  setSelectedRoomCategory,
  selectedRoomCategory,
}) => {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [selectedPlans, setSelectedPlans] = useState({});
  const [perNightCost, setPerNightCost] = useState(0);

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + (hotel.nights || 1));

  const getNights = () => {
    const timeDiff = checkOut - checkIn;
    return Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  };

  const nights = getNights();

  const getApplicableSeason = (seasons) => {
    const checkInDateObj = new Date(checkInDate);
    checkInDateObj.setHours(0, 0, 0, 0);

    return (
      seasons.find((season) => {
        const start = new Date(season.start);
        const end = new Date(season.end);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return checkInDateObj >= start && checkInDateObj <= end;
      }) || null
    );
  };

  useEffect(() => {
    if (currentCategory) {
      const initialPlan = selectedPlans[selectedCategoryIndex] || "";
      setSelectedMealPlan(initialPlan);
      setSelectedRoomCategory(currentCategory.categoryName);
    }
  }, [selectedCategoryIndex, selectedPlans, setSelectedMealPlan, setSelectedRoomCategory, hotel]);

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-GB", options).replace(/ /g, "-");
  };

  const currentCategory = hotel.rooms[selectedCategoryIndex];
  const applicableSeason = getApplicableSeason(currentCategory?.seasons || []);
  const localSelectedPlan = selectedPlans[selectedCategoryIndex] || "";
  const pricingData = applicableSeason?.pricing[localSelectedPlan.toLowerCase()] || null;

  const updateArrayState = (setter, index, value) => {
    setter((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const calculateTotal = () => {
    if (!pricingData) return 0;

    const costPerNight =
      (pricingData.double || 0) * (numDouble[0] || 0) +
      (pricingData.extraAdult || 0) * (numExtraAdult[0] || 0) +
      (pricingData.extraChild || 0) * (numExtraChild[0] || 0);

    setPerNightCost(costPerNight);

    const total = costPerNight * nights;
    updateArrayState(setHotelTotal, 0, total);
    return total;
  };

  useEffect(() => {
    calculateTotal();
  }, [numDouble[0], numExtraAdult[0], numExtraChild[0], localSelectedPlan, nights, pricingData]);

  const renderPlanTable = () => {
    if (!applicableSeason) {
      return (
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600">No seasonal pricing available for selected dates.</p>
        </div>
      );
    }

    const planNames = ["EP", "CP", "MAP", "AP"];
    const planFullNames = {
      EP: "European Plan (Room Only)",
      CP: "Continental Plan (Breakfast)",
      MAP: "Modified American Plan (Breakfast + Dinner)",
      AP: "American Plan (All Meals)"
    };

    return (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-16 font-medium">Select</TableHead>
              <TableHead className="font-medium">Meal Plan</TableHead>
              <TableHead className="font-medium">Double Room</TableHead>
              <TableHead className="font-medium">Extra Adult</TableHead>
              <TableHead className="font-medium">Extra Child</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planNames.map((plan) => {
              const data = applicableSeason.pricing[plan.toLowerCase()];
              const hasPricing = data && (data.double > 0 || data.extraAdult > 0 || data.extraChild > 0);

              return hasPricing ? (
                <TableRow 
                  key={plan}
                  className={`transition-colors ${
                    localSelectedPlan === plan 
                      ? 'bg-theme-muted/40 border-l-2 border-l-theme-primary' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <TableCell>
                    <RadioGroup
                      value={localSelectedPlan}
                      onValueChange={(value) => {
                        setSelectedPlans((prev) => ({
                          ...prev,
                          [selectedCategoryIndex]: value,
                        }));
                        setSelectedMealPlan(value);
                      }}
                    >
                      <div className="flex items-center">
                        <RadioGroupItem 
                          value={plan} 
                          id={`plan-${plan}`}
                          className="border-gray-300 text-theme-primary"
                        />
                      </div>
                    </RadioGroup>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{plan}</span>
                      <span className="text-xs text-gray-500">{planFullNames[plan]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    ₹{data.double || 0}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    ₹{data.extraAdult || 0}
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">
                    ₹{data.extraChild || 0}
                  </TableCell>
                </TableRow>
              ) : null;
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Hotel className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {hotel.name || "Select Your Room"}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(checkIn)} → {formatDate(checkOut)}</span>
                <span className="text-gray-400">•</span>
                <span className="font-medium text-gray-900">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
              </div>
            </div>
          </div>

          {hotel.GoogleReviewRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900">{hotel.GoogleReviewRating}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-white">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-gray-600" />
            Room Categories
          </CardTitle>
          <CardDescription className="text-gray-600">
            Choose your preferred room type and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs 
            value={String(selectedCategoryIndex)} 
            onValueChange={(value) => {
              const index = parseInt(value);
              setSelectedCategoryIndex(index);
              updateArrayState(setNumDouble, 0, 1);
              updateArrayState(setNumExtraAdult, 0, 0);
              updateArrayState(setNumExtraChild, 0, 0);
              setSelectedMealPlan(selectedPlans[index] || "");
              setSelectedRoomCategory(hotel.rooms[index].categoryName);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full gap-2 bg-gray-100 p-1 h-auto rounded-lg" style={{ gridTemplateColumns: `repeat(${hotel.rooms.length}, 1fr)` }}>
              {hotel.rooms.map((room, index) => (
                <TabsTrigger
                  key={index}
                  value={String(index)}
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm py-2.5 px-4 text-sm font-medium transition-all text-gray-600 rounded-md"
                >
                  {room.categoryName}
                </TabsTrigger>
              ))}
            </TabsList>

            {hotel.rooms.map((room, index) => (
              <TabsContent key={index} value={String(index)} className="mt-6 space-y-6">
                {/* Info Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Sun className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Season</p>
                      <p className="font-semibold text-gray-900">
                        {applicableSeason ? applicableSeason.name : "No Active Season"}
                      </p>
                    </div>
                  </div>

                  {hotel.GoogleListingURL && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <ExternalLink className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Google Maps</p>
                        <a
                          href={hotel.GoogleListingURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-theme-primary hover:text-theme-secondary font-medium text-sm flex items-center gap-1 transition-colors"
                        >
                          View Listing
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Category Indicator */}
                {selectedRoomCategory && (
                  <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-theme-primary/30">
                    <CheckCircle2 className="h-4 w-4 text-theme-primary" />
                    <span className="text-sm text-gray-600">Currently selected:</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedRoomCategory}</span>
                  </div>
                )}

                {/* Meal Plan Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-900">
                      Meal Plans
                    </h3>
                  </div>
                  {renderPlanTable()}
                </div>

                {/* Guest Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <h3 className="text-base font-semibold text-gray-900">
                      Guest Configuration
                    </h3>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3 p-5 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <Label htmlFor="double-rooms" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-gray-500" />
                        Double Rooms
                      </Label>
                      <Input
                        id="double-rooms"
                        type="number"
                        min={0}
                        value={numDouble[0] || 0}
                        onChange={(e) => updateArrayState(setNumDouble, 0, parseInt(e.target.value))}
                        className="h-10 border-gray-300 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="extra-adults" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-gray-500" />
                        Extra Adults
                      </Label>
                      <Input
                        id="extra-adults"
                        type="number"
                        min={0}
                        value={numExtraAdult[0] || 0}
                        onChange={(e) => updateArrayState(setNumExtraAdult, 0, parseInt(e.target.value))}
                        className="h-10 border-gray-300 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="extra-children" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Baby className="h-4 w-4 text-gray-500" />
                        Extra Children
                      </Label>
                      <Input
                        id="extra-children"
                        type="number"
                        min={0}
                        value={numExtraChild[0] || 0}
                        onChange={(e) => updateArrayState(setNumExtraChild, 0, parseInt(e.target.value))}
                        className="h-10 border-gray-300 focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Cost Summary */}
                {pricingData && localSelectedPlan && (
                  <div className="p-5 bg-white rounded-lg border-2 border-theme-primary/20 space-y-3">
                    <h3 className="text-base font-semibold text-gray-900">Cost Summary</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Cost per Night</span>
                        <span className="font-semibold text-gray-900">₹{perNightCost.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Number of Nights</span>
                        <span className="font-semibold text-gray-900">{nights}</span>
                      </div>
                      <Separator className="bg-gray-200" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="text-2xl font-bold text-theme-primary">
                          ₹{(hotelTotal[0] || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HotelRoomSelector;