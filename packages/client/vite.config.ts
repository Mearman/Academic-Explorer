import { createLibConfig } from "../../vite.config.lib";

export default createLibConfig({
  root: __dirname,
  name: "AcademicExplorerClient",
  external: ["axios", "axios-rate-limit", "axios-retry", "p-retry"],
});
