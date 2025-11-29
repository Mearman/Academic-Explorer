import { barrelsbyHeader } from "./barrelsby-header.js";
import { noDeprecated } from "./no-deprecated.js";
import { noDuplicateReexports } from "./no-duplicate-reexports.js";

export const customRulesPlugin = {
  rules: {
    "barrelsby-header": barrelsbyHeader,
    "no-deprecated": noDeprecated,
    "no-duplicate-reexports": noDuplicateReexports,
  },
};
