import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username: string;
      loginMethod?: string;
    };
  }
}

const LoginSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        usernameOrEmail: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
        resetToken: { label: "Reset Token", type: "text" },
      },
      async authorize(credentials) {
        // Reset-token sign-in path
        if (credentials?.resetToken) {
          const token = credentials.resetToken as string;
          const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
          const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
          if (!record || record.expiresAt < new Date()) return null;
          // Consume the token — it's now bound to this session
          await prisma.passwordResetToken.delete({ where: { tokenHash } });
          const user = await prisma.user.findUnique({ where: { id: record.userId } });
          if (!user) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.avatarUrl,
            username: user.username,
            loginMethod: "reset_token",
          };
        }

        // Regular credentials path
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: parsed.data.usernameOrEmail },
              { username: parsed.data.usernameOrEmail },
            ],
          },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          username: user.username,
          loginMethod: "credentials",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      } else if (!token.sub && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) token.sub = dbUser.id;
      }
      const u = user as { username?: string; loginMethod?: string } | undefined;
      if (u?.username) token.username = u.username;
      if (u?.loginMethod) token.loginMethod = u.loginMethod;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.username) session.user.username = token.username as string;
      if (token.loginMethod) session.user.loginMethod = token.loginMethod as string;
      return session;
    },
  },
  session: { strategy: "jwt" },
});
