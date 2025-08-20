/**
 * OpenAlex Entity Detection Utilities
 * 
 * This module provides utilities for detecting, parsing, and validating OpenAlex entity types
 * from various ID formats including prefixed IDs, full URLs, external identifiers, and normalized forms.
 * 
 * Supports all OpenAlex entity types:
 * - W: Works (papers, articles, etc.)
 * - A: Authors 
 * - S: Sources (journals, conferences, etc.)
 * - I: Institutions
 * - P: Publishers
 * - F: Funders
 * - T: Topics
 * - C: Concepts (legacy)
 * - K: Keywords
 * - N: Continents
 * - R: Regions
 * 
 * Also supports external ID formats:
 * - DOIs (10.7717/peerj.4375) for Works
 * - ORCIDs (0000-0003-1613-5981) for Authors  
 * - ISSN-L for Sources
 * - ROR IDs for Institutions
 * - Wikidata IDs for Concepts and Publishers
 */

/**
 * OpenAlex entity type enumeration
 */
export enum EntityType {
  WORK = 'work',
  AUTHOR = 'author', 
  SOURCE = 'source',
  INSTITUTION = 'institution',
  PUBLISHER = 'publisher',
  FUNDER = 'funder',
  TOPIC = 'topic',
  CONCEPT = 'concept',
  KEYWORD = 'keyword',
  CONTINENT = 'continent',
  REGION = 'region'
}

/**
 * External ID type enumeration for non-OpenAlex identifiers
 */
export enum ExternalIdType {
  DOI = 'doi',
  ORCID = 'orcid',
  ROR = 'ror',
  ISSN_L = 'issn-l',
  WIKIDATA = 'wikidata',
  OPENALEX = 'openalex'
}

/**
 * Entity type prefix mapping
 */
export const ENTITY_PREFIXES: Record<string, EntityType> = {
  W: EntityType.WORK,
  A: EntityType.AUTHOR,
  S: EntityType.SOURCE,
  I: EntityType.INSTITUTION,
  P: EntityType.PUBLISHER,
  F: EntityType.FUNDER,
  T: EntityType.TOPIC,
  C: EntityType.CONCEPT,
  K: EntityType.KEYWORD,
  N: EntityType.CONTINENT,
  R: EntityType.REGION
} as const;

/**
 * Reverse mapping from entity type to prefix
 */
export const TYPE_TO_PREFIX: Record<EntityType, string> = Object.fromEntries(
  Object.entries(ENTITY_PREFIXES).map(([prefix, type]) => [type, prefix])
) as Record<EntityType, string>;

/**
 * API endpoint paths for each entity type
 */
export const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  [EntityType.WORK]: 'works',
  [EntityType.AUTHOR]: 'authors',
  [EntityType.SOURCE]: 'sources',
  [EntityType.INSTITUTION]: 'institutions',
  [EntityType.PUBLISHER]: 'publishers',
  [EntityType.FUNDER]: 'funders',
  [EntityType.TOPIC]: 'topics',
  [EntityType.CONCEPT]: 'concepts',
  [EntityType.KEYWORD]: 'keywords',
  [EntityType.CONTINENT]: 'continents',
  [EntityType.REGION]: 'regions'
} as const;

/**
 * Entity-external ID type mappings - which entity types can use which external ID types
 */
export const ENTITY_EXTERNAL_ID_MAPPINGS: Record<EntityType, ExternalIdType[]> = {
  [EntityType.WORK]: [ExternalIdType.DOI, ExternalIdType.OPENALEX],
  [EntityType.AUTHOR]: [ExternalIdType.ORCID, ExternalIdType.OPENALEX],
  [EntityType.SOURCE]: [ExternalIdType.ISSN_L, ExternalIdType.OPENALEX],
  [EntityType.INSTITUTION]: [ExternalIdType.ROR, ExternalIdType.OPENALEX],
  [EntityType.PUBLISHER]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX],
  [EntityType.FUNDER]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX],
  [EntityType.TOPIC]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX],
  [EntityType.CONCEPT]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX],
  [EntityType.KEYWORD]: [ExternalIdType.OPENALEX],
  [EntityType.CONTINENT]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX],
  [EntityType.REGION]: [ExternalIdType.WIKIDATA, ExternalIdType.OPENALEX]
} as const;

/**
 * Regular expressions for ID validation
 */
