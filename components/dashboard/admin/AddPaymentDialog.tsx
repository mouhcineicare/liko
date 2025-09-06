"use client";

import { useState, useEffect } from "react";
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Button, 
  DatePicker, 
  Checkbox, 
  Divider,
  Spin,
  message,
  Card,
  Tag,
  Alert,
  Space
} from 'antd';
import { 
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Therapist {
  _id: string;
  fullName: string;
  level: number;
  completedSessions: number;
}

interface Appointment {
  _id: string;
  date: string;
  plan: string;
  price: number;
  therapist: {
    fullName: string;
  };
}

const { Option } = Select;
const { TextArea } = Input;

export default function AddPaymentDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentDialogProps) {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [autoCalculated, setAutoCalculated] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTherapists();
      form.resetFields();
      setSelectedTherapist("");
      setSelectedAppointments([]);
      setAutoCalculated(false);
    }
  }, [open]);

  useEffect(() => {
    if (selectedTherapist) {
      fetchTherapistAppointments(selectedTherapist);
    }
  }, [selectedTherapist]);

  useEffect(() => {
    if (selectedAppointments.length > 0) {
      const totalAmount = calculateTotalAmount();
      form.setFieldsValue({ amount: totalAmount.toFixed(2) });
      setAutoCalculated(true);
    } else {
      setAutoCalculated(false);
    }
  }, [selectedAppointments]);

  const fetchTherapists = async () => {
    try {
      const response = await fetch("/api/admin/therapists");
      if (response.ok) {
        const data = await response.json();
        setTherapists(data);
      }
    } catch (error) {
      console.error("Error fetching therapists:", error);
      message.error("Failed to load therapists");
    }
  };

  const fetchTherapistAppointments = async (therapistId: string) => {
    try {
      setIsLoadingAppointments(true);
      const response = await fetch("/api/admin/appointments/completed-unpaid");
      if (response.ok) {
        const data = await response.json();
        const therapistAppointments = data.filter((apt: any) => 
          apt.therapist._id === therapistId
        );
        setAppointments(therapistAppointments);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      message.error("Failed to load appointments");
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const calculateTotalAmount = () => {
    if (selectedAppointments.length === 0) return 0;
    
    return appointments
      .filter(apt => selectedAppointments.includes(apt._id))
      .reduce((sum, apt) => sum + apt.price, 0);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoCalculated(false);
  };

  const handleSubmit = async (values: any) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          therapistId: selectedTherapist,
          amount: parseFloat(values.amount),
          appointments: selectedAppointments,
          notes: values.notes,
          paidAt: values.paidAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      message.success("Payment created successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      message.error(error.message || "Failed to create payment");
    } finally {
      setIsLoading(false);
    }
  };

  const getTherapistLevel = (therapistId: string) => {
    const therapist = therapists.find(t => t._id === therapistId);
    return therapist?.level === 2 ? "Level 2 (57%)" : "Level 1 (50%)";
  };

  return (
    <Modal
      title="Add New Payment"
      open={open}
      onCancel={() => onOpenChange(false)}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          paidAt: dayjs(),
          amount: "0.00"
        }}
      >
        <Form.Item
          name="therapist"
          label="Select Therapist"
          rules={[{ required: true, message: 'Please select a therapist!' }]}
        >
          <Select
            placeholder="Select a therapist"
            onChange={(value) => {
              setSelectedTherapist(value);
              setSelectedAppointments([]);
            }}
            loading={!therapists.length}
            optionLabelProp="label"
          >
            {therapists.map((therapist) => (
              <Option 
                key={therapist._id} 
                value={therapist._id}
                label={
                  <span>
                    <UserOutlined /> Dr. {therapist.fullName}
                  </span>
                }
              >
                <div className="flex justify-between">
                  <span>Dr. {therapist.fullName}</span>
                  <Tag color={therapist.level === 2 ? "blue" : "green"}>
                    {getTherapistLevel(therapist._id)}
                  </Tag>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedTherapist && (
          <Form.Item label="Select Appointments">
            <div className="border rounded p-2">
              <Spin spinning={isLoadingAppointments}>
                {appointments.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No completed appointments found
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {appointments.map((apt) => (
                      <Card 
                        key={apt._id} 
                        size="small" 
                        className="mb-2"
                        hoverable
                      >
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedAppointments.includes(apt._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAppointments([...selectedAppointments, apt._id]);
                              } else {
                                setSelectedAppointments(
                                  selectedAppointments.filter((id) => id !== apt._id)
                                );
                              }
                            }}
                            className="mr-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{apt.plan}</div>
                            <div className="text-gray-500">
                              {dayjs(apt.date).format('DD MMM YYYY, h:mm A')}
                            </div>
                            <div className="font-medium text-blue-600">
                              د.إ{apt.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Spin>
            </div>
          </Form.Item>
        )}

        <Form.Item
          name="amount"
          label="Payment Amount (د.إ)"
          rules={[{ required: true, message: 'Please enter payment amount!' }]}
        >
          <Input
            prefix={<DollarOutlined />}
            type="number"
            step="0.01"
            onChange={handleAmountChange}
          />
        </Form.Item>

        {autoCalculated && selectedAppointments.length > 0 && (
          <Alert
            message={`Amount auto-calculated from ${selectedAppointments.length} selected appointment(s)`}
            type="info"
            showIcon
            className="mb-4"
          />
        )}

        <Form.Item
          name="paidAt"
          label="Payment Date"
          rules={[{ required: true, message: 'Please select payment date!' }]}
        >
          <DatePicker 
            style={{ width: '100%' }}
            suffixIcon={<CalendarOutlined />}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea
            rows={4}
            placeholder="Add any notes about this payment..."
          />
        </Form.Item>

        <Divider />

        <Form.Item className="flex justify-end mb-0">
          <Space>
            <Button onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={isLoading}
              disabled={!selectedTherapist || selectedAppointments.length === 0}
            >
              Create Payment
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}