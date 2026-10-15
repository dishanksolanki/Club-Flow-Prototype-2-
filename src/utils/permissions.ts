import { DepartmentType, HierarchyRole, Member, Task, WorkingHourRecord } from '../types';

export interface RoleConfig {
  role: HierarchyRole;
  rank: number; // 1 = Faculty Advisor, 8 = Department Member
  category: 'Faculty' | 'Executive' | 'Operations Leadership' | 'Department Leadership' | 'General Member';
  badgeColor: string;
  tagline: string;
  description: string;
  canManageClubWide: boolean;
  canManageMembers: boolean;
  canAssignTasksAnyDept: boolean;
  canAssignTasksDept: boolean;
  canReviewTasksAnyDept: boolean;
  canReviewTasksDept: boolean;
  canCreateEvents: boolean;
  canManageAttendance: boolean;
  canVerifyHours: boolean;
  canPostClubAnnouncements: boolean;
  canPostDeptAnnouncements: boolean;
  canDeleteOrArchive: boolean;
  isAdvisoryOnly: boolean;
}

export const ROLE_CONFIGURATIONS: Record<HierarchyRole, RoleConfig> = {
  'Faculty Advisor': {
    role: 'Faculty Advisor',
    rank: 1,
    category: 'Faculty',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    tagline: 'Institutional Governance & Academic Oversight',
    description: 'View all club information, oversee activities, review student proposals, and ensure alignment with university policies.',
    canManageClubWide: true,
    canManageMembers: false, // advisory oversight
    canAssignTasksAnyDept: false,
    canAssignTasksDept: false,
    canReviewTasksAnyDept: true,
    canReviewTasksDept: true,
    canCreateEvents: false,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: true,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: false,
    isAdvisoryOnly: true,
  },
  'President': {
    role: 'President',
    rank: 2,
    category: 'Executive',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    tagline: 'Overall Executive Leadership & Club Administration',
    description: 'Manage club-wide activities, oversee all departments and members, authorize major events, and direct institutional partnerships.',
    canManageClubWide: true,
    canManageMembers: true,
    canAssignTasksAnyDept: true,
    canAssignTasksDept: true,
    canReviewTasksAnyDept: true,
    canReviewTasksDept: true,
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: true,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: true,
    isAdvisoryOnly: false,
  },
  'Vice President': {
    role: 'Vice President',
    rank: 3,
    category: 'Executive',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    tagline: 'Executive Secretariat & Cross-Functional Operations',
    description: 'Assist the President, manage delegated club-wide initiatives, monitor member engagement, and coordinate inter-department roadmaps.',
    canManageClubWide: true,
    canManageMembers: true,
    canAssignTasksAnyDept: true,
    canAssignTasksDept: true,
    canReviewTasksAnyDept: true,
    canReviewTasksDept: true,
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: true,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: true,
    isAdvisoryOnly: false,
  },
  'Head': {
    role: 'Head',
    rank: 4,
    category: 'Operations Leadership',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    tagline: 'Club Operations & Program Coordination',
    description: 'Manage assigned club operations, drive event logistics, supervise cross-department milestones, and support core committee leads.',
    canManageClubWide: true,
    canManageMembers: true,
    canAssignTasksAnyDept: true,
    canAssignTasksDept: true,
    canReviewTasksAnyDept: true,
    canReviewTasksDept: true,
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: true,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: false,
    isAdvisoryOnly: false,
  },
  'Co-Head': {
    role: 'Co-Head',
    rank: 5,
    category: 'Operations Leadership',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    tagline: 'Operations Logistics & Program Management Support',
    description: 'Assist the Operations Head, manage operational workflows, handle vendor and venue communications, and support committee execution.',
    canManageClubWide: false,
    canManageMembers: true,
    canAssignTasksAnyDept: true,
    canAssignTasksDept: true,
    canReviewTasksAnyDept: true,
    canReviewTasksDept: true,
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: true,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: false,
    isAdvisoryOnly: false,
  },
  'Department Head': {
    role: 'Department Head',
    rank: 6,
    category: 'Department Leadership',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    tagline: 'Department Leadership & Project Delivery',
    description: 'Assign, manage, and review deliverables within their specific department. Verify working hours for department members.',
    canManageClubWide: false,
    canManageMembers: false, // cannot manage other members outside departmental task reviews
    canAssignTasksAnyDept: false,
    canAssignTasksDept: true, // within their department
    canReviewTasksAnyDept: false,
    canReviewTasksDept: true, // within their department
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: false,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: false,
    isAdvisoryOnly: false,
  },
  'Department Co-Head': {
    role: 'Department Co-Head',
    rank: 7,
    category: 'Department Leadership',
    badgeColor: 'bg-lime-100 text-lime-800 border-lime-200',
    tagline: 'Department Execution & Technical Mentorship',
    description: 'Assist the Department Head in task assignment, member mentorship, and deliverable reviews within the department.',
    canManageClubWide: false,
    canManageMembers: false,
    canAssignTasksAnyDept: false,
    canAssignTasksDept: true, // within their department
    canReviewTasksAnyDept: false,
    canReviewTasksDept: true, // within their department
    canCreateEvents: true,
    canManageAttendance: true,
    canVerifyHours: true,
    canPostClubAnnouncements: false,
    canPostDeptAnnouncements: true,
    canDeleteOrArchive: false,
    isAdvisoryOnly: false,
  },
  'Department Member': {
    role: 'Department Member',
    rank: 8,
    category: 'General Member',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    tagline: 'Project Execution & Active Contributor',
    description: 'View assigned tasks, work on deliverables, submit progress, log working hours, and view relevant club announcements and activities.',
    canManageClubWide: false,
    canManageMembers: false,
    canAssignTasksAnyDept: false,
    canAssignTasksDept: false,
    canReviewTasksAnyDept: false,
    canReviewTasksDept: false,
    canCreateEvents: false,
    canManageAttendance: false,
    canVerifyHours: false,
    canPostClubAnnouncements: false,
    canPostDeptAnnouncements: false,
    canDeleteOrArchive: false,
    isAdvisoryOnly: false,
  },
};

