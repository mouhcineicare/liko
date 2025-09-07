/**
 * Pure refund calculation helper
 * Based on stored payment breakdown, not inference
 */

export interface RefundResult {
  fromBalance: number;
  fromStripe: number;
  moneyRefund: number;
  sessionUnitsRefunded: number;
}

export interface AppointmentPayment {
  method: 'balance' | 'stripe' | 'mixed';
  sessionsPaidWithBalance: number;
  sessionsPaidWithStripe: number;
  unitPrice: number;
  currency: string;
  stripeChargeId?: string;
  useBalance: boolean;
  refundedUnitsFromBalance: number;
  refundedUnitsFromStripe: number;
}

export interface AppointmentRefund {
  sessionCount: number;
  sessionUnitsTotal: number;
  completedSessions: number;
  payment: AppointmentPayment;
}

export function computeRefund(
  appointment: AppointmentRefund,
  policy: 'full' | 'half' | 'none',
  step: number = 0.1
): RefundResult {
  // Calculate remaining session units
  const remainingUnits = Math.max(
    appointment.sessionUnitsTotal - appointment.completedSessions,
    0
  );

  // Calculate desired refund based on policy
  let desiredUnits: number;
  switch (policy) {
    case 'full':
      desiredUnits = remainingUnits;
      break;
    case 'half':
      desiredUnits = remainingUnits * 0.5;
      break;
    case 'none':
      desiredUnits = 0;
      break;
  }

  // Round to step size
  desiredUnits = Math.floor(desiredUnits / step) * step;

  // Calculate available units from each payment source
  const availableFromBalance = Math.max(
    appointment.payment.sessionsPaidWithBalance - appointment.payment.refundedUnitsFromBalance,
    0
  );
  const availableFromStripe = Math.max(
    appointment.payment.sessionsPaidWithStripe - appointment.payment.refundedUnitsFromStripe,
    0
  );

  // Allocate refund: balance first, then Stripe
  const fromBalance = Math.min(desiredUnits, availableFromBalance);
  const fromStripe = Math.min(desiredUnits - fromBalance, availableFromStripe);

  // Calculate money refund (only from Stripe)
  const moneyRefund = Math.floor((fromStripe * appointment.payment.unitPrice) * 100) / 100;

  return {
    fromBalance,
    fromStripe,
    moneyRefund,
    sessionUnitsRefunded: fromBalance + fromStripe
  };
}

/**
 * Generate dedupe key for idempotency
 */
export function generateDedupeKey(
  appointmentId: string,
  policy: string,
  slotId?: string
): string {
  return `${appointmentId}:${policy}:${slotId || 'series'}`;
}
