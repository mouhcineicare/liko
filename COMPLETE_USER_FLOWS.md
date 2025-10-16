# 🎯 Complete TherapyGlow User Flows (A to Z)

## 📋 **Flow Overview**

This document outlines every step a user takes in the TherapyGlow system, from initial booking to session completion and payment processing. Each flow shows the exact status transitions, what users see, and how the system responds.

---

## 🔄 **Status Flow Diagram**

```
UNPAID → PENDING → PENDING_MATCH → MATCHED_PENDING_THERAPIST_ACCEPTANCE → PENDING_SCHEDULING → CONFIRMED → COMPLETED
                                                                                                            ↓
                                                                                                      CANCELLED / NO_SHOW
                                                                                                            ↑
                                                                                                      RESCHEDULED
```

---

## 🚀 **Flow 1: New Patient Books Appointment**

### **Step 1: Initial Booking**
**Status**: `UNPAID`
**What Patient Sees**:
- Booking form with therapist preferences
- Payment options (Stripe/Balance)
- "Complete Payment" button

**System Actions**:
```typescript
// Appointment created with UNPAID status
const appointment = await Appointment.create({
  patient: patientId,
  status: APPOINTMENT_STATUSES.UNPAID,
  paymentStatus: 'pending',
  plan: selectedPlan,
  price: planPrice,
  therapyType: 'individual',
  date: preferredDate
});
```

**Patient Dashboard Shows**:
- 🔴 **Payment Required** badge
- "Complete payment to activate your appointment"
- **Pay Now** button

---

### **Step 2: Payment Processing**
**Status**: `PENDING`
**What Patient Sees**:
- Payment processing spinner
- "Payment in progress..." message

**System Actions**:
```typescript
// When checkout session is created
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.PENDING,
  { id: 'system', role: 'admin' },
  { reason: 'Payment initiated via Stripe' }
);
```

**Patient Dashboard Shows**:
- 🟠 **Processing Payment** badge
- "Payment processing..."

---

### **Step 3: Payment Completed**
**Status**: `PENDING_MATCH`
**What Patient Sees**:
- Payment confirmation
- "Finding the perfect therapist for you"

**System Actions**:
```typescript
// Stripe webhook confirms payment
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.PENDING_MATCH,
  { id: 'system', role: 'admin' },
  { reason: 'Payment completed - proceeding to therapist matching' }
);
```

**Patient Dashboard Shows**:
- 🟡 **Finding Therapist** badge
- "Finding the perfect therapist for you"
- Estimated wait time: "Usually within 24 hours"

---

## 👨‍⚕️ **Flow 2: Admin Matches Patient with Therapist**

### **Step 4: Admin Assigns Therapist**
**Status**: `MATCHED_PENDING_THERAPIST_ACCEPTANCE`
**What Admin Sees**:
- List of pending matches
- Patient preferences and details
- Available therapists

**Admin Actions**:
```typescript
// Admin assigns therapist
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE,
  { id: adminId, role: 'admin' },
  { 
    reason: 'Therapist assigned by admin',
    meta: { therapistId: selectedTherapistId }
  }
);
```

**Patient Dashboard Shows**:
- 🔵 **Therapist Assigned** badge
- "Therapist assigned - waiting for acceptance"
- Therapist name and photo (if available)

**Therapist Dashboard Shows**:
- 🔔 **New Patient Assignment** notification
- Patient details and preferences
- **Accept** / **Decline** buttons

---

## 👩‍⚕️ **Flow 3: Therapist Actions**

### **Step 5A: Therapist Accepts**
**Status**: `PENDING_SCHEDULING`
**What Therapist Sees**:
- Patient assignment card
- Patient onboarding information
- **Accept** button

**Therapist Actions**:
```typescript
// Therapist accepts assignment
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.PENDING_SCHEDULING,
  { id: therapistId, role: 'therapist' },
  { reason: 'Therapist accepted patient assignment' }
);
```

**Patient Dashboard Shows**:
- 🟣 **Scheduling** badge
- "Your therapist has accepted! Please select a convenient time for your session"
- **Choose Time** button

**Therapist Dashboard Shows**:
- Patient moved to "Pending Scheduling" section
- "Waiting for patient to select time"

---

### **Step 5B: Therapist Declines Time Slot**
**Status**: Back to `PENDING_SCHEDULING`
**What Therapist Sees**:
- **Decline Time** button with reason field
- "Decline this time slot (patient will choose new time)"

**Therapist Actions**:
```typescript
// Therapist declines the proposed time slot (not the patient)
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.PENDING_SCHEDULING,
  { id: therapistId, role: 'therapist' },
  { 
    reason: `Therapist declined time slot: ${declineReason}`,
    meta: { 
      declinedTime: appointment.date,
      keepTherapistAssigned: true
    }
  }
);
```

**Patient Dashboard Shows**:
- 🟣 **Scheduling** badge (again)
- "Your therapist needs to reschedule. Please choose a new time"
- **Choose New Time** button

**System Actions**:
- Therapist remains assigned
- Patient gets notification to select new time
- Original time slot released back to availability

