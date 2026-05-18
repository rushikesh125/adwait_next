# Multi-Organization Architecture Plan

Let me analyze your existing DB structure and design a clean org layer on top of it.Here's the full architecture plan — visual first, then the detailed breakdown.---

## The core idea: `orgId` as the universal scope key

Every document that currently exists gets one new field: `orgId`. All queries become scoped by it. That's the migration in one sentence. Here's the full plan:

---

## 1. New `organizations` collection

```
organizations/{orgId}
  id: string
  name: string              // "Adwait Tours"
  slug: string              // "adwait-tours" (for subdomain or URL)
  plan: string              // "basic" | "pro" | "enterprise"
  ownerId: string           // super_admin uid who created it
  createdAt: timestamp
  isActive: boolean
```

Super-admin creates this document. Everything else hangs off `orgId`.

---

## 2. Changes to existing user collections

**`admins/{uid}`** — add `orgId` field. An admin belongs to exactly one org. Super-admin assigns this during or after org creation.

**`agents/{uid}`** — already has `adminId`. Add `orgId` as well (so agents can be queried directly by org without going through admin). On signup, the agent either gets auto-assigned based on invite link or super-admin assigns manually.

**`agentPermissions/{uid}` / `adminPermissions/{uid}`** — add `orgId` for consistent querying.

**Signup flow**: when a new admin/agent registers, their document is created with `approved: "pending"` and `orgId: null`. Super-admin then assigns them to an org from the dashboard, which sets `orgId` and flips `approved: "accepted"`.

---

## 3. All data collections get `orgId`

Every document in these collections needs the field added — either at write time (new docs) or via a migration script (existing docs):

`leads`, `customers`, `bookings`, `invoices`, `quotations`, `hotels`, `custom_hotels`, `transport`, `activities`, `packages`, `created_packages`, `itinerary_templates`, `trips`, `submissions`, `notifications`, `followupNotifSent`, `installmentNotifSent`, `pushSubscriptions`, `saved_packages_by_agents`

**`config`** is tricky — your current `voucher_counters` doc is global. You'd want `config/{orgId}` instead, so each org has its own invoice counter, hotel counter, etc.

**`meta/quotationCounter`** — same pattern, move to `meta/{orgId}_quotationCounter` or a subcollection.

---

## 4. Firestore Security Rules

This is where the hard isolation lives. The rules enforce that no query can return data outside the caller's org:

```javascript
// Simplified rule pattern for every scoped collection
match /leads/{docId} {
  allow read, write: if request.auth != null
    && get(/databases/$(database)/documents/agents/$(request.auth.uid)).data.orgId
       == resource.data.orgId;
}
```

For super-admins: they bypass the `orgId` check and can read/write all orgs. You'd add a helper function:

```javascript
function isSuperAdmin() {
  return exists(/databases/$(database)/documents/super_admins/$(request.auth.uid));
}

function callerOrgId() {
  // Try agent first, then admin
  let agent = get(/databases/.../agents/$(request.auth.uid)).data;
  return agent.orgId;
}
```

---

## 5. Application-layer enforcement

Rules are the safety net, but your app queries must also always filter by `orgId`:

```javascript
// Every query looks like this now
const leads = await db.collection('leads')
  .where('orgId', '==', currentUser.orgId)
  .get();
```

Store `orgId` in the auth token's custom claims (via Firebase Admin SDK) so every client has it immediately without an extra Firestore lookup:

```javascript
// On login / org assignment, set custom claim
await admin.auth().setCustomUserClaims(uid, { orgId: 'abc123', role: 'agent' });
```

Then in rules you can use `request.auth.token.orgId` directly — much faster than a Firestore `get()` on every request.

---

## 6. Super-admin dashboard flows

**Create org** → writes to `organizations`, gets back `orgId`.

**Assign admin to org** → updates `admins/{uid}` with `orgId`, optionally also `approved: "accepted"`.

**Assign agent to org** → same for `agents/{uid}`.

**View all orgs** → reads `organizations` collection (only super-admin can do this).

**Switch org view** → super-admin can pass any `orgId` as a filter to see that org's data for support purposes.

---

## 7. Migration for existing data

For your current data, a one-time script:

1. Identify the `orgId` of the single existing organization (create one if needed — call it the "default org").
2. For every document in every scoped collection, if `orgId` is missing, set it to that default `orgId`.
3. Update `admins` and `agents` with their `orgId`.
4. Deploy updated security rules.

This keeps all existing data intact and working — it just gets tagged to an org.

---

## What stays global (not org-scoped)

`super_admins`, `organizations`, and `creds` remain at the root level, unscoped. Everything else gets `orgId`.