import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/firebase/config";
import { generateHotelBookingConfirmationMessage } from "@/lib/generateHotelBookingConfirmation";
import { orgFilter } from "@/firebase/orgScope";

const getCandidatePhones = (hotel = {}) => [
  hotel.phone,
  hotel.hotelPhone,
  hotel.contactPhone,
  hotel.mobile,
  hotel.whatsapp,
  hotel.whatsappNo,
];

export function formatWhatsappPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 10 ? `91${digits}` : digits;
}

export async function resolveHotelWhatsappPhone(rawHotel = {}, orgId = null) {
  const directPhone = getCandidatePhones(rawHotel)
    .map(formatWhatsappPhone)
    .find(Boolean);

  if (directPhone) return directPhone;

  const hotelName = rawHotel.hotelName || rawHotel.hotel || "";
  if (!hotelName) return "";

  try {
    const snap = await getDocs(
      query(
        collection(db, "hotels"),
        ...orgFilter(orgId),
        where("name", "==", hotelName),
        limit(10),
      ),
    );

    if (snap.empty) return "";

    const hotelCity = String(rawHotel.city || "").trim().toLowerCase();
    const matches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const matchedHotel =
      matches.find(
        (hotel) =>
          hotelCity &&
          String(hotel.city || "").trim().toLowerCase() === hotelCity,
      ) || matches[0];

    return (
      getCandidatePhones(matchedHotel)
        .map(formatWhatsappPhone)
        .find(Boolean) || ""
    );
  } catch (error) {
    console.error("[hotelBookingRequestWhatsapp] Failed to resolve hotel phone:", error);
    return "";
  }
}

export async function sendHotelBookingRequestOnWhatsApp(booking = {}, rawHotel = {}) {
  const message = generateHotelBookingConfirmationMessage(booking, rawHotel);
  const phone = await resolveHotelWhatsappPhone(rawHotel, booking.orgId || null);
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank", "noopener,noreferrer");

  return { phone };
}
