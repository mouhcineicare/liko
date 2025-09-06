# Appointment Flow Test Script

## Overview

The `test-all-appointments-flow.ts` script is a comprehensive test suite that simulates all appointment functionalities from creation to completion across patient, therapist, and admin user types.

## Purpose

This script validates the entire appointment management system by:

1. **Testing all user workflows** - Patient, Therapist, and Admin functionalities
2. **Validating business logic** - Appointment creation, payment, completion, and status management
3. **Ensuring data consistency** - Status synchronization, payment verification, and user balance management
4. **Simulating real scenarios** - Single sessions, recurring sessions, balance payments, and rebooking

## Test Scenarios

### Patient Functions Tested

| Function | Description | Test Cases |
|----------|-------------|------------|
| `CREATE_APPOINTMENT_SINGLE` | Create single session appointment | New patient, existing patient with therapist |
| `CREATE_APPOINTMENT_RECURRING` | Create multi-session appointment | 5-session package, 10-session package |
| `CREATE_APPOINTMENT_BALANCE` | Create appointment using session balance | Balance deduction, session tracking |
| `CREATE_APPOINTMENT_REBOOKING` | Create appointment from rebooking form | Discount calculation, session management |
| `CANCEL_APPOINTMENT` | Cancel existing appointment | With/without charge, balance refund |
| `RESCHEDULE_APPOINTMENT` | Reschedule appointment to new date/time | Date validation, calendar sync |
| `PAY_APPOINTMENT` | Process payment for appointment | Stripe integration, payment verification |
| `VIEW_APPOINTMENTS` | View appointment list and details | Filtering, sorting, status display |
| `VIEW_PAYMENT_HISTORY` | View payment history | Customer ID retrieval, Stripe payments |

### Therapist Functions Tested

| Function | Description | Test Cases |
|----------|-------------|------------|
| `VIEW_APPOINTMENTS` | View assigned appointments | Filtering, search, status counts |
| `COMPLETE_SINGLE_SESSION` | Complete single session appointment | Payment verification, 30-minute rule |
| `COMPLETE_RECURRING_SESSION` | Complete session in multi-session appointment | Session progression, appointment completion |
| `UPDATE_SESSION_STATUS` | Update session status | In progress, completed, cancelled |
| `VIEW_PATIENT_DETAILS` | View patient information | Contact details, appointment history |
| `VIEW_PAYOUT_INFO` | View payout information | Payment tracking, session completion |

### Admin Functions Tested

| Function | Description | Test Cases |
|----------|-------------|------------|
| `VIEW_ALL_APPOINTMENTS` | View all appointments in system | Filtering, pagination, status management |
| `ASSIGN_THERAPIST` | Assign therapist to appointment | Therapist availability, patient assignment |
| `UPDATE_APPOINTMENT_STATUS` | Update appointment status | Status transitions, validation |
| `VIEW_PATIENT_LIST` | View patient list | Search, filtering, customer ID display |
| `REFRESH_CUSTOMER_ID` | Refresh patient's Stripe customer ID | Payment history lookup, ID retrieval |
| `VIEW_PAYMENT_VERIFICATION` | Verify payment status | Stripe verification, payment tracking |

## Key Validations

### 1. Appointment Status Logic
- ✅ `isAccepted` and `isConfirmed` flags are set correctly based on therapist assignment
- ✅ Status transitions follow proper business rules
- ✅ Status display is consistent across all user types

### 2. Payment Verification
- ✅ Stripe `checkoutSessionId` and `paymentIntentId` are captured and stored
- ✅ Payment verification prevents session completion for unpaid appointments
- ✅ Customer ID retrieval works for payment history

### 3. Session Management
- ✅ Single session appointments complete properly
- ✅ Recurring session appointments progress correctly
- ✅ Session completion follows 30-minute rule
- ✅ Total sessions and completed sessions stay synchronized

### 4. Balance Management
- ✅ Session balance is deducted correctly
- ✅ Cancellation refunds are calculated properly
- ✅ Balance history is maintained accurately

