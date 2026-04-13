// app/api/hotel-upload/route.js
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * COLUMN INDEX MAP (0-based) — 26-column template
 *
 * A(0)  State          G(6)  Season Name     K(10) EP–Double      O(14) CP–Double      S(18) MAP–Double     W(22) AP–Double
 * B(1)  City           H(7)  Season Start    L(11) EP–ExtraAdult  P(15) CP–ExtraAdult  T(19) MAP–ExtraAdult X(23) AP–ExtraAdult
 * C(2)  Hotel Name     I(8)  Season End      M(12) EP–ExtraChild  Q(16) CP–ExtraChild  U(20) MAP–ExtraChild Y(24) AP–ExtraChild
 * D(3)  Google Rating  J(9)  Room Category   N(13) EP–CNB         R(17) CP–CNB         V(21) MAP–CNB        Z(25) AP–CNB
 * E(4)  Hotel Link
 * F(5)  Star Rating
 */
const IDX = {
  STATE: 0, CITY: 1, HOTEL_NAME: 2, GOOGLE_RATING: 3, HOTEL_LINK: 4, STAR_RATING: 5,
  SEASON_NAME: 6, SEASON_START: 7, SEASON_END: 8, ROOM_CATEGORY: 9,
  EP_DBL: 10,  EP_EA: 11,  EP_EC: 12,  EP_CNB: 13,
  CP_DBL: 14,  CP_EA: 15,  CP_EC: 16,  CP_CNB: 17,
  MAP_DBL: 18, MAP_EA: 19, MAP_EC: 20, MAP_CNB: 21,
  AP_DBL: 22,  AP_EA: 23,  AP_EC: 24,  AP_CNB: 25,
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function s(val) {
  return val == null ? "" : String(val).trim();
}

function toNum(val) {
  if (val == null || val === "") return 0;
  const n = Number(String(val).replace(/[₹,\s]/g, "").trim());
  return isNaN(n) || n < 0 ? 0 : n;
}

function normalizeDate(val) {
  if (val == null) return "";
  const str = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  if (typeof val === "number" && val > 0) {
    try {
      const p = XLSX.SSF.parse_date_code(val);
      if (p) return `${pad(p.d)}/${pad(p.m)}/${p.y}`;
    } catch (_) {}
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return str;
}

// ─── parser ───────────────────────────────────────────────────────────────────
function parseRows(rows) {
  const hotels = [];
  let ctx = { state: "", city: "", hotelName: "", googleRating: "", hotelLink: "", starRating: "" };

  for (const row of rows) {
    if (!row || row.every((v) => v == null || s(v) === "")) continue;

    const hotelName    = s(row[IDX.HOTEL_NAME]);
    const roomCategory = s(row[IDX.ROOM_CATEGORY]);

    if (hotelName) {
      ctx = {
        state: s(row[IDX.STATE]), city: s(row[IDX.CITY]), hotelName,
        googleRating: s(row[IDX.GOOGLE_RATING]), hotelLink: s(row[IDX.HOTEL_LINK]),
        starRating: s(row[IDX.STAR_RATING]),
      };
    }

    if (!ctx.hotelName || !roomCategory) continue;

    const seasonName  = s(row[IDX.SEASON_NAME]) || "Season 1";
    const seasonStart = normalizeDate(row[IDX.SEASON_START]);
    const seasonEnd   = normalizeDate(row[IDX.SEASON_END]);

    // ── Pricing: per plan → { double, extraAdult, extraChild, cnb } ──────
    const pricing = {
      ep:  { double: toNum(row[IDX.EP_DBL]),  extraAdult: toNum(row[IDX.EP_EA]),  extraChild: toNum(row[IDX.EP_EC]),  cnb: toNum(row[IDX.EP_CNB])  },
      cp:  { double: toNum(row[IDX.CP_DBL]),  extraAdult: toNum(row[IDX.CP_EA]),  extraChild: toNum(row[IDX.CP_EC]),  cnb: toNum(row[IDX.CP_CNB])  },
      map: { double: toNum(row[IDX.MAP_DBL]), extraAdult: toNum(row[IDX.MAP_EA]), extraChild: toNum(row[IDX.MAP_EC]), cnb: toNum(row[IDX.MAP_CNB]) },
      ap:  { double: toNum(row[IDX.AP_DBL]),  extraAdult: toNum(row[IDX.AP_EA]),  extraChild: toNum(row[IDX.AP_EC]),  cnb: toNum(row[IDX.AP_CNB])  },
    };

    // Find / create hotel
    let hotel = hotels.find(
      (h) => h.name.toLowerCase() === ctx.hotelName.toLowerCase() &&
             h.city.toLowerCase() === ctx.city.toLowerCase() &&
             h.state.toLowerCase() === ctx.state.toLowerCase()
    );
    if (!hotel) {
      hotel = { name: ctx.hotelName, state: ctx.state, city: ctx.city,
                googleRating: ctx.googleRating, hotelLink: ctx.hotelLink,
                starRating: ctx.starRating, rooms: [] };
      hotels.push(hotel);
    }

    // Find / create room category
    let room = hotel.rooms.find((r) => r.categoryName.toLowerCase() === roomCategory.toLowerCase());
    if (!room) {
      room = { categoryName: roomCategory, seasons: [] };
      hotel.rooms.push(room);
    }

    // Find / create season (keyed by name + start + end)
    let season = room.seasons.find(
      (ss) => ss.name.toLowerCase() === seasonName.toLowerCase() &&
              ss.start === seasonStart && ss.end === seasonEnd
    );
    if (!season) {
      room.seasons.push({ name: seasonName, start: seasonStart, end: seasonEnd, priority: null, pricing });
    } else {
      season.pricing = pricing;
    }
  }

  return hotels;
}

// ─── route handler ────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const isValid = file.type.includes("spreadsheet") || file.type.includes("excel") || /\.(xlsx|xls)$/i.test(file.name);
    if (!isValid) return NextResponse.json({ error: "Invalid file type. Upload .xlsx or .xls" }, { status: 400 });

    const buffer   = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", raw: true, cellDates: false });

    const skipSheets = ["instructions", "plan_reference", "plan reference"];
    const sheetName  = workbook.SheetNames.find((n) => !skipSheets.includes(n.toLowerCase().trim()));
    if (!sheetName) return NextResponse.json({ error: "No valid data sheet found." }, { status: 400 });

    const sheet = workbook.Sheets[sheetName];

    // header:1 → column-index arrays; immune to header-name encoding issues (₹ symbol etc.)
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true, blankrows: false });
    if (!allRows.length) return NextResponse.json({ error: "Data sheet is empty." }, { status: 400 });

    // Auto-detect how many header rows to skip (looks for "state" in column 0)
    let dataStartIndex = 0;
    for (let i = 0; i < Math.min(5, allRows.length); i++) {
      if (s(allRows[i][0]).toLowerCase() === "state") {
        // Check if the row after is still a label row (no numbers in pricing cols)
        const nextRow = allRows[i + 1] || [];
        const nextHasNumbers = nextRow.slice(10).some((v) => typeof v === "number");
        dataStartIndex = nextHasNumbers ? i + 1 : i + 2;
        break;
      }
    }

    const hotels = parseRows(allRows.slice(dataStartIndex));
    if (!hotels.length) return NextResponse.json({ error: "No hotel data found. Check column layout." }, { status: 400 });

    const summary = {
      totalHotels:  hotels.length,
      totalRooms:   hotels.reduce((a, h) => a + h.rooms.length, 0),
      totalSeasons: hotels.reduce((a, h) => a + h.rooms.reduce((b, r) => b + r.seasons.length, 0), 0),
      states:       [...new Set(hotels.map((h) => h.state).filter(Boolean))],
    };

    return NextResponse.json({ hotels, summary, sheetName });
  } catch (err) {
    console.error("[hotel-upload] Error:", err);
    return NextResponse.json({ error: `Failed to process file: ${err.message}` }, { status: 500 });
  }
}