# Krav — Kommunicering Frontend (KOMF)

## Bakgrund och syfte

Kommunicering Frontend är en mikrofrontend för handläggarens kommuniceringsuppgift. Handläggaren
går igenom ersättningarna på en handläggning, justerar dem vid behov, sätter beslutsutfall för
var och en, anger utfallet av kommuniceringen, motiverar och slutför uppgiften, direkt i
handläggarportalen.

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
  för varje ersättning. Värdena, liksom beslutsutfall och avslagsanledning enligt KOMF-FR-02.2
  och KOMF-FR-02.3, visas låsta tills handläggaren väljer att ändra ersättningen, och
  en påbörjad ändring ska kunna avbrytas så att värdena från före ändringen återställs. Efter ett
  lyckat sparande låses ersättningarna igen, även när sparandet sker som del av en
  klarmarkering vars senare steg misslyckas.
- **KOMF-FR-02.2** Handläggaren ska kunna välja beslutsutfall (JA, NEJ, FU) för varje
  ersättning. Varje ersättning har alltid ett beslutsutfall. Saknas det i underlaget används FU.
- **KOMF-FR-02.3** Avslagsanledning ska kunna anges när beslutsutfallet är NEJ, och bara då.
- **KOMF-FR-02.4** Handläggaren ska ange en motivering.
- **KOMF-FR-02.5** Handläggaren ska kunna spara utan att slutföra, även innan utfall av
  kommuniceringen är valt.
- **KOMF-FR-02.6** Sparande kräver motivering, heltal för omfattning (0–100), belopp och
  beräkningsgrund, giltiga datum, en period som inte slutar innan den börjar och avslagsanledning
  för varje NEJ.
- **KOMF-FR-02.7** Ett lyckat sparande ska bekräftas, och bekräftelsen ska försvinna så snart
  något fält ändras.
- **KOMF-FR-02.8** Handläggaren ska kunna välja utfall av kommuniceringen: kunden har accepterat,
  bestridandet accepteras eller bestridandet nekas. Sparande kräver inte att utfall är valt.

### KOMF-FR-03 — Slutföra uppgiften

- **KOMF-FR-03.1** Slutförande kräver allt som sparande kräver, plus utfall av kommuniceringen.
- **KOMF-FR-03.2** Ej sparade ändringar ska sparas innan uppgiften slutförs.
- **KOMF-FR-03.3** Om sparandet misslyckas ska uppgiften inte slutföras.
- **KOMF-FR-03.4** Slutförandet ska skickas med den inloggade handläggarens token. Saknas token,
  eller avvisas den, ska handläggaren få ett eget besked om behörighet.
- **KOMF-FR-03.7** Utfallet av kommuniceringen ska registreras innan uppgiften slutförs. Om
  registreringen misslyckas ska uppgiften inte slutföras.
- **KOMF-FR-03.5** Om slutförandet misslyckas ska uppgiften förbli öppen för ett nytt försök.
- **KOMF-FR-03.6** Vid lyckat slutförande ska handläggarportalen meddelas, så att uppgiften kan
  tas bort ur handläggarens lista.

### KOMF-FR-04 — Behörighet

- **KOMF-FR-04.1** Alla anrop till BFF:en ska skickas med den inloggade handläggarens token.
- **KOMF-FR-04.2** Om ett anrop nekas för att behörighet saknas ska handläggaren få ett besked om
  behörighet, inte ett generellt fel.

---

## Icke-funktionella krav

### KOMF-NFR-01 — Integrerbarhet

- **KOMF-NFR-01.1** Mikrofrontenden ska kunna laddas in dynamiskt i handläggarportalen och ta
  emot handläggningens identifierare som indata.
- **KOMF-NFR-01.2** Mikrofrontenden ska kunna köras fristående för utveckling.
- **KOMF-NFR-01.3** Mikrofrontenden ska kunna peka mot olika BFF-instanser utan att byggas om.
- **KOMF-NFR-01.4** Mikrofrontenden ska ta emot den inloggade handläggarens token från
  värdapplikationen som prop (`authorization`, ett färdigt headervärde) och skicka den oförändrad i
  `Authorization`-headern på alla anrop till Kommunicering BFF.
- **KOMF-NFR-01.5** Skickar värdapplikationen ingen `authorization`-prop ska mikrofrontenden under
  en övergångsperiod läsa token ur portalens `handlaggareStore`. Reserven tas bort när alla
  portaler som används skickar propen.
- **KOMF-NFR-01.6** Mikrofrontenden ska byggas med samma version av `@module-federation/vite`
  som handläggarportalen, så att delade moduler (`@fkui/vue`, `@fkui/logic`) fungerar när den
  monteras. Versionen uppgraderas bara samtidigt i portalen och alla remotes.

### KOMF-NFR-02 — Tillgänglighet

- **KOMF-NFR-02.1** Gränssnittet ska byggas med FKUI:s komponenter.

---

## API-gränssnitt (översikt)

| API | Målgrupp | Specifikationsartefakt |
|---|---|---|
| Kommunicering BFF REST-API | Denna mikrofrontend | BFF:ns README; datatyperna från `rimfrost-regel-kommunicering-openapi` |
