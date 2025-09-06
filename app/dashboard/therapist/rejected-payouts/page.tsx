'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Tag, 
  Button, 
  Input, 
  Space, 
  Modal, 
  Form, 
  message,
  Pagination,
  Descriptions,
  Typography
} from 'antd';
import { SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

const { Text } = Typography;
const { confirm } = Modal;

interface RejectedPayout {
  _id: string;
  date: string;
  price: number;
  patient: {
    _id: string;
    fullName: string;
    email: string;
  };
  rejectedPayoutNote: string;
  justifyPayout: boolean;
  justifyNote?: string;
  justifyDate?: string;
  payoutStatus: string;
}

export default function RejectedPayoutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RejectedPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState(searchParams.get('search') || '');
  const [justifyModal, setJustifyModal] = useState({
    visible: false,
    appointmentId: '',
    note: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: searchText
      }).toString();

      const res = await fetch(`/api/therapist/payout/rejected?${params}`);
      const { data, pagination: resPagination } = await res.json();

      setData(data);
      setPagination(prev => ({
        ...prev,
        total: resPagination.total
      }));
    } catch (error) {
      message.error('Failed to fetch rejected payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize, searchText]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
    router.push(`/therapist/payout/rejected?search=${value}`);
  };

  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
  };

  const showJustifyModal = (appointmentId: string) => {
    setJustifyModal({
      visible: true,
      appointmentId,
      note: ''
    });
  };

  const handleJustify = async () => {
    try {
      const response = await fetch('/api/therapist/payout/rejected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: justifyModal.appointmentId,
          justifyNote: justifyModal.note
        })
      });

      const result = await response.json();

      if (result.success) {
        message.success('Payout justification submitted');
        fetchData();
        setJustifyModal({ visible: false, appointmentId: '', note: '' });
      } else {
        message.error(result.error || 'Failed to justify payout');
      }
    } catch (error) {
      message.error('Failed to submit justification');
    }
  };

  const columns = [
    {
      title: 'Patient',
      dataIndex: ['patient', 'fullName'],
      key: 'patient',
      render: (_: any, record: RejectedPayout) => (
        <div>
          <div className="font-medium">{record.patient.fullName}</div>
          <div className="text-gray-500 text-xs">{record.patient.email}</div>
        </div>
      ),
    },
    {
      title: 'Session Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => format(new Date(date), 'PP'),
    },
    {
      title: 'Amount',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `د.إ${price.toFixed(2)}`,
    },
    {
      title: 'Rejection Reason',
      dataIndex: 'rejectedPayoutNote',
      key: 'rejectedPayoutNote',
      render: (note: string) => (
        <Text type="danger" ellipsis={{ tooltip: note }}>
          {note}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'justifyPayout',
      key: 'status',
      render: (justified: boolean) => (
        <Tag color={justified ? 'green' : 'red'}>
          {justified ? 'Justified' : 'Rejected'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: RejectedPayout) => (
        <Space>
          {!record.justifyPayout && (
            <Button 
              size="small"
              onClick={() => showJustifyModal(record._id)}
            >
              Justify
            </Button>
          )}
          {record.justifyPayout && (
            <Button 
              size="small"
              onClick={() => {
                Modal.info({
                  title: 'Justification Details',
                  content: (
                    <Descriptions column={1}>
                      <Descriptions.Item label="Justification Note">
                        {record.justifyNote}
                      </Descriptions.Item>
                      <Descriptions.Item label="Submitted On">
                        {format(new Date(record.justifyDate!), 'PPpp')}
                      </Descriptions.Item>
                    </Descriptions>
                  )
                });
              }}
            >
              View Justification
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title="Rejected Payouts"
        extra={
          <Input
            placeholder="Search patients..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => handleSearch(searchText)}
            allowClear
            className="w-64"
          />
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={false}
          onChange={handleTableChange}
          scroll={{ x: true }}
        />
        
        <div className="mt-4 flex justify-end">
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total })}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `Total ${total} items`}
          />
        </div>
      </Card>

      <Modal
        title="Justify Payout Rejection"
        visible={justifyModal.visible}
        onOk={handleJustify}
        onCancel={() => setJustifyModal({ visible: false, appointmentId: '', note: '' })}
        okText="Submit Justification"
        cancelText="Cancel"
      >
        <Form layout="vertical">
          <Form.Item label="Justification Note">
            <Input.TextArea
              rows={4}
              value={justifyModal.note}
              onChange={(e) => setJustifyModal(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Explain why this payout should be reconsidered..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}