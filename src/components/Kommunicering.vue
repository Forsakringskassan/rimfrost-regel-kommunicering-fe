<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import {
  FButton,
  FFieldset,
  FLoader,
  FMessageBox,
  FRadioField,
  FStaticField,
  FTextareaField,
  FTextField,
  FTooltip,
  FValidationForm,
} from "@fkui/vue";
import { ensureValidatorsRegistered } from "../config/validation";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import { fetchKommunicering } from "../utils/fetchKommunicering";
import { fetchUppgiftsbeskrivning } from "../utils/fetchUppgiftsbeskrivning";
import { tillRad } from "../utils/formular";
import { slutforKommunicering } from "../utils/slutforKommunicering";
import { sparaKommunicering } from "../utils/sparaKommunicering";
import { valideraForKlarmarkering, valideraForSpara } from "../utils/validering";
import { INGA_ERSATTNINGAR, INGEN_HANDLAGGNING } from "../meddelanden";
import { Beslutsutfall, KlarmarkeraResultat } from "../types";
import type { KommuniceringFormular } from "../types";

const { handlaggningId } = defineProps<{
  handlaggningId?: string | null;
}>();

ensureValidatorsRegistered();

const store = useKommuniceringStore();

const formular = reactive<KommuniceringFormular>({ ersattningar: [], motivering: "" });
/** The form is shown only once there is real underlag behind it. */
const underlagLaddat = ref(false);
const klar = ref(false);

const kundNamn = computed(() =>
  [store.kund?.fornamn, store.kund?.efternamn].filter(Boolean).join(" "),
);

const BESLUTSUTFALL_ALTERNATIV = [
  { value: Beslutsutfall.JA, label: "Bifall" },
  { value: Beslutsutfall.NEJ, label: "Avslag" },
  { value: Beslutsutfall.FU, label: "FU" },
];

// FTooltip emits toggle on close as well as on open; only an open with nothing
// fetched yet (or a failed earlier attempt) fetches.
function handleTooltipToggle(event: { isOpen: boolean }): void {
  if (!event.isOpen || store.descriptionLoading || store.uppgiftsbeskrivning) {
    return;
  }
  fetchUppgiftsbeskrivning();
}

/** Spara sits outside the form's validation flow: no beslutsutfall is needed. */
async function handleSpara(): Promise<void> {
  if (!handlaggningId) {
    return;
  }
  const valideringsfel = valideraForSpara(formular);
  if (valideringsfel) {
    store.error = valideringsfel;
    return;
  }
  await sparaKommunicering(handlaggningId, formular);
}

/**
 * Runs on the button's own click, not on submit: FValidationForm swallows a
 * submit that fails its validation, and renders nothing at all when the host's
 * validators do not reach this remote. Reporting from the click always does.
 */
function rapporteraValideringsfel(): void {
  store.error = valideraForKlarmarkering(formular);
}

async function handleKlarmarkera(): Promise<void> {
  if (!handlaggningId) {
    return;
  }
  const resultat = await slutforKommunicering(handlaggningId, formular);
  klar.value = resultat === KlarmarkeraResultat.KLAR;
}

// Any edit after a save means the registered data no longer matches the form.
watch(
  formular,
  () => {
    store.sparad = false;
  },
  { deep: true },
);

// Watched rather than loaded once on mount: the store is the host's Pinia
// singleton and outlives one mount of this remote, so a stale `sparad` would
// otherwise let Klarmarkera skip the save on the next task. The cleanup aborts
// a superseded load before its replacement touches the store.
watch(
  () => handlaggningId,
  async (id, _prev, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());

    store.$reset();
    klar.value = false;
    underlagLaddat.value = false;
    formular.ersattningar = [];
    formular.motivering = "";

    if (!id) {
      store.error = INGEN_HANDLAGGNING;
      return;
    }

    const data = await fetchKommunicering(id, controller.signal);
    if (controller.signal.aborted || !data) {
      return;
    }
    if (data.ersattningar.length === 0) {
      store.error = INGA_ERSATTNINGAR;
      return;
    }
    formular.ersattningar = data.ersattningar.map(tillRad);
    underlagLaddat.value = true;
  },
  { immediate: true },
);
</script>

