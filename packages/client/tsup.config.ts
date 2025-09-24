import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/entities/index.ts',
    'src/utils/index.ts',
    'src/types.ts',
    'src/internal/rate-limit.ts',
    'src/internal/type-helpers.ts',
    'src/internal/logger.ts',
    'src/internal/static-data-provider.ts',
    'src/internal/static-data-utils.ts'
  ],
  format: ['esm', 'cjs'],
  dts: false,
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
