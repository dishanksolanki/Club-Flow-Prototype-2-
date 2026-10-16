/**
 * Supabase Database TypeScript Definitions for ClubFlow
 * Generated based on migration: 20261016000001_clubflow_init.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type HierarchyRole =
  | 'Faculty Advisor'
  | 'President'
  | 'Vice President'
  | 'Head'
  | 'Co-Head'
  | 'Department Head'
  | 'Department Co-Head'
  | 'Department Member';

export type MemberStatus =
  | 'Active'
  | 'Core Lead'
  | 'On Leave'
  | 'Probation'
  | 'Inactive';

export type TaskStatus =
  | 'Pending'
  | 'In Progress'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'Overdue';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type EventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export type WorkingHourStatus = 'Verified' | 'Pending Verification';

export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';

export type AnnouncementAudience = 'All Members' | 'Specific Department';

export interface Database {
  public: {
    Tables: {
      club_settings: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          academic_year: string;
          contact_email: string;
          logo_url: string | null;
          brand_tag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          description?: string | null;
          academic_year?: string;
          contact_email: string;
          logo_url?: string | null;
          brand_tag?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          academic_year?: string;
          contact_email?: string;
          logo_url?: string | null;
          brand_tag?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      departments: {
        Row: {
          id: string;
          name: string;
          short_desc: string;
          description: string;
          tools: string[];
          color_theme: string;
          lead_id: string | null;
          co_lead_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_desc?: string;
          description?: string;
          tools?: string[];
          color_theme?: string;
          lead_id?: string | null;
          co_lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_desc?: string;
          description?: string;
          tools?: string[];
          color_theme?: string;
          lead_id?: string | null;
          co_lead_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_departments_lead';
            columns: ['lead_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_departments_co_lead';
            columns: ['co_lead_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          initials: string;
          avatar_url: string | null;
          role: string;
          hierarchy_role: HierarchyRole;
          department_id: string | null;
          student_id: string | null;
          year: string | null;
          bio: string | null;
          status: MemberStatus;
          attendance_rate: number;
          tasks_completed: number;
          working_hours: number;
          join_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          initials?: string;
          avatar_url?: string | null;
          role?: string;
          hierarchy_role?: HierarchyRole;
          department_id?: string | null;
          student_id?: string | null;
          year?: string | null;
          bio?: string | null;
          status?: MemberStatus;
          attendance_rate?: number;
          tasks_completed?: number;
          working_hours?: number;
          join_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          initials?: string;
          avatar_url?: string | null;
          role?: string;
          hierarchy_role?: HierarchyRole;
          department_id?: string | null;
          student_id?: string | null;
          year?: string | null;
          bio?: string | null;
          status?: MemberStatus;
          attendance_rate?: number;
          tasks_completed?: number;
          working_hours?: number;
          join_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          }
        ];
      };

      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          department_id: string;
          assigned_by: string;
          assigned_to: string;
          deadline: string;
          priority: TaskPriority;
          status: TaskStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          department_id: string;
          assigned_by: string;
          assigned_to: string;
          deadline: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          department_id?: string;
          assigned_by?: string;
          assigned_to?: string;
          deadline?: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assigned_by_fkey';
            columns: ['assigned_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assigned_to_fkey';
            columns: ['assigned_to'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      task_submissions: {
        Row: {
          id: string;
          task_id: string;
          submitted_by: string;
          submitted_at: string;
          submission_link: string | null;
          submission_notes: string | null;
          review_status: 'Pending' | 'Approved' | 'Rejected' | null;
          reviewed_by: string | null;
          review_comment: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          task_id: string;
          submitted_by: string;
          submitted_at?: string;
          submission_link?: string | null;
          submission_notes?: string | null;
          review_status?: 'Pending' | 'Approved' | 'Rejected' | null;
          reviewed_by?: string | null;
          review_comment?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          task_id?: string;
          submitted_by?: string;
          submitted_at?: string;
          submission_link?: string | null;
          submission_notes?: string | null;
          review_status?: 'Pending' | 'Approved' | 'Rejected' | null;
          reviewed_by?: string | null;
          review_comment?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_submissions_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_submissions_submitted_by_fkey';
            columns: ['submitted_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_submissions_reviewed_by_fkey';
            columns: ['reviewed_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      task_activity_logs: {
        Row: {
          id: string;
          task_id: string;
          actor_id: string;
          action: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          actor_id: string;
          action: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          actor_id?: string;
          action?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_activity_logs_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_activity_logs_actor_id_fkey';
            columns: ['actor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          event_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          organizer_id: string;
          department_id: string;
          status: EventStatus;
          capacity: number;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          event_date: string;
          start_time: string;
          end_time: string;
          venue: string;
          organizer_id: string;
          department_id: string;
          status?: EventStatus;
          capacity?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          event_date?: string;
          start_time?: string;
          end_time?: string;
          venue?: string;
          organizer_id?: string;
          department_id?: string;
          status?: EventStatus;
          capacity?: number;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_organizer_id_fkey';
            columns: ['organizer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          }
        ];
      };

      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          member_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          member_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          member_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_rsvps_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_rsvps_member_id_fkey';
            columns: ['member_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      attendance_records: {
        Row: {
          id: string;
          event_id: string | null;
          event_name: string;
          record_date: string;
          member_id: string;
          department_id: string;
          check_in_time: string;
          status: AttendanceStatus;
          recorded_by: string;
          session_type: string | null;
          duration_hours: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          event_name?: string;
          record_date?: string;
          member_id?: string;
          department_id?: string;
          check_in_time?: string;
          status?: AttendanceStatus;
          recorded_by?: string;
          session_type?: string | null;
          duration_hours?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_records_event_id_fkey';
            columns: ['event_id'];
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_records_member_id_fkey';
            columns: ['member_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_records_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_records_recorded_by_fkey';
            columns: ['recorded_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      working_hours: {
        Row: {
          id: string;
          member_id: string;
          department_id: string;
          project: string;
          log_date: string;
          start_time: string | null;
          end_time: string | null;
          description: string;
          hours: number;
          verified_by: string | null;
          status: WorkingHourStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          department_id: string;
          project: string;
          log_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          description?: string;
          hours: number;
          verified_by?: string | null;
          status?: WorkingHourStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          department_id?: string;
          project?: string;
          log_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          description?: string;
          hours?: number;
          verified_by?: string | null;
          status?: WorkingHourStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'working_hours_member_id_fkey';
            columns: ['member_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'working_hours_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'working_hours_verified_by_fkey';
            columns: ['verified_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          posted_by: string;
          audience: AnnouncementAudience;
          target_department_id: string | null;
          priority: AnnouncementPriority;
          pinned: boolean;
          is_pinned?: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          posted_by: string;
          audience?: AnnouncementAudience;
          target_department_id?: string | null;
          priority?: AnnouncementPriority;
          pinned?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          posted_by?: string;
          audience?: AnnouncementAudience;
          target_department_id?: string | null;
          priority?: AnnouncementPriority;
          pinned?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_posted_by_fkey';
            columns: ['posted_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'announcements_target_department_id_fkey';
            columns: ['target_department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          }
        ];
      };

      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          message: string;
          type: string;
          link_tab: string | null;
          item_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          title: string;
          message: string;
          type: string;
          link_tab?: string | null;
          item_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          title?: string;
          message?: string;
          type?: string;
          link_tab?: string | null;
          item_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };

      activity_logs: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          related_item: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          action: string;
          related_item: string;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string;
          action?: string;
          related_item?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_logs_actor_id_fkey';
            columns: ['actor_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      auth_hierarchy_role: {
        Args: Record<PropertyKey, never>;
        Returns: HierarchyRole;
      };
      is_executive: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_faculty: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      auth_department_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      is_department_lead: {
        Args: { target_dept_id: string };
        Returns: boolean;
      };
      create_notification: {
        Args: {
          p_recipient_id: string;
          p_title: string;
          p_message: string;
          p_type: string;
          p_link_tab?: string | null;
          p_item_id?: string | null;
        };
        Returns: string;
      };
      bootstrap_initial_president: {
        Args: { target_email: string };
        Returns: void;
      };
    };
    Enums: {
      hierarchy_role: HierarchyRole;
      member_status: MemberStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      event_status: EventStatus;
      attendance_status: AttendanceStatus;
      working_hour_status: WorkingHourStatus;
      announcement_priority: AnnouncementPriority;
      announcement_audience: AnnouncementAudience;
    };
  };
}

// Convenience Row types
export type ClubSettingsRow = Database['public']['Tables']['club_settings']['Row'];
export type DepartmentRow = Database['public']['Tables']['departments']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type TaskRow = Database['public']['Tables']['tasks']['Row'];
export type TaskSubmissionRow = Database['public']['Tables']['task_submissions']['Row'];
export type TaskActivityLogRow = Database['public']['Tables']['task_activity_logs']['Row'];
export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventRsvpRow = Database['public']['Tables']['event_rsvps']['Row'];
export type AttendanceRecordRow = Database['public']['Tables']['attendance_records']['Row'];
export type WorkingHourRow = Database['public']['Tables']['working_hours']['Row'];
export type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
