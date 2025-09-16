/**
 * Unit tests for expansion settings types and utility functions
 * Tests property definitions, default settings, and validation logic
 */

import { describe, it, expect } from "vitest";
import {
	type ExpansionTarget,
	type SortCriteria,
	type FilterCriteria,
	type FilterOperator,
	type ExpansionSettings,
	type PropertyType,
	type PropertyDefinition,
	ENTITY_PROPERTIES,
	DEFAULT_EXPANSION_SETTINGS,
	getPropertiesForTarget,
	getDefaultSettingsForTarget,
	validateFilterCriteria
} from "./expansion-settings";
import { RelationType } from "@/lib/graph/types";
import type { EntityType } from "@/lib/openalex/types";

describe("expansion settings types and utilities", () => {
	describe("ENTITY_PROPERTIES constant", () => {
		describe("structure and completeness", () => {
			it("should include all expected entity types", () => {
				const expectedEntityTypes = ["works", "authors", "sources", "institutions"];

				expectedEntityTypes.forEach(entityType => {
					expect(ENTITY_PROPERTIES).toHaveProperty(entityType);
					expect(Array.isArray(ENTITY_PROPERTIES[entityType])).toBe(true);
				});
			});

			it("should have at least one property definition for each entity type", () => {
				Object.entries(ENTITY_PROPERTIES).forEach(([, properties]) => {
					expect(properties.length).toBeGreaterThan(0);
					expect(Array.isArray(properties)).toBe(true);
				});
			});

			it("should have all property definitions with required fields", () => {
				Object.entries(ENTITY_PROPERTIES).forEach(([, properties]) => {
					properties.forEach(property => {
						expect(property).toHaveProperty("property");
						expect(property).toHaveProperty("label");
						expect(property).toHaveProperty("type");
						expect(property).toHaveProperty("sortable");
						expect(property).toHaveProperty("filterable");

						expect(typeof property.property).toBe("string");
						expect(typeof property.label).toBe("string");
						expect(typeof property.sortable).toBe("boolean");
						expect(typeof property.filterable).toBe("boolean");
					});
				});
			});
		});

		describe("works entity properties", () => {
			it("should include core academic work properties", () => {
				const workProperties = ENTITY_PROPERTIES.works;
				const propertyNames = workProperties.map(p => p.property);

				expect(propertyNames).toContain("publication_year");
				expect(propertyNames).toContain("cited_by_count");
				expect(propertyNames).toContain("is_oa");
				expect(propertyNames).toContain("type");
			});

			it("should have publication_year as sortable and filterable", () => {
				const publicationYear = ENTITY_PROPERTIES.works.find(p => p.property === "publication_year");
				expect(publicationYear).toBeDefined();
				expect(publicationYear?.sortable).toBe(true);
				expect(publicationYear?.filterable).toBe(true);
				expect(publicationYear?.type).toBe("year");
			});

			it("should have cited_by_count as numeric and sortable", () => {
				const citedByCount = ENTITY_PROPERTIES.works.find(p => p.property === "cited_by_count");
				expect(citedByCount).toBeDefined();
				expect(citedByCount?.type).toBe("number");
				expect(citedByCount?.sortable).toBe(true);
				expect(citedByCount?.filterable).toBe(true);
			});

			it("should have type as enum with valid values", () => {
				const typeProperty = ENTITY_PROPERTIES.works.find(p => p.property === "type");
				expect(typeProperty).toBeDefined();
				expect(typeProperty?.type).toBe("enum");
				expect(typeProperty?.enumValues).toBeDefined();
				expect(Array.isArray(typeProperty?.enumValues)).toBe(true);
				expect(typeProperty?.enumValues?.length).toBeGreaterThan(0);

				// Check enum values have proper structure
				typeProperty?.enumValues?.forEach(enumValue => {
					expect(enumValue).toHaveProperty("value");
					expect(enumValue).toHaveProperty("label");
					expect(typeof enumValue.value).toBe("string");
					expect(typeof enumValue.label).toBe("string");
				});
			});
		});

		describe("authors entity properties", () => {
			it("should include author-specific properties", () => {
				const authorProperties = ENTITY_PROPERTIES.authors;
				const propertyNames = authorProperties.map(p => p.property);

				expect(propertyNames).toContain("works_count");
				expect(propertyNames).toContain("cited_by_count");
			});

			it("should have works_count as numeric and sortable", () => {
				const worksCount = ENTITY_PROPERTIES.authors.find(p => p.property === "works_count");
				expect(worksCount).toBeDefined();
				expect(worksCount?.type).toBe("number");
				expect(worksCount?.sortable).toBe(true);
			});
		});

		describe("sources entity properties", () => {
			it("should include source-specific properties", () => {
				const sourceProperties = ENTITY_PROPERTIES.sources;
				const propertyNames = sourceProperties.map(p => p.property);

				expect(propertyNames).toContain("works_count");
				expect(propertyNames).toContain("cited_by_count");
				expect(propertyNames).toContain("is_oa");
				expect(propertyNames).toContain("type");
			});

			it("should have type as enum with source-specific values", () => {
				const typeProperty = ENTITY_PROPERTIES.sources.find(p => p.property === "type");
				expect(typeProperty).toBeDefined();
				expect(typeProperty?.type).toBe("enum");
				expect(typeProperty?.enumValues).toBeDefined();

				const enumValues = typeProperty?.enumValues?.map(e => e.value) ?? [];
				expect(enumValues).toContain("journal");
				expect(enumValues).toContain("conference");
			});
		});

		describe("institutions entity properties", () => {
			it("should include institution-specific properties", () => {
				const institutionProperties = ENTITY_PROPERTIES.institutions;
				const propertyNames = institutionProperties.map(p => p.property);

				expect(propertyNames).toContain("works_count");
				expect(propertyNames).toContain("cited_by_count");
				expect(propertyNames).toContain("country_code");
				expect(propertyNames).toContain("type");
			});

			it("should have country_code as string and filterable", () => {
				const countryCode = ENTITY_PROPERTIES.institutions.find(p => p.property === "country_code");
				expect(countryCode).toBeDefined();
				expect(countryCode?.type).toBe("string");
				expect(countryCode?.filterable).toBe(true);
			});

			it("should have type as enum with institution-specific values", () => {
				const typeProperty = ENTITY_PROPERTIES.institutions.find(p => p.property === "type");
				expect(typeProperty).toBeDefined();
				expect(typeProperty?.type).toBe("enum");
				expect(typeProperty?.enumValues).toBeDefined();

				const enumValues = typeProperty?.enumValues?.map(e => e.value) ?? [];
				expect(enumValues).toContain("education");
				expect(enumValues).toContain("healthcare");
				expect(enumValues).toContain("company");
			});
		});
	});

	describe("DEFAULT_EXPANSION_SETTINGS constant", () => {
		describe("structure and completeness", () => {
			it("should include core RelationType values", () => {
				// Only test the core relation types that actually have default settings
				const coreRelationTypes = [
					RelationType.REFERENCES,
					RelationType.AUTHORED,
					RelationType.AFFILIATED,
					RelationType.PUBLISHED_IN,
					RelationType.FUNDED_BY,
					RelationType.RELATED_TO
				];

				coreRelationTypes.forEach(relationType => {
					expect(DEFAULT_EXPANSION_SETTINGS).toHaveProperty(relationType);
				});
			});

			it("should have proper structure for each default setting", () => {
				Object.entries(DEFAULT_EXPANSION_SETTINGS).forEach(([key, settings]) => {
					expect(settings).toHaveProperty("target");
					expect(settings.target).toBe(key);
					expect(settings).toHaveProperty("name");
					expect(typeof settings.name).toBe("string");
				});
			});

			it("should have meaningful names for each relation type", () => {
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.REFERENCES].name).toBe("References");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.AUTHORED].name).toBe("Works");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.AFFILIATED].name).toBe("Institutions");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.PUBLISHED_IN].name).toBe("Sources");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.FUNDED_BY].name).toBe("Funders");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.RELATED_TO].name).toBe("Related");
			});
		});

		describe("relation type mapping", () => {
			it("should map references to academic references", () => {
				const referencesSettings = DEFAULT_EXPANSION_SETTINGS[RelationType.REFERENCES];
				expect(referencesSettings.target).toBe(RelationType.REFERENCES);
				expect(referencesSettings.name).toBe("References");
			});

			it("should map authored to works", () => {
				const authoredSettings = DEFAULT_EXPANSION_SETTINGS[RelationType.AUTHORED];
				expect(authoredSettings.target).toBe(RelationType.AUTHORED);
				expect(authoredSettings.name).toBe("Works");
			});

			it("should map affiliated to institutions", () => {
				const affiliatedSettings = DEFAULT_EXPANSION_SETTINGS[RelationType.AFFILIATED];
				expect(affiliatedSettings.target).toBe(RelationType.AFFILIATED);
				expect(affiliatedSettings.name).toBe("Institutions");
			});
		});
	});

	describe("getPropertiesForTarget function", () => {
		describe("entity type targets", () => {
			it("should return correct properties for works entity", () => {
				const properties = getPropertiesForTarget("works" as EntityType);
				expect(properties).toEqual(ENTITY_PROPERTIES.works);
				expect(properties.length).toBeGreaterThan(0);
			});

			it("should return correct properties for authors entity", () => {
				const properties = getPropertiesForTarget("authors" as EntityType);
				expect(properties).toEqual(ENTITY_PROPERTIES.authors);
				expect(properties.length).toBeGreaterThan(0);
			});

			it("should return correct properties for sources entity", () => {
				const properties = getPropertiesForTarget("sources" as EntityType);
				expect(properties).toEqual(ENTITY_PROPERTIES.sources);
				expect(properties.length).toBeGreaterThan(0);
			});

			it("should return correct properties for institutions entity", () => {
				const properties = getPropertiesForTarget("institutions" as EntityType);
				expect(properties).toEqual(ENTITY_PROPERTIES.institutions);
				expect(properties.length).toBeGreaterThan(0);
			});

			it("should return empty array for unknown entity types", () => {
				const properties = getPropertiesForTarget("unknown" as EntityType);
				expect(properties).toEqual([]);
			});
		});

		describe("relation type targets", () => {
			it("should return works properties for relation types", () => {
				const relationTypes = Object.values(RelationType);

				relationTypes.forEach(relationType => {
					const properties = getPropertiesForTarget(relationType);
					expect(properties).toEqual(ENTITY_PROPERTIES.works);
				});
			});

			it("should handle references relation", () => {
				const properties = getPropertiesForTarget(RelationType.REFERENCES);
				expect(properties).toEqual(ENTITY_PROPERTIES.works);
				expect(properties.length).toBeGreaterThan(0);
			});

			it("should handle authored relation", () => {
				const properties = getPropertiesForTarget(RelationType.AUTHORED);
				expect(properties).toEqual(ENTITY_PROPERTIES.works);
				expect(properties.length).toBeGreaterThan(0);
			});
		});

		describe("edge cases and type safety", () => {
			it("should handle null and undefined gracefully", () => {
				const properties1 = getPropertiesForTarget(null as unknown as ExpansionTarget);
				const properties2 = getPropertiesForTarget(undefined as unknown as ExpansionTarget);

				expect(properties1).toEqual([]);
				expect(properties2).toEqual([]);
			});

			it("should handle empty string", () => {
				const properties = getPropertiesForTarget("" as ExpansionTarget);
				expect(properties).toEqual([]);
			});
		});
	});

	describe("getDefaultSettingsForTarget function", () => {
		describe("relation type targets", () => {
			it("should return proper default settings for references", () => {
				const settings = getDefaultSettingsForTarget(RelationType.REFERENCES);

				expect(settings.target).toBe(RelationType.REFERENCES);
				expect(settings.name).toBe("References");
				expect(settings.limit).toBe(0);
				expect(settings.sorts).toEqual([]);
				expect(settings.filters).toEqual([]);
				expect(settings.enabled).toBe(true);
			});

			it("should return proper default settings for authored", () => {
				const settings = getDefaultSettingsForTarget(RelationType.AUTHORED);

				expect(settings.target).toBe(RelationType.AUTHORED);
				expect(settings.name).toBe("Works");
				expect(settings.limit).toBe(0);
				expect(settings.sorts).toEqual([]);
				expect(settings.filters).toEqual([]);
				expect(settings.enabled).toBe(true);
			});

			it("should return proper default settings for core relation types", () => {
				const coreRelationTypes = [
					RelationType.REFERENCES,
					RelationType.AUTHORED,
					RelationType.AFFILIATED,
					RelationType.PUBLISHED_IN,
					RelationType.FUNDED_BY,
					RelationType.RELATED_TO
				];

				coreRelationTypes.forEach(relationType => {
					const settings = getDefaultSettingsForTarget(relationType);

					expect(settings.target).toBe(relationType);
					expect(settings.limit).toBe(0);
					expect(Array.isArray(settings.sorts)).toBe(true);
					expect(Array.isArray(settings.filters)).toBe(true);
					expect(settings.enabled).toBe(true);
					expect(typeof settings.name).toBe("string");
				});
			});

			it("should handle relation types without default settings", () => {
				// Test relation types that don't have predefined settings
				const settings = getDefaultSettingsForTarget(RelationType.SOURCE_PUBLISHED_BY);

				expect(settings.target).toBe(RelationType.SOURCE_PUBLISHED_BY);
				expect(settings.limit).toBe(0);
				expect(Array.isArray(settings.sorts)).toBe(true);
				expect(Array.isArray(settings.filters)).toBe(true);
				expect(settings.enabled).toBe(true);
				expect(settings.name).toBeUndefined(); // No predefined name
			});
		});

		describe("entity type targets", () => {
			it("should return basic settings for entity types", () => {
				const entityTypes = ["works", "authors", "sources", "institutions"];

				entityTypes.forEach(entityType => {
					const settings = getDefaultSettingsForTarget(entityType as EntityType);

					expect(settings.target).toBe(entityType);
					expect(settings.limit).toBe(0);
					expect(Array.isArray(settings.sorts)).toBe(true);
					expect(Array.isArray(settings.filters)).toBe(true);
					expect(settings.enabled).toBe(true);
				});
			});

			it("should handle unknown entity types", () => {
				const settings = getDefaultSettingsForTarget("unknown" as EntityType);

				expect(settings.target).toBe("unknown");
				expect(settings.limit).toBe(0);
				expect(settings.sorts).toEqual([]);
				expect(settings.filters).toEqual([]);
				expect(settings.enabled).toBe(true);
				expect(settings.name).toBeUndefined();
			});
		});

		describe("default values behavior", () => {
			it("should provide consistent default values", () => {
				const settings = getDefaultSettingsForTarget(RelationType.REFERENCES);

				expect(settings.limit).toBe(0); // 0 means no limit
				expect(settings.sorts).toEqual([]);
				expect(settings.filters).toEqual([]);
				expect(settings.enabled).toBe(true);
			});

			it("should preserve existing name from DEFAULT_EXPANSION_SETTINGS", () => {
				const settings = getDefaultSettingsForTarget(RelationType.REFERENCES);
				expect(settings.name).toBe("References");

				const settings2 = getDefaultSettingsForTarget(RelationType.AUTHORED);
				expect(settings2.name).toBe("Works");
			});
		});
	});

	describe("validateFilterCriteria function", () => {
		describe("number type validation", () => {
			it("should allow numeric operators for number properties", () => {
				const numberProperty: PropertyDefinition = {
					property: "cited_by_count",
					label: "Citation Count",
					type: "number",
					sortable: true,
					filterable: true
				};

				const validOperators: FilterOperator[] = ["eq", "ne", "gt", "lt", "gte", "lte", "between", "in", "notin"];
				const invalidOperators: FilterOperator[] = ["contains", "startswith", "endswith"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "cited_by_count",
						operator,
						value: 100,
						enabled: true
					};
					expect(validateFilterCriteria(filter, numberProperty)).toBe(true);
				});

				invalidOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "cited_by_count",
						operator,
						value: 100,
						enabled: true
					};
					expect(validateFilterCriteria(filter, numberProperty)).toBe(false);
				});
			});
		});

		describe("year type validation", () => {
			it("should allow numeric operators for year properties", () => {
				const yearProperty: PropertyDefinition = {
					property: "publication_year",
					label: "Publication Year",
					type: "year",
					sortable: true,
					filterable: true
				};

				const validOperators: FilterOperator[] = ["eq", "ne", "gt", "lt", "gte", "lte", "between", "in", "notin"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "publication_year",
						operator,
						value: 2023,
						enabled: true
					};
					expect(validateFilterCriteria(filter, yearProperty)).toBe(true);
				});
			});
		});

		describe("string type validation", () => {
			it("should allow string operators for string properties", () => {
				const stringProperty: PropertyDefinition = {
					property: "language",
					label: "Language",
					type: "string",
					sortable: false,
					filterable: true
				};

				const validOperators: FilterOperator[] = ["eq", "ne", "contains", "startswith", "endswith", "in", "notin"];
				const invalidOperators: FilterOperator[] = ["gt", "lt", "gte", "lte", "between"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "language",
						operator,
						value: "en",
						enabled: true
					};
					expect(validateFilterCriteria(filter, stringProperty)).toBe(true);
				});

				invalidOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "language",
						operator,
						value: "en",
						enabled: true
					};
					expect(validateFilterCriteria(filter, stringProperty)).toBe(false);
				});
			});
		});

		describe("boolean type validation", () => {
			it("should allow only equality operators for boolean properties", () => {
				const booleanProperty: PropertyDefinition = {
					property: "is_oa",
					label: "Open Access",
					type: "boolean",
					sortable: false,
					filterable: true
				};

				const validOperators: FilterOperator[] = ["eq", "ne"];
				const invalidOperators: FilterOperator[] = ["gt", "lt", "gte", "lte", "between", "contains", "startswith", "endswith", "in", "notin"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "is_oa",
						operator,
						value: true,
						enabled: true
					};
					expect(validateFilterCriteria(filter, booleanProperty)).toBe(true);
				});

				invalidOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "is_oa",
						operator,
						value: true,
						enabled: true
					};
					expect(validateFilterCriteria(filter, booleanProperty)).toBe(false);
				});
			});
		});

		describe("enum type validation", () => {
			it("should allow set membership operators for enum properties", () => {
				const enumProperty: PropertyDefinition = {
					property: "type",
					label: "Publication Type",
					type: "enum",
					sortable: false,
					filterable: true,
					enumValues: [
						{ value: "journal-article", label: "Journal Article" },
						{ value: "book", label: "Book" }
					]
				};

				const validOperators: FilterOperator[] = ["eq", "ne", "in", "notin"];
				const invalidOperators: FilterOperator[] = ["gt", "lt", "gte", "lte", "between", "contains", "startswith", "endswith"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "type",
						operator,
						value: "journal-article",
						enabled: true
					};
					expect(validateFilterCriteria(filter, enumProperty)).toBe(true);
				});

				invalidOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "type",
						operator,
						value: "journal-article",
						enabled: true
					};
					expect(validateFilterCriteria(filter, enumProperty)).toBe(false);
				});
			});
		});

		describe("date type validation", () => {
			it("should allow comparison operators for date properties", () => {
				const dateProperty: PropertyDefinition = {
					property: "created_date",
					label: "Created Date",
					type: "date",
					sortable: true,
					filterable: true
				};

				const validOperators: FilterOperator[] = ["eq", "ne", "gt", "lt", "gte", "lte", "between"];
				const invalidOperators: FilterOperator[] = ["contains", "startswith", "endswith", "in", "notin"];

				validOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "created_date",
						operator,
						value: new Date(),
						enabled: true
					};
					expect(validateFilterCriteria(filter, dateProperty)).toBe(true);
				});

				invalidOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "created_date",
						operator,
						value: new Date(),
						enabled: true
					};
					expect(validateFilterCriteria(filter, dateProperty)).toBe(false);
				});
			});
		});

		describe("edge cases and type safety", () => {
			it("should return false for unknown property types", () => {
				const unknownProperty: PropertyDefinition = {
					property: "unknown_prop",
					label: "Unknown Property",
					type: "unknown" as PropertyType,
					sortable: false,
					filterable: true
				};

				const filter: FilterCriteria = {
					property: "unknown_prop",
					operator: "eq",
					value: "test",
					enabled: true
				};

				expect(validateFilterCriteria(filter, unknownProperty)).toBe(false);
			});

			it("should handle all property types systematically", () => {
				const propertyTypes: PropertyType[] = ["string", "number", "boolean", "date", "year", "enum"];

				propertyTypes.forEach(type => {
					const property: PropertyDefinition = {
						property: "test_prop",
						label: "Test Property",
						type,
						sortable: true,
						filterable: true
					};

					const filter: FilterCriteria = {
						property: "test_prop",
						operator: "eq",
						value: "test",
						enabled: true
					};

					// eq should be valid for all types
					expect(validateFilterCriteria(filter, property)).toBe(true);
				});
			});
		});
	});

	describe("type definitions and interfaces", () => {
		describe("ExpansionTarget type", () => {
			it("should accept entity types", () => {
				const entityTarget: ExpansionTarget = "works" as EntityType;
				expect(typeof entityTarget).toBe("string");
			});

			it("should accept relation types", () => {
				const relationTarget: ExpansionTarget = RelationType.REFERENCES;
				expect(typeof relationTarget).toBe("string");
			});
		});

		describe("SortCriteria interface", () => {
			it("should have required properties", () => {
				const sortCriteria: SortCriteria = {
					property: "publication_year",
					direction: "desc",
					priority: 1
				};

				expect(sortCriteria.property).toBe("publication_year");
				expect(sortCriteria.direction).toBe("desc");
				expect(sortCriteria.priority).toBe(1);
			});

			it("should support optional label", () => {
				const sortCriteria: SortCriteria = {
					property: "cited_by_count",
					direction: "desc",
					priority: 1,
					label: "Most Cited"
				};

				expect(sortCriteria.label).toBe("Most Cited");
			});
		});

		describe("FilterCriteria interface", () => {
			it("should have required properties", () => {
				const filterCriteria: FilterCriteria = {
					property: "publication_year",
					operator: "gte",
					value: 2020,
					enabled: true
				};

				expect(filterCriteria.property).toBe("publication_year");
				expect(filterCriteria.operator).toBe("gte");
				expect(filterCriteria.value).toBe(2020);
				expect(filterCriteria.enabled).toBe(true);
			});

			it("should support unknown value types", () => {
				const filterCriteria: FilterCriteria = {
					property: "test",
					operator: "eq",
					value: { complex: "object" },
					enabled: false
				};

				expect(typeof filterCriteria.value).toBe("object");
			});
		});

		describe("ExpansionSettings interface", () => {
			it("should have required target property", () => {
				const settings: ExpansionSettings = {
					target: RelationType.REFERENCES
				};

				expect(settings.target).toBe(RelationType.REFERENCES);
			});

			it("should support all optional properties", () => {
				const settings: ExpansionSettings = {
					target: "works" as EntityType,
					limit: 50,
					sorts: [{
						property: "publication_year",
						direction: "desc",
						priority: 1
					}],
					filters: [{
						property: "is_oa",
						operator: "eq",
						value: true,
						enabled: true
					}],
					enabled: true,
					name: "Recent Open Access Works"
				};

				expect(settings.limit).toBe(50);
				expect(settings.sorts?.length).toBe(1);
				expect(settings.filters?.length).toBe(1);
				expect(settings.enabled).toBe(true);
				expect(settings.name).toBe("Recent Open Access Works");
			});
		});
	});

	describe("data consistency and relationships", () => {
		describe("entity properties alignment", () => {
			it("should have consistent property types across entities", () => {
				// Common properties like cited_by_count should be consistently typed
				const worksProperty = ENTITY_PROPERTIES.works.find(p => p.property === "cited_by_count");
				const authorsProperty = ENTITY_PROPERTIES.authors.find(p => p.property === "cited_by_count");
				const sourcesProperty = ENTITY_PROPERTIES.sources.find(p => p.property === "cited_by_count");

				expect(worksProperty?.type).toBe("number");
				expect(authorsProperty?.type).toBe("number");
				expect(sourcesProperty?.type).toBe("number");

				expect(worksProperty?.sortable).toBe(true);
				expect(authorsProperty?.sortable).toBe(true);
				expect(sourcesProperty?.sortable).toBe(true);
			});

			it("should have consistent boolean properties", () => {
				const worksIsOA = ENTITY_PROPERTIES.works.find(p => p.property === "is_oa");
				const sourcesIsOA = ENTITY_PROPERTIES.sources.find(p => p.property === "is_oa");

				expect(worksIsOA?.type).toBe("boolean");
				expect(sourcesIsOA?.type).toBe("boolean");

				expect(worksIsOA?.filterable).toBe(true);
				expect(sourcesIsOA?.filterable).toBe(true);
			});
		});

		describe("relation type coverage", () => {
			it("should have default settings for core relation types", () => {
				const coreRelationTypes = [
					RelationType.REFERENCES,
					RelationType.AUTHORED,
					RelationType.AFFILIATED,
					RelationType.PUBLISHED_IN,
					RelationType.FUNDED_BY,
					RelationType.RELATED_TO
				];
				const defaultKeys = Object.keys(DEFAULT_EXPANSION_SETTINGS);

				coreRelationTypes.forEach(relationType => {
					expect(defaultKeys).toContain(relationType);
				});
			});

			it("should have exactly 6 core relation types with default settings", () => {
				const defaultKeys = Object.keys(DEFAULT_EXPANSION_SETTINGS);
				expect(defaultKeys).toHaveLength(6);
			});

			it("should have meaningful names for common academic relationships", () => {
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.REFERENCES].name).toContain("Reference");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.AUTHORED].name).toContain("Work");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.AFFILIATED].name).toContain("Institution");
				expect(DEFAULT_EXPANSION_SETTINGS[RelationType.PUBLISHED_IN].name).toContain("Source");
			});
		});
	});

	describe("validation and error handling", () => {
		describe("filter validation edge cases", () => {
			it("should handle filters with missing property definitions", () => {
				const nonExistentProperty: PropertyDefinition = {
					property: "non_existent",
					label: "Non Existent",
					type: "string",
					sortable: false,
					filterable: false
				};

				const filter: FilterCriteria = {
					property: "non_existent",
					operator: "eq",
					value: "test",
					enabled: true
				};

				// Should still validate based on type compatibility
				expect(validateFilterCriteria(filter, nonExistentProperty)).toBe(true);
			});

			it("should handle complex enum validation", () => {
				const enumProperty: PropertyDefinition = {
					property: "complex_enum",
					label: "Complex Enum",
					type: "enum",
					sortable: false,
					filterable: true,
					enumValues: [
						{ value: "option1", label: "Option 1" },
						{ value: "option2", label: "Option 2" },
						{ value: "option3", label: "Option 3" }
					]
				};

				// Test all valid enum operators
				const validEnumOperators: FilterOperator[] = ["eq", "ne", "in", "notin"];
				validEnumOperators.forEach(operator => {
					const filter: FilterCriteria = {
						property: "complex_enum",
						operator,
						value: "option1",
						enabled: true
					};
					expect(validateFilterCriteria(filter, enumProperty)).toBe(true);
				});
			});
		});

		describe("default settings robustness", () => {
			it("should handle edge cases in default settings generation", () => {
				// Test with undefined/null targets
				const settings1 = getDefaultSettingsForTarget(null as unknown as ExpansionTarget);
				expect(settings1.target).toBeNull();
				expect(settings1.enabled).toBe(true);

				const settings2 = getDefaultSettingsForTarget(undefined as unknown as ExpansionTarget);
				expect(settings2.target).toBeUndefined();
				expect(settings2.enabled).toBe(true);
			});

			it("should provide stable default values", () => {
				// Multiple calls should return equivalent objects
				const settings1 = getDefaultSettingsForTarget(RelationType.REFERENCES);
				const settings2 = getDefaultSettingsForTarget(RelationType.REFERENCES);

				expect(settings1).toEqual(settings2);
				expect(settings1).not.toBe(settings2); // Different object instances
			});
		});
	});
});