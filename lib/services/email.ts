import nodemailer from 'nodemailer';
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
import { renderAsync } from '@react-email/render';
import EmailTemplate from '@/lib/db/models/EmailTemplate';
import connectDB from '../db/connect';

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"iCare" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
  } catch (error) {
    throw error;
  }
}

// Helper function to render custom template
async function renderCustomTemplate(templateType: string, data: any) {
  try {
    await connectDB();
    const template = await EmailTemplate.findOne({ 
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

      const buttonHtml = `
        <div style="margin: 20px 0; text-align: center;">
          <a href="${buttonLink}" 
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

export async function sendPaymentConfirmationEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PaymentConfirmation', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PaymentConfirmation', isActive: true });
      const subject = template?.subject || 'Payment Confirmation - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PaymentConfirmationEmail({ ...data }));
    await sendEmail(to, 'Payment Confirmation - iCare', html);
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
  }
}

export async function sendSignInCodeEmail(to: string, code: string) {
  try {
    const html = await renderAsync(EmailSigninCode({ verificationCode: code }));
    await sendEmail(to, 'Your iCare Sign-In Code', html);
  } catch (error) {
    console.error('Error sending sign-in code email:', error);
  }
}

export async function sendTherapistAssignmentEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('TherapistAssignment', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'TherapistAssignment', isActive: true });
      const subject = template?.subject || 'New Patient Assignment - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(TherapistAssignmentEmail({ ...data }));
    await sendEmail(to, 'New Patient Assignment - iCare', html);
  } catch (error) {
    console.error('Error sending therapist assignment email:', error);
  }
}

export async function sendPatientAssignmentEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PatientAssignment', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PatientAssignment', isActive: true });
      const subject = template?.subject || 'New Therapist Assignment - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PatientAssignmentEmail({ ...data }));
    await sendEmail(to, 'New Therapist Assignment - iCare', html);
  } catch (error) {
    console.error('Error sending Patient assignment email:', error);
  }
}

export async function sendNewRegistrationEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('NewRegistration', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'NewRegistration', isActive: true });
      const subject = template?.subject || 'New User Registration - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(NewRegistrationEmail({ ...data }));
    await sendEmail(to, 'New User Registration - iCare', html);
  } catch (error) {
    console.error('Error sending new registration email:', error);
  }
}

export async function sendAppointmentApprovalEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('AppointmentApproval', {
      ...data,
      button: 'Join Appointment'
    });
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'AppointmentApproval', isActive: true });
      const subject = template?.subject || 'Appointment Approved - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(AppointmentApprovalEmail({ ...data }));
    await sendEmail(to, 'Appointment Approved - iCare', html);
  } catch (error) {
    console.error('Error sending appointment approval email:', error);
  }
}

export async function sendAppointmentStatusEmail(to: string, status: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('AppointmentStatus', {
      ...data,
      status
    });
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'AppointmentStatus', isActive: true });
      const subject = template?.subject || `Appointment ${status} - iCare`;
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(AppointmentStatusEmail({ status, ...data }));
    await sendEmail(to, `Appointment ${status} - iCare`, html);
  } catch (error) {
    console.error('Error sending appointment status email:', error);
  }
}

export async function sendAccountConfirmationEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('AccountConfirmation', {
      ...data,
      button: 'Confirm Account'
    });
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'AccountConfirmation', isActive: true });
      const subject = template?.subject || 'Confirm Your Account - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(AccountConfirmationEmail({ ...data }));
    await sendEmail(to, 'Confirm Your Account - iCare', html);
  } catch (error) {
    console.error('Error sending account confirmation email:', error);
  }
}

export async function sendNewAppointmentEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('NewAppointment', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'NewAppointment', isActive: true });
      const subject = template?.subject || 'New Appointment Created - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(NewAppointmentEmail({ ...data }));
    await sendEmail(to, 'New Appointment Created - iCare', html);
  } catch (error) {
    console.error('Error sending new appointment email:', error);
  }
}

export async function sendPaymentNotificationEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PaymentNotification', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PaymentNotification', isActive: true });
      const subject = template?.subject || 'Payment Notification - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PaymentNotificationEmail({ ...data }));
    await sendEmail(to, 'Payment Notification - iCare', html);
  } catch (error) {
    console.error('Error sending payment notification email:', error);
  }
}

export async function sendPaymentDetailsUpdateEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PaymentDetailsUpdate', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PaymentDetailsUpdate', isActive: true });
      const subject = template?.subject || 'Payment Details Update - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PaymentDetailsUpdateEmail({ ...data }));
    await sendEmail(to, 'Payment Details Update - iCare', html);
  } catch (error) {
    console.error('Error sending payment details update email:', error);
  }
}

export async function sendTherapyChangeRequestEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('TherapyChangeRequest', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'TherapyChangeRequest', isActive: true });
      const subject = template?.subject || 'Therapy Change Request - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(TherapyChangeRequestEmail({ ...data }));
    await sendEmail(to, 'Therapy Change Request - iCare', html);
  } catch (error) {
    console.error('Error sending therapy change request email:', error);
  }
}

export async function sendPasswordResetEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PasswordReset', {
      ...data,
      button: 'Reset Password'
    });
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PasswordReset', isActive: true });
      const subject = template?.subject || 'Reset Password Request - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PasswordResetEmail({ ...data }));
    await sendEmail(to, 'Reset Password Request - iCare', html);
  } catch (error) {
    console.error('Error sending password change request email:', error);
  }
}

export async function sendPasswordResetSuccessEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PasswordResetSuccess', data);
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PasswordResetSuccess', isActive: true });
      const subject = template?.subject || 'Password Reset Success - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PasswordResetSuccessEmail({ ...data }));
    await sendEmail(to, 'Password Reset Success - iCare', html);
  } catch (error) {
    console.error('Error sending password change success request email:', error);
  }
}

export async function sendPaymentReminderEmail(to: string, data: any) {
  try {
    const customHtml = await renderCustomTemplate('PaymentReminder', {
      ...data,
      button: 'Pay Now'
    });
    if (customHtml) {
      const template = await EmailTemplate.findOne({ type: 'PaymentReminder', isActive: true });
      const subject = template?.subject || 'Payment Reminder - iCare';
      await sendEmail(to, subject, customHtml);
      return;
    }

    const html = await renderAsync(PaymentReminderEmail({ ...data }));
    await sendEmail(to, 'Payment Reminder - iCare', html);
  } catch (error) {
    console.error('Error sending payment reminder email:', error);
  }
}