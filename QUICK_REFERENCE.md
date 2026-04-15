# Quick Reference Card

**Print this page or bookmark for fast lookup during development.**

## Commands

```bash
# Start development server (localhost:5173)
npm run dev

# Check for typescript & style errors
npm run type-check && npm run lint

# Run tests
npm run test              # Once
npm run test:ui          # Interactive UI (recommended)
npm run test:watch       # Watch mode

# Build for production
npm run build           # Creates dist/
npm run preview         # Serve dist/ locally

# Install dependencies
npm install
```

## Key Directories

```
src/core/              → Shared infrastructure
src/modules/[name]/    → Feature modules
src/modules/auth/      → Kiosk login (done)
src/modules/tech-logging/  → Tech dashboard (done)
tests/                 → Unit tests
docs/                  → Documentation
supabase/migrations/   → Database schemas
```

## Import Paths

```typescript
// Infrastructure
import { supabase } from '@/core/supabase/client';
import { useAuth } from '@/core/hooks/useAuth';
import { Customer } from '@/core/types/models';
import { formatCurrency } from '@/core/utils/formatting';

// Features
import { CustomerService } from '@/modules/customers/CustomerService';
import { useCustomers } from '@/modules/customers/hooks';
```

## Creating a New Module

### 1. Create Service `src/modules/[feature]/[Feature]Service.ts`

```typescript
import { supabase } from '@/core/supabase/client';

export const CustomerService = {
  async fetch(): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data as Customer[];
  },
  
  async create(input): Promise<Customer> {
    const { data, error } = await supabase.from('customers').insert(input).select().single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, input): Promise<Customer> {
    const { data, error } = await supabase.from('customers').update(input).eq('id', id).select().single();
    if (error) throw error;
    return data as Customer;
  },
};
```

### 2. Create Hooks `src/modules/[feature]/hooks.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/core/supabase/client';
import { CustomerService } from './CustomerService';

export const useCustomers = () => {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await CustomerService.fetch();
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Realtime subscription
    const sub = supabase.from('customers').on('*', () => load()).subscribe();
    return () => sub.unsubscribe();
  }, []);

  return { data, loading, error };
};
```

### 3. Create UI Components

**List Component** `src/modules/[feature]/[Feature]List.tsx`:

```typescript
import { useCustomers } from './hooks';

