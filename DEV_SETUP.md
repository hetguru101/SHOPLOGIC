# Development Setup & Troubleshooting

## Local Development

### Prerequisites

- Node.js 18+
- macOS, Linux, or Windows with Git
- VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin (if adding Vue components later)

### First-Time Setup

```bash
cd /Users/parmtoor/Desktop/SHOPLOGIC

# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Running the Development Server

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

**Hot Module Reloading (HMR)**: Changes to code automatically reload the page — no manual refresh needed.

## Common Development Tasks

### TypeScript Type-Checking

```bash
npm run type-check
```

This checks for type errors without building. Useful before committing.

### Linting & Format Checking

```bash
npm run lint  # Check for style issues (read-only)
```

No auto-fix in this project — all errors must be manually resolved. This enforces code quality.

### Running Tests

```bash
npm run test       # Run all tests once
npm run test:ui    # Run tests with interactive browser UI (recommended for development)
npm run test:watch # Watch mode (rerun on file changes)
```

**Note**: Tests currently include basic formatting utilities. As modules are added, expand test coverage.

### Building for Production

```bash
npm run build  # Creates optimized dist/ folder
npm run preview  # Serve dist/ locally to test production build
```

## Debugging

### Browser DevTools

1. Open [http://localhost:5173](http://localhost:5173)
2. Press `F12` to open developer console
3. **Console tab**: Check for JS errors (red) and warnings (yellow)
4. **Network tab**: Monitor API calls to Supabase
5. **Application tab**: Inspect localStorage (including `auth_session` and `user_cache`)

### Common Issues

#### "VITE_SUPABASE_URL is not set"

1. Verify `.env.local` exists in project root
2. Check that it contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart dev server: `Ctrl+C` then `npm run dev`

#### "Cannot find module '@/core'"

Path aliases are defined in `tsconfig.json` and `vite.config.ts`. Make sure you're:
1. Using the `@/` prefix (not relative paths like `../../`)
2. Files are in correct directories (`src/core/`, `src/modules/`)
3. Rebuild TypeScript cache: `npm run type-check`

#### Supabase Connection Refused

1. Check Supabase project is not paused (supabase.com → Project Settings)
2. Verify URL is correct (no extra slashes or typos)
3. Open browser console → Network tab → check request to supabase URL
4. If 403 Forbidden, verify anon key is correct

#### Realtime Subscriptions Not Updating

1. Check browser console for WebSocket errors (Network tab)
2. Verify Supabase project has Realtime enabled (Settings → Replication)
3. Ensure table has realtime enabled: SQL Editor → `GRANT ... ON ... TO ... WITH GRANT OPTION`
4. Try hard refresh: `Ctrl+Shift+R` (clears cache)

### Debugging Supabase Queries

Enable SQL logging in browser console:

```javascript
// In browser console (F12)
localStorage.setItem('DEBUG', 'supabase:*');
location.reload();
```

This will log all Supabase API calls. Turn off with:

```javascript
localStorage.removeItem('DEBUG');
```

## Database Development

### Viewing Live Data

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Open your project → **Table Editor**
3. Click on table name (e.g., "users", "jobs")
4. See all rows and edit directly in browser

### Running Custom Queries

1. Go to **SQL Editor** tab
2. Write query and click **Run**

Example: Get all jobs for a customer:

```sql
SELECT j.*, v.make, v.model, c.customer_name
FROM jobs j
JOIN vehicles v ON j.vehicle_id = v.id
JOIN customers c ON j.customer_id = c.id
WHERE c.customer_name = 'ABC Trucking'
ORDER BY j.created_at DESC;
```

### Adding Seed Data

1. SQL Editor → New query
2. Paste INSERT statements (see GETTING_STARTED.md for examples)
3. Click **Run**

Seed data is persisted (not lost on server restart).

### Viewing Real-time Changes

1. Open two browser windows side-by-side
2. In window 1: Update a customer name in Supabase Table Editor
3. In window 2 (app): Should see customer list update automatically
4. If not updating, check browser console for realtime subscription errors

## Code Style & Conventions

### File Naming

- **Components**: PascalCase (e.g., `AuthContext.tsx`, `KioskLoginScreen.tsx`)
- **Utilities**: camelCase (e.g., `formatting.ts`, `sequences.ts`)
- **Services**: PascalCase with "Service" suffix (e.g., `CustomerService.ts`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAuth.ts`, `hooks.ts`)
- **Types**: PascalCase (e.g., `models.ts`, `database.ts`)

### Import Organization

```typescript
// 1. React & external libraries
import { useState, useEffect } from 'react';
import { supabase } from '@supabase/supabase-js';

// 2. Core app (utilities, types, context)
import { useAuth } from '@/core/hooks/useAuth';
import { formatCurrency } from '@/core/utils/formatting';
import { Customer } from '@/core/types/models';

// 3. Module-specific
import { CustomerService } from './CustomerService';
import { useCustomers } from './hooks';

// 4. Styles
import './Component.css';
```

### TypeScript Usage

- Always type function parameters and return values
- Use `interface` for data models, `type` for unions/primitives
- Avoid `any` — use `unknown` if truly unknown, then narrow type
- Database rows use types from `@/core/types/database`
- API responses use models from `@/core/types/models`

Example:

```typescript
const fetchCustomer = async (id: string): Promise<Customer | null> => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Customer;
};
```

## Git Workflow

### Before Committing

```bash
npm run type-check  # Check for type errors
npm run lint        # Check code style
npm run test        # Run all tests
npm run build       # Verify build succeeds
```

### Commit Message Format

```
[Feature/Fix/Docs] Brief description

Optional longer explanation if needed.

Files changed:
- src/modules/customers/CustomerService.ts
- src/modules/customers/hooks.ts
```

### Pushing to Production

```bash
npm run build       # Verify no errors
git push            # Netlify automatically deploys from main
```

Check deployment status at [Netlify Dashboard](https://app.netlify.com).

## Deployment to Staging

### First-Time Netlify Setup

1. Connect GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables under Site Settings:
   - `VITE_SUPABASE_URL`: (from Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (from Supabase)
5. Deploy

### Each Subsequent Deploy

```bash
git push origin main  # Any push to main triggers auto-deploy
```

Check logs at Netlify Dashboard → Site → Deploys.

## Performance Tips

### Build Size

```bash
npm run build  # Creates dist/ folder
du -sh dist/   # Check total size
```

If bundle grows too large, check:
- Unused dependencies in `package.json`
- Duplicate imports (`import X from 'lib'` vs `import X from 'lib/X'`)
- Tree-shaking: Vite should auto-optimize, but explicit imports help

### DevTools Audit

1. Build for production: `npm run Preview`
2. Open Lighthouse (Chrome DevTools → Lighthouse)
3. Check scores:
   - Performance: >90
   - Accessibility: >90
   - Best Practices: >90
   - SEO: >90

## Resources

- **React**: [react.dev](https://react.dev)
- **Vite**: [vitejs.dev](https://vitejs.dev)
- **TypeScript**: [typescriptlang.org](https://www.typescriptlang.org)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Tailwind**: [tailwindcss.com](https://tailwindcss.com)
- **TanStack Router**: [tanstack.com/router](https://tanstack.com/router)

## Need Help?

1. Check this file first
2. Search project docs (`docs/` folder)
3. Check Supabase documentation
4. Search GitHub Issues (or similar error handling in codebase)
5. Ask team lead or refer to `.instructions.md` § Architecture

---

**Last Updated**: 2025-01-20
**Maintainer**: Development Team
