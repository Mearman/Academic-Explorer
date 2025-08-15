import React from 'react';

import { Icon } from '@/components/atoms/icon';

export function GraphEmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      color: '#6b7280',
      fontSize: '14px',
    }}>
      <div style={{ marginBottom: '12px', opacity: 0.5 }}>
        <Icon name="graph" size="xl" />
      </div>
      <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Entity graph will appear here</p>
      <p style={{ margin: 0, fontSize: '13px' }}>
        Visit more entities to see relationships and build your entity graph. 
        The graph shows connections between authors, works, institutions, and topics.
      </p>
    </div>
  );
}