import { FDate } from "@fkui/date";
import {
  KOMMUNICERINGSUTFALL_SAKNAS,
  MOTIVERING_SAKNAS,
  avslagsanledningSaknas,
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

/**
 * Everything PATCH needs: every UpdateErsattning field parses, and every NEJ
 * has an avslagsanledning. Without that check Spara would save an avslag with
 * no reason and lock the row on it.
 */
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
  if (rad.beslutsutfall === Beslutsutfall.NEJ && !harVarde(rad.avslagsanledning)) {
    return avslagsanledningSaknas(typ);
  }
  return null;
}

/**
 * Spara does not ask for a kommuniceringsutfall: the PATCH does not carry it,
 * so a handläggare can put work away before deciding.
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
 * Klarmarkera additionally asks for a kommuniceringsutfall: `done` answers 422
 * without one. Every ersättning always has a beslutsutfall, so there is
 * nothing to ask there. Checked in the order the fields appear.
 */
export function valideraForKlarmarkering(formular: KommuniceringFormular): string | null {
  for (const rad of formular.ersattningar) {
    const fel = valideraRadForSpara(rad);
    if (fel) {
      return fel;
    }
  }
  if (!formular.kommuniceringsutfall) {
    return KOMMUNICERINGSUTFALL_SAKNAS;
  }
  if (!harVarde(formular.motivering)) {
    return MOTIVERING_SAKNAS;
  }
  return null;
}
