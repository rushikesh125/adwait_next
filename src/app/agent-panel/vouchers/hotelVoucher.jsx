"use client";
import React, { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
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
import { Plus, Trash2, Download } from "lucide-react";
import {
  getNextVoucherNumber,
  saveVoucherToFirestore,
} from "@/firebase/voucher";
import { updateQuotation } from "@/firebase/quotations";

// ── Use the same PDF generator as the dashboard ──────────────────────────────
import {
  generateHotelVoucherPDF,
  shareHotelVoucherWhatsApp,
} from "@/lib/generateHotelVoucher";

// ─────────────────────────────────────────────────────────────────────────────

const HotelVoucherDrawer = ({
  isOpen,
  onClose,
  hotelData,
  quotation,
  agentId,
}) => {
  const { quotations } = useQuotationState();

  const [voucherNo, setVoucherNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Quotation search ──────────────────────────────────────────────────────
  const [quotationInput, setQuotationInput] = useState("");
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);
  const [linkedQuotation, setLinkedQuotation] = useState(null);
  const suggestionsRef = useRef(null);

  // ── Hotel fields ──────────────────────────────────────────────────────────
  const [hotelFields, setHotelFields] = useState({
    hotelName: "",
    checkIn: "",
    checkOut: "",
    nights: "",
    rooms: "",
    roomCategory: "",
    mealPlan: "",
  });

  // ── Guest / contact form ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    guests: [{ title: "Mr", name: "" }],
    contact: "",
    address: "",
    phone: "",
    requests: "",
    paymentStatus: "Payment at hotel",
    amount: "",
    cancellation: "",
  });

  const effectiveQuotation = linkedQuotation || quotation;
  const effectiveHotel = hotelData || hotelFields;
  const isDashboardFlow = !hotelData && !quotation;

  // ── On open ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    getNextVoucherNumber("hotel").then(setVoucherNo);

    setQuotationInput("");
    setLinkedQuotation(null);
    setQuotationSuggestions([]);

    setHotelFields({
      hotelName: hotelData?.hotelName || "",
      checkIn: hotelData?.checkIn || "",
      checkOut: hotelData?.checkOut || "",
      nights: hotelData?.nights || "",
      rooms: hotelData?.rooms || "",
      roomCategory: hotelData?.roomCategory || "",
      mealPlan: hotelData?.mealPlan || "",
    });

    const customerName = quotation?.customerName || quotation?.leadName || "";

    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: customerName }], // 👈 customer becomes guest
      contact: quotation?.customerMobile || quotation?.mobile || "",
      address: hotelData?.address || "",
    }));
  }, [isOpen, hotelData, quotation]);

  // ── Quotation search autocomplete ─────────────────────────────────────────
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
  }, [quotationInput, quotations, isDashboardFlow]);

  const handleSelectQuotation = (q) => {
    setLinkedQuotation(q);
    setQuotationInput(
      q.customerName + " — " + q.id.substring(0, 8).toUpperCase(),
    );
    setQuotationSuggestions([]);
    const rawHotels = q.hotelSummary || q.hotel_summary || [];
    if (rawHotels.length > 0) {
      const h = rawHotels[0];
      setHotelFields({
        hotelName: h.hotel || h.hotelName || "",
        checkIn: h.checkInDate || h.checkIn || "",
        checkOut: h.checkOutDate || h.checkOut || "",
        nights: h.nights || "",
        rooms: h.numDouble || "",
        roomCategory: h.selectedRoomCategory || "",
        mealPlan: h.selectedMealPlan || "",
      });
    }
    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: q.customerName || "" }],
      contact: q.customerMobile || prev.contact,
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
    if (form.guests.length < 10)
      setForm({ ...form, guests: [...form.guests, { title: "Mr", name: "" }] });
  };

  const removeGuest = (i) =>
    setForm({ ...form, guests: form.guests.filter((_, idx) => idx !== i) });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const validate = () => {
    if (!effectiveHotel.hotelName && !hotelFields.hotelName)
      return (alert("Hotel name is required"), false);
    if (!form.address) return (alert("Hotel address is required"), false);
    if (form.contact && !/^\d{10}$/.test(form.contact))
      return (alert("Enter a valid 10-digit mobile number"), false);
    return true;
  };

  // ── Build voucher data object (matches dashboard shape) ───────────────────
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
    requests: form.requests,
    paymentStatus: form.paymentStatus,
    amount: form.amount,
    cancellation: form.cancellation,
    customerName:
      form.guests[0]?.name ||
      effectiveQuotation?.customerName ||
      effectiveQuotation?.leadName ||
      "",
    destination: effectiveQuotation?.destination || "",
    quotationId: effectiveQuotation?.id || null,
    issueDate: new Date().toISOString(),
  });

  // ── Download PDF — uses same generator as dashboard ───────────────────────
  const handleDownloadPDF = async () => {
    if (!validate()) return;
    await generateHotelVoucherPDF(buildVoucherData());
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    const auth = getAuth();
    const user = auth.currentUser;
    const agentIdFinal = agentId || user?.uid;
    if (!agentIdFinal) return alert("Not authenticated");

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
      const data = {
        voucherNumber: voucherNo,
        voucherType: "Hotel",
        quotationId: finalQuotation?.id || null,
        customerName:
          finalQuotation?.customerName || form.guests[0]?.name || "",
        destination: finalQuotation?.destination || "",
        hotelName: finalHotel.hotelName,
        checkIn: finalHotel.checkIn,
        checkOut: finalHotel.checkOut,
        nights: finalHotel.nights,
        rooms: finalHotel.rooms,
        roomCategory: finalHotel.roomCategory,
        meal: finalHotel.mealPlan,
        guests: form.guests,
        contact: form.contact,
        address: form.address,
        phone: form.phone,
        requests: form.requests,
        paymentStatus: form.paymentStatus,
        amount: form.amount,
        cancellation: form.cancellation,
        issueDate: new Date().toISOString(),
      };

      await saveVoucherToFirestore(
        agentIdFinal,
        finalQuotation?.id || null,
        data,
      );

      if (finalQuotation?.id) {
        await updateQuotation(agentIdFinal, finalQuotation.id, {
          voucherNumber: voucherNo,
          isVoucherGenerated: true,
          voucherType: "Hotel",
          issueDate: new Date().toISOString(),
        });
      }

      alert("Voucher saved successfully ✅");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving voucher: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!validate()) return;
    setPreviewOpen(true);
  };

  // ── Hotel info row ────────────────────────────────────────────────────────
  const renderHotelInfoRow = () => {
    if (hotelData) {
      return (
        <div className="flex flex-wrap gap-x-7 gap-y-4 text-sm">
          <div>Check-in: {formatDate(hotelData.checkIn)}</div>
          <div>Check-out: {formatDate(hotelData.checkOut)}</div>
          <div>Nights: {hotelData.nights || "-"}</div>
          <div>Rooms: {hotelData.rooms || "-"}</div>
          <div>Room: {hotelData.roomCategory || "-"}</div>
          <div>Meal: {hotelData.mealPlan || "-"}</div>
        </div>
      );
    }
    return (
      <div className="space-y-3 p-3 bg-slate-50 rounded-lg border">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Hotel Details
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Hotel Name *</Label>
            <Input
              value={hotelFields.hotelName}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, hotelName: e.target.value })
              }
              placeholder="e.g. Grand Hyatt Mumbai"
            />
          </div>
          <div className="space-y-1">
            <Label>Check-in Date</Label>
            <Input
              type="date"
              value={hotelFields.checkIn}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, checkIn: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Check-out Date</Label>
            <Input
              type="date"
              value={hotelFields.checkOut}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, checkOut: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Nights</Label>
            <Input
              type="number"
              value={hotelFields.nights}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, nights: e.target.value })
              }
              placeholder="e.g. 3"
            />
          </div>
          <div className="space-y-1">
            <Label>Rooms</Label>
            <Input
              type="number"
              value={hotelFields.rooms}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, rooms: e.target.value })
              }
              placeholder="e.g. 2"
            />
          </div>
          <div className="space-y-1">
            <Label>Room Category</Label>
            <Input
              value={hotelFields.roomCategory}
              onChange={(e) =>
                setHotelFields({ ...hotelFields, roomCategory: e.target.value })
              }
              placeholder="e.g. Deluxe, Suite"
            />
          </div>
          <div className="space-y-1">
            <Label>Meal Plan</Label>
            <Select
              value={hotelFields.mealPlan}
              onValueChange={(v) =>
                setHotelFields({ ...hotelFields, mealPlan: v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meal plan" />
              </SelectTrigger>
              <SelectContent>
                {["CP", "MAP", "AP", "EP", "AI"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Hotel Voucher</DialogTitle>
              <Badge className="bg-blue-100 text-blue-600 font-mono">
                {voucherNo || "Generating..."}
              </Badge>
            </div>
            {(hotelData?.hotelName || hotelFields.hotelName) && (
              <p className="text-sm text-gray-500">
                {hotelData?.hotelName || hotelFields.hotelName}
              </p>
            )}
          </DialogHeader>

          {/* Quotation search (dashboard flow only) */}
          {isDashboardFlow && (
            <div className="space-y-1.5 relative">
              <Label>
                Link to Quotation{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type customer name or quotation ID…"
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
                    className="text-red-500 px-2"
                  >
                    ✕
                  </Button>
                )}
              </div>
              {quotationSuggestions.length > 0 && !linkedQuotation && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto"
                >
                  {quotationSuggestions.map((q) => (
                    <div
                      key={q.id}
                      className="px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectQuotation(q)}
                    >
                      <p className="font-medium text-sm">{q.customerName}</p>
                      <p className="text-xs text-slate-400">
                        #{q.id.substring(0, 8).toUpperCase()}
                        {q.destination ? ` · ${q.destination}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {linkedQuotation && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Linked to quotation #
                  {linkedQuotation.id.substring(0, 8).toUpperCase()}
                </p>
              )}
            </div>
          )}

          {renderHotelInfoRow()}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Guests */}
            <div className="space-y-1.5">
              <Label>Guest Names</Label>
              {form.guests.map((g, i) => (
                <div key={i} className="flex gap-2 mt-2 items-center">
                  <Select
                    value={g.title}
                    onValueChange={(val) => {
                      const copy = [...form.guests];
                      copy[i].title = val;
                      setForm({ ...form, guests: copy });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mr", "Mrs", "Ms", "Dr"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={g.name}
                    onChange={(e) => {
                      const copy = [...form.guests];
                      copy[i].name = e.target.value;
                      setForm({ ...form, guests: copy });
                    }}
                  />
                  {i > 0 && (
                    <Trash2
                      className="cursor-pointer text-red-500 flex-shrink-0"
                      onClick={() => removeGuest(i)}
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
              <Label>Hotel Address *</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full hotel address"
              />
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
                onValueChange={(v) => setForm({ ...form, paymentStatus: v })}
                className="mt-1 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Amount paid to hotel" id="paid" />
                  <Label htmlFor="paid" className="font-normal cursor-pointer">
                    Paid
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Payment at hotel" id="pay-at-hotel" />
                  <Label
                    htmlFor="pay-at-hotel"
                    className="font-normal cursor-pointer"
                  >
                    Pay at hotel
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="Complimentary" id="comp" />
                  <Label htmlFor="comp" className="font-normal cursor-pointer">
                    Complimentary
                  </Label>
                </div>
              </RadioGroup>
              {form.paymentStatus === "Amount paid to hotel" && (
                <Input
                  className="mt-2"
                  placeholder="Amount paid (₹)"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cancellation Policy</Label>
              <Textarea
                value={form.cancellation}
                placeholder="15 days prior: full refund | 7–14 days: 50% | Under 7 days: no refund"
                onChange={(e) =>
                  setForm({ ...form, cancellation: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handlePreview}>
              Preview
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Voucher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PREVIEW DIALOG ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Preview</DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg p-6 space-y-4 text-sm">
            <h2 className="text-center text-xl font-bold text-blue-800 mb-2">
              Hotel Booking Voucher
            </h2>
            <div className="border-t pt-4 grid grid-cols-2 gap-2">
              <p>
                <span className="font-semibold">Voucher No:</span> {voucherNo}
              </p>
              <p>
                <span className="font-semibold">Issue Date:</span>{" "}
                {new Date().toLocaleDateString("en-GB")}
              </p>
              <p className="col-span-2">
                <span className="font-semibold">Hotel:</span>{" "}
                {hotelData?.hotelName || hotelFields.hotelName || "—"}
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
                {hotelData?.nights || hotelFields.nights || "—"}
              </p>
              <p>
                <span className="font-semibold">Rooms:</span>{" "}
                {hotelData?.rooms || hotelFields.rooms || "—"}
              </p>
              <p>
                <span className="font-semibold">Room Type:</span>{" "}
                {hotelData?.roomCategory || hotelFields.roomCategory || "—"}
              </p>
              <p>
                <span className="font-semibold">Meal Plan:</span>{" "}
                {hotelData?.mealPlan || hotelFields.mealPlan || "—"}
              </p>
            </div>

            <div className="border-t pt-3 space-y-1.5">
              <p>
                <span className="font-semibold">Guests:</span>{" "}
                {form.guests
                  .map((g) => `${g.title} ${g.name}`)
                  .filter((s) => s.trim().replace(/^(Mr|Mrs|Ms|Dr)\s*$/, ""))
                  .join(", ") || "—"}
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
              {form.phone && (
                <p>
                  <span className="font-semibold">Hotel Phone:</span>{" "}
                  {form.phone}
                </p>
              )}
              <p>
                <span className="font-semibold">Payment:</span>{" "}
                {form.paymentStatus}
                {form.amount ? ` — ₹${form.amount}` : ""}
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

            {effectiveQuotation && (
              <div className="border-t pt-2 text-xs text-slate-400">
                Linked to quotation #
                {effectiveQuotation.id.substring(0, 8).toUpperCase()} —{" "}
                {effectiveQuotation.customerName}
              </div>
            )}
          </div>

          {/* ── Preview action buttons — Download PDF uses same generator as dashboard ── */}
          <div className="flex justify-end gap-3 mt-2">
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
              {loading ? "Saving..." : "Save Voucher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HotelVoucherDrawer;
