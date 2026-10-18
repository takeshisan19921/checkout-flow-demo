import type { CartLine } from './types';

export const DEMO_TODAY = '2026-10-18';

export const sampleCart: readonly CartLine[] = [
  { sku: 'LAMP-OAK', name: 'Oak desk lamp', variant: 'Natural oak', quantity: 1, unitPriceCents: 4995 },
  { sku: 'MUG-CER-2', name: 'Ceramic mug set', variant: 'Sand, set of 2', quantity: 2, unitPriceCents: 2450 },
  { sku: 'THROW-WOOL', name: 'Wool throw blanket', variant: 'Moss green', quantity: 1, unitPriceCents: 6900 },
];
