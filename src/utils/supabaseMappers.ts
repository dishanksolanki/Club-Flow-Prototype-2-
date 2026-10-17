/**
 * ClubFlow Supabase Mappers
 * Bidirectional transformers between Supabase database rows and React frontend models.
 */

import type {
  ClubSettingsRow,
  DepartmentRow,
  ProfileRow,
  TaskRow,
  TaskSubmissionRow,
  EventRow,
  AttendanceRecordRow,
  WorkingHourRow,
  AnnouncementRow,
  NotificationRow,
} from '../types/database.types';

import type {
  Member,
  DepartmentInfo,
  DepartmentType,
  Task,
  ClubEvent,
  AttendanceRecord,
  WorkingHourRecord,
  Announcement,
  ClubNotification,
  ClubSettings,
} from '../types';

export const mapProfileToMember = (
  p: ProfileRow,
  departments: DepartmentInfo[] = []
): Member => {
  const dept = departments.find((d) => d.id === p.department_id);
  const deptName = (dept?.name || 'Technical') as DepartmentType;

  return {
    id: p.id,
    name: p.name,
    email: p.email,
    avatarUrl: p.avatar_url || undefined,
    initials: p.initials || 'CM',
    role: p.role,
    hierarchyRole: p.hierarchy_role,
    department: deptName,
    studentId: p.student_id || '',
    year: p.year || 'Member',
    attendanceRate: Number(p.attendance_rate) || 100,
    tasksCompleted: Number(p.tasks_completed) || 0,
    workingHours: Number(p.working_hours) || 0,
    status: p.status,
    joinDate: p.join_date,
    bio: p.bio || undefined,
  };
};

export const mapDepartmentToInfo = (
  d: DepartmentRow,
  profiles: ProfileRow[] = []
): DepartmentInfo => {
  const lead = profiles.find((p) => p.id === d.lead_id);
  const coLead = profiles.find((p) => p.id === d.co_lead_id);

  return {
    id: d.id,
    name: d.name as DepartmentType,
    shortDesc: d.short_desc,
    description: d.description,
    leadName: lead?.name || 'Lead Appointed',
    coLeadName: coLead?.name || 'Co-Lead Appointed',
    memberCount: profiles.filter((p) => p.department_id === d.id).length || 1,
    activeTasksCount: 0,
    upcomingEventsCount: 0,
    tools: d.tools || [],
    colorTheme: d.color_theme || 'indigo',
  };
};

export const mapTaskToModel = (
  t: TaskRow,
  profiles: ProfileRow[] = [],
  departments: DepartmentRow[] = [],
  submission?: TaskSubmissionRow | null
): Task => {
  const assignee = profiles.find((p) => p.id === t.assigned_to);
  const assigner = profiles.find((p) => p.id === t.assigned_by);
  const dept = departments.find((d) => d.id === t.department_id);
  const submitter = profiles.find((p) => p.id === submission?.submitted_by);

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    department: (dept?.name || 'Technical') as DepartmentType,
    assignedBy: assigner?.name || 'Leadership',
    assignedTo: assignee?.name || 'Assignee',
    assignedToAvatar: assignee?.avatar_url || undefined,
    deadline: t.deadline,
    priority: t.priority,
    status: t.status,
    createdAt: t.created_at,
    submission: submission
      ? {
          submittedAt: submission.submitted_at,
          submittedBy: submitter?.name || assignee?.name || 'Member',
          submissionLink: submission.submission_link || undefined,
          submissionNotes: submission.submission_notes || undefined,
          reviewComment: submission.review_comment || undefined,
          reviewStatus: submission.review_status as any,
        }
      : undefined,
  };
};