const ID_PATTERNS = {
  // OpenAlex ID pattern: prefix + 7-10 digit number (some shorter IDs exist)
  OPENALEX_ID: /^[WASIPFTCKRN]\d{7,10}$/i,
  // Full OpenAlex URL pattern
  OPENALEX_URL: /^https?:\/\/openalex\.org\/([WASIPFTCKRN]\d{7,10})$/i,
  // Numeric ID pattern (without prefix)
  NUMERIC_ID: /^\d{7,10}$/,
  
  // External ID patterns
  DOI: /^10\.[0-9]{4,}\/[^\s]+$/,
  DOI_URL: /^https?:\/\/(dx\.)?doi\.org\/(10\.[0-9]{4,}\/[^\s]+)$/i,
  DOI_NAMESPACE: /^doi:(10\.[0-9]{4,}\/[^\s]+)$/i,
  
  ORCID: /^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$/,
  ORCID_URL: /^https?:\/\/(www\.)?orcid\.org\/([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])$/i,
  ORCID_NAMESPACE: /^orcid:([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X])$/i,
  
  ROR: /^0[0-9a-z]{6}[0-9]{2}$/,
  ROR_URL: /^https?:\/\/(www\.)?ror\.org\/(0[0-9a-z]{6}[0-9]{2})$/i,
  ROR_NAMESPACE: /^ror:(0[0-9a-z]{6}[0-9]{2})$/i,
  
  ISSN_L: /^[0-9]{4}-[0-9]{3}[0-9X]$/,
  
  WIKIDATA: /^Q[0-9]+$/i,
  WIKIDATA_URL: /^https?:\/\/(www\.)?wikidata\.org\/wiki\/(Q[0-9]+)$/i,
  WIKIDATA_NAMESPACE: /^wikidata:(Q[0-9]+)$/i,
  DOI_NAMESPACE_CASE_INSENSITIVE: /^doi:(10\.[0-9]{4,}\/[^\s]+)$/i
} as const;

/**
 * Base URL for OpenAlex
 */
const OPENALEX_BASE_URL = 'https://openalex.org';

/**
 * Custom error class for entity detection errors
 */
export class EntityDetectionError extends Error {
  constructor(message: string, public readonly input?: string) {
    super(message);
    this.name = 'EntityDetectionError';
  }
}

/**
 * Result interface for entity parsing operations
 */
export interface EntityParseResult {
  /** The detected entity type */
  type: EntityType;
  /** The normalized OpenAlex ID (with prefix) */
  id: string;
  /** The numeric portion of the ID */
  numericId: string;
  /** The single-letter prefix */
  prefix: string;
  /** Whether this was parsed from a URL */
  fromUrl: boolean;
}

/**
 * Extended result interface for external ID parsing
 */
export interface ExternalIdParseResult {
  /** The detected external ID type */
  idType: ExternalIdType;
  /** The cleaned/normalized external ID */
  cleanId: string;
  /** The original input that was parsed */
  originalInput: string;
  /** Whether this was parsed from a URL */
  fromUrl: boolean;
  /** Whether this was parsed from a namespace format (e.g., doi:10.xxxx) */
  fromNamespace: boolean;
  /** Possible entity types that can use this external ID */
  possibleEntityTypes: EntityType[];
}

/**
 * Combined result for any ID type resolution
 */
export interface IdResolutionResult {
  /** The determined entity type (if determinable) */
  entityType?: EntityType;
  /** The normalized OpenAlex ID (if it's an OpenAlex ID) */
  openAlexId?: string;
  /** External ID information (if it's an external ID) */
  externalId?: ExternalIdParseResult;
  /** Whether the entity type was definitively determined */
  isDefinitive: boolean;
  /** The original input that was resolved */
  originalInput: string;
}

/**
 * Detect the type of ID from input string
 * 
 * @param id - The ID string to analyze
 * @returns The detected external ID type
 * @throws EntityDetectionError if ID format cannot be determined
 * 
 * @example
 * ```typescript
 * detectIdType('10.7717/peerj.4375') // ExternalIdType.DOI
 * detectIdType('0000-0003-1613-5981') // ExternalIdType.ORCID
 * detectIdType('W2741809807') // ExternalIdType.OPENALEX
 * ```
 */
export function detectIdType(id: string): ExternalIdType {
  if (!id || typeof id !== 'string') {
    throw new EntityDetectionError('ID must be a non-empty string', id);
  }

  const trimmedId = id.trim();

  // Check OpenAlex formats first
  if (ID_PATTERNS.OPENALEX_ID.test(trimmedId) || ID_PATTERNS.OPENALEX_URL.test(trimmedId)) {
    return ExternalIdType.OPENALEX;
  }

  // Check DOI formats
  if (ID_PATTERNS.DOI.test(trimmedId) || 
      ID_PATTERNS.DOI_URL.test(trimmedId) || 
      ID_PATTERNS.DOI_NAMESPACE.test(trimmedId) ||
      ID_PATTERNS.DOI_NAMESPACE_CASE_INSENSITIVE.test(trimmedId)) {
    return ExternalIdType.DOI;
  }

  // Check ORCID formats
  if (ID_PATTERNS.ORCID.test(trimmedId) || 
      ID_PATTERNS.ORCID_URL.test(trimmedId) || 
      ID_PATTERNS.ORCID_NAMESPACE.test(trimmedId)) {
    return ExternalIdType.ORCID;
  }

  // Check ROR formats
  if (ID_PATTERNS.ROR.test(trimmedId) || 
      ID_PATTERNS.ROR_URL.test(trimmedId) || 
      ID_PATTERNS.ROR_NAMESPACE.test(trimmedId)) {
    return ExternalIdType.ROR;
  }

  // Check ISSN-L format
  if (ID_PATTERNS.ISSN_L.test(trimmedId)) {
    return ExternalIdType.ISSN_L;
  }

  // Check Wikidata formats
  if (ID_PATTERNS.WIKIDATA.test(trimmedId) || 
      ID_PATTERNS.WIKIDATA_URL.test(trimmedId) || 
      ID_PATTERNS.WIKIDATA_NAMESPACE.test(trimmedId)) {
    return ExternalIdType.WIKIDATA;
  }

  throw new EntityDetectionError(`Cannot detect ID type from: ${trimmedId}`, trimmedId);
}

