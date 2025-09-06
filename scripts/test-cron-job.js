#!/usr/bin/env node

/**
 * Test script for the appointment completion cron job
 * Verifies database connection and appointment processing logic
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/therapy-app';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
}

// Test appointment processing logic
async function testAppointmentProcessing() {
  try {
    console.log('\n🧪 Testing appointment processing logic...');
    
    // Get Appointment model (use existing if compiled, otherwise create)
    let Appointment;
    if (mongoose.models.Appointment) {
      Appointment = mongoose.models.Appointment;
    } else {
      Appointment = mongoose.model('Appointment', new mongoose.Schema({
        status: String,
        paymentStatus: String,
        isPaid: Boolean,
        date: Date,
        isConfirmed: Boolean,
        completedSessions: Number,
        totalSessions: Number,
        recurring: [mongoose.Schema.Types.Mixed],
        sessionsHistory: [String]
      }, { strict: false }));
    }

    // Test 1: Find expired PAID appointments
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    console.log('  📅 Current time:', now.toISOString());
    console.log('  📅 One hour ago:', oneHourAgo.toISOString());
    
    const expiredAppointments = await Appointment.find({
      date: { $lte: oneHourAgo },
      status: { $in: ['confirmed', 'in_progress', 'unpaid', 'matched_pending_therapist_acceptance', 'rescheduled'] },
      paymentStatus: 'completed',
      isPaid: true,
    });

    console.log(`  📊 Found ${expiredAppointments.length} expired PAID appointments`);
    
    if (expiredAppointments.length > 0) {
      console.log('  📋 Sample appointments:');
      expiredAppointments.slice(0, 3).forEach((apt, index) => {
        console.log(`    ${index + 1}. ID: ${apt._id}`);
        console.log(`       Status: ${apt.status}`);
        console.log(`       Date: ${apt.date}`);
        console.log(`       Payment: ${apt.paymentStatus} (isPaid: ${apt.isPaid})`);
        console.log(`       Sessions: ${apt.completedSessions}/${apt.totalSessions}`);
        console.log(`       Confirmed: ${apt.isConfirmed}`);
      });
    }

    // Test 2: Check for appointments with missing dates
    const missingDateAppointments = await Appointment.find({
      $or: [
        { date: { $exists: false } },
        { date: null }
      ]
    });

    console.log(`  ⚠️  Found ${missingDateAppointments.length} appointments with missing dates`);
    
    if (missingDateAppointments.length > 0) {
      console.log('  🚨 Missing date appointments:');
      missingDateAppointments.slice(0, 3).forEach((apt, index) => {
        console.log(`    ${index + 1}. ID: ${apt._id}`);
        console.log(`       Status: ${apt.status}`);
        console.log(`       Date: ${apt.date}`);
        console.log(`       Date type: ${typeof apt.date}`);
      });
    }

    // Test 2b: Check for appointments with potentially corrupted dates
    const allAppointments = await Appointment.find({}).limit(100);
    const corruptedDates = allAppointments.filter(apt => {
      if (!apt.date) return false;
      try {
        const date = new Date(apt.date);
        return isNaN(date.getTime());
      } catch {
        return true;
      }
    });

    console.log(`  🚨 Found ${corruptedDates.length} appointments with potentially corrupted dates`);
    
    if (corruptedDates.length > 0) {
      console.log('  🚨 Corrupted date appointments:');
      corruptedDates.slice(0, 3).forEach((apt, index) => {
        console.log(`    ${index + 1}. ID: ${apt._id}`);
        console.log(`       Status: ${apt.status}`);
        console.log(`       Date: ${apt.date}`);
        console.log(`       Date type: ${typeof apt.date}`);
        console.log(`       Date string: ${String(apt.date)}`);
      });
    }

    // Test 3: Check payment status distribution
    const paymentStatusCounts = await Appointment.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('  💳 Payment status distribution:');
    paymentStatusCounts.forEach(({ _id, count }) => {
      console.log(`    ${_id || 'undefined'}: ${count}`);
    });

    // Test 4: Check isPaid distribution
    const isPaidCounts = await Appointment.aggregate([
      { $group: { _id: '$isPaid', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('  💰 isPaid distribution:');
    isPaidCounts.forEach(({ _id, count }) => {
      console.log(`    ${_id || 'undefined'}: ${count}`);
    });

    return {
      expiredCount: expiredAppointments.length,
      missingDateCount: missingDateAppointments.length,
      corruptedDateCount: corruptedDates.length,
      paymentStatusCounts,
      isPaidCounts
    };

  } catch (error) {
    console.error('  ❌ Error testing appointment processing:', error);
    throw error;
  }
}

// Test recurring date processing
async function testRecurringDateProcessing() {
  try {
    console.log('\n🔄 Testing recurring date processing...');
    
    // Use the same model instance to avoid compilation errors
    const Appointment = mongoose.models.Appointment;

    // Find appointments with recurring dates
    const recurringAppointments = await Appointment.find({
      recurring: { $exists: true, $ne: [] }
    });

    console.log(`  📅 Found ${recurringAppointments.length} appointments with recurring dates`);
    
    if (recurringAppointments.length > 0) {
      console.log('  📋 Sample recurring appointments:');
      recurringAppointments.slice(0, 3).forEach((apt, index) => {
        console.log(`    ${index + 1}. ID: ${apt._id}`);
        console.log(`       Recurring count: ${apt.recurring.length}`);
        console.log(`       Recurring types: ${apt.recurring.map(r => typeof r).join(', ')}`);
        console.log(`       Sample recurring: ${JSON.stringify(apt.recurring.slice(0, 2))}`);
      });
    }

    return recurringAppointments.length;

  } catch (error) {
    console.error('  ❌ Error testing recurring date processing:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  try {
    console.log('🧪 Starting cron job tests...\n');
    
    // Test 1: Database connection
    const connected = await connectDB();
    if (!connected) {
      console.log('❌ Cannot proceed without database connection');
      return;
    }

    // Test 2: Appointment processing logic
    const processingResults = await testAppointmentProcessing();
    
    // Test 3: Recurring date processing
    const recurringCount = await testRecurringDateProcessing();
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`  ✅ Database connection: ${connected ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  📅 Expired appointments: ${processingResults.expiredCount}`);
    console.log(`  ⚠️  Missing dates: ${processingResults.missingDateCount}`);
    console.log(`  🚨 Corrupted dates: ${processingResults.corruptedDateCount}`);
    console.log(`  🔄 Recurring appointments: ${recurringCount}`);
    
    if (processingResults.missingDateCount > 0 || processingResults.corruptedDateCount > 0) {
      console.log('\n🚨 WARNING: Found appointments with date issues!');
      console.log('   Run the migration script to fix these issues.');
    }
    
    if (processingResults.expiredCount === 0) {
      console.log('\n💡 NOTE: No expired appointments found.');
      console.log('   This is normal if all appointments are recent or future-dated.');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run tests
runTests();
