import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailRule from '@/lib/db/models/EmailRule';
import EmailTemplate from '@/lib/db/models/EmailTemplate';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the PaymentReminder template ID
    const paymentReminderTemplate = await EmailTemplate.findOne({ type: 'PaymentReminder' });
    if (!paymentReminderTemplate) {
      return NextResponse.json({ error: 'PaymentReminder template not found. Please initialize templates first.' }, { status: 400 });
    }

    // Smart reminder rules
    const emailRules = [
      {
        name: 'First Payment Reminder (3 hours after booking)',
        description: 'Send first payment reminder 3 hours after appointment is booked if still unpaid',
        triggerEvent: 'time_based',
        priority: 100,
        conditions: [
          {
            field: 'isStripeVerified',
            operator: 'equals',
            value: false
          },
          {
            field: 'status',
            operator: 'equals',
            value: 'approved'
          },
          {
            field: 'createdAt',
            operator: 'less_than',
            value: '3 hours ago'
          },
          {
            field: 'firstReminderSent',
            operator: 'equals',
            value: null
          }
        ],
        actions: [
          {
            type: 'send_email',
            templateId: paymentReminderTemplate._id.toString()
          },
          {
            type: 'update_status',
            status: 'first_reminder_sent'
          }
        ],
        isActive: true
      },
      {
        name: 'Second Payment Reminder (24 hours after first)',
        description: 'Send second payment reminder 24 hours after first reminder if still unpaid and appointment is more than 12 hours away',
        triggerEvent: 'time_based',
        priority: 90,
        conditions: [
          {
            field: 'isStripeVerified',
            operator: 'equals',
            value: false
          },
          {
            field: 'status',
            operator: 'equals',
            value: 'approved'
          },
          {
            field: 'firstReminderSent',
            operator: 'exists',
            value: true
          },
          {
            field: 'firstReminderSent',
            operator: 'less_than',
            value: '24 hours ago'
          },
          {
            field: 'secondReminderSent',
            operator: 'equals',
            value: null
          },
          {
            field: 'date',
            operator: 'greater_than',
            value: '12 hours from now'
          }
        ],
        actions: [
          {
            type: 'send_email',
            templateId: paymentReminderTemplate._id.toString()
          },
          {
            type: 'update_status',
            status: 'second_reminder_sent'
          }
        ],
        isActive: true
      },
      {
        name: 'Final Payment Reminder (8 hours before appointment)',
        description: 'Send final payment reminder 8 hours before appointment if still unpaid',
        triggerEvent: 'time_based',
        priority: 80,
        conditions: [
          {
            field: 'isStripeVerified',
            operator: 'equals',
            value: false
          },
          {
            field: 'status',
            operator: 'equals',
            value: 'approved'
          },
          {
            field: 'date',
            operator: 'less_than',
            value: '8 hours from now'
          },
          {
            field: 'date',
            operator: 'greater_than',
            value: 'now'
          },
          {
            field: 'finalReminderSent',
            operator: 'equals',
            value: null
          }
        ],
        actions: [
          {
            type: 'send_email',
            templateId: paymentReminderTemplate._id.toString()
          },
          {
            type: 'update_status',
            status: 'final_reminder_sent'
          }
        ],
        isActive: true
      },
      {
        name: 'Appointment Expiry (after appointment time)',
        description: 'Cancel unpaid appointments after their scheduled time has passed',
        triggerEvent: 'time_based',
        priority: 70,
        conditions: [
          {
            field: 'isStripeVerified',
            operator: 'equals',
            value: false
          },
          {
            field: 'status',
            operator: 'equals',
            value: 'approved'
          },
          {
            field: 'date',
            operator: 'less_than',
            value: 'now'
          }
        ],
        actions: [
          {
            type: 'update_status',
            status: 'cancelled'
          },
          {
            type: 'send_notification',
            notificationType: 'APPOINTMENT_EXPIRED'
          }
        ],
        isActive: true
      }
    ];

    const results = [];
    
    for (const rule of emailRules) {
      // Check if rule already exists
      const existing = await EmailRule.findOne({ name: rule.name });
      
      if (existing) {
        console.log(`Rule "${rule.name}" already exists, updating...`);
        const updated = await EmailRule.findOneAndUpdate(
          { name: rule.name },
          rule,
          { new: true, upsert: true }
        );
        results.push({ name: rule.name, action: 'updated', rule: updated });
      } else {
        console.log(`Creating rule "${rule.name}"...`);
        const created = await EmailRule.create(rule);
        results.push({ name: rule.name, action: 'created', rule: created });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All email rules created/updated successfully!',
      results
    });

  } catch (error) {
    console.error('Error creating rules:', error);
    return NextResponse.json({ error: 'Failed to create rules' }, { status: 500 });
  }
}
