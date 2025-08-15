import { useState, useCallback } from 'react';

export interface UseRawDataActionsReturn {
  copied: boolean;
  handleCopy: (text: string) => Promise<void>;
  handleDownload: (text: string, format?: 'json' | 'compact' | 'abstract', entityType?: string, entityId?: string) => void;
}

export function useRawDataActions(): UseRawDataActionsReturn {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, []);

  const handleDownload = useCallback((
    text: string, 
    format: 'json' | 'compact' | 'abstract' = 'json',
    entityType?: string,
    entityId?: string
  ) => {
    let filename: string;
    let mimeType: string;
    
    if (format === 'abstract') {
      filename = `${entityType || 'entity'}-${entityId || 'data'}-abstract.txt`;
      mimeType = 'text/plain';
    } else {
      filename = `${entityType || 'entity'}-${entityId || 'data'}-${format}.json`;
      mimeType = 'application/json';
    }
    
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    copied,
    handleCopy,
    handleDownload,
  };
}