import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Button,
    Link,
  } from '@react-email/components';
  
  interface PasswordResetEmailProps {
    name: string;
    resetLink: string;
  }
  
  export default function PasswordResetEmail({
    name,
    resetLink,
  }: PasswordResetEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Reset your iCare password</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Password Reset Request</Heading>
            <Text style={text}>Hi {name},</Text>
            <Text style={text}>
              We received a request to reset your iCare account password. Click the button below to reset it.
            </Text>
  
            <Button style={button} href={resetLink}>
              Reset Password
            </Button>
  
            <Text style={text}>
              If you didn&apos;t request this password reset, you can safely ignore this email.
            </Text>
  
            <Text style={text}>
              Button not working? Copy and paste this link into your browser:<br />
              <Link style={{ color: '#3b82f6', textDecoration: 'none' }} href={resetLink}>
                {resetLink}
              </Link>
            </Text>
  
            <Text style={text}>
              This link will expire in 1 hour.
            </Text>
  
            <Text style={footer}>
              Best regards,<br />
              The iCare Team
            </Text>
          </Container>
        </Body>
      </Html>
    );
  }
  
  // Reuse the same styles from your AccountConfirmationEmail
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  };
  
  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    borderRadius: '5px',
    maxWidth: '600px',
  };
  
  const h1 = {
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0 0 20px',
  };
  
  const text = {
    color: '#4a4a4a',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 20px',
  };
  
  const button = {
    backgroundColor: '#3b82f6',
    borderRadius: '5px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '100%',
    padding: '12px',
    margin: '20px 0',
  };
  
  const footer = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '21px',
    margin: '20px 0',
  };