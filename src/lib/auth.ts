import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import prisma from './prisma';
import { verifyPassword } from './utils';
import { checkRateLimit } from './rate-limit';

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 关闭 Auth.js 内置日志，避免每次登录失败打印 CredentialsSignin 堆栈
  logger: {
    error: (error) => {
      console.error('[auth][error]', error);
    },
    warn: (code) => {
      console.warn('[auth][warn]', code);
    },
    debug: (message, metadata) => {
      console.log('[auth][debug]', message, metadata);
    },
  },
  providers: [
    // 通行证（标准 OAuth2 / OIDC）登录
    {
      id: 'passport',
      name: '通行证',
      type: 'oauth',
      issuer: process.env.PASSPORT_ISSUER,
      authorization: {
        url: process.env.PASSPORT_AUTH_URL!,
        params: { scope: process.env.PASSPORT_SCOPE || 'openid profile email' },
      },
      token: process.env.PASSPORT_TOKEN_URL!,
      userinfo: process.env.PASSPORT_USERINFO_URL!,
      clientId: process.env.PASSPORT_CLIENT_ID,
      clientSecret: process.env.PASSPORT_CLIENT_SECRET,
      checks: ['state'],
      profile(profile: Record<string, any>) {
        return {
          id: String(profile.sub ?? profile.id ?? profile.user_id ?? ''),
          email: profile.email ?? profile.mail ?? null,
          name:
            profile.name ??
            profile.nickname ??
            profile.preferred_username ??
            profile.username ??
            null,
        };
      },
    },
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;

        // 频率限制：每个邮箱每 15 分钟最多 10 次登录尝试
        const { limited } = checkRateLimit(`login:${email}`, { windowMs: 15 * 60 * 1000, max: 10 });
        if (limited) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        if (!user.password) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // 仅处理通行证登录：按邮箱自动关联已有用户，否则新建
      if (account?.provider === 'passport') {
        const email = user.email;
        if (!email) {
          return false; // 通行证未返回邮箱，拒绝登录
        }

        let dbUser = await prisma.user.findUnique({ where: { email } });

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || email.split('@')[0],
              password: null,
            },
          });
        }

        // 记录/更新通行证关联
        await prisma.oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            tokenType: account.token_type,
            scope: account.scope,
            idToken: account.id_token,
          },
          create: {
            userId: dbUser.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
            tokenType: account.token_type,
            scope: account.scope,
            idToken: account.id_token,
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // 统一根据 email 从数据库取真实 id / role，
        // 兼容 Credentials（user.id 已是库 id）与通行证（user.id 是通行证 sub）两种情况
        const email = user.email ?? (token.email as string | undefined);
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          } else {
            token.id = user.id;
            token.role = (user as any).role;
          }
        } else {
          token.id = user.id;
          token.role = (user as any).role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
});

// 获取当前登录用户
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}
