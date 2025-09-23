import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['**/*.test.*', '**/*.stories.*'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AcademicExplorerUI',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mantine/core',
        '@mantine/hooks',
        '@mantine/dates',
        '@mantine/notifications',
        '@mantine/spotlight',
        '@tabler/icons-react',
        '@tanstack/react-table',
        '@xyflow/react',
        'date-fns',
        'immer',
        'zustand',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          '@mantine/core': 'MantineCore',
          '@mantine/hooks': 'MantineHooks',
          '@mantine/dates': 'MantineDates',
          '@mantine/notifications': 'MantineNotifications',
          '@mantine/spotlight': 'MantineSpotlight',
          '@tabler/icons-react': 'TablerIcons',
          '@tanstack/react-table': 'ReactTable',
          '@xyflow/react': 'XYFlow',
          'date-fns': 'dateFns',
          'immer': 'immer',
          'zustand': 'zustand',
        },
      },
    },
    sourcemap: true,
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});