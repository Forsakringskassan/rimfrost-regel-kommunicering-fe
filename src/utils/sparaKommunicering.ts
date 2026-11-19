import { arObehorig, assertOk, bffFetch, taskPath } from "./bffClient";
import { tillPatchRequest } from "./formular";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { OBEHORIG, SPARA_MISSLYCKADES } from "../meddelanden";
import type { KommuniceringFormular } from "../types";

/**
 * PATCH /api/task/{handlaggningId} — writes every ersättning and the motivering. Expects a form
 * that has passed valideraForSpara; the call itself does not re-check.
 *
 * Returns whether the save went through.
 */
export async function sparaKommunicering(
  handlaggningId: string,
  formular: KommuniceringFormular,
): Promise<boolean> {
  const store = useKommuniceringStore();
  store.saving = true;
  store.error = null;

  try {
    const response = await bffFetch(taskPath(handlaggningId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tillPatchRequest(formular)),
    });

    if (arObehorig(response)) {
      store.error = OBEHORIG;
      return false;
    }
    assertOk(response);

    store.sparad = true;
    return true;
  } catch (error) {
    console.error("Error saving kommunicering:", error);
    store.error = SPARA_MISSLYCKADES;
    return false;
  } finally {
    store.saving = false;
  }
}
