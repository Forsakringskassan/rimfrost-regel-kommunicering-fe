import { getActivePinia } from "pinia";
import { env } from "../config/env";

/**
 * The portal (rimfrost-portal-handlaggare) keeps the logged-in handläggare's
 * token in its `handlaggareStore`, and passes this remote only a
 * handlaggningId. Pinia is shared as a singleton, so the remote reads the
 * portal's store state directly — by id, without importing the portal's code.
 */
const PORTAL_STORE_ID = "handlaggareStore";

/**
 * The token bffFetch sends on every call; the rule service refuses any call
 * without one with 401. Falls back to VITE_DEV_BEARER_TOKEN in
 * standalone dev, where there is no portal and so no handlaggareStore. Null
 * when neither has a token.
 */
export function hamtaBearerToken(): string | null {
  const portalState = getActivePinia()?.state.value[PORTAL_STORE_ID] as
    | { bearerToken?: unknown }
    | undefined;
  const portalToken = typeof portalState?.bearerToken === "string" ? portalState.bearerToken : "";
  return portalToken || env.devBearerToken || null;
}
