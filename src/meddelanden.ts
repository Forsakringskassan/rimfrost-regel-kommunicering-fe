/** User-facing copy that more than one path needs to agree on. */

export const HAMTNING_MISSLYCKADES = "Kunde inte hämta uppgiftsdata. Försök igen senare.";

export const INGEN_HANDLAGGNING = "Ingen handläggning angiven. Uppgiften kan inte visas.";

export const INGA_ERSATTNINGAR =
  "Det finns inga ersättningar på handläggningen. Uppgiften kan inte hanteras här.";

export const SPARA_MISSLYCKADES = "Kunde inte spara uppgifterna. Försök igen senare.";

export const KLARMARKERA_MISSLYCKADES = "Kunde inte klarmarkera uppgiften. Försök igen senare.";

export const OBEHORIG =
  "Du saknar behörighet att klarmarkera uppgiften. Logga in på nytt och försök igen.";

/**
 * Required by PATCH: the BFF answers 400 without it, and the rule service
 * stores it as the uppgift's kommentar.
 */
export const MOTIVERING_SAKNAS = "Fyll i en motivering.";

export function beslutsutfallSaknas(typ: string): string {
  return `Välj beslutsutfall för ersättningen ${typ}.`;
}

export function avslagsanledningSaknas(typ: string): string {
  return `Fyll i avslagsanledning för ersättningen ${typ}.`;
}

export function ogiltigtHeltal(typ: string, falt: string): string {
  return `${falt} för ersättningen ${typ} måste vara ett heltal som är 0 eller större.`;
}

export function ogiltigOmfattning(typ: string): string {
  return `Omfattning för ersättningen ${typ} måste vara ett heltal mellan 0 och 100.`;
}

export function ogiltigtDatum(typ: string, falt: string): string {
  return `${falt} för ersättningen ${typ} måste vara ett datum på formen ÅÅÅÅ-MM-DD.`;
}

export function omvandPeriod(typ: string): string {
  return `Perioden för ersättningen ${typ} slutar innan den börjar.`;
}
