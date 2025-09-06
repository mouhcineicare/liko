import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { triggerAppointmentExpiredEmail } from '@/lib/services/email-triggers';

export async function POST() {
  try {
    await connectDB();
    
    const now = new Date();
    
    // Find unpaid appointments that have passed their scheduled time
    const expiredUnpaidAppointments = await Appointment.find({
      status: { $in: ['approved', 'rescheduled'] },
      isStripeVerified: false, // Only unpaid appointments
      date: { $lt: now }, // Past their scheduled time
      // Don't include already cancelled or completed appointments
      $nor: [
        { status: 'cancelled' },
        { status: 'no-show' },
        { status: 'completed' }
      ]
    }).populate('patient', 'fullName email').populate('therapist', 'fullName email');

    console.log(`Found ${expiredUnpaidAppointments.length} expired unpaid appointments`);

    // Process each expired appointment
    const results = await Promise.all(
      expiredUnpaidAppointments.map(async (appointment) => {
        try {
          // Update appointment status to cancelled
          appointment.status = 'cancelled';
          appointment.reason = 'Expired - payment not completed before scheduled time';
          await appointment.save();

          // Send notification email to patient
          if (appointment.patient && appointment.therapist) {
            await triggerAppointmentExpiredEmail(
              appointment.patient,
              appointment.therapist,
              appointment
            );
          }

          return {
            appointmentId: appointment._id,
            patientName: appointment.patient?.fullName,
            therapistName: appointment.therapist?.fullName,
            scheduledTime: appointment.date,
            status: 'expired'
          };
        } catch (error) {
          console.error(`Error processing expired appointment ${appointment._id}:`, error);
          return {
            appointmentId: appointment._id,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'expired').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Processed ${expiredUnpaidAppointments.length} expired unpaid appointments`,
      results: {
        total: expiredUnpaidAppointments.length,
        expired: successCount,
        errors: errorCount
      },
      details: results
    });

  } catch (error) {
    console.error('Error in expire unpaid appointments cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process expired unpaid appointments',
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
