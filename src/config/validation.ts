import { ValidationService, availableValidators } from "@fkui/logic";

/**
 * FKUI's validators live in a registry on `ValidationService`, a module-level
 * singleton in @fkui/logic that the host fills with `app.use(ValidationPlugin)`.
 * vite.config.ts shares @fkui/logic as a singleton so the remote reads the
 * host's registry; registering here as well keeps the fields working against a
 * host that does not share it.
 */
let registered = false;

export function ensureValidatorsRegistered(): void {
  if (registered) {
    return;
  }
  registered = true;
  for (const validator of availableValidators) {
    ValidationService.registerValidator(validator);
  }
}
