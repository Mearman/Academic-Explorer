import { useQuery } from "@tanstack/react-query";
import { cachedOpenAlex } from "@academic-explorer/client";
import { logger } from "@academic-explorer/utils/logger";
import type { OpenAlexEntity } from "@academic-explorer/types";

interface UseEntityMiniGraphDataOptions {
  entityId: string;
  entityType: string;
}

export function useEntityMiniGraphData({
  entityId,
  entityType,
}: UseEntityMiniGraphDataOptions) {
  // Query for the main entity
  const entityQuery = useQuery({
    queryKey: ["entity-mini-graph", "entity", entityId],
    queryFn: async () => {
      switch (entityType) {
        case "authors":
          return await cachedOpenAlex.client.authors.getAuthor(entityId);
        case "works":
          return await cachedOpenAlex.client.works.getWork(entityId);
        case "sources":
          return await cachedOpenAlex.client.sources.getSource(entityId);
        case "institutions":
          return await cachedOpenAlex.client.institutions.getInstitution(
            entityId,
          );
        case "concepts":
          return await cachedOpenAlex.client.concepts.getConcept(entityId);
        case "topics":
          return await cachedOpenAlex.client.topics.getTopic(entityId);
        case "funders":
          return await cachedOpenAlex.client.funders.getFunder(entityId);
        case "publishers":
          return await cachedOpenAlex.client.publishers.getPublisher(entityId);
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    },
    enabled: !!entityId && !!entityType,
  });

  // Query for related entities (1-degree connections)
  const relatedEntitiesQuery = useQuery({
    queryKey: ["entity-mini-graph", "related", entityId],
    queryFn: async () => {
      if (!entityQuery.data) return [];

      const entity = entityQuery.data;
      const relatedEntities: OpenAlexEntity[] = [];

      try {
        // Get a small number of related entities based on entity type
        switch (entityType) {
          case "authors": {
            // Get direct relationships: institution and recent works
            if ("affiliations" in entity && entity.affiliations) {
              // Get the author's institution
              const institutionId = entity.affiliations[0]?.institution?.id;
              if (institutionId) {
                try {
                  const institution =
                    await cachedOpenAlex.client.institutions.getInstitution(
                      institutionId,
                    );
                  relatedEntities.push(institution);
                } catch {
                  // Institution not found, skip
                }
              }
            }

            // Get recent works by this author (inbound relationship)
            const authorWorks = await cachedOpenAlex.client.works.getWorks({
              filter: { "authorships.author.id": entityId },
              per_page: 10,
            });
            if (authorWorks.results) {
              const authorWorkPromises = authorWorks.results.map((work) =>
                cachedOpenAlex.client.works.getWork(work.id).catch(() => null),
              );
              const works = (await Promise.all(authorWorkPromises)).filter(
                Boolean,
              ) as OpenAlexEntity[];
              relatedEntities.push(...works);
            }
            break;
          }

          case "works": {
            // Get authors and concepts
            if ("authorships" in entity && entity.authorships) {
              const authors = entity.authorships.map((authorship) =>
                cachedOpenAlex.client.authors
                  .getAuthor(authorship.author.id)
                  .catch(() => null),
              );
              const authorResults = (await Promise.all(authors)).filter(
                Boolean,
              ) as OpenAlexEntity[];
              relatedEntities.push(...authorResults);
            }

            if ("concepts" in entity && entity.concepts) {
              const concepts = entity.concepts.map((concept) =>
                cachedOpenAlex.client.concepts
                  .getConcept(concept.id)
                  .catch(() => null),
              );
              const conceptResults = (await Promise.all(concepts)).filter(
                Boolean,
              ) as OpenAlexEntity[];
              relatedEntities.push(...conceptResults);
            }
            break;
          }

          case "sources": {
            // Get recent works from this source
            const sourceWorks =
              await cachedOpenAlex.client.sources.getSourceWorks(entityId, {
                per_page: 200,
              });
            if (sourceWorks.results) {
              const workPromises = sourceWorks.results.map((work) =>
                cachedOpenAlex.client.works.getWork(work.id).catch(() => null),
              );
              const workResults = (await Promise.all(workPromises)).filter(
                Boolean,
              ) as OpenAlexEntity[];
              relatedEntities.push(...workResults);
            }
            break;
          }

          case "institutions": {
            // Get authors from this institution
            const institutionAuthors =
              await cachedOpenAlex.client.institutions.getInstitutionAuthors(
                entityId,
                { per_page: 1000 },
              );
            if (institutionAuthors.results) {
              const instAuthorPromises = institutionAuthors.results.map(
                (author) =>
                  cachedOpenAlex.client.authors
                    .getAuthor(author.id)
                    .catch(() => null),
              );
              const instAuthorResults = (
                await Promise.all(instAuthorPromises)
              ).filter(Boolean) as OpenAlexEntity[];
              relatedEntities.push(...instAuthorResults);
            }
            break;
          }

          case "concepts":
          case "topics": {
            // Get works related to this concept/topic
            const conceptWorks = await cachedOpenAlex.client.works.getWorks({
              [entityType === "concepts" ? "concepts.id" : "topics.id"]:
                entityId,
              per_page: 200,
            });
            if (conceptWorks.results) {
              const conceptWorkPromises = conceptWorks.results.map((work) =>
                cachedOpenAlex.client.works.getWork(work.id).catch(() => null),
              );
              const conceptWorkResults = (
                await Promise.all(conceptWorkPromises)
              ).filter(Boolean) as OpenAlexEntity[];
              relatedEntities.push(...conceptWorkResults);
            }
            break;
          }

          default: {
            // For other types, try to get works if available
            if ("works_api_url" in entity) {
              const works = await cachedOpenAlex.client.works.getWorks({
                [entityType.slice(0, -1) + "_id"]: entityId, // e.g., 'funder_id', 'publisher_id'
                per_page: 200,
              });
              if (works.results) {
                const defaultWorkPromises = works.results.map((work) =>
                  cachedOpenAlex.client.works
                    .getWork(work.id)
                    .catch(() => null),
                );
                const defaultWorkResults = (
                  await Promise.all(defaultWorkPromises)
                ).filter(Boolean) as OpenAlexEntity[];
                relatedEntities.push(...defaultWorkResults);
              }
            }
          }
        }
      } catch (error) {
        logger.warn(
          "Failed to load related entities for mini graph:",
          String(error),
        );
      }

      return relatedEntities;
    },
    enabled: !!entityQuery.data,
  });

  return {
    entity: entityQuery.data,
    relatedEntities: relatedEntitiesQuery.data || [],
    isLoading: entityQuery.isLoading || relatedEntitiesQuery.isLoading,
    error: entityQuery.error || relatedEntitiesQuery.error,
  };
}
