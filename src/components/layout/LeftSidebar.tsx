/**
 * Left sidebar for graph navigation
 * Contains search, filters, and entity type selection
 */

import React, { useState } from 'react'
import { CollapsibleSidebar } from './CollapsibleSidebar'
import { useGraphData } from '@/hooks/use-graph-data'
import type { EntityType } from '@/lib/openalex/types'
import { IconSearch, IconFilter, IconGraph } from '@tabler/icons-react'

export const LeftSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<EntityType[]>([
    'works', 'authors', 'sources', 'institutions'
  ])
  const { search, isLoading, clearGraph } = useGraphData()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      await search(searchQuery, {
        entityTypes: selectedEntityTypes,
        limit: 20,
      })
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleEntityTypeToggle = (entityType: EntityType) => {
    setSelectedEntityTypes(prev =>
      prev.includes(entityType)
        ? prev.filter(type => type !== entityType)
        : [...prev, entityType]
    )
  }

  const handleClearGraph = () => {
    clearGraph()
  }

  const entityTypeOptions: { type: EntityType; label: string; color: string; icon: string }[] = [
    { type: 'works', label: 'Works', color: '#e74c3c', icon: '📄' },
    { type: 'authors', label: 'Authors', color: '#3498db', icon: '👤' },
    { type: 'sources', label: 'Sources', color: '#2ecc71', icon: '📚' },
    { type: 'institutions', label: 'Institutions', color: '#f39c12', icon: '🏛️' },
    { type: 'topics', label: 'Topics', color: '#9b59b6', icon: '🏷️' },
    { type: 'publishers', label: 'Publishers', color: '#1abc9c', icon: '🏢' },
  ]

  return (
    <CollapsibleSidebar side="left" title="Search & Filters">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Search Section */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151'
          }}>
            <IconSearch size={16} />
            Search Academic Entities
          </div>

          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter keywords, DOI, ORCID, etc..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Entity Type Filters */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151'
          }}>
            <IconFilter size={16} />
            Entity Types
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {entityTypeOptions.map(option => (
              <label
                key={option.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '4px',
                  backgroundColor: selectedEntityTypes.includes(option.type) ? '#f3f4f6' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedEntityTypes.includes(option.type)}
                  onChange={() => handleEntityTypeToggle(option.type)}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '16px' }}>{option.icon}</span>
                <span style={{ fontSize: '14px', color: '#374151' }}>{option.label}</span>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: option.color,
                    marginLeft: 'auto',
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Graph Actions */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#374151'
          }}>
            <IconGraph size={16} />
            Graph Actions
          </div>

          <button
            onClick={handleClearGraph}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            Clear Graph
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: '1.4',
        }}>
          <strong>Tips:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
            <li>Search for keywords, author names, paper titles</li>
            <li>Use DOI, ORCID, ROR ID for specific entities</li>
            <li>Click nodes to navigate, double-click to expand</li>
            <li>Use filters to focus on specific entity types</li>
          </ul>
        </div>
      </div>
    </CollapsibleSidebar>
  )
}