"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Loader2,
  Hotel,
  Save,
  Trash2,
  Plus,
  Info,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";

// Shadcn Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { INDIAN_STATES } from "@/lib/states";

import ReviewHotelCard from "@/components/ReviewHotelCard";


export default function ExcelUploadPage() {
  const [step, setStep] = useState(1);
  const [selectedState, setSelectedState] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hotelsData, setHotelsData] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (
      selectedFile &&
      (selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".csv"))
    ) {
      setFile(selectedFile);
      toast.success("File attached successfully");
    } else {
      toast.error("Please upload a valid Excel (.xlsx) file");
    }
  };

  const processFile = async () => {
    if (!selectedState || !file) {
      toast.error("Please select a state and a file");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("state", selectedState);

    try {
      const response = await fetch("/api/xl-upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data)
      if (response.ok) {
        setHotelsData(data);
        setStep(2);
        toast.success(`Processed ${data.length} hotels successfully`);
      } else {
        throw new Error(data.error || "Failed to process file");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateHotel = (index, updatedHotel) => {
    const newData = [...hotelsData];
    newData[index] = updatedHotel;
    setHotelsData(newData);
  };

  const handleDeleteHotel = (index) => {
    const newData = hotelsData.filter((_, i) => i !== index);
    setHotelsData(newData);
    toast.success("Hotel removed from list");
  };

  const finalSaveToDb = async () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: "Saving all hotels to database...",
      success: "Inventory updated successfully!",
      error: "Error saving data.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-theme-muted rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-theme-primary" />
            </div>
            <h1 className="text-lg font-bold text-theme-dark tracking-tight">
              Inventory Engine
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={step === 1 ? "default" : "outline"}
              className={step === 1 ? "bg-theme-primary" : "text-slate-400"}
            >
              1. Setup
            </Badge>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Badge
              variant={step === 2 ? "default" : "outline"}
              className={step === 2 ? "bg-theme-primary" : "text-slate-400"}
            >
              2. Review
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {step === 1 ? (
          /* Step 1: Upload View */
          <div className="w-full mx-auto space-y-6">
            <Card className="border-none shadow-2xl shadow-theme-primary/5 p-4">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-black text-theme-dark">
                  Bulk Ingestion
                </CardTitle>
                <CardDescription>
                  Upload your master inventory sheet to update rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Target State
                  </Label>
                  <Select
                    onValueChange={setSelectedState}
                    value={selectedState}
                  >
                    <SelectTrigger className="h-12 border-slate-200 focus:ring-theme-primary bg-slate-50/50">
                      <SelectValue placeholder="Select Indian State..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Excel File
                  </Label>
                  <label
                    className={`flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? "border-theme-primary bg-theme-muted/20" : "border-slate-200 bg-slate-50/50 hover:bg-white"}`}
                  >
                    <div className="flex flex-col items-center justify-center py-6">
                      {file ? (
                        <CheckCircle2 className="h-12 w-12 text-theme-primary mb-3" />
                      ) : (
                        <UploadCloud className="h-12 w-12 text-slate-300 mb-3" />
                      )}
                      <p className="text-sm font-semibold text-slate-700">
                        {file ? file.name : "Select Inventory File"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Accepts .xlsx and .csv files
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx, .csv"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <Button
                  onClick={processFile}
                  disabled={isUploading || !file || !selectedState}
                  className="w-full h-12 bg-theme-primary hover:bg-theme-secondary text-white font-bold rounded-xl shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                      Analyzing Sheet...
                    </>
                  ) : (
                    "Start Processing"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Step 2: Multi-Hotel Review View */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white rounded-2xl border shadow-sm gap-4">
              <div>
                <h2 className="text-2xl font-black text-theme-dark flex items-center gap-2">
                  Verify Ingestion{" "}
                  <Badge className="bg-theme-accent">
                    {hotelsData.length} Hotels
                  </Badge>
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  The following data was extracted. You can edit individual
                  rates before saving.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 md:flex-none border-slate-200"
                  onClick={() => setStep(1)}
                >
                  Re-upload
                </Button>
                <Button
                  onClick={finalSaveToDb}
                  className="flex-1 md:flex-none bg-theme-primary hover:bg-theme-secondary shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" /> Commit to Database
                </Button>
              </div>
            </div>

            {/* Inside the Step 2 part of your return statement */}
            <div className="space-y-8 pb-20">
              {hotelsData.map((hotel, index) => (
                <div key={hotel.id || index} className="relative">
                  <ReviewHotelCard
                    hotel={hotel}
                    index={index}
                    onSave={(updated) => handleUpdateHotel(index, updated)}
                    onDelete={() => {
                      const confirmed = window.confirm(
                        `Remove ${hotel.name} from this upload?`,
                      );
                      if (confirmed) {
                        const newList = hotelsData.filter(
                          (_, i) => i !== index,
                        );
                        setHotelsData(newList);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
