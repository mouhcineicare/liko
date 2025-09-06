"use client"

import { Modal, Table } from 'antd';
import { format } from 'date-fns';
import type { ColumnsType } from 'antd/es/table';
import { useMediaQuery } from 'react-responsive';

interface SessionHistoryItem {
  _id: string;
  action: string;
  sessions: number;
  plan?: string;
  reason?: string;
  createdAt: string;
}

interface SessionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: SessionHistoryItem[];
}

export function SessionHistoryDialog({ open, onOpenChange, history }: SessionHistoryDialogProps) {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const columns: ColumnsType<SessionHistoryItem> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => isMobile 
        ? format(new Date(date), 'MMM dd') 
        : format(new Date(date), 'MMM dd, yyyy HH:mm'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend',
      width: isMobile ? 100 : undefined,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (text: string) => text.charAt(0).toUpperCase() + text.slice(1),
      width: isMobile ? 50 : 70,
    },
    {
      title: 'Sessions',
      dataIndex: 'sessions',
      key: 'sessions',
      align: 'right',
      width: isMobile ? 40 : undefined,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text?: string) => text || '-',
      width: isMobile ? 150 : undefined,
    },
  ];

  return (
    <Modal
      title="Session History"
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      width={isMobile ? '90%' : 800}
      bodyStyle={{ padding: 0 }}
      className="session-history-modal"
    >
      <Table
        columns={columns}
        dataSource={history}
        rowKey="_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
        }}
        locale={{
          emptyText: 'No session history found',
        }}
        scroll={{ y: 400, x: isMobile ? 500 : undefined }}
        size={isMobile ? 'small' : 'middle'}
      />
    </Modal>
  );
}