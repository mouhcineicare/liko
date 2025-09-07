const mongoose = require('mongoose');
require('dotenv').config();

const APPOINTMENT_STATUSES = {
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PENDING_MATCH: 'pending_match',
  MATCHED_PENDING_THERAPIST_ACCEPTANCE: 'matched_pending_therapist_acceptance',
  PENDING_SCHEDULING: 'pending_scheduling',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no-show',
  RESCHEDULED: 'rescheduled'
};

const LEGACY_STATUSES = [
  'not_paid', 'pending_approval', 'approved', 'rejected', 
  'in_progress', 'completed_pending_validation', 'completed_validated', 'upcoming'
];

const VALID_TRANSITIONS = {
  [APPOINTMENT_STATUSES.UNPAID]: [APPOINTMENT_STATUSES.PENDING],
  [APPOINTMENT_STATUSES.PENDING]: [APPOINTMENT_STATUSES.PENDING_MATCH, APPOINTMENT_STATUSES.UNPAID],
  [APPOINTMENT_STATUSES.PENDING_MATCH]: [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE],
  [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE]: [APPOINTMENT_STATUSES.PENDING_SCHEDULING, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.PENDING_SCHEDULING]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.CONFIRMED]: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW],
  [APPOINTMENT_STATUSES.RESCHEDULED]: [APPOINTMENT_STATUSES.CONFIRMED],
  [APPOINTMENT_STATUSES.NO_SHOW]: [],
  [APPOINTMENT_STATUSES.CANCELLED]: [],
  [APPOINTMENT_STATUSES.COMPLETED]: []
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

