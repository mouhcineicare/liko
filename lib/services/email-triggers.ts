import { 
  sendPaymentConfirmationEmail,
  sendTherapistAssignmentEmail,
  sendPatientAssignmentEmail,
  sendNewRegistrationEmail,
  sendAppointmentApprovalEmail,
  sendAppointmentStatusEmail,
  sendAccountConfirmationEmail,
  sendNewAppointmentEmail,
  sendPaymentNotificationEmail,
  sendPaymentDetailsUpdateEmail,
  sendTherapyChangeRequestEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendSignInCodeEmail
} from './email';
import User from '@/lib/db/models/User';
import { generateVerificationToken } from '@/lib/utils/auth';
import bcrypt from 'bcryptjs';
import { NotificationType, triggerNotification } from './notifications';

// Trigger: When payment is completed
export async function triggerPaymentConfirmationEmail(appointment: any) {
  const patient = await User.findById(appointment.patient);
  if (!patient) return;

  await sendPaymentConfirmationEmail(patient.email, {
    patientName: patient.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    amount: appointment.price,
    plan: appointment.plan
  });
}

// Trigger: When therapist is assigned
export async function triggerTherapistAssignmentEmail(appointment: any) {
  const therapist = await User.findById(appointment.therapist);
  const patient = await User.findById(appointment.patient);
  if (!therapist || !patient) return;

  await sendTherapistAssignmentEmail(therapist.email, {
    therapistName: therapist.fullName,
    patientName: patient.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    plan: appointment.plan
  });

  await triggerNotification(NotificationType.NEW_PATIENT_ASSIGNED, appointment.therapist,{})
}

export async function triggerPatientAssignmentEmail(appointment: any) {
  const therapist = await User.findById(appointment.therapist);
  const patient = await User.findById(appointment.patient);
  if (!therapist || !patient) return;

  await sendPatientAssignmentEmail(patient.email, {
    therapistName: therapist.fullName,
    patientName: patient.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    plan: appointment.plan
  });


  await triggerNotification(NotificationType.NEW_THERAPIST_ASSIGNED, appointment.patient,{})
}

//sendSignInCodeEmail
export async function triggerSendEmailSigningCode(email:string, code: string) {
  await sendSignInCodeEmail(email, code);
}

// Trigger: When new user registers
export async function triggerNewRegistrationEmail(newUser: any) {
  // Find admin users
  const admins = await User.find({ role: 'admin' });
  
  // Send email to each admin
  for (const admin of admins) {
    await sendNewRegistrationEmail(admin.email, {
      adminName: admin.fullName,
      userDetails: {
        name: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        registrationDate: new Date().toLocaleString()
      }
    });
  }

  await triggerNotification(NotificationType.NEW_PATIENT_SIGNED_IN, admins.map(admin => admin._id.toString()),{});
}

// Trigger: When therapist approves appointment
export async function triggerAppointmentApprovalEmail(appointment: any) {
  const patient = await User.findById(appointment.patient);
  const therapist = await User.findById(appointment.therapist);
  if (!patient || !therapist) return;

  await sendAppointmentApprovalEmail(patient.email, {
    patientName: patient.fullName,
    therapistName: therapist.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    meetingLink: appointment.meetingLink
  });

}

// Trigger: When appointment status changes
export async function triggerAppointmentStatusEmail(appointment: any, status: string) {
  const patient = await User.findById(appointment.patient);
  const therapist = await User.findById(appointment.therapist);
  if (!patient || !therapist) return;

  await sendAppointmentStatusEmail(patient.email, status, {
    patientName: patient.fullName,
    therapistName: therapist.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    status
  });

  // Also notify admin if status is changed
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendAppointmentStatusEmail(admin.email, status, {
      patientName: patient.fullName,
      therapistName: therapist.fullName,
      appointmentDate: new Date(appointment.date).toLocaleString(),
      status
    });
  }

  await triggerNotification(NotificationType.APPOINTMENT_STATUS_CHANGED_THEAPIST, appointment.therapist,{
    planName: appointment.plan, patientName: therapist.fullName, status,
  });

  await triggerNotification(NotificationType.APPOINTMENT_STATUS_CHANGED_THEAPIST, appointment.patient,{
    planName: appointment.plan, therapistName: therapist.fullName, status,
  });

}

// Trigger: When new user needs to confirm account
export async function triggerAccountConfirmationEmail(user: any) {
  const token = await generateVerificationToken(user);
  const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;

  await sendAccountConfirmationEmail(user.email, {
    name: user.fullName,
    confirmationLink
  });
}

