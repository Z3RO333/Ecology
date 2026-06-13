export const TABLET_ACCESS_COOKIE = 'ecotracker_tablet_access';
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signature(expiresAt: string): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is required for tablet access.');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiresAt));
  return bytesToBase64Url(new Uint8Array(signed));
}

export function isTabletAccessConfigured(): boolean {
  return Boolean(process.env.TABLET_ACCESS_KEY);
}

export function isValidTabletKey(value: string): boolean {
  const expected = process.env.TABLET_ACCESS_KEY;
  return Boolean(expected && value === expected);
}

export async function createTabletAccessToken(): Promise<string> {
  const expiresAt = String(Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS);
  return `${expiresAt}.${await signature(expiresAt)}`;
}

export async function verifyTabletAccessToken(token: string | undefined): Promise<boolean> {
  if (!isTabletAccessConfigured()) return true;
  if (!token) return false;

  const [expiresAt, suppliedSignature] = token.split('.');
  if (!expiresAt || !suppliedSignature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  return suppliedSignature === (await signature(expiresAt));
}

