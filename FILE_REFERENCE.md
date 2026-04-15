# SHOPLOGIC Project File Reference

Quick lookup guide for all major files and their purposes.

## Project Configuration & Setup

| File | Purpose |
|------|---------|
| [`package.json`](package.json) | Dependencies, scripts, project metadata |
| [`tsconfig.json`](tsconfig.json) | TypeScript compiler settings, path aliases |
| [`vite.config.ts`](vite.config.ts) | Vite build tool configuration |
| [`vitest.config.ts`](vitest.config.ts) | Unit test framework configuration |
| [`tailwind.config.js`](tailwind.config.js) | Tailwind CSS theme customization |
| [`postcss.config.js`](postcss.config.js) | PostCSS plugins for Tailwind |
| [`.eslintrc.json`](.eslintrc.json) | Code linting rules |
| [`.gitignore`](.gitignore) | Git ignore patterns |
| [`.env.example`](.env.example) | Environment variables template |

## Documentation

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | Project overview, quick start, troubleshooting |
| [`GETTING_STARTED.md`](GETTING_STARTED.md) | First 30 minutes setup guide ⭐ START HERE |
| [`DEV_SETUP.md`](DEV_SETUP.md) | Development workflow, debugging, deployment |
| [`.instructions.md`](.instructions.md) | Complete system prompt for all developers |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Technical architecture, design patterns, data flow |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | Database schema, tables, relationships, sample queries |
| [`docs/MODULES.md`](docs/MODULES.md) | Module structure, responsibilities, file organization |

## Entry Points & App Structure

| File | Purpose |
|------|---------|
| [`index.html`](index.html) | HTML entry point, loads React app |
| [`src/main.tsx`](src/main.tsx) | React entry, mounts App with AuthProvider |
| [`src/App.tsx`](src/App.tsx) | Root router, role-based redirects |
| [`src/index.css`](src/index.css) | Global styles, Tailwind directives, component classes |

## Core Infrastructure

### Supabase Client & Types

| File | Purpose |
|------|---------|
| [`src/core/supabase/client.ts`](src/core/supabase/client.ts) | Supabase client initialization, TypeScript database types |
| [`src/core/types/database.ts`](src/core/types/database.ts) | Auto-generated Supabase database types |
| [`src/core/types/models.ts`](src/core/types/models.ts) | Domain models (User, Customer, Job, etc.) |

### Authentication

| File | Purpose |
|------|---------|
| [`src/core/context/AuthContext.tsx`](src/core/context/AuthContext.tsx) | Auth state provider, login/logout logic |
| [`src/core/hooks/useAuth.ts`](src/core/hooks/useAuth.ts) | Custom hook to access auth context |

### Utilities

| File | Purpose |
|------|---------|
| [`src/core/utils/formatting.ts`](src/core/utils/formatting.ts) | Currency, date, phone, VIN formatters |
| [`src/core/utils/sequences.ts`](src/core/utils/sequences.ts) | Sequence number generation, template formatting |

## Feature Modules

### Authentication Module

| File | Purpose |
|------|---------|
| [`src/modules/auth/KioskLoginScreen.tsx`](src/modules/auth/KioskLoginScreen.tsx) | Shared device login UI, tech selection + PIN entry |

### Tech Logging Module

| File | Purpose |
|------|---------|
| [`src/modules/tech-logging/TechDashboard.tsx`](src/modules/tech-logging/TechDashboard.tsx) | Tech's main screen: open jobs, clock in/out, timer |

### Customers Module (Stub)

| File | Purpose |
|------|---------|
| [`src/modules/customers/CustomerService.ts`](src/modules/customers/CustomerService.ts) | Customer CRUD operations, labor rate logic |
| [`src/modules/customers/hooks.ts`](src/modules/customers/hooks.ts) | React hooks for fetching/creating customers |
| *CustomerList.tsx* | ⏳ TODO: Customer list table UI |
| *CustomerForm.tsx* | ⏳ TODO: Create/edit customer modal |

### Vehicles Module (Stub)

| File | Purpose |
|------|---------|
| [`src/modules/vehicles/VehicleService.ts`](src/modules/vehicles/VehicleService.ts) | Vehicle CRUD, VIN decoder integration |
| *hooks.ts* | ⏳ TODO: React hooks for vehicles |
| *VehicleList.tsx* | ⏳ TODO: Vehicle list table UI |
| *VehicleForm.tsx* | ⏳ TODO: Create/edit vehicle modal with VIN decoder |

### Jobs Module (Stub)

| File | Purpose |
|------|---------|
| [`src/modules/jobs/JobService.ts`](src/modules/jobs/JobService.ts) | Job CRUD, decline logic, tech assignment |
| *hooks.ts* | ⏳ TODO: React hooks for jobs |
| *JobList.tsx* | ⏳ TODO: Job list spreadsheet table |
| *JobForm.tsx* | ⏳ TODO: Create/edit job modal |

### Employees Module (Stub)

| File | Purpose |
|------|---------|
| [`src/modules/employees/EmployeeService.ts`](src/modules/employees/EmployeeService.ts) | Tech management, time clock audit history |
| *EmployeeList.tsx* | ⏳ TODO: Employee list with time clock summaries |
| *EmployeeForm.tsx* | ⏳ TODO: Add/edit tech modal |