<template>
  <div class="kommunicering">
    <f-static-field>
      <template #label>Kommunicering</template>
      <template #tooltip>
        <f-tooltip
          screen-reader-text="Läs mer om uppgiften kommunicering"
          header-tag="h2"
          @toggle="handleTooltipToggle"
        >
          <template #header>Läs mer om uppgiften "Kommunicering"</template>
          <template #body>
            <f-loader
              v-if="store.descriptionLoading"
              :show="true"
              :delay="true"
              class="kommunicering__loader"
            >
              Vänligen vänta
            </f-loader>
            <span v-else-if="store.uppgiftsbeskrivning">{{ store.uppgiftsbeskrivning }}</span>
            <span v-else-if="store.descriptionError">Kunde inte hämta uppgiftsbeskrivningen.</span>
            <span v-else>Ingen beskrivning tillgänglig.</span>
          </template>
        </f-tooltip>
      </template>
    </f-static-field>

    <f-loader :show="store.loading" :delay="true" class="kommunicering__loader">
      Vänligen vänta
    </f-loader>

    <f-message-box v-if="store.error" type="error" layout="short">
      {{ store.error }}
    </f-message-box>

    <f-message-box v-if="klar" type="success" layout="short">
      Ersättningarna är sparade och uppgiften är klarmarkerad.
    </f-message-box>

    <template v-if="underlagLaddat && !klar">
      <f-static-field v-if="kundNamn">
        <template #label>Kund</template>
        <template #default>{{ kundNamn }}</template>
      </f-static-field>

      <f-validation-form @submit="handleKlarmarkera">
        <template #error-message>
          <p>Gå till fältet som är markerat.</p>
        </template>

        <section
          v-for="rad in formular.ersattningar"
          :key="rad.ersattningId"
          class="kommunicering__ersattning"
          :aria-label="`Ersättning ${rad.ersattningstyp}`"
        >
          <h3 class="kommunicering__rubrik">{{ rad.ersattningstyp }}</h3>

          <div class="kommunicering__rad">
            <f-text-field
              v-model="rad.from"
              v-validation.required.date
              :name="`from-${rad.ersattningId}`"
              :disabled="store.saving"
            >
              Från och med
            </f-text-field>
            <f-text-field
              v-model="rad.tom"
              v-validation.required.date
              :name="`tom-${rad.ersattningId}`"
              :disabled="store.saving"
            >
              Till och med
            </f-text-field>
          </div>

          <div class="kommunicering__rad">
            <f-text-field
              v-model="rad.omfattningProcent"
              v-validation.required.integer
              :name="`omfattning-${rad.ersattningId}`"
              :disabled="store.saving"
            >
              Omfattning (%)
            </f-text-field>
            <f-text-field
              v-model="rad.belopp"
              v-validation.required.integer
              :name="`belopp-${rad.ersattningId}`"
              :disabled="store.saving"
            >
              Belopp (kr)
            </f-text-field>
            <f-text-field
              v-model="rad.berakningsgrund"
              v-validation.required.integer
              :name="`berakningsgrund-${rad.ersattningId}`"
              :disabled="store.saving"
            >
              Beräkningsgrund (kr)
            </f-text-field>
          </div>

          <f-fieldset
            v-validation.required
            horizontal
            :name="`beslutsutfall-${rad.ersattningId}`"
          >
            <template #label>Beslutsutfall</template>
            <template #default="{ sharedName }">
              <f-radio-field
                v-for="alternativ in BESLUTSUTFALL_ALTERNATIV"
                :key="alternativ.value"
                v-model="rad.beslutsutfall"
                :name="sharedName"
                :value="alternativ.value"
                :disabled="store.saving"
              >
                {{ alternativ.label }}
              </f-radio-field>
            </template>
          </f-fieldset>

          <f-textarea-field
            v-if="rad.beslutsutfall === Beslutsutfall.NEJ"
            v-model="rad.avslagsanledning"
            v-validation.required
            :name="`avslagsanledning-${rad.ersattningId}`"
            :disabled="store.saving"
          >
            Avslagsanledning
          </f-textarea-field>
        </section>

        <f-textarea-field
          v-model="formular.motivering"
          v-validation.required
          name="motivering"
          :disabled="store.saving"
        >
          Motivering
        </f-textarea-field>

        <!--
          Yields to the error box: "sparade" next to a failed Klarmarkera reads
          as a contradiction, and the failure is what needs acting on.
        -->
        <f-message-box v-if="store.sparad && !store.error" type="success" layout="short">
          Uppgifterna är sparade.
        </f-message-box>

        <div class="kommunicering__knappar">
          <f-button
            type="button"
            variant="secondary"
            size="medium"
            :disabled="store.saving"
            @click="handleSpara"
          >
            Spara
          </f-button>
          <f-button
            type="submit"
            variant="primary"
            size="medium"
            :disabled="store.saving"
            @click="rapporteraValideringsfel"
          >
            Klarmarkera
          </f-button>
        </div>
      </f-validation-form>
    </template>
  </div>
</template>

<style scoped>
.kommunicering__loader {
  margin-top: 2rem !important;
  min-height: 6.25rem;
}

.kommunicering__ersattning {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border: 1px solid #ccc;
  border-radius: 0.35rem;
}

.kommunicering__rubrik {
  margin-top: 0;
}

.kommunicering__rad {
  display: flex;
  flex-wrap: wrap;
  gap: 0 1.5rem;
}

.kommunicering__rad > * {
  flex: 1 1 10rem;
}

.kommunicering__knappar {
  margin-top: 2rem;
  display: flex;
  gap: 0.75rem;
}
</style>
