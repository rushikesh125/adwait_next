// src/components/MarkupSection.jsx
"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  PlusCircle,
  XCircle,
  IndianRupee,
  Percent,
  Trash2,
  CheckCircle2,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Redux
import { setConfirmedMarkup } from "@/redux/slices/packageSlice";

// Assume these come from parent or Redux — total before markup
// You can pass them as props or get from Redux
const MarkupSection = ({ baseTotal = 0 }) => {
  const dispatch = useDispatch();
  const { confirmedMarkup } = useSelector((state) => state.package);

  const [showOptions, setShowOptions] = useState(!!confirmedMarkup);
  const [type, setType] = useState("lumpsum");
  const [value, setValue] = useState("");
  const [calculatedPreview, setCalculatedPreview] = useState(0);

  // ────────────────────────────────────────────────
  // Live preview calculation
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!value) {
      setCalculatedPreview(0);
      return;
    }

    const numValue = parseFloat(value) || 0;

    if (type === "lumpsum") {
      setCalculatedPreview(numValue);
    } else if (type === "percentage") {
      setCalculatedPreview((numValue / 100) * baseTotal);
    }
  }, [value, type, baseTotal]);

  // ────────────────────────────────────────────────
  // Apply markup to Redux
  // ────────────────────────────────────────────────
  const handleApply = () => {
    if (!value || parseFloat(value) <= 0) return;

    const numValue = parseFloat(value);
    const markup =
      type === "lumpsum" ? numValue : (numValue / 100) * baseTotal;

    dispatch(setConfirmedMarkup(markup));
    setShowOptions(true);
  };

  // ────────────────────────────────────────────────
  // Clear markup
  // ────────────────────────────────────────────────
  const handleClear = () => {
    dispatch(setConfirmedMarkup(0));
    setValue("");
    setType("lumpsum");
    setShowOptions(false);
  };

  return (
    <Card className="border-theme-muted shadow-sm overflow-hidden">
      <CardHeader className="bg-theme-muted/30 pb-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2.5 text-theme-dark">
            <IndianRupee className="h-5 w-5 text-theme-primary" />
            Add Markup / Profit
          </CardTitle>

          {confirmedMarkup > 0 && (
            <Badge className="bg-theme-primary/10 text-theme-primary border-theme-primary/20 px-3 py-1">
              Applied: ₹{confirmedMarkup.toLocaleString("en-IN")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Toggle Button */}
        <Button
          variant={showOptions ? "outline" : "default"}
          className={`w-full justify-between gap-3 text-base font-medium transition-all ${
            showOptions
              ? "border-theme-primary text-theme-primary hover:bg-theme-muted/50"
              : "bg-theme-primary hover:bg-theme-secondary text-white shadow-md"
          }`}
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? (
            <>
              Hide Markup Options
              <XCircle className="h-5 w-5" />
            </>
          ) : (
            <>
              Add Markup
              <PlusCircle className="h-5 w-5" />
            </>
          )}
        </Button>

        {/* Markup Form */}
        {showOptions && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-theme-dark">
                Markup Type
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 border-theme-muted focus:ring-theme-primary/30">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lumpsum">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-theme-primary" />
                      Fixed Amount (₹)
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-theme-primary" />
                      Percentage (%)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-theme-dark">
                {type === "lumpsum" ? "Markup Amount (₹)" : "Percentage Value"}
              </Label>

              <div className="relative">
                <Input
                  type="number"
                  placeholder={
                    type === "lumpsum"
                      ? "Enter amount (e.g. 5000)"
                      : "Enter % (e.g. 15)"
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-11 pl-10 border-theme-muted focus:border-theme-primary focus:ring-theme-primary/20"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {type === "lumpsum" ? (
                    <IndianRupee className="h-4 w-4 text-slate-500" />
                  ) : (
                    <Percent className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Live Preview */}
              {value && parseFloat(value) > 0 && (
                <div className="mt-3 p-3 bg-theme-muted/40 rounded-lg border border-theme-muted flex justify-between items-center text-sm">
                  <span className="text-slate-600">
                    This will add
                  </span>
                  <span className="font-semibold text-theme-primary">
                    ₹{calculatedPreview.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                className="flex-1 bg-theme-primary hover:bg-theme-secondary text-white shadow-sm"
                onClick={handleApply}
                disabled={!value || parseFloat(value) <= 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Markup
              </Button>

              {confirmedMarkup > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleClear}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Markup
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Current Markup Info (when collapsed) */}
        {!showOptions && confirmedMarkup > 0 && (
          <div className="bg-theme-muted/40 p-4 rounded-lg border border-theme-muted text-sm flex justify-between items-center">
            <span className="text-slate-700 font-medium">
              Current Markup:
            </span>
            <span className="font-bold text-theme-primary">
              ₹{confirmedMarkup.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarkupSection;