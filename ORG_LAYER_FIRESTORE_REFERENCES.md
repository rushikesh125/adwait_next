# Org Layer Firestore References

Use this as the Ctrl+F checklist. Each entry gives a searchable code string and what should change for the org layer.

Also read `ORG_LAYER_DIRECT_FIREBASE_CALLS.md`. It lists JSX/hooks/routes that call Firebase directly instead of going through `src/firebase`.

## Auth and User Membership

### `src/components/AuthSetup.jsx`

Ctrl+F:

```js
dispatch(setUser({
```

Check that `resolved.data.orgId` reaches Redux. If missing for admin/agent, block or redirect.

Ctrl+F:

```js
ROLE_COLLECTIONS
```

This only checks `super_admins`, `admins`, `agents`. `orgId` belongs on `admins` and `agents`, not `super_admins`.

### `src/firebase/users.js`

Ctrl+F:

```js
const USER_COLLECTIONS = [
```

Ensure returned user records include `orgId`. They already spread `...snapshots[i].data()`.

Ctrl+F:

```js
query(collection(db, "agents"), where("enquirySlug", "==", slug), limit(1))
```

Public enquiry owner lookup should return `orgId`.

Ctrl+F:

```js
query(collection(db, "admins"), where("enquirySlug", "==", slug), limit(1))
```

Same for admin public enquiry links.

## Organization Management Already Present

### `src/firebase/organizationService.js`

Ctrl+F:

```js
addDoc(collection(db, "organizations"), {
```

Global collection. Do not add `orgId` to `organizations`.

Ctrl+F:

```js
await updateDoc(doc(db, "admins", adminId), {
```

Already stamps `orgId` on admins.

Ctrl+F:

```js
await updateDoc(doc(db, "agents", agentId), {
```

Already stamps `orgId` on agents.

Ctrl+F:

```js
query(collection(db, "agents"), where("adminId", "==", adminId))
```

If multiple orgs can have same admin assignment history, add `where("orgId", "==", orgId)`.

### `src/components/OrganizationsManager.jsx`

Ctrl+F:

```js
where("orgId", "==", org.id)
```

Already uses org membership filters.

Ctrl+F:

```js
!a.orgId
```

Unassigned member logic already exists.

## Leads

### `src/firebase/leadsService.js`

Ctrl+F:

```js
const leadsRef = collection(db, "leads");
```

All lead queries originate from this collection. Add org filters to reads.

Ctrl+F:

```js
export const addLead = async (data) => {
```

Require `data.orgId` or pass `orgId` explicitly; stamp on create.

Ctrl+F:

```js
createdAt: serverTimestamp(),
status: "New",
```

Add `orgId` near this create payload.

Ctrl+F:

```js
export const getAllLeads = async () => {
```

Change to `getAllLeads(orgId, role)` and filter unless superadmin.

Ctrl+F:

```js
export const getLeadsByAgent = async (agentId) => {
```

Add `orgId` parameter and `where("orgId", "==", orgId)`.

Ctrl+F:

```js
export const createAssignedLead = async ({
```

Add `orgId` to destructuring and create payload.

Ctrl+F:

```js
collectionGroup(db, "packages")
```

Add `where("orgId", "==", orgId)` when fetching/rejecting quotations by lead.

Ctrl+F:

```js
collection(db, "leads", lid, "notes")
```

Nested notes. Optionally stamp `orgId`; access should verify parent lead org.

Ctrl+F:

```js
return await addDoc(leadsRef, {
```

Used by clone lead; preserve/source `orgId`.

### `src/firebase/followUpService.js`

Ctrl+F:

```js
collection(db, "leads", leadId, "followups");
```

Nested followups. Add `orgId` in followup payload if collection-group queries need org filtering.

Ctrl+F:

```js
const ref = await addDoc(getFollowUpRef(leadId), {
```

Stamp `orgId` from parent lead/user.

### `src/hooks/useTodayFollowUps.js`

Ctrl+F:

```js
collectionGroup(db, "followups")
```

Add `where("orgId", "==", user.orgId)` if followups get stamped.

Ctrl+F:

