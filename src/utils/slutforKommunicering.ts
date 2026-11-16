import { klarmarkeraKommunicering } from "./klarmarkeraKommunicering";
import { sparaKommunicering } from "./sparaKommunicering";
import { valideraForKlarmarkering } from "./validering";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { KlarmarkeraResultat } from "../types";
import type { KommuniceringFormular } from "../types";

/**
 * Validate, save, then complete.
 *
 * `done` acts on what is registered, so completing without saving first would
 * act on something other than what the handläggare sees. The save is skipped
 * when the store knows the form is already saved; any edit since then has
 * cleared `sparad`. A failed save stops the sequence with its own message set.
 *
 * Lives outside the component so the sequencing is testable without a mount.
 */
export async function slutforKommunicering(
  handlaggningId: string,
  formular: KommuniceringFormular,
): Promise<KlarmarkeraResultat> {
  const store = useKommuniceringStore();

  const valideringsfel = valideraForKlarmarkering(formular);
  if (valideringsfel) {
    store.error = valideringsfel;
    return KlarmarkeraResultat.OGILTIG;
  }

  if (!store.sparad && !(await sparaKommunicering(handlaggningId, formular))) {
    return KlarmarkeraResultat.FEL;
  }

  return klarmarkeraKommunicering(handlaggningId);
}
