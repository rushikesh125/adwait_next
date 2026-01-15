"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Calculator } from "lucide-react";

const MarkupSection = ({ grandTotal, setMarkupAmount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("lumpsum"); // 'lumpsum' | 'percentage'
  const [value, setValue] = useState("");

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!value) {
      setMarkupAmount(0);
      return;
    }

    const numVal = parseFloat(value);
    if (isNaN(numVal)) return;

    if (type === "lumpsum") {
      setMarkupAmount(numVal);
    } else {
      // Percentage logic: (X% of GrandTotal)
      const calculated = (numVal / 100) * grandTotal;
      setMarkupAmount(calculated);
    }
  }, [type, value, grandTotal, setMarkupAmount]);

  return (
    <div className="relative">
      {/* Toggle Button */}
      {!isOpen ? (
        <Button 
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="flex items-center gap-2 border-theme-primary text-theme-primary hover:bg-theme-muted"
        >
          <PlusCircle size={16} /> Add Markup
        </Button>
      ) : (
        <div className="flex items-center gap-2 bg-white border border-theme-primary p-1 rounded-md shadow-lg animate-in fade-in zoom-in-95">
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 text-gray-500 hover:text-red-500"
             onClick={() => {
               setIsOpen(false);
               setValue(""); // Reset on close
               setMarkupAmount(0);
             }}
           >
             <MinusCircle size={16} />
           </Button>

           <div className="h-4 w-px bg-gray-300 mx-1"></div>

           <select 
             className="text-sm border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer"
             value={type}
             onChange={(e) => setType(e.target.value)}
           >
             <option value="lumpsum">Flat (₹)</option>
             <option value="percentage">% Rate</option>
           </select>

           <input 
             type="number" 
             placeholder={type === 'lumpsum' ? "Amount" : "%"}
             className="w-20 p-1 text-sm border rounded bg-gray-50 focus:bg-white transition-colors"
             value={value}
             onChange={(e) => setValue(e.target.value)}
             autoFocus
           />
           
           {value && (
             <div className="text-xs font-bold text-green-600 px-2 min-w-[60px] text-right">
               + ₹{type === 'percentage' ? ((parseFloat(value)/100)*grandTotal).toFixed(0) : value}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default MarkupSection;