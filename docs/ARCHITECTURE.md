# ShopLogic Architecture & Design Decisions

**Tech Stack & Pattern Rationale**

---

## Overview

ShopLogic is built on a lightweight, scalable stack optimized for shop floor simplicity (kiosk login, job selection, clock tracking) and manager visibility (realtime job updates, reports).

### Key Principles
1. **Developer velocity**: Minimal boilerplate, clear patterns
2. **Shop floor UX**: Fast, offline-tolerant, large touch targets
3. **Realtime clarity**: Managers see tech status instantly
4. **Scalable schema**: JSONB settings, RLS policies, future-proof

---

## Frontend Stack

### React 18 + Vite
**Decision**: Use React (not Vue/Svelte) + Vite (not Create React App)

**Rationale**:
- React ecosystem is largest; most developers familiar
- Vite enables fast HMR (hot module reload) during dev
- ESM-based build is future-proof
- Easy to scale from MVP to later phases

**Patterns**:
- Functional components + hooks
- Custom hooks for reusable logic
- Context for global state (auth, settings)
- Lazy-loaded routes via React.lazy()

### State Management: Context + Hooks (NOT Redux)
**Decision**: React Context + local useState + Supabase subscriptions (NOT Redux)

**Rationale**:
- Redux overkill for MVP (single source of truth is Supabase, not Redux store)
- Context sufficient for auth state (user, session) and tech session (clocked-in job)
- Supabase realtime subscriptions replace Redux state updates
- Reduces bundle size, easier onboarding

**Pattern**:
```typescript
// AuthContext.tsx
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Init Supabase auth on mount
    initAuth().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Styling: Tailwind CSS (NOT styled-components)
**Decision**: Tailwind CSS for all styling

**Rationale**:
- Rapid development; no CSS file context-switching
- Utility classes scale well
- Dark mode support via Tailwind config (Phase 2)
- Smaller bundle than CSS-in-JS solutions
- Consistent design tokens (colors, spacing)

**Pattern**:
```typescript
// No CSS files; all styling via Tailwind classes
export function Button({ children, variant = 'primary' }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white px-4 py-2 rounded',
    secondary: 'bg-gray-200 text-gray-800 px-4 py-2 rounded',
    danger: 'bg-red-600 text-white px-4 py-2 rounded',
  };
  return <button className={variants[variant]}>{children}</button>;
}
```

### Forms: React Hook Form + Zod
**Decision**: React Hook Form for form state + Zod for validation

**Rationale**:
- Minimal re-renders (only changed field re-renders)
- Uncontrolled components until submit (better perf)
- Zod provides type-safe validation (TypeScript integration)
- Small bundle footprint

**Pattern**:
```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
  labor_rate: z.number().min(0, 'Rate must be >= 0'),
});

type FormInput = z.infer<typeof schema>;

export function CustomerForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormInput) => {
    await createCustomer(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <p>{errors.name.message}</p>}
      <button type="submit">Save</button>
    </form>
  );
}
```

### Routing: TanStack Router
**Decision**: TanStack Router (formerly React Location) for routing

**Rationale**:
- Lightweight alternative to React Router
- Better TypeScript support (route types inferred)
- Lazy-load routes natively
- Smaller bundle than React Router

**Pattern**:
```typescript
// routes.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/jobs')({
  component: JobsList,
  beforeLoad: async ({ context }) => {
    // Auth gate
    if (!context.auth.user) throw redirect({ to: '/kiosk' });
  },
});

