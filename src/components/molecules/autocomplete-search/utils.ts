import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';
import { parseEntityIdentifier } from '@/lib/openalex/utils/entity-detection';

// Generate suggestion link URL
export function getSuggestionUrl(suggestion: AutocompleteSuggestion): string {
  const entityId = parseEntityIdentifier(suggestion.id).numericId;
  const entityType = suggestion.entity_type;
  
  // Map entity types to routes
  const routeMap: Record<string, string> = {
    'work': `/works/${entityId}`,
    'author': `/authors/${entityId}`,
    'source': `/sources/${entityId}`,
    'institution': `/institutions/${entityId}`,
    'publisher': `/publishers/${entityId}`,
    'funder': `/funders/${entityId}`,
    'topic': `/topics/${entityId}`,
    'concept': `/concepts/${entityId}`,
  };

  return routeMap[entityType] || `/${entityId}`;
}

// Handle clicks outside to close autocomplete
export function createClickOutsideHandler(
  inputRef: React.RefObject<HTMLInputElement>,
  listRef: React.RefObject<HTMLUListElement>,
  setIsOpen: (open: boolean) => void,
  setSelectedIndex: (index: number) => void
) {
  return (event: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
        listRef.current && !listRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };
}