/**
 * Parse and extract clean ID from various external ID formats
 * 
 * @param id - The external ID in any supported format
 * @returns Parsed external ID information
 * @throws EntityDetectionError if parsing fails
 * 
 * @example
 * ```typescript
 * parseExternalId('https://doi.org/10.7717/peerj.4375')
 * // Returns: { idType: 'doi', cleanId: '10.7717/peerj.4375', fromUrl: true, ... }
 * 
 * parseExternalId('orcid:0000-0003-1613-5981')
 * // Returns: { idType: 'orcid', cleanId: '0000-0003-1613-5981', fromNamespace: true, ... }
 * ```
 */
export function parseExternalId(id: string): ExternalIdParseResult {
  if (!id || typeof id !== 'string') {
    throw new EntityDetectionError('ID must be a non-empty string', id);
  }

  const trimmedId = id.trim();
  const idType = detectIdType(trimmedId);
  let cleanId: string;
  let fromUrl = false;
  let fromNamespace = false;
  let possibleEntityTypes: EntityType[] = [];

  switch (idType) {
    case ExternalIdType.OPENALEX:
      if (ID_PATTERNS.OPENALEX_URL.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.OPENALEX_URL);
        cleanId = match![1].toUpperCase();
        fromUrl = true;
      } else {
        cleanId = trimmedId.toUpperCase();
      }
      possibleEntityTypes = Object.values(EntityType);
      break;

    case ExternalIdType.DOI:
      if (ID_PATTERNS.DOI_URL.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.DOI_URL);
        cleanId = match![2];
        fromUrl = true;
      } else if (ID_PATTERNS.DOI_NAMESPACE.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.DOI_NAMESPACE);
        cleanId = match![1];
        fromNamespace = true;
      } else if (ID_PATTERNS.DOI_NAMESPACE_CASE_INSENSITIVE.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.DOI_NAMESPACE_CASE_INSENSITIVE);
        cleanId = match![1];
        fromNamespace = true;
      } else {
        cleanId = trimmedId;
      }
      possibleEntityTypes = [EntityType.WORK];
      break;

    case ExternalIdType.ORCID:
      if (ID_PATTERNS.ORCID_URL.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.ORCID_URL);
        cleanId = match![2];
        fromUrl = true;
      } else if (ID_PATTERNS.ORCID_NAMESPACE.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.ORCID_NAMESPACE);
        cleanId = match![1];
        fromNamespace = true;
      } else {
        cleanId = trimmedId;
      }
      possibleEntityTypes = [EntityType.AUTHOR];
      break;

    case ExternalIdType.ROR:
      if (ID_PATTERNS.ROR_URL.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.ROR_URL);
        cleanId = match![2];
        fromUrl = true;
      } else if (ID_PATTERNS.ROR_NAMESPACE.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.ROR_NAMESPACE);
        cleanId = match![1];
        fromNamespace = true;
      } else {
        cleanId = trimmedId;
      }
      possibleEntityTypes = [EntityType.INSTITUTION];
      break;

    case ExternalIdType.ISSN_L:
      cleanId = trimmedId;
      possibleEntityTypes = [EntityType.SOURCE];
      break;

    case ExternalIdType.WIKIDATA:
      if (ID_PATTERNS.WIKIDATA_URL.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.WIKIDATA_URL);
        cleanId = match![2].toUpperCase();
        fromUrl = true;
      } else if (ID_PATTERNS.WIKIDATA_NAMESPACE.test(trimmedId)) {
        const match = trimmedId.match(ID_PATTERNS.WIKIDATA_NAMESPACE);
        cleanId = match![1].toUpperCase();
        fromNamespace = true;
      } else {
        cleanId = trimmedId.toUpperCase();
      }
      possibleEntityTypes = [
        EntityType.PUBLISHER, EntityType.FUNDER, EntityType.TOPIC, 
        EntityType.CONCEPT, EntityType.CONTINENT, EntityType.REGION
      ];
      break;

    default:
      throw new EntityDetectionError(`Unsupported ID type: ${idType}`, trimmedId);
  }

  return {
    idType,
    cleanId,
    originalInput: trimmedId,
    fromUrl,
    fromNamespace,
    possibleEntityTypes
  };
}

