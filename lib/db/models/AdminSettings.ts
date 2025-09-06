import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSettingsSchema = new mongoose.Schema({
  impersonationPassword: {
    type: String,
    select: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  balanceRate: {
    type: Number,
    default: 90
  }
}, { timestamps: true });

adminSettingsSchema.pre('save', async function(next) {
  if (this.isModified('impersonationPassword') && this.impersonationPassword) {
    this.impersonationPassword = await bcrypt.hash(this.impersonationPassword, 12);
  }
  next();
});

adminSettingsSchema.methods.compareImpersonationPassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.impersonationPassword);
};

const AdminSettings = mongoose.models.AdminSettings || mongoose.model('AdminSettings', adminSettingsSchema);

export default AdminSettings;