'use client';

import {
  IconFileText,
  IconUser,
  IconBooks,
  IconBuilding,
  IconBuildingStore,
  IconCash,
  IconTag,
  IconBulb,
  IconBookmark,
  IconWorld,
  IconMap,
  IconSearch,
  IconFilter,
  IconArrowsSort,
  IconDownload,
  IconUpload,
  IconEdit,
  IconTrash,
  IconDeviceFloppy,
  IconCopy,
  IconShare,
  IconPrinter,
  IconRefresh,
  IconSettings,
  IconHelp,
  IconInfoCircle,
  IconAlertTriangle,
  IconX,
  IconCheck,
  IconLoader,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconHome,
  IconMenu2,
  IconXboxX,
  IconBook,
  IconFileTypePdf,
  IconMicroscope,
  IconLink,
  IconExternalLink,
  IconMail,
  IconChartBar,
  IconNote,
  IconTrendingUp,
  IconBolt,
  IconTrendingDown,
  IconMinus,
  IconLockOpen,
  IconLock,
  IconTrophy,
  IconLeaf,
  IconRepeat,
  IconMedal,
  IconClock,
  IconChartLine
} from '@tabler/icons-react';
import { forwardRef } from 'react';

import type { IconProps, EntityType } from '../types';

import * as styles from './icon.css';

// Icon component mapping for different entities and actions
const iconMap = {
  // Entity types
  work: IconFileText,
  author: IconUser,
  source: IconBooks,
  institution: IconBuilding,
  publisher: IconBuildingStore,
  funder: IconCash,
  topic: IconTag,
  concept: IconBulb,
  keyword: IconBookmark,
  continent: IconWorld,
  region: IconMap,
  
  // Actions and states
  search: IconSearch,
  filter: IconFilter,
  sort: IconArrowsSort,
  download: IconDownload,
  upload: IconUpload,
  edit: IconEdit,
  delete: IconTrash,
  save: IconDeviceFloppy,
  copy: IconCopy,
  share: IconShare,
  print: IconPrinter,
  refresh: IconRefresh,
  settings: IconSettings,
  help: IconHelp,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  error: IconX,
  success: IconCheck,
  loading: IconLoader,
  
  // Navigation
  back: IconArrowLeft,
  forward: IconArrowRight,
  up: IconArrowUp,
  down: IconArrowDown,
  home: IconHome,
  menu: IconMenu2,
  close: IconXboxX,
  expand: IconBook,
  collapse: IconBook,
  
  // External links
  doi: IconFileTypePdf,
  orcid: IconMicroscope,
  ror: IconBuilding,
  wikidata: IconLink,
  wikipedia: IconBook,
  website: IconExternalLink,
  email: IconMail,
  
  // Metrics
  citation: IconChartBar,
  publication: IconNote,
  hindex: IconTrendingUp,
  impact: IconBolt,
  trend_up: IconTrendingUp,
  trend_down: IconTrendingDown,
  trend_neutral: IconMinus,
  
  // Open access
  open_access: IconLockOpen,
  closed_access: IconLock,
  gold: IconTrophy,
  green: IconLeaf,
  hybrid: IconRepeat,
  bronze: IconMedal,
  
  // Comparison insights
  trophy: IconTrophy,
  'alert-triangle': IconAlertTriangle,
  'trending-up': IconTrendingUp,
  'chart-line': IconChartLine,
  clock: IconClock,
  'info-circle': IconInfoCircle,
};

/**
 * Get colour CSS class for icon
 */
function getColorClass(colorProp?: string): string {
  if (!colorProp) return '';
  
  // Check if it's an entity type
  if (colorProp in styles.entityIconVariants) {
    return styles.entityIconVariants[colorProp as EntityType];
  }
  
  // Check if it's an action colour
  if (colorProp in styles.actionIconVariants) {
    return styles.actionIconVariants[colorProp as keyof typeof styles.actionIconVariants];
  }
  
  return '';
}

/**
 * Build CSS classes for icon
 */
function buildIconClasses(size: string, color?: string, className?: string): string {
  return [
    styles.base,
    styles.sizeVariants[size as keyof typeof styles.sizeVariants],
    getColorClass(color),
    className,
  ].filter(Boolean).join(' ');
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ 
    name, 
    size = 'md', 
    color,
    className,
    'aria-label': ariaLabel,
    'data-testid': testId,
    ...props 
  }, ref) => {
    const IconComponent = iconMap[name as keyof typeof iconMap] || IconHelp;
    const cssClasses = buildIconClasses(size, color, className);
    const customStyle = color && !getColorClass(color) ? { color } : undefined;

    // Convert size to numeric value for Tabler icons
    const getIconSize = (size: string): number => {
      switch (size) {
        case 'xs': return 12;
        case 'sm': return 16;
        case 'md': return 20;
        case 'lg': return 24;
        case 'xl': return 32;
        default: return 20;
      }
    };

    return (
      <span
        ref={ref}
        className={cssClasses}
        style={customStyle}
        data-testid={testId}
        aria-label={ariaLabel || `${name} icon`}
        role="img"
        {...props}
      >
        <IconComponent size={getIconSize(size)} />
      </span>
    );
  }
);

Icon.displayName = 'Icon';