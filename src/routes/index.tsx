import { 
  IconSearch, 
  IconNetwork, 
  IconChartBar, 
  IconHelp,
  IconArrowRight,
  IconBulb,
  IconDatabase,
  IconUsers,
  IconMap,
  IconSchool
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState } from 'react';

import { TwoPaneLayout, StorageManager } from '@/components';
import { getEntityColour } from '@/components/design-tokens.utils';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import type { EntityType as EntityGraphType } from '@/types/entity-graph';

import * as pageStyles from '../app/page.css';

// Sample demo data for the overview graph
const createSampleVertex = (id: string, type: EntityGraphType, name: string, x: number, y: number) => ({
  id,
  entityType: type,
  displayName: name,
  directlyVisited: Math.random() > 0.7,
  visitCount: Math.floor(Math.random() * 5) + 1,
  x,
  y,
});

const sampleVertices = [
  createSampleVertex('W2023456789', EntityType.WORK, 'Machine Learning in Academia', 200, 150),
  createSampleVertex('A1234567890', EntityType.AUTHOR, 'Dr. Sarah Chen', 100, 100),
  createSampleVertex('A9876543210', EntityType.AUTHOR, 'Prof. David Kumar', 300, 100),
  createSampleVertex('I5555555555', EntityType.INSTITUTION, 'Stanford University', 200, 50),
  createSampleVertex('S1111111111', EntityType.SOURCE, 'Nature Machine Intelligence', 200, 250),
  createSampleVertex('T3333333333', EntityType.TOPIC, 'Neural Networks', 350, 200),
  createSampleVertex('W4444444444', EntityType.WORK, 'Deep Learning Fundamentals', 50, 200),
];

const sampleEdges = [
  { id: 'e1', sourceId: 'W2023456789', targetId: 'A1234567890', weight: 0.8 },
  { id: 'e2', sourceId: 'W2023456789', targetId: 'A9876543210', weight: 0.8 },
  { id: 'e3', sourceId: 'A1234567890', targetId: 'I5555555555', weight: 0.6 },
  { id: 'e4', sourceId: 'A9876543210', targetId: 'I5555555555', weight: 0.6 },
  { id: 'e5', sourceId: 'W2023456789', targetId: 'S1111111111', weight: 0.9 },
  { id: 'e6', sourceId: 'W2023456789', targetId: 'T3333333333', weight: 0.7 },
  { id: 'e7', sourceId: 'W4444444444', targetId: 'T3333333333', weight: 0.8 },
  { id: 'e8', sourceId: 'W4444444444', targetId: 'A1234567890', weight: 0.5 },
];

