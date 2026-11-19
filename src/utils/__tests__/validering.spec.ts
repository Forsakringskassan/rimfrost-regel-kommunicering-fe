import { describe, expect, it } from "vitest";
import { valideraForKlarmarkering, valideraForSpara } from "../validering";
import { giltigtFormular } from "./testHelpers";
import type { ErsattningRad } from "../../types";

function medRad(overrides: Partial<ErsattningRad>) {
  const formular = giltigtFormular();
  formular.ersattningar[0] = { ...formular.ersattningar[0], ...overrides };
  return formular;
}

describe("valideraForSpara", () => {
  it("passes a complete form", () => {
    expect(valideraForSpara(giltigtFormular())).toBeNull();
  });

  it("does not require a kommuniceringsutfall", () => {
    expect(valideraForSpara(giltigtFormular({ kommuniceringsutfall: "" }))).toBeNull();
  });

  it("requires a motivering", () => {
    expect(valideraForSpara(giltigtFormular({ motivering: "   " }))).toContain("motivering");
  });

  it.each([
    ["omfattning over 100", { omfattningProcent: "101" }, "mellan 0 och 100"],
    ["negative omfattning", { omfattningProcent: "-1" }, "mellan 0 och 100"],
    ["decimal belopp", { belopp: "12.5" }, "Belopp"],
    ["empty beräkningsgrund", { berakningsgrund: "" }, "Beräkningsgrund"],
    ["malformed from", { from: "2026-13-01" }, "Från och med"],
    ["non-ISO tom", { tom: "20261003" }, "Till och med"],
    ["tom before from", { from: "2026-10-05", tom: "2026-10-01" }, "slutar innan den börjar"],
  ])("rejects %s", (_namn, overrides, forvantat) => {
    expect(valideraForSpara(medRad(overrides))).toContain(forvantat);
  });

  it("requires an avslagsanledning for NEJ", () => {
    expect(
      valideraForSpara(medRad({ beslutsutfall: "NEJ", avslagsanledning: " " })),
    ).toContain("avslagsanledning");
  });

  it("does not require an avslagsanledning for JA", () => {
    expect(valideraForSpara(medRad({ beslutsutfall: "JA", avslagsanledning: "" }))).toBeNull();
  });

  it("accepts a one-day period", () => {
    expect(valideraForSpara(medRad({ from: "2026-10-01", tom: "2026-10-01" }))).toBeNull();
  });
});

describe("valideraForKlarmarkering", () => {
  it("passes a complete form", () => {
    expect(valideraForKlarmarkering(giltigtFormular())).toBeNull();
  });

  it("requires a kommuniceringsutfall", () => {
    expect(valideraForKlarmarkering(giltigtFormular({ kommuniceringsutfall: "" }))).toContain(
      "Välj utfall av kommuniceringen",
    );
  });

  it("requires an avslagsanledning for NEJ", () => {
    expect(
      valideraForKlarmarkering(medRad({ beslutsutfall: "NEJ", avslagsanledning: " " })),
    ).toContain("avslagsanledning");
  });

  it("does not require an avslagsanledning for FU", () => {
    expect(valideraForKlarmarkering(medRad({ beslutsutfall: "FU" }))).toBeNull();
  });

  it("still applies the Spara rules", () => {
    expect(valideraForKlarmarkering(medRad({ belopp: "abc" }))).toContain("Belopp");
  });
});
