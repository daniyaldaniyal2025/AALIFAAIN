// Pure JS password hashing - no Node.js crypto module required
// Uses a simple but effective hash-based approach

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

function multiHash(str: string, iterations: number = 1000): string {
  let result = str
  for (let i = 0; i < iterations; i++) {
    result = simpleHash(result + str + i)
  }
  return result
}

// Generate a random string for salt
function generateSalt(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  // Use a combination of Date and Math.random for entropy
  const seed = Date.now().toString(36) + Math.random().toString(36).substring(2)
  for (let i = 0; i < length; i++) {
    const idx = (seed.charCodeAt(i % seed.length) + i * 7) % chars.length
    result += chars[idx]
  }
  return result
}

export function hashPassword(password: string): string {
  const salt = generateSalt()
  const hash = multiHash(salt + password + salt, 2000)
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const verifyHash = multiHash(salt + password + salt, 2000)
  return hash === verifyHash
}
