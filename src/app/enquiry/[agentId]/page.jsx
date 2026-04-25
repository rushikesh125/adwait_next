"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { doc, updateDoc } from "firebase/firestore";
import {
  CheckCircle2,
  Compass,
  Loader2,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import emailjs from "@emailjs/browser";
import LeadForm from "@/components/leads/LeadForm";
import { db } from "@/firebase/config";
import {
  addCustomer,
  findExistingCustomerByEmailOrMobile,
} from "@/firebase/customersService";
import { createAssignedLead } from "@/firebase/leadsService";
import { getAgentByEnquiryIdentifier } from "@/firebase/users";
import {
  enquiryInitialValues,
  normalizeEmail,
  normalizeMobile,
  validateEnquiry,
} from "@/lib/enquiryForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { addFollowUp } from "@/firebase/followUpService";

export default function PublicEnquiryPage() {
  const params = useParams();
  const agentId = params?.agentId;

  const [agent, setAgent] = useState(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(enquiryInitialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    async function loadAgent() {
      if (!agentId) return;
      setLoadingAgent(true);
      setFatalError("");

      try {
        const record = await getAgentByEnquiryIdentifier(agentId);
        if (!record) {
          setFatalError("This enquiry link is not valid.");
          setAgent(null);
          return;
        }

        const data = record;
        if (data.approved && data.approved !== "accepted") {
          setFatalError("This enquiry link is not active right now.");
          setAgent(null);
          return;
        }

        setAgent(data);
      } catch (error) {
        console.error(error);
        setFatalError("We could not open this enquiry form right now.");
      } finally {
        setLoadingAgent(false);
      }
    }

    loadAgent();
  }, [agentId]);

  const titleText = useMemo(() => {
    if (!agent?.name) return "Travel Enquiry";
    return `Plan Your Journey with ${agent.name}`;
  }, [agent?.name]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateEnquiry(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !agent) return;

    setSubmitting(true);
    setFatalError("");

    try {
      const cleanEmail = normalizeEmail(form.email);
      const cleanMobile = normalizeMobile(form.mobile);

      let customer = await findExistingCustomerByEmailOrMobile({
        email: cleanEmail,
        mobile: cleanMobile,
      });

      if (!customer) {
        const customerRef = await addCustomer({
          name: form.name.trim(),
          email: cleanEmail,
          mobile: cleanMobile,
          city: form.departureCity.trim(),
          state: form.destination.trim(),
          status: "New",
          source: "Public Enquiry Form",
          assignedAgentId: agent.id,
          assignedAgentName: agent.name || "",
        });

        customer = {
          id: customerRef.id,
          name: form.name.trim(),
          email: cleanEmail,
          mobile: cleanMobile,
        };
      } else {
        const updates = {};
        if (!customer.assignedAgentId) updates.assignedAgentId = agent.id;
        if (!customer.assignedAgentName && agent.name) {
          updates.assignedAgentName = agent.name;
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "customers", customer.id), updates);
        }
      }

      const leadId = await createAssignedLead({
        ...form,
        name: form.name.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        customerId: customer.id,
        agentId: agent.id,
        agentName: agent.name || "",
        source: "Public Enquiry Form",
      });
      console.log("leadId:", leadId, typeof leadId);
      try {
        await addFollowUp(leadId, {
          dateTime: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
          mode: "Call",
          notes: "Initial follow-up for public enquiry",
          quotationIds: [],
        });

        console.log("[Public Enquiry] Auto follow-up created");
      } catch (followErr) {
        console.error("[Public Enquiry] Auto follow-up failed:", followErr);
      }
      // Notify agent about the new lead via email
      console.log("[Lead Email] agent.email:", agent.email);
      if (agent.email) {
        try {
          await emailjs.send(
            "service_gmfmqbu",
            process.env.NEXT_PUBLIC_EMAILJS_LEAD_TEMPLATE_ID,
            {
              agent_name: agent.name || "Agent",
              to_email: agent.email,
              customer_name: form.name.trim(),
              customer_email: cleanEmail,
              customer_mobile: cleanMobile,
              destination: form.destination,
              departure_city: form.departureCity,
              travel_date: form.travelDate,
              days: form.days,
              trip_type: form.tripType,
              adults: form.adults,
              children: form.children || "0",
              rooms: form.rooms,
              meal_plan: form.mealPlan,
              budget: form.budget || "Not specified",
              notes: form.notes || "None",
            },
            "yTtNjop0pU1m6XnE0",
          );
        } catch (emailError) {
          // Don't block submission if email fails
          console.error("Lead notification email failed:", emailError);
        }
      }

      setSubmitted(true);
      setForm(enquiryInitialValues);
      setErrors({});
    } catch (error) {
      console.error(error);
      setFatalError(
        "We could not submit your enquiry right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldLabel = (label, required = false) => (
    <Label className="text-slate-700">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </Label>
  );

  if (loadingAgent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-theme-primary" />
          <p className="mt-3 text-sm text-slate-500">Opening enquiry form...</p>
        </div>
      </div>
    );
  }

  if (fatalError && !agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-xl border-slate-200 shadow-sm">
          <CardContent className="px-6 py-8">
            <Alert variant="destructive">
              <AlertTitle>Form unavailable</AlertTitle>
              <AlertDescription>{fatalError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,136,229,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(124,58,237,0.10),_transparent_24%),linear-gradient(180deg,_#f6fbff_0%,_#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="overflow-hidden border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(227,242,253,0.9),_rgba(255,255,255,0.9))] p-0">
              <div className="space-y-6 px-6 py-8 sm:px-8">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                    <Image
                      src="/adwait-logo.jpg"
                      alt="Adwait Tours"
                      width={56}
                      height={56}
                      className="rounded-xl object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-primary">
                      Adwait Tours
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Tailored holidays, thoughtfully planned
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <CardTitle className="text-3xl leading-tight text-slate-900 sm:text-4xl">
                    {titleText}
                  </CardTitle>
                  <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                    Tell us where you want to go, how you like to travel, and
                    the kind of stay you prefer. Our team will review your
                    request and get in touch with the right plan for your trip.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-slate-900">
                    Your travel consultant
                  </p>
                  <p className="mt-1 text-base text-slate-700">
                    {agent?.name || "Adwait Tours"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Personal trip planning support
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-6 text-sm text-slate-600 sm:px-8">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Customized planning
                    </p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Share your trip preferences once and let our team shape a
                      suitable quotation around them.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                    <MapPinned className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Clear trip brief
                    </p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Destination, dates, trip type, rooms, meals, and transport
                      preferences help us recommend the right option faster.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Professional follow-up
                    </p>
                    <p className="mt-1 leading-6 text-slate-600">
                      Once submitted, our team reviews your enquiry and contacts
                      you shortly to discuss the next steps.
                    </p>
                  </div>
                </div>
              </div>

              {submitted && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Enquiry submitted successfully</AlertTitle>
                  <AlertDescription>
                    Your enquiry has been submitted successfully. Our team will
                    contact you shortly.
                  </AlertDescription>
                </Alert>
              )}

              {fatalError && agent && (
                <Alert variant="destructive">
                  <AlertTitle>Submission failed</AlertTitle>
                  <AlertDescription>{fatalError}</AlertDescription>
                </Alert>
              )}

              {Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Please check your details</AlertTitle>
                  <AlertDescription>
                    Some required fields are missing or invalid. Please review
                    the form and submit again.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white/85">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-theme-muted p-2.5 text-theme-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-slate-900">
                    Trip Enquiry Form
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    Please fill in your details so we can prepare the right
                    travel plan.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 bg-white px-6 py-6 sm:px-8">
              <div className="grid gap-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  {renderFieldLabel("Contact Number", true)}
                  <Input
                    id="mobile"
                    name="mobile"
                    maxLength={10}
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                  />
                  {errors.mobile && (
                    <p className="text-xs text-red-600">{errors.mobile}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {renderFieldLabel("Email ID", true)}
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                <LeadForm
                  form={form}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  submitLabel={submitting ? "Submitting..." : "Submit Enquiry"}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
