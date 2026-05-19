# Org Layer Direct Firebase Calls

This file is only for places outside `src/firebase` that call Firestore directly. These are easy to miss because they bypass service functions.

Search command used:

```powershell
rg -n "collection\(|doc\(|collectionGroup\(|addDoc\(|setDoc\(|updateDoc\(|deleteDoc\(|getDocs\(|getDoc\(|query\(|where\(" src --glob '!src/firebase/**' --glob '!src/components/ui/**'
```

## Must Patch First

These files directly read/write business data and should get `orgId` before most UI testing.

### `src/components/Create_new_package.jsx`

Ctrl+F:

```js
getDocs(collection(db, "customers"))
```

Add `where("orgId", "==", user.orgId)`.

Ctrl+F:

```js
getDoc(doc(db, "customers", customerId))
```

Verify the customer belongs to `user.orgId`.

Ctrl+F:

```js
getDoc(doc(db, "leads", leadId))
```

Verify the lead belongs to `user.orgId`.

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter if hotels are org-owned.

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter if locations are org-owned.

Ctrl+F:

```js
doc(db, "saved_packages_by_agents", agentId, "packages", quotationId)
```

On update, verify/preserve quotation `orgId`.

Ctrl+F:

```js
collection(doc(db, "saved_packages_by_agents", agentId), "packages")
```

On create, stamp `orgId: user.orgId`.

Ctrl+F:

```js
collection(db, "customers"),
```

Customer created from quotation flow needs `orgId: user.orgId`.

### `src/app/hooks/useQuotationState.jsx`

Ctrl+F:

```js
collection(
        db,
        "saved_packages_by_agents",
```