```js
where("agentId", "==", userId),
```

Keep this, but add org filter.

## Customers

### `src/firebase/customersService.js`

Ctrl+F:

```js
const customersRef = collection(db, "customers");
```

All customer queries originate here. Add org filters.

Ctrl+F:

```js
export const addCustomer = async (customerData) => {
```

Require/stamp `orgId`.

Ctrl+F:

```js
normalizedEmail: normalizeEmail(customerData.email || ""),
normalizedMobile: normalizeMobile(customerData.mobile || ""),
```

Add `orgId` near normalized fields.

Ctrl+F:

```js
export const getAllCustomers = async () => {
```

Change to org-scoped query.

Ctrl+F:

```js
where("normalizedEmail", "==", cleanEmail)
```

Add org filter to duplicate checks; otherwise one org can block another org's customer.

Ctrl+F:

```js
where("normalizedMobile", "==", cleanMobile)
```

Same as email duplicate check.

Ctrl+F:

```js
query(collection(db, "leads"), where("customerId", "==", customerId))
```

Add `where("orgId", "==", orgId)`.

Ctrl+F:

```js
collection(db, COLLECTION, cid, "notes")
```

Nested customer notes. Optional stamp `orgId`.

Ctrl+F:

```js
getCountFromServer(collection(db, COLLECTION))
```

Change to count query with org filter.

## Quotations and Packages

### `src/firebase/quotations.js`

Ctrl+F:

```js
collection(db, "saved_packages_by_agents", agentId, "packages")
```

Add org filter where it is used for reads. Keep path unchanged.

Ctrl+F:

```js
return await addDoc(ref, {
```

Stamp `orgId` in `saveQuotationAs`.

Ctrl+F:

```js
const q = query(packagesRef, where("leadId", "==", leadId));
```

Add `where("orgId", "==", orgId)`.

Ctrl+F:

```js
const snapshot = await getDocs(collection(db, "hotels"));
```

Add org filter to lookup collections if hotels are org-owned.

Ctrl+F:

```js
const snapshot = await getDocs(collection(db, "locations"));
```

Add org filter if locations are org-owned.

Ctrl+F:

```js
const snapshot = await getDocs(collection(db, "transport"));
```

Add org filter if transport is org-owned.

Ctrl+F:

```js
const q = query(collection(db, "activities"), where("state", "==", state));
```

Add `where("orgId", "==", orgId)`.

### `src/firebase/services.js`

Ctrl+F:

```js
query(collection(db, "locations"), orderBy("name"))
```

Add org filter before orderBy.

Ctrl+F:

```js
query(collection(db, "hotels"), orderBy("name"))
```

Add org filter.

Ctrl+F:

```js
query(collection(db, "activities"), orderBy("name"))
```

Add org filter.

Ctrl+F:

```js
query(collection(db, "transport"), orderBy("name"))
```

Add org filter.

Ctrl+F:

```js
doc(db, `saved_packages_by_agents/${agentId}/packages`, customerId)
```

After read, verify returned document `orgId` before using.

Ctrl+F:

```js
await setDoc(docRef, dataToUpdate, { merge: true });
```

Ensure `dataToUpdate.orgId` is present/preserved.

### `src/app/hooks/useQuotationState.jsx`

Ctrl+F:

```js
collection(
        db,
        "saved_packages_by_agents",
```

Add org filter to quotation reads where query is built.

Ctrl+F:

```js
const snap = await getDocs(collection(db, "hotels"));
```

Add org filter.

Ctrl+F:

```js
const snap = await getDocs(collection(db, "transport"));
```

Add org filter.

Ctrl+F:

```js
const snap = await getDocs(collection(db, "locations"));
```

Add org filter.

Ctrl+F:

```js
where("state", "==", currentActivityState),
```

Add `where("orgId", "==", user.orgId)`.

Ctrl+F:

```js
await addDoc(ref, newData);
```

Ensure `newData.orgId` exists before saving quotation.

### `src/components/Create_new_package.jsx`

Ctrl+F:

```js
getDocs(collection(db, "customers"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
collection(doc(db, "saved_packages_by_agents", agentId), "packages")
```

