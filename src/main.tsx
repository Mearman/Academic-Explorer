import { enableMapSet } from 'immer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { ReactQueryProvider } from './lib/react-query/provider';
import { ThemeProvider } from './providers/theme-provider';

// Enable Immer Map/Set support for entity graph store
enableMapSet();

// Mantine styles
import '@mantine/core/styles.css';

// XYFlow React styles
import '@xyflow/react/dist/style.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ReactQueryProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </ReactQueryProvider>
);