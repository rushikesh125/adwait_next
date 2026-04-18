// import { db } from "@/firebase/config";
// import { deleteDoc, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
// import { NextResponse } from "next/server";

// export async function POST(request) {
//   try {
//     const { uid } = await request.json();
//     if (!uid) {
//       return NextResponse.json({ error: "UID is required" }, { status: 400 });
//     }

//     //checking if user exits in 'admins' collection
//     const adminRef = doc(db, "admins", uid);
//     const adminSnap = await getDoc(adminRef);
//     if (!adminSnap.exists()) {
//       return NextResponse.json(
//         { message: "User does not exits. Please Register with admin first" },
//         { status: 404 },
//       );
//     }
//     // if user exits , prepare the data for 'super_admins'
//     const adminData = adminSnap.data();
//     const superAdminData = {
//       ...adminData,
//       uid: uid,
//       role: "superadmin",
//       upgradedAt: Timestamp.now(),
//     };
//     await setDoc(doc(db, "super_admins", uid), superAdminData);
//     // deleting user from admin collection 
//     await deleteDoc(adminRef)
//     return NextResponse.json(
//       {
//         message: "User successfully promoted to Super Admin,and removed from admin list",
//         data: superAdminData,
//       },
//       { status: 200 },
//     );
//   } catch (error) {
//     console.log("Error upgrading admin:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }
