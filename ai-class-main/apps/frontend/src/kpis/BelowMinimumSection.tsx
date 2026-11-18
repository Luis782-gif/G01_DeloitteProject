/// <reference types="node" />
import { BelowMinimumView } from './BelowMinimumView';
import type { BelowMinimum } from './below-minimum';

const backend = process.env.BACKEND_URL ?? 'http://localhost:3001';

async function fetchBelowMinimum(): Promise<BelowMinimum | null> {
  try {
    const res = await fetch(`${backend}/api/kpis/below-minimum?pageSize=100`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as BelowMinimum) : null;
  } catch {
    return null;
  }
}

export async function BelowMinimumSection() {
  return <BelowMinimumView data={await fetchBelowMinimum()} />;
}
