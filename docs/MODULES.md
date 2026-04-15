# ShopLogic Module Guide

**Feature Module Breakdown & Responsibilities**

---

## Module Responsibilities Matrix

Each module owns a domain area. Dependencies flow downward (modules below can depend on modules above, but not vice versa).

```
┌─────────────────────────────────────────┐
│ core/                                   │
│ • supabase client                       │
│ • auth context                          │
│ • shared utilities                      │
│ • types/models                          │
└─────────────────────────────────────────┘
           ▲
           │
┌─────────────────────────────────────────┐
│ modules/                                │
├─────────────────────────────────────────┤
│                                         │
│ ┌─ auth (kiosk login)                  │
│ │  └─ depends on: core/auth             │
│ │                                       │
│ ┌─ customers                            │
│ │  └─ depends on: core, auth            │
│ │                                       │
│ ┌─ vehicles (+ VIN decoder)            │
│ │  └─ depends on: core, customers       │
│ │                                       │
│ ┌─ employees                            │
│ │  └─ depends on: core, auth, settings  │
│ │                                       │
│ ┌─ jobs                                 │
│ │  └─ depends on: core, vehicles, auth  │
│ │                                       │
│ ┌─ tech-logging                         │
│ │  └─ depends on: jobs, employees       │
│ │                                       │
│ ┌─ settings                             │
│ │  └─ depends on: core                  │
│ │                                       │
│ └─ reports (Phase 2+)                  │
│    └─ depends on: jobs, tech-logging    │
│                                         │
└─────────────────────────────────────────┘
           ▲
           │
┌─────────────────────────────────────────┐
│ routes/ (pages)                         │
│ • Assemble modules into views           │
└─────────────────────────────────────────┘
```

---

## 1. `modules/auth/` — Kiosk Login & Session

**Responsibility**: Authenticate techs via shared kiosk. Manage session lifecycle.

### Key Flows
- Display all active techs on kiosk screen
- Tech taps name → enter PIN (optional) → validated
- Create session (JWT stored in localStorage)
- Auto-logout after 5 mins idle on shared device
- Logout returns to kiosk screen

### Files

**KioskLoginScreen.tsx**
- Full-screen layout for shared device
- Displays grid of tech names (large touch targets)
- PIN entry pad if PIN required
- Countdown timer (4 min warning, 5 min auto-logout)

**LoginService.ts**
- `getAllActiveTechs()` → List of user objects where active=true
- `validatePIN(name, pin)` → Verify PIN matches Supabase record
- `createSession(user)` → Store JWT in localStorage
- `logout()` → Clear localStorage, redirect to kiosk
- `isSessionExpired()` → Check if 5 min idle

**hooks.ts**
- `useKioskTechs()` → Realtime list of active techs
- `useAuthSession()` → Current user + session state
- `useIdleLogout(minutes)` → Track inactivity, auto-logout

**types.ts**
```typescript
interface TechUser {
  user_id: string;
  name: string;
  role: 'tech' | 'manager' | 'admin';
  active: boolean;
}

interface SessionState {
  user: TechUser | null;
  isAuthenticated: boolean;
  expiresAt: Date | null;
}
```

### Authorization Gate
All protected routes check `useAuthSession()`. Tech sees only tech dashboard. Manager sees manager dashboard. Admin sees admin settings.

---

## 2. `modules/customers/` — Customer & Account Management

**Responsibility**: CRUD customers, track contact info, set per-customer labor rate overrides.

### Key Features
- Create/edit/delete customers
- Store contact person, email, phone, address
- Per-customer labor rate override (replaces default $85/hour with custom rate)

### Files

**CustomerList.tsx**
- Spreadsheet table of all customers
- Columns: Name, Contact, Phone, Labor Rate Override, Actions (edit, delete)
- Inline edit (double-click cell to edit)
- Add new button

**CustomerDetail.tsx**
- Read-only detail view or modal
- Full customer info + linked vehicles count

**CustomerForm.tsx**
- Form for create/edit
- Fields: Name, Contact Person, Email, Phone, Address, Labor Rate Override
- Validation: Name required, Email format, Labor Rate >= 0
- Submit: Save → refetch list

**CustomerService.ts**
- `getCustomers()` → All customers
- `getCustomer(id)` → Single customer + linked vehicles
- `createCustomer(input)` → Insert new
- `updateCustomer(id, input)` → Update existing
- `deleteCustomer(id)` → Soft/hard delete
- `getCustomerLaborRate(customerId)` → Resolve rate (override or default)

