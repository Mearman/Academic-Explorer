import type { SizeVariant } from '../../types';

export const SEVERITY_ICONS = { error: 'error', warning: 'warning', info: 'info', success: 'success' } as const;
export const SIZE_MAP = { xs: 'sm', xl: 'lg', sm: 'sm', md: 'md', lg: 'lg' } as const;

export function mapSizeToVariant(size: SizeVariant): 'sm' | 'md' | 'lg' {
  return SIZE_MAP[size] || 'md';
}

export function getAriaAttributes(severity: string) {
  return {
    role: severity === 'error' ? 'alert' as const : 'status' as const,
    ariaLive: severity === 'error' ? 'assertive' as const : 'polite' as const,
  };
}