/**
 * Departments Service
 * Encapsulates Supabase queries for functional committees and committee leads.
 */

import { supabase } from '../lib/supabaseClient';
import type { DepartmentRow } from '../types/database.types';

export interface CreateDepartmentParams {
  name: string;
  short_desc?: string;
  description?: string;
  tools?: string[];
  color_theme?: string;
  lead_id?: string | null;
  co_lead_id?: string | null;
}

export interface UpdateDepartmentParams {
  short_desc?: string;
  description?: string;
  tools?: string[];
  color_theme?: string;
  lead_id?: string | null;
  co_lead_id?: string | null;
}

export const departmentsService = {
  /**
   * Fetch all club departments
   */
  async getDepartments(): Promise<{ data: DepartmentRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Create a new club department (Executive authority required by RLS)
   */
  async createDepartment(params: CreateDepartmentParams): Promise<{ data: DepartmentRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: params.name,
          short_desc: params.short_desc ?? '',
          description: params.description ?? '',
          tools: params.tools ?? [],
          color_theme: params.color_theme ?? 'indigo',
          lead_id: params.lead_id ?? null,
          co_lead_id: params.co_lead_id ?? null,
        })
        .select()
        .single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update an existing department (Executive authority required by RLS)
   */
  async updateDepartment(
    departmentId: string,
    updates: UpdateDepartmentParams
  ): Promise<{ data: DepartmentRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', departmentId)
        .select()
        .single();
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
