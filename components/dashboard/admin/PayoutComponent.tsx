'use client';
import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Statistic } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

export default function PayoutLogs() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-logs?limit=10');
      const data = await res.json();
      setPayouts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayouts(); }, []);

  const columns = [
    {
      title: 'Therapist',
      dataIndex: ['therapist', 'name'],
      key: 'therapist'
    },
    {
      title: 'Amount',
      render: (_: any, record: { amount: number }) => (
        <Statistic
          value={record.amount}
          precision={2}
          prefix="AED"
          valueStyle={{ fontSize: '14px' }}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString()
    }
  ];

  return (
    <Card
      title="Payout Management"
      extra={
        <Button 
          icon={<SyncOutlined />} 
          onClick={fetchPayouts}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={payouts}
        rowKey="_id"
        loading={loading}
      />
    </Card>
  );
}