import connectDB from '@/lib/db/connect';
import EmailLog from '@/lib/db/models/EmailLog';

/**
 * Email Tracking Wrapper
 * 
 * This service provides easy integration for existing email functions
 * to add tracking without major code changes.
 */

export interface EmailTrackingData {
  templateType: string;
  recipientName: string;
  appointmentId?: string;
  reminderType?: string;
  metadata?: any;
}

/**
 * Track an email that was sent through the existing infrastructure
 * Call this function after successfully sending an email
 */
export async function trackEmailSent(
  recipientEmail: string,
  subject: string,
  trackingData: EmailTrackingData
): Promise<string | null> {
  try {
    await connectDB();

    const emailLog = await EmailLog.create({
      templateType: trackingData.templateType as any,
      recipientEmail,
      recipientName: trackingData.recipientName,
      subject,
      sentAt: new Date(),
      status: 'sent',
      appointmentId: trackingData.appointmentId,
      reminderType: trackingData.reminderType as any,
      metadata: {
        ...trackingData.metadata,
        trackedByWrapper: true,
        trackingDate: new Date()
      }
    });

    console.log(`✅ Email tracked: ${trackingData.templateType} to ${recipientEmail} (Log ID: ${emailLog._id})`);
    return emailLog._id.toString();
  } catch (error) {
    console.error(`❌ Failed to track email to ${recipientEmail}:`, error);
    return null;
  }
}

/**
 * Update email status (delivered, opened, clicked, failed)
 */
export async function updateEmailStatus(
  logId: string,
  status: 'delivered' | 'opened' | 'clicked' | 'failed',
  metadata?: any
): Promise<boolean> {
  try {
    await connectDB();

    const updateData: any = { status };
    
    if (metadata) {
      updateData.metadata = { ...metadata };
    }

    if (status === 'opened') {
      updateData.$inc = { 'metadata.openCount': 1 };
      updateData.$set = { 'metadata.lastOpenedAt': new Date() };
    }

    if (status === 'clicked') {
      updateData.$inc = { 'metadata.clickCount': 1 };
      updateData.$set = { 'metadata.lastClickedAt': new Date() };
    }

    await EmailLog.findByIdAndUpdate(logId, updateData);
    console.log(`✅ Email status updated: ${logId} -> ${status}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update email status for ${logId}:`, error);
    return false;
  }
}

/**
 * Get email tracking statistics
 */
export async function getEmailStats(days: number = 30) {
  try {
    await connectDB();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await EmailLog.aggregate([
      { $match: { sentAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$templateType',
          totalSent: { $sum: 1 },
          delivered: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['delivered', 'opened', 'clicked']] }, 
                1, 
                0
              ] 
            } 
          },
          opened: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['opened', 'clicked']] }, 
                1, 
                0
              ] 
            } 
          },
          clicked: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] 
            } 
          },
          failed: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    return stats;
  } catch (error) {
    console.error('Error getting email stats:', error);
    return [];
  }
}

/**
 * Example integration for existing email functions:
 * 
 * // In your existing email function:
 * export async function sendPaymentReminderEmail(to: string, data: any) {
 *   try {
 *     // Your existing email sending code
 *     await transporter.sendMail({
 *       from: `"iCare" <${process.env.SMTP_USER}>`,
 *       to,
 *       subject: 'Payment Reminder - iCare',
 *       html: emailHtml
 *     });
 * 
 *     // Add tracking after successful send
 *     await trackEmailSent(to, 'Payment Reminder - iCare', {
 *       templateType: 'PaymentReminder',
 *       recipientName: data.patientName,
 *       appointmentId: data.appointmentId,
 *       reminderType: data.reminderType
 *     });
 * 
 *     console.log(`✅ Payment reminder sent to ${to}`);
 *   } catch (error) {
 *     console.error(`❌ Failed to send payment reminder to ${to}:`, error);
 *     throw error;
 *   }
 * }
 */
