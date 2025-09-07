# 🔍 Monitoring & Validation Guide

## 📊 **Monitoring Dashboard**

### **Real-time Dashboard**
- **URL**: `/api/monitoring/status-system` (Admin only)
- **Component**: `components/monitoring/StatusSystemDashboard.tsx`
- **Features**:
  - Real-time status system health
  - Performance metrics (latency, throughput, error rates)
  - Active alerts and issues
  - Status distribution charts
  - System uptime and version info

### **Health Check Endpoint**
- **URL**: `/api/health/status-system`
- **Public**: Yes (for load balancers)
- **Response Codes**:
  - `200`: Healthy
  - `200`: Degraded (warnings but functional)
  - `503`: Unhealthy (critical issues)

---

## 🧪 **Validation Scripts**

### **1. Comprehensive System Validation**
```bash
# Run full validation
node scripts/validate-status-system.js
```

**Checks**:
- ✅ Status distribution analysis
- ✅ Legacy status cleanup validation
- ✅ Transition flow compliance
- ✅ Required fields validation
- ✅ Business rules validation
- ✅ History consistency check
- ✅ Recent transitions analysis

### **2. Migration Testing**
```bash
# Test migration results
node scripts/test-migrated-routes.js
```

**Checks**:
- ✅ Status distribution after migration
- ✅ Legacy status detection
- ✅ Payment status distribution
- ✅ Data integrity validation
- ✅ Transition flow compliance
- ✅ Recent appointments sampling

---

## 🚨 **Alerting System**

### **Alert Types**
- **Critical**: System down, data corruption
- **High**: Invalid transitions, high error rates
- **Medium**: Legacy statuses, low volume
- **Low**: Performance degradation

### **Alert Rules**
1. **New System Inactive**: Feature flag disabled
2. **Legacy Statuses**: Old statuses still present
3. **Invalid Transitions**: Business rule violations
4. **Missing Fields**: Required data missing
5. **High Error Rate**: >5% failure rate
6. **No Recent Transitions**: System may be down
7. **Low Volume**: <5 transitions/hour

### **Alert Channels**
- **Slack**: Webhook integration
- **Email**: SMTP integration
- **Dashboard**: Real-time display
- **Logs**: Structured logging

---

## 📈 **Performance Monitoring**

### **Metrics Tracked**
- **Latency**: Average, P50, P95, P99, Max
- **Throughput**: Transitions/minute, hour, peak rates
- **Error Rates**: By type and overall percentage
- **Resource Usage**: Memory, CPU, DB connections
- **System Load**: Active transitions, queue depth

### **Performance Thresholds**
- **Latency**: P95 < 2 seconds
- **Error Rate**: < 10%
- **Memory**: < 1GB heap usage
- **Throughput**: > 10 transitions/hour

---

## 🔧 **Health Checks**

### **System Health Endpoint**
```bash
curl /api/health/status-system
```

**Response Example**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "responseTime": "45ms",
  "system": {
    "newTransitionSystem": true,
    "uptime": 86400,
    "version": "1.0.0"
  },
  "metrics": {
    "totalAppointments": 1250,
    "statusDistribution": {
      "confirmed": 450,
      "completed": 300,
      "pending_match": 200
    },
    "last24Hours": {
      "transitions": 45,
      "errors": 2,
      "successfulTransitions": 43
    }
  },
  "alerts": {
    "status": "healthy",
    "activeAlerts": 0,
    "criticalAlerts": 0
  },
  "performance": {
    "latency": {
      "average": "125ms",
      "p95": "450ms"
    },
    "throughput": {
      "perHour": 45,
      "perMinute": 2
    },
    "errorRate": "4.4%",
    "memoryUsage": "245MB"
  }
}
```

---

## 🚨 **Rollback Procedures**

### **Emergency Rollback (Feature Flag)**
```bash
# Disable new system immediately
export USE_NEW_TRANSITION_SYSTEM=false

# Restart application
pm2 restart therapyglow
```

### **Database Rollback**
```bash
# Restore from backup (if needed)
mongorestore --db therapyglow backup/2024-01-15/

# Or revert specific collections
mongorestore --db therapyglow --collection appointments backup/appointments.bson
```

### **Code Rollback**
```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous version
git checkout v1.0.0

# Deploy rollback
npm run deploy:rollback
```

---

## 📋 **Monitoring Checklist**

### **Daily Checks**
- [ ] Review dashboard for alerts
- [ ] Check error rates and latency
- [ ] Verify status distribution looks normal
- [ ] Confirm no critical alerts

### **Weekly Checks**
- [ ] Run validation script
- [ ] Review performance trends
- [ ] Check for legacy statuses
- [ ] Validate business rules

### **Monthly Checks**
- [ ] Full system validation
- [ ] Performance optimization review
- [ ] Alert rule tuning
- [ ] Capacity planning

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. High Error Rate**
```bash
# Check recent errors
node scripts/validate-status-system.js

# Review logs
tail -f logs/app.log | grep "ERROR"

# Check database connectivity
node -e "require('./lib/db/connect')().then(() => console.log('DB OK')).catch(console.error)"
```

#### **2. Legacy Statuses Found**
```bash
# Run migration
node scripts/migrate-to-new-status-system.js --apply

# Verify cleanup
node scripts/validate-status-system.js
```

#### **3. Performance Issues**
```bash
# Check system resources
top
free -h
df -h

# Review performance metrics
curl /api/health/status-system | jq '.performance'
```

#### **4. No Recent Transitions**
```bash
# Check if system is active
curl /api/health/status-system | jq '.metrics.last24Hours'

# Verify feature flag
echo $USE_NEW_TRANSITION_SYSTEM

# Check application logs
tail -f logs/app.log | grep "transition"
```

---

## 📊 **Key Metrics to Monitor**

### **Business Metrics**
- Total appointments by status
- Transition success rate
- Average time per transition
- Error rate by status

### **Technical Metrics**
- API response times
- Database query performance
- Memory usage trends
- CPU utilization

### **Operational Metrics**
- System uptime
- Alert frequency
- Manual interventions
- Rollback frequency

---

## 🎯 **Success Criteria**

### **Healthy System**
- ✅ Error rate < 5%
- ✅ P95 latency < 2 seconds
- ✅ No critical alerts
- ✅ All business rules validated
- ✅ No legacy statuses
- ✅ Recent transition activity

### **Performance Targets**
- ✅ 100+ transitions/hour capacity
- ✅ < 500ms average latency
- ✅ < 1GB memory usage
- ✅ 99.9% uptime

---

## 📞 **Emergency Contacts**

### **Escalation Path**
1. **Level 1**: Check dashboard and logs
2. **Level 2**: Run validation scripts
3. **Level 3**: Execute rollback procedures
4. **Level 4**: Contact development team

### **Quick Commands**
```bash
# System status
curl /api/health/status-system

# Full validation
node scripts/validate-status-system.js

# Emergency rollback
export USE_NEW_TRANSITION_SYSTEM=false && pm2 restart therapyglow

# Check logs
tail -f logs/app.log | grep -E "(ERROR|WARN|transition)"
```

**The monitoring and validation system is now fully operational! 🚀**
