import type { AutocompleteSuggestion } from '@/hooks/use-autocomplete-search';

// Generate suggestion link URL
export function getSuggestionUrl(suggestion: AutocompleteSuggestion): string {
  // Extract the OpenAlex ID from URL or use direct ID
  let entityId = suggestion.id;
  
  // If suggestion.id is a URL, extract just the ID part
  if (entityId.includes('openalex.org/')) {
    const match = entityId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
    if (match && match[1]) {
      entityId = match[1];
    }
  }
  
  // Ensure the entityId is properly formatted (uppercase prefix)
  if (entityId.match(/^[wasipftckrn]\d{7,10}$/i)) {
    entityId = entityId.toUpperCase();
  }
  
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
  inputRef: React.RefObject<HTMLInputElement | null>,
  listRef: React.RefObject<HTMLUListElement | null>,
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