import React, { useState } from "react";
import { Modal, Table, Tag, Button, Tooltip } from "antd";
import { CheckCircleOutlined, LoadingOutlined, PlayCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { toast } from "sonner";

interface Session {
  _id: string;
  date: string;
  status: string;
  price: number;
  isCurrent?: boolean;
}

interface SessionListPopupProps {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  totalPrice: number;
  onSessionChange?: () => void;
  appointmentId?: string;
  appointmentStatus?: string;
}

const SessionListPopup: React.FC<SessionListPopupProps> = ({ 
  open, 
  onClose, 
  sessions, 
  totalPrice, 
  onSessionChange, 
  appointmentId, 
  appointmentStatus 
}) => {
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const perSessionPrice = sessions.length > 0 ? totalPrice / sessions.length : 0;
  const now = new Date();

  const canUpdateStatus = (session: Session) => {
    const sessionDate = new Date(session.date);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
    
    // Can only update current session that is at least 30 minutes past its scheduled time
    return session.isCurrent && sessionDate <= thirtyMinutesAgo;
  };

  const allSessionsCompleted = sessions.every(s => s.status === 'completed');
  const hasFutureSessions = sessions.some(s => new Date(s.date) > now && s.status !== 'completed');
  const isRecurring = sessions.length > 1;
  const isSingleSession = sessions.length === 1;

  const displaySessions = sessions.map((s, idx) => ({
    ...s,
    status: idx === 0 && appointmentStatus ? appointmentStatus : s.status,
    isCurrent: idx === 0,
  }));

  const handleStatusUpdate = async (session: Session, newStatus: string) => {
    if (!session.isCurrent) {
      toast.error("You can only update the current session");
      return;
    }

    const sessionIndex = displaySessions.findIndex(s => s._id === session._id);
    setLoadingSessionId(session._id);
    
    try {
      const response = await fetch(`/api/therapist/appointments/session/${sessionIndex}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus, 
          appointmentId,
          isCurrentSession: true
        }),
      });

      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error || "Failed to update status");
      
      if (result.appointment && onSessionChange) {
        onSessionChange();
      }

      onClose();
      toast.success("Session status updated successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingSessionId(null);
    }
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "completed" ? "green" : status === "pending" ? "orange" : "blue"}>{status}</Tag>
      ),
    },
    {
      title: "Price",
      key: "price",
      render: () => `د.إ${perSessionPrice.toFixed(2)}`,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Session) => {
        const canUpdate = canUpdateStatus(record);
        const isPast = new Date(record.date) <= now;
        
        const getTooltipTitle = () => {
          if (!record.isCurrent) return "You can only update the current session";
          if (record.status === "completed") return "Session already completed";
          const sessionDate = new Date(record.date);
          const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
          if (sessionDate > thirtyMinutesAgo) {
            return "Sessions can only be completed 30 minutes after their scheduled time";
          }
          return "Mark as Completed";
        };

        return (
          <div style={{ display: "flex", gap: 12 }}>
            <Tooltip title={getTooltipTitle()}>
              <Button
                shape="circle"
                icon={
                  loadingSessionId === record._id ? (
                    <LoadingOutlined />
                  ) : (
                    <CheckCircleOutlined style={{ color: record.status === "completed" ? "#52c41a" : "#bfbfbf", fontSize: 20 }} />
                  )
                }
                disabled={!canUpdate || record.status === "completed"}
                onClick={() => handleStatusUpdate(record, "completed")}
                style={{ border: "none", background: "transparent", boxShadow: "none" }}
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];

  let appointmentCompleteInfo = null;
  if (isRecurring) {
    if (!allSessionsCompleted && hasFutureSessions) {
      appointmentCompleteInfo = (
        <div style={{ marginTop: 16, color: '#faad14', display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoCircleOutlined />
          You can only mark the appointment as completed after all sessions are completed.
        </div>
      );
    }
  }

  return (
    <Modal
      title="Appointment Sessions"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Table
        dataSource={displaySessions.map((s) => ({ ...s, key: s._id }))}
        columns={columns}
        rowClassName={(record) => record.isCurrent ? "bg-blue-50" : ""}
        pagination={false}
        size="middle"
        bordered
        style={{ borderRadius: 8, overflow: 'hidden' }}
      />
      <div className="mt-4 text-right text-gray-600 text-sm">
        <span>Total Price: د.إ{totalPrice.toFixed(2)} | Per Session: د.إ{perSessionPrice.toFixed(2)}</span>
      </div>
      {appointmentCompleteInfo}
    </Modal>
  );
};

export default SessionListPopup;