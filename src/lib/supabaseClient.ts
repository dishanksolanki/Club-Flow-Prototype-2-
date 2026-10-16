/**
 * ClubFlow - Supabase Client & Configuration Helper
 * Supports graceful fallback to Demo Mode when credentials are not supplied.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Read Vite client-side environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Validate that environment variables are non-empty and not dummy placeholders
const isValidUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed.includes('your-project-ref') || trimmed.includes('MY_SUPABASE_URL')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

// Supports both modern Supabase publishable keys (sb_publishable_...) and legacy JWT anon keys (eyJ...)
const isValidAnonKey = (key?: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return (
    trimmed !== '' &&
    !trimmed.includes('your-anon-public-key') &&
    !trimmed.includes('your-publishable-key') &&
    !trimmed.includes('MY_SUPABASE_ANON_KEY') &&
    trimmed.length > 20
  );
};

export const isSupabaseConfigured = (): boolean => {
  return isValidUrl(rawSupabaseUrl) && isValidAnonKey(rawSupabaseAnonKey);
};

export type AppRuntimeMode = 'supabase' | 'demo';

export const getAppMode = (): AppRuntimeMode => {
  return isSupabaseConfigured() ? 'supabase' : 'demo';
};

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  mode: AppRuntimeMode;
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  maskedUrl: string | null;
}

export const getSupabaseConfigStatus = (): SupabaseConfigStatus => {
  const urlValid = isValidUrl(rawSupabaseUrl);
  const keyValid = isValidAnonKey(rawSupabaseAnonKey);
  const configured = urlValid && keyValid;

  let maskedUrl: string | null = null;
  if (urlValid && rawSupabaseUrl) {
    try {
      const u = new URL(rawSupabaseUrl);
      maskedUrl = `${u.protocol}//${u.hostname}`;
    } catch {
      maskedUrl = null;
    }
  }

  return {
    isConfigured: configured,
    mode: configured ? 'supabase' : 'demo',
    urlConfigured: urlValid,
    anonKeyConfigured: keyValid,
    maskedUrl,
  };
};

/**
 * Singleton Supabase client instance.
 * Returns null if running in Demo Mode to prevent runtime initialization crashes.
 */
let clientInstance: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient<Database>(
      rawSupabaseUrl!.trim(),
      rawSupabaseAnonKey!.trim(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  } catch (err) {
    console.warn(
      '[ClubFlow] Failed to initialize Supabase client despite configured variables. Falling back to demo mode.',
      err
    );
    clientInstance = null;
  }
}

export const supabase = clientInstance;
