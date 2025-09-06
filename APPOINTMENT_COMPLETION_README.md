# 🚀 **Appointment Completion System - TherapyGlow-3**

## 📋 **Overview**

The **Appointment Completion System** automatically marks expired therapy appointments as completed, ensuring accurate session tracking and payment processing. This system runs as a cron job every hour and only processes **PAID appointments** for security.

## 🔧 **How It Works**

### **1. Automatic Processing**
- **Frequency**: Runs every hour at the start of the hour (e.g., 1:00, 2:00, 3:00)
- **Trigger**: Automatically starts when the Next.js app starts up
- **Scope**: Only processes appointments that ended 1+ hours ago

### **2. Payment Verification**
- **Security**: Only processes appointments with `paymentStatus: 'completed'` AND `isPaid: true`
- **Protection**: Prevents unauthorized completion of unpaid appointments
- **Audit**: Logs all actions for transparency

### **3. Status Management**
- **Single Session**: Marks as `completed` immediately
- **Multi-Session**: Increments `completedSessions`, updates next date from `recurring` array
- **Unconfirmed**: Marks as `no-show` if not confirmed by patient

## 📁 **Key Files**

### **Core System**
- `app/api/cron/completeAppointments.ts` - Main cron job logic
- `app/layout.tsx` - Cron integration on app startup
- `lib/db/connect.ts` - Database connection utility

### **Status Management**
- `lib/utils/statusMapping.ts` - Clean status system and display logic
- `lib/db/models/Appointment.ts` - Appointment data model

### **Tools & Scripts**
- `scripts/migrate-appointment-statuses.js` - Status cleanup migration
- `scripts/test-cron-job.js` - System testing and validation

## 🚀 **Getting Started**

### **1. Verify System Status**
```bash
# Test the cron job manually
curl http://localhost:3000/api/cron/completeAppointments

# Or visit in browser
http://localhost:3000/api/cron/completeAppointments
```

### **2. Check System Health**
```bash
# Run comprehensive tests
node scripts/test-cron-job.js

# Check for status conflicts
node scripts/migrate-appointment-statuses.js
```

### **3. Apply Status Cleanup (Optional)**
```bash
# First run dry-run to see what will change
node scripts/migrate-appointment-statuses.js

# Then apply the changes
node scripts/migrate-appointment-statuses.js --apply
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. "Invalid Date" Errors**
**Symptoms**: Cron job crashes with date-related errors
**Cause**: Corrupted dates in appointment `recurring` arrays
**Solution**: Run the migration script to fix invalid dates

```bash
node scripts/migrate-appointment-statuses.js --apply
```

#### **2. Database Connection Failures**
**Symptoms**: Cron job can't connect to MongoDB
**Cause**: Missing environment variables or network issues
**Check**: Verify `MONGODB_URI` in your `.env` file

#### **3. No Appointments Processed**
**Symptoms**: Cron runs but processes 0 appointments
**Causes**:
- All appointments are recent/future-dated
- No appointments meet the criteria (expired + paid + active status)
- Payment status mismatch

**Debug**: Run the test script to see appointment distribution

### **Debug Commands**

```bash
# Check cron job logs
tail -f logs/app.log | grep "cron"

# Test database connection
node -e "require('dotenv').config(); require('./lib/db/connect')().then(() => console.log('✅ Connected')).catch(console.error)"

# Verify appointment data
node scripts/test-cron-job.js
```

## 📊 **Status System**

### **Current Statuses (Legacy)**
- `not_paid`, `pending`, `pending_approval`, `approved`, `rejected`
- `cancelled`, `in_progress`, `completed`, `completed_pending_validation`
- `completed_validated`, `no-show`, `rescheduled`, `pending_scheduling`
- `matched_pending_therapist_acceptance`, `pending_match`

### **Proposed Clean System**
1. **`unpaid`** → Payment required
2. **`pending_match`** → Finding therapist
3. **`matched_pending_therapist_acceptance`** → Therapist assigned
4. **`pending_scheduling`** → Coordinating time
5. **`confirmed`** → Scheduled and confirmed
6. **`completed`** → Session finished
7. **`cancelled`** → Appointment cancelled

## 🔒 **Security Features**

### **Payment Verification**
- **Double-check**: Both `paymentStatus: 'completed'` AND `isPaid: true`
- **Status filtering**: Only processes active appointment statuses
- **Audit logging**: All actions logged with timestamps

### **Data Validation**
- **Date validation**: Prevents crashes from corrupted dates
- **Error handling**: Continues processing if individual appointments fail
- **Transaction safety**: Uses MongoDB transactions where supported

## 📈 **Monitoring & Logs**

### **Log Messages**
- `✅ Database connected for appointment completion cron`
- `📊 Found X expired PAID appointments to process`
- `✅ Marked appointment X as completed`
- `⚠️ Skipping appointment X - invalid date`
- `❌ Error processing appointment X: [error]`

### **Success Indicators**
- Cron job runs without errors
- Appointments are processed and statuses updated
- Database connection maintained
- No "Invalid Date" errors

## 🧪 **Testing**

### **Manual Testing**
```bash
# Test endpoint
GET /api/cron/completeAppointments

# Expected response
{
  "success": true,
  "message": "Appointment completion check completed successfully"
}
```

### **Automated Testing**
```bash
# Run all tests
node scripts/test-cron-job.js

# Expected output
✅ Database connection: SUCCESS
📊 Found X expired appointments
⚠️ Invalid dates: 0
🔄 Recurring appointments: X
🎉 All tests completed successfully!
```

## 🚨 **Emergency Procedures**

### **If Cron Job Crashes**
1. **Check logs** for error messages
2. **Verify database** connection
3. **Run test script** to identify issues
4. **Restart app** to reinitialize cron
5. **Check manual endpoint** for immediate processing

### **If Appointments Not Processing**
1. **Verify payment statuses** in database
2. **Check appointment dates** (past vs. future)
3. **Confirm status values** match expected enum
4. **Run migration script** if status conflicts exist

## 📝 **Configuration**

### **Environment Variables**
```bash
MONGODB_URI=mongodb://localhost:27017/therapy-app
NODE_ENV=development
```

### **Cron Schedule**
```typescript
// Runs every hour at the start of the hour
cron.schedule('0 * * * *', checkAndUpdateAppointments);
```

### **Time Thresholds**
```typescript
// Process appointments that ended 1+ hours ago
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
```

## 🤝 **Support**

### **Common Questions**
- **Q**: Why isn't my appointment being completed?
- **A**: Check if it's paid, expired, and has an active status

- **Q**: How often does the cron job run?
- **A**: Every hour at the start of the hour

- **Q**: Can I run it manually?
- **A**: Yes, visit `/api/cron/completeAppointments`

### **Getting Help**
1. **Check logs** for error messages
2. **Run test scripts** to identify issues
3. **Verify database** connection and data
4. **Check appointment** payment and status values

---

## 🎯 **Next Steps**

1. **Test the system** with the provided scripts
2. **Monitor logs** for successful operation
3. **Clean up statuses** using the migration script
4. **Verify appointments** are being processed correctly
5. **Set up monitoring** for production use

The system is now ready to automatically complete your therapy appointments! 🎉

