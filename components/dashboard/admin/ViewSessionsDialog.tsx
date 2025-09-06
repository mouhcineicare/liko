import React from "react";
import { Modal, Table, Tag } from "antd";
import dayjs from "dayjs";

interface Appointment {
  _id: string;
  date: string;
  price: number;
  plan: string;
  status: string;
  paymentStatus?: string;
  totalSessions?: number;
  recurring?: string[] | { date: string }[];
}

interface Session {
  _id: string;
  date: string;
  price: number;
  status: string;
  paymentStatus?: string;
}

interface ViewSessionsDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

function getSessionsFromAppointment(appointment: Appointment): Session[] {
  if (!appointment) return [];
  const sessions: Session[] = [];
  const sessionPrice = appointment.price && appointment.totalSessions ? appointment.price / appointment.totalSessions : appointment.price;

  // Add main session (appointment date)
  const mainSession = {
    _id: `${appointment._id}-main`,
    date: appointment.date,
    price: sessionPrice,
    status: appointment.status || 'unpaid',
    paymentStatus: appointment.paymentStatus || 'not_paid',
  };

  // Handle recurring sessions
  const recurringSessions: Session[] = [];
  if (appointment.recurring && Array.isArray(appointment.recurring)) {
    appointment.recurring.forEach((rec, idx) => {
      let session: Session;
      if (typeof rec === "string") {
        session = {
          _id: `${appointment._id}-${idx}`,
          date: rec,
          price: sessionPrice,
          status: 'unpaid',
          paymentStatus: 'not_paid',
        };
      } else if (rec && typeof rec === "object" && rec.date) {
        session = {
          _id: `${appointment._id}-${idx}`,
          date: rec.date,
          price: sessionPrice,
          status: (rec as any).status || 'unpaid',
          paymentStatus: (rec as any).payment || 'not_paid',
        };
      } else {
        return; // Skip invalid entries
      }
      recurringSessions.push(session);
    });
  }

  // Sort all sessions by date
  const allSessions = [mainSession, ...recurringSessions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  return allSessions;
}

const columns = [
  {
    title: "Session #",
    dataIndex: "_id",
    key: "_id",
    render: (_: string, record: Session, idx: number) => {
      const isMain = record._id.endsWith('-main');
      const sessionNumber = idx + 1;
      return `Session ${sessionNumber}${isMain ? ' (Current)' : ''}`;
    },
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    render: (date: string) => {
      const parsed = dayjs(date);
      return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A") : (
        <span style={{ color: 'red' }}>Invalid Date</span>
      );
    },
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <Tag color={status === "completed" ? "success" : status === "pending" ? "warning" : "default"}>{status}</Tag>
    ),
  },
  {
    title: "Payment Status",
    dataIndex: "paymentStatus",
    key: "paymentStatus",
    render: (paymentStatus: string | undefined) => paymentStatus ? <Tag>{paymentStatus}</Tag> : null,
  },
  {
    title: "Price (AED)",
    dataIndex: "price",
    key: "price",
    render: (price: number) => `د.إ${price?.toFixed(2)}`,
  },
];

const ViewSessionsDialog: React.FC<ViewSessionsDialogProps> = ({ open, onClose, appointment }) => {
  const sessions = appointment ? getSessionsFromAppointment(appointment) : [];
  return (
    <Modal
      title="Appointment Sessions"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Table
        columns={columns}
        dataSource={sessions}
        rowKey="_id"
        pagination={false}
        size="middle"
      />
    </Modal>
  );
};

export default ViewSessionsDialog;
