import { describe, expect, it, vi } from "vitest";
import { useKommuniceringStore } from "../../stores/KommuniceringStore";
import { KlarmarkeraResultat } from "../../types";
import { fetchKommunicering } from "../fetchKommunicering";
import { fetchUppgiftsbeskrivning } from "../fetchUppgiftsbeskrivning";
import { klarmarkeraKommunicering } from "../klarmarkeraKommunicering";
import { slutforKommunicering } from "../slutforKommunicering";
import { sparaKommunicering } from "../sparaKommunicering";
import {
  HANDLAGGNING_ID,
  anropsBody,
  giltigtFormular,
  mockResponse,
  sattPortalToken,
  stubFetch,
  underlag,
} from "./testHelpers";

describe("fetchKommunicering", () => {
  it("POSTs the handlaggningId to /api/task and stores the kund", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));

    const data = await fetchKommunicering(HANDLAGGNING_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://bff.test/api/task",
      expect.objectContaining({ method: "POST" }),
    );
    expect(anropsBody(fetchMock, 0)).toEqual({ handlaggningId: HANDLAGGNING_ID });
    expect(data?.ersattningar).toHaveLength(1);
    expect(useKommuniceringStore().kund?.fornamn).toBe("Test");
    expect(useKommuniceringStore().loading).toBe(false);
  });

  it("returns null and sets an error when the BFF fails", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await fetchKommunicering(HANDLAGGNING_ID)).toBeNull();
    expect(useKommuniceringStore().error).toContain("Kunde inte hämta");
  });

  it("rejects a body without ersattningar", async () => {
    stubFetch(mockResponse({ body: { kund: {} } }));

    expect(await fetchKommunicering(HANDLAGGNING_ID)).toBeNull();
    expect(useKommuniceringStore().error).toContain("Kunde inte hämta");
  });

  it("leaves the store alone when the load was superseded", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    const controller = new AbortController();
    const store = useKommuniceringStore();

    const pending = fetchKommunicering(HANDLAGGNING_ID, controller.signal);
    controller.abort();
    store.loading = true; // the replacing call's loader

    expect(await pending).toBeNull();
    expect(store.error).toBeNull();
    expect(store.loading).toBe(true);
  });
});

describe("fetchUppgiftsbeskrivning", () => {
  it("stores the beskrivning", async () => {
    stubFetch(mockResponse({ body: { beskrivning: "Hantera kommunicering från kund" } }));

    await fetchUppgiftsbeskrivning();

    expect(useKommuniceringStore().uppgiftsbeskrivning).toBe("Hantera kommunicering från kund");
  });

  it("flags an error on a malformed body", async () => {
    stubFetch(mockResponse({ body: {} }));

    await fetchUppgiftsbeskrivning();

    expect(useKommuniceringStore().descriptionError).toBe(true);
  });
});

describe("sparaKommunicering", () => {
  it("PATCHes /api/task and marks the form saved", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    expect(await sparaKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://bff.test/api/task",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(anropsBody(fetchMock, 0)).toMatchObject({
      handlaggningId: HANDLAGGNING_ID,
      motivering: "Kunden har inte inkommit med något nytt.",
    });
    expect(useKommuniceringStore().sparad).toBe(true);
  });

  it("reports a failed save", async () => {
    stubFetch(mockResponse({ ok: false, status: 400 }));

    expect(await sparaKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(false);
    expect(useKommuniceringStore().error).toContain("Kunde inte spara");
    expect(useKommuniceringStore().sparad).toBe(false);
  });
});

describe("klarmarkeraKommunicering", () => {
  it("sends the portal's token and announces task-done", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ status: 204 }));
    const lyssnare = vi.fn();
    window.addEventListener("task-done", lyssnare);

    const resultat = await klarmarkeraKommunicering(HANDLAGGNING_ID);
    window.removeEventListener("task-done", lyssnare);

    expect(resultat).toBe(KlarmarkeraResultat.KLAR);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe("http://bff.test/api/task/done");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer handlaggare:abc");
    expect(anropsBody(fetchMock, 0)).toEqual({ handlaggningId: HANDLAGGNING_ID });
    expect((lyssnare.mock.calls[0][0] as CustomEvent).detail).toEqual({
      handlaggningId: HANDLAGGNING_ID,
    });
  });

  it("does not call the BFF without a token", async () => {
    const fetchMock = stubFetch();

    expect(await klarmarkeraKommunicering(HANDLAGGNING_ID)).toBe(KlarmarkeraResultat.OBEHORIG);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKommuniceringStore().error).toContain("behörighet");
  });

  it("maps 401 to OBEHORIG", async () => {
    sattPortalToken("handlaggare:abc");
    stubFetch(mockResponse({ ok: false, status: 401 }));

    expect(await klarmarkeraKommunicering(HANDLAGGNING_ID)).toBe(KlarmarkeraResultat.OBEHORIG);
  });

  it("maps an upstream error to FEL", async () => {
    sattPortalToken("handlaggare:abc");
    stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await klarmarkeraKommunicering(HANDLAGGNING_ID)).toBe(KlarmarkeraResultat.FEL);
    expect(useKommuniceringStore().error).toContain("Kunde inte klarmarkera");
  });
});

describe("slutforKommunicering", () => {
  it("saves, then completes", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ status: 204 }), mockResponse({ status: 204 }));

    expect(await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(
      KlarmarkeraResultat.KLAR,
    );
    expect(fetchMock.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual([
      "PATCH",
      "POST",
    ]);
  });

  it("skips the save when the form is already saved", async () => {
    sattPortalToken("handlaggare:abc");
    useKommuniceringStore().sparad = true;
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://bff.test/api/task/done");
  });

  it("does not complete when the save fails", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(
      KlarmarkeraResultat.FEL,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the form is incomplete", async () => {
    const fetchMock = stubFetch();
    const formular = giltigtFormular();
    formular.ersattningar[0].beslutsutfall = "";

    expect(await slutforKommunicering(HANDLAGGNING_ID, formular)).toBe(
      KlarmarkeraResultat.OGILTIG,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKommuniceringStore().error).toContain("Välj beslutsutfall");
  });
});
