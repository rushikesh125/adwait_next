"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import { ArrowLeft, Hotel, CheckCircle2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

import { useQuotationState } from "@/app/hooks/useQuotationState";
import { getNextVoucherNumber, saveVoucherToFirestore } from "@/firebase/voucher";
import { updateQuotation } from "@/firebase/quotations";

/* ─── Hotel Selection Card ─────────────────────────────────────────────────── */
const HotelCard = ({ hotel, selected, onSelect }) => (
  <div
    onClick={() => onSelect(hotel)}
    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
      selected
        ? "border-blue-500 bg-blue-50 shadow-md"
        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
    }`}
  >
    {selected && (
      <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-blue-500" />
    )}
    <p className="font-semibold text-slate-800">{hotel.hotelName}</p>
    {hotel.city && <p className="text-sm text-slate-500 mt-0.5">{hotel.city}</p>}
    <div className="mt-2 flex gap-3 text-xs text-slate-500 flex-wrap">
      {hotel.checkIn && <span>Check-in: {hotel.checkIn}</span>}
      {hotel.checkOut && <span>Check-out: {hotel.checkOut}</span>}
      {hotel.nights && <span>{hotel.nights} nights</span>}
      {hotel.roomCategory && <span>{hotel.roomCategory}</span>}
      {hotel.mealPlan && <span>Meal: {hotel.mealPlan}</span>}
    </div>
  </div>
);

/* ─── Section Wrapper ──────────────────────────────────────────────────────── */
const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
      {title}
    </h2>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const CreateHotelVoucherPage = () => {
  const router = useRouter();
  const { quotations } = useQuotationState();

  const [voucherNo, setVoucherNo] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Quotation search ─────────────────────────────────────────────────── */
  const [quotationInput, setQuotationInput] = useState("");
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);
  const [linkedQuotation, setLinkedQuotation] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestRef = useRef(null);

  /* ── Multi-hotel selection ────────────────────────────────────────────── */
  const [availableHotels, setAvailableHotels] = useState([]);
  const [selectedHotelFromList, setSelectedHotelFromList] = useState(null);

  /* ── Hotel detail fields ─────────────────────────────────────────────── */
  const [hotelFields, setHotelFields] = useState({
    hotelName: "",
    checkIn: "",
    checkOut: "",
    nights: "",
    rooms: "",
    roomCategory: "",
    mealPlan: "",
  });

  /* ── Guest / contact form ─────────────────────────────────────────────── */
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

  /* ── Generate voucher number on mount ─────────────────────────────────── */
  useEffect(() => {
    getNextVoucherNumber("hotel").then(setVoucherNo);
  }, []);

  /* ── Close suggestions on outside click ──────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Quotation search autocomplete ───────────────────────────────────── */
  useEffect(() => {
    const trimmed = quotationInput.trim().toLowerCase();
    if (!trimmed || linkedQuotation) {
      setQuotationSuggestions([]);
      return;
    }
    const matches = (quotations || []).filter(
      (q) =>
        q.id?.toLowerCase().includes(trimmed) ||
        q.customerName?.toLowerCase().includes(trimmed)
    );
    setQuotationSuggestions(matches.slice(0, 6));
    setShowSuggestions(true);
  }, [quotationInput, quotations, linkedQuotation]);

  /* ── When a quotation is selected ────────────────────────────────────── */
  const handleSelectQuotation = (q) => {
    setLinkedQuotation(q);
    setQuotationInput(`${q.customerName}  —  #${q.id.substring(0, 8).toUpperCase()}`);
    setQuotationSuggestions([]);
    setShowSuggestions(false);

    // Build hotel list from quotation
    const rawHotels = q.hotelSummary || q.hotel_summary || [];
    const hotels = rawHotels.map((h) => ({
      hotelName: h.hotel || h.hotelName || "",
      city: h.city || "",
      checkIn: h.checkInDate || h.checkIn || "",
      checkOut: h.checkOutDate || h.checkOut || "",
      nights: h.nights || "",
      rooms: h.numDouble || "",
      roomCategory: h.selectedRoomCategory || "",
      mealPlan: h.selectedMealPlan || "",
    }));

    setAvailableHotels(hotels);
    setSelectedHotelFromList(null);

    if (hotels.length === 1) {
      // Auto-select the only hotel
      applyHotel(hotels[0]);
      setSelectedHotelFromList(hotels[0]);
    } else {
      // Clear hotel fields — user must pick one from the cards
      setHotelFields({
        hotelName: "", checkIn: "", checkOut: "",
        nights: "", rooms: "", roomCategory: "", mealPlan: "",
      });
    }

    // Auto-fill guest name & contact
    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: q.customerName || "" }],
      contact: q.customerMobile || prev.contact,
    }));
  };

  const applyHotel = (h) => {
    setHotelFields({
      hotelName: h.hotelName || "",
      checkIn: h.checkIn || "",
      checkOut: h.checkOut || "",
      nights: h.nights || "",
      rooms: h.rooms || "",
      roomCategory: h.roomCategory || "",
      mealPlan: h.mealPlan || "",
    });
  };

  const handleSelectHotelCard = (h) => {
    setSelectedHotelFromList(h);
    applyHotel(h);
  };

  const handleClearQuotation = () => {
    setLinkedQuotation(null);
    setQuotationInput("");
    setAvailableHotels([]);
    setSelectedHotelFromList(null);
    setHotelFields({ hotelName: "", checkIn: "", checkOut: "", nights: "", rooms: "", roomCategory: "", mealPlan: "" });
    setForm((prev) => ({ ...prev, guests: [{ title: "Mr", name: "" }], contact: "" }));
  };

  /* ── Guests ──────────────────────────────────────────────────────────── */
  const addGuest = () => {
    if (form.guests.length < 10)
      setForm({ ...form, guests: [...form.guests, { title: "Mr", name: "" }] });
  };
  const removeGuest = (i) =>
    setForm({ ...form, guests: form.guests.filter((_, idx) => idx !== i) });

  /* ── Validation ──────────────────────────────────────────────────────── */
  const validate = () => {
    if (!hotelFields.hotelName.trim()) {
      alert("Hotel name is required");
      return false;
    }
    if (!form.address.trim()) {
      alert("Hotel address is required");
      return false;
    }
    if (form.contact && !/^\d{10}$/.test(form.contact)) {
      alert("Enter a valid 10-digit mobile number");
      return false;
    }
    return true;
  };

  /* ── Save ────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!validate()) return;

    const auth = getAuth();
    const user = auth.currentUser;
    const agentId = user?.uid;
    if (!agentId) return alert("Not authenticated");

    setLoading(true);
    try {
      const data = {
        voucherNumber: voucherNo,
        voucherType: "Hotel",
        quotationId: linkedQuotation?.id || null,
        customerName:
          linkedQuotation?.customerName || form.guests[0]?.name || "",
        destination: linkedQuotation?.destination || "",

        hotelName: hotelFields.hotelName,
        checkIn: hotelFields.checkIn,
        checkOut: hotelFields.checkOut,
        nights: hotelFields.nights,
        rooms: hotelFields.rooms,
        roomCategory: hotelFields.roomCategory,
        meal: hotelFields.mealPlan,

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

      await saveVoucherToFirestore(agentId, linkedQuotation?.id || null, data);

      if (linkedQuotation?.id) {
        await updateQuotation(agentId, linkedQuotation.id, {
          voucherNumber: voucherNo,
          isVoucherGenerated: true,
          voucherType: "Hotel",
          issueDate: new Date().toISOString(),
        });
      }

      alert("Voucher created successfully ✅");
      router.push("/agent-panel/vouchers");
    } catch (err) {
      console.error(err);
      alert("Error saving voucher: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/agent-panel/vouchers")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-blue-500" />
            <h1 className="text-lg font-semibold text-slate-800">New Hotel Voucher</h1>
          </div>
        </div>
        <Badge className="bg-blue-100 text-blue-700 font-mono text-sm px-3 py-1">
          {voucherNo || "Generating..."}
        </Badge>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">

        {/* ── 1. Quotation Link ─────────────────────────────────────────── */}
        <Section title="Link to Quotation (Optional)">
          <div className="relative" ref={suggestRef}>
            <Label className="mb-1.5 block text-slate-600">
              Quotation ID / Customer Name
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by customer name or quotation ID…"
                  value={quotationInput}
                  disabled={!!linkedQuotation}
                  onChange={(e) => {
                    setQuotationInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => quotationSuggestions.length > 0 && setShowSuggestions(true)}
                />
              </div>
              {linkedQuotation && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearQuotation}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && quotationSuggestions.length > 0 && !linkedQuotation && (
              <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {quotationSuggestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 transition-colors"
                    onMouseDown={() => handleSelectQuotation(q)}
                  >
                    <div className="bg-blue-100 rounded-lg p-1.5 mt-0.5">
                      <Hotel className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{q.customerName}</p>
                      <p className="text-xs text-slate-400">
                        #{q.id.substring(0, 8).toUpperCase()}
                        {q.destination ? ` · ${q.destination}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {linkedQuotation && (
              <p className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Linked to #{linkedQuotation.id.substring(0, 8).toUpperCase()} — {linkedQuotation.customerName}
              </p>
            )}

            {!linkedQuotation && (
              <p className="mt-2 text-xs text-slate-400">
                Leave blank to create a standalone voucher with manual entry.
              </p>
            )}
          </div>
        </Section>

        {/* ── 2. Hotel selection cards (only if quotation has 2+ hotels) ── */}
        {linkedQuotation && availableHotels.length > 1 && (
          <Section title="Select Hotel">
            <p className="text-sm text-slate-500 -mt-1">
              This quotation has multiple hotels. Select one to create a voucher for.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              {availableHotels.map((h, i) => (
                <HotelCard
                  key={i}
                  hotel={h}
                  selected={selectedHotelFromList?.hotelName === h.hotelName && selectedHotelFromList?.checkIn === h.checkIn}
                  onSelect={handleSelectHotelCard}
                />
              ))}
            </div>
          </Section>
        )}

        {/* ── 3. Hotel Details ──────────────────────────────────────────── */}
        <Section title="Hotel Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Hotel Name *</Label>
              <Input
                value={hotelFields.hotelName}
                onChange={(e) => setHotelFields({ ...hotelFields, hotelName: e.target.value })}
                placeholder="e.g. Grand Hyatt Mumbai"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={hotelFields.checkIn}
                onChange={(e) => setHotelFields({ ...hotelFields, checkIn: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out Date</Label>
              <Input
                type="date"
                value={hotelFields.checkOut}
                onChange={(e) => setHotelFields({ ...hotelFields, checkOut: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nights</Label>
              <Input
                type="number"
                value={hotelFields.nights}
                onChange={(e) => setHotelFields({ ...hotelFields, nights: e.target.value })}
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rooms</Label>
              <Input
                type="number"
                value={hotelFields.rooms}
                onChange={(e) => setHotelFields({ ...hotelFields, rooms: e.target.value })}
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Room Category</Label>
              <Input
                value={hotelFields.roomCategory}
                onChange={(e) => setHotelFields({ ...hotelFields, roomCategory: e.target.value })}
                placeholder="e.g. Deluxe, Suite"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meal Plan</Label>
              <Select
                value={hotelFields.mealPlan}
                onValueChange={(v) => setHotelFields({ ...hotelFields, mealPlan: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meal plan" />
                </SelectTrigger>
                <SelectContent>
                  {["CP", "MAP", "AP", "EP", "AI"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* ── 4. Guest Details ─────────────────────────────────────────── */}
        <Section title="Guest Details">
          <div className="space-y-2">
            <Label>Guest Names</Label>
            {form.guests.map((g, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select
                  value={g.title}
                  onValueChange={(val) => {
                    const copy = [...form.guests];
                    copy[i].title = val;
                    setForm({ ...form, guests: copy });
                  }}
                >
                  <SelectTrigger className="w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Mr", "Mrs", "Ms", "Dr"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                  placeholder="Full name"
                />
                {i > 0 && (
                  <button
                    onClick={() => removeGuest(i)}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addGuest} className="mt-1">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Guest
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Lead Contact (Mobile)</Label>
            <Input
              maxLength={10}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="10-digit mobile number"
            />
          </div>
        </Section>

        {/* ── 5. Hotel Contact & Requests ───────────────────────────────── */}
        <Section title="Hotel Info & Requests">
          <div className="space-y-1.5">
            <Label>Hotel Address *</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full hotel address"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hotel Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Special Requests</Label>
            <Textarea
              value={form.requests}
              onChange={(e) => setForm({ ...form, requests: e.target.value })}
              placeholder="Any special requests for the hotel"
              rows={2}
            />
          </div>
        </Section>

        {/* ── 6. Payment ───────────────────────────────────────────────── */}
        <Section title="Payment">
          <RadioGroup
            value={form.paymentStatus}
            onValueChange={(v) => setForm({ ...form, paymentStatus: v })}
            className="space-y-2"
          >
            {[
              { value: "Amount paid to hotel", label: "Amount Paid" },
              { value: "Payment at hotel", label: "Pay at Hotel" },
              { value: "Complimentary", label: "Complimentary" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={opt.value} />
                <Label htmlFor={opt.value} className="font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {form.paymentStatus === "Amount paid to hotel" && (
            <Input
              className="mt-3"
              placeholder="Amount paid (₹)"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          )}
        </Section>

        {/* ── 7. Cancellation Policy ───────────────────────────────────── */}
        <Section title="Cancellation Policy">
          <Textarea
            value={form.cancellation}
            onChange={(e) => setForm({ ...form, cancellation: e.target.value })}
            placeholder="e.g. 15 days prior: full refund | 7–14 days: 50% | Under 7 days: no refund"
            rows={3}
          />
        </Section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2 pb-10">
          <Button
            variant="outline"
            onClick={() => router.push("/agent-panel/vouchers")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            {loading ? "Saving..." : "Create Voucher"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateHotelVoucherPage;