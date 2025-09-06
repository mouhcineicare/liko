'use client';

import { useState, useEffect } from 'react';
import { EmailTemplateType } from '@/lib/db/models/EmailTemplate';
import { Button, Card, Table, Modal, Form, Input, Select, Switch, Space, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';

const { Option } = Select;

const templateTypes: EmailTemplateType[] = [
  'PaymentConfirmation',
  'TherapistAssignment',
  'NewRegistration',
  'AppointmentApproval',
  'AppointmentStatus',
  'AccountConfirmation',
  'NewAppointment',
  'PaymentNotification',
  'PaymentDetailsUpdate',
  'TherapyChangeRequest',
  'PasswordReset',
  'PasswordResetSuccess',
  'PatientAssignment'
];

const variableOptions: Record<EmailTemplateType, string[]> = {
  PaymentConfirmation: ['patientName', 'appointmentDate', 'amount', 'plan'],
  TherapistAssignment: ['therapistName', 'patientName', 'appointmentDate', 'plan'],
  NewRegistration: ['adminName', 'userDetails'],
  AppointmentApproval: ['patientName', 'therapistName', 'appointmentDate', 'meetingLink'],
  AppointmentStatus: ['patientName', 'therapistName', 'appointmentDate', 'status'],
  AccountConfirmation: ['name', 'confirmationLink'],
  NewAppointment: ['patientName', 'appointmentDate', 'plan', 'price'],
  PaymentNotification: ['therapistName', 'amount', 'appointmentCount', 'paidAt'],
  PaymentDetailsUpdate: ['therapistName', 'updateType'],
  TherapyChangeRequest: ['patientName', 'oldTherapistName', 'appointmentDate', 'plan', 'appointmentId'],
  PasswordReset: ['name', 'resetLink'],
  PasswordResetSuccess: ['name']
};

const linkOptions = [
  { value: 'verification', label: 'Verification Link: ${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}' },
  { value: 'signing', label: 'Signing Link: ${process.env.NEXT_PUBLIC_BASE_URL}/signing' },
  { value: 'reset-password', label: 'Reset Password Link: ${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}' },
  { value: 'custom', label: 'Custom Link' }
];

export default function ManageEmailsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email-templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      message.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const method = currentTemplate?._id ? 'PUT' : 'POST';
      const url = currentTemplate?._id 
        ? '/api/admin/email-templates' 
        : '/api/admin/email-templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentTemplate?._id ? { ...values, _id: currentTemplate._id } : values),
      });

      if (response.ok) {
        message.success(currentTemplate?._id ? 'Template updated successfully' : 'Template created successfully');
        setModalVisible(false);
        fetchTemplates();
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      message.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email-templates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ _id: id }),
      });

      if (response.ok) {
        message.success('Template deleted successfully');
        fetchTemplates();
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      message.error('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: any) => {
    setCurrentTemplate(template);
    form.setFieldsValue(template);
    setModalVisible(true);
  };

  const handleNewTemplate = () => {
    setCurrentTemplate(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleLinkChange = (value: string) => {
    if (value !== 'custom') {
      const selectedLink = linkOptions.find(opt => opt.value === value);
      form.setFieldsValue({ buttonLink: selectedLink?.label.split(': ')[1] });
    } else {
      form.setFieldsValue({ buttonLink: '' });
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Switch checked={isActive} disabled />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record._id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="Email Templates"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleNewTemplate}
          >
            New Template
          </Button>
        }
      >
        <Table 
          columns={columns} 
          dataSource={templates} 
          loading={loading}
          rowKey="_id"
        />
      </Card>

      <Modal
        title={currentTemplate?._id ? 'Edit Template' : 'Create Template'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Template Name"
            rules={[{ required: true, message: 'Please input template name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="type"
            label="Template Type"
            rules={[{ required: true, message: 'Please select template type' }]}
          >
            <Select>
              {templateTypes.map(type => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Email Subject"
            rules={[{ required: true, message: 'Please input email subject' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="content"
            label="Email Content (HTML)"
            rules={[{ required: true, message: 'Please input email content' }]}
          >
            <TextArea rows={10} />
          </Form.Item>

          <Form.Item
            name="buttonLinkType"
            label="Button Link Type"
          >
            <Select onChange={handleLinkChange}>
              {linkOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="buttonLink"
            label="Button Link (leave empty for no button)"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}