import Google from '@auth/core/providers/google';
import Credentials from '@auth/core/providers/credentials';
import bcrypt from 'bcrypt';
import { defineConfig } from 'auth-astro';
import { query } from './src/lib/db.js';

console.log('🔧 Auth config loading...');
console.log('AUTH_SECRET:', import.meta.env.AUTH_SECRET ? '✅ Present' : '❌ Missing');
console.log('AUTH_TRUST_HOST:', import.meta.env.AUTH_TRUST_HOST);
console.log('GOOGLE_CLIENT_ID:', import.meta.env.GOOGLE_CLIENT_ID ? '✅ Present' : '❌ Missing');
console.log('GOOGLE_CLIENT_SECRET:', import.meta.env.GOOGLE_CLIENT_SECRET ? '✅ Present' : '❌ Missing');

export default defineConfig({
  secret: import.meta.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Google({
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = credentials ?? {};
          if (!email || !password) {
            return null;
          }
          
          const rows = await query('SELECT id, name, email, password_hash AS hash FROM users WHERE email = ? LIMIT 1', [email]);
          if (!rows.length) {
            return null;
          }
          
          const user = rows[0];
          if (!user.hash) {
            return null;
          }
          
          const ok = await bcrypt.compare(password, user.hash);
          if (!ok) {
            return null;
          }
          return { id: String(user.id), name: user.name, email: user.email };
        } catch (error) {
          console.error('🚨 Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google') {
          // Check if user exists
          const existingUsers = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [user.email]);
          
          if (!existingUsers.length) {
            // Create new user
            console.log('🆕 Creating new Google user:', user.email);
            const result = await query(
              'INSERT INTO users (email, name, image) VALUES (?, ?, ?)',
              [user.email, user.name || '', user.image || null]
            );
            user.id = String(result.insertId);
            console.log('✅ Google user created with ID:', user.id);
          } else {
            user.id = String(existingUsers[0].id);
            console.log('✅ Existing Google user found with ID:', user.id);
          }
        }
        return true;
      } catch (error) {
        console.error('🚨 Error in signIn callback:', error);
        return true; // Allow sign in to continue
      }
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      } else if (token?.email && !token?.id) {
        // For existing JWT tokens without ID, look up the user
        try {
          const users = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [token.email]);
          if (users.length) {
            token.id = String(users[0].id);
          }
        } catch (error) {
          console.error('🚨 Error looking up user in JWT callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
