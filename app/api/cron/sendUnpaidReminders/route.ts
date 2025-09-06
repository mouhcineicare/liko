import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { sendPaymentReminderEmail } from '@/lib/services/email';
import { sendPaymentReminderEmailWithTracking } from '@/lib/services/email-tracking';
import { triggerNotification } from '@/lib/services/notifications';
import { NotificationType } from '@/lib/services/notifications';

// Smart content generation for different reminder types
function generateReminderContent(reminderType: string, appointment: any) {
  const now = new Date();
  const appointmentDate = new Date(appointment.date);
  const timeUntilAppointment = appointmentDate.getTime() - now.getTime();
  const hoursRemaining = Math.ceil(timeUntilAppointment / (1000 * 60 * 60));

  const contentMap = {
    'first_reminder': {
      reminderTitle: 'Secure Your Session',
      reminderMessage: `Your session with ${appointment.therapist.fullName} on ${appointmentDate.toLocaleString()} is awaiting payment. Please complete it soon to confirm your booking.`,
      buttonText: 'Complete Payment',
      buttonColor: '#1890ff',
      urgencyColor: '#1890ff',
      additionalMessage: 'You have plenty of time to complete your payment and secure your session.',
      timeRemaining: `${hoursRemaining} hours until your session`
    },
    'second_reminder': {
      reminderTitle: 'Don\'t Miss Out',
      reminderMessage: `Just a friendly reminder, your session with ${appointment.therapist.fullName} on ${appointmentDate.toLocaleString()} is still unpaid. Please complete your payment to avoid cancellation.`,
      buttonText: 'Pay Now',
      buttonColor: '#fa8c16',
      urgencyColor: '#fa8c16',
      additionalMessage: 'Complete your payment soon to ensure your session is confirmed.',
      timeRemaining: `${hoursRemaining} hours until your session`
    },
    'final_reminder': {
      reminderTitle: 'Last Chance!',
      reminderMessage: `Urgent: Your session with ${appointment.therapist.fullName} on ${appointmentDate.toLocaleString()} is approaching! This is your last chance to complete payment and secure your slot.`,
      buttonText: 'Pay Now - Last Chance',
      buttonColor: '#f5222d',
      urgencyColor: '#f5222d',
      additionalMessage: 'Your session is coming up soon. Complete payment now to avoid cancellation.',
      timeRemaining: `Only ${hoursRemaining} hours until your session`
    }
  };

  return contentMap[reminderType] || contentMap['first_reminder'];
}

