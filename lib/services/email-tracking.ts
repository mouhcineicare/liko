import nodemailer from 'nodemailer';
import { renderAsync } from '@react-email/render';
import EmailTemplateEnhanced from '@/lib/db/models/EmailTemplateEnhanced';
import EmailLog from '@/lib/db/models/EmailLog';
import connectDB from '../db/connect';
import { 
  PaymentConfirmationEmail,
  TherapistAssignmentEmail,
  NewRegistrationEmail,
  AppointmentApprovalEmail,
  AppointmentStatusEmail,
  AccountConfirmationEmail,
  NewAppointmentEmail,
  PaymentNotificationEmail,
  PaymentDetailsUpdateEmail,
  PasswordResetEmail,
  PasswordResetSuccessEmail,
  PatientAssignmentEmail,
  EmailSigninCode
} from '@/components/emails';
import PaymentReminderEmail from '@/components/emails/PaymentReminderEmail';
import TherapyChangeRequestEmail from '@/components/emails/TherapyChangeRequestEmail';

// Create SMTP transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Enhanced email sending with tracking
export async function sendEmailWithTracking(
  to: string, 
  subject: string, 
  html: string, 
  trackingData: {
    templateType: string;
    recipientName: string;
    appointmentId?: string;
    reminderType?: string;
  }
) {
  try {
    await connectDB();

    // Create email log entry
    const emailLog = await EmailLog.create({
      templateType: trackingData.templateType as any,
      recipientEmail: to,
      recipientName: trackingData.recipientName,
      subject,
      sentAt: new Date(),
      status: 'sent',
      appointmentId: trackingData.appointmentId,
      reminderType: trackingData.reminderType as any,
      metadata: {
        deliveryAttempts: 1
      }
    });

    // Add tracking pixel to HTML
    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_BASE_URL}/api/email/track/open/${emailLog._id}" width="1" height="1" style="display:none;" />`;
    const htmlWithTracking = html + trackingPixel;

    // Send email
    await transporter.sendMail({
      from: `"iCare" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlWithTracking
    });

    // Update status to delivered
    await EmailLog.findByIdAndUpdate(emailLog._id, {
      status: 'delivered'
    });

    console.log(`✅ Email sent successfully to ${to} (Log ID: ${emailLog._id})`);
    return { 
      success: true, 
      status: 'sent', 
      logId: emailLog._id 
    };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error);
    
    // Update email log with error
    if (trackingData) {
      await EmailLog.findOneAndUpdate(
        { recipientEmail: to, subject },
        {
          status: 'failed',
          errorMessage: error.message,
          $inc: { 'metadata.deliveryAttempts': 1 }
        }
      );
    }

    return { 
      success: false, 
      status: 'failed', 
      error: error.message 
    };
  }
}

// Helper function to render custom template with tracking
async function renderCustomTemplateWithTracking(templateType: string, data: any, trackingData: any) {
  try {
    await connectDB();
    const template = await EmailTemplateEnhanced.findOne({ 
      type: templateType, 
      isActive: true 
    });

    if (!template) return null;

    // Replace variables in content
    let content = template.content;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      content = content.replace(regex, String(value));
    }

    // Replace button link if exists
    if (template.buttonLink) {
      let buttonLink = template.buttonLink;
      // Replace any variables in the button link
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        buttonLink = buttonLink.replace(regex, String(value));
      }
      
      // Replace environment variables
      buttonLink = buttonLink.replace(/\${process\.env\.NEXT_PUBLIC_BASE_URL}/g, process.env.NEXT_PUBLIC_BASE_URL || '');

      // Add click tracking to button
      const clickTrackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/email/track/click/${trackingData.logId}?url=${encodeURIComponent(buttonLink)}`;

      const buttonHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <a href="${clickTrackingUrl}" 
             style="background-color: #1890ff; 
                    color: white; 
                    padding: 10px 20px; 
                    text-decoration: none; 
                    border-radius: 4px;
                    font-weight: bold;">
            ${template.buttonText || 'Click Here'}
          </a>
        </div>
      `;
      content = content.replace(/\${button}/g, buttonHtml);
    }

    return content;
  } catch (error) {
    console.error('Error rendering custom template:', error);
    return null;
  }
}

// Enhanced email functions with tracking
export async function sendPaymentConfirmationEmailWithTracking(to: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'PaymentConfirmation',
      recipientName: data.patientName || 'Patient',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('PaymentConfirmation', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'PaymentConfirmation', isActive: true });
      const subject = template?.subject || 'Payment Confirmation - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(PaymentConfirmationEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Payment Confirmation - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    throw error;
  }
}

export async function sendPaymentReminderEmailWithTracking(to: string, data: any, appointmentId?: string, reminderType?: string) {
  try {
    const trackingData = {
      templateType: 'PaymentReminder',
      recipientName: data.patientName || 'Patient',
      appointmentId,
      reminderType
    };

    const customHtml = await renderCustomTemplateWithTracking('PaymentReminder', {
      ...data,
      button: 'Pay Now'
    }, trackingData);
    
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'PaymentReminder', isActive: true });
      const subject = template?.subject || 'Payment Reminder - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(PaymentReminderEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Payment Reminder - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending payment reminder email:', error);
    throw error;
  }
}

export async function sendTherapistAssignmentEmailWithTracking(to: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'TherapistAssignment',
      recipientName: data.therapistName || 'Therapist',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('TherapistAssignment', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'TherapistAssignment', isActive: true });
      const subject = template?.subject || 'New Patient Assignment - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(TherapistAssignmentEmail({ ...data }));
    return await sendEmailWithTracking(to, 'New Patient Assignment - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending therapist assignment email:', error);
    throw error;
  }
}

export async function sendPatientAssignmentEmailWithTracking(to: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'PatientAssignment',
      recipientName: data.patientName || 'Patient',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('PatientAssignment', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'PatientAssignment', isActive: true });
      const subject = template?.subject || 'New Therapist Assignment - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(PatientAssignmentEmail({ ...data }));
    return await sendEmailWithTracking(to, 'New Therapist Assignment - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending patient assignment email:', error);
    throw error;
  }
}

export async function sendAppointmentApprovalEmailWithTracking(to: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'AppointmentApproval',
      recipientName: data.patientName || 'Patient',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('AppointmentApproval', {
      ...data,
      button: 'Join Appointment'
    }, trackingData);
    
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'AppointmentApproval', isActive: true });
      const subject = template?.subject || 'Appointment Approved - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(AppointmentApprovalEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Appointment Approved - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending appointment approval email:', error);
    throw error;
  }
}

export async function sendAppointmentStatusEmailWithTracking(to: string, status: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'AppointmentStatus',
      recipientName: data.patientName || 'Patient',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('AppointmentStatus', {
      ...data,
      status
    }, trackingData);
    
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'AppointmentStatus', isActive: true });
      const subject = template?.subject || `Appointment ${status} - iCare`;
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(AppointmentStatusEmail({ status, ...data }));
    return await sendEmailWithTracking(to, `Appointment ${status} - iCare`, html, trackingData);
  } catch (error) {
    console.error('Error sending appointment status email:', error);
    throw error;
  }
}

export async function sendNewRegistrationEmailWithTracking(to: string, data: any) {
  try {
    const trackingData = {
      templateType: 'NewRegistration',
      recipientName: data.adminName || 'Admin'
    };

    const customHtml = await renderCustomTemplateWithTracking('NewRegistration', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'NewRegistration', isActive: true });
      const subject = template?.subject || 'New User Registration - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(NewRegistrationEmail({ ...data }));
    return await sendEmailWithTracking(to, 'New User Registration - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending new registration email:', error);
    throw error;
  }
}

export async function sendAccountConfirmationEmailWithTracking(to: string, data: any) {
  try {
    const trackingData = {
      templateType: 'AccountConfirmation',
      recipientName: data.name || 'User'
    };

    const customHtml = await renderCustomTemplateWithTracking('AccountConfirmation', {
      ...data,
      button: 'Confirm Account'
    }, trackingData);
    
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'AccountConfirmation', isActive: true });
      const subject = template?.subject || 'Confirm Your Account - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(AccountConfirmationEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Confirm Your Account - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending account confirmation email:', error);
    throw error;
  }
}

export async function sendNewAppointmentEmailWithTracking(to: string, data: any, appointmentId?: string) {
  try {
    const trackingData = {
      templateType: 'NewAppointment',
      recipientName: data.patientName || 'Patient',
      appointmentId
    };

    const customHtml = await renderCustomTemplateWithTracking('NewAppointment', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'NewAppointment', isActive: true });
      const subject = template?.subject || 'New Appointment Created - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(NewAppointmentEmail({ ...data }));
    return await sendEmailWithTracking(to, 'New Appointment Created - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending new appointment email:', error);
    throw error;
  }
}

export async function sendPaymentNotificationEmailWithTracking(to: string, data: any) {
  try {
    const trackingData = {
      templateType: 'PaymentNotification',
      recipientName: data.therapistName || 'Therapist'
    };

    const customHtml = await renderCustomTemplateWithTracking('PaymentNotification', data, trackingData);
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'PaymentNotification', isActive: true });
      const subject = template?.subject || 'Payment Notification - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(PaymentNotificationEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Payment Notification - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending payment notification email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmailWithTracking(to: string, data: any) {
  try {
    const trackingData = {
      templateType: 'PasswordReset',
      recipientName: data.name || 'User'
    };

    const customHtml = await renderCustomTemplateWithTracking('PasswordReset', {
      ...data,
      button: 'Reset Password'
    }, trackingData);
    
    if (customHtml) {
      const template = await EmailTemplateEnhanced.findOne({ type: 'PasswordReset', isActive: true });
      const subject = template?.subject || 'Reset Password Request - iCare';
      return await sendEmailWithTracking(to, subject, customHtml, trackingData);
    }

    const html = await renderAsync(PasswordResetEmail({ ...data }));
    return await sendEmailWithTracking(to, 'Reset Password Request - iCare', html, trackingData);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
