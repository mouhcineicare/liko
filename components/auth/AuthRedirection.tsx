'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Spin, Typography } from "antd"

interface AuthRedirectProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Component that redirects authenticated users to the dashboard
 * and renders children only for unauthenticated users
 */
export function AuthRedirect({ children, redirectTo = "/dashboard" }: AuthRedirectProps) {
  const { data: user, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      const currentPath = window.location.pathname;
  
      let dashboardPath = "/dashboard";
      if (user?.user?.role === "patient") {
        dashboardPath = "/dashboard/patient";
      } else if (user?.user?.role === "admin") {
        dashboardPath = "/dashboard/admin";
      } else if (user?.user?.role === "therapist") {
        dashboardPath = "/dashboard/therapist";
      }
  
      // Only redirect if not already on a sub-route of the dashboard
      if (!currentPath.startsWith(dashboardPath)) {
        router.push(dashboardPath);
      }
    }
  }, [status, user, router]);

  // If authentication is still loading, show a loading state
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] h-[100vh]">
        <Spin size="large" />
        <Typography.Text type="secondary" className="mt-4">
          Verifying your session...
        </Typography.Text>
      </div>
    )
  }

  return <>{children}</>
}