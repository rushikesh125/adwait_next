"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getAuth } from "firebase/auth";
import { useAgentPermissions } from "@/app/hooks/useAgentPermissions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuotationState } from "@/app/hooks/useQuotationState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  IndianRupee,
  Search,
  Hotel,
  Phone,
} from "lucide-react";
import {
  getNextVoucherNumber,
  saveVoucherToFirestore,
  updateVoucherDocument,
} from "@/firebase/voucher";
import { getQuotationById, updateQuotation } from "@/firebase/quotations";
import { generateHotelVoucherPDF } from "@/lib/generateHotelVoucher";
import { getLeadById } from "@/firebase/leadsService";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${date.getFullYear()}`;
}

export default function HotelVoucherDrawer({
  isOpen,
  onClose,
  hotelData,
  quotation,
  leadId,
  agentId,
  initialVoucher = null,
  onSaved,
}) {
  const { quotations } = useQuotationState();
  const isEditMode = Boolean(initialVoucher);

  const { user } = useSelector((state) => state.auth);
  const { hasPermission } = useAgentPermissions(user?.uid, user?.role);
  const canUseHotelAi = hasPermission("hotel_fetch_ai");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // 'success' | 'error' | null

  const [voucherNo, setVoucherNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quotationInput, setQuotationInput] = useState("");
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);
  const [linkedQuotation, setLinkedQuotation] = useState(null);
  const suggestionsRef = useRef(null);
  const [hotelFields, setHotelFields] = useState({
    hotelName: "",
    checkIn: "",
    checkOut: "",
    nights: "",
    rooms: "",
    roomCategory: "",
    mealPlan: "",
  });

  const [form, setForm] = useState({
    guests: [{ title: "Mr", name: "" }],
    contact: "",
    address: "",
    phone: "",
    requests: "",
    paymentStatus: "Payment at hotel",
    amount: "",
    cancellation: "",
    googleMapsLink: "",
  });

  const effectiveQuotation = linkedQuotation || quotation;
  const effectiveHotel = hotelData || hotelFields;
  const isDashboardFlow = !hotelData && !quotation && !initialVoucher;
  const [fetchedLeadMobile, setFetchedLeadMobile] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // If we already have a mobile from quotation, use it
    const existingMobile = quotation?.customerMobile || quotation?.leadMobile;
    if (existingMobile) {
      setFetchedLeadMobile("");
      return;
    }

    // Otherwise fetch from leadId (if provided)
    if (leadId && agentId) {
      const fetchLead = async () => {
        try {
          const leadData = await getLeadById(leadId);
          if (leadData?.mobile) {
            setFetchedLeadMobile(leadData.mobile);
            // Optionally auto-fill the form contact field
            setForm((prev) => ({ ...prev, contact: leadData.mobile }));
          }
        } catch (err) {
          console.error("Failed to fetch lead mobile:", err);
        }
      };
      fetchLead();
    }
  }, [
    isOpen,
    leadId,
    agentId,
    quotation?.customerMobile,
    quotation?.leadMobile,
  ]);
  useEffect(() => {
    if (!isOpen) return;

    if (initialVoucher?.voucherNumber) {
      setVoucherNo(initialVoucher.voucherNumber);
    } else {
      getNextVoucherNumber("hotel").then(setVoucherNo);
    }

    setQuotationInput("");
    setLinkedQuotation(null);
    setQuotationSuggestions([]);

    setHotelFields({
      hotelName: initialVoucher?.hotelName || hotelData?.hotelName || "",
      checkIn: initialVoucher?.checkIn || hotelData?.checkIn || "",
      checkOut: initialVoucher?.checkOut || hotelData?.checkOut || "",
      nights: initialVoucher?.nights || hotelData?.nights || "",
      rooms: initialVoucher?.rooms || hotelData?.rooms || "",
      roomCategory:
        initialVoucher?.roomCategory || hotelData?.roomCategory || "",
      mealPlan: initialVoucher?.meal || hotelData?.mealPlan || "",
    });

    const customerName =
      initialVoucher?.customerName ||
      quotation?.customerName ||
      quotation?.leadName ||
      "";

    setForm({
      guests:
        initialVoucher?.guests?.length > 0
          ? initialVoucher.guests
          : [{ title: "Mr", name: customerName }],
      contact:
        initialVoucher?.contact ||
        quotation?.customerMobile ||
        quotation?.leadMobile ||
        quotation?.mobile ||
        "",
      address: initialVoucher?.address || hotelData?.address || "",
      phone: initialVoucher?.phone || "",
      requests: initialVoucher?.requests || "",
      paymentStatus: initialVoucher?.paymentStatus || "Payment at hotel",
      amount: initialVoucher?.amount || "",
      cancellation: initialVoucher?.cancellation || "",
      googleMapsLink:
        initialVoucher?.googleMapsLink || hotelData?.googleMapsLink || "",
    });
  }, [hotelData, initialVoucher, isOpen, quotation]);

  const handleAiFetch = async () => {
    const name = hotelData?.hotelName || hotelFields.hotelName;
    if (!name) return;

    setAiLoading(true);
    setAiStatus(null);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setAiStatus("error");
        return;
      }

      const token = await currentUser.getIdToken();

      const res = await fetch("/api/ai/hotel-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hotelName: name }),
      });

      if (!res.ok) {
        console.error("API Error:", await res.json());
        setAiStatus("error");
        return;
      }

      const data = await res.json();

      console.log("AI RESPONSE:", data);

      if (data.address || data.phone || data.mapsLink) {
        setForm((prev) => ({
          ...prev,
          address: data.address || prev.address,
          phone: data.phone || prev.phone,
          googleMapsLink: data.mapsLink || prev.googleMapsLink,
        }));
        setAiStatus("success");
      } else {
        setAiStatus("error");
      }
    } catch (err) {
      console.error("AI Fetch Error:", err);
      setAiStatus("error");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!isDashboardFlow) return;
    const trimmed = quotationInput.trim().toLowerCase();
    if (!trimmed) {
      setQuotationSuggestions([]);
      return;
    }

    const matches = (quotations || []).filter(
      (q) =>
        q.id?.toLowerCase().includes(trimmed) ||
        q.customerName?.toLowerCase().includes(trimmed) ||
        q.voucherNumber?.toLowerCase().includes(trimmed),
    );
    setQuotationSuggestions(matches.slice(0, 6));
  }, [isDashboardFlow, quotationInput, quotations]);

  const handleSelectQuotation = (selectedQuotation) => {
    setLinkedQuotation(selectedQuotation);
    setQuotationInput(
      `${selectedQuotation.customerName} - ${selectedQuotation.id.substring(0, 8).toUpperCase()}`,
    );
    setQuotationSuggestions([]);

    const rawHotels =
      selectedQuotation.hotelSummary || selectedQuotation.hotel_summary || [];
    if (rawHotels.length > 0) {
      const firstHotel = rawHotels[0];
      setHotelFields({
        hotelName: firstHotel.hotel || firstHotel.hotelName || "",
        checkIn: firstHotel.checkInDate || firstHotel.checkIn || "",
        checkOut: firstHotel.checkOutDate || firstHotel.checkOut || "",
        nights: firstHotel.nights || "",
        rooms: firstHotel.numDouble || "",
        roomCategory: firstHotel.selectedRoomCategory || "",
        mealPlan: firstHotel.selectedMealPlan || "",
      });
    }

    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: selectedQuotation.customerName || "" }],
      contact: selectedQuotation.customerMobile || prev.contact,
    }));
  };

  const handleClearQuotation = () => {
    setLinkedQuotation(null);
    setQuotationInput("");
    setHotelFields({
      hotelName: "",
      checkIn: "",
      checkOut: "",
      nights: "",
      rooms: "",
      roomCategory: "",
      mealPlan: "",
    });
    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: "" }],
      contact: "",
    }));
  };

  const addGuest = () => {
    if (form.guests.length < 10) {
      setForm({
        ...form,
        guests: [...form.guests, { title: "Mr", name: "" }],
      });
    }
  };

  const removeGuest = (index) => {
    setForm({
      ...form,
      guests: form.guests.filter((_, guestIndex) => guestIndex !== index),
    });
  };

  const validate = () => {
    if (!effectiveHotel.hotelName && !hotelFields.hotelName) {
      alert("Hotel name is required");
      return false;
    }
    if (!form.address) {
      alert("Hotel address is required");
      return false;
    }
    if (form.contact && !/^\d{10}$/.test(form.contact)) {
      alert("Enter a valid 10-digit mobile number");
      return false;
    }
    return true;
  };

  const buildVoucherData = () => ({
    voucherNumber: voucherNo,
    voucherType: "Hotel",
    hotelName: hotelData?.hotelName || hotelFields.hotelName,
    checkIn: hotelData?.checkIn || hotelFields.checkIn,
    checkOut: hotelData?.checkOut || hotelFields.checkOut,
    nights: hotelData?.nights || hotelFields.nights,
    rooms: hotelData?.rooms || hotelFields.rooms,
    roomCategory: hotelData?.roomCategory || hotelFields.roomCategory,
    meal: hotelData?.mealPlan || hotelFields.mealPlan,
    guests: form.guests,
    contact: form.contact,
    address: form.address,
    phone: form.phone,
    googleMapsLink: form.googleMapsLink,
    requests: form.requests,
    paymentStatus: form.paymentStatus,
    amount: form.amount,
    cancellation: form.cancellation,
    customerName:
      form.guests[0]?.name ||
      initialVoucher?.customerName ||
      effectiveQuotation?.customerName ||
      effectiveQuotation?.leadName ||
      "",
    destination:
      initialVoucher?.destination || effectiveQuotation?.destination || "",
    quotationId: initialVoucher?.quotationId || effectiveQuotation?.id || null,
    issueDate: initialVoucher?.issueDate || new Date().toISOString(),
    status: initialVoucher?.status || "Generated",
  });

  const handleDownloadPDF = async () => {
    if (!validate()) return;
    await generateHotelVoucherPDF(buildVoucherData());
  };

  const handleSave = async () => {
    if (!validate()) return;

    const auth = getAuth();
    const user = auth.currentUser;
    const finalAgentId = agentId || user?.uid;
    if (!finalAgentId) {
      alert("Not authenticated");
      return;
    }

    const finalQuotation = effectiveQuotation;
    const finalHotel = hotelData
      ? {
          hotelName: hotelData.hotelName,
          checkIn: hotelData.checkIn,
          checkOut: hotelData.checkOut,
          nights: hotelData.nights,
          rooms: hotelData.rooms,
          roomCategory: hotelData.roomCategory,
          mealPlan: hotelData.mealPlan,
        }
      : hotelFields;

    setLoading(true);
    try {
      let linkedQuotationId =
        initialVoucher?.quotationId || finalQuotation?.id || null;
      if (!isEditMode && linkedQuotationId) {
        const existingQuotation = await getQuotationById(
          finalAgentId,
          linkedQuotationId,
        );

        if (!existingQuotation) {
          console.warn(
            "[HotelVoucher] Linked quotation not found; saving voucher as standalone:",
            linkedQuotationId,
          );
          linkedQuotationId = null;
        }
      }

      const voucherData = {
        ...buildVoucherData(),
        quotationId: linkedQuotationId,
        customerName:
          finalQuotation?.customerName ||
          initialVoucher?.customerName ||
          form.guests[0]?.name ||
          "",
        destination:
          initialVoucher?.destination || finalQuotation?.destination || "",
        hotelName: finalHotel.hotelName,
        checkIn: finalHotel.checkIn,
        checkOut: finalHotel.checkOut,
        nights: finalHotel.nights,
        rooms: finalHotel.rooms,
        roomCategory: finalHotel.roomCategory,
        meal: finalHotel.mealPlan,
      };

      if (isEditMode) {
        await updateVoucherDocument(finalAgentId, initialVoucher, voucherData);
      } else {
        await saveVoucherToFirestore(
          finalAgentId,
          linkedQuotationId,
          voucherData,
        );

        if (linkedQuotationId) {
          await updateQuotation(finalAgentId, linkedQuotationId, {
            voucherNumber: voucherNo,
            isVoucherGenerated: true,
            voucherType: "Hotel",
            issueDate: voucherData.issueDate,
          });
        }
      }

      onSaved?.();
      alert(
        isEditMode
          ? "Voucher updated successfully"
          : "Voucher saved successfully",
      );
      onClose();
    } catch (error) {
      console.error(error);
      alert(
        `Error ${isEditMode ? "updating" : "saving"} voucher: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!validate()) return;
    setPreviewOpen(true);
  };

  // --- Main Dialog (always rendered when isOpen = true) ---
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Hotel Voucher</DialogTitle>
              <Badge className="bg-blue-100 font-mono text-blue-600">
                {voucherNo || "Generating..."}
              </Badge>
            </div>
            {(hotelData?.hotelName || hotelFields.hotelName) && (
              <p className="text-sm text-gray-500">
                {hotelData?.hotelName || hotelFields.hotelName}
              </p>
            )}
          </DialogHeader>

          {/* Read‑only hotel summary when hotelData is provided (booking flow) */}
          {hotelData && (
            <div className="rounded-lg border bg-slate-50 p-3 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Hotel Details
              </p>
              <div className="flex flex-wrap gap-x-7 gap-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Hotel
                  </span>
                  <span className="font-semibold text-slate-800">
                    {hotelData.hotelName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Check-in
                  </span>
                  <span>{formatDate(hotelData.checkIn)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Check-out
                  </span>
                  <span>{formatDate(hotelData.checkOut)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nights
                  </span>
                  <span>{hotelData.nights || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Rooms
                  </span>
                  <span>{hotelData.rooms || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Room Category
                  </span>
                  <span>{hotelData.roomCategory || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Meal Plan
                  </span>
                  <span>{hotelData.mealPlan || "-"}</span>
                </div>
              </div>
              {quotation?.customerMobile ||
                (fetchedLeadMobile && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-600">
                      Lead Mobile:
                    </span>
                    <span className="text-slate-800">
                      {quotation?.customerMobile || fetchedLeadMobile}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Quotation linking (only for dashboard flow) */}
          {isDashboardFlow && (
            <div className="relative space-y-1.5">
              <Label>
                Link to Quotation{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type customer name or quotation ID..."
                  value={quotationInput}
                  onChange={(e) => {
                    setQuotationInput(e.target.value);
                    if (linkedQuotation) setLinkedQuotation(null);
                  }}
                  className="flex-1"
                />
                {linkedQuotation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearQuotation}
                    className="px-2 text-red-500"
                  >
                    X
                  </Button>
                )}
              </div>

              {quotationSuggestions.length > 0 && !linkedQuotation && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-white shadow-lg"
                >
                  {quotationSuggestions.map((q) => (
                    <div
                      key={q.id}
                      className="cursor-pointer border-b px-3 py-2.5 hover:bg-slate-50 last:border-b-0"
                      onClick={() => handleSelectQuotation(q)}
                    >
                      <p className="text-sm font-medium">{q.customerName}</p>
                      <p className="text-xs text-slate-400">
                        #{q.id.substring(0, 8).toUpperCase()}
                        {q.destination ? ` - ${q.destination}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {linkedQuotation && (
                <p className="text-xs font-medium text-green-600">
                  Linked to quotation #
                  {linkedQuotation.id.substring(0, 8).toUpperCase()}
                </p>
              )}
            </div>
          )}

          {/* Editable form fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Guest Names</Label>
              {form.guests.map((guest, index) => (
                <div key={index} className="mt-2 flex items-center gap-2">
                  <Select
                    value={guest.title}
                    onValueChange={(value) => {
                      const nextGuests = [...form.guests];
                      nextGuests[index].title = value;
                      setForm({ ...form, guests: nextGuests });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mr", "Mrs", "Ms", "Dr"].map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={guest.name}
                    onChange={(e) => {
                      const nextGuests = [...form.guests];
                      nextGuests[index].name = e.target.value;
                      setForm({ ...form, guests: nextGuests });
                    }}
                  />
                  {index > 0 && (
                    <Trash2
                      className="cursor-pointer text-red-500"
                      onClick={() => removeGuest(index)}
                    />
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addGuest} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Add Guest
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Lead Contact</Label>
              <Input
                maxLength={10}
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                Hotel Address *
                {canUseHotelAi && (
                  <button
                    type="button"
                    disabled={
                      aiLoading ||
                      !(hotelData?.hotelName || hotelFields.hotelName)
                    }
                    onClick={handleAiFetch}
                    className={`text-xs font-medium px-2 py-1 rounded border transition-all ${
                      aiStatus === "success"
                        ? "border-emerald-500 text-emerald-600 bg-emerald-50"
                        : aiStatus === "error"
                          ? "border-amber-500 text-amber-600 bg-amber-50"
                          : "border-theme-primary/30 text-theme-primary hover:bg-theme-muted"
                    } disabled:opacity-50`}
                  >
                    {aiLoading ? (
                      <span className="flex items-center gap-1">
                        <span className="h-3 w-3 border-2 border-theme-primary border-t-transparent animate-spin rounded-full inline-block" />
                        Searching...
                      </span>
                    ) : aiStatus === "success" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Fetched
                      </span>
                    ) : (
                      <span>✨ Fetch from AI</span>
                    )}
                  </button>
                )}
              </Label>
              {aiStatus === "error" && (
                <p className="text-[10px] text-amber-600">
                  ⚠️ Could not fetch details. Enter manually.
                </p>
              )}
              <Textarea
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value });
                  setAiStatus(null);
                }}
                placeholder="Full hotel address"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                Google Maps Link
                {form.googleMapsLink && (
                  <a
                    href={form.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-theme-primary flex items-center gap-1 hover:underline"
                  >
                    <Search className="h-3 w-3" /> Preview Location
                  </a>
                )}
              </Label>
              <div className="relative">
                <Input
                  value={form.googleMapsLink || ""}
                  onChange={(e) =>
                    setForm({ ...form, googleMapsLink: e.target.value })
                  }
                  placeholder="https://maps.app.goo.gl/..."
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Hotel className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hotel Phone Number</Label>
              <Input
                placeholder="Optional"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Special Requests</Label>
              <Textarea
                placeholder="Optional"
                value={form.requests}
                onChange={(e) => setForm({ ...form, requests: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment</Label>
              <RadioGroup
                value={form.paymentStatus}
                onValueChange={(value) =>
                  setForm({ ...form, paymentStatus: value, amount: "" })
                }
                className="mt-1 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Amount paid to hotel" id="paid" />
                  <Label htmlFor="paid" className="cursor-pointer font-normal">
                    Paid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Payment at hotel" id="pay-at-hotel" />
                  <Label
                    htmlFor="pay-at-hotel"
                    className="cursor-pointer font-normal"
                  >
                    Pay at Hotel
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Complimentary" id="comp" />
                  <Label htmlFor="comp" className="cursor-pointer font-normal">
                    Complimentary
                  </Label>
                </div>
              </RadioGroup>
              {form.paymentStatus === "Payment at hotel" && (
                <div className="mt-4 space-y-2">
                  <Label className="flex items-center gap-2 font-semibold text-amber-700">
                    <IndianRupee className="h-4 w-4" />
                    Amount to be paid at hotel (₹)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter balance amount due at hotel"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="border-amber-300 focus:ring-amber-400"
                  />
                  <p className="flex items-center gap-1.5 text-xs text-amber-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    This amount will be shown in the voucher so the customer
                    knows the balance due at check-in.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cancellation Policy</Label>
              <Textarea
                value={form.cancellation}
                placeholder="15 days prior: full refund | 7-14 days: 50% | Under 7 days: no refund"
                onChange={(e) =>
                  setForm({ ...form, cancellation: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handlePreview}>
              Preview
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Voucher"
                  : "Save Voucher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 rounded-lg border p-6 text-sm">
            <h2 className="mb-2 text-center text-xl font-bold text-blue-800">
              Hotel Booking Voucher
            </h2>
            <div className="grid grid-cols-2 gap-2 border-t pt-4">
              <p>
                <span className="font-semibold">Voucher No:</span> {voucherNo}
              </p>
              <p>
                <span className="font-semibold">Issue Date:</span>{" "}
                {formatDate(
                  initialVoucher?.issueDate || new Date().toISOString(),
                )}
              </p>
              <p className="col-span-2">
                <span className="font-semibold">Hotel:</span>{" "}
                {hotelData?.hotelName || hotelFields.hotelName || "-"}
              </p>
              <p>
                <span className="font-semibold">Check-in:</span>{" "}
                {formatDate(hotelData?.checkIn || hotelFields.checkIn)}
              </p>
              <p>
                <span className="font-semibold">Check-out:</span>{" "}
                {formatDate(hotelData?.checkOut || hotelFields.checkOut)}
              </p>
              <p>
                <span className="font-semibold">Nights:</span>{" "}
                {hotelData?.nights || hotelFields.nights || "-"}
              </p>
              <p>
                <span className="font-semibold">Rooms:</span>{" "}
                {hotelData?.rooms || hotelFields.rooms || "-"}
              </p>
              <p>
                <span className="font-semibold">Room Type:</span>{" "}
                {hotelData?.roomCategory || hotelFields.roomCategory || "-"}
              </p>
              <p>
                <span className="font-semibold">Meal Plan:</span>{" "}
                {hotelData?.mealPlan || hotelFields.mealPlan || "-"}
              </p>
            </div>

            <div className="space-y-1.5 border-t pt-3">
              <p>
                <span className="font-semibold">Guests:</span>{" "}
                {form.guests
                  .map((guest) => `${guest.title} ${guest.name}`.trim())
                  .filter((name) => name && !/^(Mr|Mrs|Ms|Dr)$/.test(name))
                  .join(", ") || "-"}
              </p>
              {form.contact && (
                <p>
                  <span className="font-semibold">Contact:</span> {form.contact}
                </p>
              )}
              {form.address && (
                <p>
                  <span className="font-semibold">Address:</span> {form.address}
                </p>
              )}
              {form.googleMapsLink && (
                <p>
                  <span className="font-semibold">Map Link:</span>{" "}
                  <a
                    href={form.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    View Location
                  </a>
                </p>
              )}
              {form.phone && (
                <p>
                  <span className="font-semibold">Hotel Phone:</span>{" "}
                  {form.phone}
                </p>
              )}
              <p>
                <span className="font-semibold">Payment:</span>{" "}
                {form.paymentStatus === "Payment at hotel" && form.amount
                  ? `Pay at Hotel — Amount due at check-in: ₹${Number(form.amount).toLocaleString("en-IN")}`
                  : form.paymentStatus === "Amount paid to hotel"
                    ? "Paid"
                    : form.paymentStatus}
              </p>
              {form.requests && (
                <p>
                  <span className="font-semibold">Special Requests:</span>{" "}
                  {form.requests}
                </p>
              )}
              {form.cancellation && (
                <p>
                  <span className="font-semibold">Cancellation Policy:</span>{" "}
                  {form.cancellation}
                </p>
              )}
            </div>

            {(effectiveQuotation?.id || initialVoucher?.quotationId) && (
              <div className="border-t pt-2 text-xs text-slate-400">
                Linked to quotation #
                {(effectiveQuotation?.id || initialVoucher?.quotationId)
                  .substring(0, 8)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Saving..."
                : isEditMode
                  ? "Update Voucher"
                  : "Save Voucher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
