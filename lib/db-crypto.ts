import keytar from 'keytar';
import crypto from 'crypto';

const SERVICE_NAME = 'Yadorigi';
const ACCOUNT_NAME = 'db-encryption-key';

export async function getOrCreateEncryptionKey(): Promise<string> {
  if (process.env.YADORIGI_NO_ENCRYPTION === '1') {
    return '';
  }

  let key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);

  if (!key) {
    key = crypto.randomBytes(32).toString('hex');
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
  }

  return key;
}

export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(crypto.randomBytes(32))
    .map(b => chars[b % chars.length])
    .join('')
    .match(/.{1,8}/g)!
    .join('-');
}

export async function hasEncryptionKey(): Promise<boolean> {
  if (process.env.YADORIGI_NO_ENCRYPTION === '1') return false;
  const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  return key !== null;
}
