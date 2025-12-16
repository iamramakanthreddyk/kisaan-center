Table: _migrations
  - name (text) NOT NULL
  - executed_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_plans
  - id (integer) NOT NULL DEFAULT nextval('kisaan_plans_id_seq'::regclass)
  - name (character varying) NOT NULL
  - description (text)
  - price (numeric)
  - billing_cycle (USER-DEFINED) DEFAULT 'monthly'::enum_kisaan_plans_billing_cycle
  - monthly_price (numeric)
  - quarterly_price (numeric)
  - yearly_price (numeric)
  - max_farmers (integer)
  - max_buyers (integer)
  - max_transactions (integer)
  - data_retention_months (integer)
  - features (text) NOT NULL DEFAULT '[]'::text
  - is_active (boolean) NOT NULL DEFAULT true
  - created_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: SequelizeMeta
  - name (character varying) NOT NULL

Table: kisaan_expenses
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_expenses_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - user_id (bigint) NOT NULL
  - amount (numeric) NOT NULL
  - type (character varying) NOT NULL DEFAULT 'expense'::character varying
  - description (text)
  - transaction_id (bigint)
  - status (character varying) NOT NULL DEFAULT 'pending'::character varying
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - total_amount (numeric)
  - allocated_amount (numeric) DEFAULT 0
  - remaining_amount (numeric)
  - allocation_status (character varying) DEFAULT 'unallocated'::character varying
  - created_by (bigint)
  - expense_date (date) DEFAULT CURRENT_DATE
  - category (character varying)
  - ledger_entry_id (bigint)
  - deleted_at (timestamp with time zone)

