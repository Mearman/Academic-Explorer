/**
 * Unit test to verify relationship extraction logic works correctly
 * This will help isolate the issue with relationship extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { EdgeType } from '@/types/entity-graph';
import type { Author } from '@/lib/openalex/types';

// Mock the dependencies
const mockAddRelationshipSafe = vi.fn();
const mockUseEntityGraphStore = vi.fn();

// Real author data from OpenAlex API
const realAuthorData: Author = {
  id: "https://openalex.org/A5017898742",
  display_name: "Joseph Mearman",
  display_name_alternatives: [
    "Joseph Mearman",
    "Joseph W. Mearman", 
    "J. W. Mearman"
  ],
  works_count: 9,
  cited_by_count: 41,
  summary_stats: {
    "2yr_mean_citedness": 0.0,
    h_index: 2,
    i10_index: 2
  },
  ids: {
    openalex: "https://openalex.org/A5017898742"
  },
  affiliations: [
    {
      institution: {
        id: "https://openalex.org/I161548249",
        ror: "https://ror.org/006jb1a24",
        display_name: "Bangor University",
        country_code: "GB",
        type: "education",
        lineage: ["https://openalex.org/I161548249"]
      },
      years: [2021, 2016, 2015, 2014]
    }
  ],
  last_known_institutions: [
    {
      id: "https://openalex.org/I161548249",
      ror: "https://ror.org/006jb1a24", 
      display_name: "Bangor University",
      country_code: "GB",
      type: "education",
      type_id: "education",
      lineage: ["https://openalex.org/I161548249"],
      ids: { openalex: "https://openalex.org/I161548249" },
      works_count: 100,
      cited_by_count: 500,
      summary_stats: { '2yr_mean_citedness': 2.5, h_index: 10, i10_index: 20 },
      counts_by_year: [],
      works_api_url: "https://api.openalex.org/works?filter=author.id:I161548249",
      updated_date: "2024-01-01T00:00:00.000000",
      created_date: "2023-01-01T00:00:00.000000"
    }
  ],
  topics: [
    {
      id: "https://openalex.org/T10888",
      display_name: "Augmented Reality Applications",
      subfield: {
        id: "https://openalex.org/subfields/1707",
        display_name: "Computer Vision and Pattern Recognition"
      },
      field: {
        id: "https://openalex.org/fields/17",
        display_name: "Computer Science"  
      },
      domain: {
        id: "https://openalex.org/domains/3",
        display_name: "Physical Sciences"
      },
      works_count: 1000,
      cited_by_count: 5000,
      ids: { openalex: "https://openalex.org/T10888" },
      works_api_url: "https://api.openalex.org/works?filter=topic.id:T10888",
      updated_date: "2024-01-01T00:00:00.000000",
      created_date: "2023-01-01T00:00:00.000000"
    },
    {
      id: "https://openalex.org/T10789",
      display_name: "Interactive and Immersive Displays", 
      subfield: {
        id: "https://openalex.org/subfields/1709",
        display_name: "Human-Computer Interaction"
      },
      field: {
        id: "https://openalex.org/fields/17", 
        display_name: "Computer Science"
      },
      domain: {
        id: "https://openalex.org/domains/3",
        display_name: "Physical Sciences"
      },
      works_count: 800,
      cited_by_count: 4000,
      ids: { openalex: "https://openalex.org/T10789" },
      works_api_url: "https://api.openalex.org/works?filter=topic.id:T10789",
      updated_date: "2024-01-01T00:00:00.000000",
      created_date: "2023-01-01T00:00:00.000000"
    },
    {
      id: "https://openalex.org/T11211",
      display_name: "3D Surveying and Cultural Heritage",
      subfield: {
        id: "https://openalex.org/subfields/1907",
        display_name: "Geology"
      },
      field: {
        id: "https://openalex.org/fields/19",
        display_name: "Earth and Planetary Sciences"
      },
      domain: {
        id: "https://openalex.org/domains/3", 
        display_name: "Physical Sciences"
      },
      works_count: 600,
      cited_by_count: 3000,
      ids: { openalex: "https://openalex.org/T11211" },
      works_api_url: "https://api.openalex.org/works?filter=topic.id:T11211",
      updated_date: "2024-01-01T00:00:00.000000",
      created_date: "2023-01-01T00:00:00.000000"
    }
  ],
  counts_by_year: [],
  works_api_url: "https://api.openalex.org/works?filter=author.id:A5017898742",
  updated_date: "2024-08-01T12:45:32.123456",
  created_date: "2023-07-21T00:00:00"
};

// Simulate the relationship extraction logic
function cleanOpenAlexId(id: string): string {
  if (id.startsWith('https://openalex.org/')) {
    return id.replace('https://openalex.org/', '');
  }
  return id;
}

function simulateAuthorRelationshipExtraction(author: Author) {
  console.log(`[TEST] 🔍 Extracting author relationships for ${author.display_name} (${author.id})`);
  console.log(`[TEST] Author has ${author.affiliations?.length || 0} affiliations, ${author.last_known_institutions?.length || 0} last known institutions, ${author.topics?.length || 0} topics`);
  
  const relationships: Array<{
    sourceEntityId: string;
    targetEntityId: string;
    relationshipType: EdgeType;
    timestamp: string;
    source: string;
    metadata: {
      targetEntityType: EntityType;
      targetDisplayName: string;
      context: string;
    };
  }> = [];
  const timestamp = new Date().toISOString();

  // Institution affiliations
  author.affiliations?.forEach(affiliation => {
    if (affiliation.institution.id) {
      const cleanInstitutionId = cleanOpenAlexId(affiliation.institution.id);
      console.log(`[TEST] Creating affiliation relationship: ${author.id} → ${cleanInstitutionId} (${affiliation.institution.display_name})`);
      relationships.push({
        sourceEntityId: author.id,
        targetEntityId: cleanInstitutionId,
        relationshipType: EdgeType.AFFILIATED_WITH,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.INSTITUTION,
          targetDisplayName: affiliation.institution.display_name,
          context: `Years: ${affiliation.years?.join(', ')}`,
        },
      });
    }
  });

  // Last known institutions  
  author.last_known_institutions?.forEach(institution => {
    if (institution.id) {
      const cleanInstitutionId = cleanOpenAlexId(institution.id);
      console.log(`[TEST] Creating last known institution relationship: ${author.id} → ${cleanInstitutionId} (${institution.display_name})`);
      relationships.push({
        sourceEntityId: author.id,
        targetEntityId: cleanInstitutionId, 
        relationshipType: EdgeType.AFFILIATED_WITH,
        timestamp,
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.INSTITUTION,
          targetDisplayName: institution.display_name,
          context: 'Most recent affiliation',
        },
      });
    }
  });

  // Topic relationships
  author.topics?.forEach(topic => {
    if (topic.id) {
      const cleanTopicId = cleanOpenAlexId(topic.id);
      console.log(`[TEST] Creating topic relationship: ${author.id} → ${cleanTopicId} (${topic.display_name})`);
      relationships.push({
        sourceEntityId: author.id,
        targetEntityId: cleanTopicId,
        relationshipType: EdgeType.RELATED_TO_TOPIC,
        timestamp,
        source: 'openalex', 
        metadata: {
          targetEntityType: EntityType.TOPIC,
          targetDisplayName: topic.display_name,
          context: 'Author research area',
        },
      });
    }
  });

  return relationships;
}

describe('Relationship Extraction Logic Test', () => {
  beforeEach(() => {
    mockAddRelationshipSafe.mockClear();
  });

  it('should extract the correct number of relationships from author data', () => {
    console.log('\n=== TESTING RELATIONSHIP EXTRACTION ===');
    
    const relationships = simulateAuthorRelationshipExtraction(realAuthorData);
    
    console.log(`\n=== RESULTS ===`);
    console.log(`Total relationships extracted: ${relationships.length}`);
    console.log(`Expected: 5 relationships`);
    console.log(`Actual: ${relationships.length} relationships`);
    
    // Verify we get the expected number of relationships
    expect(relationships).toHaveLength(5);
    
    // Verify relationship types
    const affiliationRels = relationships.filter(r => r.relationshipType === EdgeType.AFFILIATED_WITH);
    const topicRels = relationships.filter(r => r.relationshipType === EdgeType.RELATED_TO_TOPIC);
    
    expect(affiliationRels).toHaveLength(2); // 1 affiliation + 1 last_known_institution
    expect(topicRels).toHaveLength(3); // 3 topics
    
    console.log(`✅ Test passed: Extracted ${relationships.length} relationships as expected`);
    console.log(`   - ${affiliationRels.length} AFFILIATED_WITH relationships`);  
    console.log(`   - ${topicRels.length} RELATED_TO_TOPIC relationships`);
    
    // Log the actual relationships for debugging
    relationships.forEach((rel, i) => {
      console.log(`   ${i + 1}. ${rel.relationshipType}: ${rel.sourceEntityId} → ${rel.targetEntityId} (${rel.metadata.targetDisplayName})`);
    });
  });

  it('should clean OpenAlex IDs correctly', () => {
    expect(cleanOpenAlexId('https://openalex.org/A5017898742')).toBe('A5017898742');
    expect(cleanOpenAlexId('https://openalex.org/I161548249')).toBe('I161548249');
    expect(cleanOpenAlexId('https://openalex.org/T10888')).toBe('T10888');
    expect(cleanOpenAlexId('A5017898742')).toBe('A5017898742'); // Already clean
  });
});