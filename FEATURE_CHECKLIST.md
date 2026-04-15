# Feature Implementation Checklist

Use this checklist when adding a new feature or module to the SHOPLOGIC project.

## Pre-Development

- [ ] Read [`.instructions.md`](.instructions.md) § Architecture section
- [ ] Understand data models in [`docs/SCHEMA.md`](docs/SCHEMA.md)
- [ ] Review module structure in [`docs/MODULES.md`](docs/MODULES.md)
- [ ] Check if feature is already partially started in `src/modules/`

## Database Layer

- [ ] **Create/update migration** (if database changes needed)
  - File: `supabase/migrations/NNN_description.sql`
  - Run in Supabase SQL Editor
  - Add indexes for frequently queried columns
  - Add triggers for `updated_at` timestamp

- [ ] **Update database types** (if adding new tables/columns)
  - Check Supabase Dashboard → Database → Tables
  - If types changed, manually update `src/core/types/database.ts`
  - Or use Supabase CLI to auto-generate types

- [ ] **Set up Row-Level Security (RLS)** (Phase 2)
  - Enable RLS on table in Supabase
  - Create policies for tech, manager, admin roles
  - Test with different roles

## Service Layer

- [ ] **Create Service file**
  - Location: `src/modules/[feature-name]/[Feature]Service.ts`
  - Implement CRUD (create, read, update, delete) methods
  - Document with JSDoc comments
  - Reference: [`src/modules/customers/CustomerService.ts`](src/modules/customers/CustomerService.ts)

- [ ] **Handle errors appropriately**
  - Throw errors with descriptive messages
  - Don't suppress silent failures
  - Log errors to browser console (if needed)

## React Hooks

- [ ] **Create hooks file**
  - Location: `src/modules/[feature-name]/hooks.ts`
  - Implement hooks for fetch, create, update, delete
  - Subscribe to realtime updates from Supabase
  - Manage loading & error states

- [ ] **Use custom hooks in components**
  - Never call Service methods directly in components — always via hooks
  - Hooks handle subscriptions & cleanup
  - Reference: [`src/modules/customers/hooks.ts`](src/modules/customers/hooks.ts)

## UI Components

- [ ] **Create list/table component**
  - File: `src/modules/[feature-name]/[Feature]List.tsx`
  - Use `useCustomers()` hook to fetch data
  - Display in table or grid with columns
  - Add edit button (onclick → open form modal)
  - Add delete button with confirmation
  - Add search/filter if applicable
  - Styling: Use Tailwind classes + `src/index.css` component classes

- [ ] **Create form component**
  - File: `src/modules/[feature-name]/[Feature]Form.tsx`
  - Use `react-hook-form` + `zod` for validation
  - Support create (empty form) and edit (pre-populate) modes
  - Handle loading state (disable button while submitting)
  - Show error messages from Service layer
  - Call `useCreateCustomer()` or `useUpdateCustomer()` hook
  - Close modal on success
  - Reference: See existing forms in project (if any)

## Styling

- [ ] **Use Tailwind CSS for layout/spacing**
  - Responsive: `sm:`, `md:`, `lg:`, `xl:` prefixes
  - Colors: Use custom theme colors from `tailwind.config.js`
  - Components: Use @apply classes from `src/index.css` (.btn, .input, .card)

- [ ] **Ensure touch-friendly sizes** (for kiosk)
  - Buttons: minimum 48x48px (typically `py-3 px-4` or larger)
  - Use `text-touch` class for readable font size on kiosk
  - Text: minimum 16px on mobile

## Routing

- [ ] **Add route to `src/App.tsx`**
  - Define route path (e.g., `/customers`)
  - Map to list component
  - Add edit route (e.g., `/customers/:id`)
  - Map to form component
  - Wrap in role check if needed (manager only, etc.)

- [ ] **Add navigation link** (if adding to menu)
  - Update manager dashboard with link to new feature
  - Only show to appropriate roles

## Testing

