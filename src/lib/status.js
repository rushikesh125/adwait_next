export const STATUS_STYLES = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  contacted: "border-amber-200 bg-amber-50 text-amber-700",
  "quotation sent": "border-violet-200 bg-violet-50 text-violet-700",
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  generated: "border-sky-200 bg-sky-50 text-sky-700",
  sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  public: "border-emerald-200 bg-emerald-50 text-emerald-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "closed won": "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  canceled: "border-rose-200 bg-rose-50 text-rose-700",
  "closed lost": "border-rose-200 bg-rose-50 text-rose-700",
  suspended: "border-slate-200 bg-slate-100 text-slate-600",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
};

export const STATUS_LABELS = {
  approved: "Active",
};

export function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

export function getStatusLabel(status, fallback = "Unknown") {
  const normalized = normalizeStatus(status);
  if (!normalized) return fallback;
  return STATUS_LABELS[normalized] || status;
}

export function getStatusClasses(status, fallback = "border-slate-200 bg-slate-50 text-slate-700") {
  const normalized = normalizeStatus(status);
  return STATUS_STYLES[normalized] || fallback;
}
