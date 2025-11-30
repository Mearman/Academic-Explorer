// Re-export all Vanilla Extract styles
export * from "./common.css";
export * from "./layout.css";

// Re-export shadcn styles with namespace to avoid conflicts
import * as shadcnTheme from "./shadcn-theme.css";
export { shadcnTheme };