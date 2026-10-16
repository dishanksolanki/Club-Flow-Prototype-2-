/**
 * Attendance Service
 * Encapsulates Supabase queries for roll call records and session audits.
 */

import { supabase } from '../lib/supabaseClient';
import type { AttendanceRecordRow, AttendanceStatus } from '../types/database.types';

export interface CreateAttendanceRecordParams {
  event_id?: string | null;
  event_name: string;
  record_date?: string;
  member_id: string;
  department_id: string;
  check_in_time?: string;
  status?: AttendanceStatus;
  recorded_by: string;
  session_type?: string | null;
  duration_hours?: number | null;
  notes?: string | null;
}

export const attendanceService = {
  /**
   * Fetch attendance records with optional event or member filters
   */
  async getAttendanceRecords(filters?: {
    eventId?: string;
    memberId?: string;
    departmentId?: string;
  }): Promise<{ data: AttendanceRecordRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('attendance_records').select('*').order('record_date', { ascending: false });

      if (filters?.eventId) query = query.eq('event_id', filters.eventId);
      if (filters?.memberId) query = query.eq('member_id', filters.memberId);
      if (filters?.departmentId) query = query.eq('department_id', filters.departmentId);

      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Add a new attendance record (recorded by Department Leads or Executives)
   */
  async addAttendanceRecord(
    params: CreateAttendanceRecordParams
  ): Promise<{ data: AttendanceRecordRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          event_id: params.event_id ?? null,
          event_name: params.event_name,
          record_date: params.record_date ?? new Date().toISOString().split('T')[0],
          member_id: params.member_id,
          department_id: params.department_id,
          check_in_time: params.check_in_time ?? '—',
          status: params.status ?? 'Present',
          recorded_by: params.recorded_by,
          session_type: params.session_type ?? 'General Meeting',
          duration_hours: params.duration_hours ?? null,
          notes: params.notes ?? null,
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update attendance status for a record
   */
  async updateAttendanceStatus(
    recordId: string,
    status: AttendanceStatus
  ): Promise<{ data: AttendanceRecordRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .update({ status })
        .eq('id', recordId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
