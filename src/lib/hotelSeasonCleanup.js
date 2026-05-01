import { adminDb } from "@/firebase/admin";

const DEFAULT_RETENTION_MONTHS = 2;
const MAX_BATCH_WRITES = 450;

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const buildUtcDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const normalizeDateToUtcDay = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  return buildUtcDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
};

export const parseHotelSeasonDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return normalizeDateToUtcDay(value);
  }

  if (typeof value?.toDate === "function") {
    return normalizeDateToUtcDay(value.toDate());
  }

  if (typeof value?.seconds === "number") {
    return normalizeDateToUtcDay(new Date(value.seconds * 1000));
  }

  const raw = String(value).trim();
  if (!raw) return null;

  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return buildUtcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    if (year.length === 3) year = `2${year}`;

    return buildUtcDate(Number(year), Number(match[2]), Number(match[1]));
  }

  return normalizeDateToUtcDay(new Date(raw));
};

export const addCalendarMonthsUtc = (date, months) => {
  const rawMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(rawMonth / 12);
  const targetMonth = ((rawMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), lastDayOfTargetMonth),
    ),
  );
};

const getSeasonEndDate = (season) =>
  parseHotelSeasonDate(season?.end ?? season?.endDate ?? season?.seasonEnd);

const getSeasonLabel = (season) =>
  season?.name || season?.seasonName || season?.label || "Unnamed season";

const createBatchQueue = () => {
  let batch = adminDb.batch();
  let writeCount = 0;

  const commit = async () => {
    if (writeCount === 0) return;

    await batch.commit();
    batch = adminDb.batch();
    writeCount = 0;
  };

  return {
    async queue(writeFn) {
      writeFn(batch);
      writeCount += 1;

      if (writeCount >= MAX_BATCH_WRITES) {
        await commit();
      }
    },
    commit,
  };
};

export const getHotelSeasonCleanupPlan = (
  hotel = {},
  { now = new Date(), retentionMonths = DEFAULT_RETENTION_MONTHS } = {},
) => {
  const nowDate = normalizeDateToUtcDay(now) || normalizeDateToUtcDay(new Date());
  const rooms = Array.isArray(hotel.rooms) ? hotel.rooms : [];

  let latestEndDate = null;
  let changed = false;
  let removedSeasonCount = 0;
  let invalidSeasonCount = 0;
  let totalSeasonCount = 0;
  let remainingSeasonCount = 0;
  const removedSeasons = [];

  const cleanedRooms = rooms.map((room) => {
    const seasons = Array.isArray(room?.seasons) ? room.seasons : [];
    const keptSeasons = [];

    seasons.forEach((season) => {
      totalSeasonCount += 1;

      const endDate = getSeasonEndDate(season);
      if (!endDate) {
        invalidSeasonCount += 1;
        keptSeasons.push(season);
        return;
      }

      if (!latestEndDate || endDate.getTime() > latestEndDate.getTime()) {
        latestEndDate = endDate;
      }

      const expiryDate = addCalendarMonthsUtc(endDate, retentionMonths);
      if (expiryDate.getTime() <= nowDate.getTime()) {
        changed = true;
        removedSeasonCount += 1;
        removedSeasons.push({
          roomCategory: room?.categoryName || "",
          name: getSeasonLabel(season),
          end: toIsoDate(endDate),
          expiresAt: toIsoDate(expiryDate),
        });
        return;
      }

      keptSeasons.push(season);
    });

    remainingSeasonCount += keptSeasons.length;

    return {
      ...room,
      seasons: keptSeasons,
    };
  });

  const latestExpiryDate = latestEndDate
    ? addCalendarMonthsUtc(latestEndDate, retentionMonths)
    : null;

  const shouldDeleteHotel = Boolean(
    latestExpiryDate &&
      latestExpiryDate.getTime() <= nowDate.getTime() &&
      remainingSeasonCount === 0,
  );

  return {
    rooms: cleanedRooms,
    shouldUpdateHotel: changed && !shouldDeleteHotel,
    shouldDeleteHotel,
    removedSeasonCount,
    invalidSeasonCount,
    totalSeasonCount,
    remainingSeasonCount,
    latestEndDate: latestEndDate ? toIsoDate(latestEndDate) : null,
    latestExpiryDate: latestExpiryDate ? toIsoDate(latestExpiryDate) : null,
    removedSeasons,
  };
};

