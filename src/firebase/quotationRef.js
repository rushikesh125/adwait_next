
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

/**
 * Atomically claims the next quotation ref number.
 * Resets to 0001 each new YY-MM period.
 * Returns a string like "Q-26040001"
 */
export async function generateQuotationRef() {
  const counterRef = doc(db, "meta", "quotationCounter");

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2); // "26"
  const mm = String(now.getMonth() + 1).padStart(2, "0"); // "04"
  const currentPeriod = `${yy}${mm}`; // "2604"

  const claimedNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);

    let newCount;

    if (!snap.exists() || snap.data().lastReset !== currentPeriod) {
      // First quotation ever, OR new month — reset to 1
      newCount = 1;
    } else {
      newCount = (snap.data().count || 0) + 1;
    }

    transaction.set(counterRef, {
      count: newCount,
      lastReset: currentPeriod,
      updatedAt: serverTimestamp(),
    });

    return newCount;
  });

  const seq = String(claimedNumber).padStart(4, "0"); // "0001"
  return `Q-${currentPeriod}${seq}`; // "Q-26040001"
}