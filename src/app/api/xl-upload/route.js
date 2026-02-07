import * as XLSX from "xlsx";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
    });

    // Remove empty rows
    const rows = rawRows.filter(row =>
      Object.values(row).some(v => v !== null && v !== "")
    );

    let currentHotel = null;
    const result = [];

    for (const row of rows) {
      // Skip header / meta rows
      if (!row["Room Category"]) continue;

      // If hotel info exists, update context
      if (row["Hotel Name"]) {
        currentHotel = {
          state: row["State"],
          city: row["City"],
          hotelName: row["Hotel Name"],
          rating: row["Google Ratings"],
          hotelLink: row["Hotel Link"],
          star: row["Star"],
        };
      }

      if (!currentHotel) continue;

      // Extract seasons dynamically
      const seasons = [];

      for (let i = 0; i <= 4; i++) {
        const nameKey = i === 0 ? "Season Name" : `Season Name.${i}`;
        const startKey = i === 0 ? "start date" : `start date.${i}`;
        const endKey = i === 0 ? "end date" : `end date.${i}`;

        if (row[nameKey] && row[startKey] && row[endKey]) {
          seasons.push({
            name: row[nameKey],
            startDate: row[startKey],
            endDate: row[endKey],
            price: row["Room Category"] === "Extras"
              ? null
              : Number(row[nameKey]) || null
          });
        }
      }

      result.push({
        ...currentHotel,
        roomCategory: row["Room Category"],
        seasons,
      });
    }

    return Response.json({
      totalRecords: result.length,
      data: result,
    });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Excel processing failed" },
      { status: 500 }
    );
  }
}
