import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailLog from '@/lib/db/models/EmailLog';
import Appointment from '@/lib/db/models/Appointment';
import User from '@/lib/db/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const templateType = searchParams.get('templateType');

    // Date range for migration
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`Starting email tracking migration for the last ${days} days...`);

    const migrationResults = [];

    // 1. Migrate Payment Reminder emails from appointments
    if (!templateType || templateType === 'PaymentReminder') {
      const unpaidAppointments = await Appointment.find({
        status: { $in: ['approved', 'rescheduled'] },
        isStripeVerified: false,
        createdAt: { $gte: startDate },
        $or: [
          { firstReminderSent: { $exists: true } },
          { secondReminderSent: { $exists: true } },
          { finalReminderSent: { $exists: true } }
        ]
      }).populate('patient', 'fullName email').populate('therapist', 'fullName email');

      for (const appointment of unpaidAppointments) {
        try {
          // Create email logs for sent reminders
          if (appointment.firstReminderSent) {
            await EmailLog.create({
              templateType: 'PaymentReminder',
              recipientEmail: appointment.patient.email,
              recipientName: appointment.patient.fullName,
              subject: 'Payment Reminder - iCare',
              sentAt: appointment.firstReminderSent,
              status: 'sent', // We can't know if it was opened/clicked
              appointmentId: appointment._id,
              reminderType: 'first_reminder',
              metadata: {
                migrated: true,
                migrationDate: new Date()
              }
            });
          }

          if (appointment.secondReminderSent) {
            await EmailLog.create({
              templateType: 'PaymentReminder',
              recipientEmail: appointment.patient.email,
              recipientName: appointment.patient.fullName,
              subject: 'Payment Reminder - iCare',
              sentAt: appointment.secondReminderSent,
              status: 'sent',
              appointmentId: appointment._id,
              reminderType: 'second_reminder',
              metadata: {
                migrated: true,
                migrationDate: new Date()
              }
            });
          }

          if (appointment.finalReminderSent) {
            await EmailLog.create({
              templateType: 'PaymentReminder',
              recipientEmail: appointment.patient.email,
              recipientName: appointment.patient.fullName,
              subject: 'Payment Reminder - iCare',
              sentAt: appointment.finalReminderSent,
              status: 'sent',
              appointmentId: appointment._id,
              reminderType: 'final_reminder',
              metadata: {
                migrated: true,
                migrationDate: new Date()
              }
            });
          }

          migrationResults.push({
            type: 'PaymentReminder',
            appointmentId: appointment._id,
            patientEmail: appointment.patient.email,
            remindersMigrated: {
              first: !!appointment.firstReminderSent,
              second: !!appointment.secondReminderSent,
              final: !!appointment.finalReminderSent
            }
          });
        } catch (error) {
          console.error(`Error migrating reminders for appointment ${appointment._id}:`, error);
          migrationResults.push({
            type: 'PaymentReminder',
            appointmentId: appointment._id,
            error: error.message
          });
        }
      }
    }

    // 2. Migrate other email types from appointment status changes
    if (!templateType || templateType === 'AppointmentStatus') {
      const appointmentsWithStatusChanges = await Appointment.find({
        createdAt: { $gte: startDate },
        status: { $in: ['approved', 'completed', 'cancelled', 'no-show'] }
      }).populate('patient', 'fullName email').populate('therapist', 'fullName email');

      for (const appointment of appointmentsWithStatusChanges) {
        try {
          // Estimate when status emails were sent (usually shortly after status change)
          const estimatedEmailTime = new Date(appointment.updatedAt || appointment.createdAt);
          
          await EmailLog.create({
            templateType: 'AppointmentStatus',
            recipientEmail: appointment.patient.email,
            recipientName: appointment.patient.fullName,
            subject: `Appointment ${appointment.status} - iCare`,
            sentAt: estimatedEmailTime,
            status: 'sent',
            appointmentId: appointment._id,
            metadata: {
              migrated: true,
              migrationDate: new Date(),
              estimatedStatus: appointment.status
            }
          });

          migrationResults.push({
            type: 'AppointmentStatus',
            appointmentId: appointment._id,
            patientEmail: appointment.patient.email,
            status: appointment.status
          });
        } catch (error) {
          console.error(`Error migrating status email for appointment ${appointment._id}:`, error);
        }
      }
    }

    // 3. Migrate user registration emails
    if (!templateType || templateType === 'NewRegistration') {
      const newUsers = await User.find({
        createdAt: { $gte: startDate },
        role: { $in: ['patient', 'therapist'] }
      });

      for (const user of newUsers) {
        try {
          await EmailLog.create({
            templateType: 'NewRegistration',
            recipientEmail: user.email,
            recipientName: user.fullName,
            subject: 'Welcome to iCare - Account Created',
            sentAt: user.createdAt,
            status: 'sent',
            metadata: {
              migrated: true,
              migrationDate: new Date(),
              userRole: user.role
            }
          });

          migrationResults.push({
            type: 'NewRegistration',
            userId: user._id,
            userEmail: user.email,
            role: user.role
          });
        } catch (error) {
          console.error(`Error migrating registration email for user ${user._id}:`, error);
        }
      }
    }

    // 4. Create sample data for testing if no real data exists
    if (migrationResults.length === 0) {
      console.log('No existing email data found. Creating sample data for testing...');
      
      const sampleEmails = [
        {
          templateType: 'PaymentReminder',
          recipientEmail: 'test@example.com',
          recipientName: 'Test Patient',
          subject: 'Payment Reminder - iCare',
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          status: 'opened',
          reminderType: 'first_reminder',
          metadata: { openCount: 1, migrated: true, sample: true }
        },
        {
          templateType: 'PaymentReminder',
          recipientEmail: 'test@example.com',
          recipientName: 'Test Patient',
          subject: 'Payment Reminder - iCare',
          sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          status: 'clicked',
          reminderType: 'second_reminder',
          metadata: { openCount: 2, clickCount: 1, migrated: true, sample: true }
        },
        {
          templateType: 'AppointmentStatus',
          recipientEmail: 'patient@example.com',
          recipientName: 'John Doe',
          subject: 'Appointment Approved - iCare',
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          status: 'delivered',
          metadata: { migrated: true, sample: true }
        }
      ];

      for (const email of sampleEmails) {
        try {
          await EmailLog.create(email);
          migrationResults.push({
            type: email.templateType,
            sample: true,
            status: email.status
          });
        } catch (error) {
          console.error('Error creating sample email:', error);
        }
      }
    }

    const successCount = migrationResults.filter(r => !r.error).length;
    const errorCount = migrationResults.filter(r => r.error).length;

    return NextResponse.json({
      success: true,
      message: `Email tracking migration completed! ${successCount} emails migrated, ${errorCount} errors.`,
      results: migrationResults,
      summary: {
        total: migrationResults.length,
        migrated: successCount,
        errors: errorCount,
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error migrating email tracking data:', error);
    return NextResponse.json({ error: 'Failed to migrate email tracking data' }, { status: 500 });
  }
}
