"use client";
import React, { use, useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Train, UserPlus, Trash2, Calendar, Loader2, CheckCircle2, Info } from "lucide-react";
import toast from "react-hot-toast";

// shadcn/ui inspired components (standard paths)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function PublicBookingPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focusedSection, setFocusedSection] = useState(null);

  const [passengers, setPassengers] = useState([{
    name: "", age: "", gender: "M",
    preference: "No Preference",
    address: "", mobile: "", email: ""
  }]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const docSnap = await getDoc(doc(db, "trips", tripId));
        if (docSnap.exists()) setTrip(docSnap.data());
        else toast.error("Trip not found");
      } catch { toast.error("Error loading trip"); }
      finally { setLoading(false); }
    };
    fetchTrip();
  }, [tripId]);

  const updatePassenger = (index, field, value) => {
    const newP = [...passengers];
    newP[index][field] = value;
    setPassengers(newP);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "submissions"), {
        tripId, agentId: trip.agentId, tripName: trip.tripName,
        passengers, submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch { toast.error("Submission failed."); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-theme-muted flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-theme-muted flex flex-col items-center pt-12 p-4">
      <Card className="w-full max-w-2xl border-t-8 border-t-theme-primary shadow-sm">
        <CardHeader className="pt-8">
          <CardTitle className="text-3xl font-normal tracking-tight">{trip?.tripName}</CardTitle>
          <CardDescription className="text-base pt-2">Your response has been recorded.</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Button variant="link" className="p-0 text-theme-primary h-auto" onClick={() => window.location.reload()}>
            Submit another response
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-muted py-8 px-4 font-sans selection:bg-theme-accent/30">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Header Card */}
        <Card className="border-t-8 border-t-theme-primary shadow-sm overflow-hidden">
          <CardHeader className="space-y-4">
            <CardTitle className="text-3xl font-normal">{trip?.tripName || "Trip Details"}</CardTitle>
            <div className="space-y-3">
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
                {trip?.journeys.map((j, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <Train className="w-4 h-4 text-theme-primary" />
                    <span className="font-bold text-slate-900">{j.trainNo}</span>
                    <span className="text-slate-400">|</span>
                    <span>{j.from} → {j.to}</span>
                    <span className="bg-theme-muted text-theme-dark px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {j.class}
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-red-600 text-xs">
                <span>* Indicates required question</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {passengers.map((p, index) => (
            <div key={index} className="space-y-4">
              {/* Passenger Header Divider */}
              <div className="flex items-center gap-4 px-2 pt-4">
                <span className="bg-theme-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                  Passenger {index + 1}
                </span>
                <Separator className="flex-1 bg-slate-300" />
              </div>

              {/* Name Section */}
              <FormSection 
                title="Full Name (as per Aadhaar)" 
                required 
                isFocused={focusedSection === `name-${index}`}
                onFocus={() => setFocusedSection(`name-${index}`)}
              >
                <div className="relative group">
                  <Input 
                    required
                    placeholder="Your answer"
                    className="border-0 border-b-2 border-slate-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-theme-primary transition-all duration-300 bg-transparent"
                    value={p.name}
                    onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                  />
                </div>
              </FormSection>

              {/* Age Section */}
              <FormSection 
                title="Age" 
                required 
                isFocused={focusedSection === `age-${index}`}
                onFocus={() => setFocusedSection(`age-${index}`)}
              >
                <Input 
                  required
                  type="number"
                  placeholder="Your answer"
                  className="w-full sm:w-1/3 border-0 border-b-2 border-slate-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-theme-primary bg-transparent"
                  value={p.age}
                  onChange={(e) => updatePassenger(index, 'age', e.target.value)}
                />
              </FormSection>

              {/* Gender Section */}
              <FormSection title="Gender" required>
                <RadioGroup 
                  defaultValue={p.gender} 
                  onValueChange={(val) => updatePassenger(index, 'gender', val)}
                  className="space-y-3 pt-2"
                >
                  {["Male", "Female", "Transgender"].map((g) => (
                    <div key={g} className="flex items-center space-x-3 group">
                      <RadioGroupItem value={g[0]} id={`${g}-${index}`} className="border-slate-400 text-theme-primary focus:ring-theme-primary" />
                      <Label htmlFor={`${g}-${index}`} className="font-normal text-slate-700 cursor-pointer">{g}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormSection>

              {/* Contact Grid */}
              <FormSection title="Contact Details" required>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Mobile Number</Label>
                    <Input 
                      required
                      placeholder="10-digit number"
                      className="border-0 border-b-2 border-slate-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-theme-primary bg-transparent"
                      value={p.mobile}
                      onChange={(e) => updatePassenger(index, 'mobile', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Email Address</Label>
                    <Input 
                      required
                      type="email"
                      placeholder="email@example.com"
                      className="border-0 border-b-2 border-slate-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-theme-primary bg-transparent"
                      value={p.email}
                      onChange={(e) => updatePassenger(index, 'email', e.target.value)}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Action Buttons for Passenger */}
              {passengers.length > 1 && (
                <div className="flex justify-end px-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    type="button"
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setPassengers(passengers.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Remove Passenger
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-12">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-theme-primary hover:bg-theme-secondary text-white px-8"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
              <Button 
                variant="ghost" 
                type="button"
                className="text-theme-primary hover:bg-theme-muted"
                onClick={() => setPassengers([...passengers, { name: "", age: "", gender: "M", preference: "No Preference", address: "", mobile: "", email: "" }])}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Add Passenger
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">Never submit passwords through Google Forms.</p>
          </div>
        </form>

        <footer className="text-center space-y-4 pb-12">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold opacity-60">Google Forms</p>
          <div className="text-[11px] text-slate-400 space-x-2">
            <span className="hover:underline cursor-pointer">Report Abuse</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ── Internal Helper Component ─────────────────────────────────────

function FormSection({ title, required, children, isFocused, onFocus }) {
  return (
    <Card 
      onClick={onFocus}
      className={`transition-all duration-200 border-l-4 ${
        isFocused ? "border-l-theme-primary shadow-md" : "border-l-transparent shadow-sm"
      }`}
    >
      <CardContent className="pt-6">
        <Label className="text-base font-normal text-slate-900 block mb-4">
          {title} {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {children}
      </CardContent>
    </Card>
  );
}