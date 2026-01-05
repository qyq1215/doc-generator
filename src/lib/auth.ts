import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 使用 JWT 策略时不需要 adapter
  session: {
    strategy: 'jwt', // 使用 JWT 而不是数据库 session
    maxAge: 7 * 24 * 60 * 60, // 7天过期
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('请输入用户名和密码');
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        // 查找用户
        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          throw new Error('用户名或密码错误');
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error('用户名或密码错误');
        }

        return {
          id: user.id,
          name: user.name || user.username,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

