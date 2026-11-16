# rimfrost-regel-kommunicering-fe

Micro frontend for the kommunicering task. The handläggare reviews the ersättningar on a
handläggning, adjusts them if needed, sets a beslutsutfall for each, writes a motivering and
completes the task. It is loaded into `rimfrost-portal-handlaggare` via Module Federation.

It talks only to `rimfrost-regel-kommunicering-bff`, which fronts the
`rimfrost-regel-kommunicering` rule service.

```
[Portal (host)] ──Module Federation──> [This app] ──REST──> [Kommunicering BFF :9009] ──> [Rule service]
```

## Running it

You need Node 22+ and the BFF on port 9009.

```bash
npm ci
cp .env.example .env     # then set VITE_DEV_HANDLAGGNING_ID and VITE_DEV_BEARER_TOKEN
npm run dev              # http://localhost:3034
```

With `VITE_BFF_URL` left empty the app calls relative `/api/...` paths and Vite's dev proxy
forwards them to `http://localhost:9009`. Same origin, so there is nothing to configure for
CORS. If you point `VITE_BFF_URL` at an absolute URL instead, add this app's origin to the BFF:

```bash
CORS_ORIGINS=http://localhost:3034 ./mvnw quarkus:dev
```

Standalone there is no portal, so set `VITE_DEV_HANDLAGGNING_ID` to a handlaggningId with an
open kommunicering task, and `VITE_DEV_BEARER_TOKEN` to any token the BFF accepts (the portal's
dev tokens look like `<typId>:<varde>`). Without a token, Klarmarkera stops with a
behörighet message.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on 3034 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Build, then serve the result on 3034 |
| `npm test` | Vitest in watch mode |
| `npm run test:run` | Vitest once |
| `npm run test:coverage` | Vitest once with coverage |

## Registering with the portal

Add an entry to the portal's `public/route-manifest.json`. The key must match the last path
segment of the task's `url` in the OUL, which for this rule is `kommunicering`:

```json
{
  "routes": {
    "kommunicering": {
      "scope": "kommuniceringApp",
      "module": "Kommunicering",
      "devEntry": "http://localhost:3034/mf-manifest.json",
      "prodEntry": "https://your-prod-url.example.com/mf-manifest.json"
    }
  }
}
```

The portal passes `handlaggningId` as a prop and gets a `task-done` event on `window` when the
task is completed.

### The bearer token

The BFF requires an `Authorization` header on `POST /api/task/done`. The portal does not pass a
token as a prop, so the app reads `bearerToken` from the portal's `handlaggareStore` through the
shared Pinia instance (see `src/utils/bearerToken.ts`). If the portal renames that store or
field, Klarmarkera fails with a behörighet message rather than silently.

## Configuration

**Local development**: `.env`, baked into the bundle at build time.

```env
VITE_BFF_URL=
VITE_DEV_HANDLAGGNING_ID=<a handlaggningId from the OUL>
VITE_DEV_BEARER_TOKEN=<typId>:<varde>
```

**Containers**: mount a `runtime-config.js` (ConfigMap with `subPath` on OpenShift):

```js
window.__REGEL_KOMMUNICERING_FE_ENV__ = {
  "RUNTIME_BFF_URL": "https://your-bff.internal.example.com"
};
```

```yaml
volumeMounts:
  - name: runtime-config
    mountPath: /usr/local/apache2/htdocs/runtime-config.js
    subPath: runtime-config.js
```

| Variable | Dev (`.env`) | Container (`runtime-config.js`) | Description |
|---|---|---|---|
| BFF URL | `VITE_BFF_URL` | `RUNTIME_BFF_URL` | BFF base URL; empty means use the dev proxy |
| Dev task id | `VITE_DEV_HANDLAGGNING_ID` | — | Standalone development only |
| Dev token | `VITE_DEV_BEARER_TOKEN` | — | Standalone development only; ignored in production builds |

The global is namespaced per app because a Module Federation remote shares one `window` with
its host.

## What it calls

| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/api/task` | `{handlaggningId}` | Load kund and ersättningar |
| PATCH | `/api/task` | `{handlaggningId, ersattningar, motivering}` | Save ersättningar and motivering |
| POST | `/api/task/done` | `{handlaggningId}` + `Authorization` | Complete the task |
| GET | `/api/uppgiftsbeskrivning` | | Help text for the tooltip |

`Spara` only PATCHes, so work can be put away before every beslutsutfall is set. `Klarmarkera`
validates the whole form, PATCHes unless the form is already saved, then completes. A failed
save stops it before completion.

The PATCH rewrites every field on each ersättning, so all fields are sent back as the form holds
them, and an avslagsanledning is sent only with `NEJ`.

## Tech stack

- Vue 3 + TypeScript
- Vite with `@module-federation/vite`
- Pinia for state
- FKUI design system
- Vitest + happy-dom for tests

See [docs/krav.md](docs/krav.md) for requirements and
[docs/teknisk-spec.md](docs/teknisk-spec.md) for the technical specification.
