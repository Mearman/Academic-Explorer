import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/entities/index.ts',
    'src/utils/index.ts',
    'src/types.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  external: [],
  target: 'es2022',
  outDir: 'dist',
  tsconfig: './tsconfig.json'
})