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
    ├── slutforKommunicering.ts      # Sekvensen validera → spara → kommuniceringsutfall → slutför
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

Alla anrop skickas med `Authorization: Bearer …`.

| Metod | Sökväg | Body | Beskrivning |
|---|---|---|---|
| GET | `/api/task/{handlaggningId}` | | Hämtar `GetDataResponse` |
| PATCH | `/api/task/{handlaggningId}` | `{ersattningar: UpdateErsattning[], motivering}` | Svarar 204 |
| PATCH | `/api/task/{handlaggningId}/kommuniceringsutfall` | `{utfall: Kommuniceringsutfall}` | Svarar 204 |
| POST | `/api/task/{handlaggningId}/done` | Ingen body | Svarar 204, 422 utan registrerat kommuniceringsutfall |
| GET | `/api/uppgiftsbeskrivning` | | Hjälptext |

BFF:ns `PATCH /api/task/{handlaggningId}/uppgiftskommentar` anropas inte. Regeltjänsten sparar
redan motiveringen som uppgiftens kommentar vid `PATCH /api/task/{handlaggningId}`, och
uppgiftskommentaren skriver samma fält.

### Kommuniceringsutfall

`Kommuniceringsutfall` kommer från `rimfrost-framework-regel-kommuniceringsutfall-openapi`:
`KundAccepterat`, `AccepteratBestridande` och `NekatBestridande`. Regeltjänsten sparar det som
uppgiftens regelutfall, `NEJ` för `AccepteratBestridande` och annars `JA`, och `done` kräver att
ett regelutfall finns. `GetDataResponse` innehåller det inte, så formuläret börjar alltid utan
utfall och `slutforKommunicering` skickar det alltid före `done`.

### PATCH skriver om hela ersättningen

Regeltjänsten sätter varje fält på ersättningen från requesten. Därför skickas alla fält
tillbaka som formuläret håller dem, inte bara de ändrade. Beslutsutfall skickas alltid; saknas
det i underlaget får ersättningen `FU` när formuläret byggs. Avslagsanledning skickas bara med `NEJ`, så text kvar från ett tidigare avslag inte följer
med ett `JA`.

### Token

Regeltjänsten kontrollerar handläggarens identitet och åtkomst till uppgiften vid varje anrop, och
BFF:n skickar vidare `Authorization`. Därför lägger `bffClient.ts` på token i alla anrop.
Portalen skickar bara `handlaggningId` som prop. Den inloggade handläggarens token ligger i
portalens Pinia-store `handlaggareStore` (`bearerToken`). Eftersom Pinia delas som singleton läser
`bearerToken.ts` storens state via id, utan att importera portalens kod. Fristående används
`VITE_DEV_BEARER_TOKEN`, som bara läses i utvecklingsbyggen. Saknas token skickas inget
`done`-anrop. Övriga anrop skickas ändå och nekas med 401, som visas som saknad behörighet.

### Validering i två lager

`FValidationForm` sväljer en inskickning som inte validerar, och visar inget alls om portalens
validerare inte når remoten. Därför körs `valideraForKlarmarkering` på knappens klick, och igen i
`slutforKommunicering` innan något skickas. Spara kör `valideraForSpara`, som inte kräver
kommuniceringsutfall men kräver avslagsanledning för varje NEJ. Spara går inte genom
`FValidationForm`, så fältets egen obligatoriska validering räcker inte där.

### Statuskoder från slutförandet

Gäller både `PATCH .../kommuniceringsutfall` och `POST .../done`.

| Status | Utfall | Meddelande |
|---|---|---|
| 204 | `KLAR` | Ersättningarna är sparade och uppgiften är klarmarkerad |
| 401, 403, ingen token | `OBEHORIG` | Behörighet saknas |
| Övrigt | `FEL` | Generellt fel, uppgiften förblir öppen |

401 och 403 ger samma besked om behörighet även vid hämtning och sparande. BFF:n skickar vidare
regeltjänstens statuskod, men övriga koder, t.ex. 404 och 422, visas än så länge som generellt fel.

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
| Statuskoder som 404 och 422 från regeltjänsten visas som generellt fel | Ge egna meddelanden om handläggarna behöver skilja på dem |
| Mellan `PATCH`, `PATCH .../kommuniceringsutfall` och `POST .../done` finns fönster där en del är sparad men uppgiften inte slutförd | Bedöm om ramverket bör erbjuda ett kombinerat anrop |
| Kommuniceringsutfallet finns inte i `GetDataResponse`, så ett redan registrerat utfall visas inte | Lägg till det i regelns GET-svar |
| Etiketterna för kommuniceringsutfallen är formulerade här, inte i specen | Bekräfta dem med verksamheten |
| Datum matas in som text (`ÅÅÅÅ-MM-DD`) | Byt till `FDatepickerField` om handläggarna önskar |
