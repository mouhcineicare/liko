'use client';

import { useState, useEffect } from 'react';
import { 
  SaveOutlined, 
  DeleteOutlined, 
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Card, 
  Spin, 
  Input, 
  message, 
  Modal, 
  Select, 
  Switch,
  Table,
  Form,
  InputNumber
} from 'antd';
const { TextArea } = Input;
const { Option } = Select;

interface Prompt {
  _id: string;
  title: string;
  content: string;
  type: string;
  isActive: boolean;
  order: number;
}

export default function AdminChatbotPage() {
  const [form] = Form.useForm();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/chatbot');
      const data = await res.json();
      setPrompts(data);
    } catch (error) {
      messageApi.error('Failed to fetch prompts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const url = '/api/admin/chatbot';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...values, id: editingId } : values),
      });

      if (res.ok) {
        messageApi.success(editingId ? 'Prompt updated' : 'Prompt created');
        form.resetFields();
        setEditingId(null);
        fetchPrompts();
      }
    } catch (error) {
      messageApi.error('Failed to save prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingId(prompt._id);
    form.setFieldsValue(prompt);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Prompt',
      content: 'Are you sure you want to delete this prompt?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setIsLoading(true);
        try {
          const res = await fetch('/api/admin/chatbot', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });

          if (res.ok) {
            messageApi.success('Prompt deleted');
            fetchPrompts();
          }
        } catch (error) {
          messageApi.error('Failed to delete prompt');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        render: (type: string | null | undefined) => 
          type ? type.charAt(0).toUpperCase() + type.slice(1) : 'General',
    },
    {
      title: 'Order',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? <CheckOutlined /> : <CloseOutlined />}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Prompt) => (
        <div className="flex space-x-2">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
            danger
            size="small"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {contextHolder}
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">AI Prompt Management</h1>
        <p className="text-gray-600">Manage system prompts for different user types</p>
      </div>

      <Card 
        title={editingId ? 'Edit Prompt' : 'Create New Prompt'} 
        className="mb-8 shadow-sm"
      >
        <Spin spinning={isLoading}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Please input a title!' }]}
            >
              <Input placeholder="Prompt title" />
            </Form.Item>

            <Form.Item
              name="content"
              label="Content"
              rules={[{ required: true, message: 'Please input prompt content!' }]}
            >
              <TextArea rows={6} placeholder="Enter prompt content" />
            </Form.Item>

            <Form.Item
              name="type"
              label="User Type"
              rules={[{ required: true, message: 'Please select user type!' }]}
            >
              <Select>
                <Option value="general">General</Option>
                <Option value="patient">Patient</Option>
                <Option value="therapy">Therapy</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="order"
              label="Order"
              initialValue={0}
            >
              <InputNumber min={0} />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch />
            </Form.Item>

            <div className="flex justify-end space-x-3">
              {editingId && (
                <Button onClick={() => {
                  form.resetFields();
                  setEditingId(null);
                }}>
                  Cancel
                </Button>
              )}
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={isLoading}
              >
                {editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </Form>
        </Spin>
      </Card>

      <Card title="Prompts List" className="shadow-sm">
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={prompts}
            rowKey="_id"
            pagination={false}
          />
        </Spin>
      </Card>
    </div>
  );
}