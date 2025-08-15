import React from 'react';

import { Icon } from '@/components/atoms/icon';

interface GraphToggleButtonProps {
  isVisible: boolean;
  entityCount: number;
  onToggle: () => void;
}

export function GraphToggleButton({ isVisible, entityCount, onToggle }: GraphToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '8px 12px',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        backgroundColor: isVisible ? '#3b82f6' : 'white',
        color: isVisible ? 'white' : '#374151',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        transition: 'all 0.2s ease',
      }}
      title={isVisible ? 'Hide entity graph' : 'Show entity graph'}
    >
      <Icon name={isVisible ? 'eye-off' : 'eye'} size="sm" />
      {isVisible ? 'Hide Graph' : 'Show Graph'}
      <span
        style={{
          fontSize: '12px',
          backgroundColor: isVisible ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
          color: isVisible ? 'white' : '#6b7280',
          padding: '2px 6px',
          borderRadius: '4px',
          fontWeight: '500',
        }}
      >
        {entityCount}
      </span>
    </button>
  );
}