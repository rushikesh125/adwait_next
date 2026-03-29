"use client";
import React, { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

import { getNextVoucherNumber, saveVoucherToFirestore } from "@/firebase/voucher";
import { updateQuotation } from "@/firebase/quotations";

const HotelVoucherDrawer = ({ isOpen, onClose, hotelData, quotation, agentId }) => {

  const hotel = {
  hotelName: hotelData?.hotelName || "Hotel",
  checkIn: hotelData?.checkIn || "",
  checkOut: hotelData?.checkOut || "",
  nights: hotelData?.nights || "",
  rooms: hotelData?.rooms || "",
  roomCategory: hotelData?.roomCategory || "",
  mealPlan: hotelData?.mealPlan || "",
};
const {quotations} = useQuotationState();

  const [voucherNo, setVoucherNo] = useState("");
  const [loading, setLoading] = useState(false);
const [previewOpen, setPreviewOpen] = useState(false);
const [errors, setErrors] = useState({});

const [quotationInput, setQuotationInput] = useState("");
const [quotationSuggestions, setQuotationSuggestions] = useState([]);

const [form, setForm] = useState({
    guests: [{ title: "Mr", name: "" }],
    contact: "",
    address: "",
    phone: "",
    requests: "",
    paymentStatus: "Payment at hotel",
    amount: "",
    cancellation:"",
  });

  //  Generate voucher number
  useEffect(() => {
    if (isOpen) {
      getNextVoucherNumber("hotel").then((num) => {
        setVoucherNo(num);
      });

      setForm((prev) => ({
        ...prev,
        guests: [
          {
            title: "Mr",
            name: quotation?.customerName || "",
          },
        ],
        address: hotelData?.address || "",
        contact: quotation?.customerMobile || "", 
      }));
    }
      }, [isOpen, hotelData, quotation]); 
      
      
      // ---------------- Guests ----------------
  const addGuest = () => {
    if (form.guests.length < 10) {
      setForm({ ...form, guests: [...form.guests, { title: "Mr", name: "" }] });
    }
  };

  const removeGuest = (i) => {
    const updated = form.guests.filter((_, index) => index !== i);
    setForm({ ...form, guests: updated });
  };

  const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

  // ---------------- Validation ----------------
  const validate = () => {
    if (!form.address) return alert("Hotel address required");
    if (!/^\d{10}$/.test(form.contact))
      return alert("Enter valid 10 digit mobile number");
    return true;
  };
console.log("HOTEL DATA RECEIVED:", hotelData);
  const handleSave = async () => {
  if (!validate()) return;

  const auth = getAuth();
  const user = auth.currentUser;
  const agentIdFinal = agentId || user?.uid;
  if (!agentIdFinal || !quotation?.id) {
    alert("Missing agentId or quotationId");
    return;
  }

  setLoading(true);
  try {
   const data = {
  voucherNumber: voucherNo,
  voucherType: "Hotel",
  quotationId: quotation.id,
  customerName: quotation.customerName,
  destination: quotation.destination || "",

  hotelName: hotel.hotelName || hotel.name,

  checkIn: hotel.checkIn || hotel.checkInDate,
  checkOut: hotel.checkOut || hotel.checkOutDate,
  nights: hotel.nights,

  rooms: hotel.rooms || hotel.numberOfRooms,
  roomCategory: hotel.roomCategory || hotel.roomType,
  meal: hotel.mealPlan || hotel.meal,

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

    await saveVoucherToFirestore(agentIdFinal, quotation.id, data);

    await updateQuotation(agentIdFinal, quotation.id, {
      voucherNumber: voucherNo,
      isVoucherGenerated: true,
      voucherType: "Hotel",
      issueDate: new Date().toISOString(),
      
    });

    alert("Voucher saved successfully ✅");
    onClose();

  } catch (err) {
    console.error(err);
    alert("Error saving voucher");
  } finally {
    setLoading(false);
  }
};
const handlePreview = () => {
  if (!validate()) return;
  setPreviewOpen(true);
};
  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-10xl max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Hotel Voucher</DialogTitle>
            <Badge className="bg-blue-100 text-blue-600 font-mono">
              {voucherNo || "Generating..."}
            </Badge>
          </div>
           <p className="text-sm text-gray-500"> {hotel.hotelName} </p> </DialogHeader>

      <div className="flex flex-wrap gap-x-7 gap-y-4 text-sm">
         <div>Check-in: {formatDate(hotel.checkIn)}</div>
        <div >Check-out: {formatDate(hotel.checkOut)}</div>
          <div>Nights: {hotel.nights || "-"}</div>
          <div>Rooms: {hotel.rooms || "-"}</div>
          <div>Room: {hotel.roomCategory || "-"}</div>
          <div>Meal: {hotel.mealPlan || "-"}</div>
        </div>
        {/* SECTION B */}
        <div className="space-y-4">

          {/* Guests */}
          <div className="space-y-1.5">

            <Label>Guest Names</Label>
            {form.guests.map((g, i) => (
              <div key={i} className="flex gap-2 mt-2">
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
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                className="mt-1"
                  value={g.name}
                  onChange={(e) => {
                    const copy = [...form.guests];
                    copy[i].name = e.target.value;
                    setForm({ ...form, guests: copy });
                  }}
                />

                {i > 0 && (
                  <Trash2
                    className="cursor-pointer text-red-500"
                    onClick={() => removeGuest(i)}
                  />
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addGuest} className="mt-2">
              <Plus className="mr-2 h-4 w-4" /> Add Guest
            </Button>
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            <Label>Lead Contact</Label>
            <Input
            className="mt-1"
              maxLength={10}
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>
                    
          <div className="space-y-1.5">
            <Label>Hotel Address</Label>
            <Textarea className="mt-1"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
          <Label>Hotel Phone Number</Label>
          <Input
            placeholder="Optional"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div  className="space-y-1.5">
          <Label>Special Requests</Label>
          <Textarea
          className="mt-1"
            placeholder="Optional"
            value={form.requests}
            onChange={(e) => setForm({ ...form, requests: e.target.value })}
          />
          </div>

          <div className="space-y-1.5">
            <Label>Payment</Label>
            <RadioGroup
            className="mt-1"
              value={form.paymentStatus}
              onValueChange={(v) => setForm({ ...form, paymentStatus: v })}
            >
              <div>
                <RadioGroupItem value="Amount paid to hotel" /> Paid
              </div>
              <div>
                <RadioGroupItem value="Payment at hotel" /> Pay at hotel
              </div>
              <div>
                <RadioGroupItem value="Complimentary" /> Complimentary
              </div>
            </RadioGroup>

            {form.paymentStatus === "Amount paid to hotel" && (
              <Input
                placeholder="Amount"
                onChange={(e) =>
                  setForm({ ...form, amount: e.target.value })
                }
              />
            )}
          </div>

          <div>
            <Label className="mt-5">Cancellation Policy</Label>
            <Textarea 
              value={form.cancellation}
              placeholder="15 days prior: full refund | 7–14 days: 50% | Under 7 days: no refund)"
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
            Preview Voucher
          </Button>

          <Button onClick={handleSave}>
            Save
          </Button>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Generating..." : "Download PDF"}
          </Button>
            </div>
              </DialogContent>
     
    </Dialog>
    

<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent className="max-w-4xl">

    <DialogHeader>
      <DialogTitle>Voucher Preview</DialogTitle>
    </DialogHeader>

    <h2 className="text-center text-xl font-bold text-blue-800">
      Hotel Booking Voucher
    </h2>

    <div className="mt-4 space-y-2 text-sm">
      <p><b>Voucher:</b> {voucherNo}</p>
      <p><b>Hotel:</b> {hotel.hotelName}</p>
      <p><b>Guests:</b> {form.guests.map(g => g.name).join(", ")}</p>
      <p><b>Check-in:</b> {hotel.checkIn}</p>
      <p><b>Check-out:</b> {hotel.checkOut}</p>

    
    <p><b>Rooms:</b> {hotel.rooms}</p>
    <p><b>Room Type:</b> {hotel.roomCategory}</p>
    <p><b>Meal Plan:</b> {hotel.mealPlan}</p>
    <p><b>Payment:</b> {form.paymentStatus}</p>
     {form.contact && ( <p><b>Contact:</b> {form.contact}</p>)}
      {form.address && ( <p><b>Address:</b> {form.address}</p>)}
    {form.phone && (  <p><b>Hotel Phone:</b> {form.phone}</p>)}
    {form.requests && ( <p><b>Special Requests:</b> {form.requests}</p>)}
    { form.cancellation && (  <p><b>Cancellation Policy:</b> {form.cancellation}</p> )}
          
    </div>

    <div className="flex justify-end gap-3 mt-4">
      <Button onClick={() => setPreviewOpen(false)}>Close</Button>
      <Button onClick={handleSave}>Download PDF</Button>
    </div>

  </DialogContent>
</Dialog>
    </>
    
  )
};


export default HotelVoucherDrawer;