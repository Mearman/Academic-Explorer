// Basic Node.js type declarations for tools scripts
declare module 'fs' {
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module 'url' {
  export function fileURLToPath(url: string): string;
}

declare module 'child_process' {
  export function execSync(command: string, options?: any): string;
}

declare module 'util' {
  export function promisify<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;
}

declare module 'node:fs' {
  export * from 'fs';
}

declare module 'node:path' {
  export * from 'path';
}

declare module 'node:child_process' {
  export * from 'child_process';
}

declare module 'process' {
  const process: {
    argv: string[];
    env: Record<string, string>;
    cwd(): string;
    exit(code?: number): never;
  };
  export = process;
}

declare const process: {
  argv: string[];
  env: Record<string, string>;
  cwd(): string;
  exit(code?: number): never;
};

declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};

declare const require: any;
declare const module: any;

declare namespace ImportMeta {
  const url: string;
}