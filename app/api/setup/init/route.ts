import { NextResponse } from 'next/server';
import { getOrCreateEncryptionKey, generateRecoveryKey } from '@/lib/db-crypto';

export async function POST() {
  if (process.env.YADORIGI_NO_ENCRYPTION === '1') {
    return NextResponse.json({ recoveryKey: null, encrypted: false });
  }

  await getOrCreateEncryptionKey();
  const recoveryKey = generateRecoveryKey();

  return NextResponse.json({ recoveryKey, encrypted: true });
}
