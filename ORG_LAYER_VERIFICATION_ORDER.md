# Org Layer Verification Order

Use this after implementing `orgId` writes, filters, public-flow derivation, migration, and rules.

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

## 2. Customers And Leads

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

## 3. Quotations Create, Edit, Share

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

## 4. Bookings

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

## 5. Invoices

Test:

- Create invoice.
- Create invoice from booking.
- Edit invoice.
- Add payment.
- Edit payment.
- Delete payment.
- View agent invoice list.
- View admin invoice list.

Expected:

- Invoice docs have `orgId`.
- Invoice reads are org-scoped.
- Invoice-by-booking queries are org-scoped.
- Payment updates cannot modify another org's invoice.

## 6. Vouchers

Test:

- Create standalone hotel voucher.
- Create standalone flight voucher.
- Create voucher linked to quotation.
- Edit voucher.
- Delete voucher.
- View voucher list.

Expected:

- Standalone vouchers have `orgId`.
- Quotation-linked vouchers have `orgId`.
- Voucher list only shows current org vouchers.
- Linked quotation updates preserve `orgId`.

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
- Firestore rules reject cross-org reads/writes even if the frontend is bypassed.