**hooks.ts**
- `useCustomers()` → Fetch all, pagination
- `useCustomer(id)` → Fetch single + realtime updates
- `useCreateCustomer()` → Mutation + optimistic update
- `useUpdateCustomer(id)` → Mutation + refetch
- `useDeleteCustomer(id)` → Mutation

**types.ts**
```typescript
interface Customer {
  customer_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  labor_rate_override?: number;
  created_at: string;
  updated_at: string;
}

interface CustomerFormInput {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  labor_rate_override?: number;
}
```

### Dependencies
- `core/supabase` — Database client
- `core/context/AuthContext` — Current user (for authorization checks)

### Authorization
- Tech: No access
- Manager: Read-only view
- Admin: Full CRUD

---

## 3. `modules/vehicles/` — Vehicle Inventory & VIN Decoder

**Responsibility**: Vehicle CRUD, integrate NHTSA VIN decoder to auto-populate make/model/year/gvwr.

### Key Features
- Create vehicle (enter VIN → decode → auto-populate fields)
- Edit vehicle (mileage, status)
- List vehicles by customer
- VIN lookup via free NHTSA API

### Files

**VehicleList.tsx**
- Table of all vehicles
- Columns: VIN, Customer, Make, Model, Year, Mileage, Status, Actions
- Filter by customer/status
- Add new button

**VehicleDetail.tsx**
- Full vehicle info
- Linked jobs count
- Edit button

**VehicleForm.tsx**
- Create/edit vehicle
- VIN entry + "Decode" button
- Form fields auto-populate after decode
- Manual override allowed
- Submit saves to DB

**VINDecoder.ts**
- Calls Supabase Edge Function
- Edge Function calls NHTSA API: `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}`
- Returns: make, model, year, body_type, gvwr
- Error handling: Invalid VIN, API timeout, show error allow manual entry

**VehicleService.ts**
- `getVehicles()` → All vehicles
- `getVehiclesByCustomer(customerId)` → Customer's vehicles
- `getVehicle(id)` → Single vehicle detail
- `createVehicle(input)` → Insert (with VIN validation)
- `updateVehicle(id, input)` → Update
- `deleteVehicle(id)` → Soft delete (set status='inactive')

**hooks.ts**
- `useVehicles()` → All vehicles, pagination
- `useVehiclesByCustomer(customerId)` → Filter by customer
- `useVehicle(id)` → Single vehicle
- `useCreateVehicle()` → Mutation
- `useUpdateVehicle(id)` → Mutation
- `useDecodeVIN(vin)` → Call Edge Function, return decoded data

**types.ts**
```typescript
interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  body_type?: string;  // "Tractor Unit", "Trailer", etc.
  gvwr?: number;       // Gross Vehicle Weight Rating
  mileage?: number;
  status: 'active' | 'inactive' | 'sold';
  created_at: string;
  updated_at: string;
}

interface VINDecodeResult {
  make: string;
  model: string;
  year: number;
  body_type: string;
  gvwr: number;
}
```

### Dependencies
- `modules/customers` — Need customer list for dropdown
- `core/supabase` — Database + Edge Functions
- NHTSA API (external)

### Authorization
- Tech: View only
- Manager: Read-only view
- Admin: Full CRUD

---

## 4. `modules/employees/` — Tech Roster & Labor Rate Management

**Responsibility**: Manage technician roster, labor rates, last day worked, time clock audit.

### Key Features
- List all employees (active + inactive)
- Edit employee: name, role, labor rate, last day worked, active/inactive status
- View last clock in/out timestamp per tech
- Add new employee
- Deactivate employee (hides from kiosk login)

### Files

**EmployeeList.tsx**
- Single consolidated table: All employees
- Columns: Tech ID, Name, Role, Labor Rate, Last Day Worked, Last Clock In/Out, Status, Actions
- Edit button per row
- Add new button at top
- Filter active/inactive toggle

**EmployeeForm.tsx**
- Create/edit employee form
- Fields: Name, Role (tech/manager/admin), Labor Rate, Last Day Worked, PIN (optional), Active/Inactive
- Save → Updates users table

**EmployeeService.ts**
- `getEmployees()` → All users
- `getEmployee(id)` → Single user
- `createEmployee(input)` → Insert user (assign role, labor_rate)
- `updateEmployee(id, input)` → Update (labor_rate, last_day_worked, active)
- `deactivateEmployee(id)` → Set active=false
- `getLastClockInOut(techId)` → Query job_logs for most recent clock_in/out

**hooks.ts**
- `useEmployees()` → All users, pagination
- `useEmployee(id)` → Single user
- `useCreateEmployee()` → Mutation
- `useUpdateEmployee(id)` → Mutation
- `useLastClockInOut(techId)` → Get most recent clock timestamps

