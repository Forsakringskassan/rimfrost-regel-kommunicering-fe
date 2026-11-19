import { arObehorig, bffFetch, taskPath } from "./bffClient";
import { hamtaBearerToken } from "./bearerToken";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { KLARMARKERA_MISSLYCKADES, OBEHORIG } from "../meddelanden";
import { KlarmarkeraResultat } from "../types";

/**
 * POST /api/task/{handlaggningId}/done — closes the OUL task. bffFetch sends
 * the token, which the BFF passes on to the rule service. A missing token is
 * reported up front instead of being sent to be refused.
 *
 * The rule service answers 422 when no kommuniceringsutfall is registered, so
 * call this after registreraKommuniceringsutfall, as slutforKommunicering does.
 *
 * On success the host portal gets a `task-done` event on `window` so it can
 * drop the task from the handläggare's list.
 */
export async function klarmarkeraKommunicering(
  handlaggningId: string,
): Promise<KlarmarkeraResultat> {
  const store = useKommuniceringStore();
  store.error = null;

  if (!hamtaBearerToken()) {
    store.error = OBEHORIG;
    return KlarmarkeraResultat.OBEHORIG;
  }

  store.saving = true;
  try {
    const response = await bffFetch(`${taskPath(handlaggningId)}/done`, { method: "POST" });

    if (response.ok) {
      window.dispatchEvent(new CustomEvent("task-done", { detail: { handlaggningId } }));
      return KlarmarkeraResultat.KLAR;
    }

    if (arObehorig(response)) {
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
