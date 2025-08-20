import { Badge as MantineBadge, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { forwardRef } from 'react';

import { BadgeProps } from '../types';

// Mapping configuration objects to reduce complexity
const VARIANT_MAP = {
  default: 'filled',
  secondary: 'light',
} as const;

const SIZE_MAP = {
  xs: 'xs',
  sm: 'sm', 
  md: 'md',
  lg: 'lg',
  xl: 'xl',
} as const;

// Helper function to map variants
const getMantineVariant = (variant: string) => {
  return VARIANT_MAP[variant as keyof typeof VARIANT_MAP] || variant;
};

// Helper function to map sizes
const getMantineSize = (size: string) => {
  return SIZE_MAP[size as keyof typeof SIZE_MAP] || 'md';
};

// Helper component for remove button
const RemoveButton = ({ onRemove }: { onRemove: () => void }) => (
  <ActionIcon
    size="xs"
    variant="transparent"
    color="inherit"
    aria-label="Remove"
    style={{ marginLeft: 4 }}
    onClick={(e) => {
      e.stopPropagation();
      onRemove();
    }}
  >
    <IconX size={12} />
  </ActionIcon>
);

// Simple wrapper around Mantine Badge that maps our props to Mantine props
export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  (props, ref) => {
    const { 
      children, 
      variant = 'default', 
      size = 'md', 
      pill = false, 
      removable = false, 
      onRemove, 
      className, 
      'data-testid': testId,
      ...restProps 
    } = props;
    const mantineVariant = getMantineVariant(variant);
    const mantineSize = getMantineSize(size);

    return (
      <MantineBadge
        ref={ref}
        variant={mantineVariant}
        size={mantineSize}
        radius={pill ? 'xl' : 'sm'}
        className={className}
        data-testid={testId}
        {...restProps}
      >
        {children}
        {removable && onRemove && <RemoveButton onRemove={onRemove} />}
      </MantineBadge>
    );
  }
);

Badge.displayName = 'Badge';