/**
 * Check if the user is authorized to assign a task
 */
export function canUserAssignTask(user: Member, targetDept?: DepartmentType): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.isAdvisoryOnly) {
    return {
      allowed: false,
      reason: 'As Faculty Advisor, your role is advisory and oversight. Direct task creation is handled by Student Executive & Department Leads.',
    };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members can view, execute, and submit their own assigned tasks, but cannot assign tasks to other members.',
    };
  }

  if (cfg.canAssignTasksAnyDept) {
    return { allowed: true };
  }

  if (cfg.canAssignTasksDept) {
    if (!targetDept || targetDept === user.department) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `As ${user.hierarchyRole} of ${user.department}, you can only assign tasks within your department. Cross-department tasks require President or Operations Head authorization.`,
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) is not authorized to create or assign tasks.`,
  };
}

/**
 * Check if the user is authorized to review or approve/reject a task
 */
export function canUserReviewTask(user: Member, task: Task): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  // Department members cannot review tasks (they can only submit their own)
  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members can only submit their own deliverables. Task evaluation and approval are reserved for Department Leads and Executives.',
    };
  }

  if (cfg.canReviewTasksAnyDept) {
    return { allowed: true };
  }

  if (cfg.canReviewTasksDept) {
    if (task.department === user.department) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `As ${user.hierarchyRole} of ${user.department}, you can only review tasks belonging to the ${user.department} Department. This task belongs to ${task.department}.`,
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) does not have permission to review this task.`,
  };
}

/**
 * Check if the user is authorized to manage other members (e.g., add member, change roles)
 */