async function removeDeletedHotelsFromLocations(deletedHotelIds, { dryRun }) {
  if (deletedHotelIds.length === 0) {
    return { updatedLocations: 0, removedLocationReferences: 0 };
  }

  const deletedIdSet = new Set(deletedHotelIds);
  const locationsSnap = await adminDb.collection("locations").get();
  const queue = createBatchQueue();

  let updatedLocations = 0;
  let removedLocationReferences = 0;

  for (const locationDoc of locationsSnap.docs) {
    const data = locationDoc.data() || {};
    if (!Array.isArray(data.cities)) continue;

    let locationChanged = false;
    const cities = data.cities.map((city) => {
      if (!Array.isArray(city?.hotelIds)) return city;

      const hotelIds = city.hotelIds.filter((id) => !deletedIdSet.has(id));
      const removedCount = city.hotelIds.length - hotelIds.length;
      if (removedCount === 0) return city;

      locationChanged = true;
      removedLocationReferences += removedCount;
      return { ...city, hotelIds };
    });

    if (!locationChanged) continue;

    updatedLocations += 1;
    if (!dryRun) {
      await queue.queue((batch) => {
        batch.update(locationDoc.ref, { cities });
      });
    }
  }

  if (!dryRun) {
    await queue.commit();
  }

  return { updatedLocations, removedLocationReferences };
}

export async function cleanupExpiredHotelSeasons({
  now = new Date(),
  retentionMonths = DEFAULT_RETENTION_MONTHS,
  dryRun = false,
} = {}) {
  const nowDate = normalizeDateToUtcDay(now) || normalizeDateToUtcDay(new Date());
  const runAt = nowDate.toISOString();
  const hotelsSnap = await adminDb.collection("hotels").get();
  const queue = createBatchQueue();

  const result = {
    dryRun,
    runAt,
    retentionMonths,
    scannedHotels: hotelsSnap.size,
    updatedHotels: 0,
    deletedHotels: 0,
    removedSeasons: 0,
    invalidSeasons: 0,
    deletedHotelIds: [],
    hotelActions: [],
    updatedLocations: 0,
    removedLocationReferences: 0,
  };

  for (const hotelDoc of hotelsSnap.docs) {
    const hotel = hotelDoc.data() || {};
    const plan = getHotelSeasonCleanupPlan(hotel, {
      now: nowDate,
      retentionMonths,
    });

    result.removedSeasons += plan.removedSeasonCount;
    result.invalidSeasons += plan.invalidSeasonCount;

    if (plan.shouldDeleteHotel) {
      result.deletedHotels += 1;
      result.deletedHotelIds.push(hotelDoc.id);
      result.hotelActions.push({
        id: hotelDoc.id,
        name: hotel.name || "",
        action: "delete-hotel",
        removedSeasonCount: plan.removedSeasonCount,
        latestEndDate: plan.latestEndDate,
        latestExpiryDate: plan.latestExpiryDate,
      });

      if (!dryRun) {
        await queue.queue((batch) => {
          batch.delete(hotelDoc.ref);
        });
      }

      continue;
    }

    if (plan.shouldUpdateHotel) {
      result.updatedHotels += 1;
      result.hotelActions.push({
        id: hotelDoc.id,
        name: hotel.name || "",
        action: "remove-expired-seasons",
        removedSeasonCount: plan.removedSeasonCount,
        latestEndDate: plan.latestEndDate,
        latestExpiryDate: plan.latestExpiryDate,
      });

      if (!dryRun) {
        await queue.queue((batch) => {
          batch.update(hotelDoc.ref, {
            rooms: plan.rooms,
            updatedAt: runAt,
            seasonCleanupAt: runAt,
          });
        });
      }
    }
  }

  if (!dryRun) {
    await queue.commit();
  }

  const locationCleanup = await removeDeletedHotelsFromLocations(
    result.deletedHotelIds,
    { dryRun },
  );

  return {
    ...result,
    ...locationCleanup,
  };
}
