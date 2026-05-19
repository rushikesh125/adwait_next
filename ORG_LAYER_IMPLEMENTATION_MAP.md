# Org Layer Implementation Map

This file maps where `orgId` needs to enter the app. Use it as the high-level checklist, then use `ORG_LAYER_FIRESTORE_REFERENCES.md` and `ORG_LAYER_DIRECT_FIREBASE_CALLS.md` for exact Ctrl+F strings.

## Current State

The repo already has a partial organization feature:

- `src/firebase/organizationService.js`
- `src/components/OrganizationsManager.jsx`
- `src/app/superadmin/organizations/page.jsx`

That covers creating organizations and assigning `orgId` to `admins` / `agents`. The missing work is data isolation everywhere else.

Important: Firestore is not only used through `src/firebase`. Many JSX pages/components/hooks call `db` directly. Those direct-call files are mapped separately in `ORG_LAYER_DIRECT_FIREBASE_CALLS.md`.

## Core Rule

For every non-global business document:

```js
orgId: user.orgId
```

For every non-superadmin read:

```js
where("orgId", "==", user.orgId)
```

Superadmin remains global and should not get the org filter.

## First Change: Auth State

### File

`src/components/AuthSetup.jsx`

### Ctrl+F

```js
dispatch(setUser({
```

`resolved.data` is already spread into Redux, so if `admins/{uid}` or `agents/{uid}` contains `orgId`, Redux should already receive it. Still validate that `user.orgId` exists before allowing admin/agent data screens to run.

### File

`src/store/authSlice.js`

No reducer change is required because `setUser` stores the whole payload.

## Already Started Org Files

### File

`src/firebase/organizationService.js`

Already handles:

- `organizations`
- `assignAdminToOrg`
- `assignAgentToOrg`
- `getAdminsByOrg`
- `getAgentsByOrg`

### Ctrl+F

```js
export const assignAdminToOrg = async (adminId, orgId) => {
```

```js
export const assignAgentToOrg = async (agentId, orgId) => {
```

Use this as the pattern for user membership.

## Main Service Layer Changes

These are the highest value files to change first because many pages call them.

After these service changes, still patch direct Firestore usage in components/pages. Do not assume the service layer catches everything.

### Leads

File: `src/firebase/leadsService.js`

Add `orgId` to lead creation and clone flows. Add `where("orgId", "==", orgId)` to list/search reads.

Key functions:

- `addLead`
- `createAssignedLead`
- `getAllLeads`
- `getLeadsByAgent`
- `getQuotationsForLead`
- `getLeadById`
- `getLeadNotes`
- `cloneLead`
- `rejectAllQuotationsForLead`

Notes/followups are nested under a lead, so they inherit access from the parent lead. You can still stamp `orgId` on note/followup docs for easier collection-group queries.

### Customers

File: `src/firebase/customersService.js`

Add `orgId` to new customers and filter customer queries by org.

Key functions:

- `addCustomer`
- `getAllCustomers`
- `findExistingCustomerByEmailOrMobile`
- `getCustomerLeads`
- `getCustomersCount`
- `getCustomersPage`

Customer notes are nested under customers, so they should be protected through the customer parent. Optional: stamp note `orgId` too.

### Quotations

Files:

- `src/firebase/quotations.js`
- `src/firebase/services.js`
- `src/app/hooks/useQuotationState.jsx`
- `src/components/Create_new_package.jsx`

Quotations are stored at:

```txt
saved_packages_by_agents/{agentId}/packages/{quotationId}
```

Keep the current path, but stamp `orgId` on every package document and add `where("orgId", "==", orgId)` wherever you use `collectionGroup(db, "packages")` or read agent packages for admin views.

### Bookings

File: `src/firebase/bookingsService.js`

Add `orgId` on create. Add org filter to list reads.

Key functions:

- `createBooking`
- `getBookingsByAgent`
- `getBookingById`

Direct booking detail reads by ID should verify the returned document belongs to the current org unless superadmin.

### Invoices

File: `src/firebase/invoicesService.js`

Add `orgId` on create. Add org filter to invoice queries.

Key functions:

- `createInvoice`
- `getInvoicesByAgent`
- `getInvoiceById`
- `getInvoicesByBooking`

### Payment Accounts

File: `src/firebase/paymentAccountsService.js`

Add `orgId` on create and filter accounts by org.

Key functions:

- `createPaymentAccount`
- `getPaymentAccountsByAgent`
- `getPaymentAccountById`

### Notifications and Push Subscriptions

File: `src/firebase/notificationsService.js`

Add `orgId` to notifications and push subscriptions where possible.

Key functions:

- `createNotification`
- `subscribeToNotifications`
- `markAllNotificationsRead`
- `subscribeToPush`

Notifications are currently scoped by `userId`; add `orgId` as defense-in-depth and for admin dashboards later.

### Hotels, Activities, Transport, Locations

Files:

- `src/firebase/hotels.js`
- `src/firebase/accommodation.js`
- `src/firebase/hotelUploadFirestore.js`
- `src/firebase/activities_service.js`
- `src/firebase/resources.js`
- `src/firebase/transport.js`
- `src/firebase/transportFeatures.js`
- `src/firebase/transportService.js`
- `src/components/accommodation/AddHotel.jsx`
- `src/app/admin-panel/accommodations/create/page.jsx`
- `src/components/activity/AddActivity.jsx`
- `src/components/activity/EditActivity.jsx`
- `src/components/transports/CreatePackage.jsx`
- `src/components/transports/EditPackage.jsx`

These are master/resource collections. Decide whether resources are org-owned or shared. Your plan says they get `orgId`, so add filters to all reads and stamp on creates/updates.

