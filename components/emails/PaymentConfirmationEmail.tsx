import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Button,
    Section,
    Link,
  } from '@react-email/components';
  
  interface PaymentConfirmationEmailProps {
    patientName: string;
    appointmentDate: string;
    amount: number;
    plan: string;
  }
  
  export default function PaymentConfirmationEmail({
    patientName,
    appointmentDate,
    amount,
    plan,
  }: PaymentConfirmationEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Payment Confirmation for Your Therapy Session</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Payment Confirmation</Heading>
            <Text style={text}>Dear {patientName},</Text>
            <Text style={text}>
              Thank you for your payment. Your therapy session has been confirmed.
            </Text>
  
            <Section style={details}>
              <Text style={detailsText}>
                <strong>Plan:</strong> {plan}
              </Text>
              <Text style={detailsText}>
                <strong>Date:</strong> {appointmentDate}
              </Text>
              <Text style={detailsText}>
                <strong>Amount Paid:</strong> د.إ{amount}
              </Text>
            </Section>
  
            <Text style={text}>
              You can view your appointment details in your dashboard.
            </Text>
  
            <Button style={button} href={`${process.env.BASE_URL}/dashboard`}>
                View Appointment
            </Button>
  
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