Stamp `orgId` in the quotation payload.

Ctrl+F:

```js
collection(db, "customers"),
```

Customer created from quotation flow needs `orgId`.

## Bookings

### `src/firebase/bookingsService.js`

Ctrl+F:

```js
const COLLECTION = "bookings";
```

All booking reads/writes use this collection.

Ctrl+F:

```js
export const createBooking = async (data) => {
```

Require/stamp `data.orgId`.

Ctrl+F:

```js
bookingRef: generateBookingRef(),
```

Add `orgId` in the same payload.

Ctrl+F:

```js
where("agentId", "==", agentId),
```

Add `where("orgId", "==", orgId)`.

Ctrl+F:

```js
const snap = await getDoc(doc(db, COLLECTION, id));
```

Verify returned booking belongs to org.

### Booking Pages

Files:

- `src/app/agent-panel/bookings/page.jsx`
- `src/app/agent-panel/bookings/create/page.jsx`
- `src/app/agent-panel/bookings/[id]/page.jsx`
- `src/app/admin-panel/bookings/page.jsx`
- `src/app/admin-panel/bookings/create/page.jsx`
- `src/app/admin-panel/bookings/[id]/page.jsx`
- `src/app/admin-panel/team/bookings/page.jsx`

Ctrl+F:

```js
createBooking(
```

Pass `user.orgId`.

Ctrl+F:

```js
getBookingsByAgent(
```

Pass `user.orgId`.

Ctrl+F:

```js
getBookingsByAdmin(
```

Pass `user.orgId`.

## Invoices

### `src/firebase/invoicesService.js`

Ctrl+F:

```js
const COLLECTION = "invoices";
```

All invoice reads/writes use this collection.

Ctrl+F:

```js
export const createInvoice = async (data) => {
```

Require/stamp `data.orgId`.

Ctrl+F:

```js
where("agentId", "==", agentId)
```

Add `where("orgId", "==", orgId)`.

Ctrl+F:

```js
const snap = await getDoc(doc(db, COLLECTION, id));
```

Verify invoice belongs to org.

Ctrl+F:

```js
where("bookingId", "==", bookingId)
```

Add org filter.

### Invoice Pages

Files:

- `src/app/agent-panel/invoices/page.jsx`
- `src/app/agent-panel/invoices/create/page.jsx`
- `src/app/agent-panel/invoices/[id]/page.jsx`
- `src/app/admin-panel/invoices/page.jsx`
- `src/app/admin-panel/invoices/create/page.jsx`
- `src/app/admin-panel/invoices/[id]/page.jsx`

Ctrl+F:

```js
createInvoice(
```

Pass/stamp `user.orgId`.

Ctrl+F:

```js
getInvoicesByAgent(
```

Pass `user.orgId`.

Ctrl+F:

```js
getInvoicesByAdmin(
```

Pass `user.orgId`.

## Payment Accounts

### `src/firebase/paymentAccountsService.js`

Ctrl+F:

```js
const COLLECTION = "payment_accounts";
```

Payment accounts should be org-scoped.

Ctrl+F:

```js
export const createPaymentAccount = async (agentId, data) => {
```

Add `orgId` parameter or require `data.orgId`.

Ctrl+F:

```js
where("agentId", "==", agentId)
```

Add `where("orgId", "==", orgId)`.

### `src/app/agent-panel/settings/payment-accounts/page.jsx`

Ctrl+F:

```js
createPaymentAccount(
```

Pass `user.orgId`.

Ctrl+F:

```js
getPaymentAccountsByAgent(
```

Pass `user.orgId`.

## Vouchers

### `src/firebase/voucher.js`

Ctrl+F:

```js
export async function saveVoucherToFirestore(agentId, quotationId, voucherData) {
```

Require/stamp `voucherData.orgId`.

Ctrl+F:

```js
saved_packages_by_agents/${agentId}/standalone_vouchers
```

Standalone voucher docs need `orgId`.

Ctrl+F:

```js
saved_packages_by_agents/${agentId}/packages/${quotationId}/vouchers
```

