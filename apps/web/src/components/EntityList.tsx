import React, { useState, useEffect } from "react";
import { BaseTable } from "./tables/BaseTable";
import { logger } from "@academic-explorer/utils";
import { cachedOpenAlex as openAlex } from "@academic-explorer/client";
import type {
  OpenAlexResponse,
  Funder,
  Publisher,
  Source,
} from "@academic-explorer/client";

export type EntityType = "funders" | "publishers" | "sources";

type Entity = Funder | Publisher | Source;

export interface ColumnConfig {
  key: string;
  header: string;
  render?: (value: unknown, row: Entity) => React.ReactNode;
}

export interface EntityListProps {
  entityType: EntityType;
  columns: ColumnConfig[];
  perPage?: number;
  title?: string;
}

export function EntityList({
  entityType,
  columns,
  perPage = 50,
  title,
}: EntityListProps) {
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        let response: OpenAlexResponse<Entity> | null = null;

        switch (entityType) {
          case "funders":
            response = await openAlex.client.funders.getMultiple({
              per_page: perPage,
            });
            break;
          case "publishers":
            response = await openAlex.client.publishers.getMultiple({
              per_page: perPage,
            });
            break;
          case "sources":
            response = await openAlex.client.sources.getSources({
              per_page: perPage,
            });
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }

        if (response) {
          setData(response.results);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch data";
        setError(errorMessage);
        logger.error("EntityList", `Failed to fetch ${entityType}`, {
          error: err,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [entityType, perPage]);

  if (loading) {
    return <div>Loading {title || entityType}...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const tableData = data.map((item) => ({
    ...item,
    id: item.id.replace("https://openalex.org/", ""),
  }));

  if (loading) {
    return <div>Loading {entityType}...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>
        {title || entityType.charAt(0).toUpperCase() + entityType.slice(1)}
      </h1>
      <BaseTable data={tableData} columns={columns} />
    </div>
  );
}