### Settings Module (Stub)

| File | Purpose |
|------|---------|
| [`src/modules/settings/SettingsService.ts`](src/modules/settings/SettingsService.ts) | Admin settings: sequences, labor rates, markups |
| *SettingsDashboard.tsx* | ⏳ TODO: Settings UI with tabs for each setting type |
| *SequenceSettings.tsx* | ⏳ TODO: Sequence format editor |
| *MarkupMatrixSettings.tsx* | ⏳ TODO: Parts/sublet markup config |

### Reports Module (Phase 2+)

| File | Purpose |
|------|---------|
| *ReportsDashboard.tsx* | ⏳ TODO: Report selector and viewer |
| *PMDueReport.tsx* | ⏳ TODO: Preventive maintenance due |
| *IdleTimeReport.tsx* | ⏳ TODO: Tech idle time analysis |
| *PaidVsBilledReport.tsx* | ⏳ TODO: Labor cost vs billed comparison |

## Testing

| File | Purpose |
|------|---------|
| [`tests/setup.ts`](tests/setup.ts) | Vitest configuration, mocks, global setup |
| [`tests/utils/formatting.test.ts`](tests/utils/formatting.test.ts) | Example unit tests for formatting utilities |

## Deployment

| File | Purpose |
|------|---------|
| [`netlify.toml`](netlify.toml) | Netlify deployment config, build rules, headers |
| [`supabase/migrations/001_init_schema.sql`](supabase/migrations/001_init_schema.sql) | Database schema: tables, triggers, sample data |

## Directory Structure Summary

```
SHOPLOGIC/
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   └── SCHEMA.md
├── src/
│   ├── core/                    # Shared infrastructure
│   │   ├── context/             # React Context (auth)
│   │   ├── hooks/               # Custom hooks
│   │   ├── supabase/            # Database client & types
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/               # Shared utilities
│   ├── modules/                 # Feature modules
│   │   ├── auth/                # Kiosk login
│   │   ├── customers/           # Customer management
│   │   ├── employees/           # Tech management
│   │   ├── jobs/                # Work order management
│   │   ├── reports/             # Analytics (Phase 2+)
│   │   ├── settings/            # Admin settings
│   │   ├── tech-logging/        # Tech clock in/out
│   │   └── vehicles/            # Vehicle management
│   ├── shared/                  # Shared components (future)
│   ├── App.tsx                  # Root router
│   ├── index.css                # Global styles
│   └── main.tsx                 # React entry
├── tests/                       # Unit & integration tests
├── supabase/
│   └── migrations/              # SQL migrations
├── .instructions.md             # System prompt
├── .env.example                 # Environment template
├── GETTING_STARTED.md           # Setup guide
├── DEV_SETUP.md                 # Development workflow
├── netlify.toml                 # Deployment config
├── tailwind.config.js           # CSS theme
├── tsconfig.json                # TypeScript config
└── vite.config.ts               # Build config
```

## Common File Edits During Development

### Adding a New Module

1. Create folder: `src/modules/[module-name]/`
2. Create `[Module]Service.ts` — Supabase operations
3. Create `hooks.ts` — React state management
4. Create `[Module]List.tsx` — List/table component
5. Create `[Module]Form.tsx` — Create/edit component
6. Add routes to `src/App.tsx`

**Reference**: [`docs/MODULES.md`](docs/MODULES.md) for detailed file structure.

### Adding a Utility Function

1. Check if it belongs in existing file (`src/core/utils/formatting.ts`, etc.)
2. If new category, create `src/core/utils/[category].ts`
3. Export function with JSDoc comment
4. Add unit test in `tests/utils/[category].test.ts`

### Updating Database Schema

1. Create new SQL migration in `supabase/migrations/002_description.sql`
2. Update [`docs/SCHEMA.md`](docs/SCHEMA.md)
3. Update database types in `src/core/types/database.ts` (if using Supabase types)
4. Deploy migration to Supabase SQL Editor

### Adding New Settings / Configuration

1. Add `setting_key` + `setting_value` to `settings` table
2. Create accessor method in `src/modules/settings/SettingsService.ts`
3. Create hook in `src/modules/settings/hooks.ts` (if needed)
4. Document in `.env.example` if it's environment-specific

## Quick Navigation

- **Need to understand the system?** → [`.instructions.md`](.instructions.md)
- **Setting up for first time?** → [`GETTING_STARTED.md`](GETTING_STARTED.md)
- **How does the code work?** → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Database question?** → [`docs/SCHEMA.md`](docs/SCHEMA.md)
- **Adding a new feature?** → [`docs/MODULES.md`](docs/MODULES.md)
- **Development tips?** → [`DEV_SETUP.md`](DEV_SETUP.md)
- **Troubleshooting?** → [`README.md`](README.md#troubleshooting) or [`DEV_SETUP.md`](DEV_SETUP.md)

---

**Last Updated**: 2025-01-20  
**Total Files**: 40+ (including tests and configuration)  
**Lines of Code**: ~8,000 (excluding docs)
