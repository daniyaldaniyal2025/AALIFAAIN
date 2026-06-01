const SECRET = process.env.NEXTAUTH_SECRET || 'alifaain-secret-key'

export interface SessionUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

const SESSION_COOKIE = 'alifaain-session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

// Simple reversible encoding - no Node.js crypto required
function encode(data: string): string {
  const key = SECRET
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return Buffer.from(result).toString('base64')
}

function decode(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString()
    const key = SECRET
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    return null
  }
}

export function createSessionToken(user: SessionUser): string {
  const data = JSON.stringify({
    ...user,
    exp: Date.now() + SESSION_DURATION,
  })
  return encode(data)
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const data = decode(token)
    if (!data) return null
    const parsed = JSON.parse(data)
    if (parsed.exp && Date.now() > parsed.exp) return null
    return {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      image: parsed.image || null,
      role: parsed.role,
    }
  } catch {
    return null
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

export function setSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}
