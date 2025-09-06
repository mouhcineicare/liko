import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
  } from '@react-email/components';
  
  interface PaymentDetailsUpdateEmailProps {
    therapistName: string;
    updateType: string;
  }
  
  export default function PaymentDetailsUpdateEmail({
    therapistName,
    updateType,
  }: PaymentDetailsUpdateEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Payment Details Update Notification</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>Payment Details Update</Heading>
            <Text style={text}>Dear Admin,</Text>
            <Text style={text}>
              Dr. {therapistName} has updated their payment details.
            </Text>
  
            <Section style={details}>
              <Text style={detailsText}>
                <strong>Update Type:</strong> {updateType}
              </Text>
              <Text style={detailsText}>
                <strong>Updated At:</strong> {new Date().toLocaleString()}
              </Text>
            </Section>
  
            <Text style={text}>
              Please review the updated payment details in the admin dashboard.
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
  
  const footer = {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '21px',
    margin: '20px 0',
  };