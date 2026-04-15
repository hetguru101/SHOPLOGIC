# Supabase Schema: ShopLogic

**Database Design & Entity Relationships**

---

## Entity Relationship Diagram (ERD)

```
┌─────────────┐          ┌─────────────┐
│   users     │          │ customers   │
├─────────────┤          ├─────────────┤
│ user_id (PK)│          │ customer_id │
│ name        │          │ name        │
│ role        │          │ email       │
│ pin         │          │ phone       │
│ labor_rate  │          │ address     │
│ last_day_wo │          │ labor_rate_ │
│ active      │          │ override    │
└─────────────┘          └─────────────┘
      ▲                         ▲
      │                         │
      │ tech_id                 │ customer_id
      │                         │
┌─────────────────────────────────────────┐
│          vehicles                       │
├─────────────────────────────────────────┤
│ vehicle_id (PK)                         │
│ customer_id (FK)                        │
│ vin                                     │
│ make, model, year, body_type, gvwr      │
│ mileage, status                         │
└─────────────────────────────────────────┘
      ▲
      │ vehicle_id
      │
┌─────────────────────────────────────────┐
│          jobs                           │
├─────────────────────────────────────────┤
│ job_id (PK)                             │
│ job_number (unique, auto-increment)     │
│ vehicle_id (FK)                         │
│ tech_id (FK)                            │
│ description, status                     │
│ is_declined, decline_reason             │
│ estimated_cost                          │
└─────────────────────────────────────────┘
      ▲
      │ job_id
      │
┌─────────────────────────────────────────┐
│          job_logs                       │
├─────────────────────────────────────────┤
│ log_id (PK)                             │
│ job_id (FK)                             │
│ tech_id (FK)                            │
│ clock_in, clock_out                     │
│ elapsed_minutes, idle_minutes           │
│ notes, work_category                    │
└─────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    settings      │     │  markup_matrix   │
├──────────────────┤     ├──────────────────┤
│ setting_id (PK)  │     │ matrix_id (PK)   │
│ config (JSONB)   │     │ type             │
│   - labor_rate   │     │ category         │
│   - sequences    │     │ markup_percent   │
│   - etc.         │     │ active           │
└──────────────────┘     └──────────────────┘
```

---

## Table Definitions

### 1. users
**Purpose**: Technicians, managers, and admins. Kiosk login, authorization, labor rates.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | TEXT | NOT NULL | Display name on kiosk login |
| `role` | ENUM('tech','manager','admin') | NOT NULL, DEFAULT 'tech' | Authorization level |
| `pin` | TEXT(6) | UNIQUE, NULLABLE | Optional PIN for kiosk (e.g., "1234") |
| `labor_rate` | MONEY | NOT NULL, DEFAULT 75.00 | $/hour, default rate |
| `last_day_worked` | DATE | NULLABLE | When tech last worked (for reporting) |
| `active` | BOOLEAN | NOT NULL, DEFAULT true | Inactive users filtered from kiosk |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `user_id`
- Unique: `name` (for kiosk lookup)
- Unique: `pin` (for PIN validation)
- Regular: `active` (filter active techs on kiosk)

**Sample Rows**:
```
user_id                              name           role     pin   labor_rate  active
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d John Smith     tech     1234  85.00      true
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e Sarah Johnson manager  null  120.00     true
c3d4e5f6-a7b8-4c5d-9e8f-7a6b5c4d3e2f Bob Lee       admin    null  150.00     true
```

---

