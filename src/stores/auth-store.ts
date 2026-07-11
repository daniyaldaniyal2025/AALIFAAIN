import { create } from 'zustand'
import { trackEvent } from '@/lib/analytics'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone?: string | null
  image: string | null
  role: string
  adminRole?: string
  permissions?: string
  createdAt?: string
}

export type SignInMethod = 'email' | 'phone'

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  fetchSession: () => Promise<void>
  signIn: (identifier: string, password: string, method?: SignInMethod) => Promise<{ success: boolean; error?: string }>
  signUp: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  fetchSession: async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      set({ user: data.user || null, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  signIn: async (identifier, password, method = 'email') => {
    try {
      const body = method === 'phone'
        ? { phone: identifier, password }
        : { email: identifier, password }

      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || (method === 'phone' ? 'Invalid mobile number or password' : 'Invalid email or password'),
        }
      }

      set({ user: data.user })
      trackEvent('sign_in', 'signin', { userId: data.user?.id })
      return { success: true }
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' }
    }
  },

  signUp: async (name, email, password, phone) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone: phone || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      // Auto sign in after registration
      trackEvent('sign_up', 'signup')
      const signInResult = await get().signIn(email, password, 'email')
      return signInResult
    } catch {
      return { success: false, error: 'Something went wrong. Please try again.' }
    }
  },

  signOut: async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    set({ user: null })
  },
}))