---

## 📅 **Flow 4: Patient Schedules Time**

### **Step 6: Patient Selects Time**
**Status**: `CONFIRMED`
**What Patient Sees**:
- Calendar with therapist's available slots
- Time zone conversion
- **Confirm Time** button

**Patient Actions**:
```typescript
// Patient confirms appointment time
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.CONFIRMED,
  { id: patientId, role: 'patient' },
  { 
    reason: 'Patient selected appointment time',
    meta: { selectedDate: newDate, selectedTime: newTime }
  }
);
```

**Patient Dashboard Shows**:
- ✅ **Confirmed** badge
- "Appointment confirmed - see you soon!"
- Meeting details and countdown
- **Join Meeting** button (2 hours before)

**Therapist Dashboard Shows**:
- Appointment in "Upcoming" section
- Patient details and session info
- **Add Meeting Link** button

---

## 🎥 **Flow 5: Session Management**

### **Step 7: Therapist Adds Meeting Link**
**Status**: Still `CONFIRMED`
**What Therapist Sees**:
- Meeting link input field
- **Update** button

**Therapist Actions**:
```typescript
// Therapist adds meeting link (no status change)
await Appointment.findByIdAndUpdate(appointmentId, {
  meetingLink: meetingUrl
});
```

**Patient Dashboard Shows**:
- ✅ **Confirmed** badge
- **Join Meeting** button (now active)
- Meeting link visible

---

### **Step 8: Session Occurs**
**Status**: Still `CONFIRMED` during session
**What Both See**:
- Active meeting link
- Session in progress

**After Session - Therapist Actions**:
```typescript
// Therapist marks session as completed
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.COMPLETED,
  { id: therapistId, role: 'therapist' },
  { reason: 'Session completed successfully' }
);
```

**Patient Dashboard Shows**:
- ✅ **Completed** badge
- "Session completed"
- Feedback form

**Therapist Dashboard Shows**:
- Session moved to "Pending Validation" section
- **Validate Session** button
- Expected payout amount

---

## 💰 **Flow 6: Payment & Balance Processing**

### **Step 9: Therapist Validates Session**
**Status**: Still `COMPLETED` but `therapistValidated = true`
**What Therapist Sees**:
- Session validation button
- Payout amount confirmation

**Therapist Actions**:
```typescript
// Therapist validates completed session
await validateSession(appointmentId, therapistId);
// This sets therapistValidated = true and triggers payout processing
```

**System Actions**:
- Session moves to payout queue
- Balance deduction (if paid by balance)
- Therapist earnings updated

**Balance Impact**:
```typescript
// If patient paid with balance
if (appointment.payment.method === 'balance') {
  await updatePatientBalance(patientId, -appointment.payment.unitPrice);
  await updateTherapistEarnings(therapistId, appointment.payment.unitPrice * 0.7); // 70% commission
}
```

**Patient Dashboard Shows**:
- ✅ **Completed** badge
- Balance updated (if applicable)
- Session history updated

**Therapist Dashboard Shows**:
- Session moved to "Completed" section
- 💰 **Awaiting Payment** or 💚 **Paid** badge

---

## 🔄 **Flow 7: Patient Actions (Cancel/Reschedule)**

### **Flow 7A: Patient Cancels Appointment**

#### **Before 24 Hours**
**What Patient Sees**:
- **Cancel** button
- "Free cancellation (full refund)"

**Patient Actions**:
```typescript
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.CANCELLED,
  { id: patientId, role: 'patient' },
  { reason: 'Cancelled by patient (free cancellation)' }
);
```

**System Actions**:
- Full refund processed
- Balance restored (if applicable)
- Therapist notified

#### **Within 24 Hours**
**What Patient Sees**:
- **Cancel** button
- "⚠️ 50% charge applies for cancellations within 24 hours"

**Patient Actions**:
```typescript
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.CANCELLED,
  { id: patientId, role: 'patient' },
  { 
    reason: 'Cancelled by patient (within 24h)',
    meta: { chargeApplied: 0.5 }
  }
);
```

**System Actions**:
- 50% refund processed
- 50% balance deduction remains
- Therapist receives 50% compensation

---

### **Flow 7B: Patient Reschedules Appointment**

#### **Before 24 Hours (Free)**
**What Patient Sees**:
- **Reschedule** button
- Calendar with new available slots
- "Free rescheduling"

**Patient Actions**:
```typescript
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.RESCHEDULED,
  { id: patientId, role: 'patient' },
  { 
    reason: 'Rescheduled by patient (free)',
    meta: { newDate: selectedDate, oldDate: originalDate }
  }
);
```

#### **Within 24 Hours (Charged)**
**What Patient Sees**:
- **Reschedule** button
- "⚠️ One session will be deducted for rescheduling within 24 hours"
- New payment required

**Patient Actions**:
```typescript
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.RESCHEDULED,
  { id: patientId, role: 'patient' },
  { 
    reason: 'Rescheduled by patient (within 24h - session deducted)',
    meta: { 
      newDate: selectedDate, 
      oldDate: originalDate,
      sessionDeducted: true 
    }
  }
);
```

