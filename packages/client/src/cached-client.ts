/**
 * Cached Client - Minimal stub implementation
 */

import { OpenAlexBaseClient, type OpenAlexClientConfig } from './client';

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  constructor(config: OpenAlexClientConfig = {}) {
    super(config);
  }

  updateConfig(config: Partial<OpenAlexClientConfig>) {
    // Stub implementation - in real client would update configuration
    console.warn('CachedOpenAlexClient.updateConfig: Stub implementation');
  }
}

/**
 * Default cached client instance
 */
export const cachedOpenAlex = new CachedOpenAlexClient();

/**
 * Update the email configuration for the global OpenAlex client
 */
export function updateOpenAlexEmail(email: string) {
  cachedOpenAlex.updateConfig({ userEmail: email });
}