
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";
import { orgFilter } from "./orgScope";

export const fetchTransportStates = async (orgId = null) => {
  const querySnapshot = await getDocs(
    query(collection(db, "transport_states"), ...orgFilter(orgId))
  );
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchTransportPackages = async (stateId, orgId = null) => {
  const q = query(
    collection(db, "transport_packages"),
    where("stateId", "==", stateId),
    ...orgFilter(orgId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
