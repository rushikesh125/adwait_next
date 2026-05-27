export const RATE_MEAL_PLANS = ["EP", "CP", "MAP", "AP"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toUtcDay = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  if (typeof value?.toDate === "function") {
    return toUtcDay(value.toDate());
  }

  if (typeof value?.seconds === "number") {
    return toUtcDay(new Date(value.seconds * 1000));
  }

  const raw = String(value).trim();
  if (!raw) return null;

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
  }

  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    if (year.length === 3) year = `2${year}`;
    return new Date(Date.UTC(Number(year), Number(match[2]) - 1, Number(match[1])));
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
};

const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);

const getStayDates = ({ checkInDate, checkOutDate, nights }) => {
  const start = toUtcDay(checkInDate);
  if (!start) return [];

  const parsedNights = Number(nights);
  const end = checkOutDate
    ? toUtcDay(checkOutDate)
    : Number.isFinite(parsedNights) && parsedNights > 0
      ? addDays(start, parsedNights)
      : null;

  if (!end || end.getTime() <= start.getTime()) return [];

  const dates = [];
  for (let d = start; d.getTime() < end.getTime(); d = addDays(d, 1)) {
    dates.push(d);
  }

  return dates;
};

const hasPositiveRate = (pricing) =>
  Boolean(
    pricing &&
      ["double", "extraAdult", "extraChild", "cnb"].some(
        (key) => Number(pricing[key] || 0) > 0,
      ),
  );

const getApplicableSeason = (room, date) => {
  if (!Array.isArray(room?.seasons)) return null;

  const matches = room.seasons.filter((season) => {
    const start = toUtcDay(season?.start ?? season?.startDate);
    const end = toUtcDay(season?.end ?? season?.endDate);
    return start && end && date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  });

  if (!matches.length) return null;

  return matches.sort(
    (a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99),
  )[0];
};

export const getAvailableMealPlansForStay = (
  room,
  { checkInDate, checkOutDate, nights },
) => {
  const stayDates = getStayDates({ checkInDate, checkOutDate, nights });
  if (!stayDates.length) return [];

  return RATE_MEAL_PLANS.filter((plan) => {
    const planKey = plan.toLowerCase();
    return stayDates.every((date) => {
      const season = getApplicableSeason(room, date);
      return hasPositiveRate(season?.pricing?.[planKey]);
    });
  });
};

export const getAvailableRoomsForStay = (
  hotel,
  { checkInDate, checkOutDate, nights },
) => {
  if (!Array.isArray(hotel?.rooms)) return [];

  return hotel.rooms
    .map((room) => ({
      ...room,
      availableMealPlans: getAvailableMealPlansForStay(room, {
        checkInDate,
        checkOutDate,
        nights,
      }),
    }))
    .filter((room) => room.availableMealPlans.length > 0);
};

export const getFirstAvailableHotelRate = (
  hotel,
  { checkInDate, checkOutDate, nights },
) => {
  const rooms = getAvailableRoomsForStay(hotel, {
    checkInDate,
    checkOutDate,
    nights,
  });

  const room = rooms[0];
  if (!room) return null;

  return {
    roomCategory: room.categoryName || "",
    mealPlan: room.availableMealPlans[0] || "",
  };
};

export const hotelHasRatesForStay = (
  hotel,
  { checkInDate, checkOutDate, nights },
) =>
  Boolean(
    getFirstAvailableHotelRate(hotel, { checkInDate, checkOutDate, nights }),
  );

export const getAvailableHotelMealPlans = (hotelEntry, fullHotelData) => {
  const room = fullHotelData?.rooms?.find(
    (r) => r.categoryName === hotelEntry?.selectedRoomCategory,
  );
  if (!room) return [];

  return getAvailableMealPlansForStay(room, {
    checkInDate: hotelEntry?.checkInDate,
    checkOutDate: hotelEntry?.checkOutDate,
    nights: hotelEntry?.nights,
  });
};

export const calculateHotelStayPrice = (entry, fullHotelData) => {
  if (!entry || !fullHotelData) return 0;

  const room = fullHotelData.rooms?.find(
    (r) => r.categoryName === entry.selectedRoomCategory,
  );
  if (!room) return 0;

  const planKey = entry.selectedMealPlan?.toLowerCase();
  if (!planKey) return 0;

  const stayDates = getStayDates({
    checkInDate: entry.checkInDate,
    checkOutDate: entry.checkOutDate,
    nights: entry.nights,
  });
  if (!stayDates.length) return 0;

  let total = 0;
  for (const date of stayDates) {
    const season = getApplicableSeason(room, date);
    const pricing = season?.pricing?.[planKey];
    if (!hasPositiveRate(pricing)) return 0;

    total +=
      (Number(pricing.double || 0) * Number(entry.numDouble || 0)) +
      (Number(pricing.extraAdult || 0) * Number(entry.numExtraAdult || 0)) +
      (Number(pricing.extraChild || 0) * Number(entry.numExtraChild || 0)) +
      (Number(pricing.cnb || 0) * Number(entry.numCNB || 0));
  }

  return total;
};

// Like calculateHotelStayPrice but returns the per-bucket subtotals for the
// full stay. Used by the per-person breakdown to split a predefined hotel's
// total cost across guest buckets. Returns null if rates aren't available.
export const calculateHotelStayBucketSubtotals = (entry, fullHotelData) => {
  if (!entry || !fullHotelData) return null;

  const room = fullHotelData.rooms?.find(
    (r) => r.categoryName === entry.selectedRoomCategory,
  );
  if (!room) return null;

  const planKey = entry.selectedMealPlan?.toLowerCase();
  if (!planKey) return null;

  const stayDates = getStayDates({
    checkInDate: entry.checkInDate,
    checkOutDate: entry.checkOutDate,
    nights: entry.nights,
  });
  if (!stayDates.length) return null;

  const subtotals = { defaultAdult: 0, extraAdult: 0, extraChild: 0, cnb: 0 };
  for (const date of stayDates) {
    const season = getApplicableSeason(room, date);
    const pricing = season?.pricing?.[planKey];
    if (!hasPositiveRate(pricing)) return null;

    subtotals.defaultAdult +=
      Number(pricing.double || 0) * Number(entry.numDouble || 0);
    subtotals.extraAdult +=
      Number(pricing.extraAdult || 0) * Number(entry.numExtraAdult || 0);
    subtotals.extraChild +=
      Number(pricing.extraChild || 0) * Number(entry.numExtraChild || 0);
    subtotals.cnb += Number(pricing.cnb || 0) * Number(entry.numCNB || 0);
  }

  return subtotals;
};
