import keytar from 'keytar';
import crypto from 'crypto';

const SERVICE_NAME = 'Yadorigi';
const ACCOUNT_NAME = 'db-encryption-key';
const X_ACCESS_ACCOUNT = 'x-oauth-access-token';
const X_REFRESH_ACCOUNT = 'x-oauth-refresh-token';

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

// M-6: rejection sampling でモジュロバイアスを除去
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const limit = 256 - (256 % chars.length);
  const result: string[] = [];
  while (result.length < 32) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < limit) result.push(chars[byte % chars.length]);
  }
  return result.join('').match(/.{1,8}/g)!.join('-');
}

export async function hasEncryptionKey(): Promise<boolean> {
  if (process.env.YADORIGI_NO_ENCRYPTION === '1') return false;
  const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  return key !== null;
}

// C-1: X OAuthトークンをOS keychainに保存
export async function storeXTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, X_ACCESS_ACCOUNT, accessToken);
  if (refreshToken) {
    await keytar.setPassword(SERVICE_NAME, X_REFRESH_ACCOUNT, refreshToken);
  }
}

export async function getXAccessToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, X_ACCESS_ACCOUNT);
}

export async function getXRefreshToken(): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, X_REFRESH_ACCOUNT);
}

export async function clearXTokens(): Promise<void> {
  await keytar.deletePassword(SERVICE_NAME, X_ACCESS_ACCOUNT);
  await keytar.deletePassword(SERVICE_NAME, X_REFRESH_ACCOUNT);
}
