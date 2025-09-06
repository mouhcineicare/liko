import { Body, Container, Head, Heading, Html, Preview, Text, Button } from '@react-email/components';

interface EmailSignInCodeProps {
  verificationCode: string;
}

export default function EmailSignInCode({ verificationCode }: EmailSignInCodeProps) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in code for iCare</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your Sign-In Code</Heading>
          <Text style={text}>
            Use this code to sign in to your iCare account:
          </Text>
          
          <Text style={code}>{verificationCode}</Text>
          
          <Text style={text}>
            This code will expire in 10 minutes. If you didn&apos;t request this, please ignore this email.
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
  
  const details = {
    backgroundColor: '#f9f9f9',
    padding: '20px',
    borderRadius: '5px',
    margin: '20px 0',
  };
  
  const detailsText = {
    margin: '10px 0',
    color: '#4a4a4a',
    fontSize: '14px',
    lineHeight: '21px',
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

const code = {
  display: 'inline-block',
  margin: '20px 0',
  padding: '16px 24px',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
};