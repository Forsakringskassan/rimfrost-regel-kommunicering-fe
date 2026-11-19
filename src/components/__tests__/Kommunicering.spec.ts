import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useKommuniceringStore } from "../../stores/KommuniceringStore";
import {
  HANDLAGGNING_ID,
  anropsBody,
  ersattning,
  knapp,
  mockResponse,
  montera,
  sattPortalToken,
  stubFetch,
  underlag,
} from "../../utils/__tests__/testHelpers";

type Wrapper = ReturnType<typeof montera>;

function falt(wrapper: Wrapper, namn: string) {
  return wrapper.find(`[name="${namn}-e-1"]`);
}

async function valjUtfall(wrapper: Wrapper, value: string) {
  await wrapper.find(`input[type="radio"][value="${value}"]`).setValue(true);
}

async function fyllIMotivering(wrapper: Wrapper) {
  await wrapper.find('textarea[name="motivering"]').setValue("Inget nytt från kunden.");
}

/** Waits for a click's chain of calls to settle on what the test expects. */
async function klickaOchVanta(wrapper: Wrapper, text: string, settled: () => void) {
  await knapp(wrapper, text)?.trigger("click");
  await vi.waitFor(async () => {
    await flushPromises();
    settled();
  });
}

describe("Kommunicering", () => {
  it("loads the task and shows the kund and each ersättning", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    expect(fetchMock.mock.calls[0][0]).toBe(`http://bff.test/api/task/${HANDLAGGNING_ID}`);
    expect(wrapper.text()).toContain("Test Testsson");
    expect(wrapper.text()).toContain("Vård av husdjur");
    expect(wrapper.text()).toContain("1200 kr");
    expect(wrapper.text()).toContain("2026-10-01 – 2026-10-03");
  });

  it("shows the ersättning read-only until Ändra is clicked", async () => {
    stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    expect(falt(wrapper, "belopp").exists()).toBe(false);

    await knapp(wrapper, "Ändra")?.trigger("click");

    expect((falt(wrapper, "belopp").element as HTMLInputElement).value).toBe("1200");
    expect((falt(wrapper, "from").element as HTMLInputElement).value).toBe("2026-10-01");
    expect(knapp(wrapper, "Ändra")).toBeUndefined();
  });

  it("shows the beslutsutfall read-only until Ändra is clicked", async () => {
    stubFetch(
      mockResponse({
        body: underlag([ersattning({ beslutsutfall: "NEJ", avslagsanledning: "Intyg saknas." })]),
      }),
    );
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.find('input[type="radio"][value="NEJ"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Avslag");
    expect(wrapper.text()).toContain("Intyg saknas.");

    await knapp(wrapper, "Ändra")?.trigger("click");

    const nej = wrapper.find('input[type="radio"][value="NEJ"]');
    expect((nej.element as HTMLInputElement).checked).toBe(true);
  });

  it("shows FU when the BFF sends no beslutsutfall", async () => {
    stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.find(".kommunicering__ersattning").text()).toContain("FU");

    await knapp(wrapper, "Ändra")?.trigger("click");
    const fu = wrapper.find('input[type="radio"][value="FU"]');
    expect((fu.element as HTMLInputElement).checked).toBe(true);
  });

  it("puts the values back and locks the ersättning on Avbryt", async () => {
    stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Ändra")?.trigger("click");
    await falt(wrapper, "belopp").setValue("900");
    await valjUtfall(wrapper, "NEJ");
    await knapp(wrapper, "Avbryt")?.trigger("click");

    expect(falt(wrapper, "belopp").exists()).toBe(false);
    expect(wrapper.text()).toContain("1200 kr");
    expect(wrapper.text()).not.toContain("900 kr");
    expect(wrapper.find(".kommunicering__ersattning").text()).toContain("FU");
    expect(wrapper.text()).not.toContain("Avslag");
  });

  it("shows an error and no form when no handlaggning was passed", async () => {
    const fetchMock = stubFetch();
    const wrapper = montera(null);
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Ingen handläggning angiven");
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("offers no form when the load fails", async () => {
    stubFetch(mockResponse({ ok: false, status: 500 }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.text()).toContain("Kunde inte hämta uppgiftsdata");
    expect(knapp(wrapper, "Spara")).toBeUndefined();
  });

  it("offers no form when there are no ersättningar", async () => {
    stubFetch(mockResponse({ body: underlag([]) }));
    const wrapper = montera();
    await flushPromises();

    expect(wrapper.text()).toContain("inga ersättningar");
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("shows the avslagsanledning field only for Avslag", async () => {
    stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Ändra")?.trigger("click");
    expect(falt(wrapper, "avslagsanledning").exists()).toBe(false);
    await valjUtfall(wrapper, "NEJ");
    expect(falt(wrapper, "avslagsanledning").exists()).toBe(true);
  });

  it("refuses to save without a motivering", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Fyll i en motivering");
  });

  it("refuses to save an Avslag without an avslagsanledning and keeps the row open", async () => {
    const fetchMock = stubFetch(
      mockResponse({
        body: underlag([ersattning({ beslutsutfall: "NEJ", avslagsanledning: "Intyg saknas." })]),
      }),
    );
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Ändra")?.trigger("click");
    await falt(wrapper, "avslagsanledning").setValue("");
    await fyllIMotivering(wrapper);
    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Fyll i avslagsanledning");
    expect(falt(wrapper, "avslagsanledning").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Ej angiven");
  });

  it("shows the error next to the buttons while the form is showing", async () => {
    stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Spara")?.trigger("click");
    await flushPromises();

    const felrutor = wrapper.findAll(".kommunicering__felmeddelande");
    expect(felrutor).toHaveLength(1);
    expect(felrutor[0].text()).toContain("Fyll i en motivering");
    expect(felrutor[0].element.nextElementSibling?.classList).toContain("kommunicering__knappar");
    expect(wrapper.text().match(/Fyll i en motivering/g)).toHaveLength(1);
    expect(document.activeElement).toBe(felrutor[0].element);
  });

  it("shows the error at the top, with the form's own error list, when that list stops Klarmarkera", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Klarmarkera")?.trigger("click");
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.find(".kommunicering__felmeddelande-overst").exists()).toBe(true);
    });

    expect(wrapper.find(".kommunicering__felmeddelande-overst").text()).toContain(
      "Välj utfall av kommuniceringen",
    );
    expect(wrapper.find(".kommunicering__felmeddelande").exists()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves the error to the buttons and focuses it when only this app's checks stop Klarmarkera", async () => {
    // A locked NEJ row without an avslagsanledning has no field for the
    // form's own validation to catch.
    const fetchMock = stubFetch(
      mockResponse({ body: underlag([ersattning({ beslutsutfall: "NEJ" })]) }),
    );
    const wrapper = montera();
    await flushPromises();

    await valjUtfall(wrapper, "KundAccepterat");
    await fyllIMotivering(wrapper);
    await knapp(wrapper, "Klarmarkera")?.trigger("click");
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.find(".kommunicering__felmeddelande").exists()).toBe(true);
    });

    expect(wrapper.find(".kommunicering__felmeddelande").text()).toContain("avslagsanledning");
    expect(wrapper.find(".kommunicering__felmeddelande-overst").exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.find(".kommunicering__felmeddelande").element);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("locks the rows after Klarmarkera saves, even when a later step fails", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(
      mockResponse({ body: underlag([ersattning({ beslutsutfall: "JA" })]) }),
      mockResponse({ status: 204 }),
      mockResponse({ ok: false, status: 500 }),
    );
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Ändra")?.trigger("click");
    await falt(wrapper, "belopp").setValue("900");
    await valjUtfall(wrapper, "KundAccepterat");
    await fyllIMotivering(wrapper);
    await klickaOchVanta(wrapper, "Klarmarkera", () =>
      expect(fetchMock).toHaveBeenCalledTimes(3),
    );

    expect(wrapper.find("form").exists()).toBe(true);
    expect(falt(wrapper, "belopp").exists()).toBe(false);
    expect(knapp(wrapper, "Avbryt")).toBeUndefined();
    expect(wrapper.text()).toContain("900 kr");
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(wrapper.find(".kommunicering__felmeddelande").element),
    );
  });

  it("saves the edited values and confirms it until the next edit", async () => {
    const fetchMock = stubFetch(mockResponse({ body: underlag() }), mockResponse({ status: 204 }));
    const wrapper = montera();
    await flushPromises();

    await knapp(wrapper, "Ändra")?.trigger("click");
    await falt(wrapper, "belopp").setValue("900");
    await fyllIMotivering(wrapper);
    await klickaOchVanta(wrapper, "Spara", () => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(fetchMock.mock.calls[1][0]).toBe(`http://bff.test/api/task/${HANDLAGGNING_ID}`);
    expect(anropsBody(fetchMock, 1)).toMatchObject({
      ersattningar: [{ ersattningId: "e-1", belopp: 900, beslutsutfall: "FU" }],
      motivering: "Inget nytt från kunden.",
    });
    expect(wrapper.text()).toContain("Uppgifterna är sparade");
    // A save locks the ersättning again, with the saved value.
    expect(falt(wrapper, "belopp").exists()).toBe(false);
    expect(wrapper.text()).toContain("900 kr");

    await knapp(wrapper, "Ändra")?.trigger("click");
    await falt(wrapper, "belopp").setValue("950");
    await flushPromises();
    expect(wrapper.text()).not.toContain("Uppgifterna är sparade");
  });

  it("reports a missing kommuniceringsutfall on Klarmarkera without calling the BFF", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: underlag([ersattning({ beslutsutfall: "JA" })]) }),
    );
    const wrapper = montera();
    await flushPromises();

    await fyllIMotivering(wrapper);
    await knapp(wrapper, "Klarmarkera")?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Välj utfall av kommuniceringen");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("saves, completes and replaces the form with a confirmation", async () => {
    sattPortalToken("handlaggare:abc");
    const fetchMock = stubFetch(
      mockResponse({ body: underlag([ersattning({ beslutsutfall: "JA" })]) }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
      mockResponse({ status: 204 }),
    );
    const wrapper = montera();
    await flushPromises();

    await valjUtfall(wrapper, "AccepteratBestridande");
    await fyllIMotivering(wrapper);
    await klickaOchVanta(wrapper, "Klarmarkera", () =>
      expect(wrapper.text()).toContain("uppgiften är klarmarkerad"),
    );

    expect(
      fetchMock.mock.calls.map((call) => `${(call[1] as RequestInit).method} ${call[0]}`),
    ).toEqual([
      `GET http://bff.test/api/task/${HANDLAGGNING_ID}`,
      `PATCH http://bff.test/api/task/${HANDLAGGNING_ID}`,
      `PATCH http://bff.test/api/task/${HANDLAGGNING_ID}/kommuniceringsutfall`,
      `POST http://bff.test/api/task/${HANDLAGGNING_ID}/done`,
    ]);
    expect(anropsBody(fetchMock, 2)).toEqual({ utfall: "AccepteratBestridande" });
    expect(wrapper.find("form").exists()).toBe(false);
  });

  it("does not inherit saved state from a previous task on the shared store", async () => {
    useKommuniceringStore().sparad = true;
    stubFetch(mockResponse({ body: underlag() }));
    montera();
    await flushPromises();

    expect(useKommuniceringStore().sparad).toBe(false);
  });

  it("fetches the uppgiftsbeskrivning when the tooltip opens, not when it closes", async () => {
    const fetchMock = stubFetch(
      mockResponse({ body: underlag() }),
      mockResponse({ body: { beskrivning: "Hantera kommunicering från kund" } }),
    );
    const wrapper = montera();
    await flushPromises();

    wrapper.findComponent({ name: "FTooltip" }).vm.$emit("toggle", { isOpen: false });
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: "FTooltip" }).vm.$emit("toggle", { isOpen: true });
    await flushPromises();
    expect(fetchMock.mock.calls[1][0]).toBe("http://bff.test/api/uppgiftsbeskrivning");
    expect(useKommuniceringStore().uppgiftsbeskrivning).toBe("Hantera kommunicering från kund");
  });
});
