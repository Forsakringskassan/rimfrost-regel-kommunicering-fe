import { FDate } from "@fkui/date";
import {
  MOTIVERING_SAKNAS,
  avslagsanledningSaknas,
  beslutsutfallSaknas,
  ogiltigOmfattning,
  ogiltigtDatum,
  ogiltigtHeltal,
  omvandPeriod,
} from "../meddelanden";
import type { ErsattningRad, KommuniceringFormular } from "../types";
import { Beslutsutfall } from "../types";

/**
 * What the two buttons demand of the form, in one place so the component and
 * the call helpers cannot drift apart. FKUI's field validation only speaks when
 * the host's validators reach this remote, so the component reports these on
 * the click and the helpers check again before anything reaches the BFF.
 *
 * Both return the first message to show, or null when the form passes.
 */

const HELTAL = /^\d+$/;

function harVarde(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function arIsoDatum(value: string): boolean {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) && FDate.fromIso(trimmed).isValid();
}

/** Everything PATCH needs: every UpdateErsattning field parses, and a motivering. */
function valideraRadForSpara(rad: ErsattningRad): string | null {
  const typ = rad.ersattningstyp;
  const omfattning = rad.omfattningProcent.trim();
  if (!HELTAL.test(omfattning) || Number(omfattning) > 100) {
    return ogiltigOmfattning(typ);
  }
  if (!HELTAL.test(rad.belopp.trim())) {
    return ogiltigtHeltal(typ, "Belopp");
  }
  if (!HELTAL.test(rad.berakningsgrund.trim())) {
    return ogiltigtHeltal(typ, "Beräkningsgrund");
  }
  if (!arIsoDatum(rad.from)) {
    return ogiltigtDatum(typ, "Från och med");
  }
  if (!arIsoDatum(rad.tom)) {
    return ogiltigtDatum(typ, "Till och med");
  }
  if (FDate.fromIso(rad.tom.trim()).isBefore(rad.from.trim())) {
    return omvandPeriod(typ);
  }
  return null;
}

/**
 * Spara does not ask for a beslutsutfall: the PATCH accepts null, so a
 * handläggare can put work away before deciding.
 */
export function valideraForSpara(formular: KommuniceringFormular): string | null {
  for (const rad of formular.ersattningar) {
    const fel = valideraRadForSpara(rad);
    if (fel) {
      return fel;
    }
  }
  if (!harVarde(formular.motivering)) {
    return MOTIVERING_SAKNAS;
  }
  return null;
}

/**
 * Klarmarkera additionally asks every ersättning for a beslutsutfall, and an
 * avslagsanledning for every NEJ: `done` closes the task on what is registered.
 */
export function valideraForKlarmarkering(formular: KommuniceringFormular): string | null {
  for (const rad of formular.ersattningar) {
    const fel = valideraRadForSpara(rad);
    if (fel) {
      return fel;
    }
    if (!rad.beslutsutfall) {
      return beslutsutfallSaknas(rad.ersattningstyp);
    }
    if (rad.beslutsutfall === Beslutsutfall.NEJ && !harVarde(rad.avslagsanledning)) {
      return avslagsanledningSaknas(rad.ersattningstyp);
    }
  }
  if (!harVarde(formular.motivering)) {
    return MOTIVERING_SAKNAS;
  }
  return null;
}
