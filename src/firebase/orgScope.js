import { where } from "firebase/firestore";

export function orgFilter(orgId) {
  return orgId ? [where("orgId", "==", orgId)] : [];
}

export function belongsToOrg(data, orgId) {
  return !orgId || data?.orgId === orgId;
}

