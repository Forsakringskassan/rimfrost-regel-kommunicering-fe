import { env, ensureEnvLoaded } from "../config/env";
import { hamtaAuthorization } from "./bearerToken";

/**
 * Every call to the BFF goes through here, so the base URL and the token have
 * one home. The rule service checks the handläggare's identity and access on
 * every call, and the BFF passes Authorization on, so the token goes along
 * whenever there is one. Without one the call is still sent and refused with
 * 401, which the callers report as OBEHORIG.
 */
export async function bffFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await ensureEnvLoaded();
  const headers = new Headers(init.headers);
  const authorization = hamtaAuthorization();
  if (authorization && !headers.has("Authorization")) {
    headers.set("Authorization", authorization);
  }
  return fetch(`${env.bffUrl}${path}`, { ...init, headers });
}

/** 401 or 403: the token is missing, invalid, or not allowed on this task. */
export function arObehorig(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}

/** The one place the BFF's non-2xx answers become an exception. */
export function assertOk(response: Response): void {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/** Reads a JSON body, refusing anything else (e.g. an HTML error page). */
export async function readJson<T>(response: Response): Promise<T> {
  assertOk(response);

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Response is not JSON. Got: ${text.substring(0, 100)}`);
  }

  return (await response.json()) as T;
}

export const TASK_PATH = "/api/task";

/** The BFF takes the handlaggningId in the path on every task call. */
export function taskPath(handlaggningId: string): string {
  return `${TASK_PATH}/${encodeURIComponent(handlaggningId)}`;
}
