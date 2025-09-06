import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailLog from '@/lib/db/models/EmailLog';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const templateType = searchParams.get('templateType');

    // Date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build match criteria
    const matchCriteria: any = {
      sentAt: { $gte: startDate }
    };

    if (templateType) {
      matchCriteria.templateType = templateType;
    }

    // Aggregate email statistics
    const emailStats = await EmailLog.aggregate([
      { $match: matchCriteria },
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
          },
          avgOpenCount: { $avg: '$metadata.openCount' },
          avgClickCount: { $avg: '$metadata.clickCount' }
        }
      },
      {
        $addFields: {
          deliveryRate: {
            $multiply: [
              { $divide: ['$delivered', '$totalSent'] },
              100
            ]
          },
          openRate: {
            $multiply: [
              { $divide: ['$opened', '$totalSent'] },
              100
            ]
          },
          clickRate: {
            $multiply: [
              { $divide: ['$clicked', '$totalSent'] },
              100
            ]
          }
        }
      },
      { $sort: { totalSent: -1 } }
    ]);

    // Overall statistics
    const overallStats = await EmailLog.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          totalDelivered: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['delivered', 'opened', 'clicked']] }, 
                1, 
                0
              ] 
            } 
          },
          totalOpened: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['opened', 'clicked']] }, 
                1, 
                0
              ] 
            } 
          },
          totalClicked: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] 
            } 
          },
          totalFailed: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    // Daily email volume
    const dailyStats = await EmailLog.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$sentAt'
            }
          },
          count: { $sum: 1 },
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
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Reminder email specific stats
    const reminderStats = await EmailLog.aggregate([
      { 
        $match: { 
          ...matchCriteria,
          templateType: 'PaymentReminder'
        } 
      },
      {
        $group: {
          _id: '$reminderType',
          totalSent: { $sum: 1 },
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
          }
        }
      }
    ]);

    const overall = overallStats[0] || {
      totalEmails: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalFailed: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalEmails: overall.totalEmails,
          deliveryRate: overall.totalEmails > 0 ? 
            ((overall.totalDelivered / overall.totalEmails) * 100).toFixed(2) : 0,
          openRate: overall.totalEmails > 0 ? 
            ((overall.totalOpened / overall.totalEmails) * 100).toFixed(2) : 0,
          clickRate: overall.totalEmails > 0 ? 
            ((overall.totalClicked / overall.totalEmails) * 100).toFixed(2) : 0,
          failureRate: overall.totalEmails > 0 ? 
            ((overall.totalFailed / overall.totalEmails) * 100).toFixed(2) : 0
        },
        templateStats: emailStats,
        dailyStats,
        reminderStats,
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Error fetching email analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch email analytics' }, { status: 500 });
  }
}
