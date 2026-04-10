"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import {
  ArrowLeft,
  Hotel,
  CheckCircle2,
  Search,
  X,
  Plus,
  Trash2,
  IndianRupee,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useQuotationState } from "@/app/hooks/useQuotationState";
import {
  getNextVoucherNumber,
  saveVoucherToFirestore,
} from "@/firebase/voucher";
import { updateQuotation } from "@/firebase/quotations";

/* ─── Hotel Selection Card ─────────────────────────────────────────────────── */
const HotelCard = ({ hotel, selected, onSelect }) => (
  <div
    onClick={() => onSelect(hotel)}
    className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 group ${
      selected
        ? "border-theme-primary bg-theme-muted shadow-lg"
        : "border-slate-200 bg-white hover:border-theme-accent hover:shadow-md"
    }`}
  >
    {selected && (
      <CheckCircle2 className="absolute top-4 right-4 h-6 w-6 text-theme-primary" />
    )}
    <div className="flex items-start gap-3">
      <div className="mt-1">
        <Hotel className="h-5 w-5 text-theme-primary" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-lg">
          {hotel.hotelName}
        </p>
        {hotel.city && (
          <p className="text-sm text-slate-500 mt-0.5">{hotel.city}</p>
        )}

        <div className="mt-3 flex gap-4 text-xs text-slate-500 flex-wrap">
          {hotel.checkIn && (
            <span>
              Check-in: <span className="font-medium">{hotel.checkIn}</span>
            </span>
          )}
          {hotel.checkOut && (
            <span>
              Check-out: <span className="font-medium">{hotel.checkOut}</span>
            </span>
          )}
          {hotel.nights && <span>{hotel.nights} nights</span>}
          {hotel.roomCategory && <span>{hotel.roomCategory}</span>}
          {hotel.mealPlan && <span>Meal: {hotel.mealPlan}</span>}
        </div>
      </div>
    </div>
  </div>
);

/* ─── Section Wrapper ──────────────────────────────────────────────────────── */
const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="h-5 w-5 text-theme-primary" />}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
        {title}
      </h2>
    </div>
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
  const [hotelSearchResults, setHotelSearchResults] = useState([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const hotelSuggestRef = useRef(null);

  /* ── Guest / contact form ─────────────────────────────────────────────── */
  const [form, setForm] = useState({
    guests: [{ title: "Mr", name: "" }],
    contact: "",
    address: "",
    phone: "",
    requests: "",
    paymentStatus: "Payment at hotel",
    amount: "",
    showAmountInVoucher: true, // Default true for better UX
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

useEffect(() => {
  const handler = setTimeout(async () => {
    if (!hotelFields.hotelName || hotelFields.hotelName.length < 2) {
      setHotelSearchResults([]);
      setShowHotelSuggestions(false);
      return;
    }

    try {
      const { getDocs, collection } = await import("firebase/firestore");
      const { db } = await import("@/firebase/config");

      const searchTerm = hotelFields.hotelName.toLowerCase();
      const snap = await getDocs(collection(db, "hotels"));

      const matches = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        const hotelName = (data.name || "").toLowerCase();
        if (hotelName.includes(searchTerm)) {
          matches.push({
            name: data.name || "",
            city: data.city || "",
            state: data.state || "",
            address: data.address || "",   
            phone: data.phone || "",      
          });
        }
      });

      setHotelSearchResults(matches.slice(0, 8));
      setShowHotelSuggestions(matches.length > 0);
    } catch (err) {
      console.error("Hotel DB search error:", err);
    }
  }, 300);

  return () => clearTimeout(handler);
}, [hotelFields.hotelName]);

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
        q.customerName?.toLowerCase().includes(trimmed),
    );
    setQuotationSuggestions(matches.slice(0, 6));
    setShowSuggestions(true);
  }, [quotationInput, quotations, linkedQuotation]);
  useEffect(() => {
    const handler = (e) => {
      if (
        hotelSuggestRef.current &&
        !hotelSuggestRef.current.contains(e.target)
      ) {
        setShowHotelSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  /* ── When a quotation is selected ────────────────────────────────────── */
  const handleSelectQuotation = (q) => {
    setLinkedQuotation(q);
    setQuotationInput(
      `${q.customerName}  —  #${q.id.substring(0, 8).toUpperCase()}`,
    );
    setQuotationSuggestions([]);
    setShowSuggestions(false);

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
      applyHotel(hotels[0]);
      setSelectedHotelFromList(hotels[0]);
    } else {
      setHotelFields({
        hotelName: "",
        checkIn: "",
        checkOut: "",
        nights: "",
        rooms: "",
        roomCategory: "",
        mealPlan: "",
      });
    }

    setForm((prev) => ({
      ...prev,
      guests: [{ title: "Mr", name: q.customerName || "" }],
      contact: q.customerMobile || prev.contact,
    }));
  };