export interface ValidateExternalIdParams {
  id: string;
  type: ExternalIdType;
}

/**
 * Validate external ID format for specific ID type
 * 
 * @param params - Validation parameters
 * @returns True if ID matches the expected format
 * 
 * @example
 * ```typescript
 * validateExternalId({ id: '10.7717/peerj.4375', type: ExternalIdType.DOI }) // true
 * validateExternalId({ id: 'invalid-doi', type: ExternalIdType.DOI }) // false
 * validateExternalId({ id: '0000-0003-1613-5981', type: ExternalIdType.ORCID }) // true
 * ```
 */
export function validateExternalId(params: ValidateExternalIdParams): boolean;
// Legacy overload for backwards compatibility
export function validateExternalId(id: string, type: ExternalIdType): boolean;
export function validateExternalId(
  paramsOrId: ValidateExternalIdParams | string, 
  type?: ExternalIdType
): boolean {
  let id: string;
  let idType: ExternalIdType;

  if (typeof paramsOrId === 'string') {
    // Legacy overload
    id = paramsOrId;
    idType = type!;
  } else {
    // New parameter object style
    id = paramsOrId.id;
    idType = paramsOrId.type;
  }

  if (!id || typeof id !== 'string') {
    return false;
  }

  try {
    const parsed = parseExternalId(id);
    return parsed.idType === idType;
  } catch {
    return false;
  }
}

/**
 * Normalize any supported ID format to its clean form
 * 
 * @param input - The input ID in any supported format
 * @returns The normalized/cleaned ID
 * @throws EntityDetectionError if normalization fails
 * 
 * @example
 * ```typescript
 * normalizeAnyId('https://doi.org/10.7717/peerj.4375') // '10.7717/peerj.4375'
 * normalizeAnyId('orcid:0000-0003-1613-5981') // '0000-0003-1613-5981'
 * normalizeAnyId('W2741809807') // 'W2741809807'
 * ```
 */
export function normalizeAnyId(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new EntityDetectionError('Input must be a non-empty string', input);
  }

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new EntityDetectionError('Input must be a non-empty string', input);
  }

  try {
    const parsed = parseExternalId(trimmedInput);
    return parsed.cleanId;
  } catch {
    // Try as OpenAlex ID with existing function
    try {
      return normalizeEntityId(trimmedInput);
    } catch {
      throw new EntityDetectionError(`Cannot normalize ID: ${trimmedInput}`, input);
    }
  }
}

/**
 * Resolve entity type and normalized ID from any supported ID format
 * 
 * @param id - The input ID in any supported format
 * @returns Resolution result with entity type and ID information
 * 
 * @example
 * ```typescript
 * resolveEntityFromId('10.7717/peerj.4375')
 * // Returns: { entityType: EntityType.WORK, externalId: {...}, isDefinitive: true }
 * 
 * resolveEntityFromId('Q123456') 
 * // Returns: { externalId: {...}, isDefinitive: false } // Multiple possible entity types
 * ```
 */
export function resolveEntityFromId(id: string): IdResolutionResult {
  if (!id || typeof id !== 'string') {
    throw new EntityDetectionError('ID must be a non-empty string', id);
  }

  const trimmedId = id.trim();
  
  try {
    // Try parsing as OpenAlex ID first
    const openAlexParsed = parseEntityIdentifier(trimmedId);
    return {
      entityType: openAlexParsed.type,
      openAlexId: openAlexParsed.id,
      isDefinitive: true,
      originalInput: trimmedId
    };
  } catch {
    // Try parsing as external ID
    try {
      const externalParsed = parseExternalId(trimmedId);
      const isDefinitive = externalParsed.possibleEntityTypes.length === 1;
      
      return {
        entityType: isDefinitive ? externalParsed.possibleEntityTypes[0] : undefined,
        externalId: externalParsed,
        isDefinitive,
        originalInput: trimmedId
      };
    } catch {
      throw new EntityDetectionError(`Cannot resolve entity from ID: ${trimmedId}`, trimmedId);
    }
  }
}

/**
 * Detect the entity type from an OpenAlex ID
 * 
 * @param id - The OpenAlex ID (with or without prefix)
 * @returns The detected entity type
 * @throws EntityDetectionError if the ID format is invalid
 * 
 * @example
 * ```typescript
 * detectEntityType('W2741809807') // EntityType.WORK
 * detectEntityType('A2887492') // EntityType.AUTHOR
 * detectEntityType('2741809807') // throws - ambiguous without prefix
 * ```
 */
