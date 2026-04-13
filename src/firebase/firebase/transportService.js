
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export const fetchTransportStates = async () => {
  const querySnapshot = await getDocs(collection(db, "transport_states"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchTransportPackages = async (stateId) => {
  const q = query(collection(db, "transport_packages"), where("stateId", "==", stateId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};