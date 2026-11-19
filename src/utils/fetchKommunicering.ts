import { arObehorig, bffFetch, readJson, taskPath } from "./bffClient";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { HAMTNING_MISSLYCKADES, OBEHORIG } from "../meddelanden";
import type { GetDataResponse } from "../types";

/**
 * GET /api/task/{handlaggningId} — the BFF's read, which answers with the rule
 * service's GetDataResponse. A GET all the way: frontend → BFF → rule service.
 *
 * Puts the kund in the store and returns the whole response for the component
 * to build its form from, or null when the load failed or was superseded.
 *
 * Pass `signal` when the load can be superseded: the store is the host's Pinia
 * singleton, so an aborted call must leave `loading` and `error` to whoever
 * replaced it.
 */
export async function fetchKommunicering(
  handlaggningId: string,
  signal?: AbortSignal,
): Promise<GetDataResponse | null> {
  const store = useKommuniceringStore();
  store.loading = true;

  try {
    const response = await bffFetch(taskPath(handlaggningId), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (arObehorig(response)) {
      if (!signal?.aborted) {
        store.error = OBEHORIG;
      }
      return null;
    }
    const data = await readJson<GetDataResponse>(response);
    if (signal?.aborted) {
      return null;
    }
    if (!data || !Array.isArray(data.ersattningar)) {
      throw new Error("Invalid response format from BFF");
    }
    store.error = null;
    store.kund = data.kund ?? null;
    return data;
  } catch (error) {
    if (signal?.aborted) {
      return null;
    }
    console.error("Error fetching kommunicering:", error);
    store.error = HAMTNING_MISSLYCKADES;
    return null;
  } finally {
    if (!signal?.aborted) {
      store.loading = false;
    }
  }
}