export function detectEntityType(id: string): EntityType {
  if (!id || typeof id !== 'string') {
    throw new EntityDetectionError('ID must be a non-empty string', id);
  }

  const trimmedId = id.trim();
  
  // Check if it's a prefixed OpenAlex ID
  if (ID_PATTERNS.OPENALEX_ID.test(trimmedId)) {
    const prefix = trimmedId[0].toUpperCase();
    const entityType = ENTITY_PREFIXES[prefix];
    
    if (!entityType) {
      throw new EntityDetectionError(`Unknown entity prefix: ${prefix}`, trimmedId);
    }
    
    return entityType;
  }
  
  // Check if it's a numeric ID without prefix
  if (ID_PATTERNS.NUMERIC_ID.test(trimmedId)) {
    throw new EntityDetectionError(
      'Cannot detect entity type from numeric ID without prefix. Use normalizeEntityId() with explicit type parameter.',
      trimmedId
    );
  }
  
  throw new EntityDetectionError(`Invalid OpenAlex ID format: ${trimmedId}`, trimmedId);
}

/**
 * Parse an OpenAlex URL to extract entity type and ID
 * 
 * @param url - The OpenAlex URL
 * @returns Parsed entity information
 * @throws EntityDetectionError if the URL format is invalid
 * 
 * @example
 * ```typescript
 * parseOpenAlexUrl('https://openalex.org/W2741809807')
 * // Returns: { type: EntityType.WORK, id: 'W2741809807', numericId: '2741809807', prefix: 'W', fromUrl: true }
 * ```
 */
export function parseOpenAlexUrl(url: string): EntityParseResult {
  if (!url || typeof url !== 'string') {
    throw new EntityDetectionError('URL must be a non-empty string', url);
  }

  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(ID_PATTERNS.OPENALEX_URL);
  
  if (!match) {
    throw new EntityDetectionError(`Invalid OpenAlex URL format: ${trimmedUrl}`, trimmedUrl);
  }

  const id = match[1].toUpperCase();
  const prefix = id[0];
  const numericId = id.slice(1);
  const type = ENTITY_PREFIXES[prefix];

  if (!type) {
    throw new EntityDetectionError(`Unknown entity prefix in URL: ${prefix}`, trimmedUrl);
  }

  return {
    type,
    id,
    numericId,
    prefix,
    fromUrl: true
  };
}

export interface NormalizeEntityIdParams {
  input: string;
  type?: EntityType;
}

/**
 * Normalize various ID formats to standard OpenAlex ID format
 * 
 * @param params - Normalization parameters
 * @returns The normalized OpenAlex ID with prefix
 * @throws EntityDetectionError if normalization fails
 * 
 * @example
 * ```typescript
 * normalizeEntityId({ input: 'W2741809807' }) // 'W2741809807'
 * normalizeEntityId({ input: 'https://openalex.org/A2887492' }) // 'A2887492'  
 * normalizeEntityId({ input: '2741809807', type: EntityType.WORK }) // 'W2741809807'
 * normalizeEntityId({ input: '2741809807' }) // throws - requires type parameter
 * ```
 */
export function normalizeEntityId(params: NormalizeEntityIdParams): string;
// Legacy overload for backwards compatibility
export function normalizeEntityId(input: string, type?: EntityType): string;
export function normalizeEntityId(
  paramsOrInput: NormalizeEntityIdParams | string,
  type?: EntityType
): string {
  let input: string;
  let entityType: EntityType | undefined;

  if (typeof paramsOrInput === 'string') {
    // Legacy overload
    input = paramsOrInput;
    entityType = type;
  } else {
    // New parameter object style
    input = paramsOrInput.input;
    entityType = paramsOrInput.type;
  }

  if (!input || typeof input !== 'string') {
    throw new EntityDetectionError('Input must be a non-empty string', input);
  }

  const trimmedInput = input.trim();

  // Check if it's already a valid OpenAlex ID
  if (ID_PATTERNS.OPENALEX_ID.test(trimmedInput)) {
    return trimmedInput.toUpperCase();
  }

  // Check if it's a URL
  if (ID_PATTERNS.OPENALEX_URL.test(trimmedInput)) {
    const parsed = parseOpenAlexUrl(trimmedInput);
    return parsed.id;
  }

  // Check if it's a numeric ID
  if (ID_PATTERNS.NUMERIC_ID.test(trimmedInput)) {
    if (!entityType) {
      throw new EntityDetectionError(
        'Entity type must be specified for numeric IDs',
        trimmedInput
      );
    }
    
    const prefix = TYPE_TO_PREFIX[entityType];
    if (!prefix) {
      throw new EntityDetectionError(`Unknown entity type: ${entityType}`, trimmedInput);
    }
    
    return `${prefix}${trimmedInput}`;
  }

  throw new EntityDetectionError(`Cannot normalize input: ${trimmedInput}`, trimmedInput);
}

