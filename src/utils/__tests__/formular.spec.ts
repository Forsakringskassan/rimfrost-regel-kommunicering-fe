import { describe, expect, it } from "vitest";
import { tillPatchRequest, tillRad } from "../formular";
import { ersattning, giltigtFormular } from "./testHelpers";

describe("tillRad", () => {
  it("turns numbers into the strings the fields bind and null into empty", () => {
    expect(tillRad(ersattning())).toEqual({
      ersattningId: "e-1",
      ersattningstyp: "Vård av husdjur",
      omfattningProcent: "100",
      belopp: "1200",
      berakningsgrund: "400",
      from: "2026-10-01",
      tom: "2026-10-03",
      beslutsutfall: "",
      avslagsanledning: "",
    });
  });

  it("keeps an already registered beslutsutfall and avslagsanledning", () => {
    const rad = tillRad(ersattning({ beslutsutfall: "NEJ", avslagsanledning: "För sent" }));
    expect(rad.beslutsutfall).toBe("NEJ");
    expect(rad.avslagsanledning).toBe("För sent");
  });
});

describe("tillPatchRequest", () => {
  it("builds the BFF's PATCH body with every UpdateErsattning field", () => {
    expect(tillPatchRequest(giltigtFormular())).toEqual({
      ersattningar: [
        {
          ersattningId: "e-1",
          omfattning_procent: 100,
          belopp: 1200,
          berakningsgrund: 400,
          beslutsutfall: "JA",
          avslagsanledning: null,
          from: "2026-10-01",
          tom: "2026-10-03",
        },
      ],
      motivering: "Kunden har inte inkommit med något nytt.",
    });
  });

  it("sends a missing beslutsutfall as null", () => {
    const formular = giltigtFormular();
    formular.ersattningar[0].beslutsutfall = "";
    expect(tillPatchRequest(formular).ersattningar[0].beslutsutfall).toBeNull();
  });

  it("sends the avslagsanledning only with NEJ", () => {
    const formular = giltigtFormular();
    formular.ersattningar[0].avslagsanledning = "Kvar från ett tidigare avslag";
    expect(tillPatchRequest(formular).ersattningar[0].avslagsanledning).toBeNull();

    formular.ersattningar[0].beslutsutfall = "NEJ";
    expect(tillPatchRequest(formular).ersattningar[0].avslagsanledning).toBe(
      "Kvar från ett tidigare avslag",
    );
  });
});
