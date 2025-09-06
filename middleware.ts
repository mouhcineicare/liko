import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect authenticated users from auth pages to their role-specific dashboard
    // But allow access to signin page if there's a callbackUrl parameter
    if (token && (path.startsWith("/auth/") || path === "/auth")) {
      const url = new URL(req.url);
      const callbackUrl = url.searchParams.get("callbackUrl");
      
      // If there's a callbackUrl, redirect to it instead of dashboard
      if (callbackUrl) {
        return NextResponse.redirect(new URL(callbackUrl, req.url));
      }
      
      const dashboardPath = getDashboardPath(token.role);
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }

    // Redirect authenticated users trying to access the home page to their role-specific dashboard
    if (token && path === "/") {
      const dashboardPath = getDashboardPath(token.role);
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }

    // Only protect dashboard routes
    if (path.startsWith("/dashboard")) {
      const role = token?.role;

      // If no role, redirect to sign in
      if (!role) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }

      // Redirect to role-specific dashboard if trying to access wrong role's dashboard
      if (
        (path.startsWith("/dashboard/admin") && role !== "admin") ||
        (path.startsWith("/dashboard/therapist") && role !== "therapist") ||
        (path.startsWith("/dashboard/patient") && role !== "patient")
      ) {
        return NextResponse.redirect(new URL(getDashboardPath(role), req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {

        if (req.nextUrl.pathname.startsWith("/verify-email")) {
          return true;
        }
        
        // Only require auth for dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

function getDashboardPath(role?: string): string {
  switch (role) {
    case "patient":
      return "/dashboard/patient";
    case "therapist":
      return "/dashboard/therapist";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/dashboard";
  }
}

// Protect dashboard routes, auth pages, and home page
export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/auth", "/"],
};