import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { userRepository } from '@/repositories/user.repository';
import { connectToMainDb } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      tenantId: string;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    tenantId: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'TenantId', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) {
          return null;
        }

        const tenantId = credentials.tenantId.trim().toLowerCase().replace(/\s+/g, '-');
        
        const mainDb = await connectToMainDb();
        const mainUsers = await mainDb.collection('users').find({ email: credentials.email, tenantId }).toArray();
        
        for (const mainUser of mainUsers) {
          const isValid = await userRepository.verifyPassword(mainUser as any, credentials.password);
          if (isValid) {
            return {
              id: mainUser._id.toString(),
              email: mainUser.email,
              name: mainUser.name,
              role: mainUser.role,
              tenantId: mainUser.tenantId,
            };
          }
        }
        
        let tenantUser = await userRepository.findByEmail(credentials.email, tenantId);
        if (tenantUser) {
          const isValid = await userRepository.verifyPassword(tenantUser as any, credentials.password);
          if (isValid) {
            return {
              id: tenantUser._id.toString(),
              email: tenantUser.email,
              name: tenantUser.name,
              role: tenantUser.role,
              tenantId: tenantId,
            };
          }
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};