"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Save,
  RefreshCcw,
  Database,
  ShieldCheck,
  Globe,
  FileSearch,
  ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Assuming this component handles the nested display of rooms/seasons
import ReviewHotelCard from "@/components/ReviewHotelCard";

export default function ExcelUploadPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [hotelsData, setHotelsData] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];

    if (selectedFile && (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith(".csv"))) {
      setFile(selectedFile);
      toast.success("Inventory source recognized.");
    } else {
      toast.error("Format not supported. Please use .xlsx or .csv");
    }
  };

  const processFile = async () => {
    if (!file) {
      toast.error("Please provide an inventory file first");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

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
        toast.success(`Successfully mapped ${data.length} hotel records`);
      } else {
        throw new Error(data.error || "Data mapping failed");
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

  const finalSaveToDb = async () => {
    toast.promise(
      // Replace with your real submission logic
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Syncing inventory to global database...",
        success: "Database updated successfully!",
        error: "Failed to sync changes.",
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans selection:bg-indigo-100">
      {/* Header - Standard Clean Bar */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-900 tracking-tight">Inventory Engine</h1>
          </div>

          <nav className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step === 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <div className={`h-2 w-2 rounded-full ${step === 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <span className="ml-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
              Step {step} of 2
            </span>
          </nav>
        </div>
      </header>

      <main className="w-full mx-auto md:px-6 mt-12">
        {step === 1 ? (
          /* STEP 1: UPLOAD */
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900">Bulk Ingestion</h2>
              <p className="text-slate-500">Upload your master spreadsheet to sync rates and availability.</p>
            </div>

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Source</Label>
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none">
                      XLSX, CSV Supported
                    </Badge>
                  </div>
                  
                  <label className={`relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${file ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}`}>
                    <div className="flex flex-col items-center text-center p-6">
                      <div className={`mb-4 p-4 rounded-full transition-transform group-hover:scale-110 ${file ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                        {file ? <CheckCircle2 className="h-8 w-8" /> : <UploadCloud className="h-8 w-8" />}
                      </div>
                      <p className="font-bold text-slate-700">{file ? file.name : "Drop spreadsheet here"}</p>
                      <p className="text-sm text-slate-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : "or click to select file"}</p>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileChange} />
                  </label>
                </div>

                <Button 
                  onClick={processFile} 
                  disabled={isUploading || !file}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : "Initialize Data Pipeline"}
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-8 py-4">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">ISO Verified</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">State Auto-Detect</span>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: REVIEW */
          <div className="space-y-8 animate-in fade-in zoom-in-95">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileSearch className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Validation Queue</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none px-2 py-0">{hotelsData.length} Hotels</Badge>
                    <ChevronRight className="h-3 w-3 text-slate-300" />
                    <span className="text-xs text-slate-400 font-medium">Mapped from {file?.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <Button variant="ghost" className="text-slate-500 font-bold hover:bg-slate-100" onClick={() => setStep(1)}>
                  Discard
                </Button>
                <Button onClick={finalSaveToDb} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-100">
                  <Save className="h-4 w-4 mr-2" /> Confirm & Sync
                </Button>
              </div>
            </div>

            {/* <div className="grid grid-cols-1 gap-6 pb-24">
              {hotelsData.map((hotel, index) => (
                <ReviewHotelCard
                  key={index}
                  hotel={hotel}
                  index={index}
                  onSave={(updated) => handleUpdateHotel(index, updated)}
                  onDelete={() => {
                    if (window.confirm(`Remove ${hotel.name} from this sync?`)) {
                      setHotelsData(hotelsData.filter((_, i) => i !== index));
                    }
                  }}
                />
              ))}
            </div> */}
          </div>
        )}
      </main>
    </div>
  );
}