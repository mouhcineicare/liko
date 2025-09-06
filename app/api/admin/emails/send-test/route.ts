import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailTemplateEnhanced from '@/lib/db/models/EmailTemplateEnhanced';
import { 
  sendPaymentReminderEmailWithTracking,
  sendAppointmentStatusEmailWithTracking,
  sendPaymentConfirmationEmailWithTracking,
  sendTherapistAssignmentEmailWithTracking,
  sendPatientAssignmentEmailWithTracking,
  sendNewRegistrationEmailWithTracking,
  sendAccountConfirmationEmailWithTracking,
  sendNewAppointmentEmailWithTracking,
  sendPaymentNotificationEmailWithTracking,
  sendPasswordResetEmailWithTracking
} from '@/lib/services/email-tracking';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, testEmail, testData } = body;

    if (!templateId || !testEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const template = await EmailTemplateEnhanced.findById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Default test data
    const defaultTestData = {
      patientName: 'John Doe',
      therapistName: 'Dr. Jane Smith',
      appointmentDate: new Date().toLocaleString(),
      amount: '150 AED',
      reason: 'This is a test email to verify the template works correctly.',
      paymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment?appointmentId=test123`,
      reminderType: 'first_reminder',
      reminderTitle: 'Test Reminder',
      reminderMessage: 'This is a test reminder email.',
      buttonText: 'Test Button',
      buttonColor: '#1890ff',
      urgencyColor: '#1890ff',
      additionalMessage: 'This is a test email.',
      timeRemaining: '24 hours until your session'
    };

    const finalTestData = { ...defaultTestData, ...testData };

    // Send test email based on template type with tracking
    let result;
    switch (template.type) {
      case 'PaymentReminder':
        result = await sendPaymentReminderEmailWithTracking(testEmail, finalTestData, 'test123', 'first_reminder');
        break;
      case 'PaymentConfirmation':
        result = await sendPaymentConfirmationEmailWithTracking(testEmail, finalTestData, 'test123');
        break;
      case 'AppointmentStatus':
        result = await sendAppointmentStatusEmailWithTracking(testEmail, 'test_status', finalTestData, 'test123');
        break;
      case 'TherapistAssignment':
        result = await sendTherapistAssignmentEmailWithTracking(testEmail, finalTestData, 'test123');
        break;
      case 'PatientAssignment':
        result = await sendPatientAssignmentEmailWithTracking(testEmail, finalTestData, 'test123');
        break;
      case 'NewRegistration':
        result = await sendNewRegistrationEmailWithTracking(testEmail, finalTestData);
        break;
      case 'AccountConfirmation':
        result = await sendAccountConfirmationEmailWithTracking(testEmail, finalTestData);
        break;
      case 'NewAppointment':
        result = await sendNewAppointmentEmailWithTracking(testEmail, finalTestData, 'test123');
        break;
      case 'PaymentNotification':
        result = await sendPaymentNotificationEmailWithTracking(testEmail, finalTestData);
        break;
      case 'PasswordReset':
        result = await sendPasswordResetEmailWithTracking(testEmail, finalTestData);
        break;
      default:
        // For other template types, use the generic appointment status email
        result = await sendAppointmentStatusEmailWithTracking(testEmail, 'test', finalTestData, 'test123');
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      templateType: template.type,
      tracking: result,
      logId: result.logId
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
