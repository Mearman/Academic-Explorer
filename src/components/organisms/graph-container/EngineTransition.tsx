import { Box, Text, Progress, Group } from '@mantine/core';
import { IconArrowRight, IconEngine } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';

interface EngineTransitionProps {
  from: string | null;
  to: string;
  isActive: boolean;
}

export function EngineTransition({ from, to, isActive }: EngineTransitionProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'preparing' | 'switching' | 'finalizing'>('preparing');

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setStage('preparing');
      return;
    }

    const stages = [
      { name: 'preparing', duration: 150, targetProgress: 30 },
      { name: 'switching', duration: 200, targetProgress: 80 },
      { name: 'finalizing', duration: 150, targetProgress: 100 }
    ] as const;

    let currentStageIndex = 0;
    let stageStartTime = Date.now();
    
    const updateProgress = () => {
      const currentStage = stages[currentStageIndex];
      const elapsed = Date.now() - stageStartTime;
      const stageProgress = Math.min(elapsed / currentStage.duration, 1);
      
      // Calculate total progress
      const previousProgress = currentStageIndex > 0 ? stages[currentStageIndex - 1].targetProgress : 0;
      const progressRange = currentStage.targetProgress - previousProgress;
      const newProgress = previousProgress + (progressRange * stageProgress);
      
      setProgress(newProgress);
      setStage(currentStage.name);
      
      if (stageProgress >= 1 && currentStageIndex < stages.length - 1) {
        currentStageIndex++;
        stageStartTime = Date.now();
      }
    };

    const interval = setInterval(updateProgress, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  // Get human-readable engine names
  const getEngineName = (engineId: string) => {
    const engineNames: Record<string, string> = {
      'custom-svg': 'Custom SVG',
      'cytoscape': 'Cytoscape.js',
      'd3-force': 'D3 Force Layout',
      'vis-network': 'Vis.js Network'
    };
    return engineNames[engineId] || engineId;
  };

  const getStageMessage = (stage: string) => {
    switch (stage) {
      case 'preparing': return 'Preparing new engine...';
      case 'switching': return 'Switching graph engine...';
      case 'finalizing': return 'Finalizing transition...';
      default: return 'Transitioning...';
    }
  };

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-in'
      }}
    >
      <Box
        style={{
          textAlign: 'center',
          maxWidth: '400px',
          padding: '32px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          border: '1px solid var(--mantine-color-gray-2)'
        }}
      >
        {/* Engine transition visual */}
        <Group gap="md" justify="center" mb="xl">
          {from && (
            <>
              <Box
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--mantine-color-gray-1)',
                  borderRadius: '8px',
                  border: '2px solid var(--mantine-color-gray-3)',
                  opacity: 0.6,
                  transition: 'opacity 0.3s ease-out'
                }}
              >
                <Group gap="xs" justify="center">
                  <IconEngine size={20} />
                  <Text size="sm" fw={500}>{getEngineName(from)}</Text>
                </Group>
              </Box>

              <IconArrowRight 
                size={24} 
                style={{ 
                  color: 'var(--mantine-color-blue-6)',
                  animation: stage === 'switching' ? 'pulse 1s infinite' : undefined
                }} 
              />
            </>
          )}

          <Box
            style={{
              padding: '16px',
              backgroundColor: 'var(--mantine-color-blue-0)',
              borderRadius: '8px',
              border: '2px solid var(--mantine-color-blue-4)',
              transform: stage === 'finalizing' ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease-out'
            }}
          >
            <Group gap="xs" justify="center">
              <IconEngine size={20} color="var(--mantine-color-blue-6)" />
              <Text size="sm" fw={600} c="blue.7">{getEngineName(to)}</Text>
            </Group>
          </Box>
        </Group>

        {/* Progress indicator */}
        <Box mb="md">
          <Text size="sm" mb="xs" ta="center" c="gray.7">
            {getStageMessage(stage)}
          </Text>
          <Progress 
            value={progress} 
            size="sm" 
            radius="xl"
            color="blue"
            striped
            animated
            style={{
              backgroundColor: 'var(--mantine-color-gray-1)'
            }}
          />
        </Box>

        {/* Additional info */}
        <Text size="xs" c="gray.6" ta="center">
          {Math.round(progress)}% complete
        </Text>
      </Box>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}
