import { Paper, ScrollArea, Code } from '@mantine/core';
import React from 'react';

interface CodeDisplayProps {
  content: string;
  maxHeight: number;
  wordWrap: boolean;
  fontSize?: string;
}

export function CodeDisplay({
  content,
  maxHeight,
  wordWrap,
  fontSize = '12px',
}: CodeDisplayProps) {
  return (
    <Paper withBorder>
      <ScrollArea h={maxHeight} scrollbarSize={6}>
        <Code 
          block
          p="md"
          style={{ 
            fontSize,
            lineHeight: '1.5',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "SF Mono", "Consolas", monospace',
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            wordBreak: wordWrap ? 'break-word' : 'normal',
            overflowWrap: wordWrap ? 'break-word' : 'normal',
            maxWidth: '100%',
          }}
        >
          {content}
        </Code>
      </ScrollArea>
    </Paper>
  );
}