"use client";

import { useSession } from "next-auth/react";
import { message, Button, Alert, Spin } from "antd";
import { SyncOutlined, LinkOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

const CalendarConnectionAlert = () => {
  const { data: session, update } = useSession();
  const [isSyncing, setIsSyncing] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Key for storing the last sync date in localStorage
  const LAST_SYNC_KEY = "lastSyncDate";

  useEffect(() => {
    if (session?.user?.isCalendarConnected) {
      const lastSyncDate = localStorage.getItem(LAST_SYNC_KEY);
      const now = new Date().getTime();

      // Check if the last sync was more than 12 hours ago
      if (!lastSyncDate || now - parseInt(lastSyncDate) > 12 * 60 * 60 * 1000) {
        handleSync();
      }
    }
  }, [session]);

  const showSuccess = (text: string) => {
    messageApi.success(text);
  };

  const showError = (text: string) => {
    messageApi.error(text);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/therapist/calendar/sync", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sync calendar");
      }

      const data = await response.json();
      showSuccess(`Successfully synced ${data.count} appointments`);

      // Store the current timestamp in localStorage after a successful sync
      localStorage.setItem(LAST_SYNC_KEY, new Date().getTime().toString());
    } catch (error) {
      console.error("Error syncing calendar:", error);
      showError("Failed to sync calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/therapist/calendar/auth");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get authorization URL");
      }

      const { url } = await response.json();

      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem("googleOAuthState", state);

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

        const savedState = sessionStorage.getItem("googleOAuthState");
        if (returnedState !== savedState) {
          console.error("State mismatch:", { savedState, returnedState });
          showError("Authentication failed - invalid state parameter");
          return;
        }

        sessionStorage.removeItem("googleOAuthState");

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

          // Update session
          if (session?.user) {
            await update({
              ...session,
              user: {
                ...session.user,
                isCalendarConnected: true,
              },
            });
          }

          showSuccess("Google Calendar connected successfully");

          // Initial sync after connection
          await handleSync();
        } catch (error: any) {
          console.error("Token exchange error:", error);
          showError(error.message || "Failed to connect calendar");
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    } catch (error: any) {
      console.error("Calendar connection error:", error);
      showError(error.message || "Failed to connect calendar");
    }
  };

  if (!session?.user?.isCalendarConnected) {
    return (
      <>
        {contextHolder}
        <Alert
          message={`Welcome back, ${session?.user?.name}!`}
          description={
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span>Please connect your Google Calendar</span>
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={handleConnect}
                className="w-full sm:w-auto"
              >
                Connect Calendar
              </Button>
            </div>
          }
          type="warning"
          showIcon
          className="mb-4"
        />
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <Alert
        message={`Welcome back, ${session.user.name}!`}
        description={
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>Your calendar is connected</span>
            <Button
              type="primary"
              icon={isSyncing ? <SyncOutlined spin /> : <SyncOutlined />}
              onClick={handleSync}
              loading={isSyncing}
              className="w-full sm:w-auto"
            >
              {isSyncing ? "Syncing..." : "Sync Calendar"}
            </Button>
          </div>
        }
        type="success"
        showIcon
        className="mb-4"
      />
    </>
  );
};

export default CalendarConnectionAlert;