**types.ts**
```typescript
interface Employee {
  user_id: string;
  name: string;
  role: 'tech' | 'manager' | 'admin';
  labor_rate: number;
  last_day_worked?: string;  // ISO date
  active: boolean;
  pin?: string;  // Store hashed in DB, don't return
  created_at: string;
  updated_at: string;
}

interface EmployeeFormInput {
  name: string;
  role: 'tech' | 'manager' | 'admin';
  labor_rate: number;
  last_day_worked?: string;
  pin?: string;
  active: boolean;
}

interface ClockRecord {
  clock_in: string;  // ISO timestamp
  clock_out?: string;  // ISO timestamp
  job_number: string;
}
```

### Dependencies
- `modules/auth` — Current user for authorization
- `core/supabase` — users + job_logs tables
- `modules/jobs` — For clock history queries

### Authorization
- Tech: Cannot access
- Manager: Read-only view OR limited edit (labor rate, active status)
- Admin: Full CRUD

---

## 5. `modules/jobs/` — Work Order Management

**Responsibility**: Create/assign jobs, decline tracking, auto-number jobs, spreadsheet view.

### Key Features
- Create new job (vehicle + tech assignment)
- Auto-generate job number (WO-2025-1001, etc.)
- Assign/reassign jobs to techs
- Decline job (set is_declined, decline_reason)
- Spreadsheet view (all jobs, editable columns)
- Filter by status, tech, vehicle, declined

### Files

**JobList.tsx**
- Spreadsheet table of all jobs
- Columns: Job #, Vehicle VIN, Customer, Status, Assigned Tech, Created Date, Actions
- Inline status edit (click → dropdown)
- Decline button per row
- Filter controls: Status, Tech, Declined only
- Add new button

**JobDetail.tsx**
- Read-only detail view or modal
- Full job info, decline reason (if applicable), linked job_logs

**JobForm.tsx**
- Create/edit job form
- Fields: Vehicle (dropdown), Assigned Tech (dropdown), Description, Status, Estimated Cost
- Auto-generate job number on create (call Edge Function)
- Submit: Save → refetch list

**JobService.ts**
- `getJobs()` → All jobs
- `getJob(id)` → Single job + linked vehicle, tech, job_logs
- `getJobsByTech(techId)` → Tech's open jobs
- `getJobsByStatus(status)` → Filter by status
- `getDeclinedJobs()` → is_declined=true jobs (for reports)
- `createJob(input)` → Call Edge Function to auto-generate job_number, then insert
- `updateJob(id, input)` → Update (reassign, change status)
- `declineJob(id, reason)` → Set is_declined=true, decline_reason=reason
- `updateJobStatus(id, status)` → Change status (open→in-progress→completed)

**hooks.ts**
- `useJobs()` → All jobs
- `useJobsByTech(techId)` → Tech's jobs
- `useJob(id)` → Single job + realtime updates
- `useCreateJob()` → Mutation + auto-numbering
- `useUpdateJob(id)` → Mutation
- `useDeclineJob(id)` → Mutation (set decline flag + reason)

**types.ts**
```typescript
interface Job {
  job_id: string;
  job_number: string;  // WO-2025-1001 (auto-generated)
  vehicle_id: string;
  tech_id: string;
  description?: string;
  status: 'open' | 'in-progress' | 'completed' | 'declined';
  is_declined: boolean;
  decline_reason?: string;
  estimated_cost?: number;
  created_at: string;
  updated_at: string;
}

interface JobFormInput {
  vehicle_id: string;
  tech_id: string;
  description?: string;
  status: 'open' | 'in-progress' | 'completed' | 'declined';
  estimated_cost?: number;
}

interface DeclineJobInput {
  decline_reason: string;  // Free text or enum
}
```

### Dependencies
- `modules/vehicles` — Need vehicle list for dropdown
- `modules/employees` — Need tech list for dropdown
- `modules/settings` — Get job number sequence format
- `core/supabase` — Database + Edge Functions

### Authorization
- Tech: View only own jobs
- Manager: View all, assign, decline, change status
- Admin: Full CRUD

---

## 6. `modules/tech-logging/` — Clock In/Out & Job Time Tracking

**Responsibility**: Tech clock-in/out, job selection, elapsed time calculation, idle time tracking.

### Key Features
- Tech sees open work orders
- Tech selects job → clock in (creates job_logs entry)
- Tech works on job, sees elapsed timer
- Tech clocks out → calculate idle time until next job
- Realtime updates for managers to see tech status

### Files

