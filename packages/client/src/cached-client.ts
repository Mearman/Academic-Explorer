/**
 * Cached Client - Stub implementation with API structure
 */

import { OpenAlexBaseClient, type OpenAlexClientConfig } from './client';
import { WorksApi } from './entities/works';
import { AuthorsApi } from './entities/authors';
import { SourcesApi } from './entities/sources';
import { InstitutionsApi } from './entities/institutions';
import { TopicsApi } from './entities/topics';
import { PublishersApi } from './entities/publishers';
import { FundersApi } from './entities/funders';

export interface ClientApis {
  works: WorksApi;
  authors: AuthorsApi;
  sources: SourcesApi;
  institutions: InstitutionsApi;
  topics: TopicsApi;
  publishers: PublishersApi;
  funders: FundersApi;
  keywords: any; // Stub for keywords
  getEntity: (id: string) => Promise<any>; // Generic entity getter
}

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  // Add client property that services expect
  client: ClientApis;

  constructor(config: OpenAlexClientConfig = {}) {
    super(config);

    // Create API instances
    this.client = {
      works: new WorksApi(this),
      authors: new AuthorsApi(this),
      sources: new SourcesApi(this),
      institutions: new InstitutionsApi(this),
      topics: new TopicsApi(this),
      publishers: new PublishersApi(this),
      funders: new FundersApi(this),
      keywords: {}, // Stub implementation
      getEntity: async (id: string) => {
        // Basic entity getter stub
        console.warn('CachedOpenAlexClient.getEntity: Stub implementation', id);
        return null;
      }
    };
  }

  updateConfig(config: Partial<OpenAlexClientConfig>) {
    // Stub implementation - in real client would update configuration
    console.warn('CachedOpenAlexClient.updateConfig: Stub implementation');
  }
}

/**
 * Default cached client instance
 */
export const cachedOpenAlex: CachedOpenAlexClient = new CachedOpenAlexClient();

/**
 * Update the email configuration for the global OpenAlex client
 */
export function updateOpenAlexEmail(email: string) {
  cachedOpenAlex.updateConfig({ userEmail: email });
}