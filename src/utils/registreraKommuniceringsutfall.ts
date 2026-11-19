import { arObehorig, assertOk, bffFetch, taskPath } from "./bffClient";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { KOMMUNICERINGSUTFALL_MISSLYCKADES, OBEHORIG } from "../meddelanden";
import { KlarmarkeraResultat } from "../types";
import type { Kommuniceringsutfall, PatchKommuniceringsutfallRequest } from "../types";

/**
 * PATCH /api/task/{handlaggningId}/kommuniceringsutfall. Registers the outcome
 * of the kommunicering as the uppgift's regelutfall, which `done` requires.
 *
 * Returns KLAR when it is registered, otherwise the outcome to stop on, with
 * the message already set.
 */
export async function registreraKommuniceringsutfall(
  handlaggningId: string,
  utfall: Kommuniceringsutfall,
): Promise<KlarmarkeraResultat> {
  const store = useKommuniceringStore();
  store.saving = true;
  store.error = null;

  try {
    const body: PatchKommuniceringsutfallRequest = { utfall };
    const response = await bffFetch(`${taskPath(handlaggningId)}/kommuniceringsutfall`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (arObehorig(response)) {
      store.error = OBEHORIG;
      return KlarmarkeraResultat.OBEHORIG;
    }
    assertOk(response);
    return KlarmarkeraResultat.KLAR;
  } catch (error) {
    console.error("Error registering kommuniceringsutfall:", error);
    store.error = KOMMUNICERINGSUTFALL_MISSLYCKADES;
    return KlarmarkeraResultat.FEL;
  } finally {
    store.saving = false;
  }
}
