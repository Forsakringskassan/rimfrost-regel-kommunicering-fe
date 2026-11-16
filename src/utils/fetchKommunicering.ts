import { TASK_PATH, bffFetch, readJson } from "./bffClient";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { HAMTNING_MISSLYCKADES } from "../meddelanden";
import type { GetDataResponse } from "../types";

/**
 * POST /api/task — the BFF's read, which answers with the rule service's
 * GetDataResponse. It is a POST only because the BFF takes the handlaggningId
 * in the body.
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
    const response = await bffFetch(TASK_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ handlaggningId }),
      signal,
    });
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
