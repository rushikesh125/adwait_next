import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, MessageCircle, Pencil } from "lucide-react";
import {
  generateHotelVoucherPDF,
  shareHotelVoucherWhatsApp,
} from "@/lib/generateHotelVoucher";
import {
  generateFlightVoucherPDF,
  shareFlightVoucherWhatsApp,
} from "@/lib/generateFlightVoucher";

const fmt = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}-${d.getFullYear()}`;
};

const getVoucherContact = (voucher = {}) =>
  voucher.contact ||
  voucher.customerMobile ||
  voucher.mobile ||
  voucher.customerPhone ||
  "";

const VoucherViewModal = ({ voucher, onClose, onEdit }) => {
  if (!voucher) return null;

  const voucherWithContact = {
    ...voucher,
    contact: getVoucherContact(voucher),
  };

  const handleDownload = async () => {
    if (voucher.voucherType === "Hotel") {
      await generateHotelVoucherPDF(voucher);
    } else {
      await generateFlightVoucherPDF(voucher);
    }
  };

  const handleWhatsApp = () =>
    voucher.voucherType === "Hotel"
      ? shareHotelVoucherWhatsApp(voucherWithContact)
      : shareFlightVoucherWhatsApp(voucherWithContact);

  return (
    <Dialog open={!!voucher} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voucher Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 rounded-lg border p-6 text-sm">
          <h2 className="text-center text-xl font-bold text-blue-800">
            {voucher.voucherType === "Hotel" ? "Hotel" : "Flight"} Booking
            Voucher
          </h2>
          <div className="grid grid-cols-2 gap-2 border-t pt-4">
            <p>
              <span className="font-semibold">Voucher No:</span>{" "}
              {voucher.voucherNumber || "-"}
            </p>
            <p>
              <span className="font-semibold">Issue Date:</span>{" "}
              {voucher.issueDate ? fmt(voucher.issueDate) : "-"}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {voucher.status || "-"}
            </p>
            {voucher.isBookingVoucher && (voucher.bookingReference || voucher.bookingRef) && (
              <p>
                <span className="font-semibold">Booking No:</span>{" "}
                {voucher.bookingReference || voucher.bookingRef}
              </p>
            )}
            {voucher.quotationId && (
              <p className="text-xs text-slate-500">
                Quotation: #{voucher.quotationId.substring(0, 8).toUpperCase()}
              </p>
            )}
          </div>

          {voucher.voucherType === "Hotel" && (
            <div className="grid grid-cols-2 gap-2 border-t pt-3">
              <p className="col-span-2 text-base font-semibold">
                {voucher.hotelName || "-"}
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
                {voucher.nights || "-"}
              </p>
              <p>
                <span className="font-semibold">Rooms:</span>{" "}
                {voucher.rooms || "-"}
              </p>
              <p>
                <span className="font-semibold">Room Type:</span>{" "}
                {voucher.roomCategory || "-"}
              </p>
              <p>
                <span className="font-semibold">Meal Plan:</span>{" "}
                {voucher.meal || "-"}
              </p>
            </div>
          )}

          {voucher.voucherType === "Flight" && (
            <div className="space-y-3 border-t pt-3">
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
                      Segment {index + 1}: {segment.origin || "-"} {"->"}{" "}
                      {segment.destination || "-"}
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
                        PNR:{" "}
                        {segment.bookingReference ||
                          voucher.bookingReference ||
                          "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 border-t pt-3">
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
            {getVoucherContact(voucher) && (
              <p>
                <span className="font-semibold">Contact:</span>{" "}
                {getVoucherContact(voucher)}
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
                <a
                  href={`tel:${voucher.phone}`}
                  className="hover:text-theme-primary hover:underline"
                >
                  {voucher.phone}
                </a>
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
              {voucher.paymentStatus || "-"}
              {voucher.amount ? ` - Rs. ${voucher.amount}` : ""}
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDownload}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
         
            {getVoucherContact(voucher) && (
              <Button
                onClick={handleWhatsApp}
                variant="outline"
                className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
              >
                <MessageCircle className="h-4 w-4" />
                Whatsapp
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
