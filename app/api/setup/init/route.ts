import { NextResponse } from 'next/server';
import { getOrCreateEncryptionKey, generateRecoveryKey } from '@/lib/db-crypto';

export async function POST() {
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
  };

  if (process.env.YADORIGI_NO_ENCRYPTION === '1') {
    const res = NextResponse.json({ recoveryKey: null, encrypted: false });
    res.cookies.set('yadorigi_setup_completed', '1', cookieOpts);
    return res;
  }

  await getOrCreateEncryptionKey();
  const recoveryKey = generateRecoveryKey();

  const res = NextResponse.json({ recoveryKey, encrypted: true });
  res.cookies.set('yadorigi_setup_completed', '1', cookieOpts);
  return res;
}
