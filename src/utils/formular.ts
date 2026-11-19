import type {
  Ersattning,
  ErsattningRad,
  KommuniceringFormular,
  PatchTaskRequest,
  UpdateErsattning,
} from "../types";
import { Beslutsutfall } from "../types";

/** Ersättning from the BFF → one editable row. */
export function tillRad(ersattning: Ersattning): ErsattningRad {
  return {
    ersattningId: ersattning.ersattning_id,
    ersattningstyp: ersattning.ersattningstyp,
    omfattningProcent: String(ersattning.omfattning_procent),
    belopp: String(ersattning.belopp),
    berakningsgrund: String(ersattning.berakningsgrund),
    from: ersattning.from,
    tom: ersattning.tom,
    beslutsutfall: ersattning.beslutsutfall ?? Beslutsutfall.FU,
    avslagsanledning: ersattning.avslagsanledning ?? "",
  };
}

/**
 * One row → UpdateErsattning. Assumes the row has passed validering, so the
 * numeric fields parse.
 *
 * The rule service overwrites every field on the ersättning from the request,
 * so the untouched fields are sent back as loaded rather than omitted.
 * Avslagsanledning only goes along with NEJ: the field is hidden for the other
 * outcomes, and text left in it from an earlier NEJ must not ride along on a JA.
 */
export function tillUpdateErsattning(rad: ErsattningRad): UpdateErsattning {
  const avslagsanledning = rad.avslagsanledning.trim();
  return {
    ersattningId: rad.ersattningId,
    omfattning_procent: Number.parseInt(rad.omfattningProcent.trim(), 10),
    belopp: Number.parseInt(rad.belopp.trim(), 10),
    berakningsgrund: Number.parseInt(rad.berakningsgrund.trim(), 10),
    beslutsutfall: rad.beslutsutfall,
    avslagsanledning:
      rad.beslutsutfall === Beslutsutfall.NEJ && avslagsanledning ? avslagsanledning : null,
    from: rad.from.trim(),
    tom: rad.tom.trim(),
  };
}

export function tillPatchRequest(formular: KommuniceringFormular): PatchTaskRequest {
  return {
    ersattningar: formular.ersattningar.map(tillUpdateErsattning),
    motivering: formular.motivering.trim(),
  };
}
