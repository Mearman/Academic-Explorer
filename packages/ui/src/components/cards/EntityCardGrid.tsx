/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import type {
  Author,
  EntityType,
  Funder,
  InstitutionEntity,
  OpenAlexEntity,
  Publisher,
  Source,
  Topic,
  Work,
} from "@academic-explorer/client";
import {
  isAuthor,
  isFunder,
  isInstitution,
  isPublisher,
  isSource,
  isTopic,
  isWork,
} from "@academic-explorer/client";
import { SimpleGrid } from "@mantine/core";
import React from "react";
import { AuthorCard } from "./AuthorCard";
import { EntityCard } from "./EntityCard";
import { FunderCard } from "./FunderCard";
import { InstitutionCard } from "./InstitutionCard";
import { PublisherCard } from "./PublisherCard";
import { SourceCard } from "./SourceCard";
import { TopicCard } from "./TopicCard";
import { WorkCard } from "./WorkCard";

export interface EntityCardGridProps {
  entities: OpenAlexEntity[];
  onNavigate?: (path: string) => void;
  columns?: {
    base?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Grid layout component that displays a collection of entity cards
 * Automatically selects the appropriate card type based on the entity
 */
export const EntityCardGrid: React.FC<EntityCardGridProps> = ({
  entities,
  onNavigate,
  columns = { base: 1, sm: 2, md: 3, lg: 4 },
  spacing = "md",
}) => {
  const renderCard = (entity: OpenAlexEntity, index: number) => {
    const key = entity.id || `entity-${index}`;

    // Use type guards with explicit type assertions for UI components
    // TypeScript narrowing doesn't work reliably with union types in this context
    if (isWork(entity)) {
      return (
        <WorkCard key={key} work={entity as Work} onNavigate={onNavigate} />
      );
    }
    if (isAuthor(entity)) {
      return (
        <AuthorCard
          key={key}
          author={entity as Author}
          onNavigate={onNavigate}
        />
      );
    }
    if (isSource(entity)) {
      return (
        <SourceCard
          key={key}
          source={entity as Source}
          onNavigate={onNavigate}
        />
      );
    }
    if (isInstitution(entity)) {
      return (
        <InstitutionCard
          key={key}
          institution={entity as InstitutionEntity}
          onNavigate={onNavigate}
        />
      );
    }
    if (isTopic(entity)) {
      return (
        <TopicCard key={key} topic={entity as Topic} onNavigate={onNavigate} />
      );
    }
    if (isPublisher(entity)) {
      return (
        <PublisherCard
          key={key}
          publisher={entity as Publisher}
          onNavigate={onNavigate}
        />
      );
    }
    if (isFunder(entity)) {
      return (
        <FunderCard
          key={key}
          funder={entity as Funder}
          onNavigate={onNavigate}
        />
      );
    }
    if (isAuthor(entity)) {
      return <AuthorCard key={key} author={entity} onNavigate={onNavigate} />;
    }
    if (isSource(entity)) {
      return <SourceCard key={key} source={entity} onNavigate={onNavigate} />;
    }
    if (isInstitution(entity)) {
      return (
        <InstitutionCard
          key={key}
          institution={entity}
          onNavigate={onNavigate}
        />
      );
    }
    if (isTopic(entity)) {
      return <TopicCard key={key} topic={entity} onNavigate={onNavigate} />;
    }
    if (isPublisher(entity)) {
      return (
        <PublisherCard key={key} publisher={entity} onNavigate={onNavigate} />
      );
    }
    if (isFunder(entity)) {
      return <FunderCard key={key} funder={entity} onNavigate={onNavigate} />;
    }

    // Fallback to generic entity card for unknown entity types
    const entityRecord = entity as unknown as Record<string, unknown>;
    return (
      <EntityCard
        key={key}
        id={entity.id}
        displayName={
          (entityRecord.display_name as string) ||
          (entityRecord.title as string) ||
          "Unknown Entity"
        }
        entityType={getEntityTypeFromId(entity.id)}
        worksCount={entityRecord.works_count as number | undefined}
        citedByCount={entityRecord.cited_by_count as number | undefined}
        description={entityRecord.description as string | undefined}
        onNavigate={onNavigate}
      />
    );
  };

  return (
    <SimpleGrid cols={columns} spacing={spacing}>
      {entities.map(renderCard)}
    </SimpleGrid>
  );
};

/**
 * Helper function to determine entity type from ID prefix
 */
function getEntityTypeFromId(id: string): EntityType {
  const prefix = id.match(/^https?:\/\/openalex\.org\/([A-Z])/)?.[1];
  switch (prefix) {
    case "W":
      return "works";
    case "A":
      return "authors";
    case "S":
      return "sources";
    case "I":
      return "institutions";
    case "T":
      return "topics";
    case "C":
      return "concepts";
    case "P":
      return "publishers";
    case "F":
      return "funders";
    case "K":
      return "keywords";
    default:
      return "works"; // Default fallback
  }
}
