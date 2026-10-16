/**
 * Announcements Service
 * Encapsulates Supabase queries for club-wide and department announcements.
 */

import { supabase } from '../lib/supabaseClient';
import type {
  AnnouncementRow,
  AnnouncementPriority,
  AnnouncementAudience,
} from '../types/database.types';

export interface CreateAnnouncementParams {
  title: string;
  content: string;
  posted_by: string;
  audience?: AnnouncementAudience;
  target_department_id?: string | null;
  priority?: AnnouncementPriority;
  pinned?: boolean;
}

export interface UpdateAnnouncementParams {
  title?: string;
  content?: string;
  audience?: AnnouncementAudience;
  target_department_id?: string | null;
  priority?: AnnouncementPriority;
  pinned?: boolean;
}

export const announcementsService = {
  /**
   * Fetch all announcements visible to the current user (filtered by RLS)
   */
  async getAnnouncements(): Promise<{ data: AnnouncementRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetch a single announcement by ID
   */
  async getAnnouncementById(
    announcementId: string
  ): Promise<{ data: AnnouncementRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Post a new announcement (Lead or Executive authority required by RLS)
   */
  async createAnnouncement(
    params: CreateAnnouncementParams
  ): Promise<{ data: AnnouncementRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: params.title,
          content: params.content,
          posted_by: params.posted_by,
          audience: params.audience ?? 'All Members',
          target_department_id: params.target_department_id ?? null,
          priority: params.priority ?? 'Normal',
          pinned: params.pinned ?? false,
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update an existing announcement
   */
  async updateAnnouncement(
    announcementId: string,
    updates: UpdateAnnouncementParams
  ): Promise<{ data: AnnouncementRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', announcementId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Toggle pinned status for an announcement
   */
  async togglePin(
    announcementId: string,
    pinned: boolean
  ): Promise<{ data: AnnouncementRow | null; error: Error | null }> {
    return this.updateAnnouncement(announcementId, { pinned });
  },

  /**
   * Delete an announcement (Author or Executive only via RLS)
   */
  async deleteAnnouncement(announcementId: string): Promise<{ success: boolean; error: Error | null }> {
    if (!supabase) {
      return { success: false, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};
