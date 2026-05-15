# Project Review — Adwait Tours (Next.js + Firebase)

_High-level audit of the AdwaitNext codebase as of 2026-05-14._

## Executive summary

Feature-rich, customer-facing-ready, and largely consistent on UI surface — but the codebase has a small number of structural issues that make it expensive to evolve safely. The three biggest ones are: a handful of 1,000–2,300-line page components doing everything inline; effectively zero automated tests; and no committed Firestore security rules. Most other issues (duplication, accessibility gaps, error handling) are mechanical and can be fixed incrementally.

## What's working well

- **Module coverage.** Both agent and admin panels are feature-complete across the travel-agency workflow: leads, quotations, bookings, invoices, vouchers, customers, itineraries, accommodations, activities, transports.
- **Firebase integration is clean.** Service-layer separation in [src/firebase/](src/firebase/) is sensible (one file per collection group), Firebase Admin SDK is correctly server-scoped in [src/firebase/admin.js](src/firebase/admin.js), and complex queries explicitly avoid composite-index pitfalls (see the comment in [src/firebase/invoicesService.js:18](src/firebase/invoicesService.js#L18)).
- **UI consistency.** 24 shadcn/ui primitives in [src/components/ui/](src/components/ui/) are used uniformly; panel layouts share a sidebar + header pattern; Tailwind `sm:`/`lg:` breakpoints are present on most pages.
- **Sensible state model.** Redux is restricted to small, persistent slices (auth, package, trip); real-time Firestore data lives in custom hooks ([src/hooks/](src/hooks/)). This avoids stale-cache headaches that come from putting subscriptions in Redux.
- **Sound notification architecture.** Cron-driven follow-up reminders ([src/app/api/cron/check-followups/route.js](src/app/api/cron/check-followups/route.js)) + Firestore-backed notification feed + browser/push fallback is well thought through, even if individual bugs surface (recent fixes around `View Lead` navigation and the mobile popup positioning).

## Top concerns (ranked by impact)

### 1. Monolithic page components
Six files exceed 1,000 lines:

| File | Lines |
|---|---|
| [src/components/Create_new_package.jsx](src/components/Create_new_package.jsx) | 2,327 |
| [src/app/agent-panel/bookings/create/page.jsx](src/app/agent-panel/bookings/create/page.jsx) | 1,694 |
| [src/app/agent-panel/my-quotation/edit/[cid]/page.jsx](src/app/agent-panel/my-quotation/edit/%5Bcid%5D/page.jsx) | 1,624 |
| [src/components/ItineraryEditor.jsx](src/components/ItineraryEditor.jsx) | 1,468 |
| [src/app/admin-panel/accommodations/hotel-upload/page.jsx](src/app/admin-panel/accommodations/hotel-upload/page.jsx) | 1,458 |
| [src/app/agent-panel/itinerary/create/page.jsx](src/app/agent-panel/itinerary/create/page.jsx) | 1,437 |

Each contains form state, validation, Firestore calls, sub-component JSX, and helper functions in one file. Editing them is error-prone — the recent "Edit button on a custom hotel does nothing" bug (fixed at [src/components/Create_new_package.jsx:859](src/components/Create_new_package.jsx#L859)) is a symptom: when one component owns this much state, easy-to-miss branches accumulate. Extract per-section components (HotelSelector, TransportSelector, VendorPaymentTable, etc.) and move state into the smallest scope that needs it.

### 2. Near-zero test coverage
One test file ([src/lib/installmentChecker.test.js](src/lib/installmentChecker.test.js), 244 lines) against ~71k lines of source. There is no jest config, no E2E tests, no integration tests for any of the lifecycle flows (lead → quotation → booking → invoice). Every bug is currently caught in production. At minimum, add tests for the pure lifecycle helpers in [src/firebase/bookingsService.js](src/firebase/bookingsService.js), [src/firebase/quotations.js](src/firebase/quotations.js), and [src/lib/quotationUtils.js](src/lib/quotationUtils.js). A Playwright happy-path for "create lead → send quote → accept → convert to booking" would pay for itself.

### 3. No Firestore security rules committed
No `firestore.rules` in the repo. Either rules exist only in the Firebase console (which means they aren't version-controlled, reviewable, or recoverable), or there are no rules at all (which means any authenticated user can read/write any document). This needs to be addressed urgently — pull current rules with `firebase firestore:rules` and commit them, then deploy from source going forward.

### 4. Agent/Admin panel duplication
Lead detail, booking detail, and invoice pages exist in both panels with overlapping JSX. Notable cases:
- [src/app/agent-panel/leads/[lid]/page.jsx](src/app/agent-panel/leads/%5Blid%5D/page.jsx) vs [src/app/admin-panel/leads/[lid]/page.jsx](src/app/admin-panel/leads/%5Blid%5D/page.jsx)
- [src/app/agent-panel/bookings/[id]/page.jsx](src/app/agent-panel/bookings/%5Bid%5D/page.jsx) vs admin equivalent

Extract the rendering into a `<LeadDetailView role="agent|admin">` component and let each panel page handle only its scoping/permissions. A bug fixed in one currently has to be hand-ported to the other.

### 5. 242 `console.error`/`console.warn` calls with no monitoring
Errors are logged to the browser DevTools console and lost. There is no Sentry/LogRocket/equivalent. In production this means user-impacting errors are invisible to the team unless someone happens to be debugging. Add a single error-tracking integration and replace the noisier service-layer logs with structured reports.

### 6. Missing accessibility labels on icon-only controls
Spot-check found only 8 `aria-label` attributes across the codebase. Most lucide-react icon buttons (Pencil, Trash2, Plus, Edit3) ship without labels, which makes screen readers announce them as unnamed buttons. Pass once across `src/app/agent-panel/**/*.jsx` and add labels.

### 7. Inline color tokens / no design system
78 occurrences of arbitrary Tailwind values like `bg-[#FDFCFE]`, `bg-[#F4F7FE]`. These should live in `tailwind.config` as semantic tokens (`bg-surface-base`, `bg-surface-muted`) so theming and dark mode are possible without a global search-and-replace.

### 8. Vercel environment variables stored empty for several keys
Earlier in development we found that several env vars on Vercel exist as keys but with empty values (`FIREBASE_ADMIN_*`, `VAPID_*`, `PUSH_SECRET`, several `NEXT_PUBLIC_EMAIL_*`). Server-side push notifications, scheduled-cron secrets, and outbound email won't function in any environment where these are blank. Audit `vercel env ls` per environment and fill in the missing values.

### 9. Mobile responsiveness is uneven
Mobile-specific bugs surfaced repeatedly in recent work (notification panel positioning, booking detail card padding, payment row overflow). The breakpoints exist, but they were not consistently tested. Sweep the top-traffic pages (Bookings list/detail, Quotation editor, Lead detail) on a 360px viewport and capture issues — most are quick padding/flex-wrap fixes like the ones already applied to [src/app/agent-panel/bookings/[id]/page.jsx](src/app/agent-panel/bookings/%5Bid%5D/page.jsx).

### 10. No `firebase.json` / `.firebaserc` in source control
Indexes, rules, and functions config are not declared in code, so deployments rely on whatever exists in the Firebase console. Tying these to source control (`firebase deploy --only firestore:indexes,firestore:rules`) makes infra reproducible and reviewable in PRs. The `followups` composite-index error already encountered this session is the canonical case.

## Suggested next steps (in order)

1. **Commit `firestore.rules`** (pull current from Firebase, review, lock down).
2. **Add `firebase.json` + index file**, deploy the missing `followups` composite index from source.
3. **Decompose [Create_new_package.jsx](src/components/Create_new_package.jsx)** into smaller components — this single file is responsible for most of the quotation-edit fragility.
4. **Wire an error tracker** (Sentry is simplest with Next.js — `@sentry/nextjs` auto-instruments App Router) and gradually replace `console.error` in service files.
5. **Add a Playwright happy-path test** for the lead → quotation → booking flow.
6. **Audit Vercel envs** and fill empty keys per environment.
7. **Accessibility sweep**: add `aria-label` to icon-only buttons across both panels.
8. **Consolidate Agent/Admin duplication** behind shared presentational components.

## What I'd leave alone for now

- Firebase service-layer file organization — it's already well-shaped.
- Redux usage — small and appropriate.
- shadcn/ui adoption — broad and consistent.
- Cron + notification pipeline — architecturally sound; just needs bug squashing as issues surface.
