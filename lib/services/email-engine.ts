import connectDB from '@/lib/db/connect';
import EmailRule from '@/lib/db/models/EmailRule';
import EmailTemplate from '@/lib/db/models/EmailTemplate';
import Appointment from '@/lib/db/models/Appointment';
import { sendPaymentReminderEmail, sendAppointmentStatusEmail } from './email';
import { triggerNotification } from './notifications';
import { NotificationType } from './notifications';

export class EmailEngine {
  private static instance: EmailEngine;
  
  private constructor() {}
  
  public static getInstance(): EmailEngine {
    if (!EmailEngine.instance) {
      EmailEngine.instance = new EmailEngine();
    }
    return EmailEngine.instance;
  }

  /**
   * Process email rules for a given trigger event
   */
  async processRules(triggerEvent: string, data: any): Promise<void> {
    try {
      await connectDB();
      
      // Get active rules for this trigger event, ordered by priority
      const rules = await EmailRule.find({
        triggerEvent,
        isActive: true
      }).sort({ priority: -1 });

      for (const rule of rules) {
        try {
          // Check if conditions are met
          const conditionsMet = await this.evaluateConditions(rule.conditions, data);
          
          if (conditionsMet) {
            console.log(`Rule "${rule.name}" conditions met, executing actions...`);
            await this.executeActions(rule.actions, data);
          }
        } catch (error) {
          console.error(`Error processing rule "${rule.name}":`, error);
        }
      }
    } catch (error) {
      console.error('Error in email engine processRules:', error);
    }
  }

  /**
   * Evaluate conditions for a rule
   */
  private async evaluateConditions(conditions: any[], data: any): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, data);
      if (!result) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, data: any): Promise<boolean> {
    const { field, operator, value } = condition;
    
    // Get the field value from data
    const fieldValue = this.getFieldValue(data, field);
    
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Get field value from nested object using dot notation
   */
  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Execute actions for a rule
   */
  private async executeActions(actions: any[], data: any): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action, data);
      } catch (error) {
        console.error(`Error executing action:`, error);
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: any, data: any): Promise<void> {
    const { type, templateId, notificationType, status, waitTime, waitUnit } = action;

    switch (type) {
      case 'send_email':
        await this.sendEmail(templateId, data);
        break;
      case 'send_notification':
        await this.sendNotification(notificationType, data);
        break;
      case 'update_status':
        await this.updateStatus(status, data);
        break;
      case 'wait':
        // For time-based rules, we'll handle this in the cron job
        console.log(`Wait action: ${waitTime} ${waitUnit}`);
        break;
    }
  }

  /**
   * Send email using template
   */
  private async sendEmail(templateId: string, data: any): Promise<void> {
    if (!templateId) return;

    const template = await EmailTemplate.findById(templateId);
    if (!template || !template.isActive) return;

    // Get patient email from data
    const patientEmail = this.getFieldValue(data, 'patient.email') || this.getFieldValue(data, 'email');
    if (!patientEmail) return;

    // Prepare email data
    const emailData = {
      patientName: this.getFieldValue(data, 'patient.fullName') || this.getFieldValue(data, 'patientName'),
      therapistName: this.getFieldValue(data, 'therapist.fullName') || this.getFieldValue(data, 'therapistName'),
      appointmentDate: this.getFieldValue(data, 'date') ? new Date(this.getFieldValue(data, 'date')).toLocaleString() : '',
      reason: this.getFieldValue(data, 'reason') || '',
      paymentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment?appointmentId=${this.getFieldValue(data, '_id')}`,
      reminderType: this.getFieldValue(data, 'reminderType') || 'first_reminder'
    };

    // Send email based on template type
    switch (template.type) {
      case 'PaymentReminder':
        await sendPaymentReminderEmail(patientEmail, emailData);
        break;
      case 'AppointmentStatus':
        await sendAppointmentStatusEmail(patientEmail, 'status_update', emailData);
        break;
      default:
        await sendAppointmentStatusEmail(patientEmail, 'notification', emailData);
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(notificationType: string, data: any): Promise<void> {
    if (!notificationType) return;

    const userId = this.getFieldValue(data, 'patient._id') || this.getFieldValue(data, 'patientId');
    if (!userId) return;

    await triggerNotification(notificationType as any, userId, {
      planName: this.getFieldValue(data, 'plan'),
      therapistName: this.getFieldValue(data, 'therapist.fullName'),
      status: this.getFieldValue(data, 'status')
    });
  }

  /**
   * Update appointment status
   */
  private async updateStatus(status: string, data: any): Promise<void> {
    if (!status) return;

    const appointmentId = this.getFieldValue(data, '_id');
    if (!appointmentId) return;

    await Appointment.findByIdAndUpdate(appointmentId, { status });
  }

  /**
   * Process time-based rules (for cron jobs)
   */
  async processTimeBasedRules(): Promise<void> {
    try {
      await connectDB();
      
      const timeBasedRules = await EmailRule.find({
        triggerEvent: 'time_based',
        isActive: true
      }).sort({ priority: -1 });

      for (const rule of timeBasedRules) {
        try {
          // Find appointments that match the conditions
          const appointments = await this.findMatchingAppointments(rule.conditions);
          
          for (const appointment of appointments) {
            const conditionsMet = await this.evaluateConditions(rule.conditions, appointment);
            if (conditionsMet) {
              await this.executeActions(rule.actions, appointment);
            }
          }
        } catch (error) {
          console.error(`Error processing time-based rule "${rule.name}":`, error);
        }
      }
    } catch (error) {
      console.error('Error in processTimeBasedRules:', error);
    }
  }

  /**
   * Find appointments that match time-based conditions
   */
  private async findMatchingAppointments(conditions: any[]): Promise<any[]> {
    // This is a simplified version - in a real implementation,
    // you'd build a MongoDB query based on the conditions
    return await Appointment.find({})
      .populate('patient', 'fullName email')
      .populate('therapist', 'fullName email')
      .lean();
  }
}

export default EmailEngine.getInstance();