Add `where("orgId", "==", user.orgId)` to package reads.

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "transport"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
collection(db, "activities")
```

Add `where("orgId", "==", user.orgId)`.

Ctrl+F:

```js
await updateDoc(ref, editingQuotation)
```

Preserve `editingQuotation.orgId`.

Ctrl+F:

```js
await addDoc(ref, newData)
```

Stamp `newData.orgId`.

### `src/app/agent-panel/my-quotation/edit/[cid]/page.jsx`

Use `Get-Content -LiteralPath` because `[cid]` is a PowerShell wildcard.

Ctrl+F:

```js
const packagesRef = collection(
```

Add org filter to the quotation lookup by `leadId` / `customerId`.

Ctrl+F:

```js
or(
            where("leadId", "==", params.cid),
            where("customerId", "==", params.cid),
          ),
```

Add `where("orgId", "==", user.orgId)` outside the `or(...)`.

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
getDocs(collection(db, "transport"))
```

Add org filter.

Ctrl+F:

```js
collection(db, "transport", stateId, "packages")
```

Filter/verify transport package org.

Ctrl+F:

```js
query(collection(db, "activities"), where("state", "==", currentState))
```

Add org filter.

Ctrl+F:

```js
collection(db, "saved_packages_by_agents", agentId, "packages")
```

Stamp `orgId` when saving as new quotation.

### `src/app/agent-panel/page.jsx`

Ctrl+F:

```js
query(collection(db, "leads"), where("agentId", "==", user.uid))
```

Add org filter.

Ctrl+F:

```js
collection(db, "saved_packages_by_agents", user.uid, "packages")
```

Add org filter or verify package docs have `orgId === user.orgId`.

### `src/app/agent-panel/leads/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "customers"))
```

Add org filter before showing customers in lead form/search.

### `src/app/agent-panel/my-quotation/page.jsx`

Ctrl+F:

```js
getDoc(doc(db, "leads", quotation.leadId))
```

Verify lead org matches `user.orgId`.

Ctrl+F:

```js
doc(db, "customers", quotation.customerId)
```

Verify customer org matches `user.orgId`.

### `src/app/agent-panel/my-quotation/QuotationModals.jsx`

Ctrl+F:

```js
collection(db, "custom_hotels")
```

Add org filter to duplicate lookup.

Ctrl+F:

```js
updateDoc(doc(db, "custom_hotels", existingDocId), payload)
```

Verify existing custom hotel org and preserve `orgId`.

Ctrl+F:

```js
addDoc(collection(db, "custom_hotels"), { ...payload, createdAt: new Date() })
```

Stamp `orgId`.

### `src/components/package/CustomHotelForm.jsx`

This is another custom hotel writer outside the quotation modal.

Ctrl+F:

```js
collection(db, "custom_hotels")
```

Add `where("orgId", "==", user.orgId)` to duplicate lookup. This component currently has no `user`, so pass `orgId` as a prop or read from Redux.

Ctrl+F:

```js
await updateDoc(doc(db, "custom_hotels", existingDocId), payload);
```

Verify/preserve `orgId`.

Ctrl+F:

```js
const ref = await addDoc(collection(db, "custom_hotels"), {
```

Stamp `orgId`.

### `src/components/package/ActivitySelector.jsx`

Ctrl+F:

```js
getDocs(query(collection(db, "activities"), where("state", "==", selectedState)))
```

Add `where("orgId", "==", orgId)`. This component currently has no user/org prop, so pass `orgId` in.

### `src/components/package/TransportSelector.jsx`

Ctrl+F:

```js
getDocs(collection(db, "transport"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "transport", selectedStateId, "packages"))
```

Filter/verify package org.

## Resource Admin Components

### `src/components/accommodation/AddHotel.jsx`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
doc(db, "hotels", editHotelId)
```

Verify hotel org before editing.

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter.

Ctrl+F:

```js
addDoc(collection(db, "hotels"), {
```

Stamp `orgId`.

Ctrl+F:

```js
updateDoc(doc(db, "locations", stateDoc.id)
```

Verify location org before mutating city lists.

Ctrl+F:

```js
updateDoc(doc(db, "hotels", editHotelId)
```

Preserve `orgId`.

### `src/app/admin-panel/accommodations/create/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
getDoc(doc(db, "hotels", editHotelId))
```

Verify hotel org.

Ctrl+F:

```js
updateDoc(doc(db, "locations", stateDoc.id)
```

Verify location org before update.

Ctrl+F:

```js
updateDoc(doc(db, "hotels", editHotelId), payload)
```

Preserve `orgId`.

Ctrl+F:

```js
addDoc(collection(db, "hotels"), {
```

Stamp `orgId`.

Ctrl+F:

```js
updateDoc(doc(db, "hotels", savedHotelId)
```

Verify/preserve hotel org for room updates.

### `src/app/admin-panel/accommodations/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "hotels"))
```

Add org filter.

### `src/components/activity/AddActivity.jsx`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
getDoc(doc(db, "locations", selectedDoc.id))
```

Verify location org.

Ctrl+F:

```js
updateDoc(stateRef, { cities: arrayUnion(newCityObj) })
```

Verify location org before mutation.

Ctrl+F:

```js
addDoc(collection(db, "activities"), activityData)
```

Stamp `activityData.orgId`.

### `src/components/activity/EditActivity.jsx`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
doc(db, "activities", activityId)
```

Verify activity org before edit/delete.

Ctrl+F:

```js
updateDoc(activityRef, {
```

Preserve `orgId`.

Ctrl+F:

```js
deleteDoc(doc(db, "activities", activityId))
```

Verify org before delete.

### `src/app/admin-panel/activities/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "activities"))
```

Add org filter.

Ctrl+F:

```js
deleteDoc(doc(db, "activities", activityId))
```

Verify org before delete.

### `src/components/transports/CreatePackage.jsx`

Ctrl+F:

```js
getDocs(collection(db, "transport"))
```

Add org filter.

Ctrl+F:

```js
doc(collection(db, "transport", stateDoc.id, "packages"), newPackage.id)
```

Stamp `orgId` on transport package.

Ctrl+F:

```js
updateDoc(stateDocRef, {
```

If state doc stores embedded `packages`, preserve org boundaries.

### `src/components/transports/EditPackage.jsx`

Ctrl+F:

```js
doc(db, "transport", stateId)
```

Verify state doc org.

Ctrl+F:

```js
doc(db, "transport", stateId, "packages", packageId)
```

Verify package org.

Ctrl+F:

```js
deleteDoc(doc(db, "transport", stateId, "packages", packageId))
```

Verify org before delete.

### `src/app/admin-panel/transports/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "transport"))
```

Add org filter.

Ctrl+F:

```js
getDocs(collection(db, "transport", stateDoc.id, "packages"))
```

Filter/verify package org.

## Itinerary Direct Calls

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

Add `where("orgId", "==", orgId)`.

Ctrl+F:

```js
query(collection(db, "activities"), where("state", "==", selectedState))
```

Add org filter.

### `src/app/admin-panel/itinerary/page.jsx`

Ctrl+F:

```js
collection(db, "itinerary_templates")
```

Add org filter for list.

Ctrl+F:

```js
deleteDoc(doc(db, "itinerary_templates", id))
```

Verify org before delete.

Ctrl+F:

```js
updateDoc(doc(db, "itinerary_templates", item.id), { status })
```

Verify org before status update.

### `src/app/agent-panel/itinerary/page.jsx`

Same as admin itinerary list.

Ctrl+F:

```js
collection(db, "itinerary_templates")
```

Add org filter.

### `src/app/admin-panel/itinerary/create/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "locations"))
```

Add org filter.

Ctrl+F:

```js
getDoc(doc(db, "itinerary_templates", itineraryId))
```

Verify template org.

Ctrl+F:

```js
query(collection(db, "activities"), where("state", "==", s))
```

Add org filter.

Ctrl+F:

```js
updateDoc(doc(db, "itinerary_templates", itineraryId), payload)
```

Preserve/stamp `payload.orgId`.

Ctrl+F:

```js
addDoc(collection(db, "itinerary_templates"), payload)
```

Stamp `payload.orgId`.

### `src/app/agent-panel/itinerary/create/page.jsx`

Same direct calls as admin create page.

Ctrl+F:

```js
addDoc(collection(db, "itinerary_templates"), payload)
```

Stamp `payload.orgId`.

## Booking Form / Public Form Direct Calls

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

Ctrl+F:

```js
updateDoc(doc(db, "trips", tripId), { status: newStatus })
```

Verify trip org before update.

Ctrl+F:

```js
deleteDoc(doc(db, "trips", tripId))
```

Verify trip org before delete.

### `src/app/book/[id]/page.jsx`

Public form. It has no logged-in user.

Ctrl+F:

```js
getDoc(doc(db, "trips", tripId))
```

Read `trip.orgId` and use it for all writes below.

Ctrl+F:

```js
const submissionsRef = collection(db, "submissions")
```

Add `where("orgId", "==", trip.orgId)`.

Ctrl+F:

```js
addDoc(collection(db, "submissions"), {
```

Stamp `orgId: trip.orgId`.

Ctrl+F:

```js
addDoc(collection(db, "customers"), {
```

Stamp `orgId: trip.orgId`.

### `src/app/agent-panel/bookingform/view/[id]/page.jsx`

Ctrl+F:

```js
getDoc(doc(db, "trips", tripId))
```

Verify trip org.

Ctrl+F:

```js
const submissionsRef = collection(db, "submissions")
```

Add org filter from verified trip.

Ctrl+F:

```js
deleteDoc(doc(db, "submissions", deleteTarget.id))
```

Verify submission/trip org before delete.

Ctrl+F:

```js
doc(db, "submissions", editTarget.id)
```

Verify org before update.

## Dashboard and Hooks

### `src/components/dashboard/RevenueChart.jsx`

Ctrl+F:

```js
query(collection(db, "invoices"), where("agentId", "==", agentId))
```

Add org filter. Pass `orgId` as prop or read Redux.

### `src/components/dashboard/FollowUpCalendar.jsx`

Ctrl+F:

```js
query(collection(db, "leads"), where("agentId", "==", user.uid))
```

Add `where("orgId", "==", user.orgId)`.

Ctrl+F:

```js
collection(db, "leads", leadDoc.id, "followups")
```

Nested followups should inherit verified lead org; optional filter if stamped.

### `src/hooks/useTodayFollowUps.js`

Ctrl+F:

```js
collectionGroup(db, "followups")
```

Add org filter if followups are stamped.

### `src/hooks/useInstallmentAlerts.js`

Ctrl+F:

```js
collection(db, "bookings")
```

Add org filter if hook receives `orgId`.

Ctrl+F:

```js
doc(db, "installmentNotifSent", key)
```

Optional log doc should include `orgId`.

## Public Quotation and Public Enquiry

### `src/app/preview/[token]/page.jsx`

Ctrl+F:

```js
const cgRef = collectionGroup(db, "packages")
```

Global token lookup is fine. After finding the package, use package `orgId`.

### `src/lib/serverQuotationResponse.js`

Ctrl+F:

```js
adminDb.collection("notifications").add({
```

Stamp `orgId` from quotation/package.

Ctrl+F:

```js
.collectionGroup("packages")
```

Global token lookup. Carry package `orgId`.

Ctrl+F:

```js
adminDb.collection("bookings").add({
```

Stamp booking `orgId`.

### `src/app/enquiry/[agentId]/page.jsx`

Ctrl+F:

```js
updateDoc(doc(db, "customers", customer.id), updates)
```

Verify customer belongs to the enquiry owner's `orgId`.

This page also creates or updates lead/customer data through service calls. Pass the owner `orgId` into those calls.

## Push, Cron, API Routes

### `src/app/api/send-push/route.js`

Ctrl+F:

```js
query(collection(db, "pushSubscriptions"), where("userId", "==", userId))
```

Add org filter if trusted `orgId` is available.

### `src/app/api/test-push/route.js`

Same as send-push.

Ctrl+F:

```js
query(collection(db, "pushSubscriptions"), where("userId", "==", userId))
```

### `src/app/api/cron/check-installments/route.js`

Ctrl+F:

```js
collection(db, "bookings")
```

System scan can stay global, but logs/notifications should include booking `orgId`.

### `src/app/api/cron/check-followups/route.js`

Ctrl+F:

```js
query(collection(db, "leads"), where("agentId", "!=", null))
```

System scan can stay global, but notifications should include lead `orgId`.

### `src/app/api/cron/check-cold-leads/route.js`

Ctrl+F:

```js
collection(db, "leads")
```

System scan can stay global, but logs/notifications should include lead `orgId`.

### `src/app/api/ai-itinerary/route.js`

Ctrl+F:

```js
adminDb.collection(collectionName).doc(uid).get()
```

Read caller org and pass `orgId` into generated/saved output.

### `src/app/api/ai-itinerary-template/route.js`

Same as above.

### `src/app/api/ai/hotel-details/route.js`

Same as above.

### `src/app/api/check-permissions/route.js`

Ctrl+F:

```js
adminDb.collection(collectionName).doc(targetUid).get()
```

Permissions are user-scoped today. If checking another user's permissions, verify same org unless caller is superadmin.

## Superadmin / Org Manager / Permissions

### `src/app/superadmin/page.jsx`

Ctrl+F:

```js
getDocs(collection(db, "admins"))
```

Superadmin global view. No org filter.

Ctrl+F:

```js
getDocs(collection(db, "agents"))
```

Superadmin global view. No org filter.

### `src/components/OrganizationsManager.jsx`

Ctrl+F:

```js
getDocs(query(collection(db, "admins"), where("orgId", "==", org.id)))
```

Already org-aware.

Ctrl+F:

```js
getDocs(query(collection(db, "agents"), where("orgId", "==", org.id)))
```

Already org-aware.

Ctrl+F:

```js
addDoc(collection(db, "organizations"), {
```

Organizations are global and should not get `orgId`.

### `src/components/AgentPermissionsManager.jsx`

Ctrl+F:

```js
getDocs(collection(db, "agents"))
```

If this is superadmin-only, global is okay. If admin can access it, filter by org.

Ctrl+F:

```js
doc(db, "agentPermissions", agent.id)
```

Can stay user-keyed unless permissions become org-specific.

### `src/components/AdminPermissionsManager.jsx`

Ctrl+F:

```js
getDocs(collection(db, "admins"))
```

If this is superadmin-only, global is okay.

Ctrl+F:

```js
doc(db, "adminPermissions", admin.id)
```

Can stay user-keyed unless permissions become org-specific.

### `src/app/hooks/useAgentPermissions.jsx`

Ctrl+F:

```js
doc(db, collectionName, uid)
```

Permissions can stay user-keyed. Verify org only if users can inspect other users' permissions.

## Small Direct Helper Files

### `src/lib/hotelBookingRequestWhatsapp.js`

Ctrl+F:

```js
query(collection(db, "hotels"), where("name", "==", hotelName), limit(10))
```

Add org filter or pass org into helper.

### `src/lib/hotelSeasonCleanup.js`

Ctrl+F:

```js
adminDb.collection("locations").get()
```

If locations are org-owned, cleanup must run per org.

Ctrl+F:

```js
adminDb.collection("hotels").get()
```

If hotels are org-owned, cleanup must preserve org boundaries.

### `src/lib/serverAuth.js`

Ctrl+F:

```js
adminDb.collection(entry.collection).doc(uid).get()
```

Return `orgId` for server-side route authorization.

## Direct Call File Inventory

These files contain direct Firestore calls outside `src/firebase`:

```txt
src/hooks/useTodayFollowUps.js
src/hooks/useInstallmentAlerts.js
src/lib/hotelBookingRequestWhatsapp.js
src/lib/hotelSeasonCleanup.js
src/components/AgentPermissionsManager.jsx
src/components/AdminPermissionsManager.jsx
src/components/dashboard/RevenueChart.jsx
src/components/dashboard/FollowUpCalendar.jsx
src/lib/serverQuotationResponse.js
src/lib/serverAuth.js
src/components/activity/EditActivity.jsx
src/components/AuthSetup.jsx
src/components/Create_new_package.jsx
src/components/activity/AddActivity.jsx
src/components/OrganizationsManager.jsx
src/components/ItinerarySection.jsx
src/components/package/CustomHotelForm.jsx
src/components/accommodation/AddHotel.jsx
src/components/package/ActivitySelector.jsx
src/components/transports/EditPackage.jsx
src/components/transports/CreatePackage.jsx
src/components/package/TransportSelector.jsx
src/app/admin-panel/activities/page.jsx
src/app/admin-panel/accommodations/page.jsx
src/app/book/[id]/page.jsx
src/app/api/ai-itinerary/route.js
src/app/api/ai-itinerary-template/route.js
src/app/api/ai/hotel-details/route.js
src/app/hooks/useQuotationState.jsx
src/app/hooks/useAgentPermissions.jsx
src/app/admin-panel/accommodations/create/page.jsx
src/app/admin-panel/itinerary/page.jsx
src/app/admin-panel/transports/page.jsx
src/app/superadmin/page.jsx
src/app/admin-panel/itinerary/create/page.jsx
src/app/agent-panel/vouchers/CreateHotelVoucherPage.jsx
src/app/agent-panel/page.jsx
src/app/api/cron/check-installments/route.js
src/app/enquiry/[agentId]/page.jsx
src/app/api/cron/check-followups/route.js
src/app/api/superadmin/route.js
src/app/api/cron/check-cold-leads/route.js
src/app/agent-panel/my-quotation/QuotationModals.jsx
src/app/agent-panel/my-quotation/page.jsx
src/app/signup/page.jsx
src/app/api/check-permissions/route.js
src/app/api/send-push/route.js
src/app/api/test-push/route.js
src/app/preview/[token]/page.jsx
src/app/agent-panel/bookingform/page.jsx
src/app/agent-panel/leads/page.jsx
src/app/agent-panel/my-quotation/edit/[cid]/page.jsx
src/app/agent-panel/itinerary/create/page.jsx
src/app/agent-panel/itinerary/page.jsx
src/app/agent-panel/bookingform/view/[id]/page.jsx
```

