
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";
import { db } from "./config";
import { belongsToOrg, orgFilter } from "./orgScope";

export async function fetchAllStates(orgId = null) {
  try {
    const q = collection(db, "transport");
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      stateName: doc.data().stateName,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching transport states:", error);
    return [];
  }
}

export async function fetchPackagesForState(stateId, orgId = null) {
  if (!stateId) return [];

  try {
    if (orgId) {
      const stateSnap = await getDoc(doc(db, "transport", stateId));
      if (!stateSnap.exists() || !belongsToOrg(stateSnap.data(), orgId)) {
        return [];
      }
    }

    const packagesCollection = collection(db, "transport", stateId, "packages");
    const q = orgId
      ? query(packagesCollection, ...orgFilter(orgId))
      : packagesCollection;
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
}