Table: expense_settlements
  - id (bigint) NOT NULL DEFAULT nextval('expense_settlements_id_seq'::regclass)
  - expense_id (bigint) NOT NULL
  - payment_id (bigint)
  - amount (numeric) NOT NULL
  - settled_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - notes (text)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_transactions
  - id (integer) NOT NULL DEFAULT nextval('kisaan_transactions_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - farmer_id (bigint) NOT NULL
  - buyer_id (bigint) NOT NULL
  - category_id (integer) NOT NULL
  - product_name (character varying) NOT NULL
  - quantity (numeric) NOT NULL
  - unit_price (numeric) NOT NULL
  - total_sale_value (numeric) NOT NULL
  - shop_commission (numeric) NOT NULL
  - farmer_earning (numeric) NOT NULL
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - product_id (bigint)
  - commission_amount (numeric)
  - commission_rate (numeric)
  - commission_type (character varying)
  - status (character varying) DEFAULT 'pending'::character varying
  - transaction_date (date) DEFAULT CURRENT_DATE
  - settlement_date (date)
  - notes (text)
  - metadata (jsonb)
  - settled_amount (numeric) DEFAULT 0
  - pending_amount (numeric)
  - settlement_status (character varying) DEFAULT 'pending'::character varying
  - counterparty_id (bigint)

Table: kisaan_payments
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_payments_id_seq'::regclass)
  - transaction_id (integer) NOT NULL
  - payer_type (USER-DEFINED) NOT NULL
  - payee_type (USER-DEFINED) NOT NULL
  - amount (numeric) NOT NULL
  - status (USER-DEFINED) NOT NULL DEFAULT 'PENDING'::enum_kisaan_payments_status
  - payment_date (timestamp with time zone)
  - method (USER-DEFINED) NOT NULL
  - notes (text)
  - shop_id (bigint)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_shops
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_shops_id_seq'::regclass)
  - name (character varying) NOT NULL
  - owner_id (bigint)
  - plan_id (integer)
  - location (text)
  - email (character varying)
  - commission_rate (numeric) DEFAULT 0
  - settings (jsonb)
  - address (text)
  - contact (character varying)
  - status (USER-DEFINED) NOT NULL DEFAULT 'active'::enum_kisaan_shops_status
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_ledger
  - id (integer) NOT NULL DEFAULT nextval('kisaan_ledger_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - farmer_id (bigint) NOT NULL
  - amount (numeric) NOT NULL
  - commission_amount (numeric) DEFAULT 0
  - net_amount (numeric) DEFAULT 0
  - type (character varying) NOT NULL
  - category (character varying) NOT NULL
  - notes (text)
  - created_at (timestamp without time zone) DEFAULT now()
  - created_by (bigint) NOT NULL

Table: kisaan_users
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_users_id_seq'::regclass)
  - username (character varying) NOT NULL
  - password (character varying) NOT NULL
  - role (USER-DEFINED) NOT NULL
  - shop_id (bigint)
  - contact (character varying)
  - email (character varying)
  - firstname (character varying)
  - status (USER-DEFINED) NOT NULL DEFAULT 'active'::enum_kisaan_users_status
  - balance (numeric) NOT NULL DEFAULT 0.00
  - cumulative_value (numeric) NOT NULL DEFAULT 0.00
  - custom_commission_rate (numeric) DEFAULT NULL::numeric
  - created_by (bigint)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_features
  - id (integer) NOT NULL DEFAULT nextval('kisaan_features_id_seq'::regclass)
  - code (character varying) NOT NULL
  - name (character varying) NOT NULL
  - category (character varying)
  - description (text)
  - default_enabled (boolean) NOT NULL DEFAULT false
  - created_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_plan_features
  - plan_id (integer) NOT NULL
  - feature_code (character varying) NOT NULL
  - enabled (boolean) NOT NULL DEFAULT true
  - created_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_user_feature_overrides
  - user_id (bigint) NOT NULL
  - feature_code (character varying) NOT NULL
  - enabled (boolean) NOT NULL
  - reason (text)
  - created_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_user_balances
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_user_balances_id_seq'::regclass)
  - user_id (bigint) NOT NULL
  - shop_id (bigint) NOT NULL
  - balance (numeric) NOT NULL DEFAULT 0
  - version (integer) NOT NULL DEFAULT 0
  - last_updated (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_transaction_ledger
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_transaction_ledger_id_seq'::regclass)
  - transaction_id (bigint)
  - user_id (bigint) NOT NULL
  - role (character varying) NOT NULL
  - delta_amount (numeric) NOT NULL
  - balance_before (numeric)
  - balance_after (numeric)
  - reason_code (character varying) NOT NULL
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_expense_allocations
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_expense_allocations_id_seq'::regclass)
  - expense_id (integer) NOT NULL
  - transaction_id (integer)
  - allocated_amount (numeric) NOT NULL
  - allocation_type (character varying) NOT NULL
  - allocated_at (timestamp with time zone) DEFAULT now()
  - notes (text)
  - created_at (timestamp with time zone) DEFAULT now()
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_categories
  - id (integer) NOT NULL DEFAULT nextval('kisaan_categories_id_seq'::regclass)
  - name (character varying) NOT NULL
  - description (text)
  - status (character varying)
  - created_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) DEFAULT CURRENT_TIMESTAMP

Table: kisaan_products
  - id (integer) NOT NULL DEFAULT nextval('kisaan_products_id_seq'::regclass)
  - name (character varying) NOT NULL
  - category_id (integer) NOT NULL
  - description (text)
  - price (numeric)
  - record_status (character varying)
  - unit (character varying)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_commissions
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_commissions_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - rate (numeric) NOT NULL
  - type (USER-DEFINED) NOT NULL DEFAULT 'percentage'::enum_kisaan_commissions_type        
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_shop_categories
  - id (integer) NOT NULL DEFAULT nextval('kisaan_shop_categories_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - category_id (integer) NOT NULL
  - is_active (boolean) NOT NULL DEFAULT true
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_shop_products
  - id (integer) NOT NULL DEFAULT nextval('kisaan_shop_products_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - product_id (integer) NOT NULL
  - is_active (boolean) NOT NULL DEFAULT true
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_credits
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_credits_id_seq'::regclass)
  - user_id (bigint) NOT NULL
  - shop_id (bigint) NOT NULL
  - amount (numeric) NOT NULL
  - status (USER-DEFINED) NOT NULL DEFAULT 'active'::enum_kisaan_credits_status
  - due_date (date)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_settlements
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_settlements_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - user_id (bigint) NOT NULL
  - transaction_id (integer)
  - amount (numeric) NOT NULL
  - reason (USER-DEFINED) NOT NULL
  - status (USER-DEFINED) NOT NULL DEFAULT 'pending'::enum_kisaan_settlements_status       
  - settlement_date (timestamp with time zone)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_audit_logs
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_audit_logs_id_seq'::regclass)
  - shop_id (bigint)
  - user_id (bigint)
  - action (character varying) NOT NULL
  - entity_type (character varying) NOT NULL
  - entity_id (bigint) NOT NULL
  - old_values (text)
  - new_values (text)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: kisaan_plan_usage
  - id (bigint) NOT NULL DEFAULT nextval('kisaan_plan_usage_id_seq'::regclass)
  - shop_id (bigint) NOT NULL
  - plan_id (integer) NOT NULL
  - start_date (date) NOT NULL
  - end_date (date)
  - is_active (boolean) NOT NULL DEFAULT true
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: payment_allocations
  - id (integer) NOT NULL DEFAULT nextval('kisaan_payment_allocations_id_seq'::regclass)
  - payment_id (integer) NOT NULL
  - transaction_id (integer) NOT NULL
  - allocated_amount (numeric) NOT NULL
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP

Table: balance_snapshots
  - id (integer) NOT NULL DEFAULT nextval('kisaan_balance_snapshots_id_seq'::regclass)
  - user_id (bigint) NOT NULL
  - balance_type (character varying) NOT NULL DEFAULT 'farmer'::character varying
  - previous_balance (numeric) NOT NULL DEFAULT 0.00
  - amount_change (numeric) NOT NULL DEFAULT 0.00
  - new_balance (numeric) NOT NULL DEFAULT 0.00
  - transaction_type (character varying) NOT NULL DEFAULT 'adjustment'::character varying  
  - reference_id (bigint)
  - reference_type (character varying)
  - description (text)
  - created_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP
  - updated_at (timestamp with time zone) NOT NULL DEFAULT CURRENT_TIMESTAMP