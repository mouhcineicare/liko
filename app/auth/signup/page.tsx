"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Form, Input, Card, Typography, Alert, Spin } from "antd";
import ReCAPTCHA from "react-google-recaptcha";
import { message } from "antd";

const { Title, Text } = Typography;

export default function SignUp() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    setError("");

    if (!captchaToken) {
      setError("Please complete the captcha verification");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          role: "therapist",
          captchaToken,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to sign up");
      }

      message.success("Account created successfully");
      router.push("/auth/signin");
    } catch (error: any) {
      message.error(error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Title level={3}>Create Therapist Account</Title>
          <Text className="text-gray-600">
            Or{" "}
            <Link href="/auth/signin" className="text-blue-500 hover:text-blue-400">
              sign in to your account
            </Link>
          </Text>
        </div>

        <Alert
          message="Important"
          description={
            <Text className="text-sm">
              To ensure patient safety, all therapist accounts undergo verification. 
              Your account will be reviewed before access is granted. Please ensure 
              all provided information matches your official credentials.
            </Text>
          }
          type="info"
          showIcon
          className="mb-6"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="w-full"
        >
          <Form.Item
            label="Email address"
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please input your password!' },
              { min: 8, message: 'Password must be at least 8 characters!' }
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>

          <Form.Item
            label="Full Name"
            name="fullName"
            rules={[{ required: true, message: 'Please input your full name!' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item
            label="Telephone"
            name="telephone"
            rules={[
              { required: true, message: 'Please input your telephone number!' },
              { pattern: /^[0-9]+$/, message: 'Please enter valid phone number!' }
            ]}
          >
            <Input size="large" />
          </Form.Item>

          <div className="flex justify-center mb-4">
            <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
              onChange={(token) => setCaptchaToken(token)}
            />
          </div>

          {error && (
            <Alert message={error} type="error" showIcon className="mb-4" />
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              disabled={isLoading || !captchaToken}
              loading={isLoading}
            >
              Sign up
            </Button>
          </Form.Item>
        </Form>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 backdrop-blur-sm z-10">
            <Spin size="large" />
          </div>
        )}
      </Card>
    </div>
  );
}