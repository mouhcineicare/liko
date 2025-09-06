"use client";

import { Card, Progress, Button } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface PatientCapacityProps {
  currentPatients: number;
  maxPatients: number;
  remainingSessions?: number;
  totalCompletedSessions?: number;
}

const PatientCapacity = ({
  currentPatients,
  maxPatients,
  remainingSessions,
  totalCompletedSessions,
}: PatientCapacityProps) => {
  const router = useRouter();

  return (
    <Card className="mb-6">
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold mb-2">Patient Capacity</h3>
        
        <div className="mb-2">
          <span className="text-gray-600">
            {currentPatients} of {maxPatients} patients (
            {Math.max(0, maxPatients - currentPatients)} slots available)
          </span>
        </div>
        
        <Progress
          percent={Math.round((currentPatients / maxPatients) * 100)}
          status={currentPatients >= maxPatients ? "exception" : "active"}
          className="mb-4"
        />

        {remainingSessions !== undefined && (
          <div className="mb-2">
            <span className="text-gray-600">
              Remaining weekly sessions: {remainingSessions}
            </span>
          </div>
        )}

        {totalCompletedSessions !== undefined && (
          <div className="mb-4">
            <span className="text-gray-600">
              Total completed sessions: {totalCompletedSessions}
            </span>
          </div>
        )}

        <Button
          type="default"
          icon={<SettingOutlined />}
          onClick={() => router.push("/dashboard/therapist/settings")}
        >
          Update Limit
        </Button>
      </div>
    </Card>
  );
};

export default PatientCapacity;