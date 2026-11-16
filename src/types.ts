/*
 * Mirrors the schemas in rimfrost-regel-kommunicering-openapi, which the BFF
 * passes through unchanged. Snake case is the spec's, except `ersattningId` on
 * UpdateErsattning, which the spec spells in camel case.
 */

export const Beslutsutfall = {
  JA: "JA",
  NEJ: "NEJ",
  FU: "FU",
} as const;

export type Beslutsutfall = (typeof Beslutsutfall)[keyof typeof Beslutsutfall];

export interface Kund {
  fornamn?: string;
  efternamn?: string;
  kon?: "MAN" | "KVINNA";
}

export interface Ersattning {
  ersattning_id: string;
  ersattningstyp: string;
  omfattning_procent: number;
  belopp: number;
  berakningsgrund: number;
  beslutsutfall?: Beslutsutfall | null;
  avslagsanledning?: string | null;
  /** ISO date, YYYY-MM-DD. */
  from: string;
  /** ISO date, YYYY-MM-DD. */
  tom: string;
}

export interface GetDataResponse {
  handlaggning_id: string;
  kund: Kund;
  ersattningar: Ersattning[];
}

export interface UpdateErsattning {
  ersattningId: string;
  omfattning_procent: number;
  belopp: number;
  berakningsgrund: number;
  beslutsutfall: Beslutsutfall | null;
  avslagsanledning: string | null;
  from: string;
  tom: string;
}

/** Body of PATCH /api/task. The BFF adds nothing; it forwards the rest. */
export interface PatchTaskRequest {
  handlaggningId: string;
  ersattningar: UpdateErsattning[];
  motivering: string;
}

/**
 * Mirrors `GetUtokadUppgiftsbeskrivningResponse` in
 * rimfrost-framework-regel-oul-openapi.
 */
export interface UppgiftsbeskrivningResponse {
  beskrivning?: string;
}

/**
 * One ersättning as the form edits it. Numbers and dates are kept as the
 * strings the fields bind, and only parsed when a request is built, so a
 * half-typed value is never coerced into something the handläggare did not
 * write.
 */
export interface ErsattningRad {
  ersattningId: string;
  ersattningstyp: string;
  omfattningProcent: string;
  belopp: string;
  berakningsgrund: string;
  from: string;
  tom: string;
  /** Empty until the handläggare has picked one. */
  beslutsutfall: Beslutsutfall | "";
  avslagsanledning: string;
}

export interface KommuniceringFormular {
  ersattningar: ErsattningRad[];
  motivering: string;
}

/** Outcome of POST /api/task/done. */
export const KlarmarkeraResultat = {
  /** 204: the task is closed. */
  KLAR: "KLAR",
  /** 401, or no token to send in the first place. */
  OBEHORIG: "OBEHORIG",
  /** Rejected by this app's own checks before anything was sent. */
  OGILTIG: "OGILTIG",
  /** Anything else: network failure, upstream error, a failed save. */
  FEL: "FEL",
} as const;

export type KlarmarkeraResultat =
  (typeof KlarmarkeraResultat)[keyof typeof KlarmarkeraResultat];
