import { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import UserModel from "@/lib/db/models/User";
import connectDB from "@/lib/db/connect";
import { JWT } from "next-auth/jwt";
import { RequestInternal } from "next-auth";

// Extended Session interface
interface ExtendedSession extends Session {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: "patient" | "therapist" | "admin";
    status: "pending" | "active" | "banned" | "in_review";
    isCalendarConnected: boolean;
    therapyId: string | null;
    timeZone?: string;
    impersonated?: boolean;
    adminId: string;
    adminEmail: string;
    originalUserId: string;
  };
}

// Extended User interface
interface ExtendedUser extends User {
  id: string;
  role: "patient" | "therapist" | "admin";
  status: "pending" | "active" | "banned" | "in_review";
  isCalendarConnected: boolean;
  therapyId: string | null;
  timeZone?: string;
  impersonated?: boolean;
  adminId: string;
  adminEmail: string;
  originalUserId: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "Verification Code", type: "text" },
        impersonated: { label: "Impersonated", type: "boolean" },
        adminId: { label: "Admin ID", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials: Record<"email" | "password" | "code" | "impersonated" | "adminId" | "userId", string> | undefined, req: Pick<RequestInternal, "body" | "query" | "headers" | "method">): Promise<ExtendedUser | null> {
        try {
          await connectDB();

          if (!credentials) return null;

          // Impersonation flow
          if (credentials.impersonated === "true" && credentials.userId && credentials.adminId) {
            const admin = await UserModel.findById(credentials.adminId);
            if (!admin || admin.role !== 'admin') throw new Error('Admin not found');

            const targetUser = await UserModel.findOne({
              _id: credentials.userId,
              status: 'active'
            }).select('+image');
            
            if (!targetUser) throw new Error('Target user not found or not active');

            return {
              id: targetUser._id.toString(),
              email: targetUser.email,
              name: targetUser.fullName,
              image: targetUser.image || null,
              adminEmail: admin.email,
              originalUserId: targetUser._id.toString(),
              role: targetUser.role,
              status: targetUser.status,
              isCalendarConnected: targetUser.isCalendarConnected,
              therapyId: targetUser.therapy?.toString() || null,
              timeZone: targetUser.timeZone,
              impersonated: true,
              adminId: admin._id.toString(),
            };
          }

          // Regular authentication flow
          if (!credentials.email) return null;

          const user = await UserModel.findOne({ email: credentials.email.toLowerCase() })
                              .select('+image +password +emailVerificationCode +emailVerificationCodeExpires');
          
          if (!user) return null;

          // Email verification code flow
          if (credentials.code) {
            if (!user.emailVerificationCode) return null;
            
            const isValid = await bcrypt.compare(credentials.code, user.emailVerificationCode);
            if (!isValid) return null;

            if (user.emailVerificationCodeExpires && user.emailVerificationCodeExpires < new Date()) {
              throw new Error("Verification code has expired");
            }

            await UserModel.findByIdAndUpdate(user._id, {
              emailVerificationCode: null,
              emailVerificationCodeExpires: null,
              emailVerificationAttempts: 0,
            });

            return {
              adminId: "",
              adminEmail: "",
              originalUserId: user._id.toString(),
              id: user._id.toString(),
              email: user.email,
              name: user.fullName,
              image: user.image || null,
              role: user.role,
              status: user.status,
              isCalendarConnected: user.isCalendarConnected,
              therapyId: user.therapy?.toString() || null,
              timeZone: user.timeZone,
            };
          }

          // Password authentication flow
          if (!credentials.password) return null;

          if (!user.password) return null;
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;

          if (user.status === "banned") {
            throw new Error("Your account has been banned");
          }

          return {
            adminId: "",
            adminEmail: "",
            originalUserId: user._id.toString(),
            id: user._id.toString(),
            email: user.email,
            name: user.fullName,
            image: user.image || null,
            role: user.role,
            status: user.status,
            isCalendarConnected: user.isCalendarConnected,
            therapyId: user.therapy?.toString() || null,
            timeZone: user.timeZone,
          };
        } catch (error) {
          console.error("Auth error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token = {
          ...token,
          ...user,
          id: user.id,
          name: user.name,
          image: user.image || undefined,
          therapyId: user.therapyId || null,
        };
      }

      // Handle session updates
      if (trigger === "update" && session?.user) {
        token = {
          ...token,
          name: session.user.name || token.name,
          image: session.user.image || token.image,
          isCalendarConnected: session.user.isCalendarConnected ?? token.isCalendarConnected,
          status: session.user.status || token.status,
          therapyId: session.user.therapyId || token.therapyId || null,
          timeZone: session.user.timeZone || token.timeZone,
        };
      }

      return token;
    },
    async session({ session, token }): Promise<ExtendedSession> {
      const extendedSession: ExtendedSession = {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: token.name as string,
          image: token.image as string | undefined,
          role: token.role as "patient" | "therapist" | "admin",
          isCalendarConnected: token.isCalendarConnected as boolean,
          status: token.status as "pending" | "active" | "banned" | "in_review",
          therapyId: token.therapyId as string | null,
          timeZone: token.timeZone as string | undefined,
        }
      };

      if (token.impersonated) {
        extendedSession.user.impersonated = true;
        extendedSession.user.adminId = token.adminId as string;
        extendedSession.user.adminEmail = token.adminEmail as string;
        extendedSession.user.originalUserId = token.originalUserId as string;
      }
      
      return extendedSession;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};