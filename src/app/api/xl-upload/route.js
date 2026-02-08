import * as  XLSX from 'xlsx';
import { NextResponse } from 'next/server';

// Configure route for large file uploads
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    // Get file buffer from request
    const buffer = await request.arrayBuffer();
    
    if (!buffer || buffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: 'No file data received' },
        { status: 400 }
      );
    }

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to array format
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    // Extract hotels data
    const hotels = extractHotels(data);

    return NextResponse.json({
      success: true,
      count: hotels.length,
      hotels,
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process Excel file',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Main extraction function
function extractHotels(data) {
  const hotels = [];
  const seasonColumns = findSeasonColumns(data[0]);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Check if this row starts a new hotel (has state, city, hotel name)
    if (row[1] && row[2] && row[3]) {
      const hotel = {
        state: String(row[1]).trim(),
        city: String(row[2]).trim(),
        hotelName: String(row[3]).trim(),
        googleRating: row[4] ? parseFloat(row[4]) : null,
        hotelLink: row[5] || null,
        starRating: row[6] ? parseInt(row[6]) : null,
        seasons: extractSeasons(data, i, seasonColumns),
      };
      
      hotels.push(hotel);
    }
  }

  return hotels;
}

// Find all season column positions
function findSeasonColumns(headerRow) {
  const columns = [];
  
  for (let i = 0; i < headerRow.length; i++) {
    const cell = headerRow[i];
    if (cell && String(cell).toLowerCase().includes('season name')) {
      columns.push({
        nameCol: i,        // Column with season name
        startCol: i + 1,   // Start date column
        endCol: i + 2,     // End date column
        planCol: i + 4,    // First meal plan column (after 1 empty column)
      });
    }
  }
  
  return columns;
}

// Extract all seasons for a hotel
function extractSeasons(data, hotelRow, seasonColumns) {
  const seasons = [];

  for (const col of seasonColumns) {
    const seasonName = data[hotelRow][col.nameCol];
    
    // Skip if no season name
    if (!seasonName) continue;

    const startDate = formatDate(data[hotelRow][col.startCol]);
    const endDate = formatDate(data[hotelRow][col.endCol]);

    // Get meal plans from next row
    const planRow = data[hotelRow + 1];
    const mealPlans = getMealPlans(planRow, col.planCol);

    // Get room categories
    const rooms = extractRooms(data, hotelRow, col.planCol, mealPlans);

    // Only add season if it has room data
    if (rooms.length > 0) {
      seasons.push({
        seasonName: String(seasonName).trim(),
        startDate,
        endDate,
        rooms,
      });
    }
  }

  return seasons;
}

// Get meal plan names (EP, CP, MAP, AP)
function getMealPlans(row, startCol) {
  const plans = [];
  
  // Usually 4 meal plans
  for (let i = 0; i < 4; i++) {
    const plan = row[startCol + i];
    if (plan) {
      plans.push(String(plan).trim().toUpperCase());
    }
  }
  
  return plans;
}

// Extract room categories and prices
function extractRooms(data, hotelRow, planCol, mealPlans) {
  const rooms = [];
  let rowIdx = hotelRow + 2; // Start 2 rows after hotel (skip hotel row and plan header row)

  while (rowIdx < data.length) {
    const row = data[rowIdx];
    
    // Stop if we hit next hotel (has state in column 1)
    if (row[1]) break;

    // Get room category from column 7
    const category = row[7];
    
    if (!category) {
      rowIdx++;
      continue;
    }

    // Build meal plan pricing object
    const plans = {};
    mealPlans.forEach((planName, idx) => {
      const price = row[planCol + idx];
      plans[planName] = price ? parseFloat(String(price)) : null;
    });

    rooms.push({
      category: String(category).trim(),
      plans,
    });

    rowIdx++;
  }

  return rooms;
}

// Format dates consistently
function formatDate(value) {
  if (!value) return null;

  // Excel date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
  }

  // String date
  const str = String(value).trim();

  // Handle DD/MM/YYYY or MM/DD/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let [day, month, year] = parts;
      
      // Fix 2-digit year
      if (year.length === 2) year = '20' + year;
      
      // Fix typo like "206" -> "2026"
      if (year.length === 3) year = '2' + year;
      
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // Try parsing as Date
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } catch (e) {}

  return str;
}

// Helper to pad numbers
function pad(num) {
  return String(num).padStart(2, '0');
}