export const Route = createFileRoute('/jobs/$id')({
  component: JobDetail,
  loader: async ({ params }) => {
    // Prefetch data before component renders
    return getJob(params.id);
  },
});
```

---

## Backend Stack

### Supabase (PostgreSQL + Auth + Realtime)
**Decision**: Use Supabase as complete backend (DB + Auth + Realtime)

**Rationale**:
- **Auth**: Built-in JWT; no custom auth service needed
- **Database**: PostgreSQL (robust, mature, JSONB support)
- **Realtime**: Subscription API (manager sees tech updates instantly)
- **RLS**: Row-Level Security enforces authorization at DB level
- **Managed**: No DevOps (Supabase handles backups, patching)
- **Cost-effective**: Free tier covers MVP; scales linearly

**Constraints**:
- Vendor lock-in (but migration feasible: export to PostgreSQL)
- Rate limits (Phase 1 unlikely to hit)
- Realtime subscriptions limited (fine for small repair shops)

### PostgreSQL Schema Design
**Decision**: JSONB for flexible shop config (settings table)

**Rationale**:
- Work order sequence format can change without migration
- Labor rate defaults, markup rules all in one row
- Future extensibility: add new config fields without schema changes

**Pattern**:
```sql
-- settings table: Single row with all shop config as JSONB
CREATE TABLE settings (
  setting_id UUID PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{...}'::jsonb,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Query example:
SELECT config->>'default_labor_rate' FROM settings;
SELECT config->'work_order_sequence'->>'format' FROM settings;
```

### Supabase Edge Functions
**Decision**: Use Edge Functions for server-side logic (VIN decoder, sequence generation, report calculations)

**Rationale**:
- No separate backend server to deploy or manage
- Serverless; scales automatically
- Deno runtime (TypeScript native)
- Instant deployment: `supabase functions deploy`

**Pattern**:
```typescript
// supabase/functions/vin-decoder.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { vin } = await req.json();

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
  );
  const data = await response.json();

  // Parse NHTSA response, return make/model/year
  const result = {
    make: data.Results[9]?.Value,
    model: data.Results[10]?.Value,
    year: data.Results[11]?.Value,
  };

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Row-Level Security (RLS)
**Decision**: Enforce authorization at DB level (not application layer)

**Rationale**:
- Defense-in-depth: If client auth is bypassed, DB still enforces rules
- Single source of truth for permissions
- Scalable: Add new users/roles without code changes

**Pattern**:
```sql
-- RLS policy: Techs see only their own job_logs
CREATE POLICY techs_see_own_logs ON job_logs
  FOR SELECT USING (
    auth.uid()::text = tech_id::text 
    OR (auth.jwt()->>'role' IN ('manager', 'admin'))
  );

-- Managers can update jobs (assign, decline)
CREATE POLICY managers_update_jobs ON jobs
  FOR UPDATE USING (auth.jwt()->>'role' IN ('manager', 'admin'));
```

---

## Data Flow Patterns

### 1. Realtime Job Updates
**Scenario**: Manager declines Job A; Tech sees it disappear from their list instantly.

**Flow**:
```
1. Manager clicks "Decline" button on Job A
   → JobService.declineJob(jobA) calls supabase.from('jobs').update()
   
2. Supabase broadcasts job_logs change event
   → All subscribed clients receive update
   
3. Tech's useJobsByTech hook detects change
   → Filters out is_declined=true jobs
   → Re-renders list (Job A disappears)
```

**Implementation**:
```typescript
// Tech's dashboard
export function TechDashboard() {
  const { jobs, refetch } = useJobsByTech(techId);

  useEffect(() => {
    const subscription = supabase
      .from('jobs')
      .on('*', (payload) => {
        // Realtime update
        if (payload.new.is_declined) {
          // Remove from list
          refetch();
        }
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [techId]);

  return (
    <JobList jobs={jobs.filter(j => !j.is_declined)} />
  );
}
```

### 2. Sequence Auto-Increment
**Scenario**: Admin clicks "Save" on settings; next job number is WO-2025-1001.

**Flow**:
```
1. Admin submits SequenceSettings form
   → updateSequenceSettings({ format: "WO-{YYYY}-{SEQUENCE}", next_number: 1001 })
   
2. Edge Function: generate-sequence.ts called
   → Increments next_number in settings.config
   → Returns formatted string: "WO-2025-1001"
   
3. Applied in JobService.createJob()
   → Calls Edge Function to get next number
   → Uses returned number in INSERT
```

**Implementation**:
```typescript
// Edge Function: supabase/functions/generate-sequence.ts
export async function generateSequence(type: 'work_order' | 'tech_id' | 'po') {
  const { config } = await supabase
    .from('settings')
    .select('config')
    .single();

  const seqConfig = config[`${type}_sequence`];
  const { format, next_number } = seqConfig;
  const year = new Date().getFullYear();

  // Format string: "WO-{YYYY}-{SEQUENCE}" → "WO-2025-1001"
  const result = format
    .replace('{YYYY}', year)
    .replace('{SEQUENCE}', String(next_number).padStart(4, '0'));

  // Increment for next call
  config[`${type}_sequence`].next_number += 1;
  await supabase.from('settings').update({ config });

  return result;
}

// Service layer: Call Edge Function
export async function createJob(input: JobFormInput) {
  const job_number = await supabase.functions.invoke('generate-sequence', {
    body: { type: 'work_order' },
  });

  const { data } = await supabase
    .from('jobs')
    .insert([{ ...input, job_number }])
    .select()
    .single();

  return data;
}
```

