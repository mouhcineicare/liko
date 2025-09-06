import mongoose from 'mongoose';
import connectDB from '../lib/db/connect';
import Appointment from '../lib/db/models/Appointment'; // Adjust path if needed

async function migrateRecurringFormat() {
  await connectDB();
  const appointments = await Appointment.find({ recurring: { $exists: true, $ne: [] } });
  let updatedCount = 0;
  for (const appt of appointments) {
    if (Array.isArray(appt.recurring) && typeof appt.recurring[0] === 'string') {
      // Old format: array of strings
      appt.recurring = appt.recurring.map(dateStr => ({ date: dateStr }));
      await appt.save();
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} appointments to new recurring format.`);
  await mongoose.disconnect();
}

migrateRecurringFormat().catch(e => {
  console.error(e);
  process.exit(1);
});