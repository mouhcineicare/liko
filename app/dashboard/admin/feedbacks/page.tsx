"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Spin, 
  message,
  Statistic,
  Divider,
  Space,
  Typography,
  Avatar,
  Rate,
  Modal
} from 'antd';
import { 
  StarOutlined,
  MessageOutlined,
  UserOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Text } = Typography;
const { confirm } = Modal;

interface Feedback {
  _id: string;
  userId: {
    _id: string;
    email: string;
    image?: string;
    status: string;
  };
  fullName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/feedbacks');
      setFeedbacks(response.data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      message.error('Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = (id: string) => {
    confirm({
      title: 'Are you sure you want to delete this feedback?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setIsDeleting(true);
          await axios.delete(`/api/admin/feedbacks/${id}`);
          message.success('Feedback deleted successfully');
          fetchFeedbacks();
        } catch (error) {
          console.error('Error deleting feedback:', error);
          message.error('Failed to delete feedback');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: Feedback) => (
        <div className="flex items-center">
          <Avatar 
            src={record.userId.image} 
            icon={<UserOutlined />} 
            className="mr-2"
          />
          <div>
            <Text strong>{record.fullName}</Text>
            <div className="text-xs text-gray-500">{record.userId.email}</div>
            <Tag color={record.userId.status === 'active' ? 'green' : 'orange'}>
              {record.userId.status}
            </Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => (
        <Rate 
          disabled 
          defaultValue={rating} 
          character={<StarOutlined />} 
          className="text-yellow-500"
        />
      )
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (text: string) => (
        <div className="flex items-start">
          <MessageOutlined className="mr-2 mt-1 text-gray-400" />
          <Text className="whitespace-pre-line">{text}</Text>
        </div>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY h:mm A')
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Feedback) => (
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleDeleteFeedback(record._id)}
          loading={isDeleting}
        />
      )
    }
  ];

  // Calculate feedback statistics
  const totalFeedbacks = feedbacks.length;
  const averageRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / (feedbacks.length || 1);
  const positiveFeedbacks = feedbacks.filter(f => f.rating >= 4).length;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Text strong style={{ fontSize: 20 }}>Feedback Management</Text>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <Statistic
            title="Total Feedbacks"
            value={totalFeedbacks}
            prefix={<MessageOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Average Rating"
            value={averageRating.toFixed(1)}
            precision={1}
            prefix={<StarOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Positive Feedbacks"
            value={positiveFeedbacks}
            suffix={`/ ${totalFeedbacks}`}
            prefix={<StarOutlined style={{ color: 'gold' }} />}
          />
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center items-center min-h-[200px]">
            <Spin />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={feedbacks}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: 'No feedbacks available'
            }}
          />
        )}
      </Card>
    </div>
  );
}