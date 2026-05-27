import { collection, getDoc, getDocs, doc, query, where } from "firebase/firestore";
import { db } from "./config";
import { belongsToOrg, orgFilter } from "./orgScope";
;

/**
 * Fetches all available states from the transport collection.
 */
export const fetchTransportStates = async (orgId = null) => {
  const snapshot = await getDocs(
    collection(db, "transport")
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    stateName: doc.data().stateName,
  }));
};

/**
 * Fetches all packages for a specific state.
 */
export const fetchPackagesByState = async (stateId, orgId = null) => {
  if (!stateId) return [];
  if (orgId) {
    const stateSnap = await getDoc(doc(db, "transport", stateId));
    if (!stateSnap.exists() || !belongsToOrg(stateSnap.data(), orgId)) {
      return [];
    }
  }
  const packagesCollection = collection(db, "transport", stateId, "packages");
  const snapshot = await getDocs(query(packagesCollection, ...orgFilter(orgId)));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
