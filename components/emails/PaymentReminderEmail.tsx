import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Hr } from '@react-email/components';

interface PaymentReminderEmailProps {
  patientName: string;
  therapistName: string;
  appointmentDate: string;
  reason: string;
  paymentUrl?: string;
  reminderType: 'first_reminder' | 'second_reminder' | 'final_reminder';
}

export default function PaymentReminderEmail({
  patientName,
  therapistName,
  appointmentDate,
  reason,
  paymentUrl,
  reminderType
}: PaymentReminderEmailProps) {
  const getSubject = () => {
    switch (reminderType) {
      case 'first_reminder':
        return 'Complete Payment for Your Session';
      case 'second_reminder':
        return 'Don\'t Miss Your Session - Payment Required';
      case 'final_reminder':
        return 'Last Chance - Complete Payment Now';
      default:
        return 'Payment Reminder';
    }
  };

  const getUrgencyColor = () => {
    switch (reminderType) {
      case 'first_reminder':
        return '#1890ff';
      case 'second_reminder':
        return '#fa8c16';
      case 'final_reminder':
        return '#f5222d';
      default:
        return '#1890ff';
    }
  };

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>iCare</Text>
          </Section>
          
          <Section style={content}>
            <Text style={greeting}>Hi {patientName},</Text>
            
            <Text style={message}>
              {reason}
            </Text>
            
            <Section style={appointmentDetails}>
              <Text style={detailLabel}>Appointment Details:</Text>
              <Text style={detailText}>Therapist: {therapistName}</Text>
              <Text style={detailText}>Date & Time: {appointmentDate}</Text>
            </Section>

            {paymentUrl && (
              <Section style={buttonContainer}>
                <Button style={{...button, backgroundColor: getUrgencyColor()}} href={paymentUrl}>
                  Pay Now
                </Button>
              </Section>
            )}

            <Text style={footer}>
              Complete your payment to secure your session. If you have any questions, please contact our support team.
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated message from iCare. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px 0',
  textAlign: 'center' as const,
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1890ff',
  margin: '0',
};

const content = {
  padding: '0 24px',
};

const greeting = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333333',
  margin: '0 0 16px',
};

const message = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333333',
  margin: '0 0 24px',
};

const appointmentDetails = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '8px',
  margin: '0 0 24px',
};

const detailLabel = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333333',
  margin: '0 0 8px',
};

const detailText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#666666',
  margin: '0 0 4px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#1890ff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  border: 'none',
  cursor: 'pointer',
};

const footer = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#666666',
  margin: '24px 0 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footerSection = {
  padding: '0 24px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#999999',
  margin: '0',
  textAlign: 'center' as const,
};