**System Actions**:
- One session deducted from balance
- New appointment slot reserved
- Therapist notified of change

---

### **Flow 7C: Patient Rebooks After Cancellation**

**What Patient Sees**:
- **Book New Session** button
- Same booking flow as initial
- Available balance displayed

**Patient Actions**:
- Goes through complete booking flow again
- Can use remaining balance or pay new amount

---

## 💳 **Flow 8: Balance System Integration**

### **Balance Purchase Flow**
```typescript
// Patient buys session balance
const balancePurchase = await createBalancePurchase({
  patientId,
  amount: 450, // AED for 5 sessions
  sessions: 5,
  unitPrice: 90
});

// Balance booking flow
const appointment = await createAppointment({
  patient: patientId,
  payment: {
    method: 'balance',
    useBalance: true,
    unitPrice: 90
  }
});
// Status starts as PENDING_MATCH (skips UNPAID)
```

### **Balance Deduction on Session Completion**
```typescript
// When therapist validates session
const sessionCost = appointment.payment.unitPrice;
await updatePatientBalance(patientId, -sessionCost);
await updateTherapistEarnings(therapistId, sessionCost * 0.7);
```

### **Balance Refund on Cancellation**
```typescript
// Free cancellation - full balance restore
await updatePatientBalance(patientId, +appointment.payment.unitPrice);

// Within 24h cancellation - 50% balance restore
await updatePatientBalance(patientId, +(appointment.payment.unitPrice * 0.5));
```

---

## 📊 **Flow 9: Admin Monitoring & Management**

### **Admin Dashboard Views**

#### **Pending Matches**
- Patients waiting for therapist assignment
- Auto-matching suggestions based on preferences
- Manual assignment controls

#### **Active Sessions**
- All confirmed/upcoming appointments
- Therapist availability tracking
- Session management tools

#### **Completed Sessions**
- Sessions awaiting therapist validation
- Payout processing status
- Financial reconciliation

#### **System Health**
- Status distribution charts
- Transition success rates
- Error monitoring and alerts

---

## 🚨 **Flow 10: Error Handling & Edge Cases**

### **Payment Failures**
```typescript
// Stripe payment fails
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.UNPAID,
  { id: 'system', role: 'admin' },
  { reason: 'Payment failed - returned to unpaid status' }
);
```

### **No-Show Scenarios**
```typescript
// Therapist marks patient as no-show
await updateAppointmentStatus(
  appointmentId,
  APPOINTMENT_STATUSES.NO_SHOW,
  { id: therapistId, role: 'therapist' },
  { reason: 'Patient did not attend session' }
);
```

### **System Auto-Expiry**
```typescript
// Cron job expires unpaid appointments
const expiredAppointments = await Appointment.find({
  status: APPOINTMENT_STATUSES.UNPAID,
  date: { $lt: new Date() }
});

for (const appointment of expiredAppointments) {
  await updateAppointmentStatus(
    appointment._id,
    APPOINTMENT_STATUSES.CANCELLED,
    { id: 'system', role: 'admin' },
    { reason: 'Auto-expired due to non-payment' }
  );
}
```

---

## 🎯 **Summary: Complete Flow States**

### **Patient Journey States**
1. **Booking** → `UNPAID` → "Complete payment"
2. **Payment** → `PENDING` → "Processing..."
3. **Matching** → `PENDING_MATCH` → "Finding therapist"
4. **Assignment** → `MATCHED_PENDING_THERAPIST_ACCEPTANCE` → "Therapist assigned"
5. **Scheduling** → `PENDING_SCHEDULING` → "Choose time"
6. **Confirmed** → `CONFIRMED` → "Ready for session"
7. **Session** → `COMPLETED` → "Session completed"

### **Therapist Journey States**
1. **Assignment** → Notification → "Accept/Decline"
2. **Scheduling** → `PENDING_SCHEDULING` → "Patient choosing time"
3. **Upcoming** → `CONFIRMED` → "Add meeting link"
4. **Session** → During session → "Conduct session"
5. **Validation** → `COMPLETED` → "Validate for payment"
6. **Payment** → Payout processing → "Earnings updated"

### **Admin Journey States**
- **Matching**: Assign therapists to patients
- **Monitoring**: Track all appointment states
- **Management**: Handle exceptions and disputes
- **Analytics**: Monitor system health and performance

---

## 🔧 **Technical Implementation Notes**

### **Status Consistency**
- All status changes go through `updateAppointmentStatus()`
- Complete audit trail in `AppointmentHistory`
- Event-driven side effects (emails, calendar, payouts)
- Business rule validation prevents invalid transitions

### **Balance Integration**
- Real-time balance tracking
- Atomic deduction/refund operations
- Multi-currency support (AED primary)
- Session unit-based calculations

### **Monitoring & Alerts**
- Real-time status distribution dashboard
- Automated health checks
- Alert system for anomalies
- Performance metrics tracking

This system ensures every user interaction is tracked, every status change is validated, and every financial transaction is properly recorded with complete audit trails.
