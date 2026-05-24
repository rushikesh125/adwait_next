# Org Layer Verification Order

Use this after implementing `orgId` writes, filters, public-flow derivation, migration, and rules.

## Implementation status (app layer)

| Area | Status | Notes |
|------|--------|-------|
| 1. Auth | DONE | `AuthSetup`, `RequireAuth` |
| 2. Customers & Leads | DONE | Services + main agent/admin pages |
| 3. Quotations | DONE | Services, hooks, share accept → booking |
| 4. Bookings | DONE | `bookingsService` + agent/admin pages |
| 5. Invoices | DONE | See section 5 implementation map below |
| 6. Vouchers | DONE | See section 6 implementation map below |
| 7–11 | Pending | |

Firestore security rules are intentionally out of scope until later.

Update from org-layer pass:

- 7. Hotels, Activities, Transport: DONE for app-layer resource reads/writes across admin/agent flows.
- 8. Itinerary: DONE for template lists/create/edit and quotation-builder lookups.
- 9. Public Enquiry, Form, Preview: DONE for deriving/preserving source `orgId`.
- 10. Cron, API, Notifications: DONE for emitted records and permission checks carrying/verifying `orgId` where available.
- 11. Cross-Org Isolation Check: Pending until verified with real two-org data and Firestore rules.

---

## 1. Login And Auth State (DONE)

Test first:

- Login as an agent.
- Login as an admin.
- Confirm Redux user has:

```js
user.orgId
```

Expected:

- Agent has correct `orgId`.
- Admin has correct `orgId`.
- Superadmin can work without `orgId`.
- Admin/agent without `orgId` is blocked or shown a clear setup state.

---

## 2. Customers And Leads (DONE)

Test:

- Create customer.
- Edit customer.
- Search customer by email/mobile.
- Create lead.
- Assign lead to agent.
- Add lead note.
- Add follow-up.

Expected:

- New customers have `orgId`.
- New leads have `orgId`.
- Customer duplicate checks are org-scoped.
- Lead lists show only current org data.
- Admin sees only their org/team leads.
- Agent sees only their org/own leads.

---

## 3. Quotations Create, Edit, Share (DONE)

Test:

- Create quotation.
- Edit quotation.
- Save as new quotation.
- Link quotation to lead/customer.
- Change quotation status.
- Generate/share preview link.
- Open public preview link.
- Accept/reject quotation from public preview.

Expected:

- Quotation package docs have `orgId`.
- Quotation reads are org-scoped.
- Collection-group package queries use or preserve `orgId`.
- Public preview derives `orgId` from quotation/package.
- Accepted quotation creates org-scoped booking/notification.

---

## 4. Bookings (DONE)

Test:

- Create booking from scratch.
- Create booking from accepted quotation.
- Edit booking.
- Change booking status.
- View agent booking list.
- View admin booking list.

Expected:

- Booking docs have `orgId`.
- Agent sees only own/org bookings.
- Admin sees only org/team bookings.
- Direct booking URL cannot expose another org's booking.

---

## 5. Invoices (DONE)

### Implementation map (cross-checked)

**Service layer**

- `src/firebase/invoicesService.js` — `orgFilter` / `belongsToOrg` on reads; org guard on update/delete/payment mutations when `orgId` is passed
- `src/firebase/adminService.js` — `getInvoicesByAdmin(agentIds, orgId)`

**Agent UI**

- `src/app/agent-panel/invoices/page.jsx` — list + delete
- `src/app/agent-panel/invoices/create/page.jsx` — create/edit; create from booking; stamps `orgId` + `adminId` on write
- `src/app/agent-panel/invoices/[id]/page.jsx` — detail, payments, delete, booking sync

**Admin UI**

- `src/app/admin-panel/invoices/page.jsx` — team list + delete (org-scoped agents + invoices)
- `src/app/admin-panel/invoices/[id]/page.jsx` — re-exports agent detail (inherits org behavior)
- `src/app/admin-panel/invoices/create/page.jsx` — re-exports agent create (inherits org behavior)

**Connected flows**

- `src/app/agent-panel/bookings/[id]/page.jsx` — payment edit syncs invoice via `getInvoicesByBooking(id, orgId)` + `updatePaymentInInvoice(..., orgId)`; “Create Invoice” links to create page with `bookingId`
- `src/components/dashboard/RevenueChart.jsx` — dashboard revenue query filters `orgId` + `agentId`
- `src/app/agent-panel/page.jsx` — passes `orgId` into `RevenueChart`

**Not org-scoped (by design for now)**

- `getNextInvoiceNumber()` — still uses global `config/voucher_counters` (per-org counters deferred)
- `src/firebase/paymentAccountsService.js` — used on invoice detail; separate from invoice org work
- Cron/API routes — no invoice-specific cron found

### Test checklist

- Create invoice (manual).
- Create invoice from booking (`/invoices/create?bookingId=...`).
- Edit invoice.
- Add payment.
- Edit payment.
- Delete payment.
- Delete invoice.
- View agent invoice list.
- View admin invoice list.
- Open direct URL `/agent-panel/invoices/{otherOrgId}` — should not load.
- Edit booking payment linked to invoice — invoice payment should sync only within same org.
- Agent dashboard revenue chart — counts only org invoices.

