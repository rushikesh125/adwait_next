const XLSX = require("xlsx");
const path = require("path");

const wb = XLSX.utils.book_new();

// ─── Instructions sheet ───────────────────────────────────────────────────────
const instructions = [
  ["HOTEL DATA UPLOAD TEMPLATE — Instructions"],
  [""],
  ["RULES"],
  ["1. Do NOT rename or delete this sheet. Upload only the 'Hotel Data' sheet (this sheet is skipped automatically)."],
  ["2. Column order must NOT change. All 26 columns (A–Z) are required."],
  ["3. Each ROW = one season for one room category of one hotel."],
  ["4. Fill columns A–F only on the FIRST row of each hotel. Leave them blank on subsequent rows — the parser remembers the last hotel."],
  ["5. A new Hotel Name in column C always starts a new hotel record."],
  ["6. Dates must be in DD/MM/YYYY format (e.g. 15/12/2025). Excel date cells also work."],
  ["7. Prices can include ₹ symbol and commas — they are stripped automatically. Blank = 0."],
  ["8. Season conflicts (overlapping dates in the same room category) will be flagged for review before saving."],
  [""],
  ["MEAL PLAN CODES"],
  ["EP  = European Plan      (Room only — no meals)"],
  ["CP  = Continental Plan   (Breakfast included)"],
  ["MAP = Modified American  (Breakfast + Dinner)"],
  ["AP  = American Plan      (All meals: Breakfast + Lunch + Dinner)"],
  [""],
  ["PRICING COLUMNS"],
  ["Double       = Price per room per night for one couple"],
  ["Extra Adult  = Price per additional adult sharing the room"],
  ["Extra Child  = Price per child sharing the room (with bed)"],
  ["CNB          = Child No Bed (0–4 yrs, no extra bed required)"],
  [""],
  ["STAR RATING VALUES"],
  ["Use exactly: 5-star / 4-star / 3-star / 2-star / 1-star"],
];
const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions["!cols"] = [{ wch: 90 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, "instructions");

// ─── Hotel Data sheet ─────────────────────────────────────────────────────────
const headerRow1 = [
  "State", "City", "Hotel Name", "Google Rating", "Hotel Link (Google Maps)", "Star Rating",
  "Season Name", "Season Start", "Season End", "Room Category",
  "EP\nDouble", "EP\nExtra Adult", "EP\nExtra Child", "EP\nCNB",
  "CP\nDouble", "CP\nExtra Adult", "CP\nExtra Child", "CP\nCNB",
  "MAP\nDouble", "MAP\nExtra Adult", "MAP\nExtra Child", "MAP\nCNB",
  "AP\nDouble", "AP\nExtra Adult", "AP\nExtra Child", "AP\nCNB",
];

// Sample data — 2 hotels, 2 room categories each, 2 seasons each
const dataRows = [
  // Hotel 1 — Row 1: first room category, first season
  ["Goa", "Panaji", "Hotel Sea Breeze", 4.5, "https://maps.google.com/?q=Hotel+Sea+Breeze+Panaji", "4-star",
   "Peak Season", "01/12/2025", "28/02/2026", "Deluxe Room",
   8000, 2500, 1500, 0,
   9500, 3000, 1800, 0,
   11000, 3500, 2000, 0,
   12500, 4000, 2200, 0],

  // Hotel 1 — Row 2: same room, second season (A–F blank)
  ["", "", "", "", "", "",
   "Off Season", "01/03/2026", "30/11/2026", "Deluxe Room",
   5500, 1800, 1000, 0,
   6500, 2200, 1200, 0,
   7500, 2600, 1400, 0,
   8500, 3000, 1600, 0],

  // Hotel 1 — Row 3: second room category, first season (A–F blank)
  ["", "", "", "", "", "",
   "Peak Season", "01/12/2025", "28/02/2026", "Suite",
   14000, 4000, 2500, 0,
   16000, 4500, 2800, 0,
   18000, 5000, 3000, 0,
   20000, 5500, 3200, 0],

  // Hotel 1 — Row 4: second room category, second season
  ["", "", "", "", "", "",
   "Off Season", "01/03/2026", "30/11/2026", "Suite",
   10000, 3000, 1800, 0,
   12000, 3500, 2000, 0,
   14000, 4000, 2200, 0,
   16000, 4500, 2400, 0],

  // Blank separator row
  ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],

  // Hotel 2 — Row 1
  ["Goa", "Calangute", "Sunset Beach Resort", 4.2, "https://maps.google.com/?q=Sunset+Beach+Resort+Calangute", "3-star",
   "Peak Season", "01/11/2025", "31/03/2026", "Standard Room",
   6000, 2000, 1200, 0,
   7000, 2400, 1400, 0,
   8000, 2800, 1600, 0,
   9000, 3200, 1800, 0],

  // Hotel 2 — Row 2
  ["", "", "", "", "", "",
   "Off Season", "01/04/2026", "31/10/2026", "Standard Room",
   4000, 1400, 800, 0,
   5000, 1800, 1000, 0,
   6000, 2200, 1200, 0,
   7000, 2600, 1400, 0],

  // Hotel 2 — Row 3
  ["", "", "", "", "", "",
   "Peak Season", "01/11/2025", "31/03/2026", "Sea View Room",
   9000, 2800, 1600, 0,
   10500, 3200, 1800, 0,
   12000, 3600, 2000, 0,
   13500, 4000, 2200, 0],

  // Hotel 2 — Row 4
  ["", "", "", "", "", "",
   "Off Season", "01/04/2026", "31/10/2026", "Sea View Room",
   6500, 2000, 1200, 0,
   7500, 2400, 1400, 0,
   8500, 2800, 1600, 0,
   9500, 3200, 1800, 0],
];

const wsData = XLSX.utils.aoa_to_sheet([headerRow1, ...dataRows]);

// Column widths
wsData["!cols"] = [
  { wch: 14 }, // A State
  { wch: 14 }, // B City
  { wch: 22 }, // C Hotel Name
  { wch: 10 }, // D Google Rating
  { wch: 35 }, // E Hotel Link
  { wch: 10 }, // F Star Rating
  { wch: 16 }, // G Season Name
  { wch: 13 }, // H Season Start
  { wch: 13 }, // I Season End
  { wch: 18 }, // J Room Category
  // Pricing columns (K–Z)
  ...Array(16).fill({ wch: 11 }),
];

// Style the header row (row 1 = index 0)
const range = XLSX.utils.decode_range(wsData["!ref"]);
for (let C = range.s.c; C <= range.e.c; C++) {
  const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
  if (!wsData[cellAddr]) continue;
  wsData[cellAddr].s = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E3A5F" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top:    { style: "thin", color: { rgb: "AAAAAA" } },
      bottom: { style: "thin", color: { rgb: "AAAAAA" } },
      left:   { style: "thin", color: { rgb: "AAAAAA" } },
      right:  { style: "thin", color: { rgb: "AAAAAA" } },
    },
  };
}

// Set row height for header
wsData["!rows"] = [{ hpt: 36 }];

XLSX.utils.book_append_sheet(wb, wsData, "Hotel Data");

// ─── Write file ───────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, "..", "public", "hotel-upload-template.xlsx");
XLSX.writeFile(wb, outPath, { bookType: "xlsx", cellStyles: true });
console.log("Template written to:", outPath);
