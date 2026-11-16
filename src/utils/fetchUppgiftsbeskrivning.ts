import { bffFetch, readJson } from "./bffClient";
import { useKommuniceringStore } from "../stores/KommuniceringStore";
import type { UppgiftsbeskrivningResponse } from "../types";

/** GET /api/uppgiftsbeskrivning — help text for the tooltip. */
export async function fetchUppgiftsbeskrivning(): Promise<void> {
  const store = useKommuniceringStore();
  store.descriptionLoading = true;
  store.descriptionError = false;

  try {
    const response = await bffFetch("/api/uppgiftsbeskrivning", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = await readJson<UppgiftsbeskrivningResponse>(response);
    if (typeof data?.beskrivning !== "string") {
      throw new Error("Invalid response format from BFF");
    }
    store.uppgiftsbeskrivning = data.beskrivning;
  } catch (error) {
    console.error("Error fetching description:", error);
    store.uppgiftsbeskrivning = "";
    store.descriptionError = true;
  } finally {
    store.descriptionLoading = false;
  }
}
