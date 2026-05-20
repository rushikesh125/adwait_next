import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle } from "lucide-react";
import { generateHotelVoucherPDF, generateFlightVoucherPDF } from "@/lib/voucherPDF";
import { shareHotelVoucherWhatsApp, shareFlightVoucherWhatsApp } from "@/lib/voucherWhatsApp";


/* ─── View Modal ─────────────────────────────────────────────────────────── */
const VoucherViewModal = ({ voucher, onClose }) => {
  if (!voucher) return null;

  const handleDownload = async () => {
    if (voucher.voucherType === "Hotel") await generateHotelVoucherPDF(voucher);
    else await generateFlightVoucherPDF(voucher);
  };

  const handleWhatsApp = () =>
    voucher.voucherType === "Hotel"
      ? shareHotelVoucherWhatsApp(voucher)
      : shareFlightVoucherWhatsApp(voucher);

  return (
    <Dialog open={!!voucher} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voucher Details</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg p-6 space-y-4 text-sm">
          <h2 className="text-center text-xl font-bold text-blue-800">
            {voucher.voucherType === "Hotel" ? "Hotel" : "Flight"} Booking
            Voucher
          </h2>
          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <p>
              <span className="font-semibold">Voucher No:</span>{" "}
              {voucher.voucherNumber || "—"}
            </p>
            <p>
              <span className="font-semibold">Issue Date:</span>{" "}
              {voucher.issueDate ? fmt(voucher.issueDate) : "—"}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {voucher.status || "—"}
            </p>
            {voucher.quotationId && (
              <p className="text-slate-500 text-xs">
                Quotation: #{voucher.quotationId.substring(0, 8).toUpperCase()}
              </p>
            )}
          </div>

          {voucher.voucherType === "Hotel" && (
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <p className="col-span-2 font-semibold text-base">
                {voucher.hotelName || "—"}
              </p>
              <p>
                <span className="font-semibold">Check-in:</span>{" "}
                {fmt(voucher.checkIn)} at 12:00 Noon
              </p>
              <p>
                <span className="font-semibold">Check-out:</span>{" "}
                {fmt(voucher.checkOut)} at 11:00 AM
              </p>
              <p>
                <span className="font-semibold">Nights:</span>{" "}
                {voucher.nights || "—"}
              </p>
              <p>
                <span className="font-semibold">{" "}</span>
                {voucher.rooms || "—"}
              </p>
              <p>
                <span className="font-semibold">Room Type:</span>{" "}
                {voucher.roomCategory || "—"}
              </p>
              <p>
                <span className="font-semibold">Meal Plan:</span>{" "}
                {voucher.meal || "—"}
              </p>
            </div>
          )}

          {voucher.voucherType === "Flight" && (
            <div className="border-t pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <p>
                  <span className="font-semibold">Booking Ref / PNR:</span>{" "}
                  {voucher.bookingReference || "-"}
                </p>
                <p>
                  <span className="font-semibold">Seat Class:</span>{" "}
                  {voucher.seatClass || "-"}
                </p>
                <p>
                  <span className="font-semibold">Baggage:</span>{" "}
                  {voucher.baggageAllowance || "-"}
                </p>
                <p>
                  <span className="font-semibold">Segments:</span>{" "}
                  {voucher.segments?.length || 0}
                </p>
              </div>
              <div className="space-y-3">
                {voucher.segments?.map((segment, index) => (
                  <div
                    key={`${segment.flightNumber || "-"}-${index}`}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="font-semibold text-slate-800">
                      Segment {index + 1}: {segment.origin || "-"} {"->"} {segment.destination || "-"}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <p>Airline: {segment.airline || "-"}</p>
                      <p>Flight: {segment.flightNumber || "-"}</p>
                      <p>
                        Departure:{" "}
                        {segment.departureDateTime
                          ? new Date(segment.departureDateTime).toLocaleString()
                          : "-"}
                      </p>
                      <p>
                        Arrival:{" "}
                        {segment.arrivalDateTime
                          ? new Date(segment.arrivalDateTime).toLocaleString()
                          : "-"}
                      </p>
                      <p>Terminal: {segment.terminal || "-"}</p>
                      <p>
                        PNR: {segment.bookingReference || voucher.bookingReference || "-"}
                      </p>
                    </div>
                    {segment.notes && (
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="font-semibold">Notes:</span> {segment.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-3 space-y-1.5">
            {(voucher.guests?.length > 0 || voucher.passengers?.length > 0) && (
              <p>
                <span className="font-semibold">
                  {voucher.voucherType === "Flight" ? "Passengers" : "Guests"}:
                </span>{" "}
                {(voucher.passengers || voucher.guests)
                  .map((g) => `${g.title || ""} ${g.name}`.trim())
                  .join(", ")}
              </p>
            )}
            {voucher.contact && (
              <p>
                <span className="font-semibold">Contact:</span>{" "}
                {voucher.contact}
              </p>
            )}
            {voucher.address && (
              <p>
                <span className="font-semibold">Hotel Address:</span>{" "}
                {voucher.address}
              </p>
            )}
            {voucher.phone && (
              <p>
                <span className="font-semibold">Hotel Phone:</span>{" "}
                <a href={`tel:${voucher.phone}`} className="hover:text-theme-primary hover:underline">{voucher.phone}</a>
              </p>
            )}
            {voucher.customerEmail && (
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {voucher.customerEmail}
              </p>
            )}
            <p>
              <span className="font-semibold">Payment:</span>{" "}
              {voucher.paymentStatus || "—"}
              {voucher.amount ? ` — ₹${voucher.amount}` : ""}
            </p>
            {voucher.requests && (
              <p>
                <span className="font-semibold">Special Requests:</span>{" "}
                {voucher.requests}
              </p>
            )}
            {voucher.cancellation && (
              <p>
                <span className="font-semibold">Cancellation Policy:</span>{" "}
                {voucher.cancellation}
              </p>
            )}
            {voucher.importantNotes && (
              <p>
                <span className="font-semibold">Important Notes:</span>{" "}
                {voucher.importantNotes}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center mt-3 gap-2 flex-wrap">
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {voucher.contact && (
              <Button
                onClick={handleWhatsApp}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50 gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default VoucherViewModal;