// Trigger: When new appointment is created
export async function triggerNewAppointmentEmail(appointment: any) {
  const patient = await User.findById(appointment.patient);
  const admins = await User.find({ role: 'admin' });
  if (!patient) return;

  await sendNewAppointmentEmail(patient.email, {
    patientName: patient.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    plan: appointment.plan,
    price: appointment.price
  });

  await triggerNotification(NotificationType.APPOINTMENT_CREATED, [...admins.map(admin => admin._id.toString()),appointment.patient, appointment.therapist]);
}

// Trigger: When payment is made to therapist
export async function triggerPaymentNotificationEmail(payment: any) {
  const therapist = await User.findById(payment.therapist);
  if (!therapist) return;

  await sendPaymentNotificationEmail(therapist.email, {
    therapistName: therapist.fullName,
    amount: payment.amount,
    appointmentCount: payment.appointments.length,
    paidAt: new Date(payment.paidAt).toLocaleString()
  });

  // Also notify admin
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendPaymentNotificationEmail(admin.email, {
      therapistName: therapist.fullName,
      amount: payment.amount,
      appointmentCount: payment.appointments.length,
      paidAt: new Date(payment.paidAt).toLocaleString()
    });
  }
}

// Trigger: When therapist updates payment details
export async function triggerPaymentDetailsUpdateEmail(details: any) {
  const therapist = await User.findById(details.therapist);
  if (!therapist) return;

  // Determine what was updated
  const updateTypes = [];
  if (details.bankDetails) updateTypes.push('Bank Details');
  if (details.otherPaymentDetails) updateTypes.push('Alternative Payment Methods');
  if (details.paymentLink) updateTypes.push('Payment Link');

  const updateType = updateTypes.join(', ');

  // Notify admin
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendPaymentDetailsUpdateEmail(admin.email, {
      therapistName: therapist.fullName,
      updateType
    });
  }
}

// Trigger: When patient requests therapy change
export async function triggerTherapyChangeRequestEmail(appointment: any) {
  const patient = await User.findById(appointment.patient);
  const oldTherapist = await User.findById(appointment.oldTherapies[appointment.oldTherapies.length - 1]);
  if (!patient || !oldTherapist) return;

  // Send email to all admins
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendTherapyChangeRequestEmail(admin.email, {
      patientName: patient.fullName,
      oldTherapistName: oldTherapist.fullName,
      appointmentDate: new Date(appointment.date).toLocaleString(),
      plan: appointment.plan,
      appointmentId: appointment._id
    });
  }
}


export async function triggerPasswordResetEmail(userId: string) {
  const user = await User.findById(userId);
  if (!user) return;

  // Generate reset token
  const resetToken = await bcrypt.hashSync(user.email + Date.now(), 10);
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

  // Save token to user
  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry as any;
  await user.save();

  // Create reset link
  const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password?token=${resetToken}`;
  sendPasswordResetEmail(user.email,{
    name: user.fullName,
    resetLink
  });
}


// Trigger: When password is successfully reset
export async function triggerPasswordResetSuccessEmail(userId: string) {
  const user = await User.findById(userId);
  if (!user) return;

  await sendPasswordResetSuccessEmail(user.email,{
    name: user.fullName
  });
}

// Trigger: When unpaid appointment expires
export async function triggerAppointmentExpiredEmail(patient: any, therapist: any, appointment: any) {
  // Send email to patient
  await sendAppointmentStatusEmail(patient.email, 'expired', {
    patientName: patient.fullName,
    therapistName: therapist.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    status: 'expired',
    reason: 'Your appointment has been cancelled because payment was not completed before the scheduled time.'
  });

  // Send email to therapist
  await sendAppointmentStatusEmail(therapist.email, 'expired', {
    patientName: patient.fullName,
    therapistName: therapist.fullName,
    appointmentDate: new Date(appointment.date).toLocaleString(),
    status: 'expired',
    reason: 'This appointment was cancelled because the patient did not complete payment before the scheduled time.'
  });

  // Notify admin
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await sendAppointmentStatusEmail(admin.email, 'expired', {
      patientName: patient.fullName,
      therapistName: therapist.fullName,
      appointmentDate: new Date(appointment.date).toLocaleString(),
      status: 'expired',
      reason: 'Appointment expired due to unpaid status'
    });
  }

  // Send notifications
  await triggerNotification(NotificationType.APPOINTMENT_STATUS_CHANGED_THEAPIST, appointment.therapist, {
    planName: appointment.plan,
    patientName: patient.fullName,
    status: 'expired'
  });

  await triggerNotification(NotificationType.APPOINTMENT_STATUS_CHANGED_THEAPIST, appointment.patient, {
    planName: appointment.plan,
    therapistName: therapist.fullName,
    status: 'expired'
  });
}