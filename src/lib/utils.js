import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { Star } from "lucide-react";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}



// ── Modularised constants and helpers ──────────────────────────────────────
export const MEAL_PLANS = ["EP", "CP", "MAP", "AP"];
export const MEAL_PLAN_LABELS = {
  EP: "Accommodation only",
  CP: "Bed + Breakfast",
  MAP: "Breakfast + Dinner",
  AP: "All Meals",
};
export const MEAL_PLAN_ICONS = {
  EP: "🏨",
  CP: "🍳",
  MAP: "🍽️",
  AP: "🍱",
};
export const STAR_RATINGS = ["1", "2", "3", "4", "5"];

export const EMPTY_PRICING = () => ({
  ep: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  cp: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  map: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
  ap: { double: 0, extraAdult: 0, extraChild: 0, cnb: 0 },
});

export const calcCustomHotelNightPrice = (
  pricing,
  plan,
  { numDouble, numExtraAdult, numExtraChild, numCNB },
) => {
  if (!pricing || !plan) return 0;
  const p = pricing[plan.toLowerCase()];
  if (!p) return 0;
  return (
    (p.double || 0) * (numDouble || 0) +
    (p.extraAdult || 0) * (numExtraAdult || 0) +
    (p.extraChild || 0) * (numExtraChild || 0) +
    (p.cnb || 0) * (numCNB || 0)
  );
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return isNaN(d)
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export const renderStars = (rating) => {
  const n = parseInt(rating) || 0;
  return Array.from({ length: n }).map((_, i) => (
    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
  ));
};

export const PLAN_DESCRIPTIONS = {
  ep: "Accommodation only",
  cp: "Bed + Breakfast",
  map: "Breakfast + Dinner",
  ap: "All Meals",
};
