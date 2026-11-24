import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import renovate from "../../renovate.json";

// Must match rimfrost-portal-handlaggare. A newer module federation runtime in a
// remote breaks the shared @fkui/vue and @fkui/logic in the portal (FKPOC-1501).
const PORTALENS_VERSION = "1.15.2";

describe("@module-federation/vite version (KOMF-NFR-01.6)", () => {
  it("is pinned to the portal's exact version", () => {
    expect(pkg.devDependencies["@module-federation/vite"]).toBe(PORTALENS_VERSION);
  });

  it("is locked against Renovate upgrades", () => {
    const regel = renovate.packageRules.find((r) =>
      r.matchPackageNames.includes("@module-federation/vite"),
    );
    expect(regel?.enabled).toBe(false);
  });
});
