/**
 * Custom ESLint rules plugin for BibGraph
 *
 * This plugin contains custom rules to enforce project-specific conventions,
 * particularly around barrel file management and re-export prevention.
 */

import { noDeprecated } from "./no-deprecated.js";
import { noRedundantAssignment } from "./no-redundant-assignment.js";
import { noDuplicateReexports } from "./no-duplicate-reexports.js";
import { noReexportFromNonBarrel } from "./no-reexport-from-non-barrel.js";

export const customRulesPlugin = {
  rules: {
    "no-deprecated": noDeprecated,
    "no-redundant-assignment": noRedundantAssignment,
    "no-duplicate-reexports": noDuplicateReexports,
    "no-reexport-from-non-barrel": noReexportFromNonBarrel,
  },
};

export {
  noDeprecated,
  noRedundantAssignment,
  noDuplicateReexports,
  noReexportFromNonBarrel,
};