function DemoGraph() {
  const [selectedVertex, setSelectedVertex] = useState<string | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<string | null>(null);

  const handleVertexClick = (vertexId: string) => {
    setSelectedVertex(selectedVertex === vertexId ? null : vertexId);
  };

  const getVertexRadius = (vertex: typeof sampleVertices[0]) => {
    const baseRadius = 8;
    const visitBonus = vertex.directlyVisited ? 4 : 0;
    return baseRadius + visitBonus;
  };

  return (
    <div style={{ 
      backgroundColor: 'var(--color-card-background)', 
      border: '1px solid var(--color-border)', 
      borderRadius: '8px', 
      padding: '24px' 
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '8px', 
          fontSize: '18px', 
          fontWeight: 600, 
          marginBottom: '8px' 
        }}>
          <IconNetwork size={20} />
          Academic Network Demo
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Interactive visualization of academic relationships
        </p>
      </div>
      
      <svg 
        style={{
          width: '100%',
          height: '300px',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          backgroundColor: 'var(--color-background)',
          marginBottom: '16px'
        }}
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render edges */}
        {sampleEdges.map(edge => {
          const source = sampleVertices.find(v => v.id === edge.sourceId);
          const target = sampleVertices.find(v => v.id === edge.targetId);
          if (!source || !target) return null;
          
          const isHighlighted = selectedVertex === edge.sourceId || selectedVertex === edge.targetId;
          
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isHighlighted ? 'var(--color-accent)' : 'var(--color-border)'}
              strokeOpacity={isHighlighted ? 1 : 0.6}
              strokeWidth={edge.weight * 2}
              style={{ transition: 'stroke-opacity 0.2s ease' }}
            />
          );
        })}

        {/* Render vertices */}
        {sampleVertices.map(vertex => {
          const radius = getVertexRadius(vertex);
          const isSelected = vertex.id === selectedVertex;
          const isHovered = vertex.id === hoveredVertex;
          
          return (
            <g 
              key={vertex.id}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onClick={() => handleVertexClick(vertex.id)}
              onMouseEnter={() => setHoveredVertex(vertex.id)}
              onMouseLeave={() => setHoveredVertex(null)}
            >
              <circle
                cx={vertex.x}
                cy={vertex.y}
                r={radius}
                fill={getEntityColour(vertex.entityType)}
                stroke={isSelected ? 'var(--color-accent)' : isHovered ? 'var(--color-text)' : 'transparent'}
                strokeWidth={isSelected ? 3 : isHovered ? 2 : 0}
              />
              
              {/* Visit count indicator */}
              {vertex.directlyVisited && vertex.visitCount > 1 && (
                <text
                  x={vertex.x}
                  y={vertex.y + 3}
                  fontSize="10px"
                  fill="white"
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {vertex.visitCount}
                </text>
              )}
              
              {/* Vertex label */}
              <text
                x={vertex.x}
                y={vertex.y + radius + 12}
                fontSize="11px"
                fill="var(--color-text)"
                fontWeight="500"
                textAnchor="middle"
                style={{ pointerEvents: 'none' }}
              >
                {vertex.displayName.length > 15 
                  ? `${vertex.displayName.slice(0, 12)}...` 
                  : vertex.displayName
                }
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '16px', 
        justifyContent: 'center', 
        marginBottom: '16px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getEntityColour(EntityType.WORK) }}></div>
          <span>Papers</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getEntityColour(EntityType.AUTHOR) }}></div>
          <span>Authors</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getEntityColour(EntityType.INSTITUTION) }}></div>
          <span>Institutions</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getEntityColour(EntityType.SOURCE) }}></div>
          <span>Journals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getEntityColour(EntityType.TOPIC) }}></div>
          <span>Topics</span>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px', 
        fontSize: '14px', 
        color: 'var(--color-muted)', 
        fontStyle: 'italic', 
        textAlign: 'center' 
      }}>
        <IconBulb size={16} />
        Click on nodes to highlight connections
      </div>
    </div>
  );
}

function WelcomePane() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '32px', 
      padding: '24px', 
      height: '100%', 
      overflowY: 'auto' 
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '16px' 
        }}>Academic Explorer</h1>
        <p style={{ 
          fontSize: '18px', 
          color: 'var(--color-muted)', 
          lineHeight: 1.6, 
          maxWidth: '600px', 
          margin: '0 auto' 
        }}>
          Discover, analyze, and visualize academic research through powerful tools
          and interactive networks.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px' 
      }}>
        <div className={pageStyles.card}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <IconSearch size={24} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Literature Search</h3>
          </div>
          <p style={{ marginBottom: '16px', color: 'var(--color-muted)' }}>
            Search millions of academic papers with sophisticated filtering capabilities.
          </p>
          <Link to="/query" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--color-accent)', 
            textDecoration: 'none' 
          }}>
            Start Searching <IconArrowRight size={16} />
          </Link>
        </div>

        <div className={pageStyles.card}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <IconNetwork size={24} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Citation Networks</h3>
          </div>
          <p style={{ marginBottom: '16px', color: 'var(--color-muted)' }}>
            Explore citation relationships through interactive visualizations.
          </p>
          <span style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
            Available in entity pages
          </span>
        </div>

        <div className={pageStyles.card}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <IconChartBar size={24} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Research Analytics</h3>
          </div>
          <p style={{ marginBottom: '16px', color: 'var(--color-muted)' }}>
            Analyze trends and patterns in academic literature data.
          </p>
          <Link to="/dashboard" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--color-accent)', 
            textDecoration: 'none' 
          }}>
            View Dashboard <IconArrowRight size={16} />
          </Link>
        </div>

        <div className={pageStyles.card}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <IconHelp size={24} />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Help & Guidance</h3>
          </div>
          <p style={{ marginBottom: '16px', color: 'var(--color-muted)' }}>
            Learn how to use Academic Explorer's features effectively.
          </p>
          <Link to="/help" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--color-accent)', 
            textDecoration: 'none' 
          }}>
            Get Help <IconArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'var(--color-background-secondary, #f8f9fa)', 
        borderRadius: '8px', 
        padding: '24px' 
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px' 
        }}>
          <Link to="/authors/$id" params={{ id: "A1234567890" }} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--color-card-background)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '6px', 
            color: 'var(--color-text)', 
            textDecoration: 'none', 
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}>
            <IconUsers size={16} />
            Explore Sample Author
          </Link>
          <Link to="/works/$id" params={{ id: "W2023456789" }} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--color-card-background)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '6px', 
            color: 'var(--color-text)', 
            textDecoration: 'none', 
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}>
            <IconDatabase size={16} />
            View Sample Paper
          </Link>
          <Link to="/institutions/$id" params={{ id: "I5555555555" }} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--color-card-background)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '6px', 
            color: 'var(--color-text)', 
            textDecoration: 'none', 
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}>
            <IconSchool size={16} />
            Browse Institution
          </Link>
          <Link to="/help" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--color-card-background)', 
            border: '1px solid var(--color-border)', 
            borderRadius: '6px', 
            color: 'var(--color-text)', 
            textDecoration: 'none', 
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}>
            <IconHelp size={16} />
            Get Help
          </Link>
        </div>
      </div>

      <StorageManager />
    </div>
  );
}

