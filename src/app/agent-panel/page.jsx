"use client"
import React, { useState } from "react";
import GeneralInfoStep from "@/components/GeneralInfoStep";
import TransportStep from "@/components/TransportStep";
import ItineraryStep from "@/components/ItineraryStep";
import SummaryStep from "@/components/SummaryStep";
import { createNewPackage } from "@/firebase/package_service";

const CreatePackage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [packageData, setPackageData] = useState({
    packageName: "",
    baseLocation: "",
    duration: { days: 1, nights: 0 },
    transport: null, 
    days: [], 
    totalBaseCost: 0
  });

  const totalSteps = 4;

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleUpdatePackage = (field, value) => {
    setPackageData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePackage = async () => {
    try {
      await createNewPackage(packageData);
      alert("Package Template Created Successfully!");
    } catch (error) {
      alert("Error saving package: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            Create New Package Template
          </h1>
          
          {/* Progress Indicator */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            
            {/* Progress Bar Container */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </header>

        {/* Step Rendering Logic */}
        <main className="transition-all duration-300">
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <GeneralInfoStep 
                data={packageData} 
                update={handleUpdatePackage} 
                onNext={nextStep} 
              />
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TransportStep 
                data={packageData} 
                update={handleUpdatePackage} 
                onNext={nextStep} 
                onPrev={prevStep} 
              />
            </div>
          )}
          
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ItineraryStep 
                data={packageData} 
                update={handleUpdatePackage} 
                onNext={nextStep} 
                onPrev={prevStep} 
              />
            </div>
          )}
          
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SummaryStep 
                data={packageData} 
                onSave={handleSavePackage} 
                onPrev={prevStep} 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CreatePackage;