### 2. customers
**Purpose**: Fleet customers (truck owners). Labor rate override per customer.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `customer_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | TEXT | NOT NULL, UNIQUE | Customer company name |
| `contact_person` | TEXT | NULLABLE | Primary contact name |
| `email` | TEXT | NULLABLE | Company email |
| `phone` | TEXT | NULLABLE | Company phone |
| `address` | TEXT | NULLABLE | Physical address |
| `labor_rate_override` | MONEY | NULLABLE | Use instead of default tech rate if set |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `customer_id`
- Unique: `name`

**Sample Rows**:
```
customer_id                          name               labor_rate_override
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d Reliable Logistics 95.00
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e Big Rig Inc        null (uses default)
```

---

### 3. vehicles
**Purpose**: Truck/trailer inventory. Linked to customers. VIN decoder data.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `vehicle_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `customer_id` | UUID | FK → customers | Which customer owns this vehicle |
| `vin` | TEXT | NOT NULL, UNIQUE | VIN from decoder |
| `make` | TEXT | NULLABLE | e.g., "Peterbilt" (from NHTSA decoder) |
| `model` | TEXT | NULLABLE | e.g., "579" |
| `year` | INTEGER | NULLABLE | e.g., 2023 |
| `body_type` | TEXT | NULLABLE | e.g., "Tractor Unit", "Trailer", "Straight Truck" |
| `gvwr` | INTEGER | NULLABLE | Gross Vehicle Weight Rating (from decoder) |
| `mileage` | INTEGER | NULLABLE | Current odometer reading |
| `status` | ENUM('active','inactive','sold') | NOT NULL, DEFAULT 'active' | Operational status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `vehicle_id`
- Unique: `vin`
- Regular: `customer_id` (find vehicles by customer)
- Regular: `status` (filter active vehicles)

**Sample Rows**:
```
vehicle_id                         customer_id                        vin               year  make        status
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d 1HSCM21606A123456 2023  Peterbilt   active
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d 2T1BH4KE0BC567890 2022  Toyota      active
```

---

### 4. jobs
**Purpose**: Work orders. Assigned to techs. Track decline reason & cost estimate.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `job_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `job_number` | TEXT | NOT NULL, UNIQUE | Auto-generated (e.g., "WO-2025-1001") |
| `vehicle_id` | UUID | FK → vehicles | Which vehicle this job is for |
| `tech_id` | UUID | FK → users | Assigned technician |
| `description` | TEXT | NULLABLE | Work description (e.g., "Engine diagnostics") |
| `status` | ENUM('open','in-progress','completed','declined') | DEFAULT 'open' | Job status |
| `is_declined` | BOOLEAN | DEFAULT false | Soft flag for declined jobs |
| `decline_reason` | TEXT | NULLABLE | Why job was declined (e.g., "Parts unavailable") |
| `estimated_cost` | MONEY | NULLABLE | Estimate provided to customer |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `job_id`
- Unique: `job_number`
- Regular: `vehicle_id` (find jobs by vehicle)
- Regular: `tech_id` (find jobs by tech)
- Regular: `status` (filter open jobs)
- Regular: `is_declined` (find declined jobs for reports)

**Sample Rows**:
```
job_id                                 job_number     vehicle_id tech_id status      is_declined  decline_reason
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d  WO-2025-1001   [vid1]      [uid1]  completed   false        null
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e  WO-2025-1002   [vid2]      [uid2]  declined    true         "Parts unavailable"
```

---

### 5. job_logs
**Purpose**: Track tech clock-in/out per job. Calculate paid time, idle time, billable time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `log_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `job_id` | UUID | FK → jobs | Which job this log belongs to |
| `tech_id` | UUID | FK → users | Which tech clocked in |
| `clock_in` | TIMESTAMP | NOT NULL | When tech started work |
| `clock_out` | TIMESTAMP | NULLABLE | When tech finished (null until clock-out) |
| `elapsed_minutes` | INTEGER | NULLABLE | Time spent on this job (computed at clock_out) |
| `idle_minutes` | INTEGER | NULLABLE | Gap from prior job (computed at clock_in) |
| `notes` | TEXT | NULLABLE | Work notes (e.g., "Replaced water pump") |
| `work_category` | TEXT | NULLABLE | Category of work (e.g., "Diagnostics", "Engine", "Electrical") |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `log_id`
- Regular: `job_id` (find logs by job)
- Regular: `tech_id` (find logs by tech)
- Regular: `clock_in` (time-based queries for reports)

