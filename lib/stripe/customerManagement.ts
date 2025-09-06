import stripe from '@/lib/stripe';
import User from '@/lib/db/models/User';
import { getStripeCustomerIdByEmail } from './getCustomerIdByEmail';

export interface CustomerIdResult {
  customerId: string;
  isNew: boolean;
  error?: string;
}

/**
 * Centralized function to get or create Stripe customer ID for a user
 * This ensures we never overwrite existing customer IDs and always use the same one
 */
export async function getOrCreateStripeCustomerId(userId: string, email: string, fullName: string): Promise<CustomerIdResult> {
  console.log('=== lib/stripe/customerManagement.ts - getOrCreateStripeCustomerId START ===');
  console.log('lib/stripe/customerManagement.ts - Input:', { userId, email, fullName });

  try {
    // First, check if user already has a customer ID
    const user = await User.findById(userId);
    if (!user) {
      console.log('lib/stripe/customerManagement.ts - Error: User not found');
      return { customerId: '', isNew: false, error: 'User not found' };
    }

    console.log('lib/stripe/customerManagement.ts - Current user stripeCustomerId:', user.stripeCustomerId);

    // If user already has a customer ID, verify it exists in Stripe
    if (user.stripeCustomerId) {
      console.log('lib/stripe/customerManagement.ts - User already has customer ID, verifying with Stripe');
      try {
        const existingCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
        console.log('lib/stripe/customerManagement.ts - Verified existing customer ID:', existingCustomer.id);
        return { customerId: existingCustomer.id, isNew: false };
      } catch (error) {
        console.log('lib/stripe/customerManagement.ts - Existing customer ID invalid, will create new one');
        // Customer ID is invalid, we'll create a new one
      }
    }

    // Try to find existing customer by email
    console.log('lib/stripe/customerManagement.ts - Searching for existing customer by email');
    const existingCustomerId = await getStripeCustomerIdByEmail(email);
    
    if (existingCustomerId) {
      console.log('lib/stripe/customerManagement.ts - Found existing customer by email:', existingCustomerId);
      
      // Update user with existing customer ID
      user.stripeCustomerId = existingCustomerId;
      await user.save();
      console.log('lib/stripe/customerManagement.ts - Updated user with existing customer ID');
      
      return { customerId: existingCustomerId, isNew: false };
    }

    // Create new customer
    console.log('lib/stripe/customerManagement.ts - Creating new Stripe customer');
    const newCustomer = await stripe.customers.create({
      email: email,
      name: fullName,
      metadata: { userId: userId }
    });

    console.log('lib/stripe/customerManagement.ts - Created new customer:', JSON.stringify({
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
      metadata: newCustomer.metadata
    }, null, 2));

    // Save customer ID to user
    user.stripeCustomerId = newCustomer.id;
    await user.save();
    console.log('lib/stripe/customerManagement.ts - Saved new customer ID to user');

    console.log('=== lib/stripe/customerManagement.ts - getOrCreateStripeCustomerId END ===');
    return { customerId: newCustomer.id, isNew: true };

  } catch (error) {
    console.error('lib/stripe/customerManagement.ts - Error in getOrCreateStripeCustomerId:', error);
    console.log('=== lib/stripe/customerManagement.ts - getOrCreateStripeCustomerId END WITH ERROR ===');
    return { 
      customerId: '', 
      isNew: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Function to ensure customer ID is properly linked to user
 * This is used when we have a customer ID but need to ensure it's saved to the user
 */
export async function ensureCustomerIdLinked(userId: string, customerId: string): Promise<boolean> {
  console.log('=== lib/stripe/customerManagement.ts - ensureCustomerIdLinked START ===');
  console.log('lib/stripe/customerManagement.ts - Input:', { userId, customerId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log('lib/stripe/customerManagement.ts - Error: User not found');
      return false;
    }

    // If user already has this customer ID, no need to update
    if (user.stripeCustomerId === customerId) {
      console.log('lib/stripe/customerManagement.ts - User already has correct customer ID');
      return true;
    }

    // If user has a different customer ID, log it but don't overwrite
    if (user.stripeCustomerId && user.stripeCustomerId !== customerId) {
      console.log('lib/stripe/customerManagement.ts - WARNING: User has different customer ID:', {
        existing: user.stripeCustomerId,
        new: customerId
      });
      // Don't overwrite - return false to indicate conflict
      return false;
    }

    // User has no customer ID, save it
    if (!user.stripeCustomerId) {
      user.stripeCustomerId = customerId;
      await user.save();
      console.log('lib/stripe/customerManagement.ts - Saved customer ID to user');
      return true;
    }

    console.log('=== lib/stripe/customerManagement.ts - ensureCustomerIdLinked END ===');
    return true;

  } catch (error) {
    console.error('lib/stripe/customerManagement.ts - Error in ensureCustomerIdLinked:', error);
    console.log('=== lib/stripe/customerManagement.ts - ensureCustomerIdLinked END WITH ERROR ===');
    return false;
  }
}

/**
 * Function to validate if a customer ID exists and is valid
 */
export async function validateCustomerId(customerId: string): Promise<boolean> {
  console.log('=== lib/stripe/customerManagement.ts - validateCustomerId START ===');
  console.log('lib/stripe/customerManagement.ts - Validating customer ID:', customerId);

  try {
    if (!customerId) {
      console.log('lib/stripe/customerManagement.ts - Customer ID is empty');
      return false;
    }

    const customer = await stripe.customers.retrieve(customerId);
    console.log('lib/stripe/customerManagement.ts - Customer ID is valid:', customer.id);
    console.log('=== lib/stripe/customerManagement.ts - validateCustomerId END ===');
    return true;

  } catch (error) {
    console.log('lib/stripe/customerManagement.ts - Customer ID is invalid:', error);
    console.log('=== lib/stripe/customerManagement.ts - validateCustomerId END ===');
    return false;
  }
}
