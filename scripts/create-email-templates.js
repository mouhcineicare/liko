const mongoose = require('mongoose');
require('dotenv').config();

// Email Template Schema
const EmailTemplateSchema = new mongoose.Schema({
  name: String,
  type: String,
  subject: String,
  content: String,
  buttonLink: String,
  buttonText: String,
  isActive: Boolean,
  variables: [String]
}, { timestamps: true });

const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);

// Template definitions
const emailTemplates = [
  {
    name: 'Payment Confirmation',
    type: 'PaymentConfirmation',
    subject: 'Payment Confirmed - Your Session is Booked',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Payment Confirmed!</h2>
        <p>Hi {{patientName}},</p>
        <p>Great news! Your payment has been successfully processed and your therapy session is now confirmed.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Date & Time:</strong> {{appointmentDate}}</p>
          <p><strong>Amount Paid:</strong> {{amount}} AED</p>
          <p><strong>Plan:</strong> {{plan}}</p>
        </div>
        
        <p>You will receive a confirmation email from your therapist with meeting details soon.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['patientName', 'appointmentDate', 'amount', 'plan'],
    isActive: true
  },
  {
    name: 'Therapist Assignment',
    type: 'TherapistAssignment',
    subject: 'New Patient Assigned - {{patientName}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">New Patient Assignment</h2>
        <p>Hi {{therapistName}},</p>
        <p>You have been assigned a new patient for therapy sessions.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Patient Details:</h3>
          <p><strong>Name:</strong> {{patientName}}</p>
          <p><strong>Appointment Date:</strong> {{appointmentDate}}</p>
          <p><strong>Plan:</strong> {{plan}}</p>
        </div>
        
        <p>Please log into your dashboard to review the patient's information and prepare for the session.</p>
        <p>If you have any questions or concerns, please contact the admin team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['therapistName', 'patientName', 'appointmentDate', 'plan'],
    isActive: true
  },
  {
    name: 'Patient Assignment',
    type: 'PatientAssignment',
    subject: 'Your Therapist Has Been Assigned',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Therapist Assigned!</h2>
        <p>Hi {{patientName}},</p>
        <p>Great news! We've found the perfect therapist for you.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Therapist:</h3>
          <p><strong>Name:</strong> {{therapistName}}</p>
          <p><strong>Appointment Date:</strong> {{appointmentDate}}</p>
          <p><strong>Plan:</strong> {{plan}}</p>
        </div>
        
        <p>Your therapist will contact you soon with session details and meeting information.</p>
        <p>If you have any questions, please don't hesitate to reach out to our support team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['patientName', 'therapistName', 'appointmentDate', 'plan'],
    isActive: true
  },
  {
    name: 'Appointment Approval',
    type: 'AppointmentApproval',
    subject: 'Your Session is Confirmed - Join Now',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Session Confirmed!</h2>
        <p>Hi {{patientName}},</p>
        <p>Your therapy session with {{therapistName}} has been confirmed and is ready to begin.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Date & Time:</strong> {{appointmentDate}}</p>
          <p><strong>Therapist:</strong> {{therapistName}}</p>
          <p><strong>Meeting Link:</strong> {{meetingLink}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{meetingLink}}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Join Session
          </a>
        </div>
        
        <p>Please join the session a few minutes early to ensure everything is working properly.</p>
        <p>If you experience any technical issues, please contact support immediately.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    buttonLink: '{{meetingLink}}',
    buttonText: 'Join Session',
    variables: ['patientName', 'therapistName', 'appointmentDate', 'meetingLink'],
    isActive: true
  },
  {
    name: 'Appointment Status Update',
    type: 'AppointmentStatus',
    subject: 'Appointment Status Update - {{status}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Appointment Status Update</h2>
        <p>Hi {{patientName}},</p>
        <p>Your appointment status has been updated to: <strong>{{status}}</strong></p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details:</h3>
          <p><strong>Therapist:</strong> {{therapistName}}</p>
          <p><strong>Date & Time:</strong> {{appointmentDate}}</p>
          <p><strong>Status:</strong> {{status}}</p>
        </div>
        
        <p>{{reason}}</p>
        
        <p>If you have any questions about this update, please contact our support team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['patientName', 'therapistName', 'appointmentDate', 'status', 'reason'],
    isActive: true
  },
  {
    name: 'New Registration',
    type: 'NewRegistration',
    subject: 'New User Registration - {{userDetails.name}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">New User Registration</h2>
        <p>Hi {{adminName}},</p>
        <p>A new user has registered on the iCare platform.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>User Details:</h3>
          <p><strong>Name:</strong> {{userDetails.name}}</p>
          <p><strong>Email:</strong> {{userDetails.email}}</p>
          <p><strong>Role:</strong> {{userDetails.role}}</p>
          <p><strong>Registration Date:</strong> {{userDetails.registrationDate}}</p>
        </div>
        
        <p>Please review the user's information and take any necessary actions.</p>
        
        <p>Best regards,<br>The iCare System</p>
      </div>
    `,
    variables: ['adminName', 'userDetails.name', 'userDetails.email', 'userDetails.role', 'userDetails.registrationDate'],
    isActive: true
  },
  {
    name: 'Account Confirmation',
    type: 'AccountConfirmation',
    subject: 'Confirm Your iCare Account',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Welcome to iCare!</h2>
        <p>Hi {{name}},</p>
        <p>Thank you for registering with iCare. To complete your account setup, please confirm your email address.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{confirmationLink}}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Confirm Account
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{confirmationLink}}</p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you didn't create an account with iCare, please ignore this email.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    buttonLink: '{{confirmationLink}}',
    buttonText: 'Confirm Account',
    variables: ['name', 'confirmationLink'],
    isActive: true
  },
  {
    name: 'New Appointment Created',
    type: 'NewAppointment',
    subject: 'New Appointment Created - {{plan}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Appointment Created!</h2>
        <p>Hi {{patientName}},</p>
        <p>Your therapy appointment has been successfully created.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details:</h3>
          <p><strong>Date & Time:</strong> {{appointmentDate}}</p>
          <p><strong>Plan:</strong> {{plan}}</p>
          <p><strong>Price:</strong> {{price}} AED</p>
        </div>
        
        <p>We're currently matching you with the best available therapist for your needs.</p>
        <p>You'll receive another email once your therapist has been assigned.</p>
        
        <p>If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['patientName', 'appointmentDate', 'plan', 'price'],
    isActive: true
  },
  {
    name: 'Payment Notification',
    type: 'PaymentNotification',
    subject: 'Payment Processed - {{amount}} AED',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Payment Processed</h2>
        <p>Hi {{therapistName}},</p>
        <p>Your payment has been processed successfully.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Amount:</strong> {{amount}} AED</p>
          <p><strong>Appointments:</strong> {{appointmentCount}}</p>
          <p><strong>Paid At:</strong> {{paidAt}}</p>
        </div>
        
        <p>This payment covers the completed therapy sessions listed above.</p>
        <p>If you have any questions about this payment, please contact the admin team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['therapistName', 'amount', 'appointmentCount', 'paidAt'],
    isActive: true
  },
  {
    name: 'Payment Details Update',
    type: 'PaymentDetailsUpdate',
    subject: 'Payment Details Updated - {{therapistName}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Payment Details Updated</h2>
        <p>Hi {{adminName}},</p>
        <p>{{therapistName}} has updated their payment details.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Update Details:</h3>
          <p><strong>Therapist:</strong> {{therapistName}}</p>
          <p><strong>Updated:</strong> {{updateType}}</p>
        </div>
        
        <p>Please review the updated payment information in the admin dashboard.</p>
        
        <p>Best regards,<br>The iCare System</p>
      </div>
    `,
    variables: ['adminName', 'therapistName', 'updateType'],
    isActive: true
  },
  {
    name: 'Therapy Change Request',
    type: 'TherapyChangeRequest',
    subject: 'Therapy Change Request - {{patientName}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Therapy Change Request</h2>
        <p>Hi {{adminName}},</p>
        <p>{{patientName}} has requested a change in their therapy assignment.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Request Details:</h3>
          <p><strong>Patient:</strong> {{patientName}}</p>
          <p><strong>Current Therapist:</strong> {{oldTherapistName}}</p>
          <p><strong>Appointment Date:</strong> {{appointmentDate}}</p>
          <p><strong>Plan:</strong> {{plan}}</p>
          <p><strong>Appointment ID:</strong> {{appointmentId}}</p>
        </div>
        
        <p>Please review this request and take appropriate action in the admin dashboard.</p>
        
        <p>Best regards,<br>The iCare System</p>
      </div>
    `,
    variables: ['adminName', 'patientName', 'oldTherapistName', 'appointmentDate', 'plan', 'appointmentId'],
    isActive: true
  },
  {
    name: 'Password Reset',
    type: 'PasswordReset',
    subject: 'Reset Your iCare Password',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Password Reset Request</h2>
        <p>Hi {{name}},</p>
        <p>We received a request to reset your password for your iCare account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{resetLink}}</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    buttonLink: '{{resetLink}}',
    buttonText: 'Reset Password',
    variables: ['name', 'resetLink'],
    isActive: true
  },
  {
    name: 'Password Reset Success',
    type: 'PasswordResetSuccess',
    subject: 'Password Reset Successful',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Password Reset Successful</h2>
        <p>Hi {{name}},</p>
        <p>Your password has been successfully reset.</p>
        
        <p>You can now log into your iCare account using your new password.</p>
        
        <p>If you didn't make this change, please contact our support team immediately.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    variables: ['name'],
    isActive: true
  },
  {
    name: 'Smart Payment Reminder',
    type: 'PaymentReminder',
    subject: 'Complete Payment for Your Session - {{reminderType}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">Payment Reminder</h2>
        <p>Hi {{patientName}},</p>
        <p>{{reason}}</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Session Details:</h3>
          <p><strong>Therapist:</strong> {{therapistName}}</p>
          <p><strong>Date & Time:</strong> {{appointmentDate}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{paymentUrl}}" style="background-color: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Pay Now
          </a>
        </div>
        
        <p>Complete your payment to secure your session. If you have any questions, please contact our support team.</p>
        
        <p>Best regards,<br>The iCare Team</p>
      </div>
    `,
    buttonLink: '{{paymentUrl}}',
    buttonText: 'Pay Now',
    variables: ['patientName', 'therapistName', 'appointmentDate', 'reason', 'paymentUrl', 'reminderType'],
    isActive: true
  }
];

async function createTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const template of emailTemplates) {
      // Check if template already exists
      const existing = await EmailTemplate.findOne({ type: template.type });
      
      if (existing) {
        console.log(`Template ${template.type} already exists, updating...`);
        await EmailTemplate.findOneAndUpdate(
          { type: template.type },
          template,
          { upsert: true }
        );
      } else {
        console.log(`Creating template ${template.type}...`);
        await EmailTemplate.create(template);
      }
    }

    console.log('All email templates created/updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating templates:', error);
    process.exit(1);
  }
}

createTemplates();
