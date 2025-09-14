/**
 * Layout controls for switching graph layouts
 */

import React from 'react';
import { Button, Popover, Stack, Text, NumberInput, Switch } from '@mantine/core';
import { IconLayout, IconLayoutGrid, IconLayoutDistributeHorizontal, IconCircle, IconNetwork } from '@tabler/icons-react';
import { useGraphStore } from '@/stores/graph-store';
import type { GraphLayout } from '@/lib/graph/types';

const layoutOptions = [
  {
    type: 'force-deterministic' as const,
    label: 'Force (Deterministic)',
    description: 'Deterministic force-directed layout with overlap prevention',
    icon: IconNetwork,
  },
  {
    type: 'force' as const,
    label: 'Force (Random)',
    description: 'Simple circular force layout',
    icon: IconNetwork,
  },
  {
    type: 'hierarchical' as const,
    label: 'Hierarchical',
    description: 'Hierarchical layout by entity type',
    icon: IconLayoutDistributeHorizontal,
  },
  {
    type: 'circular' as const,
    label: 'Circular',
    description: 'Nodes arranged in a circle',
    icon: IconCircle,
  },
  {
    type: 'grid' as const,
    label: 'Grid',
    description: 'Regular grid layout',
    icon: IconLayoutGrid,
  },
];

export const LayoutControls: React.FC = () => {
  const { currentLayout, setLayout } = useGraphStore();
  const [layoutOptions_, setLayoutOptions] = React.useState(currentLayout.options || {});

  const handleLayoutChange = (type: GraphLayout['type']) => {
    const newLayout: GraphLayout = {
      type,
      options: type === 'force-deterministic' ? {
        iterations: layoutOptions_.iterations || 300,
        strength: layoutOptions_.strength || 100,
        distance: layoutOptions_.distance || 150,
        preventOverlap: layoutOptions_.preventOverlap ?? true,
        seed: layoutOptions_.seed || 42
      } : layoutOptions_
    };
    setLayout(newLayout);
  };

  const handleOptionChange = (key: string, value: unknown) => {
    const newOptions = { ...layoutOptions_, [key]: value };
    setLayoutOptions(newOptions);

    if (currentLayout.type === 'force-deterministic') {
      setLayout({
        type: 'force-deterministic',
        options: newOptions
      });
    }
  };

  const currentOption = layoutOptions.find(opt => opt.type === currentLayout.type);
  const CurrentIcon = currentOption?.icon || IconLayout;

  return (
    <Popover position="bottom-start" shadow="md">
      <Popover.Target>
        <Button
          leftSection={<CurrentIcon size={16} />}
          variant="light"
          size="sm"
        >
          {currentOption?.label || 'Layout'}
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="md" style={{ minWidth: 280 }}>
          <Text size="sm" fw={500}>Graph Layout</Text>

          <Stack gap="xs">
            {layoutOptions.map(option => {
              const OptionIcon = option.icon;
              return (
                <Button
                  key={option.type}
                  variant={currentLayout.type === option.type ? 'filled' : 'subtle'}
                  leftSection={<OptionIcon size={16} />}
                  onClick={() => handleLayoutChange(option.type)}
                  size="sm"
                  justify="flex-start"
                  fullWidth
                >
                  <div>
                    <Text size="sm">{option.label}</Text>
                    <Text size="xs" c="dimmed" style={{ fontSize: '11px' }}>
                      {option.description}
                    </Text>
                  </div>
                </Button>
              );
            })}
          </Stack>

          {currentLayout.type === 'force-deterministic' && (
            <>
              <Text size="sm" fw={500} mt="md">Force Layout Options</Text>
              <Stack gap="sm">
                <NumberInput
                  label="Iterations"
                  description="Number of simulation iterations"
                  value={layoutOptions_.iterations as number || 300}
                  onChange={(value) => handleOptionChange('iterations', value)}
                  min={50}
                  max={500}
                  step={50}
                  size="xs"
                />
                <NumberInput
                  label="Strength"
                  description="Force strength"
                  value={layoutOptions_.strength as number || 100}
                  onChange={(value) => handleOptionChange('strength', value)}
                  min={50}
                  max={200}
                  step={10}
                  size="xs"
                />
                <NumberInput
                  label="Distance"
                  description="Preferred distance between nodes"
                  value={layoutOptions_.distance as number || 150}
                  onChange={(value) => handleOptionChange('distance', value)}
                  min={100}
                  max={300}
                  step={25}
                  size="xs"
                />
                <Switch
                  label="Prevent Overlap"
                  description="Ensure nodes don't overlap"
                  checked={layoutOptions_.preventOverlap as boolean ?? true}
                  onChange={(event) => handleOptionChange('preventOverlap', event.currentTarget.checked)}
                  size="sm"
                />
                <NumberInput
                  label="Seed"
                  description="Random seed for deterministic results"
                  value={layoutOptions_.seed as number || 42}
                  onChange={(value) => handleOptionChange('seed', value)}
                  min={1}
                  max={1000}
                  size="xs"
                />
              </Stack>
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};