### 3. Labor Rate Resolution
**Scenario**: Job created for customer; what labor rate applies?

**Cascade**: Customer override > Tech default > Shop default

**Flow**:
```
1. Tech clocks out of Job A
   → JobService.clockOut(logId)
   
2. Fetch applicable labor rate:
   a) Check customer.labor_rate_override
      → If set, use it
   b) Else, check tech.labor_rate
      → If set, use it
   c) Else, use settings.config.default_labor_rate
   
3. Store in job_logs (or compute on demand for reports)
   → Enables "Tech Paid vs Billed" report
```

**Implementation**:
```typescript
export async function getApplicableLaborRate(jobId: string): Promise<number> {
  // Fetch job → vehicle → customer
  const { data: job } = await supabase
    .from('jobs')
    .select('vehicle_id, vehicles(customer_id, customers(labor_rate_override))')
    .eq('job_id', jobId)
    .single();

  if (job.vehicles?.customers?.labor_rate_override) {
    return job.vehicles.customers.labor_rate_override;
  }

  // Fetch tech default
  const { data: tech } = await supabase
    .from('users')
    .select('labor_rate')
    .eq('user_id', job.tech_id)
    .single();

  if (tech.labor_rate) {
    return tech.labor_rate;
  }

  // Fetch shop default
  const { data: settings } = await supabase
    .from('settings')
    .select('config')
    .single();

  return settings.config.default_labor_rate || 75.0;
}
```

### 4. Idle Time Calculation
**Scenario**: Report tech idle time (gaps between jobs).

**Flow**:
```
1. Tech clocks in to Job B
   → Find prior job's clock_out
   → Calculate gap = (Job B clock_in) - (Job A clock_out)
   → Store in job_logs.idle_minutes
   
2. Report aggregates idle_minutes
   → Sum per tech per day
   → Calculate as % of shift
   → Identify efficiency bottlenecks
```

**Implementation**:
```typescript
export async function clockIn(jobId: string, techId: string): Promise<JobLog> {
  const clockInTime = new Date();

  // Find prior job
  const { data: priorLog } = await supabase
    .from('job_logs')
    .select('clock_out')
    .eq('tech_id', techId)
    .order('clock_out', { ascending: false })
    .limit(1)
    .single();

  let idleMinutes = 0;
  if (priorLog?.clock_out) {
    idleMinutes = Math.floor(
      (clockInTime.getTime() - new Date(priorLog.clock_out).getTime()) / (1000 * 60)
    );
  }

  // Create job_log with idle_minutes
  const { data: log } = await supabase
    .from('job_logs')
    .insert([{
      job_id: jobId,
      tech_id: techId,
      clock_in: clockInTime.toISOString(),
      idle_minutes: idleMinutes,
    }])
    .select()
    .single();

  return log;
}
```

---

## Performance Patterns

### 1. Lazy-Load Routes
**Decision**: Use React.lazy() + Suspense to split bundle

**Rationale**:
- Kiosk login screen loads instantly (small bundle)
- Other modules lazy-load on demand
- Faster initial load time

**Pattern**:
```typescript
// App.tsx
const KioskLoginPage = lazy(() => import('./routes/KioskLogin'));
const TechDashboard = lazy(() => import('./routes/TechDashboard'));
const JobManagement = lazy(() => import('./routes/JobManagement'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Router>
        <Routes>
          <Route path="/kiosk" component={KioskLoginPage} />
          <Route path="/tech-dashboard" component={TechDashboard} />
          <Route path="/jobs" component={JobManagement} />
        </Routes>
      </Router>
    </Suspense>
  );
}
```

### 2. Memoization
**Decision**: Use useMemo + useCallback to prevent re-renders in expensive components

**Rationale**:
- Job list can have 100+ rows; optimizing render matters
- Callbacks passed to child components should be stable

**Pattern**:
```typescript
export function JobList({ jobs }: { jobs: Job[] }) {
  // Memoize filtered list if filter changed
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'open');
  }, [jobs]);

  // Memoize callback passed to child
  const handleEdit = useCallback((jobId: string) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  return (
    <table>
      {filteredJobs.map(job => (
        <JobRow key={job.job_id} job={job} onEdit={handleEdit} />
      ))}
    </table>
  );
}
```

### 3. Pagination
**Decision**: Server-side pagination for large lists (100+ rows)

**Rationale**:
- Fetch only page size (e.g., 50 rows) from DB
- Faster query, smaller payload
- Smoother UX for long lists