### Expected

- Invoice docs have `orgId` (and `adminId` when created from agent panel).
- Invoice reads are org-scoped (`getInvoicesByAgent`, `getInvoiceById`, `getInvoicesByAdmin`).
- Invoice-by-booking queries are org-scoped (`getInvoicesByBooking`).
- Payment add/update/delete cannot modify another org's invoice when `user.orgId` is passed.
- Booking → invoice create only pre-fills if booking/customer/lead/quotation belong to same org.
- Legacy invoices without `orgId` do not appear in filtered lists until backfilled.

---

## 6. Vouchers (DONE)

### Implementation map (cross-checked)

**Service layer**

- `src/firebase/voucher.js` — `orgId` on save; `orgFilter` on standalone + package reads; `belongsToOrg` on voucher docs; org guard on update/delete

**Storage paths (unchanged)**

- `saved_packages_by_agents/{agentId}/standalone_vouchers/{voucherId}`
- `saved_packages_by_agents/{agentId}/packages/{quotationId}/vouchers/{voucherId}`

**Agent UI**

- `src/app/agent-panel/vouchers/page.jsx` — list, delete, status → quotation update
- `src/app/agent-panel/vouchers/CreateHotelVoucherPage.jsx` — standalone / linked hotel create
- `src/app/agent-panel/vouchers/CreateFlightVoucherPage.jsx` — standalone / linked flight create + edit dialog
- `src/app/agent-panel/vouchers/hotelVoucher.jsx` — drawer create/edit (quotation modal, booking, list edit)

**Connected flows**

- `src/app/hooks/useQuotationState.jsx` — quotation list already org-scoped (voucher link picker inherits)
- `src/app/agent-panel/my-quotation/QuotationModals.jsx` — hotel voucher from quotation documents tab
- `src/app/agent-panel/bookings/page.jsx` / `[id]/page.jsx` — hotel voucher drawer; booking `vouchers[]` metadata via org-scoped `updateBooking`

**Not org-scoped (by design for now)**

- `getNextVoucherNumber()` — global `config/voucher_counters`
- Booking-embedded `vouchers[]` entries (metadata only; parent booking has `orgId`)

### Test checklist

- Create standalone hotel voucher.
- Create standalone flight voucher.
- Create hotel voucher linked to quotation (create page + quotation documents drawer).
- Create hotel voucher from booking detail.
- Edit hotel / flight voucher from voucher list.
- Delete voucher.
- Change voucher status when linked to quotation.
- View voucher list — only current org.

### Expected

- Standalone voucher docs have `orgId`.
- Quotation-linked voucher docs have `orgId`.
- Voucher list only shows current org (standalone query + org-scoped packages).
- Edit/delete blocked for another org's voucher record.
- Linked `updateQuotation` calls pass `orgId`.
- Legacy vouchers without `orgId` excluded from filtered lists until backfilled.

---

## 7. Hotels, Activities, Transport

Test:

- Create hotel.
- Edit hotel.
- Add room/rate/season.
- Upload hotels.
- Create activity.
- Edit activity.
- Create transport package.
- Edit transport package.
- Select hotel/activity/transport inside quotation builder.

Expected:

- Hotels have `orgId`.
- Activities have `orgId`.
- Transport state/package docs have `orgId`.
- Lookup dropdowns show only current org resources.
- Admin resource pages show only current org resources.

---

## 8. Itinerary

Test:

- Create itinerary template.
- Edit itinerary template.
- Publish/unpublish template.
- Delete template.
- Use itinerary template inside package/quotation flow.
- Generate AI itinerary if applicable.

Expected:

- Itinerary templates have `orgId`.
- Template lists are org-scoped.
- Activity/location lookups inside itinerary are org-scoped.
- Direct itinerary URL cannot expose another org's template.

---

## 9. Public Enquiry, Form, Preview

Test:

- Submit public enquiry from agent/admin link.
- Submit booking form from public trip link.
- Open quotation preview link.
- Accept/reject quotation publicly.

Expected:

- Public enquiry derives `orgId` from owner admin/agent.
- Public trip form derives `orgId` from trip.
- Public quotation preview derives `orgId` from quotation/package.
- Created customers/leads/submissions/bookings/notifications get correct `orgId`.

---

## 10. Cron, API, Notifications

Test:

- Follow-up cron.
- Installment cron.
- Cold lead cron.
- Push notification API.
- Browser notification subscription.
- AI/server routes that save generated data.

Expected:

- System scans may be global, but emitted records include source document `orgId`.
- Notifications have `orgId`.
- Push subscriptions have `orgId` if supported.
- AI-generated saved data gets caller/source `orgId`.

---

## 11. Cross-Org Isolation Check

Final safety test:

- Create two organizations.
- Create one admin and one agent in each org.
- Create sample leads/customers/quotations/bookings/invoices/resources in both orgs.
- Login as Org A admin/agent.
- Try list pages and direct URLs for Org B records.
- Repeat as Org B admin/agent.
- Login as superadmin.

Expected:

- Org A users cannot see or modify Org B data.
- Org B users cannot see or modify Org A data.
- Superadmin can see global admin/agent/org management data.
- Firestore rules reject cross-org reads/writes even if the frontend is bypassed (when rules are deployed).
