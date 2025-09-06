import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface EmailVerificationAlertProps {
  userEmail: string;
}

export default function EmailVerificationAlert({ userEmail }: EmailVerificationAlertProps) {
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        throw new Error("Failed to resend verification email");
      }

      toast.success("Verification email sent successfully");
    } catch (error) {
      console.error("Error resending verification:", error);
      toast.error("Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="mb-6 bg-yellow-50 border-yellow-200">
      <AlertTriangle className="h-5 w-5 mt-1 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between text-yellow-800">
        <span>
          Please verify your email address to access all features. Check your inbox for the verification link.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendVerification}
          disabled={isResending}
          className="ml-4 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 border-yellow-300"
        >
          {isResending ? "Sending..." : "Resend Email"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}