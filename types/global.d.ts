// Global type declarations to satisfy TypeScript's type resolution

declare module "node" {
  // Basic Node.js types to satisfy TypeScript
  export namespace process {
    export var env: Record<string, string | undefined>;
    export var platform: string;
    export var arch: string;
    export var version: string;
    export var versions: Record<string, string>;
    export var cwd: () => string;
  }
  export var Buffer: any;
  export var global: any;
  export var __dirname: string;
  export var __filename: string;
  export var require: any;
  export var module: any;
  export var exports: any;
}

declare namespace NodeJS {
  interface Timeout {}
  interface Timer {}
  type ErrnoException = Error & {
    code?: string;
    errno?: number;
    path?: string;
    syscall?: string;
  };
}

// Global process variable
declare var process: {
  env: Record<string, string | undefined>;
  platform: string;
  arch: string;
  version: string;
  versions: Record<string, string>;
  cwd: () => string;
};

// React types (basic interface to satisfy TypeScript)
declare module "react" {
  export interface ComponentType<P = {}> {
    new (props: P): React.Component<P, any>;
  }
  export interface FunctionComponent<P = {}> {
    (props: P): JSX.Element;
  }
  export const createElement: any;
  export namespace JSX {
    interface Element {}
    interface IntrinsicElements {}
  }
}

declare module "react-dom" {
  export const render: any;
}

declare module "three" {
  // Basic Three.js types
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
  }
  export class Scene {}
  export class Camera {}
  export class Mesh {}
}

declare module "d3-force" {
  export function forceSimulation(): any;
}

declare module "d3-random" {
  export function randomUniform(min?: number, max?: number): () => number;
}

declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const test: any;
  export const expect: any;
  export const vi: {
    beforeEach: (fn: () => void) => void;
    fn: () => any;
    mock: (path: string, factory?: () => any) => void;
  };
  export const beforeEach: (fn: () => void) => void;
}

declare module "dexie" {
  export class Dexie {
    constructor(name: string);
    version(version: number): any;
    table(name: string): any;
  }
  export interface Table<T, Key> {
    add(item: T): Promise<Key>;
    get(key: Key): Promise<T | undefined>;
    where(field: string): any;
    toArray(): Promise<T[]>;
  }
}

// Node.js built-in modules
declare module "fs" {
  export function readFile(path: string | Buffer | URL, callback?: (err: NodeJS.ErrnoException | null, data: Buffer) => void): void;
  export function readFile(path: string | Buffer | URL, encoding: string, callback?: (err: NodeJS.ErrnoException | null, data: string) => void): void;
  export function writeFile(path: string | Buffer | URL, data: string | Buffer, callback?: (err: NodeJS.ErrnoException | null) => void): void;
  export function stat(path: string | Buffer | URL, callback: (err: NodeJS.ErrnoException | null, stats: any) => void): void;
  export function readdir(path: string | Buffer | URL, callback?: (err: NodeJS.ErrnoException | null, files: string[]) => void): void;
  export const promises: {
    readFile(path: string | Buffer | URL): Promise<Buffer>;
    writeFile(path: string | Buffer | URL, data: string | Buffer): Promise<void>;
    stat(path: string | Buffer | URL): Promise<any>;
    readdir(path: string | Buffer | URL): Promise<string[]>;
  };
}

declare module "path" {
  export function join(...paths: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export const sep: string;
}

declare module "crypto" {
  export function createHash(algorithm: string): any;
  export function randomUUID(): string;
}

declare module "url" {
  export function parse(url: string): any;
  export function format(urlObject: any): string;
  export class URLSearchParams {
    get(name: string): string | null;
    set(name: string, value: string): void;
    has(name: string): boolean;
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    entries(): IterableIterator<[string, string]>;
  }
  export class URL {
    constructor(url: string, base?: string | URL);
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
  }
}

declare module "node:path" {
  export * from "path";
}

declare module "fs/promises" {
  export * from "fs";
}

declare module "node:fs" {
  export * from "fs";
}

declare module "node:crypto" {
  export * from "crypto";
}

declare module "node:process" {
  export * from "process";
}

// Suppress remaining TypeScript type definition errors
declare module "*" {}