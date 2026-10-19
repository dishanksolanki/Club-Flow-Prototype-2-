/**
 * Club Settings Service
 * Encapsulates Supabase queries for club settings, academic year metadata, and executive configurations.
 */

import { supabase } from '../lib/supabaseClient';
import type { ClubSettingsRow } from '../types/database.types';

export interface UpdateClubSettingsParams {
  name?: string;
  description?: string | null;
  academic_year?: string;
  contact_email?: string;
  logo_url?: string | null;
  brand_tag?: string | null;
}

export const clubSettingsService = {
  /**
   * Fetch club settings (single row configuration)
   */
  async getSettings(): Promise<{ data: ClubSettingsRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('club_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update club settings (requires Executive authority via RLS)
   */
  async updateSettings(
    updates: UpdateClubSettingsParams,
    id?: string
  ): Promise<{ data: ClubSettingsRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let targetId = id;
      if (!targetId) {
        const { data: firstRow } = await supabase.from('club_settings').select('id').limit(1).maybeSingle();
        targetId = firstRow?.id;
      }

      if (!targetId) {
        return { data: null, error: new Error('No club settings record found to update') };
      }

      const { data, error } = await supabase
        .from('club_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
