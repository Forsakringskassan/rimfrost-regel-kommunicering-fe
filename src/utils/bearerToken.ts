import { getActivePinia } from "pinia";
import { env } from "../config/env";
import { useKommuniceringStore } from "../stores/KommuniceringStore";

/**
 * Fallback only: portals from before PORT-FR-03.6 pass no `authorization` prop
 * but keep the logged-in handläggare's raw token (no `Bearer ` prefix) in their
 * `handlaggareStore`. Pinia is shared as a singleton, so the remote can read
 * that state by id without importing the portal's code. Remove once every
 * portal in use passes the prop.
 */
const PORTAL_STORE_ID = "handlaggareStore";

function portalensToken(): string {
  const portalState = getActivePinia()?.state.value[PORTAL_STORE_ID] as
    | { bearerToken?: unknown }
    | undefined;
  return typeof portalState?.bearerToken === "string" ? portalState.bearerToken : "";
}

/**
 * The full Authorization header value bffFetch sends on every call; the rule
 * service refuses any call without one with 401. In order:
 * 1. the `authorization` prop from the portal (PORT-FR-03.6), already a complete
 *    header value and sent unchanged,
 * 2. the portal's `handlaggareStore` token (older portals, see above),
 * 3. VITE_DEV_BEARER_TOKEN in standalone dev, where there is no portal.
 * Null when none has a token.
 */
export function hamtaAuthorization(): string | null {
  const fromProp = useKommuniceringStore().authorization;
  if (fromProp) {
    return fromProp;
  }
  const token = portalensToken() || env.devBearerToken;
  return token ? `Bearer ${token}` : null;
}
