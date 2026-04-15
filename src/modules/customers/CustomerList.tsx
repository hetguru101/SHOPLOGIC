import { useState } from 'react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from './hooks';
import CustomerForm from './CustomerForm';
import { Customer } from '@/core/types/models';

export default function CustomerList() {
  const { customers, loading, error } = useCustomers();
  const { createCustomer, loading: creating } = useCreateCustomer();
  const { updateCustomer, loading: updating } = useUpdateCustomer();
  const { deleteCustomer, loading: deleting } = useDeleteCustomer();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = async (values: any) => {
    const customer = await createCustomer(values);
    setSelectedCustomer(customer);
    setIsFormOpen(false);
    return customer;
  };

  const handleUpdate = async (customerId: string, values: any) => {
    const customer = await updateCustomer(customerId, values);
    setSelectedCustomer(customer);
    setIsFormOpen(false);
    return customer;
  };

  const handleDelete = async (customerId: string) => {
    const confirmed = window.confirm('Delete this customer? This cannot be undone.');
    if (!confirmed) return;
    await deleteCustomer(customerId);
    if (selectedCustomer?.customer_id === customerId) {
      setSelectedCustomer(null);
    }
  };

  const openCreateForm = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
          <p className="text-gray-600">Manage customer accounts, contact info, and labor overrides.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="btn-primary px-5 py-2"
        >
          Add Customer
        </button>
      </div>

      {isFormOpen && (
        <CustomerForm
          customer={selectedCustomer}
          onSave={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {loading ? (
        <div className="bg-white rounded shadow p-6 text-center">Loading customers...</div>
      ) : error ? (
        <div className="bg-red-100 border border-red-300 rounded p-6 text-red-700">{error.message}</div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-center">No customers found.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Labor Rate Override</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.contact_person || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.email || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.phone || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {customer.labor_rate_override != null ? `$${customer.labor_rate_override.toFixed(2)}` : 'Default'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditForm(customer)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.customer_id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || updating || deleting) && (
        <div className="text-sm text-gray-500">Saving changes…</div>
      )}
    </div>
  );
}
