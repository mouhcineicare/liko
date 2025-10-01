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

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testRescheduleFix() {
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
  
  console.log('🧪 Testing Reschedule Fix...\n');
  
  // Find appointments that were rescheduled and went to pending_match
  const problematicAppointments = await Appointment.find({
    $or: [
      { isSameDayReschedule: true, status: APPOINTMENT_STATUSES.PENDING_MATCH },
      { isRescheduled: true, status: APPOINTMENT_STATUSES.PENDING_MATCH },
      { status: APPOINTMENT_STATUSES.PENDING_MATCH, paymentStatus: 'completed', isStripeVerified: true }
    ]
  }).sort({ updatedAt: -1 }).limit(10);
  
  console.log(`Found ${problematicAppointments.length} potentially problematic appointments:`);
  
  problematicAppointments.forEach((appt, index) => {
    console.log(`\n${index + 1}. Appointment ${appt._id}:`);
    console.log(`   Status: ${appt.status}`);
    console.log(`   Payment Status: ${appt.paymentStatus}`);
    console.log(`   Is Stripe Verified: ${appt.isStripeVerified}`);
    console.log(`   Is Same Day Reschedule: ${appt.isSameDayReschedule}`);
    console.log(`   Is Rescheduled: ${appt.isRescheduled}`);
    console.log(`   Date: ${appt.date}`);
    console.log(`   Updated: ${appt.updatedAt}`);
    
    // Determine what the status should be
    let shouldBeStatus = APPOINTMENT_STATUSES.PENDING_MATCH;
    if (appt.isSameDayReschedule || appt.isRescheduled) {
      shouldBeStatus = APPOINTMENT_STATUSES.RESCHEDULED;
    } else if (appt.status === APPOINTMENT_STATUSES.CONFIRMED) {
      shouldBeStatus = APPOINTMENT_STATUSES.CONFIRMED;
    }
    
    if (appt.status !== shouldBeStatus) {
      console.log(`   ❌ Should be: ${shouldBeStatus}`);
    } else {
      console.log(`   ✅ Status is correct`);
    }
  });
  
  // Check for appointments with correct reschedule behavior
  const correctReschedules = await Appointment.find({
    $or: [
      { isSameDayReschedule: true, status: APPOINTMENT_STATUSES.RESCHEDULED },
      { isSameDayReschedule: true, status: APPOINTMENT_STATUSES.CONFIRMED },
      { isRescheduled: true, status: APPOINTMENT_STATUSES.RESCHEDULED }
    ]
  }).sort({ updatedAt: -1 }).limit(5);
  
  console.log(`\n✅ Found ${correctReschedules.length} correctly handled reschedules:`);
  
  correctReschedules.forEach((appt, index) => {
    console.log(`\n${index + 1}. Appointment ${appt._id}:`);
    console.log(`   Status: ${appt.status}`);
    console.log(`   Payment Status: ${appt.paymentStatus}`);
    console.log(`   Is Same Day Reschedule: ${appt.isSameDayReschedule}`);
    console.log(`   Is Rescheduled: ${appt.isRescheduled}`);
    console.log(`   Date: ${appt.date}`);
  });
  
  // Summary
  const totalReschedules = await Appointment.countDocuments({
    $or: [
      { isSameDayReschedule: true },
      { isRescheduled: true }
    ]
  });
  
  const correctStatusReschedules = await Appointment.countDocuments({
    $or: [
      { isSameDayReschedule: true, status: { $in: [APPOINTMENT_STATUSES.RESCHEDULED, APPOINTMENT_STATUSES.CONFIRMED] } },
      { isRescheduled: true, status: APPOINTMENT_STATUSES.RESCHEDULED }
    ]
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total reschedules: ${totalReschedules}`);
  console.log(`   Correctly handled: ${correctStatusReschedules}`);
  console.log(`   Incorrectly handled: ${totalReschedules - correctStatusReschedules}`);
  console.log(`   Success rate: ${((correctStatusReschedules / totalReschedules) * 100).toFixed(1)}%`);
  
  if (totalReschedules - correctStatusReschedules > 0) {
    console.log(`\n🔧 Recommendation: Run fix script to correct ${totalReschedules - correctStatusReschedules} appointments`);
  } else {
    console.log(`\n✅ All reschedules are correctly handled!`);
  }
}

async function fixRescheduleStatuses() {
  const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
  
  console.log('🔧 Fixing reschedule statuses...\n');
  
  // Fix same-day reschedules that went to pending_match
  const sameDayReschedules = await Appointment.find({
    isSameDayReschedule: true,
    status: APPOINTMENT_STATUSES.PENDING_MATCH,
    paymentStatus: 'completed',
    isStripeVerified: true
  });
  
  console.log(`Found ${sameDayReschedules.length} same-day reschedules to fix`);
  
  for (const appt of sameDayReschedules) {
    await Appointment.findByIdAndUpdate(appt._id, {
      status: APPOINTMENT_STATUSES.RESCHEDULED,
      updatedAt: new Date()
    });
    console.log(`✅ Fixed appointment ${appt._id}: ${APPOINTMENT_STATUSES.PENDING_MATCH} → ${APPOINTMENT_STATUSES.RESCHEDULED}`);
  }
  
  // Fix regular reschedules that went to pending_match
  const regularReschedules = await Appointment.find({
    isRescheduled: true,
    status: APPOINTMENT_STATUSES.PENDING_MATCH,
    paymentStatus: 'completed',
    isStripeVerified: true
  });
  
  console.log(`Found ${regularReschedules.length} regular reschedules to fix`);
  
  for (const appt of regularReschedules) {
    await Appointment.findByIdAndUpdate(appt._id, {
      status: APPOINTMENT_STATUSES.RESCHEDULED,
      updatedAt: new Date()
    });
    console.log(`✅ Fixed appointment ${appt._id}: ${APPOINTMENT_STATUSES.PENDING_MATCH} → ${APPOINTMENT_STATUSES.RESCHEDULED}`);
  }
  
  console.log(`\n🎉 Fixed ${sameDayReschedules.length + regularReschedules.length} appointments!`);
}

async function main() {
  await connectDB();
  
  if (process.argv.includes('--fix')) {
    await fixRescheduleStatuses();
  } else {
    await testRescheduleFix();
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
