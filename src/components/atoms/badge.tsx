import { Badge as MantineBadge, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { forwardRef } from 'react';

import { BadgeProps } from '../types';

// Simple wrapper around Mantine Badge that maps our props to Mantine props
export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  function Badge({ 
    children, 
    variant = 'default', 
    size = 'md', 
    pill = false, 
    removable = false, 
    onRemove, 
    className, 
    'data-testid': testId,
    ...props 
  }, ref) {
    // Map our variants to Mantine variants
    const mantineVariant = variant === 'default' ? 'filled' : 
                          variant === 'secondary' ? 'light' : 
                          variant;
    
    // Map our sizes to Mantine sizes  
    const mantineSize = size === 'xs' ? 'xs' :
                       size === 'sm' ? 'sm' :
                       size === 'md' ? 'md' :
                       size === 'lg' ? 'lg' :
                       size === 'xl' ? 'xl' : 'md';

    return (
      <MantineBadge
        ref={ref}
        variant={mantineVariant}
        size={mantineSize}
        radius={pill ? 'xl' : 'sm'}
        className={className}
        data-testid={testId}
        {...props}
      >
        {children}
        {removable && onRemove && (
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
        )}
      </MantineBadge>
    );
  }
);

Badge.displayName = 'Badge';