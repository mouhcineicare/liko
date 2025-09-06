'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, Button, Card, Typography } from 'antd'
import { HomeOutlined, LoginOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

const { Title, Text } = Typography

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    // Log error for debugging
    if (error) {
      console.error('Authentication error:', error)
    }
  }, [error])

  const getErrorMessage = () => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        return 'Your email is already associated with another account. Please sign in with the original provider.'
      case 'AccessDenied':
        return 'You do not have permission to access this resource.'
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
      case 'OAuthAccountNotLinked':
        return 'There was a problem with the authentication provider. Please try again.'
      case 'EmailSignin':
        return 'There was a problem sending the verification email.'
      case 'CredentialsSignin':
        return 'Invalid credentials. Please check your email and password.'
      case 'SessionRequired':
        return 'Please sign in to access this page.'
      case 'Default':
      default:
        return 'An unexpected error occurred during authentication. Please try again.'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <Title level={2} className="mb-2">
            Authentication Error
          </Title>
          <Text type="secondary">
            We encountered an issue while trying to authenticate your account.
          </Text>
        </div>

        <Alert
          message="Error Details"
          description={getErrorMessage()}
          type="error"
          showIcon
          className="mb-6"
        />

        <div className="flex flex-col space-y-3">
          <Button
            type="primary"
            icon={<LoginOutlined />}
            size="large"
            onClick={() => signIn(undefined, { callbackUrl: '/' })}
            block
          >
            Try Signing In Again
          </Button>

          <Link href="/" passHref>
            <Button icon={<HomeOutlined />} size="large" block>
              Return Home
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Text>
            If the problem persists, please contact our support team.
          </Text>
        </div>
      </Card>
    </div>
  )
}