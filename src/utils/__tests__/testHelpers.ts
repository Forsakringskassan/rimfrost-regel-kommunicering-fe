import { mount } from "@vue/test-utils";
import { ValidationPlugin } from "@fkui/vue";
import { getActivePinia } from "pinia";
import { vi } from "vitest";
import Kommunicering from "../../components/Kommunicering.vue";
import type { Ersattning, GetDataResponse, KommuniceringFormular } from "../../types";

export const HANDLAGGNING_ID = "11111111-2222-3333-4444-555555555555";

interface MockResponseOptions {
  ok?: boolean;
  status?: number;
  contentType?: string | null;
  body?: unknown;
  text?: string;
}

/** Minimal stand-in for the parts of `Response` the call helpers touch. */
export function mockResponse({
  ok = true,
  status = ok ? 200 : 500,
  contentType = "application/json",
  body = {},
  text = "",
}: MockResponseOptions = {}) {
  return {
    ok,
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === "content-type" ? contentType : null),
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(text),
  };
}

export function stubFetch(...responses: ReturnType<typeof mockResponse>[]) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The Authorization header of the n:th fetch call, or null without one. */
export function anropsToken(fetchMock: ReturnType<typeof stubFetch>, index: number): string | null {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("Authorization");
}

/** The parsed JSON body of the n:th fetch call. */
export function anropsBody(fetchMock: ReturnType<typeof stubFetch>, index: number): unknown {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}

export function ersattning(overrides: Partial<Ersattning> = {}): Ersattning {
  return {
    ersattning_id: "e-1",
    ersattningstyp: "Vård av husdjur",
    omfattning_procent: 100,
    belopp: 1200,
    berakningsgrund: 400,
    beslutsutfall: null,
    avslagsanledning: null,
    from: "2026-10-01",
    tom: "2026-10-03",
    ...overrides,
  };
}

export function underlag(ersattningar: Ersattning[] = [ersattning()]): GetDataResponse {
  return {
    handlaggning_id: HANDLAGGNING_ID,
    kund: { fornamn: "Test", efternamn: "Testsson", kon: "KVINNA" },
    ersattningar,
  };
}

/** A form that passes valideraForKlarmarkering. */
export function giltigtFormular(
  overrides: Partial<KommuniceringFormular> = {},
): KommuniceringFormular {
  return {
    ersattningar: [
      {
        ersattningId: "e-1",
        ersattningstyp: "Vård av husdjur",
        omfattningProcent: "100",
        belopp: "1200",
        berakningsgrund: "400",
        from: "2026-10-01",
        tom: "2026-10-03",
        beslutsutfall: "JA",
        avslagsanledning: "",
      },
    ],
    motivering: "Kunden har inte inkommit med något nytt.",
    kommuniceringsutfall: "KundAccepterat",
    ...overrides,
  };
}

/**
 * Seeds the portal's handlaggareStore state on the active pinia, the way the
 * portal leaves it after a login.
 */
export function sattPortalToken(token: string | null): void {
  getActivePinia()!.state.value.handlaggareStore = { bearerToken: token };
}

/**
 * The component's mount contract in one place. No pinia is created here:
 * test-setup.ts activates one before every test. `authorization` is the prop
 * the portal passes (PORT-FR-03.6), by default a valid one; pass null to mount
 * like an older portal without the prop, which falls back to the portal's store.
 */
export function montera(
  handlaggningId: string | null = HANDLAGGNING_ID,
  authorization: string | null = "Bearer handlaggare:abc",
) {
  return mount(Kommunicering, {
    props: { handlaggningId, authorization },
    global: { plugins: [ValidationPlugin] },
    attachTo: document.body,
  });
}

/** Buttons are found by their visible text, as a handläggare reads them. */
export function knapp(wrapper: ReturnType<typeof montera>, text: string) {
  return wrapper.findAll("button").find((button) => button.text().includes(text));
}
