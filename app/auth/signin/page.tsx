"use client";

import { useState, Suspense, useEffect } from "react";
import { Spin, Button, Form, Input, Alert, Card, Divider } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone, MailOutlined, LockOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import ReCAPTCHA from "react-google-recaptcha";

const { Item } = Form;
const { Password } = Input;

// Animated Email SVG Icon
const EmailIcon = ({ isActive }: { isActive: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-all duration-300"
  >
    <path
      d="M4 7L10.94 11.337C11.5885 11.7428 12.4115 11.7428 13.06 11.337L20 7"
      stroke={isActive ? "#3b82f6" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke={isActive ? "#3b82f6" : "#9ca3af"}
      strokeWidth="2"
      fill="none"
    />
    {isActive && (
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="#3b82f610"
        className="animate-pulse"
      />
    )}
  </svg>
);

// Animated Lock SVG Icon
const LockIcon = ({ isActive }: { isActive: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-all duration-300"
  >
    <rect
      x="5"
      y="11"
      width="14"
      height="10"
      rx="2"
      stroke={isActive ? "#3b82f6" : "#9ca3af"}
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
      stroke={isActive ? "#3b82f6" : "#9ca3af"}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle
      cx="12"
      cy="15"
      r="1"
      fill={isActive ? "#3b82f6" : "#9ca3af"}
      className="transition-all duration-300"
    />
    {isActive && (
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="#3b82f610"
        className="animate-pulse"
      />
    )}
  </svg>
);

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data } = useSession();
  const [form] = Form.useForm();
  const [emailSignIn, setEmailSignIn] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [emailActive, setEmailActive] = useState(false);
  const [passwordActive, setPasswordActive] = useState(false);

  const success = searchParams.get("success");
  const redirect = searchParams.get("redirect");
  const callbackUrl = searchParams.get("callbackUrl");
  const emailParam = searchParams.get("email");

  useEffect(() => {
    if (data?.expires) {
      // Use callbackUrl if available, otherwise default to dashboard
      router.push(callbackUrl || "/dashboard");
    }
  }, [data, router, callbackUrl]);

  // Pre-fill email if provided in URL
  useEffect(() => {
    if (emailParam) {
      form.setFieldsValue({ email: emailParam });
    }
  }, [emailParam, form]);

  const sendVerificationCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const email = form.getFieldValue("email").trim().toLowerCase();
      const res = await fetch("/api/auth/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send verification code");
      }

      setCodeSent(true);
      toast.success("Verification code sent to your email");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    setIsLoading(true);
    setError("");

    if (!captchaToken) {
      setError("Please complete the captcha verification");
      setIsLoading(false);
      return;
    }

    try {
      const email = form.getFieldValue("email").trim().toLowerCase();
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          code: verificationCode 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      const result = await signIn("credentials", {
        email,
        code: verificationCode,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Signed in successfully");
      router.push(callbackUrl || redirect || "/dashboard");
      router.refresh();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    setError("");

    if (!captchaToken) {
      setError("Please complete the captcha verification");
      setIsLoading(false);
      return;
    }

    try {
      const statusCheck = await fetch("/api/auth/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      const statusData = await statusCheck.json();

      if (statusData.status === "in_review") {
        router.push("/auth/in-review");
        return;
      }

      if (statusData.status === "banned") {
        throw new Error("Your account has been suspended. Please contact support.");
      }

      const result = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid email or password");
      }

      toast.success("Signed in successfully");
      router.push(callbackUrl || redirect || "/dashboard");
      router.refresh();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Suspense fallback={<Spin size="large" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />}>
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4">
        <Card 
          className="w-full max-w-md shadow-xl border-0 rounded-xl overflow-hidden"
          bodyStyle={{ padding: 0 }}
        >
          <Spin 
            spinning={isLoading} 
            size="large" 
            className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-50 flex items-center justify-center"
          >
            <div className="w-full p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Welcome back</h2>
                <p className="text-gray-600 mt-2">
                  {!emailSignIn ? "Sign in to your account" : "We'll send you a verification code"}
                </p>
              </div>

              {success && (
                <Alert 
                  message={success} 
                  type="success" 
                  showIcon 
                  className="mb-6" 
                  closable
                />
              )}

              {error && (
                <Alert 
                  message={error} 
                  type="error" 
                  showIcon 
                  className="mb-6" 
                  closable
                />
              )}

              <Form 
                form={form} 
                layout="vertical" 
                onFinish={emailSignIn ? (codeSent ? verifyCode : sendVerificationCode) : handleSubmit}
              >
                <Item
                  label="Email address"
                  name="email"
                  rules={[
                    { required: true, message: "Please input your email!" },
                    { type: "email", message: "Please enter a valid email!" },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="your@email.com"
                    disabled={codeSent}
                    prefix={<EmailIcon isActive={emailActive} />}
                    onFocus={() => setEmailActive(true)}
                    onBlur={() => setEmailActive(false)}
                  />
                </Item>

                {!emailSignIn && (
                  <Item
                    label="Password"
                    name="password"
                    rules={[{ required: true, message: "Please input your password!" }]}
                    className="mb-1"
                  >
                    <Password
                      size="large"
                      placeholder="••••••••"
                      iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                      prefix={<LockIcon isActive={passwordActive} />}
                      onFocus={() => setPasswordActive(true)}
                      onBlur={() => setPasswordActive(false)}
                    />
                  </Item>
                )}

                {codeSent && (
                  <Item
                    label="Verification Code"
                    rules={[{ required: true, message: "Please enter the code!" }]}
                  >
                    <Input
                      size="large"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.trim())}
                      prefix={<LockIcon isActive={true} />}
                      maxLength={6}
                    />
                  </Item>
                )}

                <div className="flex justify-between items-center mb-6">
                  {!emailSignIn && !codeSent && (
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}

                  {!codeSent && (
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                      onClick={() => {
                        setEmailSignIn(!emailSignIn);
                        setError("");
                      }}
                    >
                    </button>
                  )}
                </div>

                <div className="flex justify-center mb-4">
                  <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                    onChange={(token) => setCaptchaToken(token)}
                    className="transform scale-90"
                  />
                </div>

                <Item className="mb-4">
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-colors h-12 font-medium"
                    disabled={!captchaToken}
                  >
                    {codeSent ? "Verify Code" : emailSignIn ? "Send Verification Code" : "Sign in"}
                  </Button>
                </Item>

                <Divider plain className="text-gray-400 text-xs">or continue with</Divider>

                <div className="flex justify-center gap-4">
                  <Button 
                    icon={<MailOutlined />} 
                    className="flex items-center"
                    onClick={() => setEmailSignIn(true)}
                  >
                    Email code
                  </Button>
                  <Button 
                    icon={<LockOutlined />} 
                    className="flex items-center"
                    onClick={() => setEmailSignIn(false)}
                  >
                    Password
                  </Button>
                </div>
              </Form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <Link
                    href="/book-appointment" 
                    className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  <Link 
                    href="/become-a-therapy" 
                    className="text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Become a therapist
                  </Link>
                </p>
              </div>
            </div>
          </Spin>
        </Card>
      </div>
    </Suspense>
  );
}