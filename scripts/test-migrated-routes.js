const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testMigration() {
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
  
  console.log('🧪 Testing Migration Results...\n');
  
  // Test 1: Check status distribution
  console.log('📊 Status Distribution:');
  const statusCounts = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  statusCounts.forEach(({ _id, count }) => {
    console.log(`  ${_id}: ${count} appointments`);
  });
  
  // Test 2: Check for legacy statuses
  console.log('\n🔍 Legacy Status Check:');
  const legacyStatuses = ['not_paid', 'pending_approval', 'approved', 'rejected', 'in_progress', 'completed_pending_validation', 'completed_validated', 'upcoming'];
  
  for (const legacyStatus of legacyStatuses) {
    const count = await Appointment.countDocuments({ status: legacyStatus });
    if (count > 0) {
      console.log(`  ⚠️  Found ${count} appointments with legacy status: ${legacyStatus}`);
    } else {
      console.log(`  ✅ No appointments with legacy status: ${legacyStatus}`);
    }
  }
  
  // Test 3: Check payment status distribution
  console.log('\n💳 Payment Status Distribution:');
  const paymentStatusCounts = await Appointment.aggregate([
    { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  paymentStatusCounts.forEach(({ _id, count }) => {
    console.log(`  ${_id}: ${count} appointments`);
  });
  
  // Test 4: Check for appointments with missing required fields
  console.log('\n🔧 Data Integrity Check:');
  
  const missingTherapist = await Appointment.countDocuments({ 
    status: { $in: ['matched_pending_therapist_acceptance', 'pending_scheduling', 'confirmed'] },
    therapist: { $exists: false }
  });
  
  const missingDate = await Appointment.countDocuments({ 
    status: { $in: ['confirmed', 'completed', 'no-show'] },
    date: { $exists: false }
  });
  
  const unpaidWithCompletedPayment = await Appointment.countDocuments({ 
    status: 'unpaid',
    paymentStatus: 'completed'
  });
  
  console.log(`  Missing therapist for active appointments: ${missingTherapist}`);
  console.log(`  Missing date for scheduled appointments: ${missingDate}`);
  console.log(`  Unpaid appointments with completed payment: ${unpaidWithCompletedPayment}`);
  
  // Test 5: Check transition flow compliance
  console.log('\n🎯 Transition Flow Check:');
  
  const flowIssues = [];
  
  // Check for invalid transitions
  const invalidTransitions = await Appointment.find({
    $or: [
      { status: 'unpaid', paymentStatus: 'completed' }, // Should be pending_match
      { status: 'pending_match', paymentStatus: 'pending' }, // Should have completed payment
      { status: 'confirmed', date: { $exists: false } }, // Should have date
      { status: 'pending_scheduling', therapist: { $exists: false } } // Should have therapist
    ]
  });
  
  if (invalidTransitions.length > 0) {
    console.log(`  ⚠️  Found ${invalidTransitions.length} appointments with invalid transitions`);
    invalidTransitions.slice(0, 5).forEach(appt => {
      console.log(`    - ${appt._id}: status=${appt.status}, payment=${appt.paymentStatus}, therapist=${appt.therapist ? 'yes' : 'no'}, date=${appt.date ? 'yes' : 'no'}`);
    });
  } else {
    console.log('  ✅ All appointments follow valid transition flow');
  }
  
  // Test 6: Sample recent appointments
  console.log('\n📋 Recent Appointments Sample:');
  const recentAppointments = await Appointment.find()
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('_id status paymentStatus therapist date updatedAt');
  
  recentAppointments.forEach(appt => {
    console.log(`  ${appt._id}: ${appt.status} (${appt.paymentStatus}) - ${appt.date ? appt.date.toISOString().split('T')[0] : 'no date'}`);
  });
  
  console.log('\n🎉 Migration Test Complete!');
}

async function main() {
  await connectDB();
  await testMigration();
  await mongoose.disconnect();
}

main().catch(console.error);