**Pattern**:
```typescript
export function useJobs(pageSize = 50) {
  const [page, setPage] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const start = page * pageSize;
    supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .range(start, start + pageSize - 1)
      .then(({ data, count }) => {
        setJobs(data || []);
        setHasMore((data?.length || 0) < (count || 0));
      });
  }, [page]);

  return { jobs, page, setPage, hasMore };
}
```

---

## Error Handling

### Pattern: Service → Error Throw, Component → Catch & Display
**Decision**: Services throw errors; components catch + display

**Rationale**:
- Separation of concerns (service logic doesn't know UI)
- Reusable error handling across components
- Testable error paths

**Implementation**:
```typescript
// Service: Throw error
export async function createJob(input: JobFormInput) {
  if (!input.vehicle_id) {
    throw new Error('Vehicle required');
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert([input])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data;
}

// Component: Catch & display
export function JobForm() {
  const { create, error, loading } = useCreateJob();
  const [message, setMessage] = useState('');

  const handleSubmit = async (input: JobFormInput) => {
    try {
      await create(input);
      setMessage('Job created!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <>
      {message && <p className={error ? 'text-red-500' : 'text-green-500'}>{message}</p>}
      <form onSubmit={...}>...</form>
    </>
  );
}
```

---

## Security Patterns

### 1. RLS at DB Level
**Decision**: Enforce all authorization at Supabase RLS, not client-side

**Rationale**:
- If client auth is compromised, DB still blocks unauthorized access
- Single source of truth

### 2. Secrets Management
**Decision**: Supabase API key (public, anon) + Edge Functions (private keys via Supabase secrets)

**Rationale**:
- Public key safe to expose in frontend (has RLS restrictions)
- Private operations (VIN decoder API key, if needed) stored in Edge Function via `.env.local`

**Pattern**:
```typescript
// Client: Use public anon key in frontend
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // OK to expose
);

// Edge Function: Use service role key (private)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  // Keep secret
);
```

### 3. Input Validation (Client + Server)
**Decision**: Validate on client (UX) + server (security)

**Rationale**:
- Client validation: Fast feedback
- Server validation: Prevents malicious input

**Pattern**:
```typescript
// Client: React Hook Form + Zod
const schema = z.object({
  labor_rate: z.number().min(0).max(10000),
});

// Server: RLS policy
CREATE POLICY validate_labor_rate ON users
  FOR UPDATE USING (
    (CAST(NEW.labor_rate AS NUMERIC) >= 0 AND CAST(NEW.labor_rate AS NUMERIC) <= 10000)
  );
```

---

## Deployment Pipeline

### Local Development
```bash
# 1. Start Supabase local
supabase start

# 2. Run migrations
supabase db reset

# 3. Start frontend dev server
npm run dev

# 4. Accessible at http://localhost:5173
```

### Staging (Pre-Release)
```bash
# 1. Create Supabase project (free tier)
# 2. Run migrations
supabase db push --remote

# 3. Deploy to Netlify
npm run build
netlify deploy --prod

# 4. Set environment variables in Netlify dashboard
```

### Production
- Same as staging, but use paid Supabase org
- Enable RLS on all tables
- Set up automated backups in Supabase dashboard
- Monitor Edge Function logs

---

## Monitoring & Observability (Phase 2+)

### Error Tracking
- Integrate Sentry or LogRocket
- Capture JavaScript errors + network issues

### Performance Monitoring
- Web Vitals: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS)
- Monitor slow queries via Supabase logs

### Usage Metrics
- Track active techs, jobs per day, average job duration
- Feed into business intelligence dashboards

---

## Future Scalability

### Phase 2+ Considerations
1. **Report caching**: Pre-compute reports (vs. real-time queries)
2. **Database indexing**: Add indexes as queries slow down
3. **API rate limiting**: Rate-limit Edge Functions if abuse detected
4. **Realtime channels**: Instead of subscriptions, use presence channels (see who's online)
5. **Mobile app**: React Native app shares core business logic (services) with web
6. **Offline-first**: Service workers + local DB (SQLite) for field techs
7. **Multi-tenant**: If selling to multiple shops, add `shop_id` to all tables

---

**Summary**: ShopLogic prioritizes **simplicity on the shop floor** (fast kiosk, quick job selection) backed by **robust backend** (Supabase RLS, realtime updates, JSONB settings) and **modular frontend** (custom hooks, service layer, Tailwind). Trade-offs favor **developer velocity** over enterprise patterns (no Redux, no GraphQL, no complex ORM).

Last Updated: April 2026
