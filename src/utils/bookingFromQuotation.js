export function buildBookingFromQuotation(quotation) {
  const hotels = quotation.hotelSummary || [];
  const transport = quotation.transportSummary;
  const activities = quotation.activitySummary || [];

  const services = [
    ...hotels.map((h) => ({
      type: "Hotel",
      description: [
        h.hotel,
        h.selectedRoomCategory,
        h.selectedMealPlan,
        h.nights ? `${h.nights} nights` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      supplier: h.hotel || "",
      confirmationRef: "",
      amount: h.hotelTotal || "",
      advance: "",
      status: "Pending",
    })),

    ...(transport?.vehicleName
      ? [
          {
            type: "Transfer",
            description: `${transport.vehicleName}${transport.ac ? " (AC)" : ""}`,
            supplier: "",
            confirmationRef: "",
            amount: transport.totalTransportCost || "",
            advance: "",
            status: "Pending",
          },
        ]
      : []),

    ...activities.map((a) => ({
      type: "Sightseeing",
      description: [a.name, a.city].filter(Boolean).join(" · "),
      supplier: "",
      confirmationRef: "",
      amount: a.totalPrice || "",
      advance: "",
      status: "Pending",
    })),
  ];

  return {
    customerName: quotation.customerName || quotation.leadName || "",
    destination: quotation.destination || "",
    startDate: hotels[0]?.checkInDate || "",
    endDate: hotels[hotels.length - 1]?.checkOutDate || "",
    adults: 1,
    children: 0,
    status: "Pending",
    totalAmount: quotation.grandTotal || "",
    notes: `Auto-created from quotation ${quotation.quoteNumber || ""}`,
    services,
    payments: [],
    quotationId: quotation.id,
  };
}