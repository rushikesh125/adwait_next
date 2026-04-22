import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const [{ adminAuth }, { requireRole }] = await Promise.all([
      import("@/firebase/admin"),
      import("@/lib/serverAuth"),
    ]);

    await requireRole(request, ["superadmin"]);

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(userRecord.uid, { password });
    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 },
    );
  }
}
