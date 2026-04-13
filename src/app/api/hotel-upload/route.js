// app/api/hotel-upload/route.js
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// Column indices (0-based) — matches the 14-column spec exactly
const IDX = {
  STATE: 0,
  CITY: 1,
  HOTEL_NAME: 2,
  GOOGLE_RATING: 3,
  HOTEL_LINK: 4,
  STAR_RATING: 5,
  SEASON_NAME: 6,
  SEASON_START: 7,
  SEASON_END: 8,
  ROOM_CATEGORY: 9,
  EP: 10,
  CP: 11,
  MAP: 12,
  AP: 13,
};

function str(val) {
  if (val == null) return "";
  return String(val).trim();
}

function normalizeDate(val) {
  if (val == null) return "";
  const s = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime()))
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  // Handle Excel serial date numbers
  if (typeof val === "number" && val > 1000) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime()))
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return s;
}

function toNum(val) {
  if (val == null || val === "" || val === "-" || val === "N/A") return 0;
  // Strip currency symbols, commas, spaces
  const cleaned = String(val).replace(/[₹,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseRows(rawRows) {
  const hotels = [];
  let ctxState = "", ctxCity = "", ctxHotelName = "";
  let ctxGoogleRating = "", ctxHotelLink = "", ctxStarRating = "";

  for (const row of rawRows) {
    // row is an array because we use sheet_to_json with header:1
    const allVals = row.filter((v) => str(v) !== "");
    if (allVals.length === 0) continue;

    const hotelName = str(row[IDX.HOTEL_NAME]);
    const roomCategory = str(row[IDX.ROOM_CATEGORY]);

    // Update context whenever hotel name is present
    if (hotelName) {
      ctxState = str(row[IDX.STATE]);
      ctxCity = str(row[IDX.CITY]);
      ctxHotelName = hotelName;
      ctxGoogleRating = str(row[IDX.GOOGLE_RATING]);
      ctxHotelLink = str(row[IDX.HOTEL_LINK]);
      ctxStarRating = str(row[IDX.STAR_RATING]);
    }

    // Skip rows without a room category (blank separators, header, etc.)
    if (!ctxHotelName || !roomCategory) continue;

    const seasonName = str(row[IDX.SEASON_NAME]) || "Season 1";
    const seasonStart = normalizeDate(row[IDX.SEASON_START]);
    const seasonEnd = normalizeDate(row[IDX.SEASON_END]);

    const pricing = {
      ep: toNum(row[IDX.EP]),
      cp: toNum(row[IDX.CP]),
      map: toNum(row[IDX.MAP]),
      ap: toNum(row[IDX.AP]),
    };

    // Find or create hotel
    let hotel = hotels.find(
      (h) =>
        h.name.toLowerCase() === ctxHotelName.toLowerCase() &&
        h.state.toLowerCase() === ctxState.toLowerCase() &&
        h.city.toLowerCase() === ctxCity.toLowerCase()
    );
    if (!hotel) {
      hotel = {
        name: ctxHotelName,
        state: ctxState,
        city: ctxCity,
        googleRating: ctxGoogleRating,
        hotelLink: ctxHotelLink,
        starRating: ctxStarRating,
        rooms: [],
      };
      hotels.push(hotel);
    }

    // Find or create room
    let room = hotel.rooms.find(
      (r) => r.categoryName.toLowerCase() === roomCategory.toLowerCase()
    );
    if (!room) {
      room = { categoryName: roomCategory, seasons: [] };
      hotel.rooms.push(room);
    }

    // Find or create season — use seasonName+start+end as composite key
    // (same season name can repeat across room categories for the same hotel)
    let season = room.seasons.find(
      (s) =>
        s.name.toLowerCase() === seasonName.toLowerCase() &&
        s.start === seasonStart &&
        s.end === seasonEnd
    );
    if (!season) {
      season = { name: seasonName, start: seasonStart, end: seasonEnd, priority: null, pricing };
      room.seasons.push(season);
    } else {
      // Update pricing if the season already exists (shouldn't normally happen)
      season.pricing = pricing;
    }
  }

  return hotels;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const isValid =
      file.type.includes("spreadsheet") ||
      file.type.includes("excel") ||
      file.name.match(/\.(xlsx|xls)$/i);
    if (!isValid)
      return NextResponse.json({ error: "Invalid file type. Upload .xlsx or .xls" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    // raw: true preserves numbers as numbers (not strings), cellDates: true converts date serials
    const workbook = XLSX.read(buffer, { type: "buffer", raw: true, cellDates: false });

    const skipSheets = ["instructions", "plan_reference", "plan reference"];
    const dataSheetName = workbook.SheetNames.find(
      (n) => !skipSheets.includes(n.toLowerCase().trim())
    );
    if (!dataSheetName)
      return NextResponse.json({ error: "No valid data sheet found." }, { status: 400 });

    const sheet = workbook.Sheets[dataSheetName];

    // Use header:1 to get arrays indexed by column position — avoids header name matching issues
    const allRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });

    if (!allRows.length)
      return NextResponse.json({ error: "Data sheet is empty." }, { status: 400 });

    // Skip the header row (row 0) which contains column labels
    const dataRows = allRows.slice(1);

    const hotels = parseRows(dataRows);
    if (!hotels.length)
      return NextResponse.json(
        { error: "No hotel data extracted. Check the file format." },
        { status: 400 }
      );

    const summary = {
      totalHotels: hotels.length,
      totalRooms: hotels.reduce((a, h) => a + h.rooms.length, 0),
      totalSeasons: hotels.reduce(
        (a, h) => a + h.rooms.reduce((ra, r) => ra + r.seasons.length, 0),
        0
      ),
      states: [...new Set(hotels.map((h) => h.state).filter(Boolean))],
    };

    return NextResponse.json({ hotels, summary, sheetName: dataSheetName });
  } catch (err) {
    console.error("[hotel-upload] Error:", err);
    return NextResponse.json({ error: `Failed to process file: ${err.message}` }, { status: 500 });
  }
}