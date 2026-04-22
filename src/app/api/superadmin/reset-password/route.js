import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const [{ adminAuth }, { requireRole }] = await Promise.all([
      import("@/firebase/admin"),
      import("@/lib/serverAuth"),
    ]);

    await requireRole(request, ["superadmin"]);

    const { uid, password } = await request.json();
    if (!uid || !password) {
      return NextResponse.json({ error: "UID and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await adminAuth.updateUser(uid, { password });
    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 },
    );
  }
}
