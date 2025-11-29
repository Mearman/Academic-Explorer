import { barrelsbyHeader } from "./barrelsby-header.js";
import { noDeprecated } from "./no-deprecated.js";

export const customRulesPlugin = {
  rules: {
    "barrelsby-header": barrelsbyHeader,
    "no-deprecated": noDeprecated,
  },
};
