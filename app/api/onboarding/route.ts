import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: 'onboarding_completed' } });
  return NextResponse.json({ completed: setting?.value === 'true' });
}

export async function POST() {
  await prisma.setting.upsert({
    where: { key: 'onboarding_completed' },
    update: { value: 'true' },
    create: { key: 'onboarding_completed', value: 'true' },
  });
  return NextResponse.json({ ok: true });
}
