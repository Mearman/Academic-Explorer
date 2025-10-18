import { Stack } from "@mantine/core";
import React from "react";
import { EntityCard } from "../../../cards/EntityCard";
import type { ArrayMatcher, TopicItem } from "../types";
import { extractEntityId } from "../utils";

export const topicMatcher: ArrayMatcher = {
  name: "topics",
  priority: 8,
  detect: (array: unknown[]): boolean => {
    if (!Array.isArray(array) || array.length === 0) return false;

    const first = array[0];
    return (
      typeof first === "object" &&
      first !== null &&
      "display_name" in first &&
      "count" in first
    );
  },
  render: ({
    array,
    fieldName,
    onNavigate,
  }: {
    array: unknown[];
    fieldName: string;
    onNavigate?: (path: string) => void;
  }): React.ReactNode => {
    const topicArray = array as TopicItem[];

    return (
      <Stack gap="sm">
        {topicArray.map((topic, index) => {
          const entityId = topic.id
            ? extractEntityId(topic.id) || topic.id
            : `topic-${topic.display_name}`;
          return (
            <EntityCard
              key={index}
              id={entityId}
              displayName={topic.display_name}
              entityType="topics"
              worksCount={topic.count}
              onNavigate={onNavigate}
              href={
                topic.id
                  ? `#/topics/${extractEntityId(topic.id) || topic.id}`
                  : undefined
              }
            />
          );
        })}
      </Stack>
    );
  },
};