const handleSelectHotelSuggestion = (hotel) => {
  setHotelFields((prev) => ({
    ...prev,
    hotelName: hotel.name,
  }));

  setShowHotelSuggestions(false);


  setForm((prev) => ({
    ...prev,
    address: hotel.address || "", 
    phone: hotel.phone || prev.phone,
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
        showAmountInVoucher: form.showAmountInVoucher, // Only meaningful for "Amount paid to hotel"
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
      {/* Top bar */}
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
            <Hotel className="h-5 w-5 text-theme-primary" />
            <h1 className="text-lg font-semibold text-slate-800">
              New Hotel Voucher
            </h1>
          </div>
        </div>
        <Badge className="bg-theme-muted text-theme-primary font-mono text-sm px-4 py-1 border border-theme-accent/30">
          {voucherNo || "Generating..."}
        </Badge>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        {/* 1. Quotation Link */}
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
                  onFocus={() =>
                    quotationSuggestions.length > 0 && setShowSuggestions(true)
                  }
                />
              </div>
              {linkedQuotation && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearQuotation}
                  className="text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {showSuggestions &&
              quotationSuggestions.length > 0 &&
              !linkedQuotation && (
                <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  {quotationSuggestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 transition-colors"
                      onMouseDown={() => handleSelectQuotation(q)}
                    >
                      <div className="bg-theme-muted rounded-xl p-2 mt-0.5">
                        <Hotel className="h-4 w-4 text-theme-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {q.customerName}
                        </p>
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
              <p className="mt-3 text-sm text-emerald-600 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Linked to #{linkedQuotation.id
                  .substring(0, 8)
                  .toUpperCase()} — {linkedQuotation.customerName}
              </p>
            )}
          </div>
        </Section>

        {/* 2. Hotel Selection */}
        {linkedQuotation && availableHotels.length > 1 && (
          <Section title="Select Hotel" icon={Hotel}>
            <p className="text-sm text-slate-500 -mt-2">
              This quotation contains multiple hotels. Choose one for this
              voucher.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {availableHotels.map((h, i) => (
                <HotelCard
                  key={i}
                  hotel={h}
                  selected={
                    selectedHotelFromList?.hotelName === h.hotelName &&
                    selectedHotelFromList?.checkIn === h.checkIn
                  }
                  onSelect={handleSelectHotelCard}
                />
              ))}
            </div>
          </Section>
        )}

        {/* 3. Hotel Details */}
        <Section title="Hotel Details" icon={Hotel}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div
              className="sm:col-span-2 space-y-1.5 relative"
              ref={hotelSuggestRef}
            >
              <Label>
                Hotel Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={hotelFields.hotelName}
                onChange={(e) =>
                  setHotelFields({ ...hotelFields, hotelName: e.target.value })
                }
                placeholder="Search hotel (e.g. Taj Mumbai)"
                className="text-base"
                onFocus={() =>
                  hotelSearchResults.length > 0 && setShowHotelSuggestions(true)
                }
              />
            
            
            {  showHotelSuggestions && hotelSearchResults.length > 0 && (
              <div className="absolute z-50 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto">
                {hotelSearchResults.map((h, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 flex items-start gap-3"
                    onMouseDown={() => handleSelectHotelSuggestion(h)}
                  >
                    <div className="bg-theme-muted rounded-xl p-1.5 mt-0.5">
                      <Hotel className="h-3.5 w-3.5 text-theme-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{h.name}</p>
                      {(h.city || h.state) && (
                        <p className="text-xs text-slate-400">
                          {[h.city, h.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            <div className="space-y-1.5">
              <Label>Check-in Date</Label>
              <Input
                type="date"
                value={hotelFields.checkIn}
                onChange={(e) =>
                  setHotelFields({ ...hotelFields, checkIn: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out Date</Label>
              <Input
                type="date"
                value={hotelFields.checkOut}
                onChange={(e) =>
                  setHotelFields({ ...hotelFields, checkOut: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nights</Label>
              <Input
                type="number"
                value={hotelFields.nights}
                onChange={(e) =>
                  setHotelFields({ ...hotelFields, nights: e.target.value })
                }
                placeholder="3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rooms</Label>
              <Input
                type="number"
                value={hotelFields.rooms}
                onChange={(e) =>
                  setHotelFields({ ...hotelFields, rooms: e.target.value })
                }
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Room Category</Label>
              <Input
                value={hotelFields.roomCategory}
                onChange={(e) =>
                  setHotelFields({
                    ...hotelFields,
                    roomCategory: e.target.value,
                  })
                }
                placeholder="Deluxe / Suite"
              />
            </div>
            <div className="space-y-1.5">
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
        </Section>

        {/* 4. Guest Details */}
        <Section title="Guest Details">
          <div className="space-y-3">
            <Label>Guest Names</Label>
            {form.guests.map((g, i) => (
              <div key={i} className="flex gap-3 items-center">
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
                  placeholder="Full name"
                />
                {i > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGuest(i)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addGuest}>
              <Plus className="mr-2 h-4 w-4" /> Add Guest
            </Button>
          </div>

          <div className="space-y-1.5 pt-4">
            <Label>Lead Contact (Mobile)</Label>
            <Input
              maxLength={10}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="10-digit mobile number"
            />
          </div>
        </Section>

        {/* 5. Hotel Info & Requests */}
        <Section title="Hotel Info & Requests">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>
                Hotel Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Full hotel address with pin code"
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
              <Label>Special Requests / Remarks</Label>
              <Textarea
                value={form.requests}
                onChange={(e) => setForm({ ...form, requests: e.target.value })}
                placeholder="Any special requests for the hotel"
                rows={2}
              />
            </div>
          </div>
        </Section>

        {/* 6. Payment Section - Updated Logic */}
        <Section title="Payment Details" icon={IndianRupee}>
          <RadioGroup
            value={form.paymentStatus}
            onValueChange={(v) => setForm({ ...form, paymentStatus: v })}
            className="space-y-4"
          >
            {[
              { value: "Amount paid to hotel", label: "Amount Paid to Hotel" },
              { value: "Payment at hotel", label: "Pay at Hotel" },
              { value: "Complimentary", label: "Complimentary" },
            ].map((opt) => (
              <div key={opt.value} className="flex items-center gap-3">
                <RadioGroupItem value={opt.value} id={opt.value} />
                <Label
                  htmlFor={opt.value}
                  className="font-medium cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Amount Input - Shown for Paid & Pay at Hotel */}
          {(form.paymentStatus === "Amount paid to hotel" ||
            form.paymentStatus === "Payment at hotel") && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Amount (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              {/* Checkbox ONLY for "Amount Paid to Hotel" */}
              {form.paymentStatus === "Amount paid to hotel" && (
                <div className="flex items-center gap-3 pt-2">
                  <Checkbox
                    id="showAmount"
                    checked={form.showAmountInVoucher}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, showAmountInVoucher: !!checked })
                    }
                  />
                  <Label
                    htmlFor="showAmount"
                    className="cursor-pointer text-sm flex items-center gap-2"
                  >
                    {form.showAmountInVoucher ? (
                      <Eye className="h-4 w-4 text-theme-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    )}
                    Show this amount in Voucher / PDF
                  </Label>
                </div>
              )}

              {/* Info text for Pay at Hotel */}
              {form.paymentStatus === "Payment at hotel" && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Amount will always be visible in the voucher
                </p>
              )}
            </div>
          )}
        </Section>

        {/* 7. Cancellation Policy */}
        <Section title="Cancellation Policy">
          <Textarea
            value={form.cancellation}
            onChange={(e) => setForm({ ...form, cancellation: e.target.value })}
            placeholder="e.g. 15 days prior: full refund | 7–14 days: 50% | Under 7 days: no refund"
            rows={4}
          />
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 pb-12">
          <Button
            variant="outline"
            onClick={() => router.push("/agent-panel/vouchers")}
            className="px-8"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-theme-primary hover:bg-theme-dark text-white px-10 font-medium"
          >
            {loading ? "Creating Voucher..." : "Create Hotel Voucher"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateHotelVoucherPage;
