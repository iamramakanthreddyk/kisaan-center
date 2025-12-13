# 🎯 Subscription Management & Feature Control System

## Overview
This document outlines a comprehensive subscription model with granular feature controls for the KisaanCenter Market Management System. The system enables super admin to dynamically control owner capabilities and implement flexible billing cycles.

---

## 📋 Subscription Model Architecture

### 1. Subscription Plans & Billing Cycles

#### Available Billing Cycles
```
QUARTERLY (3 months) - 5% discount
YEARLY (12 months) - 15% discount
MONTHLY (1 month) - Standard rate
```

#### Plan Tiers
```
BASIC PLAN:
- Max 5 farmers
- Max 10 buyers  
- 6 months data retention
- Basic reports
- 1000 transactions/month

STANDARD PLAN:
- Max 20 farmers
- Max 50 buyers
- 1 year data retention
- Advanced reports
- 5000 transactions/month

PREMIUM PLAN:
- Unlimited farmers
- Unlimited buyers
- 3 years data retention
- Premium analytics
- Unlimited transactions

ENTERPRISE PLAN:
- Everything in Premium
- Custom features
- Priority support
- Custom data retention
- Multi-shop management
```

### 2. Feature Control Matrix

#### Core Feature Categories
1. **User Management Controls**
2. **Data Access Controls** 
3. **Functional Capability Controls**
4. **Reporting & Analytics Controls**
5. **Transaction Volume Controls**

---

## 🔧 Enhanced Database Schema

### New Tables for Subscription Management

