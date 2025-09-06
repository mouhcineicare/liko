import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailTemplate from '@/lib/db/models/EmailTemplate';
import EmailTemplateEnhanced from '@/lib/db/models/EmailTemplateEnhanced';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all existing email templates
    const existingTemplates = await EmailTemplate.find({});
    console.log(`Found ${existingTemplates.length} existing email templates to migrate`);

    const migrationResults = [];
    const defaultRecipients = {
      PaymentConfirmation: { patient: true, therapist: false, admin: false, custom: [] },
      TherapistAssignment: { patient: false, therapist: true, admin: false, custom: [] },
      PatientAssignment: { patient: true, therapist: false, admin: false, custom: [] },
      AppointmentApproval: { patient: true, therapist: true, admin: false, custom: [] },
      AppointmentStatus: { patient: true, therapist: true, admin: false, custom: [] },
      NewRegistration: { patient: false, therapist: false, admin: true, custom: [] },
      AccountConfirmation: { patient: true, therapist: false, admin: false, custom: [] },
      NewAppointment: { patient: true, therapist: false, admin: false, custom: [] },
      PaymentNotification: { patient: false, therapist: true, admin: true, custom: [] },
      PaymentDetailsUpdate: { patient: false, therapist: false, admin: true, custom: [] },
      TherapyChangeRequest: { patient: false, therapist: false, admin: true, custom: [] },
      PasswordReset: { patient: true, therapist: false, admin: false, custom: [] },
      PasswordResetSuccess: { patient: true, therapist: false, admin: false, custom: [] },
      PaymentReminder: { patient: true, therapist: false, admin: false, custom: [] }
    };

    for (const template of existingTemplates) {
      try {
        // Check if enhanced template already exists
        const existingEnhanced = await EmailTemplateEnhanced.findOne({ type: template.type });
        
        if (existingEnhanced) {
          console.log(`Enhanced template ${template.type} already exists, updating...`);
          
          // Update existing enhanced template with current data
          const updated = await EmailTemplateEnhanced.findOneAndUpdate(
            { type: template.type },
            {
              name: template.name,
              subject: template.subject,
              content: template.content,
              buttonLink: template.buttonLink,
              buttonText: template.buttonText,
              isActive: template.isActive,
              variables: template.variables,
              recipients: defaultRecipients[template.type as keyof typeof defaultRecipients] || {
                patient: true,
                therapist: false,
                admin: false,
                custom: []
              }
            },
            { new: true }
          );
          
          migrationResults.push({
            type: template.type,
            action: 'updated',
            template: updated,
            recipients: defaultRecipients[template.type as keyof typeof defaultRecipients]
          });
        } else {
          console.log(`Creating enhanced template ${template.type}...`);
          
          // Create new enhanced template
          const enhancedTemplate = await EmailTemplateEnhanced.create({
            name: template.name,
            type: template.type,
            subject: template.subject,
            content: template.content,
            buttonLink: template.buttonLink,
            buttonText: template.buttonText,
            isActive: template.isActive,
            variables: template.variables,
            recipients: defaultRecipients[template.type as keyof typeof defaultRecipients] || {
              patient: true,
              therapist: false,
              admin: false,
              custom: []
            }
          });
          
          migrationResults.push({
            type: template.type,
            action: 'created',
            template: enhancedTemplate,
            recipients: defaultRecipients[template.type as keyof typeof defaultRecipients]
          });
        }
      } catch (error) {
        console.error(`Error migrating template ${template.type}:`, error);
        migrationResults.push({
          type: template.type,
          action: 'error',
          error: error.message
        });
      }
    }

    const successCount = migrationResults.filter(r => r.action === 'created' || r.action === 'updated').length;
    const errorCount = migrationResults.filter(r => r.action === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Migration completed! ${successCount} templates migrated successfully, ${errorCount} errors.`,
      results: migrationResults,
      summary: {
        total: existingTemplates.length,
        migrated: successCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('Error migrating existing email templates:', error);
    return NextResponse.json({ error: 'Failed to migrate existing templates' }, { status: 500 });
  }
}