class StatusSystemValidator {
  constructor() {
    this.Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
    this.AppointmentHistory = mongoose.model('AppointmentHistory', new mongoose.Schema({}, { strict: false }));
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalAppointments: 0,
      validAppointments: 0,
      invalidAppointments: 0,
      legacyStatuses: 0,
      missingHistory: 0
    };
  }

  async validateAll() {
    console.log('🔍 Starting comprehensive status system validation...\n');
    
    await this.validateStatusDistribution();
    await this.validateLegacyStatuses();
    await this.validateTransitionFlow();
    await this.validateRequiredFields();
    await this.validateBusinessRules();
    await this.validateHistoryConsistency();
    await this.validateRecentTransitions();
    
    this.printSummary();
  }

  async validateStatusDistribution() {
    console.log('📊 Validating Status Distribution...');
    
    const statusCounts = await this.Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Current status distribution:');
    statusCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count} appointments`);
      this.stats.totalAppointments += count;
    });

    // Check for unknown statuses
    const validStatuses = Object.values(APPOINTMENT_STATUSES);
    const unknownStatuses = statusCounts.filter(({ _id }) => 
      !validStatuses.includes(_id) && !LEGACY_STATUSES.includes(_id)
    );

    if (unknownStatuses.length > 0) {
      this.errors.push(`Found unknown statuses: ${unknownStatuses.map(s => s._id).join(', ')}`);
    }

    console.log('✅ Status distribution validation complete\n');
  }

  async validateLegacyStatuses() {
    console.log('🔄 Validating Legacy Status Cleanup...');
    
    const legacyCounts = await this.Appointment.aggregate([
      { $match: { status: { $in: LEGACY_STATUSES } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (legacyCounts.length > 0) {
      console.log('⚠️ Found legacy statuses:');
      legacyCounts.forEach(({ _id, count }) => {
        console.log(`  ${_id}: ${count} appointments`);
        this.stats.legacyStatuses += count;
      });
      this.warnings.push(`Found ${legacyCounts.length} legacy statuses that need migration`);
    } else {
      console.log('✅ No legacy statuses found');
    }

    console.log('✅ Legacy status validation complete\n');
  }

  async validateTransitionFlow() {
    console.log('🎯 Validating Transition Flow...');
    
    const invalidTransitions = await this.Appointment.find({
      $or: [
        // Unpaid with completed payment should be pending_match
        { status: APPOINTMENT_STATUSES.UNPAID, paymentStatus: 'completed' },
        // Pending_match without completed payment
        { status: APPOINTMENT_STATUSES.PENDING_MATCH, paymentStatus: { $ne: 'completed' } },
        // Confirmed without date
        { status: APPOINTMENT_STATUSES.CONFIRMED, date: { $exists: false } },
        // Pending_scheduling without therapist
        { status: APPOINTMENT_STATUSES.PENDING_SCHEDULING, therapist: { $exists: false } }
      ]
    });

    if (invalidTransitions.length > 0) {
      console.log(`🚨 Found ${invalidTransitions.length} appointments with invalid transitions:`);
      invalidTransitions.slice(0, 5).forEach(appt => {
        console.log(`  ${appt._id}: status=${appt.status}, payment=${appt.paymentStatus}, therapist=${appt.therapist ? 'yes' : 'no'}, date=${appt.date ? 'yes' : 'no'}`);
      });
      this.errors.push(`Found ${invalidTransitions.length} appointments with invalid transitions`);
      this.stats.invalidAppointments += invalidTransitions.length;
    } else {
      console.log('✅ All appointments follow valid transition flow');
      this.stats.validAppointments = this.stats.totalAppointments;
    }

    console.log('✅ Transition flow validation complete\n');
  }

  async validateRequiredFields() {
    console.log('🔧 Validating Required Fields...');
    
    const missingFields = await this.Appointment.find({
      $or: [
        { status: { $exists: false } },
        { paymentStatus: { $exists: false } },
        { patient: { $exists: false } },
        { plan: { $exists: false } },
        { price: { $exists: false } }
      ]
    });

    if (missingFields.length > 0) {
      console.log(`🚨 Found ${missingFields.length} appointments with missing required fields:`);
      missingFields.slice(0, 5).forEach(appt => {
        const missing = [];
        if (!appt.status) missing.push('status');
        if (!appt.paymentStatus) missing.push('paymentStatus');
        if (!appt.patient) missing.push('patient');
        if (!appt.plan) missing.push('plan');
        if (!appt.price) missing.push('price');
        console.log(`  ${appt._id}: missing ${missing.join(', ')}`);
      });
      this.errors.push(`Found ${missingFields.length} appointments with missing required fields`);
    } else {
      console.log('✅ All appointments have required fields');
    }

    console.log('✅ Required fields validation complete\n');
  }

  async validateBusinessRules() {
    console.log('📋 Validating Business Rules...');
    
    // Rule 1: Completed appointments should have therapist
    const completedWithoutTherapist = await this.Appointment.countDocuments({
      status: APPOINTMENT_STATUSES.COMPLETED,
      therapist: { $exists: false }
    });

    // Rule 2: Confirmed appointments should have date
    const confirmedWithoutDate = await this.Appointment.countDocuments({
      status: APPOINTMENT_STATUSES.CONFIRMED,
      date: { $exists: false }
    });

    // Rule 3: Pending_scheduling should have therapist
    const schedulingWithoutTherapist = await this.Appointment.countDocuments({
      status: APPOINTMENT_STATUSES.PENDING_SCHEDULING,
      therapist: { $exists: false }
    });

    if (completedWithoutTherapist > 0) {
      this.errors.push(`Found ${completedWithoutTherapist} completed appointments without therapist`);
    }

    if (confirmedWithoutDate > 0) {
      this.errors.push(`Found ${confirmedWithoutDate} confirmed appointments without date`);
    }

    if (schedulingWithoutTherapist > 0) {
      this.errors.push(`Found ${schedulingWithoutTherapist} scheduling appointments without therapist`);
    }

    if (completedWithoutTherapist === 0 && confirmedWithoutDate === 0 && schedulingWithoutTherapist === 0) {
      console.log('✅ All business rules validated');
    }

    console.log('✅ Business rules validation complete\n');
  }

  async validateHistoryConsistency() {
    console.log('📖 Validating History Consistency...');
    
    // Check if appointments have corresponding history entries
    const appointmentsWithHistory = await this.AppointmentHistory.aggregate([
      { $group: { _id: '$appointment', count: { $sum: 1 } } },
      { $count: 'total' }
    ]);

    const totalHistoryEntries = await this.AppointmentHistory.countDocuments();
    const uniqueAppointmentsWithHistory = appointmentsWithHistory[0]?.total || 0;

    console.log(`Total history entries: ${totalHistoryEntries}`);
    console.log(`Appointments with history: ${uniqueAppointmentsWithHistory}`);

    if (totalHistoryEntries === 0) {
      this.warnings.push('No appointment history found - new system may not be active');
    }

    console.log('✅ History consistency validation complete\n');
  }

  async validateRecentTransitions() {
    console.log('⏰ Validating Recent Transitions...');
    
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentTransitions = await this.AppointmentHistory.find({
      ts: { $gte: last24Hours }
    }).sort({ ts: -1 }).limit(10);

    if (recentTransitions.length > 0) {
      console.log(`Found ${recentTransitions.length} transitions in last 24 hours:`);
      recentTransitions.forEach(transition => {
        console.log(`  ${transition.from} → ${transition.to} by ${transition.actorRole} at ${transition.ts.toISOString()}`);
      });
    } else {
      this.warnings.push('No recent transitions found - system may not be active');
    }

    console.log('✅ Recent transitions validation complete\n');
  }

  printSummary() {
    console.log('📋 VALIDATION SUMMARY');
    console.log('====================');
    
    console.log(`Total Appointments: ${this.stats.totalAppointments}`);
    console.log(`Valid Appointments: ${this.stats.validAppointments}`);
    console.log(`Invalid Appointments: ${this.stats.invalidAppointments}`);
    console.log(`Legacy Statuses: ${this.stats.legacyStatuses}`);
    console.log(`Missing History: ${this.stats.missingHistory}`);
    
    console.log('\n🚨 ERRORS:');
    if (this.errors.length === 0) {
      console.log('  ✅ No errors found');
    } else {
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    console.log('\n⚠️ WARNINGS:');
    if (this.warnings.length === 0) {
      console.log('  ✅ No warnings');
    } else {
      this.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('  ✅ System is healthy and ready for production');
    } else {
      if (this.stats.legacyStatuses > 0) {
        console.log('  🔄 Run migration script: node scripts/migrate-to-new-status-system.js --apply');
      }
      if (this.stats.invalidAppointments > 0) {
        console.log('  🔧 Fix invalid appointment transitions');
      }
      if (this.stats.missingHistory > 0) {
        console.log('  📖 Enable new transition system: USE_NEW_TRANSITION_SYSTEM=true');
      }
    }
  }
}

async function main() {
  await connectDB();
  
  const validator = new StatusSystemValidator();
  await validator.validateAll();
  
  await mongoose.disconnect();
}

main().catch(console.error);
