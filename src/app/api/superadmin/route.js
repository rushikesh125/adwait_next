import { NextResponse } from "next/server";
import { admin, adminDb } from "@/firebase/admin";
import { requireRole } from "@/lib/serverAuth";

export async function POST(request) {
  try {
    await requireRole(request, ["superadmin"]);

    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const adminRef = adminDb.collection("admins").doc(uid);
    const adminSnap = await adminRef.get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { message: "User does not exits. Please Register with admin first" },
        { status: 404 },
      );
    }

    const adminData = adminSnap.data();
    const superAdminData = {
      ...adminData,
      uid,
      role: "superadmin",
      upgradedAt: admin.firestore.Timestamp.now(),
    };

    await adminDb.collection("super_admins").doc(uid).set(superAdminData);
    await adminRef.delete();

    return NextResponse.json(
      {
        message: "User successfully promoted to Super Admin,and removed from admin list",
        data: superAdminData,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Error upgrading admin:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: error.status || 500 },
    );
  }
}
