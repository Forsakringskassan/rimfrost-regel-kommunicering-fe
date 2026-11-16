# Krav — Kommunicering Frontend (KOMF)

## Bakgrund och syfte

Kommunicering Frontend är en mikrofrontend för handläggarens kommuniceringsuppgift. Handläggaren
går igenom ersättningarna på en handläggning, justerar dem vid behov, sätter beslutsutfall för
var och en, motiverar och slutför uppgiften, direkt i handläggarportalen.

---

## Intressenter och aktörer

| Aktör | Roll |
|---|---|
| Handläggare | Enda användarrollen; hanterar ersättningarna och slutför uppgiften |
| Handläggarportalen (värdapplikation) | Laddar in mikrofrontenden, förmedlar handläggningens identifierare och den inloggade handläggarens token |
| Kommunicering BFF | Enda bakomliggande tjänst mikrofrontenden anropar |

---

## Funktionella krav

### KOMF-FR-01 — Visa underlag

- **KOMF-FR-01.1** Vid öppning ska gränssnittet hämta och visa kund och ersättningar för den
  angivna handläggningen.
- **KOMF-FR-01.2** Varje ersättning ska visas med typ, period, omfattning, belopp,
  beräkningsgrund och eventuellt redan registrerat beslutsutfall och avslagsanledning.
- **KOMF-FR-01.3** Om underlaget inte kan hämtas ska ett felmeddelande visas i stället för
  formuläret.
- **KOMF-FR-01.4** Om handläggningen saknar ersättningar ska ett meddelande visas och inget
  formulär.
- **KOMF-FR-01.5** Om ingen handläggning anges ska ett felmeddelande visas och inget formulär.
- **KOMF-FR-01.6** Handläggaren ska kunna öppna en hjälptext som beskriver uppgiften.

### KOMF-FR-02 — Hantera ersättningar

- **KOMF-FR-02.1** Handläggaren ska kunna ändra period, omfattning, belopp och beräkningsgrund
  för varje ersättning.
- **KOMF-FR-02.2** Handläggaren ska kunna välja beslutsutfall (JA, NEJ, FU) för varje
  ersättning.
- **KOMF-FR-02.3** Avslagsanledning ska kunna anges när beslutsutfallet är NEJ, och bara då.
- **KOMF-FR-02.4** Handläggaren ska ange en motivering.
- **KOMF-FR-02.5** Handläggaren ska kunna spara utan att slutföra, även innan beslutsutfall är
  valt för alla ersättningar.
- **KOMF-FR-02.6** Sparande kräver motivering, heltal för omfattning (0–100), belopp och
  beräkningsgrund, giltiga datum och en period som inte slutar innan den börjar.
- **KOMF-FR-02.7** Ett lyckat sparande ska bekräftas, och bekräftelsen ska försvinna så snart
  något fält ändras.

### KOMF-FR-03 — Slutföra uppgiften

- **KOMF-FR-03.1** Slutförande kräver allt som sparande kräver, plus beslutsutfall för varje
  ersättning och avslagsanledning för varje NEJ.
- **KOMF-FR-03.2** Ej sparade ändringar ska sparas innan uppgiften slutförs.
- **KOMF-FR-03.3** Om sparandet misslyckas ska uppgiften inte slutföras.
- **KOMF-FR-03.4** Slutförandet ska skickas med den inloggade handläggarens token. Saknas token,
  eller avvisas den, ska handläggaren få ett eget besked om behörighet.
- **KOMF-FR-03.5** Om slutförandet misslyckas ska uppgiften förbli öppen för ett nytt försök.
- **KOMF-FR-03.6** Vid lyckat slutförande ska handläggarportalen meddelas, så att uppgiften kan
  tas bort ur handläggarens lista.

---

## Icke-funktionella krav

### KOMF-NFR-01 — Integrerbarhet

- **KOMF-NFR-01.1** Mikrofrontenden ska kunna laddas in dynamiskt i handläggarportalen och ta
  emot handläggningens identifierare som indata.
- **KOMF-NFR-01.2** Mikrofrontenden ska kunna köras fristående för utveckling.
- **KOMF-NFR-01.3** Mikrofrontenden ska kunna peka mot olika BFF-instanser utan att byggas om.

### KOMF-NFR-02 — Tillgänglighet

- **KOMF-NFR-02.1** Gränssnittet ska byggas med FKUI:s komponenter.

---

## API-gränssnitt (översikt)

| API | Målgrupp | Specifikationsartefakt |
|---|---|---|
| Kommunicering BFF REST-API | Denna mikrofrontend | BFF:ns README; datatyperna från `rimfrost-regel-kommunicering-openapi` |
