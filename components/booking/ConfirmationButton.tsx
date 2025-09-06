"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
// import { renderAppointmentConfirmationButton } from "./AppointmentConfirmation";

interface ConfirmationButtonProps {
  isPayWithBalance: boolean;
  isLoading: boolean;
  availableSessions: number;
  handlePayWithBalance: () => void;
  handleConfirm: () => void;
  isAgree: boolean;
  setIsAgree: (value: boolean) => void;
}

export function ConfirmationButton({
  isPayWithBalance,
  isLoading,
  availableSessions,
  handlePayWithBalance,
  handleConfirm,
  isAgree,
  setIsAgree
}: ConfirmationButtonProps) {
  return (
    <div className="pt-4">
      {isPayWithBalance ? (
        <Button
          className="w-full mt-2 text-white bg-blue-500 hover:bg-blue-600" 
          onClick={handlePayWithBalance} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay with Balance (${availableSessions.toFixed(2)} AED)`
          )}
        </Button>
      ) : (
        <>
          {/* {renderAppointmentConfirmationButton(isAgree, setIsAgree)} */}
          <Button 
            className="w-full" 
            onClick={handleConfirm} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Appointment"
            )}
          </Button>
        </>
      )}
    </div>
  );
}