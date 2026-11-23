import { describe, expect, it, vi } from "vitest";
import { useKommuniceringStore } from "../../stores/KommuniceringStore";
import { KlarmarkeraResultat } from "../../types";
import { fetchKommunicering } from "../fetchKommunicering";
import { fetchUppgiftsbeskrivning } from "../fetchUppgiftsbeskrivning";
import { klarmarkeraKommunicering } from "../klarmarkeraKommunicering";
import { registreraKommuniceringsutfall } from "../registreraKommuniceringsutfall";
import { slutforKommunicering } from "../slutforKommunicering";
import { sparaKommunicering } from "../sparaKommunicering";
import {
  HANDLAGGNING_ID,
  anropsBody,
  anropsToken,
  giltigtFormular,
  mockResponse,
  sattPortalToken,
  stubFetch,
  underlag,
} from "./testHelpers";

describe("fetchKommunicering", () => {
  it("GETs /api/task/{handlaggningId} and stores the kund", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));

    const data = await fetchKommunicering(HANDLAGGNING_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://bff.test/api/task/${HANDLAGGNING_ID}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeUndefined();
    expect(data?.ersattningar).toHaveLength(1);
    expect(useKommuniceringStore().kund?.fornamn).toBe("Test");
    expect(useKommuniceringStore().loading).toBe(false);
  });

  it("sends the portal's token", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));

    await fetchKommunicering(HANDLAGGNING_ID);

    expect(anropsToken(fetchMock, 0)).toBe("Bearer handlaggare:abc");
  });

  it("sends the authorization prop's value unchanged, ahead of the portal's store", async () => {
    sattPortalToken("gammal:token");
    useKommuniceringStore().authorization = "Bearer handlaggare:prop";
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));

    await fetchKommunicering(HANDLAGGNING_ID);

    expect(anropsToken(fetchMock, 0)).toBe("Bearer handlaggare:prop");
  });

  it("sends no Authorization header without any token", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));

    await fetchKommunicering(HANDLAGGNING_ID);

    expect(anropsToken(fetchMock, 0)).toBeNull();
  });

  it("reports a refused token as behörighet", async () => {
    stubFetch(mockResponse({ ok: false, status: 401 }));

    expect(await fetchKommunicering(HANDLAGGNING_ID)).toBeNull();
    expect(useKommuniceringStore().error).toContain("behörighet");
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
  it("PATCHes /api/task/{handlaggningId} and marks the form saved", async () => {
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    expect(await sparaKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://bff.test/api/task/${HANDLAGGNING_ID}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(anropsBody(fetchMock, 0)).toMatchObject({
      motivering: "Kunden har inte inkommit med något nytt.",
    });
    expect(anropsBody(fetchMock, 0)).not.toHaveProperty("handlaggningId");
    expect(useKommuniceringStore().sparad).toBe(true);
  });

  it("reports a failed save", async () => {
    stubFetch(mockResponse({ ok: false, status: 400 }));

    expect(await sparaKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(false);
    expect(useKommuniceringStore().error).toContain("Kunde inte spara");
    expect(useKommuniceringStore().sparad).toBe(false);
  });

  it("reports a refused token as behörighet", async () => {
    stubFetch(mockResponse({ ok: false, status: 403 }));

    expect(await sparaKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(false);
    expect(useKommuniceringStore().error).toContain("behörighet");
  });
});

describe("registreraKommuniceringsutfall", () => {
  it("PATCHes the utfall with the token", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    expect(await registreraKommuniceringsutfall(HANDLAGGNING_ID, "NekatBestridande")).toBe(
      KlarmarkeraResultat.KLAR,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `http://bff.test/api/task/${HANDLAGGNING_ID}/kommuniceringsutfall`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(anropsBody(fetchMock, 0)).toEqual({ utfall: "NekatBestridande" });
    expect(anropsToken(fetchMock, 0)).toBe("Bearer handlaggare:abc");
  });

  it("maps 401 to OBEHORIG", async () => {
    stubFetch(mockResponse({ ok: false, status: 401 }));

    expect(await registreraKommuniceringsutfall(HANDLAGGNING_ID, "KundAccepterat")).toBe(
      KlarmarkeraResultat.OBEHORIG,
    );
    expect(useKommuniceringStore().error).toContain("behörighet");
  });

  it("maps an upstream error to FEL", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await registreraKommuniceringsutfall(HANDLAGGNING_ID, "KundAccepterat")).toBe(
      KlarmarkeraResultat.FEL,
    );
    expect(useKommuniceringStore().error).toContain("Kunde inte registrera utfallet");
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
    expect(fetchMock.mock.calls[0][0]).toBe(`http://bff.test/api/task/${HANDLAGGNING_ID}/done`);
    expect(anropsToken(fetchMock, 0)).toBe("Bearer handlaggare:abc");
    expect(init.body).toBeUndefined();
    expect((lyssnare.mock.calls[0][0] as CustomEvent).detail).toEqual({
      handlaggningId: HANDLAGGNING_ID,
    });
  });

  it("completes with only the authorization prop's token", async () => {
    useKommuniceringStore().authorization = "Bearer handlaggare:prop";
    const fetchMock = stubFetch(mockResponse({ status: 204 }));

    expect(await klarmarkeraKommunicering(HANDLAGGNING_ID)).toBe(KlarmarkeraResultat.KLAR);
    expect(anropsToken(fetchMock, 0)).toBe("Bearer handlaggare:prop");
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
  it("saves, registers the kommuniceringsutfall, then completes", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
    );

    expect(await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(
      KlarmarkeraResultat.KLAR,
    );
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `http://bff.test/api/task/${HANDLAGGNING_ID}`,
      `http://bff.test/api/task/${HANDLAGGNING_ID}/kommuniceringsutfall`,
      `http://bff.test/api/task/${HANDLAGGNING_ID}/done`,
    ]);
    expect(anropsBody(fetchMock, 1)).toEqual({ utfall: "KundAccepterat" });
  });

  it("skips the save when the form is already saved", async () => {
    sattPortalToken("handlaggare:abc");
    useKommuniceringStore().sparad = true;
    const fetchMock = stubFetch(mockResponse({ status: 204 }), mockResponse({ status: 204 }));

    await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular());

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `http://bff.test/api/task/${HANDLAGGNING_ID}/kommuniceringsutfall`,
      `http://bff.test/api/task/${HANDLAGGNING_ID}/done`,
    ]);
  });

  it("does not complete when the save fails", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(
      KlarmarkeraResultat.FEL,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not complete when the kommuniceringsutfall is refused", async () => {
    sattPortalToken("handlaggare:abc");
    useKommuniceringStore().sparad = true;
    const fetchMock = stubFetch(mockResponse({ ok: false, status: 500 }));

    expect(await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular())).toBe(
      KlarmarkeraResultat.FEL,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing without a kommuniceringsutfall", async () => {
    const fetchMock = stubFetch();

    expect(
      await slutforKommunicering(HANDLAGGNING_ID, giltigtFormular({ kommuniceringsutfall: "" })),
    ).toBe(KlarmarkeraResultat.OGILTIG);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKommuniceringStore().error).toContain("Välj utfall av kommuniceringen");
  });

  it("sends nothing when the form is incomplete", async () => {
    const fetchMock = stubFetch();
    const formular = giltigtFormular();
    formular.ersattningar[0].beslutsutfall = "NEJ";

    expect(await slutforKommunicering(HANDLAGGNING_ID, formular)).toBe(
      KlarmarkeraResultat.OGILTIG,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useKommuniceringStore().error).toContain("avslagsanledning");
  });
});
