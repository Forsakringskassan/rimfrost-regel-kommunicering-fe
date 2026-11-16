import { TASK_PATH, bffFetch } from "./bffClient";
import { hamtaBearerToken } from "./bearerToken";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { KLARMARKERA_MISSLYCKADES, OBEHORIG } from "../meddelanden";
import { KlarmarkeraResultat } from "../types";

/**
 * POST /api/task/done — closes the OUL task. The BFF requires an
 * Authorization header here and answers 401 without one, so a missing token is
 * reported up front instead of being sent to be refused.
 *
 * On success the host portal gets a `task-done` event on `window` so it can
 * drop the task from the handläggare's list.
 */
export async function klarmarkeraKommunicering(
  handlaggningId: string,
): Promise<KlarmarkeraResultat> {
  const store = useKommuniceringStore();
  store.error = null;

  const token = hamtaBearerToken();
  if (!token) {
    store.error = OBEHORIG;
    return KlarmarkeraResultat.OBEHORIG;
  }

  store.saving = true;
  try {
    const response = await bffFetch(`${TASK_PATH}/done`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ handlaggningId }),
    });

    if (response.ok) {
      window.dispatchEvent(new CustomEvent("task-done", { detail: { handlaggningId } }));
      return KlarmarkeraResultat.KLAR;
    }

    if (response.status === 401 || response.status === 403) {
      store.error = OBEHORIG;
      return KlarmarkeraResultat.OBEHORIG;
    }

    throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error("Error completing kommunicering:", error);
    store.error = KLARMARKERA_MISSLYCKADES;
    return KlarmarkeraResultat.FEL;
  } finally {
    store.saving = false;
  }
}
