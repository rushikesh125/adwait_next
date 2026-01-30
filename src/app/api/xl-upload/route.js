import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const selectedState = formData.get("state");

    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const hotelsMap = new Map();
    let currentHotel = null;
    let currentRoom = null;

    // We start from index 3 as per your file structure
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const cityName = row[1]?.toString().trim();
      const hotelName = row[2]?.toString().trim();
      const categoryName = row[6]?.toString().trim();

      // 1. Check if this is a NEW Hotel row
      if (hotelName) {
        const hotelKey = `${cityName}-${hotelName}`;
        if (!hotelsMap.has(hotelKey)) {
          hotelsMap.set(hotelKey, {
            id: hotelKey.replace(/\s+/g, "-").toLowerCase(),
            name: hotelName,
            city: cityName,
            state: selectedState,
            rating: row[5] || "", // Star rating
            GoogleReviewRating: row[3] || "",
            GoogleListingURL: row[4] || "",
            rooms: [],
          });
        }
        currentHotel = hotelsMap.get(hotelKey);
      }

      // If we don't have a hotel context yet, skip
      if (!currentHotel) continue;

      // 2. Handle Room Categories and Pricing
      if (categoryName) {
        // Detect "Extra" rows to update the pricing of the CURRENT room
        const isExtraAdult = categoryName
          .toLowerCase()
          .includes("extra bed (adult)");
        const isExtraChild = categoryName
          .toLowerCase()
          .includes("extra bed (child)");
        const isCNB = categoryName.toLowerCase().includes("child without bed");
        const isExtrasHeader = categoryName.toLowerCase() === "extras";

        if (isExtrasHeader) continue;

        if (isExtraAdult || isExtraChild || isCNB) {
          if (currentRoom) {
            // Update Season 1 Pricing
            if (isExtraAdult)
              currentRoom.seasons[0].pricing.cp.extraAdult = row[7] || 0;
            if (isExtraChild)
              currentRoom.seasons[0].pricing.cp.extraChild = row[7] || 0;

            // Update Season 2 Pricing
            if (isExtraAdult)
              currentRoom.seasons[1].pricing.cp.extraAdult = row[10] || 0;
            if (isExtraChild)
              currentRoom.seasons[1].pricing.cp.extraChild = row[10] || 0;
          }
        } else {
          // It's a standard room category row
          currentRoom = {
            categoryName: categoryName,
            seasons: [
              {
                name: rows[1][7] || "Season 1",
                start: rows[1][8] || "",
                end: rows[1][9] || "",
                pricing: {
                  cp: { double: row[7] || 0, extraAdult: 0, extraChild: 0 },
                  map: { double: row[8] || 0, extraAdult: 0, extraChild: 0 },
                  ap: { double: row[9] || 0, extraAdult: 0, extraChild: 0 },
                },
              },
              {
                name: rows[1][10] || "Season 2",
                start: rows[1][11] || "",
                end: rows[1][12] || "",
                pricing: {
                  cp: { double: row[10] || 0, extraAdult: 0, extraChild: 0 },
                  map: { double: row[11] || 0, extraAdult: 0, extraChild: 0 },
                  ap: { double: row[12] || 0, extraAdult: 0, extraChild: 0 },
                },
              },
            ],
          };
          currentHotel.rooms.push(currentRoom);
        }
      }
    }
    const final_data = Array.from(hotelsMap.values());
    console.log(final_data)
    return NextResponse.json(final_data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
