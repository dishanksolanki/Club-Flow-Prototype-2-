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

function normalizeDeadline(val?: string): string {
  if (!val) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export const tasksService = {
  /**
   * Fetch all tasks accessible to the current user (filtered by RLS) along with submissions
   */
  async getTasks(departmentId?: string): Promise<{
    data: (TaskRow & { submission?: TaskSubmissionRow | null })[] | null;
    error: Error | null;
  }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }
      const { data: tasksData, error: tasksError } = await query;
      if (tasksError) return { data: null, error: tasksError };
      if (!tasksData) return { data: [], error: null };

      // Load submissions for these tasks
      const taskIds = tasksData.map((t) => t.id);
      const submissionsMap = new Map<string, TaskSubmissionRow>();
      if (taskIds.length > 0) {
        const { data: subsData, error: subsError } = await supabase
          .from('task_submissions')
          .select('*')
          .in('task_id', taskIds);
        if (subsData && !subsError) {
          subsData.forEach((sub) => submissionsMap.set(sub.task_id, sub));
        }
      }

      const tasksWithSubs = tasksData.map((t) => ({
        ...t,
        submission: submissionsMap.get(t.id) || null,
      }));

      return { data: tasksWithSubs, error: null };
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
      const deadlineDate = normalizeDeadline(params.deadline);

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: params.title,
          description: params.description ?? '',
          department_id: params.department_id,
          assigned_by: params.assigned_by,
          assigned_to: params.assigned_to,
          deadline: deadlineDate,
          priority: params.priority ?? 'Medium',
          status: params.status ?? 'Pending',
        })
        .select()
        .single();

      if (data && !error) {
        // Record creation activity log safely
        try {
          await supabase.from('task_activity_logs').insert({
            task_id: data.id,
            actor_id: params.assigned_by,
            action: 'Task created',
            details: `Priority: ${params.priority ?? 'Medium'}`,
            note: `Priority: ${params.priority ?? 'Medium'}`,
          } as any);
        } catch {
          // Non-blocking log insert
        }
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
        try {
          await supabase.from('task_activity_logs').insert({
            task_id: taskId,
            actor_id: actorId,
            action: `Status changed to ${status}`,
            details: note ?? `Status transitioned to ${status}`,
            note: note ?? `Status transitioned to ${status}`,
          } as any);
        } catch {
          // Non-blocking log insert
        }
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
      const nowIso = new Date().toISOString();
      const submissionLink =
        params.submission_link && params.submission_link.trim().length > 0
          ? params.submission_link.trim()
          : 'https://github.com/deliverables/task-' + params.task_id;
      const submissionNotes = params.submission_notes ?? 'Work submitted for review';

      // Check if submission already exists for this task
      const { data: existingSub } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', params.task_id)
        .maybeSingle();

      let subResult;
      if (existingSub) {
        subResult = await supabase
          .from('task_submissions')
          .update({
            submitted_by: params.submitted_by,
            submitted_at: nowIso,
            submission_link: submissionLink,
            submission_notes: submissionNotes,
            review_status: 'Pending',
            reviewed_by: null,
            reviewed_at: null,
            review_comment: null,
          })
          .eq('id', existingSub.id)
          .select()
          .single();
      } else {
        subResult = await supabase
          .from('task_submissions')
          .insert({
            task_id: params.task_id,
            submitted_by: params.submitted_by,
            submitted_at: nowIso,
            submission_link: submissionLink,
            submission_notes: submissionNotes,
            review_status: 'Pending',
          })
          .select()
          .single();
      }

      if (subResult.error) {
        return { data: null, error: subResult.error };
      }

      // Update task status to Submitted
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'Submitted' })
        .eq('id', params.task_id);

      if (taskError) {
        return { data: null, error: taskError };
      }

      // Record submission activity log
      try {
        await supabase.from('task_activity_logs').insert({
          task_id: params.task_id,
          actor_id: params.submitted_by,
          action: 'Deliverable submitted',
          details: submissionNotes,
          note: submissionNotes,
        } as any);
      } catch {
        // Non-blocking log insert
      }

      return { data: subResult.data, error: null };
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
      const nowIso = new Date().toISOString();
      const reviewComment =
        params.review_comment ?? (params.review_status === 'Approved' ? 'Deliverable approved.' : 'Revisions requested.');

      // Check if submission exists
      const { data: existingSub } = await supabase
        .from('task_submissions')
        .select('id')
        .eq('task_id', params.task_id)
        .maybeSingle();

      let subResult;
      if (existingSub) {
        subResult = await supabase
          .from('task_submissions')
          .update({
            review_status: params.review_status,
            reviewed_by: params.reviewed_by,
            review_comment: reviewComment,
            reviewed_at: nowIso,
          })
          .eq('id', existingSub.id)
          .select()
          .single();
      } else {
        subResult = await supabase
          .from('task_submissions')
          .insert({
            task_id: params.task_id,
            submitted_by: params.reviewed_by,
            submission_link: 'https://github.com/deliverables/task-' + params.task_id,
            submission_notes: 'Reviewed directly by leadership',
            review_status: params.review_status,
            reviewed_by: params.reviewed_by,
            review_comment: reviewComment,
            reviewed_at: nowIso,
          })
          .select()
          .single();
      }

      if (subResult.error) {
        return { data: null, error: subResult.error };
      }

      const nextStatus: TaskStatus = params.review_status === 'Approved' ? 'Approved' : 'Rejected';
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', params.task_id);

      if (taskError) {
        return { data: null, error: taskError };
      }

      try {
        await supabase.from('task_activity_logs').insert({
          task_id: params.task_id,
          actor_id: params.reviewed_by,
          action: `Review: ${params.review_status}`,
          details: reviewComment,
          note: reviewComment,
        } as any);
      } catch {
        // Non-blocking log insert
      }

      return { data: subResult.data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },
};
