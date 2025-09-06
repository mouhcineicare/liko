"use client";

import { useState } from "react";
import { 
  Modal, 
  Form, 
  Input, 
  Button, 
  Tag, 
  Space, 
  Divider,
  message,
  Select
} from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  PlusOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { SizeType } from "antd/es/config-provider/SizeContext";

interface AddTherapistDialogProps {
  onSuccess: () => void;
  buttonSize: SizeType;
}

const { TextArea } = Input;

export default function AddTherapistDialog({ onSuccess, buttonSize }: AddTherapistDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [form] = Form.useForm();

  const handleSpecialtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && specialtyInput.trim()) {
      e.preventDefault();
      if (!specialties.includes(specialtyInput.trim())) {
        setSpecialties([...specialties, specialtyInput.trim()]);
      }
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          role: "therapist",
          specialties: specialties,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create therapist");
      }

      message.success("Therapist added successfully");
      setOpen(false);
      onSuccess();
      form.resetFields();
      setSpecialties([]);
    } catch (error: any) {
      message.error(error.message || "Failed to add therapist");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        size={buttonSize}
        type="primary" 
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
      >
        Add Therapist
      </Button>

      <Modal
        title="Add New Therapist"
        open={open}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
          setSpecialties([]);
        }}
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
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: 'Please input therapist name!' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Dr. John Doe" 
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input therapist email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="doctor@example.com" 
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
            rules={[{ required: true, message: 'Please input phone number!' }]}
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="+1234567890" 
            />
          </Form.Item>

          <Form.Item
            name="summary"
            label="Professional Summary"
            rules={[{ required: true, message: 'Please input professional summary!' }]}
          >
            <TextArea
              rows={4}
              placeholder="Enter professional background, experience, and approach to therapy..."
            />
          </Form.Item>

          <Form.Item
            label="Specialties"
            required
            validateStatus={specialties.length === 0 ? 'error' : ''}
            help={specialties.length === 0 ? 'Please add at least one specialty' : ''}
          >
            <div className="border rounded p-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {specialties.map((specialty, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => removeSpecialty(specialty)}
                    closeIcon={<CloseOutlined className="text-xs" />}
                    className="flex items-center py-1"
                  >
                    {specialty}
                  </Tag>
                ))}
              </div>
              <Input
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={handleSpecialtyKeyDown}
                placeholder="Type specialty and press Enter"
                suffix={
                  <Button
                    type="text"
                    size={buttonSize}
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
                        setSpecialties([...specialties, specialtyInput.trim()]);
                        setSpecialtyInput("");
                      }
                    }}
                  />
                }
              />
            </div>
          </Form.Item>

          <Divider />

          <Form.Item className="flex justify-end mb-0">
            <Space>
              <Button onClick={() => {
                setOpen(false);
                form.resetFields();
                setSpecialties([]);
              }}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={isLoading}
                disabled={specialties.length === 0}
              >
                Add Therapist
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}