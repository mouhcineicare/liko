"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Form, Input, Card, Typography, Alert, Spin } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import Link from "next/link";
import { toast } from "sonner";

const { Title, Text } = Typography;
const { Password } = Input;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password: values.password }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      setSuccess(true);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="text-center">
            <Title level={3} className="text-gray-800">Invalid Reset Link</Title>
            <Text type="secondary" className="block mt-2">
              The password reset link is invalid or has expired.
            </Text>
          </div>
          <div className="mt-6 text-center">
            <Link href="/auth/forgot-password">
              <Button type="link" className="text-blue-600 hover:text-blue-500">
                Request a new reset link
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <div className="text-center">
            <Title level={3} className="text-gray-800">Password Reset Successful</Title>
            <Text type="secondary" className="block mt-2">
              Your password has been updated successfully.
            </Text>
          </div>
          <div className="mt-6 text-center">
            <Link href="/auth/signin">
              <Button 
                type="primary" 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Sign in with your new password
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <Spin spinning={isLoading} size="large" className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 flex items-center justify-center">
          <div className="w-full">
            <div className="text-center mb-6">
              <Title level={3} className="text-gray-800">Reset Password</Title>
              <Text type="secondary" className="block mt-2">
                Enter your new password below
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="w-full"
            >
              <Form.Item
                label="New Password"
                name="password"
                rules={[
                  { required: true, message: "Please input your password!" },
                  { min: 8, message: "Password must be at least 8 characters" },
                ]}
              >
                <Password
                  size="large"
                  placeholder="••••••••"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item
                label="Confirm New Password"
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: "Please confirm your password!" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Password
                  size="large"
                  placeholder="••••••••"
                  iconRender={(visible) =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Reset Password
                </Button>
              </Form.Item>

              <div className="text-center mt-4">
                <Link href="/auth/signin">
                  <Button type="link" className="text-blue-600 hover:text-blue-500">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </Form>
          </div>
        </Spin>
      </Card>
    </div>
  );
}