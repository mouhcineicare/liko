"use client";

import { useState, useEffect } from "react";
import { 
  Modal, 
  Button, 
  Form, 
  Input, 
  Select, 
  Space, 
  Spin,
  message
} from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined
} from '@ant-design/icons';

interface Therapist {
  _id: string;
  fullName: string;
}

export default function AddPatientDialog({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoadingTherapists, setIsLoadingTherapists] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      fetchTherapists();
      form.resetFields();
    }
  }, [open]);

  const fetchTherapists = async () => {
    try {
      setIsLoadingTherapists(true);
      const response = await fetch("/api/admin/therapists");
      if (!response.ok) {
        throw new Error("Failed to fetch therapists");
      }
      const data = await response.json();
      setTherapists(data);
    } catch (error) {
      console.error("Error fetching therapists:", error);
      message.error("Failed to load therapists");
    } finally {
      setIsLoadingTherapists(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          therapy: values.therapy || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create patient");
      }

      message.success("Patient created successfully");
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating patient:", error);
      message.error("Failed to create patient");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        type="primary" 
        onClick={() => setOpen(true)}
        style={{ marginLeft: 'auto' }}
      >
        Add New Patient
      </Button>

      <Modal
        title="Add New Patient"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input patient email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="patient@example.com" 
            />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: 'Please input patient name!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="John Doe" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please input password!' },
              { min: 6, message: 'Password must be at least 6 characters!' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="••••••" 
            />
          </Form.Item>

          <Form.Item
            name="telephone"
            label="Phone Number"
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="+1234567890" 
            />
          </Form.Item>

          <Form.Item
            name="therapy"
            label="Assign Therapist"
          >
            <Select
              placeholder="Select a therapist"
              loading={isLoadingTherapists}
              allowClear
            >
              {therapists.map((therapist) => (
                <Select.Option key={therapist._id} value={therapist._id}>
                  Dr. {therapist.fullName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isLoading}>
                Create Patient
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}