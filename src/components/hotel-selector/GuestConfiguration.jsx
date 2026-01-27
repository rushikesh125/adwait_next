// src/components/hotel-selector/GuestConfiguration.jsx
import React from "react";
import { BedDouble, UserPlus, Baby, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GuestConfiguration = ({
  numDouble,
  setNumDouble,
  numExtraAdult,
  setNumExtraAdult,
  numExtraChild,
  setNumExtraChild,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-slate-600" />
        <h3 className="text-base font-semibold">Guest Configuration</h3>
      </div>

      <div className="grid gap-6 sm:grid-cols-3 p-5 bg-slate-50 rounded-lg border border-slate-200">
        <div className="space-y-2">
          <Label htmlFor="double-rooms" className="text-sm font-medium flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-slate-500" />
            Double Rooms
          </Label>
          <Input
            id="double-rooms"
            type="number"
            min={0}
            value={numDouble}
            onChange={(e) => setNumDouble(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra-adults" className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            Extra Adults
          </Label>
          <Input
            id="extra-adults"
            type="number"
            min={0}
            value={numExtraAdult}
            onChange={(e) => setNumExtraAdult(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="extra-children" className="text-sm font-medium flex items-center gap-2">
            <Baby className="h-4 w-4 text-slate-500" />
            Extra Children
          </Label>
          <Input
            id="extra-children"
            type="number"
            min={0}
            value={numExtraChild}
            onChange={(e) => setNumExtraChild(Math.max(0, parseInt(e.target.value) || 0))}
            className="h-10"
          />
        </div>
      </div>
    </div>
  );
};

export default GuestConfiguration;