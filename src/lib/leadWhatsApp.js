export function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export function getValidWhatsAppPhone(phone = "") {
  const normalized = normalizePhone(phone);

  // Indian 10 digit number
  if (/^\d{10}$/.test(normalized)) {
    return `91${normalized}`;
  }

  // International number support
  if (/^\d{11,15}$/.test(normalized)) {
    return normalized;
  }

  return "";
}

export function buildLeadAcknowledgementMessage({
  leadName,
  destination,
}) {
  return [
    `Hello ${leadName || "Customer"},`,
    ``,
    `Thank you for contacting Adwait Tours.`,
    ``,
    `We have received your inquiry for ${
      destination || "your trip"
    } and our team will get back to you shortly with the details.`,
    ``,
    `Regards,`,
    `Adwait Tours`,
  ].join("\n");
}

export function buildLeadAcknowledgementWhatsAppUrl({
  phone,
  leadName,
  destination,
}) {
  const validPhone = getValidWhatsAppPhone(phone);

  const text = buildLeadAcknowledgementMessage({
    leadName,
    destination,
  });

  const encoded = encodeURIComponent(text);

  return validPhone
    ? `https://wa.me/${validPhone}?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;
}

export function openLeadAcknowledgementWhatsApp({
  phone,
  leadName,
  destination,
}) {
  const url = buildLeadAcknowledgementWhatsAppUrl({
    phone,
    leadName,
    destination,
  });

  window.open(url, "_blank");
}