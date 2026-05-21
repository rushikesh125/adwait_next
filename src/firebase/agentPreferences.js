// src/firebase/agentPreferences.js
//
// Per-agent preferences for the quotation/itinerary builder.
//
// Currently tracks `removedDefaults` — the default-checklist items
// (inclusions, exclusions, T&Cs, cancellation, important info) that
// the agent has chosen to unchecked by default. Matched by text.
//
// Firestore shape:
//   agentPreferences/{agentId} = {
//     removedDefaults: {
//       inclusions:   string[],
//       exclusions:   string[],
//       tnc:          string[],
//       cancellation: string[],
//       impinfo:      string[],
//     },
//     updatedAt: serverTimestamp,
//   }

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

const COLLECTION = "agentPreferences";

export const PREF_CATEGORIES = [
  "inclusions",
  "exclusions",
  "tnc",
  "cancellation",
  "impinfo",
];

const emptyRemovedDefaults = () =>
  PREF_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {});

export async function getAgentPreferences(agentId) {
  if (!agentId) return { removedDefaults: emptyRemovedDefaults() };
  try {
    const snap = await getDoc(doc(db, COLLECTION, agentId));
    if (!snap.exists()) return { removedDefaults: emptyRemovedDefaults() };
    const data = snap.data();
    return {
      ...data,
      removedDefaults: {
        ...emptyRemovedDefaults(),
        ...(data.removedDefaults || {}),
      },
    };
  } catch (err) {
    console.error("[agentPreferences] getAgentPreferences failed:", err);
    return { removedDefaults: emptyRemovedDefaults() };
  }
}

/**
 * Toggle a default item's "removed" state for the given agent + category.
 *
 * @param {string}  agentId
 * @param {string}  category  one of PREF_CATEGORIES
 * @param {string}  text      the default item's text (the stable matcher)
 * @param {boolean} removed   true → record as removed; false → restore default
 */
export async function setRemovedDefault(agentId, category, text, removed) {
  if (!agentId || !category || !text) return;
  if (!PREF_CATEGORIES.includes(category)) {
    console.warn(`[agentPreferences] unknown category: ${category}`);
    return;
  }

  const current = await getAgentPreferences(agentId);
  const list = new Set(current.removedDefaults[category] || []);
  if (removed) list.add(text);
  else list.delete(text);

  const next = {
    ...current.removedDefaults,
    [category]: Array.from(list),
  };

  await setDoc(
    doc(db, COLLECTION, agentId),
    { removedDefaults: next, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Apply the agent's removed-defaults to a freshly-built default item list.
 *
 * Each default item gets `isMarkedAsDefault` (true if it is still a default
 * for this agent, false if the agent has removed it). When an item has been
 * removed as default we also start it unchecked (`selected: false`).
 * Selection state for items still marked as default is left untouched so a
 * caller (e.g. existing quotation) can override it.
 */
export function applyRemovedDefaults(items, removedTextList) {
  const removed = new Set(removedTextList || []);
  return items.map((item) => {
    if (!item.isDefault) return item;
    if (removed.has(item.text)) {
      return { ...item, isMarkedAsDefault: false, selected: false };
    }
    return { ...item, isMarkedAsDefault: true };
  });
}
