/**
 * Working Hours Service
 * Encapsulates Supabase queries for member self-logging and lead hour verification.
 */

import { supabase } from '../lib/supabaseClient';
import type { WorkingHourRow, WorkingHourStatus } from '../types/database.types';

export interface LogWorkingHoursParams {
  member_id: string;
  department_id: string;
  project: string;
  log_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  description?: string;
  hours: number;
}

export const workingHoursService = {
  /**
   * Fetch working hour logs with optional member or status filter
   */
  async getWorkingHours(filters?: {
    memberId?: string;
    departmentId?: string;
    status?: WorkingHourStatus;
  }): Promise<{ data: WorkingHourRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('working_hours').select('*').order('log_date', { ascending: false });

      if (filters?.memberId) query = query.eq('member_id', filters.memberId);
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Log new working hours for the authenticated member
   */
  async logHours(params: LogWorkingHoursParams): Promise<{ data: WorkingHourRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('working_hours')
        .insert({
          member_id: params.member_id,
          department_id: params.department_id,
          project: params.project,
          log_date: params.log_date ?? new Date().toISOString().split('T')[0],
          start_time: params.start_time ?? null,
          end_time: params.end_time ?? null,
          description: params.description ?? '',
          hours: params.hours,
          status: 'Pending Verification',
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Verify or unverify working hour record (Department Lead or Executive only)
   */
  async verifyHours(
    recordId: string,
    status: WorkingHourStatus,
    verifiedById: string
  ): Promise<{ data: WorkingHourRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('working_hours')
        .update({
          status,
          verified_by: status === 'Verified' ? verifiedById : null,
        })
        .eq('id', recordId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