Quotation-linked voucher docs need `orgId`.

Ctrl+F:

```js
collection(db, `saved_packages_by_agents/${agentId}/packages`)
```

When scanning packages, filter by `orgId` or verify each package before reading vouchers.

### Voucher Pages

Files:

- `src/app/agent-panel/vouchers/page.jsx`
- `src/app/agent-panel/vouchers/CreateHotelVoucherPage.jsx`
- `src/app/agent-panel/vouchers/hotelVoucher.jsx`
- `src/app/agent-panel/vouchers/create-hotel/page.jsx`
- `src/app/agent-panel/vouchers/create-flight/page.jsx`

Ctrl+F:

```js
saveVoucherToFirestore(
```

Pass `user.orgId` in voucher data.

Ctrl+F:

```js
fetchAllVouchersForAgent(
```

Pass org or verify against voucher/package `orgId`.

## Admin Service and Admin Pages

### `src/firebase/adminService.js`

Ctrl+F:

```js
export const getAgentsByAdmin = async (adminId) => {
```

Add `orgId` and filter agents by org.

Ctrl+F:

```js
export const getLeadsByAdmin = async (adminId) => {
```

Add `orgId` filter.

Ctrl+F:

```js
export const getUnassignedLeadsByAdmin = async (adminId) => {
```

Add `orgId` filter.

Ctrl+F:

```js
export const getBookingsByAdmin = async (adminId) => {
```

Add `orgId` filter.

Ctrl+F:

```js
export const getQuotationsByAdmin = async (agentIds) => {
```

Add `orgId` argument and filter package docs by `orgId`.

Ctrl+F:

```js
export const getInvoicesByAdmin = async (agentIds) => {
```

Replace fan-out only by `agentId` with org-scoped query.

Ctrl+F:

```js
export const getCustomersByAdmin = async (adminId) => {
```

Add `orgId` to the lead query and verify customer `orgId`.

Ctrl+F:

```js
export const getAdminDashboardStats = async (adminId) => {
```

Add `orgId` and pass to child functions.

### Admin Pages Calling `adminService`

Ctrl+F in these files:

```js
getLeadsByAdmin(user.uid)
```

Files:

- `src/app/admin-panel/leads/page.jsx`
- `src/app/admin-panel/team/leads/page.jsx`

Change to pass `user.orgId`.

Ctrl+F:

```js
getUnassignedLeadsByAdmin(user.uid)
```

File:

- `src/app/admin-panel/team/unassigned/page.jsx`

Change to pass `user.orgId`.

Ctrl+F:

```js
getBookingsByAdmin(user.uid)
```

Files:

- `src/app/admin-panel/bookings/page.jsx`
- `src/app/admin-panel/team/bookings/page.jsx`

Change to pass `user.orgId`.

Ctrl+F:

```js
getInvoicesByAdmin(agentIds)
```

File:

- `src/app/admin-panel/invoices/page.jsx`

Change to pass `user.orgId`.

Ctrl+F:

```js
getQuotationsByAdmin(agentIds)
```

Files:

- `src/app/admin-panel/quotations/page.jsx`
- `src/app/admin-panel/team/quotations/page.jsx`

Change to pass `user.orgId`.

Ctrl+F:

```js
getCustomersByAdmin(user.uid)
```

File:

- `src/app/admin-panel/team/customers/page.jsx`

Change to pass `user.orgId`.

## Hotels, Locations, Activities, Transport

### `src/firebase/hotels.js`

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter.

Ctrl+F:

```js
where("name", ">=", searchText)
```

Add org filter to search query.

### `src/firebase/accommodation.js`

Ctrl+F:

```js
doc(db, "hotels", hotelId)
```

Verify hotel org before update/delete; update payloads should preserve `orgId`.

### `src/firebase/hotelUploadFirestore.js`

Ctrl+F:

```js
const hotelRef = doc(db, "hotels", hotelId);
```

Uploaded hotel records need `orgId`.

Ctrl+F:

```js
await setDoc(hotelRef, {
```

Stamp `orgId`.

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter if locations are org-owned.

