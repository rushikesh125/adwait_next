"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { ArrowLeft, CheckCircle2, Mail, Plane, Plus, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuotationState } from "@/app/hooks/useQuotationState";
import { updateQuotation } from "@/firebase/quotations";
import {
  getNextVoucherNumber,
  saveVoucherToFirestore,
  updateVoucherDocument,
} from "@/firebase/voucher";
import {
  generateFlightVoucherPDF,
  shareFlightVoucherEmail,
  shareFlightVoucherWhatsApp,
} from "@/lib/generateFlightVoucher";

const createPassenger = () => ({ title: "Mr", name: "" });
const createSegment = () => ({
  airline: "",
  flightNumber: "",
  origin: "",
  destination: "",
  departureDateTime: "",
  arrivalDateTime: "",
  bookingReference: "",
  seatClass: "",
  baggageAllowance: "",
  terminal: "",
  notes: "",
});

const Section = ({ title, icon: Icon, children }) => (
  <div className="space-y-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="h-5 w-5 text-theme-primary" />}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h2>
    </div>
    {children}
  </div>
);

export default function CreateFlightVoucherPage({
  isOpen,
  onClose,
  initialVoucher = null,
  agentId: agentIdProp = "",
  onSaved,
}) {
  const router = useRouter();
  const { quotations } = useQuotationState();
  const isEditMode = Boolean(initialVoucher);
  const isDialogMode = typeof isOpen === "boolean";
  const [voucherNo, setVoucherNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotationInput, setQuotationInput] = useState("");
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);
  const [linkedQuotation, setLinkedQuotation] = useState(null);
  const suggestionRef = useRef(null);
  const [passengers, setPassengers] = useState([createPassenger()]);
  const [segments, setSegments] = useState([createSegment()]);
  const [form, setForm] = useState({
    contact: "",
    customerEmail: "",
    bookingReference: "",
    seatClass: "",
    baggageAllowance: "",
    importantNotes:
      "Please report at the airline check-in counter at least 3 hours before departure and carry a valid photo ID.",
  });

  useEffect(() => {
    if (initialVoucher?.voucherNumber) {
      setVoucherNo(initialVoucher.voucherNumber);
      setPassengers(
        initialVoucher.passengers?.length > 0
          ? initialVoucher.passengers
          : [createPassenger()],
      );
      setSegments(
        initialVoucher.segments?.length > 0
          ? initialVoucher.segments
          : [createSegment()],
      );
      setForm({
        contact: initialVoucher.contact || "",
        customerEmail: initialVoucher.customerEmail || "",
        bookingReference: initialVoucher.bookingReference || "",
        seatClass: initialVoucher.seatClass || "",
        baggageAllowance: initialVoucher.baggageAllowance || "",
        importantNotes: initialVoucher.importantNotes || "",
      });
      setQuotationInput(
        initialVoucher.customerName
          ? `${initialVoucher.customerName}${initialVoucher.quotationId ? ` - #${initialVoucher.quotationId.substring(0, 8).toUpperCase()}` : ""}`
          : "",
      );
      return;
    }

    getNextVoucherNumber("flight").then(setVoucherNo);
  }, [initialVoucher]);

  useEffect(() => {
    const trimmed = quotationInput.trim().toLowerCase();
    if (!trimmed || linkedQuotation) {
      setQuotationSuggestions([]);
      return;
    }
    const matches = (quotations || []).filter(
      (quotation) =>
        quotation.id?.toLowerCase().includes(trimmed) ||
        quotation.customerName?.toLowerCase().includes(trimmed),
    );
    setQuotationSuggestions(matches.slice(0, 6));
  }, [linkedQuotation, quotationInput, quotations]);

  useEffect(() => {
    const handler = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setQuotationSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectQuotation = (quotation) => {
    setLinkedQuotation(quotation);
    setQuotationInput(
      `${quotation.customerName} - #${quotation.id.substring(0, 8).toUpperCase()}`,
    );
    setQuotationSuggestions([]);
    setPassengers([{ title: "Mr", name: quotation.customerName || "" }]);
    setForm((prev) => ({
      ...prev,
      contact: quotation.customerMobile || prev.contact,
    }));
  };

  const validPassengers = useMemo(
    () => passengers.filter((passenger) => passenger.name.trim()),
    [passengers],
  );

  const validate = () => {
    if (validPassengers.length === 0) {
      alert("At least one passenger name is required.");
      return false;
    }
    if (segments.length === 0) {
      alert("Add at least one flight segment.");
      return false;
    }
    for (const [index, segment] of segments.entries()) {
      if (
        !segment.airline.trim() ||
        !segment.flightNumber.trim() ||
        !segment.origin.trim() ||
        !segment.destination.trim() ||
        !segment.departureDateTime ||
        !segment.arrivalDateTime
      ) {
        alert(`Complete all required fields in segment ${index + 1}.`);
        return false;
      }
    }
    if (form.contact && !/^\d{10}$/.test(form.contact)) {
      alert("Enter a valid 10-digit mobile number.");
      return false;
    }
    return true;
  };

  const buildVoucherData = () => ({
    voucherNumber: voucherNo,
    voucherType: "Flight",
    quotationId: initialVoucher?.quotationId || linkedQuotation?.id || null,
    customerName:
      linkedQuotation?.customerName ||
      initialVoucher?.customerName ||
      validPassengers[0]?.name ||
      "",
    destination:
      segments.length > 0
        ? `${segments[0].origin || ""} - ${segments[segments.length - 1].destination || ""}`.trim()
        : initialVoucher?.destination || "",
    passengers: validPassengers,
    contact: form.contact,
    customerEmail: form.customerEmail,
    bookingReference: form.bookingReference,
    seatClass: form.seatClass,
    baggageAllowance: form.baggageAllowance,
    importantNotes: form.importantNotes,
    segments,
    issueDate: initialVoucher?.issueDate || new Date().toISOString(),
    status: initialVoucher?.status || "Generated",
  });

  const handleSave = async () => {
    if (!validate()) return;
    const agentId = agentIdProp || getAuth().currentUser?.uid;
    if (!agentId) {
      alert("Not authenticated");
      return;
    }

    setLoading(true);
    try {
      const voucherData = buildVoucherData();
      if (isEditMode) {
        await updateVoucherDocument(agentId, initialVoucher, voucherData);
      } else {
        await saveVoucherToFirestore(agentId, linkedQuotation?.id || null, voucherData);
      }

      if (!isEditMode && linkedQuotation?.id) {
        await updateQuotation(agentId, linkedQuotation.id, {
          voucherNumber: voucherNo,
          isVoucherGenerated: true,
          voucherType: "Flight",
          issueDate: voucherData.issueDate,
          latestFlightVoucherRef: voucherNo,
        });
      }
      alert(isEditMode ? "Flight voucher updated successfully." : "Flight voucher created successfully.");
      onSaved?.();
      if (isDialogMode) {
        onClose?.();
      } else {
        router.push("/agent-panel/vouchers");
      }
    } catch (error) {
      console.error(error);
      alert(`Error saving voucher: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const withValidatedVoucher = async (callback) => {
    if (!validate()) return;
    await callback(buildVoucherData());
  };

  const content = (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              isDialogMode ? onClose?.() : router.push("/agent-panel/vouchers")
            }
            className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-theme-primary" />
            <h1 className="text-lg font-semibold text-slate-800">
              {isEditMode ? "Edit Flight Voucher" : "New Flight Voucher"}
            </h1>
          </div>
        </div>
        <Badge className="border border-theme-accent/30 bg-theme-muted px-4 py-1 font-mono text-sm text-theme-primary">
          {voucherNo || "Generating..."}
        </Badge>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <Section title="Link to Quotation (Optional)">
          <div className="relative" ref={suggestionRef}>
            <Label className="mb-1.5 block text-slate-600">Quotation ID / Customer Name</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by customer name or quotation ID..."
                  value={quotationInput}
                  disabled={!!linkedQuotation}
                  onChange={(event) => setQuotationInput(event.target.value)}
                />
              </div>
              {linkedQuotation && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setLinkedQuotation(null);
                    setQuotationInput("");
                    setQuotationSuggestions([]);
                  }}
                  className="text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {quotationSuggestions.length > 0 && !linkedQuotation && (
              <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {quotationSuggestions.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="cursor-pointer border-b px-4 py-3 transition-colors hover:bg-slate-50 last:border-0"
                    onMouseDown={() => handleSelectQuotation(quotation)}
                  >
                    <p className="text-sm font-medium text-slate-800">{quotation.customerName}</p>
                    <p className="text-xs text-slate-400">
                      #{quotation.id.substring(0, 8).toUpperCase()}
                      {quotation.destination ? ` · ${quotation.destination}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {linkedQuotation && (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Linked to #{linkedQuotation.id.substring(0, 8).toUpperCase()} - {linkedQuotation.customerName}
              </p>
            )}
          </div>
        </Section>

        <Section title="Passenger Details" icon={Plane}>
          <div className="space-y-3">
            {passengers.map((passenger, index) => (
              <div key={index} className="flex items-center gap-3">
                <Select
                  value={passenger.title}
                  onValueChange={(value) =>
                    setPassengers((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, title: value } : item)),
                    )
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mr", "Mrs", "Ms", "Dr", "Mx"].map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={passenger.name}
                  onChange={(event) =>
                    setPassengers((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Passenger full name"
                />
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPassengers((prev) => prev.filter((_, i) => i !== index))}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPassengers((prev) => [...prev, createPassenger()])}>
              <Plus className="mr-2 h-4 w-4" />
              Add Passenger
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-5 pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Lead Contact (Mobile)</Label>
              <Input
                maxLength={10}
                value={form.contact}
                onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.customerEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, customerEmail: event.target.value }))
                }
                placeholder="customer@example.com"
              />
            </div>
          </div>
        </Section>

        <Section title="Booking Details" icon={Plane}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>PNR / Booking Reference</Label>
              <Input
                value={form.bookingReference}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bookingReference: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. X7Y9ZQ"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seat Class</Label>
              <Input
                value={form.seatClass}
                onChange={(event) => setForm((prev) => ({ ...prev, seatClass: event.target.value }))}
                placeholder="Economy / Premium Economy"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Baggage Allowance</Label>
              <Input
                value={form.baggageAllowance}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, baggageAllowance: event.target.value }))
                }
                placeholder="15kg check-in + 7kg cabin"
              />
            </div>
          </div>
        </Section>

        <Section title="Flight Segments" icon={Plane}>
          <div className="space-y-5">
            {segments.map((segment, index) => (
              <div key={index} className="space-y-4 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Segment {index + 1}</h3>
                  {segments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSegments((prev) => prev.filter((_, i) => i !== index))}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Airline *</Label>
                    <Input
                      value={segment.airline}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, airline: event.target.value } : item)),
                        )
                      }
                      placeholder="IndiGo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Flight Number *</Label>
                    <Input
                      value={segment.flightNumber}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, flightNumber: event.target.value.toUpperCase() }
                              : item,
                          ),
                        )
                      }
                      placeholder="6E 6125"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Terminal</Label>
                    <Input
                      value={segment.terminal}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, terminal: event.target.value } : item)),
                        )
                      }
                      placeholder="T3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Origin *</Label>
                    <Input
                      value={segment.origin}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, origin: event.target.value } : item)),
                        )
                      }
                      placeholder="Delhi"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destination *</Label>
                    <Input
                      value={segment.destination}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, destination: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Srinagar"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Segment PNR / Booking Ref</Label>
                    <Input
                      value={segment.bookingReference}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, bookingReference: event.target.value.toUpperCase() }
                              : item,
                          ),
                        )
                      }
                      placeholder="Optional override"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Departure Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={segment.departureDateTime}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, departureDateTime: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Arrival Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={segment.arrivalDateTime}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, arrivalDateTime: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Seat Class</Label>
                    <Input
                      value={segment.seatClass}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, seatClass: event.target.value } : item)),
                        )
                      }
                      placeholder="Optional override"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label>Baggage Allowance</Label>
                    <Input
                      value={segment.baggageAllowance}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, baggageAllowance: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder="Optional override per segment"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label>Segment Notes</Label>
                    <Textarea
                      value={segment.notes}
                      onChange={(event) =>
                        setSegments((prev) =>
                          prev.map((item, i) => (i === index ? { ...item, notes: event.target.value } : item)),
                        )
                      }
                      placeholder="Check-in time, layover note, gate reminder, etc."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={() => setSegments((prev) => [...prev, createSegment()])}>
              <Plus className="mr-2 h-4 w-4" />
              Add Segment
            </Button>
          </div>
        </Section>

        <Section title="Important Notes" icon={Mail}>
          <div className="space-y-1.5">
            <Label>Customer Notes</Label>
            <Textarea
              value={form.importantNotes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, importantNotes: event.target.value }))
              }
              placeholder="Check-in timing, terminal guidance, layover advice, etc."
              rows={4}
            />
          </div>
        </Section>

        <div className="flex flex-wrap justify-end gap-3 pb-12 pt-4">
          <Button
            variant="outline"
            onClick={() =>
              isDialogMode ? onClose?.() : router.push("/agent-panel/vouchers")
            }
          >
            Cancel
          </Button>
          <Button variant="outline" onClick={() => withValidatedVoucher(generateFlightVoucherPDF)}>
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => withValidatedVoucher((voucher) => shareFlightVoucherWhatsApp(voucher))}>
            Share WhatsApp
          </Button>
          <Button variant="outline" onClick={() => withValidatedVoucher((voucher) => shareFlightVoucherEmail(voucher))}>
            Share Email
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-theme-primary px-10 font-medium text-white hover:bg-theme-dark"
          >
            {loading
              ? isEditMode
                ? "Updating Voucher..."
                : "Creating Voucher..."
              : isEditMode
                ? "Update Flight Voucher"
                : "Create Flight Voucher"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isDialogMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {isEditMode ? "Edit Flight Voucher" : "Create Flight Voucher"}
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
