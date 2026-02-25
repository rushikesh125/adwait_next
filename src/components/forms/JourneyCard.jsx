"use client";
import { Train, Calendar, MapPin, Trash2, Hash, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDispatch } from "react-redux";
import { updateJourney, removeJourney } from "@/store/tripSlice";

export default function JourneyCard({ journey, index, total }) {
  const dispatch = useDispatch();

  const handleChange = (field, value) => {
    dispatch(updateJourney({ id: journey.id, field, value }));
  };

  return (
    <Card className="relative border-none shadow-md bg-white overflow-hidden group hover:ring-2 hover:ring-theme-primary/20 transition-all">
      {/* Journey Header Strip */}
      <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-theme-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
            {index + 1}
          </div>
          <h3 className="font-bold text-theme-dark tracking-tight uppercase text-sm">
            Journey Segment
          </h3>
        </div>

        {total > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(removeJourney(journey.id))}
            className="text-slate-400 hover:text-red-500 hover:bg-red-50 gap-2 h-8"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-semibold">Remove</span>
          </Button>
        )}
      </div>

      <CardContent className="p-6">
        {/* Row 1: Train & Route Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
              Train Number
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="12626"
                value={journey.trainNo}
                onChange={(e) => handleChange("trainNo", e.target.value)}
                className="pl-10 border-slate-200 focus:border-theme-primary h-11"
              />
            </div>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
              Train Name
            </label>
            <div className="relative">
              <Train className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Kerala Express"
                value={journey.trainName}
                onChange={(e) => handleChange("trainName", e.target.value)}
                className="pl-10 border-slate-200 focus:border-theme-primary h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
              Journey Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={journey.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="pl-10 border-slate-200 focus:border-theme-primary h-11"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Stations & Class */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
              Departure (From)
            </label>
            <Input
              placeholder="NDLS"
              value={journey.from}
              onChange={(e) => handleChange("from", e.target.value)}
              className="border-slate-200 focus:border-theme-primary h-11 uppercase font-bold"
            />
          </div>

          <div className="hidden lg:flex items-center justify-center pt-6">
            <ArrowRight className="text-slate-300 w-6 h-6" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
              Arrival (To)
            </label>
            <Input
              placeholder="SBC"
              value={journey.to}
              onChange={(e) => handleChange("to", e.target.value)}
              className="border-slate-200 focus:border-theme-primary h-11 uppercase font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
                Class
              </label>
              <select
                value={journey.class}
                onChange={(e) => handleChange("class", e.target.value)}
                className="w-full h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium focus:ring-2 focus:ring-theme-primary outline-none"
              >
                <option value="SL">SL</option>
                <option value="3A">3A</option>
                <option value="2A">2A</option>
                <option value="1A">1A</option>
                <option value="CC">CC</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-theme-secondary uppercase tracking-wider">
                Seats
              </label>
              <Input
                type="number"
                placeholder="0"
                value={journey.seats}
                onChange={(e) => handleChange("seats", e.target.value)}
                className="border-slate-200 focus:border-theme-primary h-11"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}