function SystemOverviewPane() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px', 
      padding: '24px', 
      height: '100%', 
      overflowY: 'auto' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px', 
          fontSize: '24px', 
          fontWeight: 'bold', 
          marginBottom: '12px' 
        }}>
          <IconMap size={24} />
          System Overview
        </h2>
        <p style={{ 
          fontSize: '16px', 
          color: 'var(--color-muted)', 
          lineHeight: 1.6 
        }}>
          Academic Explorer connects research entities through intelligent graph visualization
        </p>
      </div>

      <DemoGraph />

      <div style={{ 
        backgroundColor: 'var(--color-background-secondary, #f8f9fa)', 
        borderRadius: '8px', 
        padding: '24px' 
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          marginBottom: '16px', 
          textAlign: 'center' 
        }}>Explore Academic Networks</h3>
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px' 
          }}>
            <IconDatabase size={20} />
            <div>
              <strong style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                marginBottom: '4px', 
                display: 'block' 
              }}>Comprehensive Data</strong>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: 'var(--color-muted)', 
                lineHeight: 1.4 
              }}>Access to millions of papers, authors, and institutions via OpenAlex</p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px' 
          }}>
            <IconNetwork size={20} />
            <div>
              <strong style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                marginBottom: '4px', 
                display: 'block' 
              }}>Interactive Graphs</strong>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: 'var(--color-muted)', 
                lineHeight: 1.4 
              }}>Visualize citation networks and research collaborations</p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px' 
          }}>
            <IconChartBar size={20} />
            <div>
              <strong style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                marginBottom: '4px', 
                display: 'block' 
              }}>Smart Analytics</strong>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: 'var(--color-muted)', 
                lineHeight: 1.4 
              }}>Track research trends and discover influential works</p>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px' 
          }}>
            <IconUsers size={20} />
            <div>
              <strong style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                marginBottom: '4px', 
                display: 'block' 
              }}>Author Networks</strong>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: 'var(--color-muted)', 
                lineHeight: 1.4 
              }}>Explore collaboration patterns and research communities</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px' 
        }}>Try These Features</h4>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          <Link to="/query" style={{ 
            display: 'block', 
            padding: '12px 24px', 
            backgroundColor: 'var(--color-accent)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '6px', 
            fontSize: '14px', 
            fontWeight: 500, 
            transition: 'all 0.2s ease' 
          }}>
            Search Academic Literature
          </Link>
          <Link to="/authors/$id" params={{ id: "A1234567890" }} style={{ 
            display: 'block', 
            padding: '12px 24px', 
            backgroundColor: 'var(--color-accent)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '6px', 
            fontSize: '14px', 
            fontWeight: 500, 
            transition: 'all 0.2s ease' 
          }}>
            Explore Author Profiles
          </Link>
          <Link to="/dashboard" style={{ 
            display: 'block', 
            padding: '12px 24px', 
            backgroundColor: 'var(--color-accent)', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '6px', 
            fontSize: '14px', 
            fontWeight: 500, 
            transition: 'all 0.2s ease' 
          }}>
            View Analytics Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  return (
    <TwoPaneLayout
      leftPane={<WelcomePane />}
      rightPane={<SystemOverviewPane />}
      stateKey="homepage-layout"
      defaultSplit={55}
      leftTitle="Welcome to Academic Explorer"
      rightTitle="Interactive Demo"
      showHeaders={false}
      showMobileTabs={true}
      mobileTabLabels={{
        left: "Welcome",
        right: "Demo"
      }}
    />
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});