export const CustomerList = () => {
  const { data, loading } = useCustomers();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Customers</h1>
      <table className="w-full">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {data.map(customer => (
            <tr key={customer.id}>
              <td>{customer.customer_name}</td>
              <td>{customer.phone}</td>
              <td><button onClick={() => {/* edit */}}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Form Component** `src/modules/[feature]/[Feature]Form.tsx`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCustomer } from './hooks';

const schema = z.object({
  customerName: z.string().min(1),
  phone: z.string().optional(),
});

export const CustomerForm = ({ onClose }: { onClose: () => void }) => {
  const { createCustomer, loading } = useCreateCustomer();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(async (data) => {
      await createCustomer(data);
      onClose();
    })}>
      <input {...register('customerName')} placeholder="Name" />
      {errors.customerName && <span className="text-red-600">{errors.customerName.message}</span>}
      <button className="btn" disabled={loading}>Save</button>
    </form>
  );
};
```

### 4. Add Routes in `src/App.tsx`

```typescript
<Route path="/customers" element={<CustomerList />} />
<Route path="/customers/new" element={<CustomerForm onClose={() => navigate('/customers')} />} />
```

## Common Patterns

### Fetch with Realtime

```typescript
const { data, error } = await supabase.from('customers').select('*');
// Subscribe to changes
supabase.from('customers').on('INSERT', payload => console.log('New:', payload.new)).subscribe();
```

### Create with Error Handling

```typescript
const { data, error } = await supabase
  .from('customers')
  .insert({ customer_name: 'ABC Trucking' })
  .select()
  .single();

if (error) {
  console.error(error.message);
  throw error;
}
```

### Update State from Hook

```typescript
const [customers, setCustomers] = useState<Customer[]>([]);

useEffect(() => {
  // Load data
  const load = async () => {
    const data = await CustomerService.fetch();
    setCustomers(data);
  };
  load();

  // Subscribe to updates
  const sub = supabase.from('customers').on('UPDATE', payload => {
    setCustomers(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
  }).subscribe();

  return () => sub.unsubscribe();
}, []);
```

### Form Validation with Zod + React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  customerName: z.string().min(1, 'Name required'),
  phone: z.string().regex(/^\d{10}$/, 'Invalid phone').optional().or(z.literal('')),
  laborRate: z.coerce.number().min(0).optional(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Formatting Utilities

```typescript
import { formatCurrency, formatDate, formatPhone } from '@/core/utils/formatting';

formatCurrency(100);        // "$100.00"
formatDate(new Date());     // "Jan 20, 2025"
formatPhone('1234567890');  // "(123) 456-7890"
```

## Tailwind CSS Quick Classes

```html
<!-- Colors -->
<div class="text-primary-600">Primary text</div>
<button class="bg-success-500 text-white">Success button</button>

<!-- Spacing -->
<div class="p-4">Padding</div>
<div class="m-2">Margin</div>
<div class="gap-3">Gap (flex)</div>

<!-- Layout -->
<div class="flex justify-between items-center">Flex row</div>
<div class="grid grid-cols-3 gap-4">3-column grid</div>

<!-- Sizing -->
<div class="w-full h-20">Full width, fixed height</div>
<button class="px-4 py-2">Padding shortcut</button>

<!-- Responsive -->
<div class="sm:text-sm md:text-base lg:text-lg">Responsive text</div>

<!-- Custom classes from src/index.css -->
<button class="btn">Primary button</button>
<input class="input" />
<div class="card">Card with padding & border</div>
```

## Database Quick Reference

```sql
-- Get open jobs for a tech
SELECT * FROM jobs 
WHERE assigned_tech_id = 'tech-001' AND status = 'open';

-- Get job logs (time clock) for a tech
SELECT * FROM job_logs WHERE tech_id = 'tech-001' ORDER BY clock_in DESC;

-- Get customer with labor rate
SELECT c.*, c.labor_rate_override FROM customers c WHERE c.id = 'cust-001';

-- Insert test data
INSERT INTO users (user_id, name, role, active) VALUES ('tech-001', 'John', 'tech', true);
```

## Debugging Tips

```javascript
// Browser console
localStorage.setItem('DEBUG', 'supabase:*');  // Log all Supabase calls
localStorage.getItem('auth_session');  // Check stored session
```

```bash
# Terminal
npm run type-check  # Find TypeScript errors
npm run lint        # Find style errors
npm run build       # Verify production build works
```

## File Locations for Common Tasks

| Task | File |
|------|------|
| Using auth state | `src/core/hooks/useAuth.ts` → `const { user } = useAuth()` |
| Formatting values | `src/core/utils/formatting.ts` |
| Database types | `src/core/types/database.ts` (read) or models.ts (use) |
| Adding new util | `src/core/utils/[name].ts` |
| Styling component | `src/index.css` for global classes, Tailwind for in-JSX |
| Adding route | `src/App.tsx` |
| Creating module | `src/modules/[name]/[Name]Service.ts`, `hooks.ts`, `*.tsx` |

## Next Steps

1. ✅ **Run**: `npm run dev` for local development
2. 📖 **Read**: [`GETTING_STARTED.md`](GETTING_STARTED.md) for setup
3. 📝 **Code**: Start with Customers module (most foundational)
4. ✔️ **Reference**: Use [`FEATURE_CHECKLIST.md`](FEATURE_CHECKLIST.md) when adding features
5. 📚 **Docs**: See [`FILE_REFERENCE.md`](FILE_REFERENCE.md) for full file listing

---

**Tip**: Bookmark this file or your browser for quick access! 🔖
