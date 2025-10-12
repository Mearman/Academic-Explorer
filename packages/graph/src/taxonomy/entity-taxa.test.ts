/**
 * Test suite for entity-taxa taxonomy definitions
 * Comprehensive test coverage for entity and relation taxonomy
 */

import { describe, it, expect } from "vitest";
import type { EntityType } from "../types/core";
import { RelationType } from "../types/core";
import {
  ENTITY_TAXONOMY,
  RELATION_TAXONOMY,
  ENTITY_ICON_MAP,
  getEntityTaxon,
  getRelationTaxon,
  getEntityIcon,
  getEntityColor,
  getEntityDisplayName,
  getEntityPlural,
  type Taxon,
} from "./entity-taxa";

describe("Entity Taxonomy", () => {
  describe("ENTITY_TAXONOMY", () => {
    it("should contain all entity types", () => {
      const entityTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "publishers",
        "funders",
        "topics",
        "concepts",
        "keywords",
      ];

      entityTypes.forEach((entityType) => {
        expect(ENTITY_TAXONOMY).toHaveProperty(entityType);
        expect(ENTITY_TAXONOMY[entityType]).toHaveProperty("displayName");
        expect(ENTITY_TAXONOMY[entityType]).toHaveProperty("description");
        expect(ENTITY_TAXONOMY[entityType]).toHaveProperty("color");
        expect(ENTITY_TAXONOMY[entityType]).toHaveProperty("plural");
      });
    });

    it("should have correct works taxonomy", () => {
      const worksTaxon = ENTITY_TAXONOMY.works;
      expect(worksTaxon.displayName).toBe("Work");
      expect(worksTaxon.description).toContain("Academic publications");
      expect(worksTaxon.color).toBe("blue");
      expect(worksTaxon.plural).toBe("Works");
    });

    it("should have correct authors taxonomy", () => {
      const authorsTaxon = ENTITY_TAXONOMY.authors;
      expect(authorsTaxon.displayName).toBe("Author");
      expect(authorsTaxon.description).toContain("Researchers");
      expect(authorsTaxon.color).toBe("green");
      expect(authorsTaxon.plural).toBe("Authors");
    });

    it("should have correct institutions taxonomy", () => {
      const institutionsTaxon = ENTITY_TAXONOMY.institutions;
      expect(institutionsTaxon.displayName).toBe("Institution");
      expect(institutionsTaxon.description).toContain("Universities");
      expect(institutionsTaxon.color).toBe("orange");
      expect(institutionsTaxon.plural).toBe("Institutions");
    });

    it("should have correct topics taxonomy", () => {
      const topicsTaxon = ENTITY_TAXONOMY.topics;
      expect(topicsTaxon.displayName).toBe("Topic");
      expect(topicsTaxon.description).toContain("Research topics");
      expect(topicsTaxon.color).toBe("red");
      expect(topicsTaxon.plural).toBe("Topics");
    });
  });

  describe("RELATION_TAXONOMY", () => {
    it("should contain all relation types", () => {
      const relationTypes = Object.values(RelationType);

      relationTypes.forEach((relationType) => {
        expect(RELATION_TAXONOMY).toHaveProperty(relationType);
        expect(RELATION_TAXONOMY[relationType]).toHaveProperty("displayName");
        expect(RELATION_TAXONOMY[relationType]).toHaveProperty("description");
        expect(RELATION_TAXONOMY[relationType]).toHaveProperty("color");
        expect(RELATION_TAXONOMY[relationType]).toHaveProperty("plural");
      });
    });

    it("should have correct authored relation taxonomy", () => {
      const authoredTaxon = RELATION_TAXONOMY[RelationType.AUTHORED];
      expect(authoredTaxon.displayName).toBe("Authored");
      expect(authoredTaxon.description).toContain("Author contributed");
      expect(authoredTaxon.color).toBe("green");
      expect(authoredTaxon.plural).toBe("Authored");
    });

    it("should have correct references relation taxonomy", () => {
      const referencesTaxon = RELATION_TAXONOMY[RelationType.REFERENCES];
      expect(referencesTaxon.displayName).toBe("References");
      expect(referencesTaxon.description).toContain("Work cites");
      expect(referencesTaxon.color).toBe("blue");
      expect(referencesTaxon.plural).toBe("References");
    });

    it("should have correct related_to relation taxonomy", () => {
      const relatedToTaxon = RELATION_TAXONOMY[RelationType.RELATED_TO];
      expect(relatedToTaxon.displayName).toBe("Related To");
      expect(relatedToTaxon.description).toContain("General relationship");
      expect(relatedToTaxon.color).toBe("gray");
      expect(relatedToTaxon.plural).toBe("Related To");
    });
  });

  describe("ENTITY_ICON_MAP", () => {
    it("should contain all entity types", () => {
      const entityTypes: EntityType[] = [
        "works",
        "authors",
        "sources",
        "institutions",
        "publishers",
        "funders",
        "topics",
        "concepts",
        "keywords",
      ];

      entityTypes.forEach((entityType) => {
        expect(ENTITY_ICON_MAP).toHaveProperty(entityType);
        expect(typeof ENTITY_ICON_MAP[entityType]).toBe("string");
        expect(ENTITY_ICON_MAP[entityType]).toMatch(/^Icon[A-Z]/);
      });
    });

    it("should have correct icon mappings", () => {
      expect(ENTITY_ICON_MAP.works).toBe("IconFileText");
      expect(ENTITY_ICON_MAP.authors).toBe("IconUser");
      expect(ENTITY_ICON_MAP.sources).toBe("IconBook");
      expect(ENTITY_ICON_MAP.institutions).toBe("IconBuilding");
      expect(ENTITY_ICON_MAP.topics).toBe("IconTag");
      expect(ENTITY_ICON_MAP.keywords).toBe("IconHash");
    });
  });

  describe("Helper Functions", () => {
    describe("getEntityTaxon", () => {
      it("should return correct taxon for each entity type", () => {
        const entityTypes: EntityType[] = [
          "works",
          "authors",
          "sources",
          "institutions",
          "publishers",
          "funders",
          "topics",
          "concepts",
          "keywords",
        ];

        entityTypes.forEach((entityType) => {
          const taxon = getEntityTaxon(entityType);
          expect(taxon).toEqual(ENTITY_TAXONOMY[entityType]);
          expect(taxon).toHaveProperty("displayName");
          expect(taxon).toHaveProperty("description");
          expect(taxon).toHaveProperty("color");
          expect(taxon).toHaveProperty("plural");
        });
      });

      it("should return correct works taxon", () => {
        const taxon = getEntityTaxon("works");
        expect(taxon.displayName).toBe("Work");
        expect(taxon.color).toBe("blue");
      });
    });

    describe("getRelationTaxon", () => {
      it("should return correct taxon for each relation type", () => {
        const relationTypes = Object.values(RelationType);

        relationTypes.forEach((relationType) => {
          const taxon = getRelationTaxon(relationType);
          expect(taxon).toEqual(RELATION_TAXONOMY[relationType]);
          expect(taxon).toHaveProperty("displayName");
          expect(taxon).toHaveProperty("description");
          expect(taxon).toHaveProperty("color");
          expect(taxon).toHaveProperty("plural");
        });
      });

      it("should return correct authored relation taxon", () => {
        const taxon = getRelationTaxon(RelationType.AUTHORED);
        expect(taxon.displayName).toBe("Authored");
        expect(taxon.color).toBe("green");
      });
    });

    describe("getEntityIcon", () => {
      it("should return correct icon for each entity type", () => {
        const testCases: Array<[EntityType, string]> = [
          ["works", "IconFileText"],
          ["authors", "IconUser"],
          ["sources", "IconBook"],
          ["institutions", "IconBuilding"],
          ["publishers", "IconPrinter"],
          ["funders", "IconCoin"],
          ["topics", "IconTag"],
          ["concepts", "IconBulb"],
          ["keywords", "IconHash"],
        ];

        testCases.forEach(([entityType, expectedIcon]) => {
          expect(getEntityIcon(entityType)).toBe(expectedIcon);
        });
      });
    });

    describe("getEntityColor", () => {
      it("should return correct color for each entity type", () => {
        const testCases: Array<[EntityType, string]> = [
          ["works", "blue"],
          ["authors", "green"],
          ["sources", "purple"],
          ["institutions", "orange"],
          ["publishers", "teal"],
          ["funders", "cyan"],
          ["topics", "red"],
          ["concepts", "pink"],
          ["keywords", "gray"],
        ];

        testCases.forEach(([entityType, expectedColor]) => {
          expect(getEntityColor(entityType)).toBe(expectedColor);
        });
      });
    });

    describe("getEntityDisplayName", () => {
      it("should return correct display name for each entity type", () => {
        const testCases: Array<[EntityType, string]> = [
          ["works", "Work"],
          ["authors", "Author"],
          ["sources", "Source"],
          ["institutions", "Institution"],
          ["publishers", "Publisher"],
          ["funders", "Funder"],
          ["topics", "Topic"],
          ["concepts", "Concept"],
          ["keywords", "Keyword"],
        ];

        testCases.forEach(([entityType, expectedName]) => {
          expect(getEntityDisplayName(entityType)).toBe(expectedName);
        });
      });
    });

    describe("getEntityPlural", () => {
      it("should return correct plural form for each entity type", () => {
        const testCases: Array<[EntityType, string]> = [
          ["works", "Works"],
          ["authors", "Authors"],
          ["sources", "Sources"],
          ["institutions", "Institutions"],
          ["publishers", "Publishers"],
          ["funders", "Funders"],
          ["topics", "Topics"],
          ["concepts", "Concepts"],
          ["keywords", "Keywords"],
        ];

        testCases.forEach(([entityType, expectedPlural]) => {
          expect(getEntityPlural(entityType)).toBe(expectedPlural);
        });
      });
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      // Test that all exports have correct types
      const entityTaxon: Taxon = ENTITY_TAXONOMY.works;
      expect(typeof entityTaxon.displayName).toBe("string");
      expect(typeof entityTaxon.description).toBe("string");
      expect(typeof entityTaxon.color).toBe("string");
      expect(typeof entityTaxon.plural).toBe("string");

      const relationTaxon: Taxon = RELATION_TAXONOMY[RelationType.AUTHORED];
      expect(typeof relationTaxon.displayName).toBe("string");

      const icon: string = ENTITY_ICON_MAP.works;
      expect(typeof icon).toBe("string");
    });
  });
});
