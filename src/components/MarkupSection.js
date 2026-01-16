"use client";
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Percent, 
  IndianRupee, 
  Info,
  BadgePercent,
  Wallet,
  ArrowUpRight
} from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MarkupSection = ({ grandTotal, setMarkupAmount }) => {
  const [showOptions, setShowOptions] = useState(false);
  const [type, setType] = useState("lumpsum"); // Default to lumpsum for better UI flow
  const [value, setValue] = useState("");

  // Auto-calculate for a "Live" feel
  useEffect(() => {
    const numValue = parseFloat(value) || 0;
    const markup = type === "lumpsum" 
      ? numValue 
      : (numValue / 100) * grandTotal;
    
    setMarkupAmount(markup);
  }, [value, type, grandTotal, setMarkupAmount]);

  const calculatedMarkupValue = type === "lumpsum" 
    ? (parseFloat(value) || 0) 
    : ((parseFloat(value) || 0) / 100) * grandTotal;

  return (
    <TooltipProvider>
      <div className="w-full max-w-md space-y-3">
        {/* Header Toggle */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-theme-muted text-theme-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-theme-dark leading-none">Profit Markup</h4>
              <p className="text-[11px] text-slate-500 mt-1">Adjust your service margins</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
            className={`rounded-full px-4 border-theme-accent/30 transition-all ${
              showOptions ? "bg-theme-primary text-white border-theme-primary" : "text-theme-primary hover:bg-theme-muted"
            }`}
          >
            {showOptions ? "Collapse" : "Configure"}
          </Button>
        </div>

        {showOptions && (
          <Card className="p-4 border-slate-100 shadow-sm bg-slate-50/50 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-4">
              {/* Strategy Switcher */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Markup Strategy</Label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-slate-300" />
                    </TooltipTrigger>
                    <TooltipContent>Choose between a fixed cash amount or a % of the total.</TooltipContent>
                  </Tooltip>
                </div>
                
                <Tabs value={type} onValueChange={setType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 p-1 bg-white border border-slate-200 rounded-xl h-11">
                    <TabsTrigger value="lumpsum" className="rounded-lg data-[state=active]:bg-theme-primary data-[state=active]:text-white gap-2">
                      <Wallet className="h-3.5 w-3.5" /> <span className="text-xs">Fixed</span>
                    </TabsTrigger>
                    <TabsTrigger value="percentage" className="rounded-lg data-[state=active]:bg-theme-primary data-[state=active]:text-white gap-2">
                      <BadgePercent className="h-3.5 w-3.5" /> <span className="text-xs">Percentage</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Dynamic Input Group */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                  {type === "lumpsum" ? "Total Amount to Add" : "Percentage to Apply"}
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-theme-primary text-slate-400">
                    {type === "lumpsum" ? <IndianRupee className="h-4 w-4" /> : <Percent className="h-4 w-4" />}
                  </div>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-14 pl-11 pr-4 bg-white border-slate-200 rounded-xl focus-visible:ring-theme-primary text-lg font-semibold transition-all shadow-inner"
                  />
                  {value && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                       <div className="bg-theme-muted text-theme-dark p-1.5 rounded-md">
                          <ArrowUpRight className="h-3 w-3" />
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Impact Summary */}
              {value && (
                <div className="p-3 rounded-xl bg-theme-primary/5 border border-theme-primary/10 flex items-center justify-between">
                  <span className="text-[11px] text-theme-secondary font-medium uppercase">Final Markup Amount</span>
                  <span className="text-sm font-bold text-theme-dark">
                    ₹{calculatedMarkupValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default MarkupSection;