### `src/firebase/activities_service.js`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
query(collection(db, "activities"), where("state", "==", selectedState))
```

Add org filter.

### `src/firebase/resources.js`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "activities"))
```

Add org filter.

### `src/firebase/transport.js`

Ctrl+F:

```js
collection(db, "transport")
```

Add org filter for states.

Ctrl+F:

```js
collection(db, "transport", stateId, "packages")
```

Stamp/filter packages.

### `src/firebase/transportFeatures.js`

Same strings as `transport.js`.

### `src/firebase/transportService.js`

Ctrl+F:

```js
collection(db, "transport_states")
```

Add org filter if still used.

Ctrl+F:

```js
collection(db, "transport_packages")
```

Add org filter if still used.

### Direct Resource UI Files

Ctrl+F:

```js
addDoc(collection(db, "hotels")
```

Files:

- `src/components/accommodation/AddHotel.jsx`
- `src/app/admin-panel/accommodations/create/page.jsx`

Stamp `orgId`.

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Files:

- `src/components/accommodation/AddHotel.jsx`
- `src/app/admin-panel/accommodations/page.jsx`
- `src/app/admin-panel/accommodations/create/page.jsx`
- `src/app/agent-panel/vouchers/CreateHotelVoucherPage.jsx`

Add org filter.

Ctrl+F:

```js
addDoc(collection(db, "activities"), activityData)
```

File:

- `src/components/activity/AddActivity.jsx`

Add `orgId` to `activityData`.

Ctrl+F:

```js
getDocs(collection(db, "activities"))
```

File:

- `src/app/admin-panel/activities/page.jsx`

Add org filter.

Ctrl+F:

```js
setDoc(
        doc(collection(db, "transport", stateDoc.id, "packages"), newPackage.id),
```

File:

- `src/components/transports/CreatePackage.jsx`

Stamp `orgId` on transport package.

Ctrl+F:

```js
updateDoc(
        doc(db, "transport", stateId, "packages", packageId),
```

File:

- `src/components/transports/EditPackage.jsx`

Verify/preserve `orgId`.

## Custom Hotels

### `src/app/agent-panel/my-quotation/QuotationModals.jsx`

Ctrl+F:

```js
collection(db, "custom_hotels")
```

Add org filter to duplicate lookup.

Ctrl+F:

```js
addDoc(collection(db, "custom_hotels"), { ...payload, createdAt: new Date() })
```

Stamp `orgId`.

Ctrl+F:

```js
updateDoc(doc(db, "custom_hotels", existingDocId), payload)
```

Verify/preserve `orgId`.

## Itinerary Templates

### `src/components/ItinerarySection.jsx`

Ctrl+F:

```js
collection(db, "itinerary_templates")
```

Add org filter.

Ctrl+F:

```js
where("cities", "array-contains", city)
```

Add `where("orgId", "==", user.orgId)`.

### Template List/Create Pages

Files:

- `src/app/admin-panel/itinerary/page.jsx`
- `src/app/agent-panel/itinerary/page.jsx`
- `src/app/admin-panel/itinerary/create/page.jsx`
- `src/app/agent-panel/itinerary/create/page.jsx`

Ctrl+F:

```js
collection(db, "itinerary_templates")
```

Add org filter on reads.

Ctrl+F:

```js
await addDoc(collection(db, "itinerary_templates"), payload)
```

Stamp `payload.orgId`.

Ctrl+F:

```js
await updateDoc(doc(db, "itinerary_templates", itineraryId), payload)
```

Verify/preserve `payload.orgId`.

## Trips, Booking Forms, Submissions

### `src/firebase/form-services.js`

Ctrl+F:

```js
export const createTripForm = async (agentId, tripData) => {
```

Require/stamp `tripData.orgId`.

Ctrl+F:

```js
addDoc(collection(db, "trips"), {
```

Stamp `orgId`.

Ctrl+F:

```js
doc(db, "trips", tripId)
```

Verify returned trip org where caller has auth. Public pages derive org from this doc.

### `src/components/forms/CreateTripForm.jsx`

Ctrl+F:

```js
createTripForm(agentId, { tripName, journeys })
```

