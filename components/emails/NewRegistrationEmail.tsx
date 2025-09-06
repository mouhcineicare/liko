
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
  
  interface NewRegistrationEmailProps {
    adminName: string;
    userDetails: {
      name: string;
      email: string;
      role: string;
      registrationDate: string;
    };
  }
  
  export default function NewRegistrationEmail({
    adminName,
    userDetails,
  }: NewRegistrationEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>New User Registration Alert</Preview>
        <Body style={main}>
          <Container style={container}>
            <Heading style={h1}>New User Registration</Heading>
            <Text style={text}>Dear {adminName},</Text>
            <Text style={text}>
              A new user has registered on the iCare platform.
            </Text>
  
            <Section style={details}>
              <Text style={detailsText}>
                <strong>Name:</strong> {userDetails.name}
              </Text>
              <Text style={detailsText}>
                <strong>Email:</strong> {userDetails.email}
              </Text>
              <Text style={detailsText}>
                <strong>Role:</strong> {userDetails.role}
              </Text>
              <Text style={detailsText}>
                <strong>Registration Date:</strong> {userDetails.registrationDate}
              </Text>
            </Section>
  
            <Button style={button} href={`${process.env.BASE_URL}/dashboard/admin/users`}>
                 View user Details
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