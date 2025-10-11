import {
    Badge,
    Button,
    Card,
    Combobox,
    Group,
    Pill,
    PillsInput,
    Stack,
    Text,
    useCombobox,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useState } from "react";

export interface FieldSelectorProps {
  availableFields: string[];
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  title?: string;
  description?: string;
}

export function FieldSelector({
  availableFields,
  selectedFields,
  onFieldsChange,
  title = "Select Fields",
  description = "Choose which fields to include in the response",
}: FieldSelectorProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });

  const [search, setSearch] = useState("");

  const handleValueSelect = (val: string) => {
    if (!selectedFields.includes(val)) {
      onFieldsChange([...selectedFields, val]);
    }
    setSearch("");
  };

  const handleValueRemove = (val: string) => {
    onFieldsChange(selectedFields.filter((v) => v !== val));
  };

  const handleClear = () => {
    onFieldsChange([]);
  };

  // Filter available fields based on search and exclude already selected
  const filteredOptions = availableFields
    .filter(
      (field) =>
        field.toLowerCase().includes(search.toLowerCase().trim()) &&
        !selectedFields.includes(field),
    )
    .sort();

  const values = selectedFields.map((field) => (
    <Pill
      key={field}
      withRemoveButton
      onRemove={() => handleValueRemove(field)}
      styles={{
        root: {
          fontFamily: "monospace",
          fontSize: "0.875rem",
        },
      }}
    >
      {field}
    </Pill>
  ));

  const options = filteredOptions.map((field) => (
    <Combobox.Option value={field} key={field}>
      <Text size="sm" style={{ fontFamily: "monospace" }}>
        {field}
      </Text>
    </Combobox.Option>
  ));

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text size="sm" fw={500}>
              {title}
            </Text>
            {description && (
              <Text size="xs" c="dimmed">
                {description}
              </Text>
            )}
          </div>
          {selectedFields.length > 0 && (
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconX size={14} />}
              onClick={handleClear}
            >
              Clear All
            </Button>
          )}
        </Group>

        <Combobox
          store={combobox}
          onOptionSubmit={handleValueSelect}
          withinPortal={false}
        >
          <Combobox.DropdownTarget>
            <PillsInput
              onClick={() => combobox.openDropdown()}
              rightSection={
                <Combobox.Chevron />
              }
            >
              <Pill.Group>
                {values}
                <Combobox.EventsTarget>
                  <PillsInput.Field
                    onFocus={() => combobox.openDropdown()}
                    onBlur={() => combobox.closeDropdown()}
                    value={search}
                    placeholder={
                      selectedFields.length === 0 ? "Select fields..." : ""
                    }
                    onChange={(event) => {
                      combobox.updateSelectedOptionIndex();
                      setSearch(event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && search.length === 0) {
                        event.preventDefault();
                        if (selectedFields.length > 0) {
                          handleValueRemove(
                            selectedFields[selectedFields.length - 1],
                          );
                        }
                      }
                    }}
                  />
                </Combobox.EventsTarget>
              </Pill.Group>
            </PillsInput>
          </Combobox.DropdownTarget>

          <Combobox.Dropdown>
            <Combobox.Options>
              {options.length > 0 ? (
                options
              ) : (
                <Combobox.Empty>
                  {search.trim() ? "No fields found" : "All fields selected"}
                </Combobox.Empty>
              )}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        {selectedFields.length > 0 && (
          <Group gap="xs">
            <Badge size="sm" variant="light">
              {selectedFields.length} field{selectedFields.length !== 1 ? "s" : ""}{" "}
              selected
            </Badge>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
