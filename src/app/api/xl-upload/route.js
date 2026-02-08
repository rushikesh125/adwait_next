import { NextResponse } from "next/server";
import XLSX from "xlsx";

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const hotelsMap = {};

  rows.forEach((row) => {
    const hotelKey = row["Hotel Code"] || row["Hotel Name"];

    if (!hotelsMap[hotelKey]) {
      hotelsMap[hotelKey] = {
        hotelName: row["Hotel Name"],
        hotelCode: row["Hotel Code"],
        city: row["City"],
        seasons: {}
      };
    }

    // 🔥 Detect seasons dynamically
    Object.keys(row).forEach((column) => {
      if (column.includes("Season") && column.includes("Price")) {
        const seasonName = column.split(" - ")[0];

        if (!hotelsMap[hotelKey].seasons[seasonName]) {
          hotelsMap[hotelKey].seasons[seasonName] = {
            seasonName,
            startDate: row[`${seasonName} Start Date`],
            endDate: row[`${seasonName} End Date`],
            plans: []
          };
        }

        hotelsMap[hotelKey].seasons[seasonName].plans.push({
          plan: row["Plan"],
          roomType: row["Room Type"],
          price: row[column]
        });
      }
    });
  });

  // Convert season map → array
  const hotels = Object.values(hotelsMap).map((hotel) => ({
    ...hotel,
    seasons: Object.values(hotel.seasons)
  }));

  return NextResponse.json({ hotels });
}
