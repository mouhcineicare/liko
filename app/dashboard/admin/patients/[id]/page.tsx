"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Card, 
  Avatar, 
  Tag, 
  Tabs, 
  Descriptions, 
  Spin, 
  message,
  Divider,
  Typography,
  List,
  Badge
} from 'antd';
import { 
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SmileOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Title, Text } = Typography;

interface PatientDetails {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  image: string | null;
  status: string;
  createdAt: string;
  onboarding?: {
    responses: Array<{
      questionId: string;
      question: string;
      answer: string | string[] | boolean;
      type: string;
    }>;
  };
  appointments: Array<{
    _id: string;
    date: string;
    status: string;
    paymentStatus: string;
    plan: string;
    price: number;
    therapist?: {
      fullName: string;
      image: string;
    };
  }>;
}

export default function PatientDetailsPage() {
  const params = useParams();
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPatientDetails();
  }, []);

  const fetchPatientDetails = async () => {
    try {
      const response = await fetch(`/api/admin/patients/${params.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch patient details");
      }
      const data = await response.json();
      setPatient(data);
    } catch (error) {
      console.error("Error fetching patient details:", error);
      message.error("Failed to load patient details");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "banned":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      case "pending_approval":
        return "warning";
      case "approved":
        return "processing";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="text-center">
          <WarningOutlined className="text-3xl text-red-500 mb-4" />
          <Title level={4}>Patient Not Found</Title>
          <Text type="secondary">The requested patient could not be found.</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title level={2}>Patient Details</Title>

      <Card className="mt-6">
        <div className="flex items-start gap-6">
          <Avatar size={96} src={patient.image} icon={<UserOutlined />} />
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Title level={3} className="mb-0">{patient.fullName}</Title>
              <Tag color={getStatusColor(patient.status)}>
                {patient.status}
              </Tag>
            </div>
            <Text type="secondary" className="block">{patient.email}</Text>
            <Text type="secondary" className="block">{patient.telephone}</Text>
            <Text type="secondary">
              Member since {dayjs(patient.createdAt).format("MMMM D, YYYY")}
            </Text>
          </div>
        </div>
      </Card>

      <Tabs defaultActiveKey="onboarding" className="mt-6">
        <TabPane 
          tab={
            <span>
              <SmileOutlined className="mr-2" />
              Onboarding Responses
            </span>
          } 
          key="onboarding"
        >
          <Card>
            {patient.onboarding ? (
              <List
                dataSource={patient.onboarding.responses}
                renderItem={(response) => (
                  <List.Item>
                    <div className="w-full">
                      <Text strong className="block">{response.question}</Text>
                      {Array.isArray(response.answer) ? (
                        <ul className="list-disc pl-5 mt-2">
                          {response.answer.map((item, i) => (
                            <li key={i}>
                              <Text>{item}</Text>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Text>
                          {typeof response.answer === "boolean"
                            ? response.answer ? "Yes" : "No"
                            : response.answer}
                        </Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-6">
                <Text type="secondary">No onboarding responses available</Text>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <CalendarOutlined className="mr-2" />
              Appointments
            </span>
          } 
          key="appointments"
        >
          <Card>
            {patient.appointments.length > 0 ? (
              <List
                dataSource={patient.appointments}
                renderItem={(appointment) => (
                  <List.Item>
                    <Card className="w-full" hoverable>
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CalendarOutlined className="text-blue-500" />
                            <Text>{dayjs(appointment.date).format("MMMM D, YYYY")}</Text>
                          </div>
                          <div className="flex items-center gap-2">
                            <ClockCircleOutlined className="text-blue-500" />
                            <Text>{dayjs(appointment.date).format("h:mm A")}</Text>
                          </div>
                          <Text>{appointment.plan}</Text>
                          <Text strong className="text-blue-600">
                            د.إ{appointment.price}
                          </Text>
                          {appointment.therapist && (
                            <div className="flex items-center gap-2">
                              <Avatar size="small" src={appointment.therapist.image} />
                              <Text>Dr. {appointment.therapist.fullName}</Text>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Tag color={getAppointmentStatusColor(appointment.status)}>
                            {appointment.status.replace("_", " ")}
                          </Tag>
                          <Badge
                            status={appointment.paymentStatus === "completed" ? "success" : "error"}
                            text={appointment.paymentStatus}
                          />
                        </div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-6">
                <CalendarOutlined className="text-3xl text-gray-400 mb-4" />
                <Title level={4}>No Appointments</Title>
                <Text type="secondary">
                  This patient hasn&apos;t booked any appointments yet.
                </Text>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}