export function canUserManageMembers(user: Member): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.canManageMembers) {
    return { allowed: true };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members cannot manage other members or modify club roster entries. This control is reserved for Executive Leadership.',
    };
  }

  if (cfg.role === 'Department Head' || cfg.role === 'Department Co-Head') {
    return {
      allowed: false,
      reason: 'Department Leads manage departmental deliverables. Modifying member profiles or onboarding new members requires President or Operations Head permissions.',
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) cannot modify membership records.`,
  };
}

/**
 * Check if user is authorized to create a club event
 */
export function canUserCreateEvent(user: Member): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.canCreateEvents) {
    return { allowed: true };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members cannot schedule official club events. Please consult your Department Head or Event Management lead.',
    };
  }

  if (cfg.isAdvisoryOnly) {
    return {
      allowed: false,
      reason: 'Faculty Advisors review and sanction student events rather than creating event schedules directly.',
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) cannot create events.`,
  };
}

/**
 * Check if user is authorized to verify working hours
 */
export function canUserVerifyHours(user: Member, record?: WorkingHourRecord): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members can log their own working hours, but cannot verify other members\' hours.',
    };
  }

  if (cfg.canManageClubWide || cfg.canAssignTasksAnyDept) {
    return { allowed: true };
  }

  if (cfg.canVerifyHours) {
    if (!record || record.department === user.department) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `As ${user.hierarchyRole} of ${user.department}, you can only verify hours for members of your department. This record is for ${record.department}.`,
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) cannot verify hours.`,
  };
}

/**
 * Check if user is authorized to mark or modify attendance
 */
export function canUserManageAttendance(user: Member): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members cannot mark or edit attendance registers. Attendance is recorded by Department Leads and Event Coordinators.',
    };
  }

  if (cfg.canManageAttendance) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) cannot manage attendance registers.`,
  };
}

/**
 * Check if user is authorized to post an announcement
 */
export function canUserPostAnnouncement(
  user: Member,
  audience?: 'All Members' | 'Specific Department',
  targetDept?: DepartmentType
): {
  allowed: boolean;
  reason?: string;
} {
  const cfg = ROLE_CONFIGURATIONS[user.hierarchyRole];
  if (!cfg) {
    return { allowed: false, reason: 'Unrecognized user role.' };
  }

  if (cfg.role === 'Department Member') {
    return {
      allowed: false,
      reason: 'Department Members cannot broadcast club announcements. Please submit notices through your Department Head.',
    };
  }

  if (audience === 'All Members' || !audience) {
    if (cfg.canPostClubAnnouncements) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `As ${user.hierarchyRole}, you can broadcast announcements to your department (${user.department}), but club-wide broadcasts require President, Vice President, or Operations Head approval.`,
    };
  }

  // Department announcement
  if (cfg.canPostClubAnnouncements) {
    return { allowed: true };
  }

  if (cfg.canPostDeptAnnouncements) {
    if (!targetDept || targetDept === user.department) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `As ${user.hierarchyRole} of ${user.department}, you can only post announcements to ${user.department}, not ${targetDept}.`,
    };
  }

  return {
    allowed: false,
    reason: `Your role (${user.hierarchyRole}) cannot post announcements.`,
  };
}

/**
 * Check if user is authorized to access and perform actions in the Club Management Panel.
 * President, Vice President, Head, Co-Head have management privileges.
 * Faculty Advisor has read-only oversight.
 * Department-level roles do not receive unrestricted club-wide management access.
 */
export function canAccessManagementPanel(user: Member): {
  allowed: boolean;
  reason?: string;
  isReadOnly?: boolean;
} {
  const role = user.hierarchyRole;
  if (role === 'President' || role === 'Vice President' || role === 'Head' || role === 'Co-Head') {
    return { allowed: true, isReadOnly: false };
  }
  if (role === 'Faculty Advisor') {
    return {
      allowed: true,
      isReadOnly: true,
      reason: 'Faculty Advisor has read-only institutional governance oversight.',
    };
  }
  return {
    allowed: false,
    reason: `Access Restricted: ${role} does not have club-wide administrative privileges. The Management Panel is reserved for Executive Leadership (President, Vice President, Head, Co-Head) and Faculty Advisor.`,
  };
}
