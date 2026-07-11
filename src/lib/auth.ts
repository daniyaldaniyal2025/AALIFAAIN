import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyPassword } from '@/lib/password'
import { db } from '@/lib/db'
import { isValidPhone, normalizePhone } from '@/lib/phone'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password || (!credentials.email && !credentials.phone)) {
          return null
        }

        try {
          const user = credentials.phone
            ? await db.user.findUnique({ where: { phone: normalizePhone(credentials.phone) } })
            : await db.user.findUnique({ where: { email: credentials.email.trim().toLowerCase() } })

          if (!user) {
            return null
          }

          if (credentials.phone && !isValidPhone(credentials.phone)) {
            return null
          }

          const isValidPassword = verifyPassword(credentials.password, user.password)

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
