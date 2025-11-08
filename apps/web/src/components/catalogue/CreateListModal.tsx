/**
 * Modal component for creating new catalogue lists
 */

import React, { useState } from "react";
import {
  TextInput,
  Textarea,
  Select,
  TagsInput,
  Button,
  Group,
  Stack,
  Radio,
  Box,
  Checkbox,
  Text as MantineText,
} from "@mantine/core";
import type { ListType } from "@academic-explorer/utils";
import { logger } from "@/lib/logger";

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

export function CreateListModal({ onClose, onSubmit }: CreateListModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ListType>("list");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const listData = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        tags: tags.filter(tag => tag.trim().length > 0),
        isPublic,
      };

      await onSubmit(listData);

      logger.debug("catalogue-ui", "List creation form submitted successfully", {
        listType: type,
        hasDescription: !!description.trim(),
        tagsCount: tags.filter(tag => tag.trim().length > 0).length,
        isPublic
      });
    } catch (error) {
      logger.error("catalogue-ui", "Failed to create list from form", {
        listType: type,
        title: title.trim(),
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
          autoFocus
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
            disabled={!title.trim()}
          >
            Create {type === "bibliography" ? "Bibliography" : "List"}
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}