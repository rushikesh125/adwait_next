"use client";
import React, { use, useEffect, useState } from "react";
import { db } from "@/firebase/config";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Train, UserPlus, Trash2, Loader2, Lock, FileText, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PublicBookingPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const [passengers, setPassengers] = useState([{
    name: "", age: "", gender: "Male",
    preference: "No Preference",
    address: "", mobile: "", email: ""
  }]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const docSnap = await getDoc(doc(db, "trips", tripId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTrip(data);
        } else {
          setTrip("not-found");
        }
      } catch {
        toast.error("Error loading trip");
      } finally {
        setLoading(false);
      }
    };
    fetchTrip();
  }, [tripId]);

  const validate = () => {
    let newErrors = {};
    let isValid = true;
    passengers.forEach((p, i) => {
      const pErr = {};
      if (!p.name.trim()) pErr.name = "Full Name is required";
      if (!p.age || p.age < 1) pErr.age = "Invalid age";
      if (!p.address.trim()) pErr.address = "Address is required";
      if (!/^\d{10}$/.test(p.mobile)) pErr.mobile = "Invalid 10-digit number";
      if (!/^\S+@\S+\.\S+$/.test(p.email)) pErr.email = "Invalid email";
      if (Object.keys(pErr).length > 0) { newErrors[i] = pErr; isValid = false; }
    });
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Please fix errors");
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "submissions"), {
        tripId, tripName: trip.tripName,
        passengers, submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch { toast.error("Submission failed."); }
    finally { setIsSubmitting(false); }
  };

  // 1. LOADING STATE
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
    </div>
  );

  // 2. TRIP NOT FOUND
  if (trip === "not-found") return (
    <StatusMessage 
      icon={<AlertCircle className="w-12 h-12 text-red-500" />}
      title="Trip Not Found"
      description="The link you followed may be broken or the trip has been deleted."
    />
  );

  // 3. STATUS: DRAFT OR CLOSED
  if (trip.status === "draft") return (
    <StatusMessage 
      icon={<FileText className="w-12 h-12 text-slate-400" />}
      title="Form under Review"
      description="This booking form is currently in draft mode and not accepting public responses."
    />
  );

  if (trip.status === "closed") return (
    <StatusMessage 
      icon={<Lock className="w-12 h-12 text-amber-500" />}
      title="Bookings Closed"
      description="We are no longer accepting responses for this specific trip."
    />
  );

  // 4. SUBMITTED SUCCESS
  if (submitted) return (
    <StatusMessage 
      icon={<CheckCircle className="w-12 h-12 text-green-500" />}
      title="Booking Received!"
      description="Your details have been sent to the agent. We will contact you soon."
      action={<Button className="bg-theme-primary" onClick={() => window.location.reload()}>Submit Another</Button>}
    />
  );

  // 5. ACTIVE PUBLIC FORM
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-t-8 border-t-theme-primary shadow-sm bg-white overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Live Form</span>
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">{trip?.tripName}</CardTitle>
            <div className="mt-4 space-y-2">
              {trip?.journeys?.map((j, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-medium text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <Train className="w-4 h-4 text-theme-primary" />
                  <span className="font-bold text-slate-700 underline decoration-theme-primary/30">{j.trainNo}</span>
                  <span className="flex-1">{j.from} → {j.to}</span>
                  <span className="text-slate-400 font-bold">{j.date}</span>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
          {passengers.map((p, index) => (
            <div key={index} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest">
                  Passenger {index + 1}
                </div>
                <Separator className="flex-1" />
              </div>

              <FormSection title="Full Name (as per Aadhaar)" required error={errors[index]?.name}>
                <Input 
                  autoComplete="one-time-code"
                  placeholder="Enter full name"
                  className="theme-input text-base font-semibold"
                  value={p.name}
                  onChange={(e) => {
                    const newP = [...passengers];
                    newP[index].name = e.target.value;
                    setPassengers(newP);
                  }}
                />
              </FormSection>

              <div className="grid grid-cols-2 gap-4">
                <FormSection title="Age" required error={errors[index]?.age}>
                  <Input type="number" placeholder="Years" className="theme-input font-bold" value={p.age} onChange={(e) => {
                    const newP = [...passengers];
                    newP[index].age = e.target.value;
                    setPassengers(newP);
                  }} />
                </FormSection>
                <FormSection title="Gender" required>
                  <RadioGroup value={p.gender} onValueChange={(v) => {
                    const newP = [...passengers];
                    newP[index].gender = v;
                    setPassengers(newP);
                  }} className="flex h-10 items-center gap-4">
                    {["Male", "Female"].map((g) => (
                      <div key={g} className="flex items-center space-x-2">
                        <RadioGroupItem value={g} id={`${g}-${index}`} />
                        <Label htmlFor={`${g}-${index}`} className="text-sm font-medium">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormSection>
              </div>

              <FormSection title="Seat Preference">
                <Select value={p.preference} onValueChange={(v) => {
                  const newP = [...passengers];
                  newP[index].preference = v;
                  setPassengers(newP);
                }}>
                  <SelectTrigger className="theme-input font-medium bg-transparent">
                    <SelectValue placeholder="Select Seat" />
                  </SelectTrigger>
                  <SelectContent>
                    {["No Preference", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormSection>

              <FormSection title="Residential Address" required error={errors[index]?.address}>
                <Input placeholder="City, State" className="theme-input" value={p.address} onChange={(e) => {
                    const newP = [...passengers];
                    newP[index].address = e.target.value;
                    setPassengers(newP);
                }} />
              </FormSection>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSection title="Mobile Number" required error={errors[index]?.mobile}>
                  <Input placeholder="10 digit number" className="theme-input" value={p.mobile} onChange={(e) => {
                    const newP = [...passengers];
                    newP[index].mobile = e.target.value;
                    setPassengers(newP);
                  }} />
                </FormSection>
                <FormSection title="Email Address" required error={errors[index]?.email}>
                  <Input type="email" placeholder="personal@email.com" className="theme-input font-medium" value={p.email} onChange={(e) => {
                    const newP = [...passengers];
                    newP[index].email = e.target.value;
                    setPassengers(newP);
                  }} />
                </FormSection>
              </div>

              {passengers.length > 1 && (
                <Button variant="ghost" className="text-red-500 hover:bg-red-50 w-full text-[10px] font-bold uppercase tracking-tighter" onClick={() => setPassengers(passengers.filter((_, i) => i !== index))}>
                  <Trash2 className="w-3 h-3 mr-2" /> Remove Passenger
                </Button>
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-20">
            <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-theme-primary hover:bg-theme-dark text-white font-bold h-12 shadow-md">
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Details"}
            </Button>
            <Button type="button" variant="outline" className="flex-1 border-slate-200 text-slate-600 h-12 font-bold" onClick={() => setPassengers([...passengers, { name: "", age: "", gender: "Male", preference: "No Preference", address: "", mobile: "", email: "" }])}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Person
            </Button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .theme-input {
          border-radius: 0 !important; border: none !important;
          border-bottom: 2px solid #f1f5f9 !important;
          padding-left: 0 !important; padding-right: 0 !important;
          transition: all 0.3s ease !important;
        }
        .theme-input:focus { border-bottom-color: var(--theme-primary, #2563eb) !important; box-shadow: none !important; }
      `}</style>
    </div>
  );
}

// Reusable Status Message component for 404, Closed, Draft, and Success
function StatusMessage({ icon, title, description, action }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center p-8 border-none shadow-sm">
        <div className="flex justify-center mb-6">{icon}</div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{title}</h2>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{description}</p>
        {action}
      </Card>
    </div>
  );
}

function FormSection({ title, required, children, error }) {
  return (
    <div className={`p-5 rounded-xl bg-white border border-slate-100 shadow-sm transition-all ${error ? "border-red-200 bg-red-50/10" : ""}`}>
      <Label className="text-[10px] font-black text-theme-primary uppercase tracking-widest block mb-2">
        {title} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-tighter italic">{error}</p>}
    </div>
  );
}