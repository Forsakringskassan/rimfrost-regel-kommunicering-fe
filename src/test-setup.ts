import { enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, vi } from "vitest";

// Seeding the runtime global makes ensureEnvLoaded short-circuit instead of
// injecting a <script> tag, which happy-dom refuses to load. It also gives the
// call helpers a stable base URL to assert against.
(window as unknown as Record<string, unknown>).__REGEL_KOMMUNICERING_FE_ENV__ = {
  RUNTIME_BFF_URL: "http://bff.test",
};

// A developer's local .env may set VITE_DEV_BEARER_TOKEN, which every call now
// sends. Tests seed a token through the portal store, or have none at all.
vi.stubEnv("VITE_DEV_BEARER_TOKEN", "");

beforeEach(() => {
  setActivePinia(createPinia());
  // The helpers log the failure paths on purpose; the suite exercises them.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// FKUI's ValidationPlugin keeps a registry outside the component, so a wrapper
// left mounted makes the next test's form validate against stale fields.
enableAutoUnmount(afterEach);