Pass `orgId`.

### `src/app/agent-panel/bookingform/page.jsx`

Ctrl+F:

```js
collection(db, "trips")
```

Add org filter.

Ctrl+F:

```js
where("agentId", "==", auth.currentUser.uid)
```

Add `where("orgId", "==", user.orgId)`.

### `src/app/book/[id]/page.jsx`

Ctrl+F:

```js
const docSnap = await getDoc(doc(db, "trips", tripId));
```

Public page should read trip and use `trip.orgId` for submissions/customers.

Ctrl+F:

```js
const submissionsRef = collection(db, "submissions");
```

Add `where("orgId", "==", trip.orgId)`.

Ctrl+F:

```js
await addDoc(collection(db, "submissions"), {
```

Stamp `orgId: trip.orgId`.

Ctrl+F:

```js
await addDoc(collection(db, "customers"), {
```

Stamp `orgId: trip.orgId`.

### `src/app/agent-panel/bookingform/view/[id]/page.jsx`

Ctrl+F:

```js
const tripSnap = await getDoc(doc(db, "trips", tripId));
```

Verify trip belongs to user org.

Ctrl+F:

```js
const submissionsRef = collection(db, "submissions");
```

Add org filter or use verified trip ownership.

## Public Enquiry

### `src/app/enquiry/[agentId]/page.jsx`

Ctrl+F:

```js
await updateDoc(doc(db, "customers", customer.id), updates);
```

Ensure customer belongs to owner org before update.

Ctrl+F:

```js
addCustomer(
```

If present, pass owner `orgId`.

Ctrl+F:

```js
createAssignedLead(
```

Pass owner `orgId`.

## Public Quotation Share / Preview

### `src/firebase/quotationShare.js`

Ctrl+F:

```js
collection(db, "quotation_shares")
```

Share records should include `orgId` when created or updated.

Ctrl+F:

```js
collectionGroup(db, "packages")
```

Token lookup is global by design. After finding the package, carry `orgId` forward.

Ctrl+F:

```js
const agentId = ref.parent.parent.id;
```

Also extract/return quotation `orgId`.

### `src/app/preview/[token]/page.jsx`

Ctrl+F:

```js
const cgRef = collectionGroup(db, "packages");
```

Global public token lookup. Verify token match, then use package `orgId`.

### `src/lib/serverQuotationResponse.js`

Ctrl+F:

```js
.collectionGroup("packages")
```

Global token lookup. Carry package `orgId`.

Ctrl+F:

```js
adminDb.collection("bookings").add({
```

Stamp booking `orgId` from quotation/package.

Ctrl+F:

```js
adminDb.collection("notifications").add({
```

Stamp notification `orgId`.

### `src/app/api/public/quotation-response/route.js`

Ctrl+F:

```js
handleQuotationResponse
```

Verify helper stamps org on downstream records.

## Notifications and Push

### `src/firebase/notificationsService.js`

Ctrl+F:

```js
export async function createNotification({ userId, type, title, message, link = "/", metadata = {}, priority = "normal" }) {
```

Add `orgId` argument and stamp it.

Ctrl+F:

```js
where("userId", "==", userId),
```

Add `where("orgId", "==", orgId)` where caller has org.

Ctrl+F:

```js
doc(db, "pushSubscriptions", subscription.endpoint.slice(-32))
```

Stamp push subscription `orgId` if available.

### API Push Routes

Files:

- `src/app/api/send-push/route.js`
- `src/app/api/test-push/route.js`

Ctrl+F:

```js
collection(db, "pushSubscriptions")
```

Add org filter if request includes trusted org context.

## Cron Jobs and System Logs

### `src/app/api/cron/check-installments/route.js`

Ctrl+F:

```js
collection(db, "bookings")
```

System scan can remain global, but emitted notifications/logs should use booking `orgId`.

Ctrl+F:

```js
doc(db, "installmentNotifSent", key)
```

Optional: include `orgId` in log payload.

### `src/app/api/cron/check-followups/route.js`

Ctrl+F:

```js
query(collection(db, "leads"), where("agentId", "!=", null))
```

