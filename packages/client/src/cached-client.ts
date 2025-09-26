/**
 * Cached Client - Stub implementation with API structure
 */

import { OpenAlexBaseClient, type OpenAlexClientConfig } from './client';
import { WorksApi } from './entities/works';
import { AuthorsApi } from './entities/authors';
import { SourcesApi } from './entities/sources';
import { InstitutionsApi } from './entities/institutions';
import { TopicsApi } from './entities/topics';
import { logger } from '@academic-explorer/utils';
import { PublishersApi } from './entities/publishers';
import { FundersApi } from './entities/funders';
import { KeywordsApi } from './entities/keywords';
import type { OpenAlexEntity } from './types';

export interface ClientApis {
  works: WorksApi;
  authors: AuthorsApi;
  sources: SourcesApi;
  institutions: InstitutionsApi;
  topics: TopicsApi;
  publishers: PublishersApi;
  funders: FundersApi;
  keywords: KeywordsApi;
  getEntity: (id: string) => Promise<OpenAlexEntity | null>;
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
      keywords: new KeywordsApi(this),
      getEntity: async (id: string): Promise<OpenAlexEntity | null> => {
        // Basic entity getter stub
        logger.warn('client', 'CachedOpenAlexClient.getEntity: Stub implementation', { id });
        return null;
      }
    };
  }

  updateConfig(_config: Partial<OpenAlexClientConfig>) {
    // Stub implementation - in real client would update configuration
    logger.warn('client', 'CachedOpenAlexClient.updateConfig: Stub implementation');
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