**Computed Fields** (calculated in application, not stored):
- `labor_minutes_paid`: elapsed_minutes (tech gets paid for all time)
- `billable_minutes`: elapsed_minutes (customer billed for all time, unless discounted)
- `labor_cost`: labor_minutes_paid * labor_rate (depends on tech + customer override)
- `billable_cost`: billable_minutes * labor_rate (with markup if applicable)

**Sample Rows**:
```
log_id                                 job_id         tech_id     clock_in              clock_out             elapsed_minutes
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d  [job1]         [tech1]     2025-01-15 08:00:00   2025-01-15 09:30:00   90
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e  [job1]         [tech1]     2025-01-15 10:00:00   2025-01-15 12:00:00   120
```

---

### 6. settings
**Purpose**: Shop configuration (sequences, labor rates, markups). Single row (or few config sets).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `setting_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `config` | JSONB | NOT NULL | All settings as JSON object (see structure below) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**config Structure** (JSONB):
```json
{
  "default_labor_rate": 75.0,
  "work_order_sequence": {
    "format": "WO-{YYYY}-{SEQUENCE}",
    "next_number": 1001,
    "reset_yearly": true
  },
  "tech_id_sequence": {
    "format": "T-{SEQUENCE}",
    "next_number": 1,
    "reset_yearly": false
  },
  "po_sequence": {
    "format": "PO-{YYYY}-{SEQUENCE}",
    "next_number": 5001,
    "reset_yearly": true
  }
}
```

**Indexes**:
- PK: `setting_id`
- Typically only 1 row for the shop

**Sample Query**:
```sql
SELECT config->>'default_labor_rate' FROM settings;
-- Returns: "75.0"

SELECT config->'work_order_sequence'->>'next_number' FROM settings;
-- Returns: "1001"
```

---

### 7. markup_matrix
**Purpose**: Parts & sublet markup rules. Apply % markup to job costs.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `matrix_id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `type` | ENUM('parts','sublet') | NOT NULL | What to mark up |
| `category` | TEXT | NULLABLE | Category (e.g., "Electrical", "Hydraulic", null = global) |
| `markup_percent` | NUMERIC(5,2) | NOT NULL | e.g., 25.00 means 25% markup |
| `active` | BOOLEAN | NOT NULL, DEFAULT true | Enable/disable rule |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes**:
- PK: `matrix_id`
- Composite: `(type, category, active)` (for lookup)

**Sample Rows** (Phase 1 simple setup):
```
matrix_id                              type    category  markup_percent  active
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d  parts   null      25.00           true
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e  sublet  null      20.00           true
```

**Phase 2 Example** (with categories):
```
matrix_id                              type    category    markup_percent  active
a1b2c3d4-e5f6-4a5b-9c8d-7e6f5a4b3c2d  parts   Electrical  30.00           true
b2c3d4e5-f6a7-4b5c-9d8e-7f6a5b4c3d2e  parts   Hydraulic   25.00           true
c3d4e5f6-a7b8-4c5d-9e8f-7a6b5c4d3e2f  sublet  null        20.00           true
```

---

## Phase 2+ Tables (Defer from MVP)

### canned_jobs
**Purpose**: Job templates for common repairs.

