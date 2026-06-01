import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  image: string | null
  role: string
}

interface AuthStore {
  user: AuthUser | null
  loading: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  fetchSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
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

  signIn: async (email, password) => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid email or password' }
      }

      set({ user: data.user })
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Something went wrong. Please try again.' }
    }
  },

  signUp: async (name, email, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      // Auto sign in after registration
      const signInResult = await get().signIn(email, password)
      return signInResult
    } catch (error) {
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
