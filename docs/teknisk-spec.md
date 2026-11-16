# Teknisk spec — Kommunicering Frontend (KOMF)

## Översikt

Enskild inbäddad vy (Vue 3 + TypeScript, Pinia), exponerad som en module federation-komponent
till handläggarportalen. Ingen egen routing. All data hämtas via `fetch` mot en dedikerad BFF.

## Komponentstruktur

```text
src/
├── App.vue                          # Rotkomponent, tar emot handlaggningId som prop
├── index.ts                         # init() för värdapplikationen
├── main.ts                          # Fristående utvecklingsläge
├── components/
│   └── Kommunicering.vue            # Kund, ersättningar, motivering, Spara/Klarmarkera
├── config/env.ts                    # Bygg- och körtidskonfiguration
├── config/validation.ts             # Registrerar FKUI:s validerare
├── stores/KommuniceringStore.ts     # Pinia: kund, fel-, ladd- och sparstatus
├── meddelanden.ts                   # Texter som flera vägar delar
├── types.ts                         # Domänmodell speglad från OpenAPI-specen + formulärmodell
└── utils/
    ├── bffClient.ts                 # Bas-url och JSON-kontrakt
    ├── bearerToken.ts               # Läser portalens token
    ├── formular.ts                  # Ersättning ↔ formulärrad ↔ PATCH-body
    ├── validering.ts                # Regler för Spara och Klarmarkera
    ├── slutforKommunicering.ts      # Sekvensen validera → spara → slutför
    └── …                            # Ett anrop per fil i övrigt
```

Formulärets värden ägs av komponenten. Tal och datum hålls som strängar, som fälten binder dem,
och tolkas först när PATCH-bodyn byggs.

## Module federation

| Egenskap | Värde |
|---|---|
| Scope (`name`) | `kommuniceringApp` |
| Exponerad modul | `./Kommunicering` |
| Manifest | `mf-manifest.json` |
| Delade singletons | `vue`, `@fkui/vue`, `@fkui/logic`, `pinia` |
| Utvecklingsport | 3034 |

`@fkui/logic` delas för att remoten ska läsa portalens validerarregister, och
`src/config/validation.ts` registrerar dessutom validerarna själv. `pinia` delas också för att
remoten ska kunna läsa portalens token.

## API

| Metod | Sökväg | Body | Beskrivning |
|---|---|---|---|
| POST | `/api/task` | `{handlaggningId}` | Hämtar `GetDataResponse` |
| PATCH | `/api/task` | `{handlaggningId, ersattningar: UpdateErsattning[], motivering}` | Svarar 204 |
| POST | `/api/task/done` | `{handlaggningId}`, `Authorization: Bearer …` | Svarar 204, 401 utan token |
| GET | `/api/uppgiftsbeskrivning` | | Hjälptext |

### PATCH skriver om hela ersättningen

Regeltjänsten sätter varje fält på ersättningen från requesten. Därför skickas alla fält
tillbaka som formuläret håller dem, inte bara de ändrade. Saknat beslutsutfall skickas som
`null`. Avslagsanledning skickas bara med `NEJ`, så text kvar från ett tidigare avslag inte följer
med ett `JA`.

### Token till slutförandet

Portalen skickar bara `handlaggningId` som prop. Den inloggade handläggarens token ligger i
portalens Pinia-store `handlaggareStore` (`bearerToken`). Eftersom Pinia delas som singleton läser
`bearerToken.ts` storens state via id, utan att importera portalens kod. Fristående används
`VITE_DEV_BEARER_TOKEN`, som bara läses i utvecklingsbyggen. Saknas token skickas inget anrop.

### Validering i två lager

`FValidationForm` sväljer en inskickning som inte validerar, och visar inget alls om portalens
validerare inte når remoten. Därför körs `valideraForKlarmarkering` på knappens klick, och igen i
`slutforKommunicering` innan något skickas. Spara kör `valideraForSpara`, som inte kräver
beslutsutfall.

### Statuskoder från slutförandet

| Status | Utfall | Meddelande |
|---|---|---|
| 204 | `KLAR` | Ersättningarna är sparade och uppgiften är klarmarkerad |
| 401, 403, ingen token | `OBEHORIG` | Behörighet saknas |
| Övrigt | `FEL` | Generellt fel, uppgiften förblir öppen |

BFF:n översätter fel från regeltjänsten till 500, så fler utfall går inte att skilja åt här.

### Besked till värdapplikationen

Vid lyckat slutförande skickas `task-done` på `window` med `handlaggningId` i `detail`.

## Konfiguration

| Egenskap | Beskrivning | Standardvärde |
|---|---|---|
| `VITE_BFF_URL` | BFF-url vid lokal utveckling; tom ger relativa anrop via dev-proxyn | tom |
| `RUNTIME_BFF_URL` (`window.__REGEL_KOMMUNICERING_FE_ENV__`) | BFF-url i container; går före byggtidsvärdet | — |
| `VITE_DEV_HANDLAGGNING_ID` | Fallback-id i fristående läge | — |
| `VITE_DEV_BEARER_TOKEN` | Token i fristående läge; ignoreras i produktionsbyggen | — |

## Testning

Vitest med happy-dom: enhetstester för validering, formulärmappning och varje anrop, samt
komponenttester som monterar `Kommunicering` med `@vue/test-utils`.

## Kända begränsningar och framtida arbete

| Begränsning | Föreslagen åtgärd |
|---|---|
| Remoten läser portalens `handlaggareStore` via id, ett outtalat kontrakt | Låt portalen skicka token som prop eller via ett gemensamt auth-paket |
| `FU` visas som "FU"; betydelsen är inte dokumenterad i `Beslutsutfall` | Bekräfta etiketten med verksamheten |
| Statuskoder från ramverkets `done` (t.ex. 409/422) syns inte, eftersom BFF:n gör om dem till 500 | Låt BFF:n vidarebefordra meningsfulla statuskoder |
| Mellan `PATCH` och `POST .../done` finns ett fönster där ändringar är sparade men uppgiften inte slutförd | Bedöm om ramverket bör erbjuda ett kombinerat anrop |
| Datum matas in som text (`ÅÅÅÅ-MM-DD`) | Byt till `FDatepickerField` om handläggarna önskar |