export const mapEventToModel = (
  e: EventRow,
  profiles: ProfileRow[] = [],
  departments: DepartmentRow[] = []
): ClubEvent => {
  const organizer = profiles.find((p) => p.id === e.organizer_id);
  const dept = departments.find((d) => d.id === e.department_id);

  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: (e as any).date || e.event_date || new Date().toISOString().split('T')[0],
    startTime: (e as any).start_time || '10:00 AM',
    endTime: (e as any).end_time || '12:00 PM',
    time: (e as any).time || `${(e as any).start_time || '10:00 AM'} - ${(e as any).end_time || '12:00 PM'}`,
    venue: (e as any).venue || (e as any).location || 'Campus Auditorium',
    organizer: organizer?.name || 'Club Organizer',
    organizerRole: organizer?.role,
    department: (dept?.name || 'Event Management') as DepartmentType,
    status: e.status,
    attendeesCount: 0,
    capacity: e.capacity || 100,
    tags: (e as any).tags || [],
  };
};

export const mapAttendanceToModel = (
  a: AttendanceRecordRow,
  profiles: ProfileRow[] = [],
  departments: DepartmentRow[] = []
): AttendanceRecord => {
  const member = profiles.find((p) => p.id === a.member_id);
  const recordedBy = profiles.find((p) => p.id === a.recorded_by);
  const dept = departments.find((d) => d.id === a.department_id);

  return {
    id: a.id,
    eventName: a.event_name,
    eventId: a.event_id || undefined,
    date: a.record_date,
    member: member?.name || 'Member',
    memberAvatar: member?.avatar_url || undefined,
    department: (dept?.name || 'Technical') as DepartmentType,
    checkInTime: a.check_in_time || '—',
    status: a.status,
    recordedBy: recordedBy?.name || 'Lead',
    verifiedBy: recordedBy?.name,
    type: (a.session_type as any) || 'General Meeting',
    durationHours: a.duration_hours || undefined,
    notes: a.notes || undefined,
  };
};

export const mapWorkingHourToModel = (
  w: WorkingHourRow,
  profiles: ProfileRow[] = [],
  departments: DepartmentRow[] = []
): WorkingHourRecord => {
  const member = profiles.find((p) => p.id === w.member_id);
  const verifiedBy = profiles.find((p) => p.id === w.verified_by);
  const dept = departments.find((d) => d.id === w.department_id);

  return {
    id: w.id,
    date: w.log_date,
    member: member?.name || 'Member',
    department: (dept?.name || 'Technical') as DepartmentType,
    project: w.project,
    startTime: w.start_time || undefined,
    endTime: w.end_time || undefined,
    description: w.description,
    hours: Number(w.hours),
    status: w.status === 'Verified' ? 'Verified' : 'Pending Verification',
    verifiedBy: verifiedBy?.name || 'Pending Lead Verification',
  };
};

export const mapAnnouncementToModel = (
  a: AnnouncementRow,
  profiles: ProfileRow[] = [],
  departments: DepartmentRow[] = []
): Announcement => {
  const author = profiles.find((p) => p.id === a.posted_by);
  const targetDept = departments.find((d) => d.id === a.target_department_id);

  return {
    id: a.id,
    title: a.title,
    content: a.content,
    postedBy: author?.name || 'Club Leadership',
    authorRole: author?.role || 'Executive',
    authorAvatar: author?.avatar_url || undefined,
    department: (targetDept?.name as DepartmentType) || 'General',
    date: new Date(a.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    targetDepartment: targetDept?.name as DepartmentType | undefined,
    audience: a.audience,
    priority: a.priority,
    pinned: a.pinned ?? (a as any).is_pinned ?? false,
  };
};

export const mapNotificationToModel = (n: NotificationRow): ClubNotification => {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    timestamp: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: n.read,
    type: n.type.toLowerCase().includes('task')
      ? 'task'
      : n.type.toLowerCase().includes('event')
      ? 'event'
      : n.type.toLowerCase().includes('attendance')
      ? 'attendance'
      : 'announcement',
    linkTab: (n.link_tab as any) || undefined,
    itemId: n.item_id || undefined,
  };
};

export const mapClubSettingsToModel = (s: ClubSettingsRow): ClubSettings => {
  return {
    name: s.name,
    description: s.description || 'Club Management System',
    academicYear: s.academic_year,
    contactEmail: s.contact_email,
    logoPlaceholder: s.logo_url || undefined,
    brandTag: s.brand_tag || undefined,
  };
};
