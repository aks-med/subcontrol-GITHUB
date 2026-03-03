import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'admin',
        };
      },
    }),
    CredentialsProvider({
      id: 'client-login',
      name: 'Client Login',
      credentials: {
        cnpj: { label: 'CNPJ', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.cnpj) {
          return null;
        }

        const cleanedCNPJ = credentials.cnpj.replace(/\D/g, '');
        const company = await prisma.company.findUnique({
          where: { cnpj: cleanedCNPJ },
        });

        if (!company || !company.active) {
          return null;
        }

        return {
          id: company.id,
          email: company.cnpj,
          name: company.name,
          role: 'client',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? 'client';
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
