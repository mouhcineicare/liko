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
import EmailTemplateEnhanced from '@/lib/db/models/EmailTemplateEnhanced';
import connectDB from '../db/connect';
import User from '@/lib/db/models/User';

// Create SMTP transporter
const transporter = nodemailer.createTransporter({
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

// Enhanced email sending with recipient control
export async function sendEmailWithRecipients(templateType: string, data: any, customRecipients?: {
  patient?: string;
  therapist?: string;
  admin?: string;
  custom?: string[];
}) {
  try {
    await connectDB();
    
    const template = await EmailTemplateEnhanced.findOne({ 
      type: templateType, 
      isActive: true 
    });

    if (!template) {
      throw new Error(`Template ${templateType} not found or inactive`);
    }

    // Get recipient emails
    const recipients = await getRecipientEmails(data, template.recipients, customRecipients);
    
    // Prepare email content
    const emailContent = await prepareEmailContent(template, data);
    
    // Send to all recipients
    const sendPromises = recipients.map(email => 
      sendEmail(email, emailContent.subject, emailContent.html)
    );
    
    await Promise.all(sendPromises);
    
    return {
      success: true,
      sentTo: recipients,
      templateType
    };
    
  } catch (error) {
    console.error('Error sending email with recipients:', error);
    throw error;
  }
}

// Get recipient emails based on template settings
async function getRecipientEmails(data: any, recipients: any, customRecipients?: any): Promise<string[]> {
  const emails: string[] = [];
  
  // Patient email
  if (recipients.patient && data.patient?.email) {
    emails.push(data.patient.email);
  }
  if (customRecipients?.patient) {
    emails.push(customRecipients.patient);
  }
  
  // Therapist email
  if (recipients.therapist && data.therapist?.email) {
    emails.push(data.therapist.email);
  }
  if (customRecipients?.therapist) {
    emails.push(customRecipients.therapist);
  }
  
  // Admin emails
  if (recipients.admin) {
    const admins = await User.find({ role: 'admin' });
    admins.forEach(admin => emails.push(admin.email));
  }
  if (customRecipients?.admin) {
    emails.push(customRecipients.admin);
  }
  
  // Custom emails
  if (recipients.custom && recipients.custom.length > 0) {
    emails.push(...recipients.custom);
  }
  if (customRecipients?.custom && customRecipients.custom.length > 0) {
    emails.push(...customRecipients.custom);
  }
  
  // Remove duplicates
  return [...new Set(emails)];
}

// Prepare email content with variable replacement
async function prepareEmailContent(template: any, data: any) {
  let subject = template.subject;
  let content = template.content;
  let buttonLink = template.buttonLink;
  
  // Replace variables in subject
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, String(value));
  }
  
  // Replace variables in content
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    content = content.replace(regex, String(value));
  }
  
  // Replace variables in button link
  if (buttonLink) {
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      buttonLink = buttonLink.replace(regex, String(value));
    }
    
    // Replace environment variables
    buttonLink = buttonLink.replace(/\{\{process\.env\.NEXT_PUBLIC_BASE_URL\}\}/g, process.env.NEXT_PUBLIC_BASE_URL || '');
    
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
    content = content.replace(/\{\{button\}\}/g, buttonHtml);
  }
  
  return { subject, html: content };
}

// Enhanced email functions with recipient control
export async function sendPaymentConfirmationEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PaymentConfirmation', data, customRecipients);
}

export async function sendTherapistAssignmentEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('TherapistAssignment', data, customRecipients);
}

export async function sendPatientAssignmentEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PatientAssignment', data, customRecipients);
}

export async function sendAppointmentApprovalEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('AppointmentApproval', data, customRecipients);
}

export async function sendAppointmentStatusEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('AppointmentStatus', data, customRecipients);
}

export async function sendNewRegistrationEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('NewRegistration', data, customRecipients);
}

export async function sendAccountConfirmationEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('AccountConfirmation', data, customRecipients);
}

export async function sendNewAppointmentEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('NewAppointment', data, customRecipients);
}

export async function sendPaymentNotificationEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PaymentNotification', data, customRecipients);
}

export async function sendPaymentDetailsUpdateEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PaymentDetailsUpdate', data, customRecipients);
}

export async function sendTherapyChangeRequestEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('TherapyChangeRequest', data, customRecipients);
}

export async function sendPasswordResetEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PasswordReset', data, customRecipients);
}

export async function sendPasswordResetSuccessEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PasswordResetSuccess', data, customRecipients);
}

export async function sendPaymentReminderEmailEnhanced(data: any, customRecipients?: any) {
  return await sendEmailWithRecipients('PaymentReminder', data, customRecipients);
}
