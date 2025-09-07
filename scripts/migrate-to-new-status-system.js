const mongoose = require('mongoose');
require('dotenv').config();

const LEGACY_STATUS_MAPPING = {
  'not_paid': 'unpaid',
  'pending': 'pending',
  'pending_approval': 'matched_pending_therapist_acceptance',
  'approved': 'confirmed',
  'rejected': 'cancelled',
  'in_progress': 'confirmed',
  'completed_pending_validation': 'completed',
  'completed_validated': 'completed',
  'upcoming': 'confirmed'
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

async function migrateAppointments() {
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
  
  console.log('🔍 Analyzing current appointment statuses...');
  
  const statusCounts = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  console.log('Current status distribution:');
  statusCounts.forEach(({ _id, count }) => {
    console.log(`  ${_id}: ${count} appointments`);
  });
  
  const appointmentsToMigrate = await Appointment.find({
    status: { $in: Object.keys(LEGACY_STATUS_MAPPING) }
  });
  
  console.log(`\n📊 Found ${appointmentsToMigrate.length} appointments to migrate`);
  
  if (process.argv.includes('--apply')) {
    console.log('🚀 Applying migrations...');
    
    for (const appointment of appointmentsToMigrate) {
      const oldStatus = appointment.status;
      const newStatus = LEGACY_STATUS_MAPPING[oldStatus];
      
      if (newStatus) {
        await Appointment.findByIdAndUpdate(appointment._id, { status: newStatus });
        console.log(`  ✅ ${appointment._id}: ${oldStatus} → ${newStatus}`);
      }
    }
    
    console.log('🎉 Migration completed!');
  } else {
    console.log('🔍 Dry run - use --apply to execute migrations');
    console.log('Migrations that would be applied:');
    
    appointmentsToMigrate.forEach(appointment => {
      const oldStatus = appointment.status;
      const newStatus = LEGACY_STATUS_MAPPING[oldStatus];
      if (newStatus) {
        console.log(`  ${appointment._id}: ${oldStatus} → ${newStatus}`);
      }
    });
  }
}

async function main() {
  await connectDB();
  await migrateAppointments();
  await mongoose.disconnect();
}

main().catch(console.error);
