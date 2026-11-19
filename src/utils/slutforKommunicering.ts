import { klarmarkeraKommunicering } from "./klarmarkeraKommunicering";
import { registreraKommuniceringsutfall } from "./registreraKommuniceringsutfall";
import { sparaKommunicering } from "./sparaKommunicering";
import { valideraForKlarmarkering } from "./validering";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { KlarmarkeraResultat } from "../types";
import type { KommuniceringFormular } from "../types";

/**
 * Validate, save, register the kommuniceringsutfall, then complete.
 *
 * `done` acts on what is registered, so completing without saving first would
 * act on something other than what the handläggare sees. The save is skipped
 * when the store knows the form is already saved; any edit since then has
 * cleared `sparad`. The kommuniceringsutfall is always sent: GetDataResponse
 * does not carry it, so the app cannot know whether one is already registered,
 * and `done` answers 422 without one. A failed step stops the sequence with
 * its own message set.
 *
 * Lives outside the component so the sequencing is testable without a mount.
 */
export async function slutforKommunicering(
  handlaggningId: string,
  formular: KommuniceringFormular,
): Promise<KlarmarkeraResultat> {
  const store = useKommuniceringStore();

  const valideringsfel = valideraForKlarmarkering(formular);
  if (valideringsfel || !formular.kommuniceringsutfall) {
    store.error = valideringsfel;
    return KlarmarkeraResultat.OGILTIG;
  }

  if (!store.sparad && !(await sparaKommunicering(handlaggningId, formular))) {
    return KlarmarkeraResultat.FEL;
  }

  const utfall = await registreraKommuniceringsutfall(
    handlaggningId,
    formular.kommuniceringsutfall,
  );
  if (utfall !== KlarmarkeraResultat.KLAR) {
    return utfall;
  }

  return klarmarkeraKommunicering(handlaggningId);
}
