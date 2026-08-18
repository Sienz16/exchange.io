import { readEnv } from './env'

export const ADMIN_COOKIE = 'admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
const revokedSessions = new Set<string>()

export function adminToken(): string | null {
  const token = readEnv('ADMIN_TOKEN')
  if (!token) return null
  if (token.length < 32) {
    console.error('ADMIN_TOKEN must be at least 32 characters; admin dashboard disabled')
    return null
  }
  return token
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return diff === 0
}

async function hmac(value: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function cookieAttributes(maxAgeSeconds: number): string {
  const secure = readEnv('NODE_ENV') !== 'development' ? '; Secure' : ''
  return `; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secure}`
}

/** Session = expiry timestamp + HMAC(expiry, ADMIN_TOKEN): stateless, no storage to purge. */
export async function createSessionCookie(token: string, now = Date.now()): Promise<string> {
  const expiry = now + SESSION_TTL_MS
  const signature = await hmac(String(expiry), token)
  const value = `${expiry}.${signature}`
  revokedSessions.delete(value)
  return `${ADMIN_COOKIE}=${value}${cookieAttributes(SESSION_TTL_MS / 1000)}`
}

export function revokeSessionCookie(cookieHeader: string | null | undefined): void {
  const value = (cookieHeader ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1)
  if (value) revokedSessions.add(value)
  if (revokedSessions.size > 10_000) revokedSessions.delete(revokedSessions.values().next().value as string)
}

export async function verifySessionCookie(cookieHeader: string | null | undefined, token: string, now = Date.now()): Promise<boolean> {
  const match = (cookieHeader ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
  if (!match) return false
  const value = match.slice(ADMIN_COOKIE.length + 1)
  const dot = value.lastIndexOf('.')
  if (dot === -1) return false
  const expiry = value.slice(0, dot)
  const signature = value.slice(dot + 1)
  if (revokedSessions.has(value)) return false
  if (!/^\d+$/.test(expiry) || Number(expiry) < now) return false
  return constantTimeEqual(await hmac(expiry, token), signature)
}

export function clearSessionCookie(): string {
  const secure = readEnv('NODE_ENV') !== 'development' ? '; Secure' : ''
  return `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
}
