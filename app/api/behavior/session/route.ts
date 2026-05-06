import { NextResponse } from 'next/server';
import { logBehavior } from '@/lib/behavior-tracker';

export async function POST() {
  await logBehavior('session_start');
  return NextResponse.json({ ok: true });
}
