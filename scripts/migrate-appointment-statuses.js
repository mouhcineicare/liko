#!/usr/bin/env node

/**
 * Migration script to clean up appointment statuses
 * Converts conflicting statuses to the new simplified system
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/therapy-app';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Status mapping for migration
const STATUS_MIGRATION_MAP = {
  // Map conflicting statuses to clean ones
  'not_paid': 'unpaid',
  'pending': 'pending_match',
  'pending_approval': 'matched_pending_therapist_acceptance',
  'approved': 'confirmed',
  'rejected': 'cancelled',
  'in_progress': 'confirmed',
  'completed_pending_validation': 'completed',
  'completed_validated': 'completed',
  'pending_scheduling': 'pending_scheduling',
  'matched_pending_therapist_acceptance': 'matched_pending_therapist_acceptance',
  'pending_match': 'pending_match',
  'rescheduled': 'rescheduled',
  'cancelled': 'cancelled',
  'completed': 'completed',
  'no-show': 'no-show'
};

// Get Appointment model
async function getAppointmentModel() {
  try {
    // Define the schema inline since we're in a script
    const appointmentSchema = new mongoose.Schema({
      status: String,
      paymentStatus: String,
      isPaid: Boolean,
      date: Date,
      isConfirmed: Boolean,
      completedSessions: Number,
      totalSessions: Number,
      recurring: [mongoose.Schema.Types.Mixed],
      sessionsHistory: [String]
    }, { strict: false }); // Allow all fields

    return mongoose.model('Appointment', appointmentSchema);
  } catch (error) {
    console.error('❌ Error getting Appointment model:', error);
    throw error;
  }
}

// Analyze current status distribution
async function analyzeStatuses(Appointment) {
  console.log('\n📊 Analyzing current appointment statuses...');
  
  const statusCounts = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  console.log('Current status distribution:');
  statusCounts.forEach(({ _id, count }) => {
    const newStatus = STATUS_MIGRATION_MAP[_id] || 'unchanged';
    console.log(`  ${_id}: ${count} → ${newStatus}`);
  });

  return statusCounts;
}

// Migrate statuses
async function migrateStatuses(Appointment, dryRun = true) {
  console.log(`\n🔄 ${dryRun ? 'DRY RUN: ' : ''}Migrating appointment statuses...`);
  
  let totalUpdated = 0;
  let errors = 0;

  for (const [oldStatus, newStatus] of Object.entries(STATUS_MIGRATION_MAP)) {
    if (oldStatus === newStatus) continue;

    try {
      const filter = { status: oldStatus };
      const update = { status: newStatus };
      
      if (dryRun) {
        const count = await Appointment.countDocuments(filter);
        if (count > 0) {
          console.log(`  Would update ${count} appointments: ${oldStatus} → ${newStatus}`);
          totalUpdated += count;
        }
      } else {
        const result = await Appointment.updateMany(filter, update);
        if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated ${result.modifiedCount} appointments: ${oldStatus} → ${newStatus}`);
          totalUpdated += result.modifiedCount;
        }
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${oldStatus} → ${newStatus}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📈 ${dryRun ? 'DRY RUN SUMMARY: ' : ''}Total appointments to update: ${totalUpdated}`);
  if (errors > 0) {
    console.log(`❌ Errors encountered: ${errors}`);
  }

  return { totalUpdated, errors };
}

// Clean up invalid dates
async function cleanupInvalidDates(Appointment, dryRun = true) {
  console.log(`\n🧹 ${dryRun ? 'DRY RUN: ' : ''}Cleaning up invalid dates...`);
  
  try {
    // Find appointments with invalid dates
    const invalidDateAppointments = await Appointment.find({
      $or: [
        { date: { $exists: false } },
        { date: null },
        { date: { $type: "invalid" } }
      ]
    });

    if (invalidDateAppointments.length === 0) {
      console.log('  ✅ No invalid dates found');
      return 0;
    }

    console.log(`  Found ${invalidDateAppointments.length} appointments with invalid dates`);
    
    if (!dryRun) {
      // Set a default date (1 week from now) for invalid dates
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      
      const result = await Appointment.updateMany(
        {
          $or: [
            { date: { $exists: false } },
            { date: null },
            { date: { $type: "invalid" } }
          ]
        },
        { date: defaultDate }
      );
      
      console.log(`  ✅ Fixed ${result.modifiedCount} invalid dates`);
      return result.modifiedCount;
    } else {
      console.log(`  Would fix ${invalidDateAppointments.length} invalid dates`);
      return invalidDateAppointments.length;
    }
  } catch (error) {
    console.error('  ❌ Error cleaning up invalid dates:', error.message);
    return 0;
  }
}

// Main migration function
async function runMigration() {
  try {
    await connectDB();
    
    const Appointment = await getAppointmentModel();
    
    // Analyze current state
    await analyzeStatuses(Appointment);
    
    // Clean up invalid dates
    await cleanupInvalidDates(Appointment, true); // Dry run first
    
    // Migrate statuses (dry run first)
    await migrateStatuses(Appointment, true);
    
    console.log('\n🚀 DRY RUN COMPLETED!');
    console.log('To apply changes, run: node scripts/migrate-appointment-statuses.js --apply');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Check if --apply flag is passed
const shouldApply = process.argv.includes('--apply');

if (shouldApply) {
  console.log('🚨 APPLYING CHANGES (not a dry run)...');
  runMigration().then(async () => {
    const Appointment = await getAppointmentModel();
    await cleanupInvalidDates(Appointment, false);
    await migrateStatuses(Appointment, false);
    console.log('\n🎉 MIGRATION COMPLETED!');
    process.exit(0);
  });
} else {
  console.log('🔍 Running in DRY RUN mode...');
  runMigration();
}

