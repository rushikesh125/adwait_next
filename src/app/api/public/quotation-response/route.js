import { NextResponse } from "next/server";
import { respondToQuotationByTokenServer } from "@/lib/serverQuotationResponse";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  try {
    const { token, action } = body;
    const result = await respondToQuotationByTokenServer(token, action);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to process quotation response." },
      { status: error.status || 500 }
    );
  }
}
