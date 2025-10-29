/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_GITHUB_PAGES?: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constant injected by Vite's define config
declare const __GITHUB_PAGES__: boolean;
