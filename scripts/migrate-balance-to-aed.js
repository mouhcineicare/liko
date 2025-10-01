#!/usr/bin/env node

/**
 * Migration Script: Convert Balance System from Sessions to AED
 * 
 * This script migrates existing balance data from the old session-based system
 * to the new AED-based system.
 * 
 * Usage:
 *   node scripts/migrate-balance-to-aed.js --dry-run
 *   node scripts/migrate-balance-to-aed.js --apply
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

// Define the old balance schema for migration
const oldBalanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalSessions: { type: Number, required: true, default: 0, min: 0 },
  spentSessions: { type: Number, required: true, default: 0, min: 0 },
  history: [{
    action: { type: String, enum: ['added', 'removed', 'used'], required: true },
    sessions: { type: Number, required: true },
    plan: { type: String, ref: 'Plan' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now },
    price: { type: Number, default: 0 },
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
    sessionsAdded: { type: Number, required: true },
    receiptUrl: String,
    paymentType: { type: String, enum: ['payment_intent', 'charge', 'checkout_session', 'subscription', 'renew_now', 'unknown'], required: true, default: 'unknown' },
    _id: false
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Add virtual for remaining sessions
oldBalanceSchema.virtual('remainingSessions').get(function() {
  return this.totalSessions - this.spentSessions > 0 ? this.totalSessions - this.spentSessions : 0;
});

const OldBalance = mongoose.model('OldBalance', oldBalanceSchema);

// Define the new balance schema
const newBalanceSchema = new mongoose.Schema({
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

const NewBalance = mongoose.model('NewBalance', newBalanceSchema);

const DEFAULT_BALANCE_RATE = 90; // AED per session

async function migrateBalanceData(dryRun = true) {
  try {
    console.log(`\n🔄 Starting balance migration (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...\n`);

    // Get all existing balances
    const oldBalances = await OldBalance.find({}).populate('user');
    console.log(`📊 Found ${oldBalances.length} balance records to migrate\n`);

    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const oldBalance of oldBalances) {
      try {
        console.log(`\n👤 Migrating balance for user: ${oldBalance.user?.email || oldBalance.user?._id}`);

        // Calculate new balance amount
        const remainingSessions = oldBalance.remainingSessions || 0;
        const newBalanceAmount = remainingSessions * DEFAULT_BALANCE_RATE;

        console.log(`   Old: ${oldBalance.totalSessions} total, ${oldBalance.spentSessions} spent, ${remainingSessions} remaining sessions`);
        console.log(`   New: ${newBalanceAmount} AED balance`);

        // Convert history
        const newHistory = oldBalance.history.map(item => ({
          action: item.action,
          amount: item.sessions * DEFAULT_BALANCE_RATE, // Convert sessions to AED
          plan: item.plan,
          admin: item.admin,
          reason: item.reason,
          createdAt: item.createdAt,
          type: item.type,
          description: item.description,
          date: item.date,
          appointmentId: item.appointmentId,
          surcharge: item.surcharge
        }));

        // Convert payments
        const newPayments = oldBalance.payments.map(payment => ({
          paymentId: payment.paymentId,
          amount: payment.amount,
          currency: payment.currency,
          date: payment.date,
          amountAdded: payment.sessionsAdded * DEFAULT_BALANCE_RATE, // Convert sessions to AED
          receiptUrl: payment.receiptUrl,
          paymentType: payment.paymentType
        }));

        const newBalanceData = {
          user: oldBalance.user._id,
          balanceAmount: newBalanceAmount,
          history: newHistory,
          payments: newPayments,
          createdAt: oldBalance.createdAt,
          updatedAt: oldBalance.updatedAt
        };

        if (dryRun) {
          console.log(`   ✅ Would migrate to: ${newBalanceAmount} AED balance`);
          console.log(`   📝 History items: ${newHistory.length}`);
          console.log(`   💳 Payment records: ${newPayments.length}`);
        } else {
          // Create new balance record
          const newBalance = new NewBalance(newBalanceData);
          await newBalance.save();
          
          // Remove old balance record
          await OldBalance.findByIdAndDelete(oldBalance._id);
          
          console.log(`   ✅ Migrated successfully`);
        }

        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Error migrating balance for user ${oldBalance.user?.email || oldBalance.user?._id}:`, error.message);
        errors.push({
          userId: oldBalance.user?._id,
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${oldBalances.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. User ${error.userId}: ${error.error}`);
      });
    }

    if (dryRun) {
      console.log(`\n🔍 This was a DRY RUN. No data was actually modified.`);
      console.log(`   To apply the migration, run: node scripts/migrate-balance-to-aed.js --apply`);
    } else {
      console.log(`\n🎉 Migration completed successfully!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--apply');

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode. No data will be modified.');
  } else {
    console.log('⚠️  Running in LIVE mode. Data will be permanently modified.');
    console.log('   Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await connectDB();
  await migrateBalanceData(isDryRun);
  
  console.log('\n👋 Migration script completed');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
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
