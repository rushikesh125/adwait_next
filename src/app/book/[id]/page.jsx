"use client";
import React, { use, useEffect, useState } from "react";
import { db } from "@/firebase/config";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Train,
  Loader2,
  Lock,
  FileText,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PublicBookingPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const tripId = params.id;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Simplified to a single object instead of an array
  const [passenger, setPassenger] = useState({
    name: "",
    age: "",
    gender: "Male",
    preference: "No Preference",
    address: "",
    mobile: "",
    email: "",
  });

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const docSnap = await getDoc(doc(db, "trips", tripId));
        if (docSnap.exists()) {
          setTrip(docSnap.data());
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
    if (!passenger.name.trim()) newErrors.name = "Full Name is required";
    if (!passenger.age || passenger.age < 1) newErrors.age = "Invalid age";
    if (!passenger.address.trim()) newErrors.address = "Address is required";
    if (!/^\d{10}$/.test(passenger.mobile))
      newErrors.mobile = "10-digit number required";
    if (!/^\S+@\S+\.\S+$/.test(passenger.email))
      newErrors.email = "Invalid email";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field, value) => {
    setPassenger((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return toast.error("Please fix errors");

    setIsSubmitting(true);
    try {
      const commonData = {
        ...passenger,
        tripId,
        tripName: trip.tripName,
        agentId: trip.agentId,
        updatedAt: serverTimestamp(),
      };

      // 1. Save to Submissions collection
      await addDoc(collection(db, "submissions"), {
        ...commonData,
        submittedAt: serverTimestamp(),
      });

      // 2. Save to Customers collection
      await addDoc(collection(db, "customers"), {
        ...commonData,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      toast.success("Booking confirmed!");
    } catch (error) {
      console.error("Firebase Error:", error);
      toast.error("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
      </div>
    );

  if (trip === "not-found")
    return (
      <StatusMessage
        icon={<AlertCircle className="w-12 h-12 text-red-500" />}
        title="Not Found"
        description="This trip does not exist."
      />
    );
  if (trip.status === "draft")
    return (
      <StatusMessage
        icon={<FileText className="w-12 h-12 text-slate-400" />}
        title="Draft Mode"
        description="This form is not public yet."
      />
    );
  if (trip.status === "closed")
    return (
      <StatusMessage
        icon={<Lock className="w-12 h-12 text-amber-500" />}
        title="Closed"
        description="Bookings are no longer accepted."
      />
    );

  if (submitted)
    return (
      <StatusMessage
        icon={<CheckCircle className="w-12 h-12 text-green-500" />}
        title="Success!"
        description="Your booking request has been sent."
        action={
          <Button
            className="bg-theme-primary"
            onClick={() => window.location.reload()}
          >
            Submit New
          </Button>
        }
      />
    );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="border-t-8 border-t-theme-primary shadow-sm bg-white overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                Live Form
              </span>
            </div>
            <CardTitle className="text-3xl font-black text-slate-900">
              {trip?.tripName}
            </CardTitle>
            <div className="mt-4 space-y-2">
              {trip?.journeys?.map((j, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-xs font-medium text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <Train className="w-4 h-4 text-theme-primary" />
                  <span className="font-bold text-slate-700">{j.trainNo}</span>
                  <span className="flex-1">
                    {j.from} → {j.to}
                  </span>
                  <span className="text-slate-400 font-bold">{j.date}</span>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-6 pb-20"
        >
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Passenger Details
            </div>
            <Separator className="flex-1" />
          </div>

          <FormSection
            title="Full Name (as per Aadhaar)"
            required
            error={errors.name}
          >
            <Input
              placeholder="Enter full name"
              maxLength={20}
              className="theme-input text-base font-semibold"
              value={passenger.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </FormSection>

          <div className="grid grid-cols-2 gap-4">
            <FormSection title="Age" required error={errors.age}>
              <Input
                type="number"
                placeholder="Years"
                className="theme-input font-bold"
                value={passenger.age}
                onChange={(e) => updateField("age", e.target.value)}
              />
            </FormSection>
            <FormSection title="Gender" required>
              <RadioGroup
                value={passenger.gender}
                onValueChange={(v) => updateField("gender", v)}
                className="flex h-10 items-center gap-4"
              >
                {["Male", "Female"].map((g) => (
                  <div key={g} className="flex items-center space-x-2">
                    <RadioGroupItem value={g} id={g} />
                    <Label htmlFor={g} className="text-sm font-medium">
                      {g}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormSection>
          </div>

          <FormSection title="Seat Preference">
            <Select
              value={passenger.preference}
              onValueChange={(v) => updateField("preference", v)}
            >
              <SelectTrigger className="theme-input font-medium bg-transparent">
                <SelectValue placeholder="Select Seat" />
              </SelectTrigger>
              <SelectContent>
                {["No Preference", "Lower", "Middle", "Upper"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormSection>

          <FormSection
            title="Residential Address"
            required
            error={errors.address}
          >
            <Input
              placeholder="City, State"
              className="theme-input"
              value={passenger.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </FormSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSection title="Mobile Number" required error={errors.mobile}>
              <Input
                placeholder="10 digit number"
                className="theme-input"
                maxLength={50}
                value={passenger.mobile}
                onChange={(e) => updateField("mobile", e.target.value)}
              />
            </FormSection>
            <FormSection title="Email Address" required error={errors.email}>
              <Input
                type="email"
                placeholder="personal@email.com"
                className="theme-input font-medium"
                value={passenger.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </FormSection>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-theme-primary hover:bg-theme-dark text-white font-bold h-14 shadow-lg text-lg"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              "Confirm Booking"
            )}
          </Button>
        </form>
      </div>

      <style jsx global>{`
        .theme-input {
          border-radius: 0 !important;
          border: none !important;
          border-bottom: 2px solid #f1f5f9 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          transition: all 0.3s ease !important;
        }
        .theme-input:focus {
          border-bottom-color: var(--theme-primary, #2563eb) !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

function StatusMessage({ icon, title, description, action }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center p-8 border-none shadow-sm">
        <div className="flex justify-center mb-6">{icon}</div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500 text-sm mb-8">{description}</p>
        {action}
      </Card>
    </div>
  );
}

function FormSection({ title, required, children, error }) {
  return (
    <div
      className={`p-5 rounded-xl bg-white border border-slate-100 shadow-sm ${error ? "border-red-200 bg-red-50/10" : ""}`}
    >
      <Label className="text-[10px] font-black text-theme-primary uppercase tracking-widest block mb-2">
        {title} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && (
        <p className="mt-2 text-[10px] font-bold text-red-500 uppercase italic">
          {error}
        </p>
      )}
    </div>
  );
}
