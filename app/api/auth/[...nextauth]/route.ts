import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyUser } from '../../../../lib/users'
import { isAdminEmail } from '../../../../lib/admin-server';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Verify user using shared user storage
        const user = await verifyUser(credentials.email, credentials.password)
        
        if (user) {
          // Check if email is verified
          if (!user.emailVerified) {
            throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
          }
          
          // Check if user is approved (admin users are always approved)
          if (!user.approved && !isAdminEmail(user.email)) {
            throw new Error('Your account is pending admin approval. You will receive an email once approved.')
          }
          
          return {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0] ?? 'User'
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'development-secret-change-in-production'
})

export { handler as GET, handler as POST }