System scan can remain global. Use lead `orgId` for notifications.

Ctrl+F:

```js
collection(db, "leads", lead.id, "followups")
```

Followups should have `orgId` or inherit from lead.

### `src/app/api/cron/check-cold-leads/route.js`

Ctrl+F:

```js
collection(db, "leads")
```

System scan can remain global. Use lead `orgId` for logs/notifications.

Ctrl+F:

```js
doc(db, "coldLeadClosedLog", key)
```

Optional: include `orgId` in log payload.

## Dashboard Hooks and Components

### `src/components/dashboard/RevenueChart.jsx`

Ctrl+F:

```js
query(collection(db, "invoices"), where("agentId", "==", agentId))
```

Add org filter.

### `src/components/dashboard/FollowUpCalendar.jsx`

Ctrl+F:

```js
query(collection(db, "leads"), where("agentId", "==", user.uid))
```

Add org filter.

### `src/hooks/useInstallmentAlerts.js`

Ctrl+F:

```js
collection(db, "bookings")
```

Add org filter if hook receives `orgId`; otherwise verify via user.

Ctrl+F:

```js
where("agentId", "==", userId)
```

Add `where("orgId", "==", orgId)`.

## Signup, Superadmin, Permissions

### `src/app/signup/page.jsx`

Ctrl+F:

```js
await setDoc(doc(db, collectionName, user.uid), {
```

For admin/agent signup, decide how `orgId` gets assigned. Usually leave pending/null until superadmin assigns org.

### `src/app/superadmin/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "admins"))
```

Superadmin stays global.

Ctrl+F:

```js
getDocs(collection(db, "agents"))
```

Superadmin stays global.

### Permission Files

Files:

- `src/components/AgentPermissionsManager.jsx`
- `src/components/AdminPermissionsManager.jsx`
- `src/app/hooks/useAgentPermissions.jsx`

Ctrl+F:

```js
agentPermissions
```

Can stay keyed by user ID unless permissions become org-specific.

Ctrl+F:

```js
adminPermissions
```

Can stay keyed by user ID unless permissions become org-specific.

## Admin SDK / Server Files

### `functions/index.js`

Ctrl+F:

```js
db.collection("users").doc(userId)
```

If this function handles notifications/tokens, include org if available from user doc.

### `src/lib/serverAuth.js`

Ctrl+F:

```js
adminDb.collection(entry.collection).doc(uid).get()
```

Return `orgId` to server routes.

### `src/app/api/ai-itinerary/route.js`

Ctrl+F:

```js
adminDb.collection(collectionName).doc(uid).get()
```

Read caller `orgId` and pass into generated/saved data.

### `src/app/api/ai-itinerary-template/route.js`

Same Ctrl+F:

```js
adminDb.collection(collectionName).doc(uid).get()
```

### `src/app/api/ai/hotel-details/route.js`

Same Ctrl+F:

```js
adminDb.collection(collectionName).doc(uid).get()
```

### `src/lib/hotelSeasonCleanup.js`

Ctrl+F:

```js
adminDb.collection("locations").get()
```

If locations become org-owned, cleanup must run per org or preserve org boundaries.

Ctrl+F:

```js
adminDb.collection("hotels").get()
```

If hotels become org-owned, cleanup must run per org or preserve org boundaries.

## Legacy / Review Needed

### `src/firebase/quotationRef.js`

Ctrl+F:

```js
doc(db, "meta", "quotationCounter")
```

Global counter. If quotation numbering should be per org, change key to include `orgId`.

### `src/firebase/voucher.js`

Ctrl+F:

```js
doc(db, "config", "voucher_counters")
```

Global voucher counter. If voucher numbering should be per org, change counter document/fields to include `orgId`.

### `src/firebase/invoicesService.js`

Ctrl+F:

```js
doc(db, "config", "voucher_counters")
```

Invoice counter is global today. If invoice numbers should be per org, change counter key to include `orgId`.

### `src/firebase/bookingform.js`

Ctrl+F:

```js
//     const ref = collection(db,"agents",id)
```

Commented old code. No org work unless revived.
