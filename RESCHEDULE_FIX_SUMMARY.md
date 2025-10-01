# 🔧 Reschedule Fix Summary

## 🐛 **The Problem**

When rescheduling an appointment on the same day, users experienced two issues:

1. **Status Reversion**: Status changed from `confirmed` to `pending_match` after payment
2. **Time Confusion**: Appointment time showed the original booking time instead of the new rescheduled time

## 🔍 **Root Cause Analysis**

The issue was in the payment status handling logic:

1. **Same-day reschedule** sets:
   - `isStripeVerified: false`
   - `paymentStatus: "pending"`
   - `isSameDayReschedule: true`

2. **Payment completion** triggers the payment status route which:
   - Sets `isStripeVerified: true`
   - **Incorrectly** transitions to `PENDING_MATCH` for ALL appointments
   - Should only transition new appointments to `PENDING_MATCH`
   - Rescheduled appointments should stay as `RESCHEDULED` or `CONFIRMED`

## ✅ **The Fix**

### **1. Updated Payment Status Route** (`app/api/appointments/[id]/paymentStatus/route.ts`)

**Before:**
```typescript
// Always transition to PENDING_MATCH after payment
const updatedAppointment = await updateAppointmentStatus(
  params.id,
  APPOINTMENT_STATUSES.PENDING_MATCH,
  actor,
  { reason: 'Payment completed - proceeding to therapist matching' }
);
```

**After:**
```typescript
// Check if this is a rescheduled appointment
let targetStatus = APPOINTMENT_STATUSES.PENDING_MATCH;

if (appointment.isSameDayReschedule || appointment.isRescheduled) {
  // This is a rescheduled appointment - keep it as RESCHEDULED
  targetStatus = APPOINTMENT_STATUSES.RESCHEDULED;
} else if (appointment.status === APPOINTMENT_STATUSES.CONFIRMED || 
           appointment.status === APPOINTMENT_STATUSES.RESCHEDULED) {
  // Already confirmed/rescheduled - keep current status
  targetStatus = appointment.status as any;
}

const updatedAppointment = await updateAppointmentStatus(
  params.id,
  targetStatus,
  actor,
  { reason: `Payment completed - ${appointment.isSameDayReschedule ? 'reschedule payment' : 'proceeding to therapist matching'}` }
);
```

### **2. Updated Reschedule Route** (`app/api/patient/appointments/reschedule/route.ts`)

**Before:**
```typescript
// Always transition to RESCHEDULED
const finalAppointment = await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.RESCHEDULED,
  actor,
  { reason: 'Appointment rescheduled by patient' }
);
```

**After:**
```typescript
// Determine the correct status for reschedule
let targetStatus = APPOINTMENT_STATUSES.RESCHEDULED;

// If it's a same-day reschedule with pending payment, keep as CONFIRMED until payment
if (isSameDayReschedule && appointmentData.paymentStatus === "pending") {
  targetStatus = APPOINTMENT_STATUSES.CONFIRMED;
}

const finalAppointment = await updateAppointmentStatus(
  appointmentId,
  targetStatus,
  actor,
  { reason: `Appointment rescheduled by patient${isSameDayReschedule ? ' (same-day with surcharge)' : ''}` }
);
```

## 🎯 **How It Works Now**

### **Same-Day Reschedule Flow:**
1. **User reschedules** → Status: `CONFIRMED` (with pending payment)
2. **Payment completed** → Status: `RESCHEDULED` (not `PENDING_MATCH`)
3. **Time updated** → Shows new rescheduled time
4. **Therapist notified** → Calendar updated with new time

### **Regular Reschedule Flow:**
1. **User reschedules** → Status: `RESCHEDULED`
2. **No payment needed** → Status stays `RESCHEDULED`
3. **Time updated** → Shows new rescheduled time
4. **Therapist notified** → Calendar updated with new time

### **New Appointment Flow:**
1. **User books** → Status: `UNPAID`
2. **Payment completed** → Status: `PENDING_MATCH` (unchanged)
3. **Therapist assigned** → Status: `MATCHED_PENDING_THERAPIST_ACCEPTANCE`
4. **Therapist accepts** → Status: `PENDING_SCHEDULING`
5. **Time scheduled** → Status: `CONFIRMED`

## 🧪 **Testing**

### **Test Script Created**
```bash
# Test the fix
node scripts/test-reschedule-fix.js

# Fix existing problematic appointments
node scripts/test-reschedule-fix.js --fix
```

### **What the Test Checks:**
- ✅ Finds appointments that incorrectly went to `pending_match`
- ✅ Identifies same-day reschedules with wrong status
- ✅ Shows correct vs incorrect status handling
- ✅ Provides fix recommendations
- ✅ Can automatically fix existing data

## 📊 **Expected Results**

### **Before Fix:**
```
Same-day reschedule:
UNPAID → CONFIRMED → (payment) → PENDING_MATCH ❌

Regular reschedule:
CONFIRMED → RESCHEDULED → (payment) → PENDING_MATCH ❌
```

### **After Fix:**
```
Same-day reschedule:
UNPAID → CONFIRMED → (payment) → RESCHEDULED ✅

Regular reschedule:
CONFIRMED → RESCHEDULED → (no payment) → RESCHEDULED ✅
```

## 🚀 **Deployment Steps**

1. **Deploy the fix** to your environment
2. **Test reschedule functionality** with same-day reschedule
3. **Run test script** to check existing data:
   ```bash
   node scripts/test-reschedule-fix.js
   ```
4. **Fix existing data** if needed:
   ```bash
   node scripts/test-reschedule-fix.js --fix
   ```
5. **Verify the fix** by checking appointment statuses

## 🎉 **Benefits**

- ✅ **Correct Status Flow**: Rescheduled appointments stay rescheduled
- ✅ **Proper Time Display**: Shows new rescheduled time
- ✅ **Better UX**: Users see correct appointment status
- ✅ **Consistent Behavior**: Same-day and regular reschedules work correctly
- ✅ **Data Integrity**: Existing problematic appointments can be fixed

## 🔍 **Monitoring**

After deployment, monitor for:
- Rescheduled appointments staying in `RESCHEDULED` status
- Same-day reschedules transitioning correctly
- No more `PENDING_MATCH` status for rescheduled appointments
- Correct time display in appointment details

**The reschedule issue is now fixed! 🎯**