```sql
CREATE TABLE canned_jobs (
  job_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,  -- e.g., "100K Mile Service"
  description TEXT,
  estimated_hours DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### pm_schedule
**Purpose**: Preventive maintenance schedule (e.g., every 6 months or 100K miles).

```sql
CREATE TABLE pm_schedule (
  pm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers,
  vehicle_id UUID NOT NULL REFERENCES vehicles,
  canned_job_id UUID REFERENCES canned_jobs,
  schedule_type ENUM('interval_months', 'interval_miles') NOT NULL,
  interval_value INTEGER NOT NULL,  -- e.g., 6 (months) or 100000 (miles)
  last_completed_at TIMESTAMP,
  next_due_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### parts
**Purpose**: Parts inventory (Phase 2+).

```sql
CREATE TABLE parts (
  part_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,  -- e.g., "Electrical", "Engine", "Hydraulic"
  unit_cost MONEY NOT NULL,
  quantity_on_hand INTEGER DEFAULT 0,
  reorder_point INTEGER,
  supplier TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Row-Level Security (RLS) Policies

Enable RLS on all tables, then define policies:

### users
- Techs see only their own record
- Managers see all techs
- Admins see all techs (full CRUD)

```sql
-- Techs see themselves only
CREATE POLICY techs_see_self ON users
  FOR SELECT USING (auth.uid()::text = user_id::text OR auth.jwt()->>'role' = 'admin');

-- Managers/Admins see all
CREATE POLICY managers_see_all ON users
  FOR SELECT USING (auth.jwt()->>'role' IN ('manager', 'admin'));
```

### jobs
- Techs see their own jobs
- Managers see all jobs
- Admins see all jobs (full CRUD)

```sql
CREATE POLICY techs_see_own_jobs ON jobs
  FOR SELECT USING (tech_id = auth.uid()::uuid OR auth.jwt()->>'role' IN ('manager', 'admin'));

CREATE POLICY managers_assign ON jobs
  FOR UPDATE USING (auth.jwt()->>'role' IN ('manager', 'admin'));
```

### job_logs
- Techs see their own logs
- Managers see all logs
- Admins full access

```sql
CREATE POLICY techs_see_own_logs ON job_logs
  FOR SELECT USING (tech_id = auth.uid()::uuid OR auth.jwt()->>'role' IN ('manager', 'admin'));
```

---

## Migration Strategy

### SQL Migrations (in `supabase/migrations/`)

**001_init_schema.sql**: Create all Phase 1 tables
```sql
CREATE TABLE users ( ... );
CREATE TABLE customers ( ... );
CREATE TABLE vehicles ( ... );
CREATE TABLE jobs ( ... );
CREATE TABLE job_logs ( ... );
CREATE TABLE settings ( ... );
CREATE TABLE markup_matrix ( ... );

-- Create indexes
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_jobs_status ON jobs(status);
-- ... etc
```

**002_auth_setup.sql**: Enable RLS + define policies
**003_seed_dev.sql**: Sample data for development

### Applying Migrations
```bash
# Local dev
supabase db reset  # Resets and runs all migrations

# Production
supabase db push --remote  # Validates & pushes to production
```

---

## Constraints & Rules

### Data Constraints
- `user_id`, `customer_id`, `vehicle_id`, `job_id`, `log_id`: UUID, immutable
- `job_number`: Generated server-side; never manually edited
- `vin`: Unique per vehicle; validate format before insert
- `labor_rate` >= 0
- `markup_percent` between 0 and 999
- `status` enums: Only valid values allowed
- `role` enums: 'tech', 'manager', 'admin'

### Business Logic Constraints
- A job requires a vehicle_id (vehicles must exist first)
- A tech cannot have duplicate active clock-ins (only one job at a time)
- Declined jobs (is_declined=true) should not appear in open job lists
- Clock_out >= clock_in (time travel not allowed)
- Idle time calculated only at clock_in of next job (not retroactive)

### Audit Constraints
- All tables have `created_at` + `updated_at` (immutable creation, track updates)
- Soft deletes preferred over hard deletes (set `active=false` for users, `status='inactive'` for vehicles)
- Never delete job_logs (preserve audit trail)

---

## Testing Data Setup

### Development Seed (for local demo)
```sql
-- 1 shop owner (admin)
INSERT INTO users (name, role, pin, labor_rate, active) VALUES ('Admin User', 'admin', 'admin1234', 150.00, true);

-- 3 technicians
INSERT INTO users (name, role, labor_rate, active) VALUES 
  ('John Smith', 'tech', 85.00, true),
  ('Sarah Johnson', 'tech', 80.00, true),
  ('Mike Brown', 'tech', 75.00, true);

-- 1 manager
INSERT INTO users (name, role, pin, labor_rate, active) VALUES ('Manager Mary', 'manager', 'manager1234', 120.00, true);

-- 2 customers
INSERT INTO customers (name, email) VALUES 
  ('Reliable Logistics', 'dispatch@reliable.com'),
  ('Big Rig Inc', 'office@bigrig.com');

-- 4 vehicles
INSERT INTO vehicles (customer_id, vin, year, make, model, status) VALUES
  ([cust1], '1HSCM21606A123456', 2023, 'Peterbilt', '579', 'active'),
  ([cust1], '1HSCM21606A123457', 2022, 'Peterbilt', 'PB', 'active'),
  ([cust2], '2T1BH4KE0BC567890', 2021, 'Toyota', 'Tundra', 'active'),
  ([cust2], '5TDJZRFH0LS123456', 2020, 'Toyota', 'Highlander', 'inactive');

-- 3 jobs
INSERT INTO jobs (job_number, vehicle_id, tech_id, description, status) VALUES
  ('WO-2025-1001', [vid1], [tech1], 'Engine diagnostics', 'in-progress'),
  ('WO-2025-1002', [vid2], [tech2], '100K mile service', 'open'),
  ('WO-2025-1003', [vid3], [tech3], 'Transmission repair', 'open');

-- Settings/config
INSERT INTO settings (config) VALUES (
  '{"default_labor_rate": 75.0, "work_order_sequence": {"format": "WO-{YYYY}-{SEQUENCE}", "next_number": 1001}}'::jsonb
);

-- Markup matrix
INSERT INTO markup_matrix (type, markup_percent, active) VALUES 
  ('parts', 25.0, true),
  ('sublet', 20.0, true);
```

---

## Query Examples

### Find all open jobs for a tech
```sql
SELECT * FROM jobs
WHERE tech_id = 'user-uuid-here'
  AND status = 'open'
  AND is_declined = false
ORDER BY created_at DESC;
```

### Calculate tech idle time
```sql
SELECT 
  jl1.log_id,
  jl1.clock_in,
  jl1.idle_minutes,
  jl1_prev.clock_out as previous_clock_out
FROM job_logs jl1
LEFT JOIN job_logs jl1_prev 
  ON jl1.tech_id = jl1_prev.tech_id
  AND jl1_prev.clock_out = (
    SELECT MAX(clock_out) 
    FROM job_logs 
    WHERE tech_id = jl1.tech_id 
    AND clock_out < jl1.clock_in
  )
WHERE jl1.tech_id = 'tech-uuid'
  AND jl1.clock_in::date = '2025-01-15'
ORDER BY jl1.clock_in;
```

### Get labor rate for a job
```sql
SELECT COALESCE(c.labor_rate_override, u.labor_rate, 75.0) as applicable_rate
FROM jobs j
  JOIN vehicles v ON j.vehicle_id = v.vehicle_id
  JOIN customers c ON v.customer_id = c.customer_id
  JOIN users u ON j.tech_id = u.user_id
WHERE j.job_id = 'job-uuid-here';
```

### Declined jobs report (Phase 2)
```sql
SELECT 
  j.decline_reason,
  COUNT(j.job_id) as count,
  STRING_AGG(j.job_number, ', ') as job_numbers
FROM jobs j
WHERE j.is_declined = true
  AND j.created_at >= NOW() - INTERVAL '1 month'
GROUP BY j.decline_reason
ORDER BY count DESC;
```

---

**Reference**: PostgreSQL 14+ (Supabase uses latest), JSONB, UUIDs, Enums.

Last Updated: April 2026
