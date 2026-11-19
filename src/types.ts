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
  /** Always set by the BFF; tillRad falls back to FU should it ever be missing. */
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
  beslutsutfall: Beslutsutfall;
  avslagsanledning: string | null;
  from: string;
  tom: string;
}

/**
 * Body of PATCH /api/task/{handlaggningId}. The BFF adds nothing; it forwards
 * the body as it is.
 */
export interface PatchTaskRequest {
  ersattningar: UpdateErsattning[];
  motivering: string;
}

/**
 * Mirrors `Kommuniceringsutfall` in
 * rimfrost-framework-regel-kommuniceringsutfall-openapi. The rule service
 * answers `done` with 422 until one is registered. AccepteratBestridande gives
 * the regel's utfall NEJ, the other two JA.
 */
export const Kommuniceringsutfall = {
  NEKAT_BESTRIDANDE: "NekatBestridande",
  ACCEPTERAT_BESTRIDANDE: "AccepteratBestridande",
  KUND_ACCEPTERAT: "KundAccepterat",
} as const;

export type Kommuniceringsutfall = (typeof Kommuniceringsutfall)[keyof typeof Kommuniceringsutfall];

/** Body of PATCH /api/task/{handlaggningId}/kommuniceringsutfall. */
export interface PatchKommuniceringsutfallRequest {
  utfall: Kommuniceringsutfall;
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
  beslutsutfall: Beslutsutfall;
  avslagsanledning: string;
}

export interface KommuniceringFormular {
  ersattningar: ErsattningRad[];
  motivering: string;
  /**
   * Empty until the handläggare has picked one. GetDataResponse does not carry
   * it, so it always starts empty.
   */
  kommuniceringsutfall: Kommuniceringsutfall | "";
}

/** Outcome of POST /api/task/{handlaggningId}/done. */
export const KlarmarkeraResultat = {
  /** 204: the task is closed. */
  KLAR: "KLAR",
  /** 401 or 403 on any call, or no token to send in the first place. */
  OBEHORIG: "OBEHORIG",
  /** Rejected by this app's own checks before anything was sent. */
  OGILTIG: "OGILTIG",
  /** Anything else: network failure, upstream error, a failed save. */
  FEL: "FEL",
} as const;

export type KlarmarkeraResultat =
  (typeof KlarmarkeraResultat)[keyof typeof KlarmarkeraResultat];