- [ ] **Write unit tests**
  - Location: `tests/modules/[feature-name]/[component].test.ts`
  - Test Service methods (mocking Supabase)
  - Test hook logic (mocking Service)
  - Test component rendering (mocking hooks)
  - Run: `npm run test`

- [ ] **Manual testing checklist**
  - [ ] Create new record → verify appears in list
  - [ ] Edit record → verify changes saved
  - [ ] Delete record → verify removed from list
  - [ ] Refresh page → verify data persists
  - [ ] Check for console errors (F12)
  - [ ] Test on mobile (Chrome DevTools → mobile emulator)

## Documentation

- [ ] **Update module documentation**
  - Update [`docs/MODULES.md`](docs/MODULES.md) with new files
  - Document API methods in Service file comments
  - Add examples if complex logic

- [ ] **Update schema documentation** (if database changes)
  - Update [`docs/SCHEMA.md`](docs/SCHEMA.md)
  - Document new tables/columns, relationships, indexes

- [ ] **Update system prompt** (if major feature)
  - Add section to [`.instructions.md`](.instructions.md)
  - Document feature flows and responsibilities

## Code Quality

- [ ] **Run type-check**
  ```bash
  npm run type-check
  ```
  - No `any` types used (use `unknown` if needed)
  - All functions have return types

- [ ] **Run linter**
  ```bash
  npm run lint
  ```
  - Fix any style issues manually
  - Ensure consistent code style

- [ ] **Build to verify**
  ```bash
  npm run build
  ```
  - No build errors
  - Check bundle size (should not increase dramatically)

## Deployment

- [ ] **Test locally**
  - Run `npm run dev`
  - Test all feature flows
  - Check browser console for errors
  - Test with slow network (Chrome DevTools → Network tab → Slow 3G)

- [ ] **Create pull request** (if using Git)
  - Title: `[Feature] Descriptive name`
  - Description: What was added, any notes for reviewers
  - Link to related issues

- [ ] **Merge to main**
  - Auto-deploys to Netlify when pushing to main branch
  - Check deployment status on Netlify Dashboard

## Phase Roadmap Reference

| Week | Task | Modules |
|------|------|---------|
| 1 ✅ | Setup, Kiosk auth | auth, tech-logging (MVP) |
| 2 | Customers, Vehicles | customers, vehicles, VIN decoder |
| 3-4 | Jobs, decline workflow | jobs, job_logs |
| 5 | Employee management, Settings | employees, settings |
| 6 | Polish, staging deployment | all modules |
| 7+ | Phase 2: Reports, advanced features | reports, analytics |

## Common Patterns

### Data Fetching Hook

```typescript
export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await CustomerService.fetchCustomers();
        setCustomers(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Subscribe to realtime
    const subscription = supabase
      .from('customers')
      .on('*', (payload) => {
        // Update state based on INSERT/UPDATE/DELETE
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, []);

  return { customers, loading, error };
};
```

### Create/Update Hook

```typescript
export const useCreateCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCustomer = useCallback(async (input) => {
    try {
      setLoading(true);
      const result = await CustomerService.createCustomer(input);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCustomer, loading, error };
};
```

### Form Component Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCustomer } from './hooks';

const schema = z.object({
  customerName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
});

export const CustomerForm = ({ onClose }: { onClose: () => void }) => {
  const { createCustomer, loading } = useCreateCustomer();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await createCustomer(data);
      onClose();
    } catch (err) {
      // Error shown via hook state
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('customerName')} />
      {errors.customerName && <p>{errors.customerName.message}</p>}
      <button disabled={loading}>Save</button>
    </form>
  );
};
```

## Resources

- **React Hooks**: [react.dev/reference/react](https://react.dev/reference/react)
- **Supabase Querying**: [supabase.com/docs/reference/javascript](https://supabase.com/docs/reference/javascript)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **React Hook Form**: [react-hook-form.com](https://react-hook-form.com)
- **Zod Validation**: [zod.dev](https://zod.dev)

---

**Save this checklist** — refer to it for each new feature or module!
