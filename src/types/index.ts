export type DepartmentType =
  | 'Technical'
  | 'Design'
  | 'Marketing'
  | 'Event Management'
  | 'Media'
  | 'Content';

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

export type HierarchyRole =
  | 'Faculty Advisor'
  | 'President'
  | 'Vice President'
  | 'Head'
  | 'Co-Head'
  | 'Department Head'
  | 'Department Co-Head'
  | 'Department Member';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  role: string;
  hierarchyRole: HierarchyRole;
  department: DepartmentType;
  studentId: string;
  year: string;
  attendanceRate: number; // percentage e.g. 92
  tasksCompleted: number;
  workingHours: number;
  status: 'Active' | 'On Leave' | 'Core Lead' | 'Probation' | 'Inactive';
  joinDate: string;
  bio?: string;
}

export interface ClubSettings {
  name: string;
  description: string;
  academicYear: string;
  contactEmail: string;
  logoPlaceholder?: string;
  brandTag?: string;
}

export interface TaskActivityEvent {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface TaskSubmission {
  submittedAt: string;
  submittedBy: string;
  submissionLink?: string;
  submissionNotes?: string;
  reviewComment?: string;
  reviewStatus?: 'Pending' | 'Approved' | 'Rejected';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  department: DepartmentType;
  assignedBy: string;
  assignedTo: string;
  assignedToAvatar?: string;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  submission?: TaskSubmission;
  history?: TaskActivityEvent[];
}

export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  time: string;
  venue: string;
  organizer: string;
  organizerRole?: string;
  department: DepartmentType;
  status: EventStatus;
  attendeesCount: number;
  capacity: number;
  tags?: string[];
  participatingMembers?: string[];
  relatedTaskIds?: string[];
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  eventName: string;
  eventId?: string;
  date: string;
  member: string; // Member name e.g. "Dishank Solanki"
  memberAvatar?: string;
  department: DepartmentType;
  checkInTime: string; // e.g. "09:05 AM" or "—"
  status: AttendanceStatus;
  recordedBy: string; // e.g. "Sophia Vance" or "Faculty Advisor"
  verifiedBy?: string; // backwards compatibility
  type?: 'General Meeting' | 'Workshop' | 'Core Standup' | 'Event Prep' | 'Hackathon';
  durationHours?: number;
  notes?: string;
}

export interface WorkingHourRecord {
  id: string;
  date: string;
  member: string; // Member name e.g. "Dishank Solanki"
  department: DepartmentType;
  project: string; // Activity or task name
  startTime?: string; // e.g. "02:00 PM"
  endTime?: string; // e.g. "05:30 PM"
  description: string;
  hours: number;
  verifiedBy: string;
  status: 'Verified' | 'Pending Verification';
}

export interface ActivityItem {
  id: string;
  member: string;
  memberAvatar?: string;
  action:
    | 'Task assigned'
    | 'Task submitted'
    | 'Task completed'
    | 'Event created'
    | 'Attendance marked'
    | 'Work record added'
    | string;
  timestamp: string; // e.g. "Just now", "2 hours ago"
  relatedItem: string; // e.g. "HackNova 2026 Registration Portal"
  category?: 'task' | 'event' | 'attendance' | 'hours';
}

export interface Announcement {
  id: string;
  title: string;
  content: string; // Message content
  message?: string; // alias for message
  postedBy: string;
  authorRole: string;
  authorAvatar?: string;
  department: DepartmentType | 'General';
  audience?: 'All Members' | 'Specific Department';
  targetDepartment?: DepartmentType;
  date: string; // e.g. "Oct 14, 2026 at 09:30 AM" or "Today, 09:30 AM"
  priority: 'Normal' | 'Important' | 'Urgent';
  pinned?: boolean;
}

export interface DepartmentInfo {
  id: string;
  name: DepartmentType;
  shortDesc: string;
  description: string;
  leadName: string;
  coLeadName: string;
  memberCount: number;
  activeTasksCount: number;
  upcomingEventsCount: number;
  tools: string[];
  colorTheme: string;
}

export interface ClubNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'task' | 'event' | 'announcement' | 'attendance';
  linkTab?: string;
  itemId?: string; // e.g. ID of task, event, or announcement to trigger detail modal
}
