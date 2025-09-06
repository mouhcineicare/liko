import { NextResponse } from 'next/server';
import cron from 'node-cron';
import Appointment from '@/lib/db/models/Appointment';
import { format } from 'date-fns';

const checkAndUpdateAppointments = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Find expired appointments that ended 1 hour ago
    const expiredAppointments = await Appointment.find({
      date: { $lte: oneHourAgo }, // Appointment date is less than or equal to 1 hour ago
      status: { $in: ['confirmed', 'in_progress', 'unpaid', 'matched_pending_therapist_acceptance','rescheduled'] }, // Include all active statuses
    });

    console.log(`Found ${expiredAppointments.length} expired appointments to process`);

    // Process each appointment
    for (const appointment of expiredAppointments) {
      const { 
        completedSessions, 
        totalSessions, 
        _id, 
        isConfirmed, 
        recurring = [], 
        sessionsHistory = [],
        isStripeVerified
      } = appointment;

      // Case 1: Appointment is not confirmed - mark as no-show
      if (!isConfirmed) {
        await Appointment.findByIdAndUpdate(_id, {
          status: 'no-show'
        });
        console.log(`Marked appointment ${_id} as no-show (not confirmed)`);
        continue;
      }

      // Case 2: Unpaid appointment - mark as cancelled (don't complete)
      if (!isStripeVerified) {
        await Appointment.findByIdAndUpdate(_id, {
          status: 'cancelled',
          reason: 'Session time passed without payment verification'
        });
        console.log(`Marked unpaid appointment ${_id} as cancelled (payment not verified)`);
        continue;
      }

      // Case 3: Paid appointment - proceed with completion logic
      if (totalSessions === 1) {
        // Single session appointment - mark as completed
        await Appointment.findByIdAndUpdate(_id, {
          status: 'completed',
          completedSessions: 1
        });
        console.log(`Marked single-session appointment ${_id} as completed`);
      } else {
        // Multi-session appointment
        if (completedSessions < totalSessions) {
          // Increment completed sessions
          const updatedCompletedSessions = completedSessions + 1;
          
          // Add current date to sessions history
          const currentSessionDate = appointment.date;
          const formattedCurrentDate = format(currentSessionDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
          const updatedSessionsHistory = [...sessionsHistory, formattedCurrentDate];
          
          // Find the next date in recurring array
          let nextDate = null;
          let updatedRecurring = [...recurring];
          
          if (recurring.length > 0) {
            // Sort recurring dates to get the closest future date
            const sortedDates = [...recurring].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            nextDate = sortedDates[0]; // Get the first (earliest) date
            
            // Remove this date from the recurring array
            updatedRecurring = sortedDates.slice(1);
          }
          
          // Determine if this was the last session
          const isLastSession = updatedCompletedSessions >= totalSessions;
          
          // Update the appointment
          await Appointment.findByIdAndUpdate(_id, {
            completedSessions: updatedCompletedSessions,
            date: nextDate ? new Date(nextDate) : appointment.date,
            recurring: updatedRecurring,
            sessionsHistory: updatedSessionsHistory,
            status: isLastSession ? 'completed' : appointment.status
          });
          
          console.log(`Updated multi-session appointment ${_id}: Completed sessions = ${updatedCompletedSessions}, Next date = ${nextDate || 'None'}`);
        } else {
          // All sessions completed - mark as completed
          await Appointment.findByIdAndUpdate(_id, {
            status: 'completed'
          });
          console.log(`Marked multi-session appointment ${_id} as completed (all sessions done)`);
        }
      }
    }

    console.log(`Processed ${expiredAppointments.length} expired appointments`);
  } catch (error) {
    console.error('Error in cron job:', error);
  }
};

// Function to start the cron job
export const runCron = () => {
  // Schedule the function to run every hour
  cron.schedule('0 * * * *', checkAndUpdateAppointments); // Runs at the start of every hour
  console.log('Cron job scheduled to check appointments every hour');
  
  // Optionally run immediately on startup
  checkAndUpdateAppointments();
};

// Manual trigger for testing
export async function GET() {
  try {
    console.log('Manual trigger: Starting appointment completion check...');
    await checkAndUpdateAppointments();
    return NextResponse.json({ 
      success: true, 
      message: 'Appointment completion check completed successfully' 
    });
  } catch (error) {
    console.error('Manual trigger failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run appointment completion check' 
    }, { status: 500 });
  }
}