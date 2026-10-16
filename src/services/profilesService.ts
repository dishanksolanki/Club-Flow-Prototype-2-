/**
 * Profiles / Members Service
 * Encapsulates Supabase queries for club members and executive roster management.
 */

import { supabase } from '../lib/supabaseClient';
import type { Database, ProfileRow, HierarchyRole, MemberStatus } from '../types/database.types';

export interface UpdateProfileParams {
  name?: string;
  initials?: string;
  avatar_url?: string | null;
  role?: string;
  department_id?: string | null;
  student_id?: string | null;
  year?: string | null;
  bio?: string | null;
  status?: MemberStatus;
  attendance_rate?: number;
  tasks_completed?: number;
  working_hours?: number;
}

export const profilesService = {
  /**
   * Fetch all club member profiles with optional department filtering
   */
  async getProfiles(departmentId?: string): Promise<{ data: ProfileRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('profiles').select('*').order('name', { ascending: true });
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetch a single member profile by user UUID
   */
  async getProfileById(userId: string): Promise<{ data: ProfileRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update profile fields for a member
   */
  async updateProfile(userId: string, updates: UpdateProfileParams): Promise<{ data: ProfileRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update a member's hierarchy role.
   * Enforced on database level: only executives can perform this, and never on self.
   */
  async updateMemberHierarchyRole(
    targetUserId: string,
    newRole: HierarchyRole
  ): Promise<{ data: ProfileRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ hierarchy_role: newRole })
        .eq('id', targetUserId)
        .select()
        .single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
