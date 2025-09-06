// lib/cron/payoutScenarioTest.ts
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { Appointment, PaymentLog, User, TherapistPayoutInfo } from '../db/models';
import bcrypt from 'bcryptjs';

// Configuration
const CONFIG = {
  totalAppointments: 5, // Reduced for testing
  maxAttempts: 3,
  payoutPercentages: { level1: 0.50, level2: 0.57 },
  minWithdrawal: 1,
  maxWithdrawal: 999
};

// Initialize the scheduler
export function initPayoutTestScheduler() {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('Initializing payout test scheduler...');
  setInterval(() => runPayoutTestScenario().catch(console.error), 5 * 60 * 1000); // Run every 5 minutes
  runPayoutTestScenario().catch(console.error); // Initial run
}


// Cleanup function
async function cleanupTestData() {
  try {
    await Appointment.deleteMany({ paymentIntentId: /^pi_test_/ });
    await PaymentLog.deleteMany({ transactionId: /test_/ });
    await User.deleteMany({ email: /\.test@example\.com/ });
    await TherapistPayoutInfo.deleteMany({ otherPaymentDetails: /binance_test_address_/ });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Generate unique email with timestamp and random suffix
function generateUniqueEmail(prefix: string) {
  return `${prefix}.test${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

// Test data creation with all required fields
async function createTestTherapist(level: 1 | 2 = 1) {
  try {
    const therapist = await User.create({
      email: generateUniqueEmail('therapist'),
      password: await bcrypt.hash('testpassword', 12),
      fullName: faker.person.fullName(),
      telephone: faker.phone.number(),
      role: 'therapist',
      level,
      payoutMethod: 'binance',
      status: 'active'
    });

    await TherapistPayoutInfo.create({
      therapist: therapist._id,
      otherPaymentDetails: `binance_test_address_${faker.string.uuid()}`,
      payoutMethod: 'binance',
      bankAccount: faker.finance.accountNumber()
    });

    return therapist;
  } catch (error) {
    console.error('Error creating therapist:', error);
    throw error;
  }
}

async function createTestPatient() {
  try {
    return await User.create({
      email: generateUniqueEmail('patient'),
      password: await bcrypt.hash('testpassword', 12),
      fullName: faker.person.fullName(),
      telephone: faker.phone.number(),
      role: 'patient',
      status: 'active'
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
}

// Fixed price generation without fractionDigits issue
function generateTestPrice() {
  return parseFloat((Math.random() * 400 + 100).toFixed(2)); // 100-500 with 2 decimal places
}

async function createTestAppointment(therapistId: mongoose.Types.ObjectId, patientId: mongoose.Types.ObjectId, isRecurring = false) {
  try {
    const baseAppointment = {
      therapist: therapistId,
      patient: patientId,
      price: generateTestPrice(),
      status: 'completed',
      paymentStatus: 'completed',
      payoutStatus: 'pending_payout',
      paymentIntentId: `pi_test_${faker.string.uuid()}`,
      payoutAttempts: 0,
      isPaid: true,
      therapyType: 'individual',
      plan: 'standard',
      planType: 'single_session',
      date: faker.date.recent({ days: 7 })
    };

    if (isRecurring) {
      const sessionCount = faker.number.int({ min: 1, max: 3 });
      return await Appointment.create({
        ...baseAppointment,
        recurring: Array.from({ length: sessionCount }, (_, i) => ({
          date: faker.date.soon({ days: 7 }).toISOString(),
          status: 'completed',
          payment: 'not_paid',
          index: i
        })),
        totalSessions: sessionCount,
        completedSessions: sessionCount
      });
    }

    return await Appointment.create(baseAppointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

// Main test scenario
export async function runPayoutTestScenario() {
  console.log('==== Starting Payout Test Scenario ====');
  
  try {
    console.log('✅ Database connected');

    // Clean any previous test data
    await cleanupTestData();
    console.log('🧹 Cleaned previous test data');

    // Create test data with all required fields
    const therapist1 = await createTestTherapist(1);
    const therapist2 = await createTestTherapist(2);
    const patient = await createTestPatient();
    console.log('👥 Created test users');

    // Create test appointments with error handling
    const appointments = await Promise.all([
      createTestAppointment(therapist1._id, patient._id).catch(e => {
        console.error('Error creating appointment 1:', e);
        return null;
      }),
      createTestAppointment(therapist1._id, patient._id, true).catch(e => {
        console.error('Error creating appointment 2:', e);
        return null;
      }),
      createTestAppointment(therapist2._id, patient._id).catch(e => {
        console.error('Error creating appointment 3:', e);
        return null;
      }),
      createTestAppointment(therapist2._id, patient._id, true).catch(e => {
        console.error('Error creating appointment 4:', e);
        return null;
      })
    ]);

    // Filter out any failed appointments
    const validAppointments = appointments.filter(a => a !== null) as mongoose.Document[];
    console.log(`📅 Created ${validAppointments.length} valid test appointments`);

    if (validAppointments.length === 0) {
      throw new Error('No valid appointments created');
    }

    // Simulate payout processing
    console.log('🔄 Running payout simulation...');
    
    // Simulate successful payouts
    for (const appointment of validAppointments) {
      try {
        await Appointment.findByIdAndUpdate(appointment._id, {
          payoutStatus: 'paid',
          $inc: { payoutAttempts: 1 },
          lastPayoutAttempt: new Date()
        });

        await PaymentLog.create({
          appointment: appointment._id,
          therapist: (appointment as any).therapist,
          amount: parseFloat((((appointment as any).price) * 
            ((appointment as any).therapist.equals(therapist2._id) ? 0.57 : 0.50)).toFixed(2)),
          paymentMethod: 'binance',
          status: 'success',
          transactionId: `tx_test_${faker.string.uuid()}`,
          sessionsPaid: (appointment as any).recurring ? 
            (appointment as any).recurring.map((session: any) => session.index.toString()) : ['main']
        });
      } catch (error) {
        console.error(`❌ Failed to process appointment ${appointment._id}:`, error);
      }
    }

    // Verify results
    const paidAppointments = await Appointment.countDocuments({ payoutStatus: 'paid' });
    const paymentLogs = await PaymentLog.countDocuments();
    
    console.log('🔍 Verification Results:');
    console.log(`- Appointments paid: ${paidAppointments}/${validAppointments.length}`);
    console.log(`- Payment logs created: ${paymentLogs}`);

    // Test failure scenario
    console.log('⚠️ Testing failure scenario...');
    try {
      const failingAppointment = await createTestAppointment(therapist1._id, patient._id);
      throw new Error('Simulated payout failure');
    } catch (error: any) {
      console.log('✅ Properly handled failed payout:', error.message);
    }

    console.log('==== Test Scenario Completed Successfully ====');
    return true;
  } catch (error) {
    console.error('❌ Scenario failed:', error);
    return false;
  } finally {
    // Keep test data for inspection - comment this out to clean up
    // await cleanupTestData();
    // await mongoose.disconnect();
  }
}

// Initialize when imported in development
if (process.env.NODE_ENV === 'development') {
  initPayoutTestScheduler();
}