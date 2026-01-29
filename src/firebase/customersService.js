import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
const customersRef = collection(db, "customers");

export const udpateCustomer = async(id, data)=>{
  const ref = doc( db, "customers", id);
  await updateDoc(ref, data);
};

export const addCustomer = async (customerData) => {
     return await addDoc(customersRef, {
    ...customerData,
    createdAt: serverTimestamp(),
  });
};

export const getAllCustomers = async () => {
  const q = query(customersRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};