**TechDashboard.tsx**
- Tech's main screen after kiosk login
- Shows list of open work orders assigned to them
- Columns: Job #, Vehicle, Description, Status, Time On Job
- Select job to clock in

**JobSelector.tsx**
- Show tech's open jobs
- Select (tap) job → clock in
- Confirm dialog: "Clock in to Job WO-2025-1001?"

**JobClockPanel.tsx**
- Show while clocked in
- Displays: Job #, Vehicle, Elapsed time (running timer)
- Notes field (optional)
- Work Category dropdown (optional)
- Clock Out button
- When clock out: Calculate elapsed_minutes, idle_minutes (gap to next job)

**TechLoggingService.ts**
- `getTechOpenJobs(techId)` → Jobs where tech_id=techId AND status NOT IN ('completed', 'declined')
- `clockIn(jobId)` → Create job_logs entry with clock_in=NOW
- `clockOut(logId)` → Update job_logs: clock_out=NOW, elapsed_minutes=calculated, idle_minutes=gap
- `calculateIdleMinutes(techId)` → Gap from prior job's clock_out to this clock_in
- `getActiveClock(techId)` → Current clocked-in job (where clock_out IS NULL)
- `addNotes(logId, notes)` → Update job_logs with work notes

**hooks.ts**
- `useTechOpenJobs(techId)` → Realtime list of open jobs for tech
- `useActiveClock(techId)` → Realtime: which job tech is clocked into (if any)
- `useClockIn(jobId)` → Mutation (create job_logs, redirect to clock panel)
- `useClockOut(logId)` → Mutation (finalize clock_out, redirect to job list)
- `useElapsedTime(clockInTime)` → Running timer hook
- `useIdleMinutes(logId)` → Calculate idle time after clock_out

**types.ts**
```typescript
interface JobLog {
  log_id: string;
  job_id: string;
  tech_id: string;
  clock_in: string;  // ISO timestamp
  clock_out?: string;  // ISO timestamp (null if still clocked in)
  elapsed_minutes?: number;
  idle_minutes?: number;
  notes?: string;
  work_category?: string;
  created_at: string;
  updated_at: string;
}

interface TechClockState {
  isClocked: boolean;
  currentLog?: JobLog;
  elapsedMinutes: number;
  job?: Job;
}
```

### Dependencies
- `modules/jobs` — Need job data
- `modules/employees` — Tech info
- `core/context/TechSessionContext` — Current session

### Authorization
- Tech: Can only clock in/out their own jobs
- Manager: View only (see tech status)
- Admin: View only

### Realtime
- Manager/admin subscribed to job_logs changes
- When tech clocks out of Job A, managers see:
  - Job A: elapsed time populated
  - elapsed_minutes visible in job reports

---

## 7. `modules/settings/` — Admin Configuration

**Responsibility**: Configure sequences (work order, tech ID, PO), labor rates, markup matrices.

