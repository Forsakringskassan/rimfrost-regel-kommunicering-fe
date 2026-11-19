const RUNTIME_GLOBAL = "__REGEL_KOMMUNICERING_FE_ENV__";

type RuntimeEnv = Partial<Record<string, string>>;

function readRuntimeGlobal(): RuntimeEnv {
  return (window as unknown as Record<string, RuntimeEnv | undefined>)[RUNTIME_GLOBAL] ?? {};
}

/**
 * Whether runtime-config.js has run. Not the same as "it set any values": the
 * shipped file assigns an empty object.
 */
function runtimeConfigHasRun(): boolean {
  return RUNTIME_GLOBAL in window;
}

/** Resolves the whole config in one place, so a new variable is added once. */
function readEnv() {
  const runtime = readRuntimeGlobal();
  return {
    bffUrl: runtime.RUNTIME_BFF_URL || import.meta.env.VITE_BFF_URL || "",
    devHandlaggningId:
      runtime.RUNTIME_DEV_HANDLAGGNING_ID || import.meta.env.VITE_DEV_HANDLAGGNING_ID || "",
    // Dev builds only, so a token left in a local .env can never ship.
    devBearerToken: import.meta.env.DEV ? import.meta.env.VITE_DEV_BEARER_TOKEN || "" : "",
  };
}

/**
 * Centralized environment configuration.
 *
 * In development (npm run dev): values come from VITE_* in .env via Vite.
 * In containers: RUNTIME_* values are set via a mounted runtime-config.js
 * (ConfigMap in OpenShift, volume mount in Docker) and take precedence.
 *
 * An empty bffUrl is a valid, and the default, local setting: requests then go
 * to relative "/api/..." paths, which the Vite dev server proxies to the BFF.
 *
 * Namespaced (not window._env_): this app is loaded as a Module Federation
 * remote inside a shell that shares one window with it.
 */
export const env = readEnv();

// Standalone: index.html's own <script> tag has already run runtime-config.js.
//
// As a Module Federation remote only this JS chunk is loaded, never this app's
// index.html, so ensureEnvLoaded loads runtime-config.js from this app's own
// origin, resolved via import.meta.url.
let runtimeEnvReady: Promise<void> | null = null;

export function ensureEnvLoaded(): Promise<void> {
  if (!runtimeEnvReady) {
    runtimeEnvReady = new Promise<void>((resolve) => {
      if (runtimeConfigHasRun()) {
        resolve();
        return;
      }
      try {
        const ownOrigin = new URL(import.meta.url).origin;
        const script = document.createElement("script");
        script.src = `${ownOrigin}/runtime-config.js`;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      } catch {
        // Best-effort: fall back to the VITE_*/default value.
        resolve();
      }
    }).then(() => {
      Object.assign(env, readEnv());
    });
  }
  return runtimeEnvReady;
}

// Started at import time so the script download overlaps app startup.
void ensureEnvLoaded();
