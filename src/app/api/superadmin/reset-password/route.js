import { NextResponse } from "next/server";
import { adminAuth } from "@/firebase/admin";
import { requireRole } from "@/lib/serverAuth";

export async function POST(request) {
  try {
    await requireRole(request, ["superadmin"]);

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const resetLink = await adminAuth.generatePasswordResetLink(email);
    return NextResponse.json({ resetLink }, { status: 200 });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 },
    );
  }
}
