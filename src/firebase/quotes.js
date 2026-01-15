import { db } from "./config";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";

export const saveNewQuote = async (agentId, quoteData) => {
  const packagesRef = collection(db, "saved_packages_by_agents", agentId, "packages");
  return await addDoc(packagesRef, {
    ...quoteData,
    createdAt: serverTimestamp(),
    status: "Draft"
  });
};

export const fetchAgentQuotes = async (agentId) => {
  const packagesRef = collection(db, "saved_packages_by_agents", agentId, "packages");
  const q = query(packagesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc, index) => ({
    id: doc.id,
    quoteNumber: snapshot.docs.length - index,
    ...doc.data()
  }));
};

export const updateQuote = async (agentId, quoteId, quoteData) => {
  const quoteRef = doc(db, "saved_packages_by_agents", agentId, "packages", quoteId);
  await updateDoc(quoteRef, quoteData);
};

export const deleteQuote = async (agentId, quoteId) => {
  const quoteRef = doc(db, "saved_packages_by_agents", agentId, "packages", quoteId);
  await deleteDoc(quoteRef);
};