/**
 * Modal component for creating new catalogue lists
 */

import type { ListType } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Radio,
  Stack,
  TagsInput,
  Text as MantineText,
  Textarea,
  TextInput,
} from "@mantine/core";
import React, { useMemo, useState } from "react";


interface CreateListModalProps {
  onClose: () => void;
  onSubmit: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<void>;
}

export const CreateListModal = ({ onClose, onSubmit }: CreateListModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ListType>("list");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived state computed via useMemo instead of repeated calculations
  const trimmedTitle = useMemo(() => title.trim(), [title]);
  const trimmedDescription = useMemo(() => description.trim(), [description]);
  const filteredTags = useMemo(() =>
    tags.filter(tag => tag.trim().length > 0),
    [tags]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trimmedTitle) return;

    setIsSubmitting(true);
    try {
      const listData = {
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        type,
        tags: filteredTags,
        isPublic,
      };

      await onSubmit(listData);

      logger.debug("catalogue-ui", "List creation form submitted successfully", {
        listType: type,
        hasDescription: !!trimmedDescription,
        tagsCount: filteredTags.length,
        isPublic
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to create list from form", {
        listType: type,
        title: trimmedTitle,
        error
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack gap="md">
        <TextInput
          id="list-title"
          label="Title"
          placeholder="Enter list name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Textarea
          id="list-description"
          label="Description"
          placeholder="Optional description of your list"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={3}
        />

        <Radio.Group
          label="Type"
          value={type}
          onChange={(value) => setType(value as ListType)}
          required
          aria-describedby="list-type-description"
        >
          <Group mt="xs">
            <Radio
              value="list"
              label="List"
              description="Can contain any type of entity (works, authors, institutions, etc.)"
              aria-label="General list - can contain any entity type"
            />
            <Radio
              value="bibliography"
              label="Bibliography"
              description="Can only contain works - perfect for reference lists"
              aria-label="Bibliography - works only"
            />
          </Group>
          <MantineText id="list-type-description" size="xs" c="dimmed" mt="xs">
            Choose the type of list you want to create. This cannot be changed later.
          </MantineText>
        </Radio.Group>

        <TagsInput
          id="list-tags"
          label="Tags"
          placeholder="Add tags to organize your lists..."
          data={[]}
          value={tags}
          onChange={setTags}
        />

        <Checkbox
          id="is-public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          label="Make this list publicly shareable"
          aria-describedby="public-description"
        />
        <MantineText id="public-description" size="xs" c="dimmed">
          When enabled, others can import and view this list using a share URL.
        </MantineText>

        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!trimmedTitle}
          >
            Create {type === "bibliography" ? "Bibliography" : "List"}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
};