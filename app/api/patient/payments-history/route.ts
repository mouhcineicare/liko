import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import User from '@/lib/db/models/User'
import connectDB from '@/lib/db/connect'
import { authOptions } from '@/lib/auth/config'
import { getAllStripePaymentsByCustomerId } from '@/lib/stripe/getAllPayments'
import { retrieveCustomerIdFromLastPayment } from '@/lib/stripe/verification'
import Plan from '@/lib/db/models/Plan'
import Subscription from '@/lib/db/models/Subscription'

export async function GET() {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'patient') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current patient
    const patient = await User.findById(session.user.id)
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Check if patient has Stripe customer ID, if not try to retrieve it from last payment
    let stripeCustomerId = patient.stripeCustomerId;
    console.log('Initial stripeCustomerId from patient record:', stripeCustomerId);
    
    if (!stripeCustomerId) {
      console.log('No Stripe customer ID found for patient, attempting to retrieve from last payment...');
      stripeCustomerId = await retrieveCustomerIdFromLastPayment(patient._id.toString());
      console.log('Retrieved stripeCustomerId from last payment:', stripeCustomerId);
      
      if (!stripeCustomerId) {
        console.log('Failed to retrieve customer ID from last payment');
        return NextResponse.json({ 
          error: 'No payment history found. Please make a payment first to view your payment history.',
          needsPayment: true
        }, { status: 404 })
      }
      
      // Refresh patient record to get the updated stripeCustomerId
      const refreshedPatient = await User.findById(patient._id);
      console.log('Refreshed patient stripeCustomerId:', refreshedPatient?.stripeCustomerId);
      stripeCustomerId = refreshedPatient?.stripeCustomerId || stripeCustomerId;
    }

    console.log('Using stripeCustomerId for payment history:', stripeCustomerId);

    // Get all payments from Stripe
    console.log('Calling getAllStripePaymentsByCustomerId with:', { stripeCustomerId, email: patient.email });
    const { payments } = await getAllStripePaymentsByCustomerId(stripeCustomerId, patient.email)
    console.log('Retrieved payments from Stripe:', payments.length, 'payments');

    // Get all available plans for price matching
    const allPlans = await Plan.find({ active: true }).lean()

    // Enhance payments with plan information
    const enhancedPayments = await Promise.all(
      payments.map(async (payment) => {
        try {
          let plan = null
          let sessions = 0
          let displayTitle = payment.description || 'Payment'

          console.log(`Processing payment ${payment.id} (type: ${payment.type}):`, {
            amount: payment.amount,
            metadata: payment.metadata,
            description: payment.description
          });

          // Try to get plan from our Subscription model first
          if (payment.type === 'subscription') {
            const subscription = await Subscription.findOne({ 
              stripeSubscriptionId: payment.id 
            }).populate('plan')
            
            if (subscription?.plan) {
              plan = subscription.plan
              displayTitle = plan.title
              console.log(`Found plan from subscription: ${plan.title}`);
            } else {
              // If no subscription record found, try to match by amount
              console.log('No subscription record found, trying to match by amount');
              const amountInAED = payment.amount / 100;
              const matchedPlanByAmount = allPlans.find(p => Math.abs(p.price - amountInAED) < 1);
              
              if (matchedPlanByAmount) {
                plan = matchedPlanByAmount;
                displayTitle = matchedPlanByAmount.title;
                console.log(`Matched subscription by amount: ${matchedPlanByAmount.title}`);
              } else {
                // Create generic subscription plan
                plan = {
                  title: `Subscription - ${payment.description || 'Monthly Plan'}`,
                  type: 'subscription',
                  therapyType: 'individual',
                  price: amountInAED
                };
                displayTitle = plan.title;
                console.log(`Created generic subscription plan: ${plan.title}`);
              }
            }
          }

          // If no plan from subscription, try metadata
          if (!plan && payment.metadata?.planId) {
            plan = await Plan.findById(payment.metadata.planId)
            if (plan) {
              displayTitle = plan.title
              console.log(`Found plan from metadata: ${plan.title}`);
            }
          }

          // For charges, try to match by amount and description
          if (!plan && payment.type === 'charge') {
            console.log('Attempting to match charge by amount and description');
            
            // Try to match by amount first
            const amountInAED = payment.amount / 100; // Convert from cents
            const matchedPlanByAmount = allPlans.find(p => Math.abs(p.price - amountInAED) < 1); // Allow 1 AED difference
            
            if (matchedPlanByAmount) {
              plan = matchedPlanByAmount;
              displayTitle = matchedPlanByAmount.title;
              console.log(`Matched charge by amount: ${matchedPlanByAmount.title}`);
            } else {
              // If no amount match, try to extract from description
              const description = payment.description?.toLowerCase() || '';
              const matchedPlanByDescription = allPlans.find(p => 
                description.includes(p.title.toLowerCase()) ||
                description.includes(p.therapyType.toLowerCase())
              );
              
              if (matchedPlanByDescription) {
                plan = matchedPlanByDescription;
                displayTitle = matchedPlanByDescription.title;
                console.log(`Matched charge by description: ${matchedPlanByDescription.title}`);
              } else {
                // If no plan match, create a generic plan for the charge
                console.log('No plan match found for charge, creating generic plan');
                plan = {
                  title: `Payment - ${payment.description || 'Therapy Session'}`,
                  type: 'single',
                  therapyType: 'individual',
                  price: amountInAED
                };
                displayTitle = plan.title;
              }
            }
          }

          // If still no plan, try to match by price (fallback)
          if (!plan && allPlans.length > 0) {
            const matchedPlan = allPlans.reduce((closest, currentPlan) => {
              if (!closest) return currentPlan
              const currentDiff = Math.abs(currentPlan.price - payment.amount / 100)
              const closestDiff = Math.abs(closest.price - payment.amount / 100)
              return currentDiff < closestDiff ? currentPlan : closest
            }, null)

            if (matchedPlan) {
              plan = matchedPlan
              displayTitle = matchedPlan.title
              console.log(`Matched by price fallback: ${matchedPlan.title}`);
            }
          }

          // Extract product name from Stripe metadata if available
          if (!plan && payment.metadata?.product_name) {
            displayTitle = payment.metadata.product_name
            console.log(`Using product name from metadata: ${payment.metadata.product_name}`);
          }

          // Calculate number of sessions
          if (plan?.type) {
            sessions = 0;
            for(let i=1 ;i<=10;i++){
               if(plan.title.indexOf(i.toString()) !== -1){
                  sessions = i
                  break;
               }
            }
            sessions = sessions===0 ? 1 : sessions
            console.log(`Calculated sessions: ${sessions}`);
          } else if (payment.metadata?.sessions) {
            sessions = parseInt(payment.metadata.sessions, 10) || 0
            console.log(`Sessions from metadata: ${sessions}`);
          } else {
            // Default to 1 session for charges if no plan found
            sessions = payment.type === 'charge' ? 1 : 0;
            console.log(`Default sessions for ${payment.type}: ${sessions}`);
          }

          // Ensure charges always have at least 1 session
          if (payment.type === 'charge' && sessions === 0) {
            sessions = 1;
            console.log(`Forcing 1 session for charge payment`);
          }

          const result = {
            ...payment,
            displayTitle,
            plan: plan ? {
              title: plan.title,
              type: plan.type,
              sessions,
              therapyType: plan.therapyType
            } : null,
            date: new Date(payment.created * 1000).toISOString()
          };

          console.log(`Final result for ${payment.id}:`, {
            displayTitle: result.displayTitle,
            sessions: result.plan?.sessions || sessions,
            hasReceipt: !!result.receipt_url
          });

          return result;
        } catch (error) {
          console.error(`Error processing payment ${payment.id}:`, error)
          // Return basic payment info if processing fails
          return {
            ...payment,
            displayTitle: payment.description || 'Payment',
            plan: null,
            date: new Date(payment.created * 1000).toISOString()
          }
        }
      })
    )

    // Filter payments - exclude those without display titles and ensure proper validation
    const filteredPayments = enhancedPayments.filter(payment => {
      const hasValidPlan = payment.plan && payment.plan.sessions > 0;
      const hasReceipt = !!payment.receipt_url;
      const hasAmount = payment.amount > 0;
      const hasDisplayTitle = !!payment.displayTitle && payment.displayTitle !== 'undefined';
      const isValidPayment = hasValidPlan && hasDisplayTitle && hasAmount; // Must have plan, title, and amount
      
      console.log(`Filtering payment ${payment.id}:`, {
        type: payment.type,
        hasValidPlan,
        hasReceipt,
        hasAmount,
        hasDisplayTitle,
        isValidPayment,
        displayTitle: payment.displayTitle,
        sessions: payment.plan?.sessions,
        amount: payment.amount,
        receipt_url: payment.receipt_url
      });
      
      if (!isValidPayment) {
        console.log(`❌ Filtering out payment ${payment.id} - Missing: ${!hasValidPlan ? 'valid plan' : ''} ${!hasDisplayTitle ? 'display title' : ''} ${!hasAmount ? 'amount' : ''}`);
      } else {
        console.log(`✅ Keeping payment ${payment.id}`);
      }
      
      return isValidPayment;
    });

    console.log(`Final filtered payments: ${filteredPayments.length} out of ${enhancedPayments.length}`);

    // Log the final response data
    const responseData = {
      payments: filteredPayments,
      customerId: stripeCustomerId
    };
    
    console.log('Final API response data:', {
      paymentsCount: responseData.payments.length,
      payments: responseData.payments.map(p => ({
        id: p.id,
        type: p.type,
        displayTitle: p.displayTitle,
        amount: p.amount,
        hasPlan: !!p.plan,
        hasReceipt: !!p.receipt_url
      })),
      customerId: responseData.customerId
    });

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}