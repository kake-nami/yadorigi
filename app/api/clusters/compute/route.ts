import { NextResponse } from 'next/server';
import { runClustering } from '@/lib/implicit-clusterer';

export async function POST() {
  const result = await runClustering();
  return NextResponse.json(result);
}
