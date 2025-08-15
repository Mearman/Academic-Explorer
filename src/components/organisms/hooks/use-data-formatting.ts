import { useMemo } from 'react';

import { reconstructAbstract } from '@/lib/openalex/utils/transformers';

/**
 * Custom JSON replacer to handle long strings and improve readability
 */
function jsonReplacer(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    // Split very long strings into multiple lines for better readability
    if (value.length > 100) {
      // Break at word boundaries if possible, otherwise at character limit
      const chunks = [];
      let remaining = value;
      
      while (remaining.length > 80) {
        let breakPoint = 80;
        // Try to find a good break point (space, slash, etc.)
        const possibleBreaks = [' ', '/', '&', '?', '=', '.', ',', ';'];
        for (const breakChar of possibleBreaks) {
          const lastBreak = remaining.lastIndexOf(breakChar, 80);
          if (lastBreak > 60) { // Only use if it's not too early
            breakPoint = lastBreak + 1;
            break;
          }
        }
        
        chunks.push(remaining.slice(0, breakPoint));
        remaining = remaining.slice(breakPoint);
      }
      if (remaining) chunks.push(remaining);
      
      return chunks.join('\\n    '); // Add indentation for continuation lines
    }
  }
  return value;
}

export interface UseDataFormattingReturn {
  formattedJson: string;
  compactJson: string;
  reconstructedAbstract: string | null;
  hasAbstractIndex: boolean;
  dataSize: number;
  dataSizeKB: string;
  objectKeys: number;
  uniqueTerms: number;
}

export function useDataFormatting(data: unknown, prettyPrint: boolean): UseDataFormattingReturn {
  return useMemo(() => {
    // Format JSON with different options
    const formatJson = (useReplacer: boolean, spaces: number) => {
      if (useReplacer) {
        return JSON.stringify(data, jsonReplacer, spaces);
      }
      return JSON.stringify(data, null, spaces);
    };
    
    const formattedJson = formatJson(prettyPrint, 2);
    const compactJson = JSON.stringify(data);
    
    // Check if data has an abstract inverted index (for OpenAlex Works)
    const hasAbstractIndex: boolean = Boolean(
      data && 
      typeof data === 'object' && 
      'abstract_inverted_index' in data && 
      data.abstract_inverted_index &&
      typeof data.abstract_inverted_index === 'object' &&
      Object.keys(data.abstract_inverted_index).length > 0
    );
    
    const reconstructedAbstract = hasAbstractIndex && 
      data && 
      typeof data === 'object' && 
      'abstract_inverted_index' in data &&
      data.abstract_inverted_index &&
      typeof data.abstract_inverted_index === 'object'
      ? reconstructAbstract(data.abstract_inverted_index as Record<string, number[]>)
      : null;
    
    // Get data size and basic stats
    const dataSize = new Blob([formattedJson]).size;
    const dataSizeKB = (dataSize / 1024).toFixed(1);
    const objectKeys = data && typeof data === 'object' ? Object.keys(data as object).length : 0;
    
    const uniqueTerms = data && 
      typeof data === 'object' && 
      'abstract_inverted_index' in data &&
      data.abstract_inverted_index &&
      typeof data.abstract_inverted_index === 'object'
      ? Object.keys(data.abstract_inverted_index).length
      : 0;

    return {
      formattedJson,
      compactJson,
      reconstructedAbstract,
      hasAbstractIndex,
      dataSize,
      dataSizeKB,
      objectKeys,
      uniqueTerms,
    };
  }, [data, prettyPrint]);
}