import { createServerSupabaseClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

/**
 * Check if a given Supabase user has admin privileges.
 * An admin is verified via:
 * 1. Environment variable ADMIN_EMAILS (comma-separated list of emails)
 * 2. Supabase user app_metadata.role === 'admin'
 * 3. Supabase user user_metadata.role === 'admin' or user_metadata.is_admin === true
 */
export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;

  const userEmail = user.email.toLowerCase().trim();

  // 1. Check ADMIN_EMAILS environment variable
  const envAdminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (envAdminEmails.includes(userEmail)) {
    return true;
  }

  // 2. Check Supabase app_metadata
  if (user.app_metadata?.role === 'admin' || user.app_metadata?.is_admin === true) {
    return true;
  }

  // 3. Check Supabase user_metadata
  if (user.user_metadata?.role === 'admin' || user.user_metadata?.is_admin === true) {
    return true;
  }

  return false;
}

/**
 * Retrieve the current authenticated Supabase user from the server session
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('Error fetching current user:', err);
    return null;
  }
}

/**
 * Check if the currently logged-in user is an admin
 */
export async function checkIsAdmin(): Promise<{ user: User | null; isAdmin: boolean }> {
  const user = await getCurrentUser();
  const isAdmin = isUserAdmin(user);
  return { user, isAdmin };
}
