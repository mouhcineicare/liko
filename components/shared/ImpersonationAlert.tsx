"use client"

import { useSession } from "next-auth/react";
import { Alert, Button } from "antd";
import { Users, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function ImpersonationAlert() {
  const { data: session } = useSession();

  // Only show if admin is impersonating a user
  if (!session?.user?.impersonated) {
    return null;
  }

  const handleStopImpersonation = async () => {
    // Sign out and redirect to admin dashboard
    await signOut({ 
      callbackUrl: "/dashboard/admin",
      redirect: true 
    });
  };

  return (
    <Alert
      message={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              You are logged in as <strong>{session.user.name}</strong> ({session.user.email})
            </span>
          </div>
          <Button
            type="primary"
            danger
            size="small"
            icon={<LogOut className="h-3 w-3" />}
            onClick={handleStopImpersonation}
          >
            Stop Impersonation
          </Button>
        </div>
      }
      type="warning"
      showIcon={false}
      className="mb-4"
      style={{
        backgroundColor: '#fff7e6',
        border: '1px solid #ffd591',
        borderRadius: '6px'
      }}
    />
  );
}
