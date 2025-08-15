import React from 'react';

export function GraphDescription() {
  return (
    <div style={{ 
      padding: '12px', 
      backgroundColor: '#f9fafb', 
      borderRadius: '6px',
      fontSize: '13px',
      color: '#6b7280',
      lineHeight: 1.5,
    }}>
      <p style={{ margin: '0 0 8px 0' }}>
        <strong>Entity Graph:</strong> This visualization shows entities you've visited and their relationships. 
        Larger circles indicate entities you've visited more frequently. Lines show connections like authorship, 
        citations, affiliations, and topic relationships.
      </p>
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
        <span>🔵 <strong>Bold border:</strong> Directly visited</span>
        <span>⚪ <strong>Thin border:</strong> Related entity</span>
        <span>🖱️ <strong>Click:</strong> Navigate to entity</span>
      </div>
    </div>
  );
}