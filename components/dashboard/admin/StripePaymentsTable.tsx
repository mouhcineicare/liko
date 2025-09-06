'use client';

import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Spin, Select, Input, Flex } from 'antd';
import { SyncOutlined, CheckCircleOutlined, DollarOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PaginationProps, TableProps } from 'antd';
import { convertTimeToTimeZone } from '@/lib/utils';

const { Text } = Typography;

interface StripePayment {
    id: string;
    type: 'charge';
    amount: number;
    currency: string;
    status: string;
    created: Date;
    description: string;
    customer_email: string;
    customer_name: string;
    payment_method: string;
    receipt_url: string | null;
    fee: number;
    net: number;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

interface Filters {
  type?: string;
  status?: string;
  search?: string;
}

export default function StripePaymentsTable({ refreshKey }: { refreshKey?: number }) {
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<Filters>({});

  const fetchPayments = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/admin/payments/stripe?${params}`);
      if (!response.ok) throw new Error('Failed to fetch payments');

      const { payments: data, pagination: paginationData } = await response.json();
      setPayments(data);
      setPagination({
        page: page,
        limit:pageSize,
        total: paginationData.total,
        hasMore: paginationData.hasMore,
      });
    } catch (error) {
      console.error('Error fetching Stripe payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters, refreshKey]);

  const handleTableChange: TableProps<StripePayment>['onChange'] = (pagination) => {
    if (pagination.current && pagination.pageSize) {
      fetchPayments(pagination.current, pagination.pageSize);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      succeeded: { color: 'success', icon: <CheckCircleOutlined /> },
      pending: { color: 'processing', icon: <SyncOutlined spin /> },
      failed: { color: 'error', icon: <WarningOutlined /> },
      paid: { color: 'success', icon: <CheckCircleOutlined /> },
      in_transit: { color: 'processing', icon: <SyncOutlined spin /> },
      cancelled: { color: 'default', icon: <WarningOutlined /> },
    } as const;

    const config = statusMap[status as keyof typeof statusMap] || { color: 'default', icon: <SyncOutlined spin /> };
    return (
      <Tag color={config.color} icon={config.icon}>
        {status}
      </Tag>
    );
  };

  const columns: TableProps<StripePayment>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      ellipsis: true,
      render: (id: string) => <Text copyable>{id.substring(0, 8)}...</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'charge' | 'payout') => (
        <Tag color={type === 'charge' ? 'blue' : 'green'}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: StripePayment) => (
        <Text strong>
          {amount.toLocaleString('en-US', {
            style: 'currency',
            currency: record.currency,
          })}
        </Text>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
        title: 'Name',
        dataIndex: 'customer_name',
        key: 'customer_name',
        ellipsis: true,
      },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: 'Date',
      ellipsis: true,
      dataIndex: 'created',
      key: 'created',
      render: (date: Date) => <div>
        {dayjs(date).format('YYYY-MM-DD HH:mm:ss')}
        <br />
        <Text type="secondary">{convertTimeToTimeZone(new Date(date).toISOString(),'Asia/Dubai',date)} (Asia/Dubai)</Text>
      </div>,
      sorter: (a: StripePayment, b: StripePayment) =>
        a.created.getTime() - b.created.getTime(),
    },
    {
      title: 'Fee',
      dataIndex: 'fee',
      key: 'fee',
      render: (fee: number | undefined, record: StripePayment) =>
        fee ? (
          <Text type="secondary">
            {fee.toLocaleString('en-US', {
              style: 'currency',
              currency: record.currency,
            })}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Net',
      dataIndex: 'net',
      key: 'net',
      ellipsis: true,
      render: (net: number | undefined, record: StripePayment) =>
        net ? (
          <Text strong type="success">
            {net.toLocaleString('en-US', {
              style: 'currency',
              currency: record.currency,
            })}
          </Text>
        ) : (
          '-'
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: StripePayment) => (
        <Space>
          <Button
            size="small"
            onClick={() => window.open(`${process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL}/${record.type}s/${record.id}`, '_blank')}
          >
            View in Stripe
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Flex gap="middle" wrap="wrap" className="mb-4">
        <Select
          placeholder="Filter by type"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, type: value })}
          options={[
            { value: 'charge', label: 'Charge' },
            { value: 'payout', label: 'Payout' },
          ]}
        />

        <Select
          placeholder="Filter by status"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value })}
          options={[
            { value: 'succeeded', label: 'Succeeded' },
            { value: 'pending', label: 'Pending' },
            { value: 'failed', label: 'Failed' },
            { value: 'paid', label: 'Paid' },
          ]}
        />

        <Input.Search
          placeholder="Search payments"
          style={{ width: 250 }}
          allowClear
          onSearch={(value) => setFilters({ ...filters, search: value })}
        />

        <Button
          icon={<SyncOutlined />}
          onClick={() => fetchPayments(pagination.page, pagination.limit)}
        >
          Refresh
        </Button>
      </Flex>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} payments`,
        }}
        onChange={handleTableChange}
        scroll={{ x: true }}
      />
    </div>
  );
}