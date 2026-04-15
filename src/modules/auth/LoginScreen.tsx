import { useState } from 'react';
import { useAuth } from '@/core/hooks/useAuth';
import {
  DEV_KIOSK_EMAIL,
  DEV_KIOSK_TECH_PIN,
  DEV_PLATFORM_OWNER_EMAIL,
  DEV_SEED_OWNER_EMAIL,
  DEV_SEED_OWNER_PASSWORD,
} from '@/core/constants/devLoginHints';

export default function LoginScreen() {
  const { loginWithCredentials, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError('Email and password are required.');
      return;
    }

    try {
      // Do not trim password — must match Auth exactly; email is normalized inside auth.
      await loginWithCredentials(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setFormError(message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-700 to-sky-700 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ShopLogic</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        {(formError || error) && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4 mb-4">
            {formError || error?.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your.email@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 pr-11 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-md"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Local dev only — add <code className="text-xs bg-gray-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">.env.local</code> (same project as the Vite URL), then run{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">npm run seed:owner</code> or{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">npm run seed:platform-owner</code>. Diagnose with{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">npm run verify:demo-login</code>.
            </p>
            <p className="text-center text-xs text-gray-500 mt-3 space-y-1">
              <span className="block">
                Owner (demo shop):{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_SEED_OWNER_EMAIL}</code> /{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_SEED_OWNER_PASSWORD}</code>
              </span>
              <span className="block">
                Owner (no shop yet):{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_PLATFORM_OWNER_EMAIL}</code> /{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_SEED_OWNER_PASSWORD}</code>
              </span>
              <span className="block">
                Floor kiosk (shop terminal): <code className="bg-gray-100 px-1 rounded">{DEV_KIOSK_EMAIL}</code> /{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_SEED_OWNER_PASSWORD}</code> — then tap a tech; demo PIN{' '}
                <code className="bg-gray-100 px-1 rounded">{DEV_KIOSK_TECH_PIN}</code>
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
