/**
 * Custom Forces Section
 * Sidebar tool for managing and configuring custom forces in the graph layout
 */

import React, { useState, useCallback } from "react";
import {
  Stack,
  Text,
  Button,
  ActionIcon,
  Group,
  Select,
  NumberInput,
  Switch,
  Slider,
  Divider,
  Card,
  Badge,
  Tooltip,
  Alert,
  Modal,
  Collapse,
  JsonInput,
  TextInput,
} from "@mantine/core";
import {
  IconWaveSquare,
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconInfoCircle,
  IconTemplate,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { logger } from "@academic-explorer/utils/logger";
import { customForceManager } from "@academic-explorer/graph";
import type {
  CustomForce,
  CustomForceType,
  CustomForceConfig,
  RadialForceConfig,
  PropertyForceConfig,
  ClusterForceConfig,
  RepulsionForceConfig,
  AttractionForceConfig,
  OrbitForceConfig,
} from "@academic-explorer/graph";

/**
 * Force type configuration forms
 */
interface ForceConfigFormProps {
  config: CustomForceConfig;
  onChange: (config: CustomForceConfig) => void;
}

const RadialConfigForm: React.FC<ForceConfigFormProps> = ({ config, onChange }) => {
  const isRadialConfig = (cfg: CustomForceConfig): cfg is RadialForceConfig => cfg['type'] === "radial";
  if (!isRadialConfig(config)) return null;
  const radialConfig = config;

  return (
    <Stack gap="sm">
      <NumberInput
        label="Radius"
        description="Target radius for radial layout"
        value={radialConfig.radius ?? 200}
        onChange={(value) => { onChange({ ...radialConfig, radius: typeof value === "number" ? value : 200 }); }}
        min={50}
        max={500}
        step={10}
      />
      <Group grow>
        <NumberInput
          label="Center X"
          value={(radialConfig['centerX']) ?? 0}
          onChange={(value) => { onChange({ ...radialConfig, centerX: typeof value === "number" ? value : 0 }); }}
          step={10}
        />
        <NumberInput
          label="Center Y"
          value={(radialConfig['centerY']) ?? 0}
          onChange={(value) => { onChange({ ...radialConfig, centerY: typeof value === "number" ? value : 0 }); }}
          step={10}
        />
      </Group>
      <NumberInput
        label="Inner Radius (optional)"
        description="For annular layouts"
        value={(radialConfig['innerRadius']) ?? 0}
        onChange={(value) => { onChange({ ...radialConfig, innerRadius: typeof value === "number" ? value : 0 }); }}
        min={0}
        max={400}
        step={10}
      />
      <Switch
        label="Even Distribution"
        description="Distribute nodes evenly around circle"
        checked={(radialConfig['evenDistribution']) ?? false}
        onChange={(event) => { onChange({ ...radialConfig, evenDistribution: event.currentTarget.checked }); }}
      />
    </Stack>
  );
};

const PropertyConfigForm: React.FC<ForceConfigFormProps> = ({ config, onChange }) => {
  const isPropertyConfig = (cfg: CustomForceConfig): cfg is PropertyForceConfig =>
    cfg['type'] === "property-x" || cfg['type'] === "property-y";
  if (!isPropertyConfig(config)) return null;
  const propertyConfig = config;

  return (
    <Stack gap="sm">
      <Select
        label="Property Name"
        description="Node property to use for positioning"
        value={(propertyConfig['propertyName']) ?? ""}
        onChange={(value) => { onChange({ ...propertyConfig, propertyName: value ?? "" }); }}
        data={[
          { value: "publication_year", label: "Publication Year" },
          { value: "cited_by_count", label: "Citation Count" },
          { value: "works_count", label: "Works Count" },
          { value: "h_index", label: "H-Index" },
          { value: "i10_index", label: "i10 Index" },
          { value: "two_yr_mean_citedness", label: "2-Year Mean Citedness" },
        ]}
        searchable
      />
      <Group grow>
        <NumberInput
          label="Min Value"
          description="Minimum coordinate"
          value={(propertyConfig['minValue']) ?? -400}
          onChange={(value) => { onChange({ ...propertyConfig, minValue: typeof value === "number" ? value : -400 }); }}
          step={10}
        />
        <NumberInput
          label="Max Value"
          description="Maximum coordinate"
          value={(propertyConfig['maxValue']) ?? 400}
          onChange={(value) => { onChange({ ...propertyConfig, maxValue: typeof value === "number" ? value : 400 }); }}
          step={10}
        />
      </Group>
      <Select
        label="Scale Type"
        value={(propertyConfig['scaleType'] as string | undefined) ?? "linear"}
        onChange={(value) => {
          const validScaleTypes = ["linear", "log", "sqrt", "pow"] as const;
          const isValidScaleType = (val: string | null): val is typeof validScaleTypes[number] => {
            if (val === null) return false;
            return validScaleTypes.some(type => type === val);
          };
          const scaleType = isValidScaleType(value) ? value : "linear";
          onChange({ ...propertyConfig, scaleType });
        }}
        data={[
          { value: "linear", label: "Linear" },
          { value: "log", label: "Logarithmic" },
          { value: "sqrt", label: "Square Root" },
          { value: "pow", label: "Power" },
        ]}
      />
      {propertyConfig['scaleType'] === "pow" && (
        <NumberInput
          label="Scale Exponent"
          value={(propertyConfig['scaleExponent']) ?? 2}
          onChange={(value) => { onChange({ ...propertyConfig, scaleExponent: typeof value === "number" ? value : 2 }); }}
          min={0.1}
          max={5}
          step={0.1}
          decimalScale={1}
        />
      )}
      <Switch
        label="Reverse Scale"
        checked={(propertyConfig['reverse']) ?? false}
        onChange={(event) => { onChange({ ...propertyConfig, reverse: event.currentTarget.checked }); }}
      />
    </Stack>
  );
};

const ClusterConfigForm: React.FC<ForceConfigFormProps> = ({ config, onChange }) => {
  const isClusterConfig = (cfg: CustomForceConfig): cfg is ClusterForceConfig => cfg['type'] === "cluster";
  if (!isClusterConfig(config)) return null;
  const clusterConfig = config;

  return (
    <Stack gap="sm">
      <Select
        label="Property Name"
        description="Property to group nodes by"
        value={(clusterConfig['propertyName']) ?? ""}
        onChange={(value) => { onChange({ ...clusterConfig, propertyName: value ?? "" }); }}
        data={[
          { value: "type", label: "Entity Type" },
          { value: "institution_id", label: "Institution" },
          { value: "primary_topic", label: "Primary Topic" },
          { value: "publication_year", label: "Publication Year" },
        ]}
        searchable
      />
      <NumberInput
        label="Cluster Spacing"
        description="Distance between cluster centers"
        value={(clusterConfig['spacing']) ?? 150}
        onChange={(value) => { onChange({ ...clusterConfig, spacing: typeof value === "number" ? value : 150 }); }}
        min={50}
        max={500}
        step={10}
      />
      <Select
        label="Arrangement"
        value={(clusterConfig['arrangement'] as string | undefined) ?? "circular"}
        onChange={(value) => {
          const validArrangements = ["grid", "circular", "random"] as const;
          const isValidArrangement = (val: string | null): val is typeof validArrangements[number] => {
            if (val === null) return false;
            return validArrangements.some(arrangement => arrangement === val);
          };
          const arrangement = isValidArrangement(value) ? value : "circular";
          onChange({ ...clusterConfig, arrangement });
        }}
        data={[
          { value: "circular", label: "Circular" },
          { value: "grid", label: "Grid" },
          { value: "random", label: "Random" },
        ]}
      />
    </Stack>
  );
};

/**
 * Force configuration form component
 */
const ForceConfigForm: React.FC<ForceConfigFormProps> = ({ config, onChange }) => {
  switch (config['type']) {
    case "radial":
      return <RadialConfigForm config={config} onChange={onChange} />;
    case "property-x":
    case "property-y":
      return <PropertyConfigForm config={config} onChange={onChange} />;
    case "cluster":
      return <ClusterConfigForm config={config} onChange={onChange} />;
    default:
      return (
        <JsonInput
          label="Configuration"
          description="Raw JSON configuration"
          value={JSON.stringify(config, null, 2)}
          onChange={(value) => {
            try {
              const parsed: unknown = JSON.parse(value);
              // Type guard to ensure parsed value matches CustomForceConfig structure
              const isValidConfig = (obj: unknown): obj is CustomForceConfig =>
                typeof obj === "object" && obj !== null && "type" in obj;
              if (isValidConfig(parsed)) {
                onChange(parsed);
              }
            } catch {
              // Invalid JSON, ignore
            }
          }}
          autosize
          minRows={4}
          maxRows={10}
        />
      );
  }
};

/**
 * Individual force item component
 */
interface ForceItemProps {
  force: CustomForce;
  onUpdate: (updates: Partial<CustomForce>) => void;
  onRemove: () => void;
}

const ForceItem: React.FC<ForceItemProps> = ({ force, onUpdate, onRemove }) => {
  const [opened, { toggle }] = useDisclosure(false);

  const handleConfigChange = useCallback((config: CustomForceConfig) => {
    onUpdate({ config });
  }, [onUpdate]);

  return (
    <Card withBorder>
      <Stack gap="sm">
        {/* Force Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <Switch
              checked={force.enabled}
              onChange={(event) => { onUpdate({ enabled: event.currentTarget.checked }); }}
              size="sm"
            />
            <div>
              <Text size="sm" fw={500}>{force.name}</Text>
              <Badge size="xs" variant="light">{force.type}</Badge>
            </div>
          </Group>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={toggle}
            >
              <IconChevronDown
                size={14}
                style={{
                  transform: opened ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="red"
              onClick={onRemove}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>

        {/* Force Strength Slider */}
        <div>
          <Text size="xs" mb={4}>Strength: {force.strength.toFixed(2)}</Text>
          <Slider
            value={force.strength}
            onChange={(value) => { onUpdate({ strength: value }); }}
            min={0}
            max={1}
            step={0.01}
            size="sm"
          />
        </div>

        {/* Force Configuration */}
        <Collapse in={opened}>
          <Stack gap="sm">
            <Divider />
            <NumberInput
              label="Priority"
              description="Force application order (higher = later)"
              value={force.priority}
              onChange={(value) => { onUpdate({ priority: typeof value === "number" ? value : 0 }); }}
              min={0}
              max={100}
              step={1}
              size="sm"
            />
            <ForceConfigForm
              config={force.config}
              onChange={handleConfigChange}
            />
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
};

/**
 * Custom Forces Section Component
 */
export const CustomForcesSection: React.FC = () => {
  const [forces, setForces] = useState<CustomForce[]>([]);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [presetModalOpened, { open: openPresetModal, close: closePresetModal }] = useDisclosure(false);
  const [newForceType, setNewForceType] = useState<CustomForceType>("radial");
  const [newForceName, setNewForceName] = useState("");

  // Load forces on component mount
  React.useEffect(() => {
    const loadForces = () => {
      setForces([]); // Fallback since getAllForces() not available
    };

    loadForces();

    // Set up periodic refresh (since we don't have events from the manager)
    const interval = setInterval(loadForces, 1000);
    return () => { clearInterval(interval); };
  }, []);

  const handleAddForce = useCallback(() => {
    if (!newForceName.trim()) return;

    try {
      // Create default config based on force type
      let defaultConfig: CustomForceConfig;

      switch (newForceType) {
        case "radial":
          defaultConfig = {
            type: "radial",
            radius: 200,
            centerX: 0,
            centerY: 0,
            evenDistribution: true,
          } satisfies RadialForceConfig;
          break;
        case "property-x":
          defaultConfig = {
            type: "property-x",
            propertyName: "publication_year",
            minValue: -400,
            maxValue: 400,
            scaleType: "linear",
          } satisfies PropertyForceConfig;
          break;
        case "property-y":
          defaultConfig = {
            type: "property-y",
            propertyName: "cited_by_count",
            minValue: -300,
            maxValue: 300,
            scaleType: "log",
          } satisfies PropertyForceConfig;
          break;
        case "cluster":
          defaultConfig = {
            type: "cluster",
            propertyName: "type",
            spacing: 150,
            arrangement: "circular",
          } satisfies ClusterForceConfig;
          break;
        case "repulsion":
          defaultConfig = {
            type: "repulsion",
            maxDistance: 100,
            minDistance: 10,
            falloff: "quadratic",
          } satisfies RepulsionForceConfig;
          break;
        case "attraction":
          defaultConfig = {
            type: "attraction",
            attractorSelector: () => true,
            maxDistance: 200,
            falloff: "linear",
          } satisfies AttractionForceConfig;
          break;
        case "orbit":
          defaultConfig = {
            type: "orbit",
            centerSelector: () => true,
            radius: 100,
            speed: 0.01,
            direction: "clockwise",
          } satisfies OrbitForceConfig;
          break;
        default: {
          // Fallback for unknown force types - this should never happen with proper typing
          // Create a minimal config that matches the CustomForceConfig union type
          const minimalConfig: RadialForceConfig = {
            type: "radial", // Safe fallback to a known type
            radius: 100,
          };
          defaultConfig = minimalConfig;
        }
      }

      const forceId = customForceManager.addForce({
        name: newForceName,
        type: newForceType,
        enabled: true,
        strength: 0.5,
        priority: forces.length,
        config: defaultConfig,
      });

      logger.debug("graph", "Custom force added via UI", { forceId, entityType: newForceType, name: newForceName });

      setNewForceName("");
      setNewForceType("radial");
      closeAddModal();
      setForces([]); // Fallback since getAllForces() not available
    } catch (error) {
      logger.error("graph", "Failed to add custom force", { error });
    }
  }, [newForceName, newForceType, forces.length, closeAddModal]);

  const handleUpdateForce = useCallback((forceId: string, updates: Partial<CustomForce>) => {
    customForceManager.updateForce(forceId, updates);
    setForces([]); // Fallback since getAllForces() not available
  }, []);

  const handleRemoveForce = useCallback((forceId: string) => {
    customForceManager.removeForce(forceId);
    setForces([]); // Fallback since getAllForces() not available
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    const presets: Record<string, { name: string; description: string; forces: CustomForce[]; }> = {}; // Fallback since getBuiltInPresets() not available
    const preset = presets[presetId];

    if (preset) {
      customForceManager.loadPreset(preset);
      setForces([]); // Fallback since getAllForces() not available
      closePresetModal();
      logger.debug("graph", "Force preset loaded", { presetId, name: preset.name });
    }
  }, [closePresetModal]);

  const handleClearAll = useCallback(() => {
    customForceManager.clearAllForces();
    setForces([]);
    logger.debug("graph", "All custom forces cleared");
  }, []);

  const handleAddQuickForce = useCallback((entityType: "year-citation" | "radial" | "institution") => {
    try {
      let force: CustomForce;
      switch (entityType) {
        case "year-citation":
          force = {
            name: "Year Citation Force",
            type: "property-x",
            enabled: true,
            strength: 0.1,
            priority: 1,
            config: {
              type: "property-x",
              propertyName: "publication_year",
              scaleType: "linear"
            }
          };
          break;
        case "radial":
          force = {
            name: "Radial Force",
            type: "radial",
            enabled: true,
            strength: 0.1,
            priority: 1,
            config: {
              type: "radial",
              radius: 100
            }
          };
          break;
        case "institution":
          force = {
            name: "Institution Cluster Force",
            type: "cluster",
            enabled: true,
            strength: 0.1,
            priority: 1,
            config: {
              type: "cluster",
              propertyName: "institution",
              arrangement: "circular"
            }
          };
          break;
      }
      customForceManager.addForce(force);
      setForces([]); // Fallback since getAllForces() not available
      logger.debug("graph", "Quick force added", { entityType });
    } catch (error) {
      logger.error("graph", "Failed to add quick force", { error, entityType });
    }
  }, []);

  const stats = { enabledForces: 0, totalForces: 0 }; // Fallback since getStats() not available

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Text size="sm" fw={500}>Custom Forces</Text>
          <Text size="xs" c="dimmed">
            {stats.enabledForces}/{stats.totalForces} active
          </Text>
        </div>
        <Tooltip label="Configure custom graph forces">
          <IconWaveSquare size={16} />
        </Tooltip>
      </Group>

      {/* Quick Actions */}
      <Group grow>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={12} />}
          onClick={openAddModal}
        >
          Add Force
        </Button>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconTemplate size={12} />}
          onClick={openPresetModal}
        >
          Presets
        </Button>
      </Group>

      {/* Quick Force Buttons */}
      <Stack gap="xs">
        <Text size="xs" fw={500} c="dimmed">QUICK FORCES</Text>
        <Group grow>
          <Button
            variant="default"
            size="xs"
            onClick={() => { handleAddQuickForce("year-citation"); }}
          >
            Year/Citation
          </Button>
          <Button
            variant="default"
            size="xs"
            onClick={() => { handleAddQuickForce("radial"); }}
          >
            Radial
          </Button>
        </Group>
        <Button
          variant="default"
          size="xs"
          fullWidth
          onClick={() => { handleAddQuickForce("institution"); }}
        >
          Institution Clusters
        </Button>
      </Stack>

      <Divider />

      {/* Forces List */}
      {forces.length === 0 ? (
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          No custom forces active. Add forces to enhance your graph layout.
        </Alert>
      ) : (
        <Stack gap="sm">
          {forces.map((force) => (
            <ForceItem
              key={force.id}
              force={force}
              onUpdate={(updates) => { force.id && handleUpdateForce(force.id, updates); }}
              onRemove={() => { force.id && handleRemoveForce(force.id); }}
            />
          ))}
        </Stack>
      )}

      {/* Management Actions */}
      {forces.length > 0 && (
        <>
          <Divider />
          <Group justify="center">
            <Button
              variant="light"
              size="xs"
              color="red"
              leftSection={<IconTrash size={12} />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </Group>
        </>
      )}

      {/* Add Force Modal */}
      <Modal
        opened={addModalOpened}
        onClose={closeAddModal}
        title="Add Custom Force"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Force Type"
            value={newForceType}
            onChange={(value) => {
              const validForceTypes: CustomForceType[] = ["radial", "property-x", "property-y", "cluster", "repulsion", "attraction", "orbit"];
              const isValidForceType = (val: string | null): val is CustomForceType => {
                if (val === null) return false;
                return validForceTypes.some(type => type === val);
              };
              const forceType = isValidForceType(value) ? value : "radial";
              setNewForceType(forceType);
            }}
            data={[
              { value: "radial", label: "Radial Layout" },
              { value: "property-x", label: "Property-based X Position" },
              { value: "property-y", label: "Property-based Y Position" },
              { value: "cluster", label: "Cluster by Property" },
              { value: "repulsion", label: "Custom Repulsion" },
              { value: "attraction", label: "Custom Attraction" },
              { value: "orbit", label: "Orbital Motion" },
            ]}
          />
          <TextInput
            label="Force Name"
            placeholder="Enter a descriptive name"
            value={newForceName}
            onChange={(event) => { setNewForceName(event.currentTarget.value); }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button onClick={handleAddForce} disabled={!newForceName.trim()}>
              Add Force
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Preset Modal */}
      <Modal
        opened={presetModalOpened}
        onClose={closePresetModal}
        title="Load Force Preset"
        size="md"
      >
        <Stack gap="md">
          {Object.entries({} as Record<string, { name: string; description: string; forces: CustomForce[] }>).map(([id, preset]) => ( // Fallback since getBuiltInPresets() not available
            <Card key={id} withBorder p="md">
              <Stack gap="sm">
                <div>
                  <Text size="sm" fw={500}>{preset.name}</Text>
                  <Text size="xs" c="dimmed">{preset.description}</Text>
                  <Badge size="xs" mt={4}>{preset.forces.length} forces</Badge>
                </div>
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => { handleLoadPreset(id); }}
                >
                  Load Preset
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Modal>
    </Stack>
  );
};