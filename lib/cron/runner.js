require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'CommonJS',
    esModuleInterop: true,
  }
});

const { initPayoutCron, stopPayoutCron } = require('./payoutCron');

// Import appointment completion cron
let appointmentCron;
try {
  const appointmentModule = require('../../app/api/cron/completeAppointments');
  appointmentCron = appointmentModule.runCron;
} catch (error) {
  console.warn('Could not load appointment completion cron:', error.message);
}

console.log('Starting cron jobs...');
initPayoutCron();

if (appointmentCron) {
  appointmentCron();
  console.log('✅ Appointment completion cron initialized');
} else {
  console.warn('⚠️ Appointment completion cron not available');
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Stopping cron jobs...');
  stopPayoutCron();
  process.exit(0);
});