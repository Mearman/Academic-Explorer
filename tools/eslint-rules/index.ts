import { barrelsbyHeader } from "./barrelsby-header.js";
import { noDeprecated } from "./no-deprecated.js";
import { noDuplicateReexports } from "./no-duplicate-reexports.js";
import { noReexportFromNonBarrel } from "./no-reexport-from-non-barrel.js";

export const customRulesPlugin = {
  rules: {
    "barrelsby-header": barrelsbyHeader,
    "no-deprecated": noDeprecated,
    "no-duplicate-reexports": noDuplicateReexports,
    "no-reexport-from-non-barrel": noReexportFromNonBarrel,
  },
};