Important: `locations` is used as a state/city lookup and is also updated when adding cities. If each org owns its own locations, these reads/writes need org filtering too.

### Itinerary Templates

Files:

- `src/components/ItinerarySection.jsx`
- `src/app/admin-panel/itinerary/page.jsx`
- `src/app/agent-panel/itinerary/page.jsx`
- `src/app/admin-panel/itinerary/create/page.jsx`
- `src/app/agent-panel/itinerary/create/page.jsx`

Add `orgId` to template create/update payloads and filter template reads by org.

### Trips and Booking Forms

Files:

- `src/firebase/form-services.js`
- `src/components/forms/CreateTripForm.jsx`
- `src/app/agent-panel/bookingform/page.jsx`
- `src/app/agent-panel/bookingform/view/[id]/page.jsx`
- `src/app/book/[id]/page.jsx`

Add `orgId` to `trips` and `submissions`. Public booking pages need to derive `orgId` from the trip document, not from logged-in Redux state.

### Public Enquiry

File: `src/app/enquiry/[agentId]/page.jsx`

This page creates customers/leads from an agent/admin public link. It must derive `orgId` from the owner record resolved by `[agentId]`, then stamp that `orgId` on new customer/lead records.

### Public Quotation Preview

Files:

- `src/app/preview/[token]/page.jsx`
- `src/firebase/quotationShare.js`
- `src/lib/serverQuotationResponse.js`
- `src/app/api/public/quotation-response/route.js`

Preview/response flows do not have logged-in Redux state. They need to read the quotation/share token, then use the quotation's `orgId` when creating bookings, notifications, or status changes.

## Admin Views

Admin views currently scope mostly through `adminId` and `agentId`. Keep those if needed for assignment, but add `orgId` to prevent cross-org leakage.

Files:

- `src/firebase/adminService.js`
- `src/app/admin-panel/leads/page.jsx`
- `src/app/admin-panel/team/leads/page.jsx`
- `src/app/admin-panel/team/unassigned/page.jsx`
- `src/app/admin-panel/bookings/page.jsx`
- `src/app/admin-panel/team/bookings/page.jsx`
- `src/app/admin-panel/invoices/page.jsx`
- `src/app/admin-panel/quotations/page.jsx`
- `src/app/admin-panel/team/quotations/page.jsx`
- `src/app/admin-panel/team/customers/page.jsx`

Recommended service signature pattern:

```js
getLeadsByAdmin(adminId, orgId)
```

Then query:

```js
query(
  collection(db, "leads"),
  where("orgId", "==", orgId),
  where("adminId", "==", adminId)
)
```

## Agent Views

Agent views mostly scope by `agentId`. Still add `orgId` to writes and reads.

Files:

- `src/app/agent-panel/page.jsx`
- `src/app/agent-panel/leads/page.jsx`
- `src/app/agent-panel/customers/page.jsx`
- `src/app/agent-panel/bookings/page.jsx`
- `src/app/agent-panel/invoices/page.jsx`
- `src/app/agent-panel/my-quotation/page.jsx`
- `src/app/agent-panel/vouchers/page.jsx`
- `src/app/agent-panel/settings/payment-accounts/page.jsx`

Recommended service signature pattern:

```js
getBookingsByAgent(agentId, orgId)
```

Then query:

```js
query(
  collection(db, "bookings"),
  where("orgId", "==", orgId),
  where("agentId", "==", agentId)
)
```

## Cron and API Routes

Cron jobs have no logged-in user, so org filtering must come from the document being processed.

Files:

- `src/app/api/cron/check-followups/route.js`
- `src/app/api/cron/check-installments/route.js`
- `src/app/api/cron/check-cold-leads/route.js`

These currently scan collections globally. That can remain for system jobs, but any created logs/notifications should include the source document's `orgId`.

Push APIs:

- `src/app/api/send-push/route.js`
- `src/app/api/test-push/route.js`

If push subscriptions are stamped with `orgId`, include it in these queries where available.

AI/server auth routes:

- `src/lib/serverAuth.js`
- `src/app/api/ai-itinerary/route.js`
- `src/app/api/ai-itinerary-template/route.js`
- `src/app/api/ai/hotel-details/route.js`

These should return or verify the caller's `orgId`, then include it in generated data.

## Global Collections

Do not org-filter these unless the product decision changes:

- `super_admins`
- `creds`
- `organizations`
- `config`
- `meta`

Possibly global/technical:

- `adminPermissions`
- `agentPermissions`
- `pushSubscriptions`
- `installmentNotifSent`
- `followupNotifSent`
- `coldLeadClosedLog`

If permissions remain keyed by user ID, they can stay global. If permissions differ per org membership later, add `orgId`.

## Migration Targets

Backfill these existing documents:

- `admins`
- `agents`
- `leads`
- `bookings`
- `customers`
- `invoices`
- `hotels`
- `custom_hotels`
- `activities`
- `transport`
- `trips`
- `itinerary_templates`
- `notifications`
- `payment_accounts`
- `saved_packages_by_agents/{agentId}/packages`
- `saved_packages_by_agents/{agentId}/standalone_vouchers`
- `saved_packages_by_agents/{agentId}/packages/{quotationId}/vouchers`

Also consider:

- `locations`
- `submissions`
- `pushSubscriptions`

## Suggested Order

1. Confirm every admin/agent doc has `orgId`.
2. Validate `user.orgId` is present after login.
3. Add `orgId` writes in service functions.
4. Add `orgId` filters in service functions.
5. Patch direct Firestore usage in pages/components.
6. Patch public flows by deriving org from owner/trip/quotation.
7. Backfill existing data.
8. Add Firestore rules that enforce org ownership.
