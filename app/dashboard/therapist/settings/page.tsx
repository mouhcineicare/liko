'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Tabs, 
  Card, 
  Input, 
  Button, 
  Typography, 
  Spin,
  message 
} from "antd";
import { toast } from "sonner";
import CalendarSettings from "@/components/dashboard/therapist/CalendarSettings";
import PaymentSettings from "@/components/dashboard/therapist/PaymentSettings";
import ProfileSettings from "@/components/dashboard/therapist/ProfileSettings";

const { TabPane } = Tabs;
const { Title } = Typography;

export default function SettingsPage() {
  const { data: session } = useSession();
  const [weeklyLimit, setWeeklyLimit] = useState<string>("3");
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdateLimit = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/therapist/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weeklyPatientsLimit: parseInt(weeklyLimit),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update session limit");
      }

      toast.success("Weekly session limit updated successfully");
    } catch (error) {
      console.error("Error updating session limit:", error);
      toast.error("Failed to update session limit");
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/therapist/profile");
      if (response.ok) {
        const data = await response.json();
        setWeeklyLimit(data.weeklyPatientsLimit.toString());
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className="p-6">
      <Title level={2} className="mb-6">Settings</Title>

      <Spin spinning={loading}>
        <Tabs defaultActiveKey="profile" className="w-full">
          <TabPane tab="Profile" key="profile">
            <ProfileSettings />
          </TabPane>
          
          <TabPane tab="Sessions" key="sessions">
            <Card 
              title="Session Management" 
              className="w-full"
              headStyle={{ fontSize: '1rem', fontWeight: 600 }}
            >
              <div className="max-w-md">
                <div className="mb-4">
                  <label 
                    htmlFor="weeklyLimit" 
                    className="block text-sm font-medium mb-2"
                  >
                    Weekly Session Limit
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="weeklyLimit"
                      type="number"
                      min="1"
                      max="10000"
                      value={weeklyLimit}
                      onChange={(e) => setWeeklyLimit(e.target.value)}
                      style={{ width: 100 }}
                    />
                    <Button
                      type="primary"
                      onClick={handleUpdateLimit}
                      loading={isUpdating}
                    >
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Set the maximum number of sessions you can handle per week (1-20)
                  </p>
                </div>
              </div>
            </Card>
          </TabPane>

          <TabPane tab="Payment" key="payment">
            <PaymentSettings />
          </TabPane>

          <TabPane tab="Calendar" key="calendar">
            <Card 
              title="Calendar Integration" 
              className="w-full"
              headStyle={{ fontSize: '1rem', fontWeight: 600 }}
            >
              <CalendarSettings />
            </Card>
          </TabPane>
        </Tabs>
      </Spin>
    </div>
  );
}