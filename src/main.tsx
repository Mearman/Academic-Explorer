import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';

import App from './App';
import { mantineTheme } from './lib/mantine-theme';

// Enable Immer Map/Set support for entity graph store
enableMapSet();

// Mantine styles
import '@mantine/core/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={mantineTheme}>
      <App />
    </MantineProvider>
  </StrictMode>,
);