// Simple localStorage-backed auth storage adapter for the Supabase client.
export function authStorage() {
  if (typeof window === 'undefined') return undefined;
  return localStorage;
}
