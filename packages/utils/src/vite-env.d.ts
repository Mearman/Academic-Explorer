/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment variables
 * These types ensure TypeScript recognizes import.meta.env in the utils package
 */

interface ImportMetaEnv {
  readonly MODE?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly SSR?: boolean;
  [key: string]: unknown;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