#### 1. Subscription Table
```sql
CREATE TABLE subscription (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shop(id),
    plan_id INTEGER REFERENCES plan(id),
    billing_cycle ENUM('monthly', 'quarterly', 'yearly'),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    status ENUM('active', 'suspended', 'expired', 'cancelled'),
    payment_status ENUM('paid', 'pending', 'failed', 'overdue'),
    amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Feature Control Table
```sql
CREATE TABLE feature_control (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shop(id),
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    limit_value INTEGER,
    limit_type ENUM('count', 'days', 'months', 'percentage'),
    controlled_by INTEGER REFERENCES superadmin(id),
    reason TEXT,
    effective_from TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Usage Tracking Table
```sql
CREATE TABLE usage_tracking (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shop(id),
    feature_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    usage_date DATE NOT NULL,
    reset_cycle ENUM('daily', 'monthly', 'yearly'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(shop_id, feature_name, usage_date)
);
```

#### 4. Subscription History Table
```sql
CREATE TABLE subscription_history (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shop(id),
    previous_plan_id INTEGER REFERENCES plan(id),
    new_plan_id INTEGER REFERENCES plan(id),
    change_reason TEXT,
    changed_by INTEGER REFERENCES superadmin(id),
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎛️ Feature Control Implementation

### 1. User Creation Limits

#### Farmer Creation Control
```python
class FarmerCreationControl:
    def check_farmer_limit(shop_id: int) -> dict:
        feature_control = get_feature_control(shop_id, 'farmer_creation')
        current_farmers = count_active_farmers(shop_id)
        
        return {
            'can_create': current_farmers < feature_control.limit_value,
            'current_count': current_farmers,
            'limit': feature_control.limit_value,
            'remaining': max(0, feature_control.limit_value - current_farmers)
        }
```

#### Buyer Creation Control  
```python
class BuyerCreationControl:
    def check_buyer_limit(shop_id: int) -> dict:
        feature_control = get_feature_control(shop_id, 'buyer_creation')
        current_buyers = count_active_buyers(shop_id)
        
        return {
            'can_create': current_buyers < feature_control.limit_value,
            'current_count': current_buyers,
            'limit': feature_control.limit_value,
            'remaining': max(0, feature_control.limit_value - current_buyers)
        }
```

### 2. Data Access Restrictions

#### Historical Data Access Control
```python
class DataAccessControl:
    def get_accessible_date_range(shop_id: int) -> dict:
        feature_control = get_feature_control(shop_id, 'data_retention')
        
        if feature_control.limit_type == 'months':
            cutoff_date = datetime.now() - timedelta(days=feature_control.limit_value * 30)
        elif feature_control.limit_type == 'days':
            cutoff_date = datetime.now() - timedelta(days=feature_control.limit_value)
        
        return {
            'accessible_from': cutoff_date,
            'accessible_to': datetime.now(),
            'retention_months': feature_control.limit_value,
            'is_restricted': True if feature_control.limit_value else False
        }
```

### 3. Transaction Volume Controls

#### Monthly Transaction Limits
```python
class TransactionVolumeControl:
    def check_transaction_limit(shop_id: int) -> dict:
        feature_control = get_feature_control(shop_id, 'monthly_transactions')
        current_month_transactions = count_current_month_transactions(shop_id)
        
        return {
            'can_create_transaction': current_month_transactions < feature_control.limit_value,
            'current_count': current_month_transactions,
            'limit': feature_control.limit_value,
            'remaining': max(0, feature_control.limit_value - current_month_transactions),
            'reset_date': get_next_month_first_day()
        }
```

---

## 🎯 Suggested Improvements & Recommendations

### 1. Subscription Model Enhancements

#### A. Flexible Billing Options
```
✅ RECOMMENDED: Multiple billing cycles with discounts
- Monthly: Base price
- Quarterly: 5% discount  
- Yearly: 15% discount
- Custom: For enterprise clients

✅ RECOMMENDED: Proration support
- Mid-cycle plan upgrades
- Prorated billing for plan changes
- Grace period for renewals
```

#### B. Smart Feature Bundling
```
✅ RECOMMENDED: Feature packages instead of individual controls
- User Management Package (farmer/buyer limits)
- Data Package (retention + reports)
- Transaction Package (volume + analytics)
- Premium Package (unlimited everything)
```

### 2. Advanced Control Mechanisms

#### A. Gradual Restrictions (Soft Limits)
```python
class GradualRestrictionEngine:
    """
    Instead of hard stops, implement warnings and soft limits
    """
    def get_restriction_level(usage_percentage: float) -> str:
        if usage_percentage >= 100:
            return "BLOCKED"  # Hard stop
        elif usage_percentage >= 90:
            return "WARNING_CRITICAL"  # Red warnings
        elif usage_percentage >= 75:
            return "WARNING_HIGH"  # Orange warnings
        elif usage_percentage >= 50:
            return "NOTICE"  # Info notices
        else:
            return "NORMAL"
```

#### B. Time-Based Feature Unlocks
```python
class TimeBasedControls:
    """
    Features can be unlocked based on subscription tenure
    """
    features = {
        'advanced_reports': {'unlock_after_months': 3},
        'bulk_operations': {'unlock_after_months': 6},
        'api_access': {'unlock_after_months': 12}
    }
```

### 3. Owner Experience Improvements

#### A. Self-Service Upgrade Portal
```
✅ RECOMMENDED: Owner dashboard with:
- Current plan details
- Usage statistics with visual meters
- Upgrade/downgrade options
- Billing history
- Feature comparison matrix
```

#### B. Predictive Notifications
```python
class PredictiveNotifications:
    """
    Smart notifications based on usage patterns
    """
    def check_upgrade_suggestions(shop_id: int):
        usage_trends = analyze_usage_trends(shop_id)
        
        if usage_trends['farmer_growth'] > 80:
            suggest_upgrade('user_management_package')
        
        if usage_trends['transaction_volume'] > 85:
            suggest_upgrade('transaction_package')
```

### 4. Super Admin Control Enhancements

#### A. Bulk Operations Dashboard
```
✅ RECOMMENDED: Batch operations for:
- Apply feature restrictions to multiple shops
- Bulk plan migrations
- Mass suspension/reactivation
- Group discount applications
```

#### B. Advanced Analytics for Admin
```python
class AdminAnalytics:
    """
    Super admin insights for business intelligence
    """
    def get_subscription_analytics():
        return {
            'revenue_by_plan': calculate_revenue_by_plan(),
            'churn_risk_shops': identify_churn_risk(),
            'upgrade_candidates': find_upgrade_candidates(),
            'usage_efficiency': calculate_feature_utilization()
        }
```

---

## 🔒 Security & Compliance Considerations

### 1. Data Protection
```
✅ RECOMMENDED: Automated data archival
- Move old data to cold storage instead of deletion
- Maintain compliance with data retention laws
- Provide data export before restriction
```

### 2. Audit Trail Enhancement
```python
class SubscriptionAuditLog:
    """
    Enhanced audit logging for subscription changes
    """
    def log_feature_change(shop_id, feature_name, old_value, new_value, admin_id, reason):
        audit_entry = {
            'timestamp': datetime.now(),
            'shop_id': shop_id,
            'feature': feature_name,
            'change_type': 'feature_restriction',
            'old_state': old_value,
            'new_state': new_value,
            'admin_id': admin_id,
            'business_reason': reason,
            'impact_assessment': calculate_impact(shop_id, feature_name)
        }
```

---

## 📊 Implementation Roadmap

### Phase 1: Core Subscription System (2-3 weeks)
1. ✅ Create subscription & feature control tables
2. ✅ Implement basic plan management
3. ✅ Add billing cycle options
4. ✅ Create admin dashboard for plan assignment

### Phase 2: Feature Control Engine (2-3 weeks)  
1. ✅ Implement user creation limits
2. ✅ Add data retention controls
3. ✅ Create transaction volume tracking
4. ✅ Build usage monitoring system

### Phase 3: Advanced Controls (3-4 weeks)
1. ✅ Gradual restriction system
2. ✅ Self-service owner portal
3. ✅ Predictive notifications
4. ✅ Advanced admin analytics

### Phase 4: Enterprise Features (2-3 weeks)
1. ✅ Custom plan builder
2. ✅ Multi-shop management
3. ✅ Advanced reporting suite
4. ✅ API rate limiting

---

## 🎯 Answer to Your Specific Questions

### 1. **Can owner choose yearly or quarterly subscription?**
**✅ YES - HIGHLY RECOMMENDED**
```
Implementation:
- Add billing_cycle field to subscription table
- Offer 5% discount for quarterly, 15% for yearly
- Automatic renewal with same cycle
- Mid-cycle upgrades with proration
```

### 2. **Can owner be limited to create farmers, buyers?**
**✅ YES - ESSENTIAL FEATURE**
```
Implementation:
- feature_control table with farmer_creation_limit
- Real-time validation during user creation
- Soft warnings at 75%, 90% usage
- Hard stop at 100% with upgrade prompts
```

### 3. **Can owner be limited to view his past data?**
**✅ YES - POWERFUL BUSINESS LEVER**
```
Implementation:
- Data retention limits by plan (6mo/1yr/3yr)
- Automatic archival of old data
- Upgrade prompts when accessing restricted data
- Export options before data becomes inaccessible
```

---

## 💡 Additional Business Value Features

### 1. **Smart Plan Recommendations**
```python
def recommend_optimal_plan(shop_id: int):
    """
    AI-driven plan recommendations based on usage patterns
    """
    usage = analyze_shop_usage(shop_id)
    return suggest_best_plan_for_usage(usage)
```

### 2. **Loyalty Rewards**
```python
class LoyaltyProgram:
    """
    Reward long-term subscribers
    """
    rewards = {
        '12_months': 'unlock_advanced_reports',
        '24_months': '10_percent_discount',
        '36_months': 'free_premium_features'
    }
```

### 3. **Resource Usage Optimization**
```python
class ResourceOptimizer:
    """
    Help owners optimize their subscription value
    """
    def suggest_optimizations(shop_id: int):
        return {
            'underused_features': find_underused_features(shop_id),
            'potential_savings': calculate_downgrade_savings(shop_id),
            'efficiency_tips': generate_efficiency_tips(shop_id)
        }
```

This comprehensive subscription system provides:
- ✅ Flexible billing cycles with incentives
- ✅ Granular feature controls per your requirements  
- ✅ Scalable architecture for future enhancements
- ✅ Rich admin controls and analytics
- ✅ Excellent owner experience with self-service options

Would you like me to proceed with implementing any specific part of this system?
