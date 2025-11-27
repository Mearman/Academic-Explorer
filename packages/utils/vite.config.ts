import { createLibConfig } from "../../vite.config.lib";

export default createLibConfig({
  root: __dirname,
  name: "AcademicExplorerUtils",
  external: ["dexie", "zustand", "immer"],
});
