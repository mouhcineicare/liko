import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: "patient" | "therapist" | "admin";
      image?: string;
      isCalendarConnected?: boolean;
      status: "pending" | "active" | "banned" | "in_review";
      therapyId: string | null;
      timeZone?: string;
      impersonated?: boolean;
      adminId: string;
      adminEmail: string;
      originalUserId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: "patient" | "therapist" | "admin";
    image?: string;
    isCalendarConnected?: boolean;
    status: "pending" | "active" | "banned" | "in_review";
    therapyId: string | null;
    timeZone?: string;
    impersonated?: boolean;
    adminId: string;
    adminEmail: string;
    originalUserId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "patient" | "therapist" | "admin";
    image?: string;
    isCalendarConnected?: boolean;
    status: "pending" | "active" | "banned" | "in_review";
    therapyId: string | null;
    timeZone?: string;
    impersonated?: boolean;
    adminId: string;
    adminEmail: string;
    originalUserId: string;
  }
}