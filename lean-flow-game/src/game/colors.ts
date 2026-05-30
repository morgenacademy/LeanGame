import type { Color } from './types';

export const COLOR_HEX: Record<Color, string> = {
  red: '#e4564b',
  blue: '#3a86e0',
  yellow: '#f4c430',
  green: '#3fb45f',
};

export const COLOR_LABEL: Record<Color, string> = {
  red: 'Rood',
  blue: 'Blauw',
  yellow: 'Geel',
  green: 'Groen',
};

export function euro(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}$${Math.abs(Math.round(n))}`;
}

export function secs(ms: number | null): string {
  if (ms == null) return 'n.v.t.';
  return `${(ms / 1000).toFixed(1)}s`;
}
