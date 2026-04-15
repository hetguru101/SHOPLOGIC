import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Customer } from '@/core/types/models';

const customerSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  laborRateOverride: z
    .union([z.number().min(0, 'Must be positive'), z.string().min(1)])
    .optional()
    .transform((value) => {
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      return value;
    }),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
  onCreate: (values: CustomerFormValues) => Promise<Customer>;
  onUpdate: (customerId: string, values: CustomerFormValues) => Promise<Customer>;
}

export default function CustomerForm({
  customer,
  onSave,
  onCancel,
  onCreate,
  onUpdate,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerName: customer?.name ?? '',
      contactPerson: customer?.contact_person ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      laborRateOverride: customer?.labor_rate_override ?? undefined,
    },
  });

  useEffect(() => {
    reset({
      customerName: customer?.name ?? '',
      contactPerson: customer?.contact_person ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      laborRateOverride: customer?.labor_rate_override ?? undefined,
    });
  }, [customer, reset]);

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      if (customer) {
        const updated = await onUpdate(customer.customer_id, values);
        onSave(updated);
      } else {
        const created = await onCreate(values);
        onSave(created);
      }
    } catch (err) {
      console.error('Customer save failed', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded shadow p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer Name</label>
        <input
          {...register('customerName')}
          className="input mt-1 w-full"
          placeholder="Customer name"
        />
        {errors.customerName && (
          <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact Person</label>
          <input {...register('contactPerson')} className="input mt-1 w-full" placeholder="Contact person" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input {...register('email')} className="input mt-1 w-full" placeholder="Email address" />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input {...register('phone')} className="input mt-1 w-full" placeholder="Phone" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Labor Rate Override</label>
          <input
            {...register('laborRateOverride', { valueAsNumber: true })}
            className="input mt-1 w-full"
            placeholder="Optional rate"
            type="number"
            step="0.01"
            min="0"
          />
          {errors.laborRateOverride && (
            <p className="text-sm text-red-600 mt-1">{errors.laborRateOverride.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input {...register('address')} className="input mt-1 w-full" placeholder="Street address" />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {customer ? 'Save Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
}
