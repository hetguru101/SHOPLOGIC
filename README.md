# ShopLogic ⚙️

**Class 8 Diesel Truck & Trailer Repair Shop Management Software**

A modern, mobile-first web application for managing diesel repair shop operations, technician time tracking, fleet maintenance, and business intelligence.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier available)
- Git

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project (or use free tier)
3. Copy **Project URL** and **Anon Key** from Settings → API

### Step 2: Setup Database
1. Open Supabase Dashboard → SQL Editor
2. Copy entire content from `supabase/migrations/001_init_schema.sql`
3. Paste into SQL Editor and run
4. Tables created automatically ✓

### Step 3: Setup Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📋 Project Structure

```
shoplogic/
├── src/
│   ├── core/              # Shared infrastructure
│   │   ├── supabase/      # Supabase client & config
│   │   ├── context/       # React Context (Auth, Session)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── types/         # TypeScript models & types
│   │   └── utils/         # Utility functions
│   │
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Kiosk login
│   │   ├── customers/     # Customer management
│   │   ├── vehicles/      # Vehicle inventory
│   │   ├── jobs/          # Job creation & management
│   │   ├── tech-logging/  # Clock in/out
│   │   ├── employees/     # Employee roster
│   │   ├── settings/      # Admin settings
│   │   └── reports/       # Analytics (Phase 2+)
│   │
│   ├── shared/            # Reusable components
│   ├── App.tsx            # Root router
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles (Tailwind)
│
├── supabase/
│   ├── migrations/        # Database SQL files
│   └── functions/         # Edge Functions (serverless)
│
├── docs/
│   ├── .instructions.md   # Developer guide
│   ├── SCHEMA.md          # Database design
│   ├── MODULES.md         # Module documentation
│   └── ARCHITECTURE.md    # Tech stack & decisions
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .env.example
└── netlify.toml           # Netlify deployment config
```

---

## 🎯 Current Features (MVP Phase 1)

### Kiosk Login Screen
- ✅ Display all active techs
- ✅ Tap tech name → optional PIN entry
- ✅ Auto-logout after 5 min idle

### Tech Dashboard
- ✅ View open work orders
- ✅ Clock in/out with running timer
- ✅ Realtime job updates (manager declines job → tech sees instantly)

### Coming This Week
- [ ] Customer & vehicle management
- [ ] Job creation & auto-numbering
- [ ] Employee roster with labor rates
- [ ] Settings page (sequences, markups)
- [ ] Manager dashboard

---

## 🛠️ Development Workflow

### Creating a New Feature

1. **Define types** in `modules/[feature]/types.ts`
2. **Write Service** in `modules/[feature]/[Feature]Service.ts`
3. **Create hooks** in `modules/[feature]/hooks.ts`
4. **Build UI** in `modules/[feature]/[Feature].tsx`
5. **Tests** in `tests/`

See [MODULES.md](./docs/MODULES.md) for detailed examples.

### Running Tests
```bash
npm test                    # Run unit tests
npm run test:ui           # Open test UI
npm run type-check        # TypeScript check
npm run lint              # ESLint
```

### Building for Production
```bash
npm run build             # Build optimized bundle
npm run preview           # Test production build locally
```

---

## 🌐 Deployment

### Deploy to Netlify

1. Push code to GitHub
2. Connect repo to Netlify
3. Add environment variables in Netlify Dashboard:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_APP_ENV=production
   VITE_LOG_LEVEL=error
   ```
4. Trigger deploy → Live! 🚀

### Deploy to Supabase (Backend)

Edge Functions auto-deploy via Supabase CLI:
```bash
supabase functions deploy vin-decoder --remote
supabase functions deploy generate-sequence --remote
```

---

## 📖 Documentation

- **[`.instructions.md`](.instructions.md)** — Full developer guide, patterns, standards
- **[`docs/SCHEMA.md`](docs/SCHEMA.md)** — Database design, tables, relationships
- **[`docs/MODULES.md`](docs/MODULES.md)** — Feature module architecture
- **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — Tech stack, decisions, patterns

---

## 🧪 Sample Data

Uncomment the sample data in `supabase/migrations/001_init_schema.sql` to populate:
- 1 admin, 3 techs, 1 manager (users)
- 3 customers
- 3 vehicles (with real VINs for testing decoder)
- 3 sample jobs

Then run the migration again.

---

## 🔑 Key Technologies

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| State | Context + Supabase Realtime |
| Backend | Supabase (PostgreSQL + Auth) |
| Serverless | Supabase Edge Functions (Deno) |
| Hosting | Netlify |

---

## 🚨 Troubleshooting

### "Supabase connection failed"
- Check `.env.local` has correct URL and key
- Verify Supabase project is not paused
- Test: `curl https://[your-project].supabase.co/functions/v1/health`

### "Tables not found"
- Run SQL migration in Supabase Dashboard
- Check all 7 tables exist: users, customers, vehicles, jobs, job_logs, settings, markup_matrix

### "RLS blocking queries"
- Ensure `anon` key is used (not service role key)
- RLS policies auto-validate access
- Check Supabase logs for auth errors

### "PIN not working on kiosk"
- PIN stored as plain text in `users.pin` (Phase 1 MVP)
- Compare client-side: `pin !== tech.pin` → show error
- Set `VITE_KIOSK_PIN_REQUIRED=false` to make PIN optional

---

## 📞 Support & Next Steps

1. **Read the docs** — Start with `.instructions.md`
2. **Review the schema** — Understand `docs/SCHEMA.md`
3. **Explore module structure** — Check `docs/MODULES.md`
4. **Build incrementally** — Follow "Creating a New Feature" above
5. **Test early & often** — Write tests alongside code

---

## 🎓 Learning Path

**Week 1**: Auth module complete (kiosk login working)  
**Weeks 2-3**: Core modules (customers, vehicles, jobs)  
**Weeks 4-5**: Tech logging & employee management  
**Weeks 6-8**: Settings, MVP polish, staging deployment  

See `.instructions.md` § Development Phases for detailed sprint plan.

---

## 📄 License

Proprietary - Class 8 Diesel Shop License 2026

---

**Happy coding!** 🔧

For issues, questions, or contributions, see the team in #shoplogic on Slack.

Last Updated: April 2026