export interface ValidateEntityIdParams {
  id: string;
  expectedType?: EntityType;
}

/**
 * Validate an OpenAlex ID format and optionally check entity type
 * 
 * @param params - Validation parameters
 * @returns True if valid, false otherwise
 * 
 * @example
 * ```typescript
 * validateEntityId({ id: 'W2741809807' }) // true
 * validateEntityId({ id: 'W2741809807', expectedType: EntityType.WORK }) // true
 * validateEntityId({ id: 'W2741809807', expectedType: EntityType.AUTHOR }) // false
 * validateEntityId({ id: 'invalid' }) // false
 * ```
 */
export function validateEntityId(params: ValidateEntityIdParams): boolean;
// Legacy overload for backwards compatibility
export function validateEntityId(id: string, expectedType?: EntityType): boolean;
export function validateEntityId(
  paramsOrId: ValidateEntityIdParams | string,
  expectedType?: EntityType
): boolean {
  let id: string;
  let expectedEntityType: EntityType | undefined;

  if (typeof paramsOrId === 'string') {
    // Legacy overload
    id = paramsOrId;
    expectedEntityType = expectedType;
  } else {
    // New parameter object style
    id = paramsOrId.id;
    expectedEntityType = paramsOrId.expectedType;
  }

  try {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const trimmedId = id.trim();
    
    // Check basic format
    if (!ID_PATTERNS.OPENALEX_ID.test(trimmedId)) {
      return false;
    }

    // If expected type is specified, validate it matches
    if (expectedEntityType) {
      const actualType = detectEntityType(trimmedId);
      return actualType === expectedEntityType;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the API endpoint path for a given entity type
 * 
 * @param type - The entity type
 * @returns The API endpoint path
 * @throws EntityDetectionError if the entity type is unknown
 * 
 * @example
 * ```typescript
 * getEntityEndpoint(EntityType.WORK) // 'works'
 * getEntityEndpoint(EntityType.AUTHOR) // 'authors'
 * ```
 */
export function getEntityEndpoint(type: EntityType): string {
  const endpoint = ENTITY_ENDPOINTS[type];
  
  if (!endpoint) {
    throw new EntityDetectionError(`Unknown entity type: ${type}`);
  }
  
  return endpoint;
}

export interface GenerateEntityUrlParams {
  id: string;
  type?: EntityType;
}

/**
 * Generate the full OpenAlex URL for an entity ID
 * 
 * @param params - URL generation parameters
 * @returns The full OpenAlex URL
 * @throws EntityDetectionError if ID cannot be normalized
 * 
 * @example
 * ```typescript
 * generateEntityUrl({ id: 'W2741809807' }) // 'https://openalex.org/W2741809807'
 * generateEntityUrl({ id: '2741809807', type: EntityType.WORK }) // 'https://openalex.org/W2741809807'
 * ```
 */
export function generateEntityUrl(params: GenerateEntityUrlParams): string;
// Legacy overload for backwards compatibility
export function generateEntityUrl(id: string, type?: EntityType): string;
export function generateEntityUrl(
  paramsOrId: GenerateEntityUrlParams | string,
  type?: EntityType
): string {
  let id: string;
  let entityType: EntityType | undefined;

  if (typeof paramsOrId === 'string') {
    // Legacy overload
    id = paramsOrId;
    entityType = type;
  } else {
    // New parameter object style
    id = paramsOrId.id;
    entityType = paramsOrId.type;
  }

  const normalizedId = normalizeEntityId({ input: id, type: entityType });
  return `${OPENALEX_BASE_URL}/${normalizedId}`;
}

export interface ParseEntityIdentifierParams {
  input: string;
  fallbackType?: EntityType;
}

/**
 * Parse any OpenAlex identifier (ID or URL) into structured information
 * 
 * @param params - Parsing parameters
 * @returns Parsed entity information
 * @throws EntityDetectionError if parsing fails
 * 
 * @example
 * ```typescript
 * parseEntityIdentifier({ input: 'W2741809807' })
 * parseEntityIdentifier({ input: 'https://openalex.org/A2887492' })
 * parseEntityIdentifier({ input: '2741809807', fallbackType: EntityType.WORK })
 * ```
 */
export function parseEntityIdentifier(params: ParseEntityIdentifierParams): EntityParseResult;
// Legacy overload for backwards compatibility
export function parseEntityIdentifier(input: string, fallbackType?: EntityType): EntityParseResult;
export function parseEntityIdentifier(
  paramsOrInput: ParseEntityIdentifierParams | string,
  fallbackType?: EntityType
): EntityParseResult {
  let input: string;
  let entityFallbackType: EntityType | undefined;

  if (typeof paramsOrInput === 'string') {
    // Legacy overload
    input = paramsOrInput;
    entityFallbackType = fallbackType;
  } else {
    // New parameter object style
    input = paramsOrInput.input;
    entityFallbackType = paramsOrInput.fallbackType;
  }

  if (!input || typeof input !== 'string') {
    throw new EntityDetectionError('Input must be a non-empty string', input);
  }

  const trimmedInput = input.trim();

  // Try parsing as URL first
  if (ID_PATTERNS.OPENALEX_URL.test(trimmedInput)) {
    return parseOpenAlexUrl(trimmedInput);
  }

  // Try parsing as prefixed ID
  if (ID_PATTERNS.OPENALEX_ID.test(trimmedInput)) {
    const normalizedId = trimmedInput.toUpperCase();
    const prefix = normalizedId[0];
    const numericId = normalizedId.slice(1);
    const type = ENTITY_PREFIXES[prefix];

    return {
      type,
      id: normalizedId,
      numericId,
      prefix,
      fromUrl: false
    };
  }

  // Try parsing as numeric ID with fallback type
  if (ID_PATTERNS.NUMERIC_ID.test(trimmedInput) && entityFallbackType) {
    const prefix = TYPE_TO_PREFIX[entityFallbackType];
    const id = `${prefix}${trimmedInput}`;

    return {
      type: entityFallbackType,
      id,
      numericId: trimmedInput,
      prefix,
      fromUrl: false
    };
  }

  throw new EntityDetectionError(`Cannot parse entity identifier: ${trimmedInput}`, trimmedInput);
}

/**
 * Check if a string is a valid OpenAlex entity identifier (ID or URL)
 * 
 * @param input - The input to check
 * @returns True if it's a valid OpenAlex identifier
 * 
 * @example
 * ```typescript
 * isValidEntityIdentifier('W2741809807') // true
 * isValidEntityIdentifier('https://openalex.org/A2887492') // true
 * isValidEntityIdentifier('invalid') // false
 * ```
 */
export function isValidEntityIdentifier(input: string): boolean {
  try {
    parseEntityIdentifier(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is any valid supported ID format (OpenAlex or external)
 * 
 * @param input - The input to check
 * @returns True if it's any valid supported ID format
 * 
 * @example
 * ```typescript
 * isValidAnyId('W2741809807') // true
 * isValidAnyId('10.7717/peerj.4375') // true
 * isValidAnyId('0000-0003-1613-5981') // true
 * isValidAnyId('invalid') // false
 * ```
 */
export function isValidAnyId(input: string): boolean {
  try {
    resolveEntityFromId(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract all entity identifiers from a text string
 * 
 * @param text - The text to search
 * @returns Array of found entity identifiers with their positions
 * 
 * @example
 * ```typescript
 * extractEntityIdentifiers('See work W2741809807 and https://openalex.org/A2887492')
 * // Returns: [
 * //   { match: 'W2741809807', start: 9, end: 20, type: EntityType.WORK },
 * //   { match: 'https://openalex.org/A2887492', start: 25, end: 54, type: EntityType.AUTHOR }
 * // ]
 * ```
 */
export function extractEntityIdentifiers(text: string): Array<{
  match: string;
  start: number;
  end: number;
  type: EntityType;
  parsed: EntityParseResult;
}> {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const results: Array<{
    match: string;
    start: number;
    end: number;
    type: EntityType;
    parsed: EntityParseResult;
  }> = [];

  // Find URLs first (to avoid conflicts with ID patterns)
  const urlRegex = /https?:\/\/openalex\.org\/([WASIPFTCKRN]\d{7,10})/gi;
  let urlMatch;
  
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    try {
      const parsed = parseOpenAlexUrl(urlMatch[0]);
      results.push({
        match: urlMatch[0],
        start: urlMatch.index,
        end: urlMatch.index + urlMatch[0].length,
        type: parsed.type,
        parsed
      });
    } catch {
      // Ignore invalid matches
    }
  }

  // Find standalone IDs (excluding those already found in URLs)
  const idRegex = /\b([WASIPFTCKRN]\d{7,10})\b/gi;
  let idMatch: RegExpExecArray | null;
  
  while ((idMatch = idRegex.exec(text)) !== null) {
    // Skip if this ID is part of a URL we already found
    const isPartOfUrl = results.some(result => 
      idMatch!.index >= result.start && idMatch!.index < result.end
    );
    
    if (!isPartOfUrl) {
      try {
        const parsed = parseEntityIdentifier(idMatch[1]);
        results.push({
          match: idMatch[1],
          start: idMatch.index,
          end: idMatch.index + idMatch[1].length,
          type: parsed.type,
          parsed
        });
      } catch {
        // Ignore invalid matches
      }
    }
  }

  // Sort by position in text
  return results.sort((a, b) => a.start - b.start);
}

/**
 * Type guard to check if a value is a valid EntityType
 * 
 * @param value - The value to check
 * @returns True if the value is a valid EntityType
 */
export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && Object.values(EntityType).includes(value as EntityType);
}

/**
 * Get all available entity types
 * 
 * @returns Array of all EntityType values
 */
export function getAllEntityTypes(): EntityType[] {
  return Object.values(EntityType);
}

/**
 * Get all available entity prefixes
 * 
 * @returns Array of all single-letter prefixes
 */
export function getAllEntityPrefixes(): string[] {
  return Object.keys(ENTITY_PREFIXES);
}

/**
 * Get all supported external ID types
 * 
 * @returns Array of all ExternalIdType values
 */
export function getAllExternalIdTypes(): ExternalIdType[] {
  return Object.values(ExternalIdType);
}

/**
 * Get possible entity types for a given external ID type
 * 
 * @param idType - The external ID type
 * @returns Array of possible entity types
 * 
 * @example
 * ```typescript
 * getPossibleEntityTypesForExternalId(ExternalIdType.DOI) // [EntityType.WORK]
 * getPossibleEntityTypesForExternalId(ExternalIdType.WIKIDATA) // [EntityType.PUBLISHER, EntityType.FUNDER, ...]
 * ```
 */
export function getPossibleEntityTypesForExternalId(idType: ExternalIdType): EntityType[] {
  const result: EntityType[] = [];
  
  for (const [entityType, supportedIdTypes] of Object.entries(ENTITY_EXTERNAL_ID_MAPPINGS)) {
    if (supportedIdTypes.includes(idType)) {
      result.push(entityType as EntityType);
    }
  }
  
  return result;
}

/**
 * Get supported external ID types for a given entity type
 * 
 * @param entityType - The entity type
 * @returns Array of supported external ID types
 * 
 * @example
 * ```typescript
 * getSupportedExternalIdTypes(EntityType.WORK) // [ExternalIdType.DOI, ExternalIdType.OPENALEX]
 * getSupportedExternalIdTypes(EntityType.AUTHOR) // [ExternalIdType.ORCID, ExternalIdType.OPENALEX]
 * ```
 */
export function getSupportedExternalIdTypes(entityType: EntityType): ExternalIdType[] {
  return ENTITY_EXTERNAL_ID_MAPPINGS[entityType] || [];
}

export interface EntitySupportsExternalIdTypeParams {
  entityType: EntityType;
  idType: ExternalIdType;
}

/**
 * Check if an entity type supports a specific external ID type
 * 
 * @param params - Check parameters
 * @returns True if the entity type supports the external ID type
 * 
 * @example
 * ```typescript
 * entitySupportsExternalIdType({ entityType: EntityType.WORK, idType: ExternalIdType.DOI }) // true
 * entitySupportsExternalIdType({ entityType: EntityType.WORK, idType: ExternalIdType.ORCID }) // false
 * ```
 */
export function entitySupportsExternalIdType(params: EntitySupportsExternalIdTypeParams): boolean;
// Legacy overload for backwards compatibility
export function entitySupportsExternalIdType(entityType: EntityType, idType: ExternalIdType): boolean;
export function entitySupportsExternalIdType(
  paramsOrEntityType: EntitySupportsExternalIdTypeParams | EntityType,
  idType?: ExternalIdType
): boolean {
  let entityType: EntityType;
  let externalIdType: ExternalIdType;

  if (typeof paramsOrEntityType === 'string') {
    // Legacy overload
    entityType = paramsOrEntityType;
    externalIdType = idType!;
  } else {
    // New parameter object style
    entityType = paramsOrEntityType.entityType;
    externalIdType = paramsOrEntityType.idType;
  }

  const supportedTypes = ENTITY_EXTERNAL_ID_MAPPINGS[entityType];
  return supportedTypes ? supportedTypes.includes(externalIdType) : false;
}

/**
 * URL encode external IDs that may contain special characters
 * 
 * @param externalId - The external ID to encode
 * @returns URL-encoded external ID
 */
export function encodeExternalId(externalId: string): string {
  // Handle specific cases that need special encoding
  if (externalId.includes('/')) {
    // For DOIs and other IDs with slashes, encode the entire thing
    return encodeURIComponent(externalId);
  }
  
  if (externalId.startsWith('http')) {
    // For URLs, encode the entire URL
    return encodeURIComponent(externalId);
  }
  
  return externalId;
}

/**
 * URL decode external IDs
 * 
 * @param encodedId - The URL-encoded external ID
 * @returns Decoded external ID
 */
export function decodeExternalId(encodedId: string): string {
  try {
    return decodeURIComponent(encodedId);
  } catch {
    // If decoding fails, return original
    return encodedId;
  }
}

// Export aliases for consistency with existing imports
export { normalizeEntityId as normaliseEntityId };

