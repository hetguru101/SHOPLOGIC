# Getting Started with SHOPLOGIC

This guide walks you through the first 30 minutes of setting up the SHOPLOGIC project.

## Prerequisites

- Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- A Supabase account (free tier: [supabase.com](https://supabase.com))
- Git installed
- A code editor (VS Code recommended)

## Step 1: Clone and Install (5 minutes)

```bash
# Navigate to the project folder
cd /Users/parmtoor/Desktop/SHOPLOGIC

# Install dependencies
npm install

# Verify installation
npm run build  # Should complete without errors
```

**Expected behavior**: No errors, `dist/` folder created with optimized bundle.

## Step 2: Create Supabase Project (10 minutes)

1. Go to [app.supabase.com](https://app.supabase.com) and sign up (free)
2. Click **New Project**
   - Name: "SHOPLOGIC"
   - Region: Choose closest to your location (e.g., us-east-1)
   - Password: Store securely
   - Selected database: PostgreSQL 15
3. Wait for project to initialize (3-5 minutes)
4. Once ready, go to **Project Settings** → **API** and note:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon key (public API key)

## Step 3: Deploy Database Schema (5 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy entire contents of `supabase/migrations/001_init_schema.sql`
4. Paste into SQL Editor
5. Click **Run**

**Expected result**: Green checkmark with message "Success". You should see 7 tables in left sidebar: users, customers, vehicles, jobs, job_logs, settings, markup_matrix.

## Step 4: Configure Environment (5 minutes)

1. Create `.env.local` file in project root:

```bash
# .env.local (KEEP THIS FILE SECRET - NEVER COMMIT)

# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...YOUR_ANON_KEY...

# App Settings
VITE_APP_ENV=local
VITE_SESSION_TIMEOUT=3600000
VITE_LOG_LEVEL=debug
```

Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY` with values from Supabase Settings → API.

**Note**: `.env.local` is in `.gitignore` — won't be committed.

## Step 5: Add Sample Data (5 minutes)

1. Back in Supabase SQL Editor, create new query:

```sql
-- Insert sample techs
INSERT INTO users (user_id, name, role, active, labor_rate_override)
VALUES
  ('tech-001', 'John Diesel', 'tech', true, NULL),
  ('tech-002', 'Maria Smith', 'tech', true, NULL),
  ('tech-003', 'Carlos Lopez', 'tech', true, 65.00);

-- Insert sample customer
INSERT INTO customers (customer_name, phone, address, city, state, zip, labor_rate_override)
VALUES
  ('ABC Trucking', '(555) 123-4567', '123 Fleet St', 'Denver', 'CO', '80201', 50.00);

-- Insert sample vehicle
INSERT INTO vehicles (customer_id, vin, year, make, model, gvwr, unit_number)
VALUES
  ((SELECT id FROM customers WHERE customer_name = 'ABC Trucking' LIMIT 1), '1HSCM21606A123456', 2023, 'Peterbilt', '579', '39000', 'UNIT-001');

-- Insert sample settings
INSERT INTO settings (setting_key, setting_value)
VALUES
  ('work_order_sequence_format', 'WO-{YYYY}-{SEQUENCE}'),
  ('tech_id_sequence_format', 'TECH-{YYYY}-{SEQUENCE}'),
  ('po_number_sequence_format', 'PO-{SEQUENCE}'),
  ('default_labor_rate', '55.00');
```

2. Click **Run**

**Note**: You now have test data to log in. Tech name "John Diesel" should appear in kiosk login.

## Step 6: Start Development Server (5 minutes)

```bash
npm run dev
```

**Expected output**:
```
Local:        http://localhost:5173/
press h to show help
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

You should see:
- **Kiosk Login Screen** with tech names (John Diesel, Maria Smith, Carlos Lopez) in a grid
- Large tap buttons (touch-friendly sizing)
- When you click a tech name → you're logged in
- Redirected to **Tech Dashboard** with open jobs

## Step 7: Test the Flow (5 minutes)

1. Click **John Diesel** on kiosk login
2. You're logged in as tech
3. You should see **Tech Dashboard** with:
   - Empty job list (no jobs assigned yet)
   - "Clock In" buttons when jobs exist
   - "Logout" button in top-right

4. To test more, create a job in manager dashboard:
   - Navigate to `/manager` (or wait for manager UI)
   - Create a job assigned to John Diesel
   - Log out (click your tech name in top-right → Logout)
   - Log back in as John Diesel
   - See your assigned job in the list

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

```bash
npm install  # Re-run installation
```

### Blank page at localhost:5173

1. Check browser console: `F12` → **Console** tab
2. Look for red errors about missing `VITE_SUPABASE_URL`
3. Verify `.env.local` exists with correct values
4. Restart dev server: `Ctrl+C` then `npm run dev`

### "Database connection failed" in browser console

1. Verify Supabase project is not paused (check project settings)
2. Verify Supabase URL & Anon Key are correctly copied
3. Check `.env.local` for typos
4. Clear browser cache: `Ctrl+Shift+Delete`

### Cannot log in (tech name doesn't appear)

1. Verify sample data was inserted (check Supabase **Table Editor** for "users" table)
2. Check that `active` column is `true` for techs
3. If you see "tech-001" in ID but "John Diesel" not showing, the realtime subscription may be slow — refresh page

## Next Steps

After verifying the kiosk login works:

1. **Read `docs/MODULES.md`** — understand module structure and responsibilities
2. **Read `docs/SCHEMA.md`** — understand data model and relationships
3. **Start Customers Module** — Follow Week 1 plan in `.instructions.md`

## Useful Commands

```bash
npm run dev          # Start dev server with HMR
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run test         # Run unit tests (Vitest)
npm run test:ui      # Run tests with browser UI
npm run lint         # Check code style (ESLint)
npm run type-check   # Type-check TypeScript (no-emit)
```

## Quick Reference

| Task | Where |
|------|-------|
| Admin Settings | `/admin/settings` |
| Employee Management | `/admin/employees` |
| View Customers | `/customers` |
| View Vehicles | `/vehicles` |
| View Jobs | `/jobs` |
| Tech Clock In/Out | `/tech-dashboard` (auto-redirected) |
| Kiosk Login | `/` (auto-redirected if no session) |

## Environment Variables

See `.env.example` for full list. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | (required) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | (required) | Supabase public API key |
| `VITE_SESSION_TIMEOUT` | `3600000` | Auto-logout after 60 min of inactivity (ms) |
| `VITE_LOG_LEVEL` | `info` | Console log verbosity: `debug`, `info`, `warn`, `error` |

## Need Help?

- **General React?** See [react.dev](https://react.dev)
- **Supabase queries?** See [supabase.com/docs](https://supabase.com/docs)
- **Tailwind CSS?** See [tailwindcss.com](https://tailwindcss.com)
- **Project specifics?** See [`.instructions.md`](.instructions.md) § Architecture section

---

**Estimated total time**: 30-45 minutes. You now have a working kiosk login ready to test!

Next: Read `docs/MODULES.md` and start building the Customers module.
