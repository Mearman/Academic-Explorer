/**
 * Entity detection utilities for OpenAlex IDs and Canonical External IDs
 * Supports automatic detection of entity types from various identifier formats
 */

import { EntityType } from "../types";
import { logger } from "@academic-explorer/shared-utils/logger";

export interface DetectionResult {
  entityType: EntityType | null;
  idType: "openalex" | "doi" | "orcid" | "issn_l" | "ror" | "wikidata";
  normalizedId: string;
  originalInput: string;
}

export class EntityDetector {
	/**
   * Extract clean OpenAlex ID from URL or return input if already clean
   */
	static extractOpenAlexId(input: string): string {
		// Remove URL prefix if present - handle both single and double slash variants
		// Also handle api.openalex.org URLs
		// Updated regex to handle https:/ (single slash after colon) and case-insensitive domains
		return input.replace(/^https?:\/*(?:api\.)?openalex\.org\//i, "");
	}

	/**
    * Detect entity type and ID type from various identifier formats
    */
 	detectEntityIdentifier(input: string): DetectionResult {
 		if (!input || typeof input !== 'string') {
 			logger.warn("graph", `Invalid input for entity detection: ${input}, returning null result`);
 			return {
 				entityType: null,
 				idType: "openalex",
 				normalizedId: input || "",
 				originalInput: input || "",
 			};
 		}
		const cleanInput = input.trim();

		// Try OpenAlex ID first
		const openAlexResult = this.detectOpenAlexId(cleanInput);
		if (openAlexResult.entityType) {
			return openAlexResult;
		}

		// Try external IDs
		const externalResult = this.detectExternalId(cleanInput);
		if (externalResult.entityType) {
			return externalResult;
		}

		return {
			entityType: null,
			idType: "openalex",
			normalizedId: cleanInput,
			originalInput: input,
		};
	}

	/**
   * Detect OpenAlex ID format (W123456789, A123456789, etc.)
   * Supports case-insensitive matching and normalizes to uppercase
   */
	private detectOpenAlexId(input: string): DetectionResult {
		// Remove URL prefix if present - handle both single and double slash variants
		// Also handle api.openalex.org URLs
		// Updated regex to handle https:/ (single slash after colon) and case-insensitive domains
		const cleanId = input.replace(/^https?:\/*(?:api\.)?openalex\.org\//i, "");

		// Handle path-based URLs like authors/A123 or works/W456
		let actualId = cleanId;
		let detectedEntityType: EntityType | null = null;

		// Check for path-based format
		if (cleanId.includes("/")) {
			const parts = cleanId.split("/");
			if (parts.length >= 2) {
				const entityPath = parts[0];
				const id = parts[1];

				// Ensure id is not empty or undefined
				if (id && id.length > 0) {
					// Map entity path to entity type
					switch (entityPath) {
						case "authors":
						case "people": // api.openalex.org uses "people" instead of "authors"
							detectedEntityType = "authors" as EntityType;
							actualId = id;
							break;
						case "works":
							detectedEntityType = "works" as EntityType;
							actualId = id;
							break;
						case "institutions":
							detectedEntityType = "institutions" as EntityType;
							actualId = id;
							break;
						case "sources":
							detectedEntityType = "sources" as EntityType;
							actualId = id;
							break;
						case "topics":
							detectedEntityType = "topics" as EntityType;
							actualId = id;
							break;
						case "concepts":
							detectedEntityType = "topics" as EntityType; // Concepts mapped to topics
							actualId = id;
							break;
						case "publishers":
							detectedEntityType = "publishers" as EntityType;
							actualId = id;
							break;
						case "funders":
							detectedEntityType = "funders" as EntityType;
							actualId = id;
							break;
						default:
							// Unknown entity path, keep original
							actualId = cleanId;
					}
				}
			}
		}

		// Basic format check - should have letter followed by digits (case-insensitive)
		if (!/^[wasitcpfkg]\d+$/i.test(actualId)) {
			return {
				entityType: null,
				idType: "openalex",
				normalizedId: input,
				originalInput: input,
			};
		}

		const firstChar = actualId.charAt(0).toUpperCase();
		const normalizedId = actualId.toUpperCase(); // Normalize to uppercase
		let entityType: EntityType | null = detectedEntityType; // Use detected type from path if available

		// If no entity type was detected from path, infer from ID prefix
		if (!entityType) {
			switch (firstChar) {
				case "W":
					entityType = "works";
					break;
				case "A":
					entityType = "authors";
					break;
				case "S":
					entityType = "sources";
					break;
				case "I":
					entityType = "institutions";
					break;
				case "T":
					entityType = "topics";
					break;
				case "C":
					entityType = "topics"; // Legacy concepts mapped to topics
					break;
				case "P":
					entityType = "publishers";
					break;
				case "F":
					entityType = "funders";
					break;
				case "K":
					entityType = "topics"; // Keywords mapped to topics
					break;
				default:
					entityType = null;
			}
		}

		return {
			entityType,
			idType: "openalex",
			normalizedId, // Return the normalized uppercase ID
			originalInput: input,
		};
	}

	/**
   * Detect external identifier formats
   */
	private detectExternalId(input: string): DetectionResult {
		// DOI patterns
		if (this.isDOI(input)) {
			return {
				entityType: "works",
				idType: "doi",
				normalizedId: this.normalizeDOI(input),
				originalInput: input,
			};
		}

		// ORCID patterns
		if (this.isORCID(input)) {
			return {
				entityType: "authors",
				idType: "orcid",
				normalizedId: this.normalizeORCID(input),
				originalInput: input,
			};
		}

		// ISSN-L patterns
		if (this.isISSN(input)) {
			return {
				entityType: "sources",
				idType: "issn_l",
				normalizedId: this.normalizeISSN(input),
				originalInput: input,
			};
		}

		// ROR patterns
		if (this.isROR(input)) {
			return {
				entityType: "institutions",
				idType: "ror",
				normalizedId: this.normalizeROR(input),
				originalInput: input,
			};
		}

		// Wikidata patterns (topics/publishers)
		if (this.isWikidata(input)) {
			return {
				entityType: "topics", // Default to topics
				idType: "wikidata",
				normalizedId: this.normalizeWikidata(input),
				originalInput: input,
			};
		}

		return {
			entityType: null,
			idType: "openalex",
			normalizedId: input,
			originalInput: input,
		};
	}

	// DOI detection and normalization
	private isDOI(input: string): boolean {
		return /^(https?:\/\/)?(dx\.)?doi\.org\/|^doi:|^10\./i.test(input);
	}

	private normalizeDOI(input: string): string {
		return input
			.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
			.replace(/^doi:/, "")
			.trim();
	}

	// ORCID detection and normalization
	private isORCID(input: string): boolean {
		return /^(https?:\/\/)?orcid\.org\/|^orcid:|^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(input);
	}

	private normalizeORCID(input: string): string {
		return input
			.replace(/^https?:\/\/orcid\.org\//, "")
			.replace(/^orcid:/, "")
			.trim();
	}

	// ISSN detection and normalization
	private isISSN(input: string): boolean {
		return /^(https?:\/\/)?portal\.issn\.org\/|^issn:|^\d{4}-\d{3}[\dX]$/i.test(input);
	}

	private normalizeISSN(input: string): string {
		return input
			.replace(/^https?:\/\/portal\.issn\.org\/resource\/ISSN\//, "")
			.replace(/^issn:/, "")
			.trim();
	}

	// ROR detection and normalization
	private isROR(input: string): boolean {
		return /^(https?:\/\/)?ror\.org\/|^ror:|^0[a-z0-9]{6}[0-9]{2}$/i.test(input);
	}

	private normalizeROR(input: string): string {
		return input
			.replace(/^https?:\/\/ror\.org\//, "")
			.replace(/^ror:/, "")
			.trim();
	}

	// Wikidata detection and normalization
	private isWikidata(input: string): boolean {
		return /^(https?:\/\/)?www\.wikidata\.org\/wiki\/|^wikidata:|^Q\d+$/i.test(input);
	}

	private normalizeWikidata(input: string): string {
		return input
			.replace(/^https?:\/\/www\.wikidata\.org\/wiki\//, "")
			.replace(/^wikidata:/, "")
			.trim();
	}

	/**
   * Check if an ID is a valid OpenAlex ID (case-insensitive)
   */
	isValidOpenAlexId(id: string): boolean {
		if (!id || typeof id !== "string") {
			return false;
		}

		// Remove URL prefix if present
		const cleanId = id.replace(/^https?:\/\/openalex\.org\//, "");

		// Check if it matches OpenAlex ID pattern (letter + 8-10 digits, case-insensitive)
		return /^[wasitcpfkgWASITCPFKG]\d{8,10}$/.test(cleanId);
	}

	/**
   * Get the canonical external ID URL for an entity type and value
   */
	getCanonicalUrl(idType: string, value: string): string {
		switch (idType) {
			case "doi":
				return `https://doi.org/${value}`;
			case "orcid":
				return value.startsWith("http") ? value : `https://orcid.org/${value}`;
			case "issn_l":
				return `https://portal.issn.org/resource/ISSN/${value}`;
			case "ror":
				return value.startsWith("http") ? value : `https://ror.org/${value}`;
			case "wikidata":
				return `https://www.wikidata.org/wiki/${value}`;
			default:
				return value;
		}
	}
}