import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const items = await prisma.actionItem.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(items);
}
