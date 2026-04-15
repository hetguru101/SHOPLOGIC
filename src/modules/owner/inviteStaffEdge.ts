import { supabase } from '@/core/supabase/client';

export type InviteStaffInput = {
  email: string;
  role: string;
  name?: string;
  /** If omitted, the Edge Function generates a one-time temporary password. */
  password?: string;
  shop_id?: string;
};

export type InviteStaffResult = {
  user_id: string;
  email: string;
  role: string;
  temporary_password?: string;
  message?: string;
};

function pickErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  return fallback;
}

/**
 * Calls the `invite-staff` Edge Function (JWT forwarded automatically).
 */
export async function inviteStaffViaEdge(input: InviteStaffInput): Promise<InviteStaffResult> {
  const { data, error } = await supabase.functions.invoke<InviteStaffResult & { error?: string }>('invite-staff', {
    body: {
      email: input.email.trim(),
      role: input.role,
      name: input.name?.trim(),
      password: input.password,
      shop_id: input.shop_id,
    },
  });

  if (error) {
    throw new Error(pickErrorMessage(data, error.message));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  if (!data || typeof data !== 'object' || !('user_id' in data)) {
    throw new Error('Unexpected response from invite-staff');
  }

  return data as InviteStaffResult;
}
