"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle, XCircle, IndianRupee, Percent } from "lucide-react";

const MarkupSection = ({ grandTotal, setMarkupAmount }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [type, setType] = useState("");
  const [value, setValue] = useState("");

  const handleMarkupChange = (selectedType) => {
    setType(selectedType);
    setValue(""); // reset value when type changes
  };

  const calculateMarkup = () => {
    let markup = 0;
    const numValue = parseFloat(value) || 0;

    if (type === "lumpsum") {
      markup = numValue;
    } else if (type === "percentage") {
      markup = (numValue / 100) * grandTotal;
    }

    setMarkupAmount(markup);
  };

  const getInputPlaceholder = () => {
    return type === "lumpsum"
      ? "Enter markup amount (₹)"
      : "Enter percentage (%)";
  };

  const toggleOptions = () => setShowOptions((prev) => !prev);

  return (
    <div className="markup-section space-y-4 rounded-lg border bg-card p-5 shadow-sm">
      <Button
        variant={showOptions ? "outline" : "default"}
        className={`w-full justify-between gap-2 font-medium transition-colors ${
          showOptions
            ? "border-theme-primary text-theme-primary hover:bg-theme-muted"
            : "bg-theme-primary hover:bg-theme-secondary"
        }`}
        onClick={toggleOptions}
      >
        {showOptions ? (
          <>
            <span>Hide Markup Options</span>
            <XCircle className="h-4 w-4" />
          </>
        ) : (
          <>
            <span>Add Markup</span>
            <PlusCircle className="h-4 w-4" />
          </>
        )}
      </Button>

      {showOptions && (
        <div className="markup-options space-y-5 animate-in fade-in-60 duration-200">
          <div className="space-y-2">
            <Label htmlFor="markup-type" className="text-sm font-medium">
              Markup Type
            </Label>
            <Select value={type} onValueChange={handleMarkupChange}>
              <SelectTrigger id="markup-type" className="border-theme-muted">
                <SelectValue placeholder="Select markup type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lumpsum">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-theme-primary" />
                    <span>Lumpsum Amount</span>
                  </div>
                </SelectItem>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-theme-primary" />
                    <span>Percentage (%)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type && (
            <div className="space-y-2">
              <Label htmlFor="markup-value" className="text-sm font-medium">
                {type === "lumpsum" ? "Markup Amount (₹)" : "Percentage Value"}
              </Label>
              <div className="relative">
                <Input
                  id="markup-value"
                  type="number"
                  placeholder={getInputPlaceholder()}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onBlur={calculateMarkup}
                  className="border-theme-muted pl-9 focus-visible:ring-theme-primary"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  {type === "lumpsum" ? (
                    <IndianRupee className="h-4 w-4" />
                  ) : (
                    <Percent className="h-4 w-4" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {type === "percentage" &&
                  value &&
                  `≈ ₹${((parseFloat(value) / 100) * grandTotal).toFixed(2)}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarkupSection;