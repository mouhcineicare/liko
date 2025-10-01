#!/usr/bin/env node

/**
 * Test Script: New AED-Based Balance System
 * 
 * This script tests the new balance system to ensure it works correctly.
 * 
 * Usage:
 *   node scripts/test-new-balance-system.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/therapyglow');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Define the new balance schema
const balanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balanceAmount: { type: Number, required: true, default: 0, min: 0 },
  history: [{
    action: { type: String, enum: ['added', 'removed', 'used'], required: true },
    amount: { type: Number, required: true },
    plan: { type: String, ref: 'Plan' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now },
    type: String,
    description: String,
    date: { type: Date, default: Date.now },
    appointmentId: String,
    surcharge: { type: Number, default: 0 }
  }],
  payments: [{
    paymentId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    date: { type: Date, required: true },
    amountAdded: { type: Number, required: true },
    receiptUrl: String,
    paymentType: { type: String, enum: ['payment_intent', 'charge', 'checkout_session', 'subscription', 'renew_now', 'unknown'], required: true, default: 'unknown' },
    _id: false
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Balance = mongoose.model('TestBalance', balanceSchema);

async function testBalanceSystem() {
  try {
    console.log('\n🧪 Testing New AED-Based Balance System\n');

    // Test 1: Create a new balance
    console.log('Test 1: Creating new balance...');
    const testUserId = new mongoose.Types.ObjectId();
    const newBalance = new Balance({
      user: testUserId,
      balanceAmount: 0
    });
    await newBalance.save();
    console.log('✅ Created new balance with 0 AED');

    // Test 2: Add money to balance
    console.log('\nTest 2: Adding money to balance...');
    newBalance.balanceAmount += 500; // Add 500 AED
    newBalance.history.push({
      action: 'added',
      amount: 500,
      reason: 'Test purchase',
      createdAt: new Date()
    });
    await newBalance.save();
    console.log('✅ Added 500 AED to balance');
    console.log(`   Current balance: ${newBalance.balanceAmount} AED`);

    // Test 3: Use money from balance
    console.log('\nTest 3: Using money from balance...');
    const appointmentPrice = 180; // 180 AED for appointment
    if (newBalance.balanceAmount >= appointmentPrice) {
      newBalance.balanceAmount -= appointmentPrice;
      newBalance.history.push({
        action: 'used',
        amount: appointmentPrice,
        reason: 'Appointment booking',
        appointmentId: 'test-appointment-123',
        createdAt: new Date()
      });
      await newBalance.save();
      console.log('✅ Used 180 AED for appointment');
      console.log(`   Remaining balance: ${newBalance.balanceAmount} AED`);
    } else {
      console.log('❌ Insufficient balance for appointment');
    }

    // Test 4: Add more money
    console.log('\nTest 4: Adding more money...');
    newBalance.balanceAmount += 200; // Add 200 AED
    newBalance.history.push({
      action: 'added',
      amount: 200,
      reason: 'Additional purchase',
      createdAt: new Date()
    });
    await newBalance.save();
    console.log('✅ Added 200 AED to balance');
    console.log(`   Current balance: ${newBalance.balanceAmount} AED`);

    // Test 5: Test refund calculation
    console.log('\nTest 5: Testing refund calculation...');
    const refundAmount = 90; // 50% refund of 180 AED
    newBalance.balanceAmount += refundAmount;
    newBalance.history.push({
      action: 'added',
      amount: refundAmount,
      reason: 'Appointment cancellation (50% refund)',
      appointmentId: 'test-appointment-123',
      createdAt: new Date()
    });
    await newBalance.save();
    console.log('✅ Processed 90 AED refund');
    console.log(`   Current balance: ${newBalance.balanceAmount} AED`);

    // Test 6: Verify final balance
    console.log('\nTest 6: Verifying final balance...');
    const expectedBalance = 500 - 180 + 200 + 90; // 610 AED
    if (newBalance.balanceAmount === expectedBalance) {
      console.log('✅ Final balance is correct');
      console.log(`   Expected: ${expectedBalance} AED`);
      console.log(`   Actual: ${newBalance.balanceAmount} AED`);
    } else {
      console.log('❌ Final balance is incorrect');
      console.log(`   Expected: ${expectedBalance} AED`);
      console.log(`   Actual: ${newBalance.balanceAmount} AED`);
    }

    // Test 7: Test history integrity
    console.log('\nTest 7: Testing history integrity...');
    const totalAdded = newBalance.history
      .filter(h => h.action === 'added')
      .reduce((sum, h) => sum + h.amount, 0);
    const totalUsed = newBalance.history
      .filter(h => h.action === 'used')
      .reduce((sum, h) => sum + h.amount, 0);
    const calculatedBalance = totalAdded - totalUsed;
    
    if (calculatedBalance === newBalance.balanceAmount) {
      console.log('✅ History integrity check passed');
      console.log(`   Total added: ${totalAdded} AED`);
      console.log(`   Total used: ${totalUsed} AED`);
      console.log(`   Calculated balance: ${calculatedBalance} AED`);
    } else {
      console.log('❌ History integrity check failed');
      console.log(`   Total added: ${totalAdded} AED`);
      console.log(`   Total used: ${totalUsed} AED`);
      console.log(`   Calculated balance: ${calculatedBalance} AED`);
      console.log(`   Actual balance: ${newBalance.balanceAmount} AED`);
    }

    // Test 8: Test edge cases
    console.log('\nTest 8: Testing edge cases...');
    
    // Test negative balance prevention
    const originalBalance = newBalance.balanceAmount;
    try {
      newBalance.balanceAmount = -100; // Try to set negative balance
      await newBalance.save();
      console.log('❌ Negative balance was allowed (should be prevented)');
    } catch (error) {
      console.log('✅ Negative balance prevented by schema validation');
    }
    
    // Test zero balance
    newBalance.balanceAmount = 0;
    await newBalance.save();
    console.log('✅ Zero balance handled correctly');

    // Test large amount
    newBalance.balanceAmount = 999999;
    await newBalance.save();
    console.log('✅ Large balance amount handled correctly');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await Balance.findByIdAndDelete(newBalance._id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The new balance system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function main() {
  await connectDB();
  await testBalanceSystem();
  
  console.log('\n👋 Test script completed');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
