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
  
  interface TherapistAssignmentEmailProps {
    therapistName: string;
    patientName: string;
    appointmentDate?: string;
    plan?: string;
  }
  
  export default function TherapistAssignmentEmail({
    therapistName,
    patientName,
    appointmentDate,
    plan,
  }: TherapistAssignmentEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>New Patient Assignment</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>New Patient Assignment</Heading>
            <Text style={text}>Dear Dr. {therapistName},</Text>
            <Text style={text}>
              You have been assigned a new patient for therapy sessions.
            </Text>
  
            <Section style={details}>
              <Text style={detailsText}>
                <strong>Patient:</strong> {patientName}
              </Text>
              {plan && <Text style={detailsText}>
                <strong>Plan:</strong> {plan}
              </Text>}
              {(appointmentDate && plan) && <Text style={detailsText}>
                <strong>Appointment Date:</strong> {appointmentDate}
              </Text>}
            </Section>
  
            <Text style={text}>
              Please review and approve this appointment in your dashboard.
            </Text>
  
           {(appointmentDate && plan) && <Button style={button} href={`${process.env.BASE_URL}/dashboard/therapist`}>
              Review Appointment
            </Button>}
  
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