### 5. Data Consistency
- ✅ Appointment data is consistent across all operations
- ✅ User balance updates are synchronized
- ✅ Status changes are reflected immediately

## Running the Tests

### Prerequisites
```bash
# Install ts-node if not already installed
npm install -g ts-node

# Install TypeScript if not already installed
npm install -g typescript
```

### Execute Tests
```bash
# Run the test script
npm run test:appointments

# Or directly with ts-node
ts-node scripts/test-all-appointments-flow.ts
```

### Expected Output
```
🚀 Starting Comprehensive Appointment Flow Tests...

👤 Testing Patient Flows...

👨‍⚕️ Testing Therapist Flows...

👨‍💼 Testing Admin Flows...

📊 Test Results Report
==================================================
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100.00%

Results by User Type:
------------------------------
patient: 6/6 passed
therapist: 4/4 passed
admin: 3/3 passed

Detailed Results:
------------------------------
1. ✅ patient - create_appointment_single
   Message: Appointment created successfully

2. ✅ patient - create_appointment_recurring
   Message: Appointment created successfully

[... more results ...]

Key Functionalities Tested:
------------------------------
✅ Appointment Creation (Single & Recurring)
✅ Balance-based Appointment Creation
✅ Payment Processing
✅ Appointment Cancellation
✅ Appointment Rescheduling
✅ Session Completion (Single & Recurring)
✅ Therapist Assignment
✅ Status Updates
✅ Customer ID Management
✅ Payment Verification

🎉 Test Suite Completed!
```

## Mock Data Structure

The script uses comprehensive mock data to simulate real scenarios:

### Users
- **Patients**: With/without assigned therapists, with/without Stripe customer IDs
- **Therapists**: Available therapists with different specializations
- **Admin**: Admin user with full system access

### Plans
- **Single Session**: Basic single appointment
- **5 Sessions Package**: Multi-session package with discount
- **10 Sessions Package**: Extended package with maximum discount

### Appointments
- **Status Tracking**: All appointment statuses and transitions
- **Payment Integration**: Stripe payment simulation
- **Session Management**: Single and recurring session handling

## Extending the Tests

### Adding New Test Cases
1. Add new function to the appropriate enum (`PatientFunction`, `TherapistFunction`, `AdminFunction`)
2. Implement the test logic in the `MockAPI` class
3. Add the test call in the appropriate test method (`testPatientFlows`, `testTherapistFlows`, `testAdminFlows`)

### Adding New Validations
1. Extend the `TestResult` interface if needed
2. Add validation logic in the test methods
3. Update the report generation to include new metrics

### Adding New Mock Data
1. Extend the mock data objects (`mockUsers`, `mockPlans`, etc.)
2. Update the test scenarios to use new data
3. Ensure data consistency across all tests

## Troubleshooting

### Common Issues
1. **TypeScript Errors**: Ensure all dependencies are installed and TypeScript is configured correctly
2. **Mock Data Issues**: Check that mock data is properly structured and consistent
3. **Test Failures**: Review the detailed error messages in the test output

### Debug Mode
To run with additional debugging information, modify the script to include more detailed logging:

```typescript
// Add debug logging
console.log('Debug: Appointment data:', appointment);
console.log('Debug: User balance:', user.balance);
```

## Integration with Real System

This test script can be adapted to work with the real system by:

1. **Replacing MockAPI with real API calls** - Use actual fetch requests to your API endpoints
2. **Using real database connections** - Connect to your MongoDB instance for data persistence
3. **Integrating with Stripe** - Use real Stripe API calls for payment testing
4. **Adding authentication** - Include real user authentication and session management

## Maintenance

- **Regular Updates**: Update the test script when new features are added
- **Data Validation**: Ensure mock data reflects current business rules
- **Performance Monitoring**: Monitor test execution time and optimize as needed
- **Documentation**: Keep this README updated with new test scenarios and validations
