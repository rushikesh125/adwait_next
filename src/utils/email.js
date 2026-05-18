import emailjs from "@emailjs/browser";

export const sendLeadNotificationToAgent = async ({
  agent,
  form,
  cleanEmail,
  cleanMobile,
}) => {
  try {
    const SERVICE_ID = process.env.NEXT_PUBLIC_EMAIL_SERVICE_ID;
    const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAIL_TEMPLATE_ID;
    const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAIL_PUBLIC_KEY;

    // ✅ Safety checks
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      console.error("❌ Missing EmailJS environment variables");
      return;
    }
    console.log("ENV CHECK:", {
      SERVICE_ID,
      TEMPLATE_ID,
      PUBLIC_KEY,
    });

    if (!agent?.email) {
      console.error("❌ Agent email not found");
      return;
    }

    // ✅ Send email
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        // 🔑 MUST match EmailJS template variables
        to_email: agent.email,
        agent_name: agent.name || "Agent",

        customer_name: form.name?.trim(),
        customer_email: cleanEmail,
        customer_mobile: cleanMobile,

        destination: form.destination,
        departure_city: form.departureCity,
        travel_date: form.travelDate,

        adults: form.adults,
        children: form.children || "0",
        trip_type: form.tripType,
        days: form.days,

        notes: form.notes || "None",
      },
      PUBLIC_KEY,
    );

    console.log("✅ Lead email sent to agent:", agent.email);
  } catch {}
};