### Key Features
- Work order sequence (format, starting #)
- Tech ID sequence (format, starting #)
- PO number sequence (format, starting #)
- Default labor rate (shop-wide)
- Parts markup matrix (% markup applied to parts costs)
- Sublet markup matrix (% markup applied to sublet costs)

### Files

**SettingsDashboard.tsx**
- Tab-based layout: Sequences | Labor Rates | Markups
- Each tab is a form with preview/validation

**SequenceSettings.tsx**
- Edit work order sequence format + starting number
- Preview: Shows next 5 numbers
- Example: Template="WO-{YYYY}-{SEQUENCE}", Next=1001 → Preview shows WO-2025-1001 through WO-2025-1005
- Tech ID sequence (same pattern)
- PO sequence (same pattern)
- Save → Updates settings table

**LaborRateSettings.tsx**
- Edit default labor rate (shop-wide baseline)
- Per-customer overrides (dropdown: select customer, enter override rate)
- Display current overrides in table below
- Add/edit/delete override

**MarkupMatrixSettings.tsx**
- Table of markup rules (Phase 1: global; Phase 2+: by category)
- Columns: Type (Parts/Sublet), Category (null = global), Markup %, Active
- Add/edit/delete row
- Preview: "Parts at 25% markup: $100 parts cost → $125 billed"

**SettingsService.ts**
- `getSettings()` → Single settings row (all config as JSONB)
- `updateSequenceSettings(newConfig)` → Update settings.config.work_order_sequence
- `updateLaborRate(newRate)` → Update settings.config.default_labor_rate
- `getNextJobNumber()` → Format & increment work order sequence
- `getNextTechID()` → Format & increment tech ID sequence
- `getNextPONumber()` → Format & increment PO sequence
- `addMarkupRule(type, category, percent)` → Insert into markup_matrix
- `updateMarkupRule(id, percent)` → Update markup_matrix
- `deleteMarkupRule(id)` → Delete markup_matrix row

**hooks.ts**
- `useSettings()` → Fetch settings + realtime updates
- `useUpdateSequence(type)` → Mutation for sequence settings
- `useUpdateLaborRate()` → Mutation for default labor rate
- `useMarkupMatrix()` → Fetch all markup rules
- `useAddMarkupRule()` → Mutation (insert)
- `useUpdateMarkupRule(id)` → Mutation (update)
- `useDeleteMarkupRule(id)` → Mutation (delete)

**types.ts**
```typescript
interface Settings {
  setting_id: string;
  config: {
    default_labor_rate: number;
    work_order_sequence: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
    tech_id_sequence: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
    po_sequence: {
      format: string;
      next_number: number;
      reset_yearly?: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

interface MarkupRule {
  matrix_id: string;
  type: 'parts' | 'sublet';
  category?: string;
  markup_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Dependencies
- `modules/customers` — For per-customer labor rate overrides
- `core/supabase` — Settings + markup_matrix tables

### Authorization
- Tech: No access
- Manager: No access (Phase 1; Phase 2 may grant)
- Admin: Full access

---

## 8. `modules/reports/` — Fleet Analytics (Phase 2+)

**Responsibility**: Generate reports (PM due, idle time, paid vs billed, fleet metrics).

### Key Reports

**PMUpcomingReport.tsx**
- Vehicles due for maintenance (Phase 2+)
- Declined jobs grouped by reason
- Columns: Customer, Vehicle VIN, Decline Reason, Count, Last Declined Date

**TechPaidVsBilledReport.tsx**
- Tech labor hours vs billable hours
- Columns: Tech Name, Paid Hours, Billable Hours, Labor Rate, Cost, Billable Amount, Margin %

**IdleTimeReport.tsx**
- Tech idle time (gaps between jobs)
- Columns: Tech, Date, Job 1, Clock Out, Job 2, Clock In, Idle Minutes, Idle %

**FleetMetricsReport.tsx**
- Vehicle fleet health
- Columns: Customer, Vehicle, Status, Days in Shop, Last Job Date, Total Jobs This Month

**ReportService.ts**
- Aggregate queries from jobs + job_logs
- Group by tech, customer, date range filters
- Apply labor rates, markups, calculate margins

**hooks.ts**
- `useReport(type, filters)` → Fetch report data + filters
- Filters: Date range, tech, customer, status

### Dependencies
- `modules/jobs`
- `modules/tech-logging`
- `modules/employees`
- `modules/customers`
- Phase 2: `modules/pm-tracking`, `modules/parts`

### Authorization
- Tech: No access
- Manager: View own fleet reports
- Admin: View all reports

---

## Module Development Workflow

### Step 1: Define Types
1. Write `types.ts` with domain models
2. Sync with SCHEMA.md (verify fields match DB)
3. Export from types.ts

### Step 2: Write Service Layer
1. Write `*Service.ts` with all CRUD + business logic
2. Test in isolation (pure functions, no React)
3. Error handling: Throw meaningful errors

### Step 3: Create Hooks
1. Write `hooks.ts` with custom React hooks
2. Each hook uses Service + Supabase client
3. Realtime subscriptions where applicable
4. Test with mocked Supabase client

### Step 4: Build UI Components
1. List component: Table with sorting/filtering
2. Form component: Create/edit with validation
3. Detail component: Read-only or modal view
4. Consume hooks, keep JSX lean

### Step 5: Write Tests
1. Unit: Service logic
2. Integration: Hooks + mocked Supabase
3. E2E: Critical workflows (if applicable)

### Step 6: Wire to Routes
1. Add route in `routes/` that uses this module
2. Verify authorization gates work
3. Test full flow side-to-side

---

## Cross-Module Communication

### Via Context (Shared State)
- `AuthContext` — Current user + session
- `TechSessionContext` — Tech's active clock state
- `SettingsContext` — Shop-wide settings (singleton)

### Via Props (Props Drilling)
- Pass IDs between components
- Avoid deep drilling; prefer Context for 3+ levels

### Via Supabase Subscriptions (Realtime)
- Manager opens job list → subscribed to jobs changes
- Tech clocks out → job_logs updated → manager sees real-time update

### Via Route Params
- Navigate to `/jobs/123` → JobDetail loads job via useJob(id)

---

**Reference**: See `.instructions.md` for folder structure diagram and detailed component layout.

Last Updated: April 2026
