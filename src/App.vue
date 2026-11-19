<script setup lang="ts">
import { FLayoutApplicationTemplate, FLayoutLeftPanel, FPageHeader } from "@fkui/vue";
import Kommunicering from "./components/Kommunicering.vue";
import { env } from "./config/env";

const props = defineProps<{
  handlaggningId?: string | null;
}>();

const isDev = import.meta.env.DEV;

// Standalone dev has no host to pass the id, so fall back to VITE_DEV_HANDLAGGNING_ID.
const handlaggningId = props.handlaggningId || env.devHandlaggningId;
</script>

<template>
  <f-layout-application-template v-if="isDev">
    <template #header>
      <f-page-header />
    </template>
    <f-layout-left-panel>
      <Kommunicering :handlaggning-id="handlaggningId" />
    </f-layout-left-panel>
  </f-layout-application-template>
  <Kommunicering v-else :handlaggning-id="handlaggningId" />
</template>
