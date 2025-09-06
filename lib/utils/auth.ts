import crypto from 'crypto';
import User from '@/lib/db/models/User';

export async function generateVerificationToken(user: any) {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set token expiration to 24 hours from now
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  // Save token to user
  user.verificationToken = token;
  user.verificationTokenExpires = expires;
  await user.save();

  return token;
}

export async function verifyEmailToken(token: string) {
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new Error('Invalid or expired verification token');
  }

  user.status = 'active';
  user.emailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return user;
}