export async function POST() {
  try {
    await connectDB();
    
    const now = new Date();
    
    // Find unpaid appointments that need reminders based on smart timing rules
    const unpaidAppointments = await Appointment.find({
      status: { $in: ['approved', 'rescheduled'] },
      isStripeVerified: false, // Only unpaid appointments
      // Don't include already cancelled or completed appointments
      $nor: [
        { status: 'cancelled' },
        { status: 'no-show' },
        { status: 'completed' }
      ]
    }).populate('patient', 'fullName email').populate('therapist', 'fullName email');

    // Filter appointments that need reminders based on smart timing rules
    const appointmentsNeedingReminders = unpaidAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      const bookingTime = new Date(appointment.createdAt);
      const timeSinceBooking = now.getTime() - bookingTime.getTime();
      const timeUntilAppointment = appointmentDate.getTime() - now.getTime();
      
      // Rule 1: 3 hours after booking (if unpaid)
      const threeHoursAfterBooking = timeSinceBooking >= 3 * 60 * 60 * 1000; // 3 hours
      const hasNotSentFirstReminder = !appointment.firstReminderSent;
      
      // Rule 2: 24 hours after first reminder (if still unpaid)
      const twentyFourHoursAfterFirstReminder = appointment.firstReminderSent && 
        (now.getTime() - new Date(appointment.firstReminderSent).getTime()) >= 24 * 60 * 60 * 1000;
      const hasNotSentSecondReminder = !appointment.secondReminderSent;
      
      // Rule 3: 8 hours before appointment (if still unpaid)
      const eightHoursBeforeAppointment = timeUntilAppointment <= 8 * 60 * 60 * 1000 && timeUntilAppointment > 0;
      const hasNotSentFinalReminder = !appointment.finalReminderSent;
      
      // Rule 4: If booking is within 12 hours, skip second reminder
      const bookingWithinTwelveHours = timeUntilAppointment <= 12 * 60 * 60 * 1000;
      
      return (
        // First reminder: 3 hours after booking
        (threeHoursAfterBooking && hasNotSentFirstReminder) ||
        // Second reminder: 24 hours after first (unless booking is within 12 hours)
        (twentyFourHoursAfterFirstReminder && hasNotSentSecondReminder && !bookingWithinTwelveHours) ||
        // Final reminder: 8 hours before appointment
        (eightHoursBeforeAppointment && hasNotSentFinalReminder)
      );
    });

    console.log(`Found ${appointmentsNeedingReminders.length} unpaid appointments needing reminders`);

    // Process each appointment
    const results = await Promise.all(
      appointmentsNeedingReminders.map(async (appointment) => {
        try {
          const appointmentDate = new Date(appointment.date);
          const bookingTime = new Date(appointment.createdAt);
          const timeSinceBooking = now.getTime() - bookingTime.getTime();
          const timeUntilAppointment = appointmentDate.getTime() - now.getTime();
          
          // Determine which reminder to send
          let reminderType = '';
          let reminderMessage = '';
          let updateField = '';
          
          // First reminder: 3 hours after booking
          if (timeSinceBooking >= 3 * 60 * 60 * 1000 && !appointment.firstReminderSent) {
            reminderType = 'first_reminder';
            reminderMessage = `Complete payment to secure your session with ${appointment.therapist.fullName}`;
            updateField = 'firstReminderSent';
          }
          // Second reminder: 24 hours after first (unless booking is within 12 hours)
          else if (appointment.firstReminderSent && 
                   (now.getTime() - new Date(appointment.firstReminderSent).getTime()) >= 24 * 60 * 60 * 1000 &&
                   !appointment.secondReminderSent && 
                   timeUntilAppointment > 12 * 60 * 60 * 1000) {
            reminderType = 'second_reminder';
            reminderMessage = `Don't miss your session! Complete payment now to secure your appointment with ${appointment.therapist.fullName}`;
            updateField = 'secondReminderSent';
          }
          // Final reminder: 8 hours before appointment
          else if (timeUntilAppointment <= 8 * 60 * 60 * 1000 && timeUntilAppointment > 0 && !appointment.finalReminderSent) {
            reminderType = 'final_reminder';
            reminderMessage = `Last chance! Your session with ${appointment.therapist.fullName} is coming up soon. Complete payment now.`;
            updateField = 'finalReminderSent';
          }

          if (reminderType && updateField) {
            // Generate smart content for this reminder type
            const smartContent = generateReminderContent(reminderType, appointment);
            
            // Send reminder email to patient with tracking
            await sendPaymentReminderEmailWithTracking(appointment.patient.email, {
              patientName: appointment.patient.fullName,
              therapistName: appointment.therapist.fullName,
              appointmentDate: new Date(appointment.date).toLocaleString(),
              amount: appointment.amount || 'N/A',
              paymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment?appointmentId=${appointment._id}`,
              ...smartContent
            }, appointment._id.toString(), reminderType);

            // Send notification to patient
            await triggerNotification(
              NotificationType.APPOINTMENT_STATUS_CHANGED_THEAPIST, 
              appointment.patient._id, 
              {
                planName: appointment.plan,
                therapistName: appointment.therapist.fullName,
                status: reminderType,
                message: reminderMessage
              }
            );

            // Update appointment to mark reminder as sent
            appointment[updateField] = now;
            await appointment.save();

            return {
              appointmentId: appointment._id,
              patientName: appointment.patient.fullName,
              therapistName: appointment.therapist.fullName,
              scheduledTime: appointment.date,
              reminderType: reminderType,
              status: 'reminder_sent'
            };
          }

          return {
            appointmentId: appointment._id,
            status: 'skipped',
            reason: 'No reminder needed at this time'
          };
        } catch (error) {
          console.error(`Error sending reminder for appointment ${appointment._id}:`, error);
          return {
            appointmentId: appointment._id,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'reminder_sent').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} payment reminders for unpaid appointments`,
      results: {
        total: upcomingUnpaidAppointments.length,
        remindersSent: successCount,
        errors: errorCount
      },
      details: results
    });

  } catch (error) {
    console.error('Error in unpaid reminders cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send unpaid appointment reminders',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

// Allow GET requests for testing
export async function GET() {
  return POST();
}
