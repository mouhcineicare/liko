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
  } from '@react-email/components';
  
  interface PaymentNotificationEmailProps {
    therapistName: string;
    amount: number;
    appointmentCount: number;
    paidAt: string;
  }
  
  export default function PaymentNotificationEmail({
    therapistName,
    amount,
    appointmentCount,
    paidAt,
  }: PaymentNotificationEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Payment Notification</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Payment Notification</Heading>
            <Text style={text}>Dear Dr. {therapistName},</Text>
            <Text style={text}>
              A payment has been processed for your completed therapy sessions.
            </Text>
  
            <Section style={details}>
              <Text style={detailsText}>
                <strong>Amount:</strong> د.إ{amount.toFixed(2)}
              </Text>
              <Text style={detailsText}>
                <strong>Sessions Covered:</strong> {appointmentCount}
              </Text>
              <Text style={detailsText}>
                <strong>Payment Date:</strong> {paidAt}
              </Text>
            </Section>
  
            <Text style={text}>
              The payment will be processed according to your provided payment details.
            </Text>
  
            <Button style={button} href="https://icarewellbeing.com/dashboard/therapist/payments">
              View Payment Details
            </Button>
  
            <Text style={footer}>
              Best regards,<br />
              The iCareWellBeing Team
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