import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
  } from '@react-email/components';
  
  interface PasswordResetSuccessEmailProps {
    name: string;
  }
  
  export default function PasswordResetSuccessEmail({
    name,
  }: PasswordResetSuccessEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Your iCare password has been reset</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Password Reset Successful</Heading>
            <Text style={text}>Hi {name},</Text>
            <Text style={text}>
              Your iCare account password has been successfully reset.
            </Text>
            <Text style={text}>
              If you didn't make this change or believe an unauthorized person has accessed your account, please contact our support team immediately.
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
  
  // Reuse the same styles from your other emails
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
  
  const footer = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '21px',
    margin: '20px 0',
  };