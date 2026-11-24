import { defineStore } from "pinia";
import type { Kund } from "../types";

/**
 * Shared status between the component and the call helpers. The form's own
 * values are not here: they belong to the component that edits them.
 *
 * Pinia options state is writable directly, so there are no pass-through
 * setters — helpers assign the fields they own.
 */
export const useKommuniceringStore = defineStore("KommuniceringStore", {
  state: () => ({
    kund: null as Kund | null,
    loading: false,
    saving: false,
    error: null as string | null,
    /** Set by a successful PATCH, cleared as soon as the form is edited again. */
    sparad: false,
    uppgiftsbeskrivning: "",
    descriptionLoading: false,
    descriptionError: false,
    /**
     * The logged-in handläggare's full Authorization header value, from the
     * portal's `authorization` prop (PORT-FR-03.6), or null. Set by
     * Kommunicering.vue; read by bearerToken.ts. Cleared by `$reset()` like
     * everything else, so the component sets it again after each reset.
     */
    authorization: null as string | null,
  }),
});
