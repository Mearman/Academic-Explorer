import { entityVars } from './design-tokens.css';

// Entity type colour mapping utility
export const getEntityColour = (entityType: string): string => {
  const typeMap: Record<string, string> = {
    work: entityVars.color.work,
    author: entityVars.color.author,
    source: entityVars.color.source,
    institution: entityVars.color.institution,
    publisher: entityVars.color.publisher,
    funder: entityVars.color.funder,
    topic: entityVars.color.topic,
    concept: entityVars.color.concept,
    keyword: entityVars.color.keyword,
    continent: entityVars.color.continent,
    region: entityVars.color.region,
  };
  
  return typeMap[entityType.toLowerCase()] || entityVars.color.accent;
};

// Open access status colour mapping
export const getOpenAccessColour = (status: string): string => {
  const statusMap: Record<string, string> = {
    gold: entityVars.color.gold,
    green: entityVars.color.openAccess,
    hybrid: entityVars.color.hybrid,
    bronze: entityVars.color.bronze,
    closed: entityVars.color.closed,
  };
  
  return statusMap[status.toLowerCase()] || entityVars.color.closed;
};