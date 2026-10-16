/**
 * Tasks & Submissions Service
 * Encapsulates Supabase queries for assignments, deliverable submissions, and reviews.
 */

import { supabase } from '../lib/supabaseClient';
import type {
  TaskRow,
  TaskSubmissionRow,
  TaskActivityLogRow,
  TaskPriority,
  TaskStatus,
} from '../types/database.types';

export interface CreateTaskParams {
  title: string;
  description?: string;
  department_id: string;
  assigned_by: string;
  assigned_to: string;
  deadline: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface SubmitDeliverableParams {
  task_id: string;
  submitted_by: string;
  submission_link?: string;
  submission_notes?: string;
}

export interface ReviewSubmissionParams {
  task_id: string;
  reviewed_by: string;
  review_status: 'Approved' | 'Rejected';
  review_comment?: string;
}

export const tasksService = {
  /**
   * Fetch all tasks accessible to the current user (filtered by RLS)
   */
  async getTasks(departmentId?: string): Promise<{ data: TaskRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
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
   * Fetch a task with its submission details and activity logs
   */
  async getTaskDetails(taskId: string): Promise<{
    data: {
      task: TaskRow;
      submission: TaskSubmissionRow | null;
      activityLogs: TaskActivityLogRow[];
    } | null;
    error: Error | null;
  }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const [taskRes, subRes, logsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('id', taskId).single(),
        supabase.from('task_submissions').select('*').eq('task_id', taskId).maybeSingle(),
        supabase.from('task_activity_logs').select('*').eq('task_id', taskId).order('created_at', { ascending: true }),
      ]);

      if (taskRes.error) return { data: null, error: taskRes.error };

      return {
        data: {
          task: taskRes.data,
          submission: subRes.data,
          activityLogs: logsRes.data ?? [],
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Create a new task (enforces assignment authority via RLS)
   */
  async createTask(params: CreateTaskParams): Promise<{ data: TaskRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: params.title,
          description: params.description ?? '',
          department_id: params.department_id,
          assigned_by: params.assigned_by,
          assigned_to: params.assigned_to,
          deadline: params.deadline,
          priority: params.priority ?? 'Medium',
          status: params.status ?? 'Pending',
        })
        .select()
        .single();

      if (data && !error) {
        // Record creation activity log
        await supabase.from('task_activity_logs').insert({
          task_id: data.id,
          actor_id: params.assigned_by,
          action: 'Task created',
          note: `Priority: ${params.priority ?? 'Medium'}`,
        });
      }

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update task status (e.g. 'In Progress', 'Completed')
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    actorId: string,
    note?: string
  ): Promise<{ data: TaskRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (data && !error) {
        await supabase.from('task_activity_logs').insert({
          task_id: taskId,
          actor_id: actorId,
          action: `Status changed to ${status}`,
          note: note ?? null,
        });
      }

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Submit deliverable work for a task
   */
  async submitDeliverable(params: SubmitDeliverableParams): Promise<{ data: TaskSubmissionRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      // Upsert submission record
      const { data, error } = await supabase
        .from('task_submissions')
        .upsert(
          {
            task_id: params.task_id,
            submitted_by: params.submitted_by,
            submitted_at: new Date().toISOString(),
            submission_link: params.submission_link ?? null,
            submission_notes: params.submission_notes ?? null,
            review_status: 'Pending',
          },
          { onConflict: 'task_id' }
        )
        .select()
        .single();

      if (data && !error) {
        // Update task status to Submitted
        await supabase.from('tasks').update({ status: 'Submitted' }).eq('id', params.task_id);

        // Record submission activity log
        await supabase.from('task_activity_logs').insert({
          task_id: params.task_id,
          actor_id: params.submitted_by,
          action: 'Deliverable submitted',
          note: params.submission_notes ?? 'Work submitted for review',
        });
      }

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Review a task submission (Approve / Reject)
   */
  async reviewSubmission(params: ReviewSubmissionParams): Promise<{ data: TaskSubmissionRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('task_submissions')
        .update({
          review_status: params.review_status,
          reviewed_by: params.reviewed_by,
          review_comment: params.review_comment ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('task_id', params.task_id)
        .select()
        .single();

      if (data && !error) {
        const nextStatus: TaskStatus = params.review_status === 'Approved' ? 'Approved' : 'Rejected';
        await supabase.from('tasks').update({ status: nextStatus }).eq('id', params.task_id);

        await supabase.from('task_activity_logs').insert({
          task_id: params.task_id,
          actor_id: params.reviewed_by,
          action: `Review: ${params.review_status}`,
          note: params.review_comment ?? null,
        });
      }

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
