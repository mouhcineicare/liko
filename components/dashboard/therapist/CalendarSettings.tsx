"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function CalendarSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingError, setIsConnectingError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const { data: session, update: updateSession } = useSession();

  useEffect(() => {
    fetchCalendarStatus();
  }, []);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch("/api/therapist/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      const data = await response.json();
      setIsConnected(data.isCalendarConnected);
      setLastSynced(data.calendarLastSynced ? new Date(data.calendarLastSynced) : null);
    } catch (error) {
      console.error("Error fetching calendar status:", error);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch("/api/therapist/calendar/sync", {
        method: "POST"
      });

      if (!response.ok) {
        setIsConnectingError(true)
        throw new Error("Failed to sync calendar");
      }

      const data = await response.json();
      toast.success(`Successfully synced ${data.count} appointments`);
      fetchCalendarStatus(); // Refresh the last synced time
    } catch (error) {
      setIsConnectingError(true)
      console.error("Error syncing calendar:", error);
      toast.error("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const response = await fetch("/api/therapist/calendar/auth");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get authorization URL");
      }
      
      const { url } = await response.json();
      
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('googleOAuthState', state);
      
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        `${url}&state=${state}`,
        "Connect Google Calendar",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        throw new Error("Popup was blocked. Please allow popups and try again.");
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type !== "GOOGLE_OAUTH_CALLBACK") return;

        const { code, state: returnedState } = event.data;
        
        const savedState = sessionStorage.getItem('googleOAuthState');
        if (returnedState !== savedState) {
          console.error('State mismatch:', { savedState, returnedState });
          toast.error("Authentication failed - invalid state parameter");
          return;
        }
        
        sessionStorage.removeItem('googleOAuthState');

        try {
          const tokenResponse = await fetch("/api/therapist/calendar/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(error.error || "Failed to connect calendar");
          }

          const data = await tokenResponse.json();
          
          // Update local state
          setIsConnected(true);
          setLastSynced(new Date());

          // Update session
          if (session?.user) {
            await updateSession({
              ...session,
              user: {
                ...session.user,
                isCalendarConnected: true
              }
            });
          }

          toast.success("Google Calendar connected successfully");
          
          // Initial sync after connection
          await handleSync();
        } catch (error: any) {
          console.error("Token exchange error:", error);
          toast.error(error.message || "Failed to connect calendar");
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
      
    } catch (error: any) {
      console.error("Calendar connection error:", error);
      toast.error(error.message || "Failed to connect calendar");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <Calendar className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="font-medium">Google Calendar Integration</h3>
          <p className="text-sm text-gray-500">
            {isConnected
              ? "Your appointments will automatically sync with Google Calendar"
              : "Connect your Google Calendar to automatically sync appointments"}
          </p>
          {isConnected && lastSynced && (
            <p className="text-xs text-gray-400 mt-1">
              Last synced: {lastSynced.toLocaleString()}
            </p>
          )}
        </div>
      </div>
      {isConnected ? (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          {isConnectingError && (
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-2" />
              Connected
            </div>
          )}
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isConnecting ? "Connecting..." : "Connect Calendar"}
        </Button>
      )}
    </div>
  );
}