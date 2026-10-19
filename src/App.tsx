import React, { useState, useEffect } from 'react';
import { NavTab, Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { TasksPage } from './pages/TasksPage';
import { AttendancePage } from './pages/AttendancePage';
import { WorkingHoursPage } from './pages/WorkingHoursPage';
import { MembersPage } from './pages/MembersPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { HierarchyPage } from './pages/HierarchyPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ManagementPage } from './pages/ManagementPage';

// Modals
import { CreateTaskModal } from './components/modals/CreateTaskModal';
import { LogHoursModal } from './components/modals/LogHoursModal';
import { CreateAnnouncementModal } from './components/modals/CreateAnnouncementModal';
import { CreateEventModal } from './components/modals/CreateEventModal';
import { MemberDetailModal } from './components/modals/MemberDetailModal';
import { TaskDetailModal } from './components/modals/TaskDetailModal';
import { EventDetailModal } from './components/modals/EventDetailModal';
import { AnnouncementDetailModal } from './components/modals/AnnouncementDetailModal';
import { UnauthorizedModal } from './components/common/UnauthorizedModal';
import { CreateMemberModal } from './components/modals/CreateMemberModal';
import { AuthModal } from './components/modals/AuthModal';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import {
  profilesService,
  departmentsService,
  tasksService,
  eventsService,
  attendanceService,
  workingHoursService,
  announcementsService,
  notificationsService,
  clubSettingsService,
} from './services';
import {
  mapProfileToMember,
  mapDepartmentToInfo,
  mapTaskToModel,
  mapEventToModel,
  mapAttendanceToModel,
  mapWorkingHourToModel,
  mapAnnouncementToModel,
  mapNotificationToModel,
  mapClubSettingsToModel,
} from './utils/supabaseMappers';
import {
  canUserAssignTask,
  canUserCreateEvent,
  canUserManageAttendance,
  canUserManageMembers,
  canUserPostAnnouncement,
  canUserReviewTask,
  canUserVerifyHours,
} from './utils/permissions';
import { AlertCircle, X } from 'lucide-react';

// Mock Data
import {
  CURRENT_USER,
  MEMBERS,
  DEPARTMENTS,
  TASKS,
  EVENTS,
  ATTENDANCE_HISTORY,
  WORKING_HOURS_LOG,
  ANNOUNCEMENTS,
  NOTIFICATIONS,
  INITIAL_ACTIVITIES,
  DEFAULT_CLUB_SETTINGS,
} from './data/mockData';

import {
  DepartmentType,
  DepartmentInfo,
  Member,
  Task,
  TaskStatus,
  ClubEvent,
  AttendanceRecord,
  AttendanceStatus,
  WorkingHourRecord,
  Announcement,
  ClubNotification,
  ActivityItem,
  HierarchyRole,
  ClubSettings,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('Dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Core application states
  const [currentUser, setCurrentUser] = useState<Member>(CURRENT_USER);
  const [members, setMembers] = useState<Member[]>(MEMBERS);
  const [departments, setDepartments] = useState<DepartmentInfo[]>(DEPARTMENTS);
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [events, setEvents] = useState<ClubEvent[]>(EVENTS);
  const [workingHours, setWorkingHours] = useState<WorkingHourRecord[]>(WORKING_HOURS_LOG);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(ATTENDANCE_HISTORY);
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<ClubNotification[]>(NOTIFICATIONS);
  const [clubSettings, setClubSettings] = useState<ClubSettings>(DEFAULT_CLUB_SETTINGS);

  // Modal visibility states
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isLogHoursOpen, setIsLogHoursOpen] = useState(false);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isCreateMemberOpen, setIsCreateMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ClubEvent | null>(null);
  const [selectedAnnouncementForDetail, setSelectedAnnouncementForDetail] = useState<Announcement | null>(null);

  // Unauthorized Action Feedback State
  const [unauthorizedState, setUnauthorizedState] = useState<{
    isOpen: boolean;
    actionTitle: string;
    reason?: string;
    recommendedRole?: HierarchyRole;
  }>({
    isOpen: false,
    actionTitle: '',
  });

  const triggerUnauthorized = (
    actionTitle: string,
    reason?: string,
    recommendedRole: HierarchyRole = 'President'
  ) => {
    setUnauthorizedState({
      isOpen: true,
      actionTitle,
      reason,
      recommendedRole,
    });
  };

  const handleSelectPersona = (member: Member) => {
    setCurrentUser(member);
  };

  const handleSwitchToRecommendedRole = (role: HierarchyRole) => {
    const match = members.find((m) => m.hierarchyRole === role);
    if (match) {
      setCurrentUser(match);
    }
  };

  // Database Error & Feedback Toast State
  const [dbErrorToast, setDbErrorToast] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const showDatabaseErrorToast = (title: string, description: string) => {
    setDbErrorToast({ title, description });
    const errNotif: ClubNotification = {
      id: `err-${Date.now()}`,
      title,
      message: description,
      timestamp: 'Just now',
      read: false,
      type: 'task',
      linkTab: 'Tasks',
    };
    setNotifications((prev) => [errNotif, ...prev]);

    setTimeout(() => {
      setDbErrorToast((cur) => (cur?.title === title ? null : cur));
    }, 6000);
  };

  // Supabase Authentication & Real Data States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState(false);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const loadDataFromSupabase = async () => {
    if (!isConfigured || !supabase) return;
    setIsSupabaseLoading(true);
    try {
      // 1. Fetch departments, profiles, and club settings in parallel
      const [deptRes, profRes, settingsRes] = await Promise.all([
        departmentsService.getDepartments(),
        profilesService.getProfiles(),
        clubSettingsService.getSettings(),
      ]);

      const isSchemaUninitialized =
        deptRes.error?.message?.includes('schema cache') ||
        deptRes.error?.message?.includes('does not exist');

      if (isSchemaUninitialized) {
        console.info(
          '[ClubFlow] Supabase backend connected, but database tables are not initialized yet. Running in Demo Mode.'
        );
        return;
      }

      const rawDepts = deptRes.data || [];
      const rawProfs = profRes.data || [];

      if (deptRes.data) {
        const mappedDepts = rawDepts.map((d) => mapDepartmentToInfo(d, rawProfs));
        setDepartments(mappedDepts);
      }

      if (profRes.data) {
        const mappedMembers = rawProfs.map((p) => mapProfileToMember(p, departments));
        setMembers(mappedMembers);

        // Check if user session is active
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setIsSupabaseAuth(true);
          const activeProfile = rawProfs.find((p) => p.id === sessionData.session!.user.id);
          if (activeProfile) {
            setCurrentUser(mapProfileToMember(activeProfile, departments));
          }
        }
      }

      if (settingsRes.data) {
        setClubSettings(mapClubSettingsToModel(settingsRes.data));
      }

      // 2. Fetch tasks, events, attendance, hours, and announcements
      const [taskRes, eventRes, attRes, hourRes, annRes] = await Promise.all([
        tasksService.getTasks(),
        eventsService.getEvents(),
        attendanceService.getAttendanceRecords(),
        workingHoursService.getWorkingHours(),
        announcementsService.getAnnouncements(),
      ]);

      if (taskRes.data) {
        setTasks(taskRes.data.map((t) => mapTaskToModel(t, rawProfs, rawDepts, (t as any).submission)));
      }
      if (eventRes.data) {
        setEvents(eventRes.data.map((e) => mapEventToModel(e, rawProfs, rawDepts)));
      }
      if (attRes.data) {
        setAttendanceRecords(attRes.data.map((a) => mapAttendanceToModel(a, rawProfs, rawDepts)));
      }
      if (hourRes.data) {
        setWorkingHours(hourRes.data.map((h) => mapWorkingHourToModel(h, rawProfs, rawDepts)));
      }
      if (annRes.data) {
        setAnnouncements(annRes.data.map((a) => mapAnnouncementToModel(a, rawProfs, rawDepts)));
      }

      // 3. User notifications
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const notifRes = await notificationsService.getNotifications(sessionData.session.user.id);
        if (notifRes.data) {
          setNotifications(notifRes.data.map(mapNotificationToModel));
        }
      }
    } catch (err) {
      console.warn('[ClubFlow] Notice during Supabase sync:', err);
    } finally {
      setIsSupabaseLoading(false);
    }
  };

  useEffect(() => {
    if (!isConfigured || !supabase) return;

    loadDataFromSupabase();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsSupabaseAuth(true);
        const { data: prof } = await profilesService.getProfileById(session.user.id);
        if (prof) {
          setCurrentUser(mapProfileToMember(prof, departments));
        }
      } else {
        setIsSupabaseAuth(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setIsSupabaseAuth(false);
      setCurrentUser(CURRENT_USER);
    }
  };

  useEffect(() => {
    document.title = `${clubSettings.name} | ClubFlow`;
  }, [clubSettings.name]);

  const departmentsList: DepartmentType[] = departments.map((d) => d.name);

  // Helper to record an activity
  const recordActivity = (action: string, member: string, relatedItem: string, category: 'task' | 'event' | 'attendance' | 'hours') => {
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      action,
      member,
      relatedItem,
      timestamp: 'Just now',
      category,
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Helper to sync member tasks completed count
  const incrementMemberTasksCompleted = (assigneeName: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        const isMatch =
          m.name.toLowerCase() === assigneeName.toLowerCase() ||
          assigneeName.toLowerCase().includes(m.name.toLowerCase().split(' ')[0]);
        return isMatch ? { ...m, tasksCompleted: m.tasksCompleted + 1 } : m;
      })
    );
    if (
      currentUser.name.toLowerCase() === assigneeName.toLowerCase() ||
      assigneeName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
    ) {
      setCurrentUser((prev) => ({ ...prev, tasksCompleted: prev.tasksCompleted + 1 }));
    }
  };

  // Helper to sync member attendance rate
  const syncMemberAttendanceRate = (memberName: string, updatedRecords: AttendanceRecord[]) => {
    const memberRecords = updatedRecords.filter(
      (r) =>
        r.member.toLowerCase() === memberName.toLowerCase() ||
        r.member.toLowerCase().includes(memberName.toLowerCase().split(' ')[0])
    );
    if (memberRecords.length === 0) return;
    const attended = memberRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length;
    const newRate = Math.round((attended / memberRecords.length) * 100);

    setMembers((prev) =>
      prev.map((m) => {
        const isMatch =
          m.name.toLowerCase() === memberName.toLowerCase() ||
          memberName.toLowerCase().includes(m.name.toLowerCase().split(' ')[0]);
        return isMatch ? { ...m, attendanceRate: newRate } : m;
      })
    );
    if (
      currentUser.name.toLowerCase() === memberName.toLowerCase() ||
      memberName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
    ) {
      setCurrentUser((prev) => ({ ...prev, attendanceRate: newRate }));
    }
  };

  // Actions
  const handleUpdateTask = async (updatedTask: Task) => {
    const prevTask = tasks.find((t) => t.id === updatedTask.id);
    const wasCompleted = prevTask?.status === 'Completed' || prevTask?.status === 'Approved';
    const isNowCompleted = updatedTask.status === 'Completed' || updatedTask.status === 'Approved';

    // Optimistic UI state update
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTaskForDetail?.id === updatedTask.id) {
      setSelectedTaskForDetail(updatedTask);
    }

    if (updatedTask.status === 'Submitted') {
      recordActivity('Task submitted', currentUser.name, updatedTask.title, 'task');
    } else if (isNowCompleted) {
      recordActivity('Task completed', currentUser.name, updatedTask.title, 'task');
      if (!wasCompleted) {
        incrementMemberTasksCompleted(updatedTask.assignedTo);
      }
    }

    // Persist to Supabase if configured & authenticated
    if (isConfigured && isSupabaseAuth && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const actorId = sessionData?.session?.user?.id || currentUser.id;

      // 1. Deliverable submission
      if (
        updatedTask.status === 'Submitted' &&
        prevTask?.status !== 'Submitted' &&
        updatedTask.submission
      ) {
        const { error } = await tasksService.submitDeliverable({
          task_id: updatedTask.id,
          submitted_by: actorId,
          submission_link: updatedTask.submission.submissionLink,
          submission_notes: updatedTask.submission.submissionNotes,
        });

        if (error) {
          if (prevTask) {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? prevTask : t)));
            if (selectedTaskForDetail?.id === updatedTask.id) {
              setSelectedTaskForDetail(prevTask);
            }
          }
          showDatabaseErrorToast('Failed to save deliverable submission', error.message);
          return;
        }
      }
      // 2. Deliverable review (Approval or Rejection)
      else if (
        (updatedTask.status === 'Approved' || updatedTask.status === 'Rejected') &&
        updatedTask.submission?.reviewStatus === updatedTask.status &&
        prevTask?.submission?.reviewStatus !== updatedTask.status
      ) {
        const { error } = await tasksService.reviewSubmission({
          task_id: updatedTask.id,
          reviewed_by: actorId,
          review_status: updatedTask.status as 'Approved' | 'Rejected',
          review_comment: updatedTask.submission?.reviewComment,
        });

        if (error) {
          if (prevTask) {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? prevTask : t)));
            if (selectedTaskForDetail?.id === updatedTask.id) {
              setSelectedTaskForDetail(prevTask);
            }
          }
          showDatabaseErrorToast('Failed to save submission review', error.message);
          return;
        }
      }
      // 3. Status update
      else if (updatedTask.status !== prevTask?.status) {
        const { error } = await tasksService.updateTaskStatus(
          updatedTask.id,
          updatedTask.status,
          actorId
        );

        if (error) {
          if (prevTask) {
            setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? prevTask : t)));
            if (selectedTaskForDetail?.id === updatedTask.id) {
              setSelectedTaskForDetail(prevTask);
            }
          }
          showDatabaseErrorToast('Failed to update task status in Supabase', error.message);
          return;
        }
      }
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const prevTask = tasks.find((t) => t.id === taskId);
    if (!prevTask || prevTask.status === newStatus) return;

    const wasCompleted = prevTask.status === 'Completed' || prevTask.status === 'Approved';
    const isNowCompleted = newStatus === 'Completed' || newStatus === 'Approved';

    const newEvent = {
      id: `act-${Date.now()}`,
      action: `Status changed to ${newStatus}`,
      actor: currentUser.name,
      timestamp: 'Just now',
    };

    const updatedTask: Task = {
      ...prevTask,
      status: newStatus,
      history: [...(prevTask.history || []), newEvent],
    };

    // Optimistic UI state update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    if (selectedTaskForDetail?.id === taskId) {
      setSelectedTaskForDetail(updatedTask);
    }

    if (newStatus === 'Submitted') {
      recordActivity('Task submitted', currentUser.name, prevTask.title, 'task');
    } else if (isNowCompleted) {
      recordActivity('Task completed', currentUser.name, prevTask.title, 'task');
      if (!wasCompleted) {
        incrementMemberTasksCompleted(prevTask.assignedTo);
      }
    }

    // Push local notification for approvals/rejections
    if (newStatus === 'Approved') {
      const notif: ClubNotification = {
        id: `notif-${Date.now()}`,
        title: 'Task Approved',
        message: `${currentUser.name} approved "${prevTask.title}".`,
        timestamp: 'Just now',
        read: false,
        type: 'task',
        linkTab: 'Tasks',
        itemId: prevTask.id,
      };
      setNotifications((prevNotifs) => [notif, ...prevNotifs]);
    } else if (newStatus === 'Rejected') {
      const notif: ClubNotification = {
        id: `notif-${Date.now()}`,
        title: 'Task Needs Revision',
        message: `"${prevTask.title}" was marked as needing changes.`,
        timestamp: 'Just now',
        read: false,
        type: 'task',
        linkTab: 'Tasks',
        itemId: prevTask.id,
      };
      setNotifications((prevNotifs) => [notif, ...prevNotifs]);
    }

    // Persist to Supabase if configured & authenticated
    if (isConfigured && isSupabaseAuth && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const actorId = sessionData?.session?.user?.id || currentUser.id;

      const { error } = await tasksService.updateTaskStatus(taskId, newStatus, actorId);
      if (error) {
        // Roll back failed optimistic update
        setTasks((prev) => prev.map((t) => (t.id === taskId ? prevTask : t)));
        if (selectedTaskForDetail?.id === taskId) {
          setSelectedTaskForDetail(prevTask);
        }
        showDatabaseErrorToast('Failed to update task status in Supabase', error.message);
      }
    }
  };

  const handleAddTask = async (newTask: Task) => {
    // Optimistic UI update
    setTasks((prev) => [newTask, ...prev]);
    recordActivity('Task assigned', currentUser.name, `${newTask.title} → ${newTask.assignedTo}`, 'task');

    const notif: ClubNotification = {
      id: `notif-${Date.now()}`,
      title: 'Task Assigned',
      message: `"${newTask.title}" assigned to ${newTask.assignedTo}.`,
      timestamp: 'Just now',
      read: false,
      type: 'task',
      linkTab: 'Tasks',
      itemId: newTask.id,
    };
    setNotifications((prev) => [notif, ...prev]);

    // Persist to Supabase if configured & authenticated
    if (isConfigured && isSupabaseAuth && supabase) {
      const dept = departments.find((d) => d.name === newTask.department || d.id === (newTask as any).department_id);
      const assignee = members.find((m) => m.name === newTask.assignedTo || m.id === (newTask as any).assigned_to);

      if (!dept || !assignee) {
        console.warn('Could not map department or assignee UUID for Supabase persistence');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const creatorId = sessionData?.session?.user?.id || currentUser.id;

      const { data, error } = await tasksService.createTask({
        title: newTask.title,
        description: newTask.description,
        department_id: dept.id,
        assigned_by: creatorId,
        assigned_to: assignee.id,
        deadline: newTask.deadline,
        priority: newTask.priority,
        status: newTask.status,
      });

      if (error) {
        // Roll back failed optimistic update
        setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
        showDatabaseErrorToast('Failed to create task in Supabase', error.message);
      } else if (data) {
        // Replace temporary client ID with real Supabase generated ID and timestamps
        setTasks((prev) =>
          prev.map((t) =>
            t.id === newTask.id
              ? {
                  ...t,
                  id: data.id,
                  createdAt: data.created_at,
                }
              : t
          )
        );
      }
    }
  };

  const handleLogHours = async (record: WorkingHourRecord) => {
    // Optimistic UI update
    setWorkingHours((prev) => [record, ...prev]);
    recordActivity('Work record added', record.member, `${record.project} (${record.hours}h)`, 'hours');
    // update member working hours in members list
    setMembers((prev) =>
      prev.map((m) => {
        if (m.name.toLowerCase() === record.member.toLowerCase() || record.member.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])) {
          return {
            ...m,
            workingHours: parseFloat((m.workingHours + record.hours).toFixed(1)),
          };
        }
        return m;
      })
    );
    // update current user if matching
    if (record.member.toLowerCase() === currentUser.name.toLowerCase() || record.member.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])) {
      setCurrentUser((prev) => ({
        ...prev,
        workingHours: parseFloat((prev.workingHours + record.hours).toFixed(1)),
      }));
    }

    // Persist to Supabase if configured & authenticated
    if (isConfigured && isSupabaseAuth && supabase) {
      const member = members.find((m) => m.name.toLowerCase() === record.member.toLowerCase() || m.id === record.id);
      const dept = departments.find((d) => d.name === record.department);
      const { data: sessionData } = await supabase.auth.getSession();
      const memberId = sessionData?.session?.user?.id || member?.id || currentUser.id;
      const deptId = dept?.id;

      if (!deptId) return;

      const { data, error } = await workingHoursService.logHours({
        member_id: memberId,
        department_id: deptId,
        project: record.project,
        log_date: record.date,
        start_time: record.startTime,
        end_time: record.endTime,
        description: record.description,
        hours: record.hours,
      });

      if (error) {
        // Roll back failed optimistic update
        setWorkingHours((prev) => prev.filter((r) => r.id !== record.id));
        setMembers((prev) =>
          prev.map((m) => {
            if (m.name.toLowerCase() === record.member.toLowerCase()) {
              return {
                ...m,
                workingHours: parseFloat(Math.max(0, m.workingHours - record.hours).toFixed(1)),
              };
            }
            return m;
          })
        );
        showDatabaseErrorToast('Failed to save working hours log in Supabase', error.message);
      } else if (data) {
        setWorkingHours((prev) =>
          prev.map((r) => (r.id === record.id ? { ...r, id: data.id } : r))
        );
      }
    }
  };

  const handleUpdateWorkingHourStatus = async (recordId: string, status: 'Verified' | 'Pending Verification') => {
    const targetRecord = workingHours.find((r) => r.id === recordId);
    const perm = canUserVerifyHours(currentUser, targetRecord);
    if (!perm.allowed) {
      triggerUnauthorized('Verify Working Hours', perm.reason, 'Department Head');
      return;
    }
    const prevRecord = targetRecord;
    setWorkingHours((prev) =>
      prev.map((r) => {
        if (r.id === recordId) {
          if (status === 'Verified') {
            recordActivity('Work record added', currentUser.name, `Verified ${r.member}'s ${r.hours}h for ${r.project}`, 'hours');
          }
          return { ...r, status, verifiedBy: currentUser.name };
        }
        return r;
      })
    );

    if (isConfigured && isSupabaseAuth && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const verifiedById = sessionData?.session?.user?.id || currentUser.id;
      const { error } = await workingHoursService.verifyHours(recordId, status, verifiedById);
      if (error) {
        if (prevRecord) {
          setWorkingHours((prev) => prev.map((r) => (r.id === recordId ? prevRecord : r)));
        }
        showDatabaseErrorToast('Failed to update working hours status in Supabase', error.message);
      }
    }
  };

  const handleUpdateAttendanceStatus = async (recordId: string, newStatus: AttendanceStatus) => {
    const perm = canUserManageAttendance(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Mark Attendance Status', perm.reason, 'Department Head');
      return;
    }
    const targetRecord = attendanceRecords.find((r) => r.id === recordId);
    if (!targetRecord) return;
    const prevRecord = targetRecord;

    const updatedList = attendanceRecords.map((r) => {
      if (r.id === recordId) {
        recordActivity('Attendance marked', currentUser.name, `${r.member} marked ${newStatus} for ${r.eventName}`, 'attendance');
        return { ...r, status: newStatus };
      }
      return r;
    });
    setAttendanceRecords(updatedList);
    syncMemberAttendanceRate(targetRecord.member, updatedList);

    if (isConfigured && isSupabaseAuth && supabase) {
      const { error } = await attendanceService.updateAttendanceStatus(recordId, newStatus);
      if (error) {
        setAttendanceRecords((prev) => prev.map((r) => (r.id === recordId ? prevRecord : r)));
        syncMemberAttendanceRate(targetRecord.member, attendanceRecords);
        showDatabaseErrorToast('Failed to update attendance status in Supabase', error.message);
      }
    }
  };

  const handleAddAttendanceRecord = async (newRecord: AttendanceRecord) => {
    const perm = canUserManageAttendance(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Mark Attendance Record', perm.reason, 'Department Head');
      return;
    }
    const updatedList = [newRecord, ...attendanceRecords];
    setAttendanceRecords(updatedList);
    recordActivity('Attendance marked', currentUser.name, `${newRecord.member} marked ${newRecord.status} for ${newRecord.eventName}`, 'attendance');
    syncMemberAttendanceRate(newRecord.member, updatedList);

    if (isConfigured && isSupabaseAuth && supabase) {
      const member = members.find((m) => m.name.toLowerCase() === newRecord.member.toLowerCase());
      const dept = departments.find((d) => d.name === newRecord.department);
      const ev = events.find((e) => e.title.toLowerCase() === newRecord.eventName.toLowerCase() || e.id === newRecord.eventId);
      const { data: sessionData } = await supabase.auth.getSession();
      const recordedBy = sessionData?.session?.user?.id || currentUser.id;

      if (!member || !dept) return;

      const { data, error } = await attendanceService.addAttendanceRecord({
        event_id: ev?.id || newRecord.eventId || null,
        event_name: newRecord.eventName,
        record_date: newRecord.date,
        member_id: member.id,
        department_id: dept.id,
        check_in_time: newRecord.checkInTime,
        status: newRecord.status,
        recorded_by: recordedBy,
        session_type: newRecord.type || 'General Meeting',
        duration_hours: newRecord.durationHours,
        notes: newRecord.notes,
      });

      if (error) {
        setAttendanceRecords((prev) => prev.filter((r) => r.id !== newRecord.id));
        showDatabaseErrorToast('Failed to save attendance record in Supabase', error.message);
      } else if (data) {
        setAttendanceRecords((prev) =>
          prev.map((r) => (r.id === newRecord.id ? { ...r, id: data.id } : r))
        );
      }
    }
  };

  const handleRequestCreateTask = () => {
    const perm = canUserAssignTask(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Create / Assign Task', perm.reason, 'Department Head');
      return;
    }
    setIsCreateTaskOpen(true);
  };

  const handleRequestCreateEvent = () => {
    const perm = canUserCreateEvent(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Schedule Event', perm.reason, 'President');
      return;
    }
    setIsCreateEventOpen(true);
  };

  const handleRequestCreateAnnouncement = () => {
    const perm = canUserPostAnnouncement(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Post Announcement', perm.reason, 'Department Head');
      return;
    }
    setIsCreateAnnouncementOpen(true);
  };

  const handleAddMember = (newMember: Member) => {
    const perm = canUserManageMembers(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Onboard Member', perm.reason, 'President');
      return;
    }
    setMembers((prev) => [newMember, ...prev]);
    setIsCreateMemberOpen(false);
    recordActivity('Member onboarded', currentUser.name, `${newMember.name} (${newMember.role})`, 'event');
  };

  const handleUpdateClubSettings = async (newSettings: ClubSettings) => {
    const prevSettings = clubSettings;
    setClubSettings(newSettings);
    recordActivity('Club settings updated', currentUser.name, newSettings.name, 'event');

    if (isConfigured && isSupabaseAuth && supabase) {
      const { error } = await clubSettingsService.updateSettings({
        name: newSettings.name,
        description: newSettings.description,
        academic_year: newSettings.academicYear,
        contact_email: newSettings.contactEmail,
        brand_tag: newSettings.brandTag,
      });

      if (error) {
        setClubSettings(prevSettings);
        showDatabaseErrorToast('Failed to save club settings in Supabase', error.message);
      }
    }
  };

  const handleUpdateMember = async (updatedMember: Member) => {
    const prevMember = members.find((m) => m.id === updatedMember.id);
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    if (currentUser.id === updatedMember.id) {
      setCurrentUser(updatedMember);
    }
    recordActivity('Member credentials updated', currentUser.name, `${updatedMember.name} (${updatedMember.hierarchyRole})`, 'event');

    if (isConfigured && isSupabaseAuth && supabase) {
      const dept = departments.find((d) => d.name === updatedMember.department);
      const { error } = await profilesService.updateProfile(updatedMember.id, {
        name: updatedMember.name,
        initials: updatedMember.initials,
        role: updatedMember.role,
        department_id: dept?.id || null,
        student_id: updatedMember.studentId,
        year: updatedMember.year,
        bio: updatedMember.bio,
        status: updatedMember.status,
      });

      if (error) {
        if (prevMember) {
          setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? prevMember : m)));
          if (currentUser.id === updatedMember.id) {
            setCurrentUser(prevMember);
          }
        }
        showDatabaseErrorToast('Failed to update member in Supabase', error.message);
      } else if (prevMember && prevMember.hierarchyRole !== updatedMember.hierarchyRole) {
        const { error: roleError } = await profilesService.updateMemberHierarchyRole(
          updatedMember.id,
          updatedMember.hierarchyRole
        );
        if (roleError) {
          showDatabaseErrorToast('Failed to update hierarchy role in Supabase', roleError.message);
        }
      }
    }
  };

  const handleAddDepartment = (newDept: DepartmentInfo) => {
    setDepartments((prev) => [...prev, newDept]);
    recordActivity('Department created', currentUser.name, newDept.name, 'event');
  };

  const handleUpdateDepartment = (updatedDept: DepartmentInfo) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === updatedDept.id ? updatedDept : d))
    );
    recordActivity('Department updated', currentUser.name, updatedDept.name, 'event');
  };

  const handleAddAnnouncement = async (newAnnouncement: Announcement) => {
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    recordActivity('Announcement posted', currentUser.name, newAnnouncement.title, 'event');
    const notif: ClubNotification = {
      id: `notif-${Date.now()}`,
      title: 'New Announcement',
      message: `${newAnnouncement.postedBy} posted "${newAnnouncement.title}"`,
      timestamp: 'Just now',
      read: false,
      type: 'announcement',
      linkTab: 'Announcements',
      itemId: newAnnouncement.id,
    };
    setNotifications((prev) => [notif, ...prev]);

    if (isConfigured && isSupabaseAuth && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const posterId = sessionData?.session?.user?.id || currentUser.id;
      const targetDept = newAnnouncement.targetDepartment
        ? departments.find((d) => d.name === newAnnouncement.targetDepartment)?.id
        : null;

      const { data, error } = await announcementsService.createAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content || newAnnouncement.message || '',
        posted_by: posterId,
        audience: newAnnouncement.audience || 'All Members',
        target_department_id: targetDept,
        priority: newAnnouncement.priority,
        pinned: newAnnouncement.pinned ?? false,
      });

      if (error) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== newAnnouncement.id));
        showDatabaseErrorToast('Failed to post announcement to Supabase', error.message);
      } else if (data) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === newAnnouncement.id ? { ...a, id: data.id } : a))
        );
      }
    }
  };

  const handleNotificationClick = (notif: ClubNotification) => {
    if (notif.linkTab) {
      setActiveTab(notif.linkTab as NavTab);
    }
    if (notif.itemId) {
      if (notif.type === 'task') {
        const found = tasks.find((t) => t.id === notif.itemId);
        if (found) setSelectedTaskForDetail(found);
      } else if (notif.type === 'event') {
        const found = events.find((e) => e.id === notif.itemId);
        if (found) setSelectedEventForDetail(found);
      } else if (notif.type === 'announcement') {
        const found = announcements.find((a) => a.id === notif.itemId);
        if (found) setSelectedAnnouncementForDetail(found);
      }
    }
  };

  const handleAddEvent = async (newEvent: ClubEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    recordActivity('Event created', currentUser.name, newEvent.title, 'event');
    const notif: ClubNotification = {
      id: `notif-${Date.now()}`,
      title: 'Upcoming Event',
      message: `"${newEvent.title}" on ${newEvent.date} at ${newEvent.venue}.`,
      timestamp: 'Just now',
      read: false,
      type: 'event',
      linkTab: 'Events',
      itemId: newEvent.id,
    };
    setNotifications((prev) => [notif, ...prev]);

    if (isConfigured && isSupabaseAuth && supabase) {
      const dept = departments.find((d) => d.name === newEvent.department);
      const organizer = members.find((m) => m.name.toLowerCase() === newEvent.organizer.toLowerCase());
      const { data: sessionData } = await supabase.auth.getSession();
      const organizerId = organizer?.id || sessionData?.session?.user?.id || currentUser.id;

      if (!dept) return;

      const { data, error } = await eventsService.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        event_date: newEvent.date,
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        venue: newEvent.venue,
        organizer_id: organizerId,
        department_id: dept.id,
        status: newEvent.status,
        capacity: newEvent.capacity,
        tags: newEvent.tags,
      });

      if (error) {
        setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
        showDatabaseErrorToast('Failed to schedule event in Supabase', error.message);
      } else if (data) {
        setEvents((prev) =>
          prev.map((e) => (e.id === newEvent.id ? { ...e, id: data.id } : e))
        );
      }
    }
  };

  const handleUpdateEvent = async (updatedEvent: ClubEvent) => {
    const prevEvent = events.find((e) => e.id === updatedEvent.id);
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    if (selectedEventForDetail?.id === updatedEvent.id) {
      setSelectedEventForDetail(updatedEvent);
    }

    if (isConfigured && isSupabaseAuth && supabase) {
      const { error } = await eventsService.updateEvent(updatedEvent.id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        event_date: updatedEvent.date,
        start_time: updatedEvent.startTime,
        end_time: updatedEvent.endTime,
        venue: updatedEvent.venue,
        status: updatedEvent.status,
        capacity: updatedEvent.capacity,
        tags: updatedEvent.tags,
      });

      if (error) {
        if (prevEvent) {
          setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? prevEvent : e)));
          if (selectedEventForDetail?.id === updatedEvent.id) {
            setSelectedEventForDetail(prevEvent);
          }
        }
        showDatabaseErrorToast('Failed to update event in Supabase', error.message);
      }
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (isConfigured && isSupabaseAuth && supabase) {
      notificationsService.markAsRead(id);
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isConfigured && isSupabaseAuth && supabase && currentUser.id) {
      notificationsService.markAllAsRead(currentUser.id);
    }
  };

  const handleUpdateCurrentUser = (updated: Partial<Member>) => {
    setCurrentUser((prev) => ({ ...prev, ...updated }));
  };

  const handleSelectMemberById = (id: string) => {
    const found = members.find((m) => m.id === id || m.name.includes(id));
    if (found) setSelectedMember(found);
  };

  // Pending counts for sidebar badges
  const pendingTasksCount = tasks.filter(
    (t) => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Rejected'
  ).length;

  const unreadAnnouncementsCount = notifications.filter(
    (n) => !n.read && n.type === 'announcement'
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        pendingTasksCount={pendingTasksCount}
        unreadAnnouncementsCount={unreadAnnouncementsCount}
        clubSettings={clubSettings}
      />

      {/* Mobile Drawer Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        pendingTasksCount={pendingTasksCount}
        unreadAnnouncementsCount={unreadAnnouncementsCount}
        clubSettings={clubSettings}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenMobileMenu={() => setIsMobileNavOpen(true)}
          currentUser={currentUser}
          notifications={notifications}
          onMarkNotificationAsRead={handleMarkNotificationAsRead}
          onClearAllNotifications={handleClearAllNotifications}
          onNotificationClick={handleNotificationClick}
          onGlobalSearchSelect={(type, id) => {
            setGlobalSearchQuery('');
            if (type === 'event') {
              const found = events.find((e) => e.id === id);
              if (found) setSelectedEventForDetail(found);
              setActiveTab('Events');
            } else if (type === 'task') {
              const found = tasks.find((t) => t.id === id);
              if (found) setSelectedTaskForDetail(found);
              setActiveTab('Tasks');
            } else if (type === 'member') {
              const found = members.find((m) => m.id === id);
              if (found) setSelectedMember(found);
              setActiveTab('Members');
            } else if (type === 'announcement') {
              const found = announcements.find((a) => a.id === id);
              if (found) setSelectedAnnouncementForDetail(found);
              setActiveTab('Announcements');
            }
          }}
          searchQuery={globalSearchQuery}
          onSearchQueryChange={setGlobalSearchQuery}
          allMembers={members}
          tasks={tasks}
          events={events}
          announcements={announcements}
          onSelectPersona={handleSelectPersona}
          clubSettings={clubSettings}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          isSupabaseAuth={isSupabaseAuth}
          onSignOut={handleSignOut}
          isConnectedToSupabase={isConfigured}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'Dashboard' && (
            <DashboardPage
              currentUser={currentUser}
              tasks={tasks}
              events={events}
              workingHours={workingHours}
              attendanceRecords={attendanceRecords}
              activities={activities}
              announcements={announcements}
              onNavigate={setActiveTab}
              onOpenCreateTask={handleRequestCreateTask}
              onOpenLogHours={() => setIsLogHoursOpen(true)}
              onOpenCreateAnnouncement={handleRequestCreateAnnouncement}
              onOpenCreateEvent={handleRequestCreateEvent}
              onSelectMember={handleSelectMemberById}
              onSelectEvent={(event) => setSelectedEventForDetail(event)}
              onSelectTask={(task) => setSelectedTaskForDetail(task)}
              onSelectAnnouncement={(ann) => setSelectedAnnouncementForDetail(ann)}
              clubSettings={clubSettings}
            />
          )}

          {activeTab === 'Events' && (
            <EventsPage
              events={events}
              onOpenCreateEvent={handleRequestCreateEvent}
              departments={departmentsList}
              members={members}
              tasks={tasks}
              currentUser={currentUser}
              attendanceRecords={attendanceRecords}
              onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
              onAddAttendanceRecord={handleAddAttendanceRecord}
              onUpdateEvent={handleUpdateEvent}
              onSelectTask={(task) => {
                setSelectedEventForDetail(null);
                setSelectedTaskForDetail(task);
              }}
              onSelectMember={(member) => {
                setSelectedEventForDetail(null);
                setSelectedMember(member);
              }}
              onSelectEvent={(event) => setSelectedEventForDetail(event)}
            />
          )}

          {activeTab === 'Tasks' && (
            <TasksPage
              tasks={tasks}
              onUpdateTaskStatus={handleUpdateTaskStatus}
              onUpdateTask={handleUpdateTask}
              onOpenCreateTask={handleRequestCreateTask}
              departments={departmentsList}
              members={members}
              currentUser={currentUser}
              onTriggerUnauthorized={triggerUnauthorized}
            />
          )}

          {activeTab === 'Attendance' && (
            <AttendancePage
              records={attendanceRecords}
              members={members}
              events={events}
              currentUser={currentUser}
              onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
              onAddAttendanceRecord={handleAddAttendanceRecord}
              onSelectMember={(m) => setSelectedMember(m)}
              onTriggerUnauthorized={triggerUnauthorized}
            />
          )}

          {activeTab === 'Working Hours' && (
            <WorkingHoursPage
              records={workingHours}
              members={members}
              currentUser={currentUser}
              onOpenLogHours={() => setIsLogHoursOpen(true)}
              onSelectMember={(m) => setSelectedMember(m)}
              onUpdateRecordStatus={handleUpdateWorkingHourStatus}
              onTriggerUnauthorized={triggerUnauthorized}
            />
          )}

          {activeTab === 'Members' && (
            <MembersPage
              members={members}
              departments={departmentsList}
              tasks={tasks}
              onSelectMember={(m) => setSelectedMember(m)}
              currentUser={currentUser}
              onAddMember={handleAddMember}
            />
          )}

          {activeTab === 'Departments' && (
            <DepartmentsPage
              departments={departments}
              members={members}
              tasks={tasks}
              events={events}
              onNavigate={setActiveTab}
              onSelectMember={(m) => setSelectedMember(m)}
              onSelectTask={(task) => setSelectedTaskForDetail(task)}
              onSelectEvent={(event) => setSelectedEventForDetail(event)}
            />
          )}

          {activeTab === 'Hierarchy' && (
            <HierarchyPage
              members={members}
              onSelectMember={(m) => setSelectedMember(m)}
              currentUser={currentUser}
              onSwitchPersona={handleSelectPersona}
            />
          )}

          {activeTab === 'Announcements' && (
            <AnnouncementsPage
              announcements={announcements}
              onOpenCreateAnnouncement={handleRequestCreateAnnouncement}
              departments={departmentsList}
              onSelectAnnouncement={(ann) => setSelectedAnnouncementForDetail(ann)}
            />
          )}

          {activeTab === 'Management' && (
            <ManagementPage
              currentUser={currentUser}
              members={members}
              departments={departments}
              events={events}
              tasks={tasks}
              attendanceRecords={attendanceRecords}
              workingHours={workingHours}
              clubSettings={clubSettings}
              onUpdateClubSettings={handleUpdateClubSettings}
              onUpdateMember={handleUpdateMember}
              onAddDepartment={handleAddDepartment}
              onUpdateDepartment={handleUpdateDepartment}
              onSelectMember={(m) => setSelectedMember(m)}
              onOpenOnboardMember={() => {
                const perm = canUserManageMembers(currentUser);
                if (!perm.allowed) {
                  triggerUnauthorized('Onboard Member', perm.reason, 'President');
                  return;
                }
                setIsCreateMemberOpen(true);
              }}
              onTriggerUnauthorized={triggerUnauthorized}
              onSwitchPersona={handleSelectPersona}
            />
          )}

          {activeTab === 'Profile' && (
            <ProfilePage
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              myTasks={tasks.filter((t) => {
                const assignee = t.assignedTo.toLowerCase();
                const currName = currentUser.name.toLowerCase();
                const firstName = currName.split(' ')[0];
                return assignee === currName || assignee.includes(firstName);
              })}
              myHours={workingHours.filter((h) => {
                const member = (h.member || '').toLowerCase();
                const currName = currentUser.name.toLowerCase();
                const firstName = currName.split(' ')[0];
                return member === currName || member.includes(firstName);
              })}
              allMembers={members}
              onSelectPersona={handleSelectPersona}
            />
          )}
        </main>
      </div>

      {/* Interactive Global Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onAddTask={handleAddTask}
        members={members}
        departments={departmentsList}
        currentUser={currentUser}
      />

      <LogHoursModal
        isOpen={isLogHoursOpen}
        onClose={() => setIsLogHoursOpen(false)}
        onLogHours={handleLogHours}
        currentUser={currentUser}
        departments={departmentsList}
        members={members}
      />

      <CreateAnnouncementModal
        isOpen={isCreateAnnouncementOpen}
        onClose={() => setIsCreateAnnouncementOpen(false)}
        onAddAnnouncement={handleAddAnnouncement}
        currentUser={currentUser}
        departments={departmentsList}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onAddEvent={handleAddEvent}
        currentUser={currentUser}
        departments={departmentsList}
        members={members}
      />

      <MemberDetailModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        tasks={tasks}
        attendanceRecords={attendanceRecords}
        workingHours={workingHours}
        events={events}
        onSelectTask={(task) => {
          setSelectedMember(null);
          setSelectedTaskForDetail(task);
        }}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={Boolean(selectedTaskForDetail)}
        onClose={() => setSelectedTaskForDetail(null)}
        currentUser={currentUser}
        onUpdateTask={async (updatedTask) => {
          await handleUpdateTask(updatedTask);
        }}
        onTriggerUnauthorized={triggerUnauthorized}
      />

      <EventDetailModal
        event={selectedEventForDetail}
        isOpen={Boolean(selectedEventForDetail)}
        onClose={() => setSelectedEventForDetail(null)}
        members={members}
        tasks={tasks}
        currentUser={currentUser}
        attendanceRecords={attendanceRecords}
        onUpdateEvent={handleUpdateEvent}
        onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
        onAddAttendanceRecord={handleAddAttendanceRecord}
        onSelectTask={(task) => {
          setSelectedEventForDetail(null);
          setSelectedTaskForDetail(task);
        }}
        onSelectMember={(member) => {
          setSelectedEventForDetail(null);
          setSelectedMember(member);
        }}
      />

      <AnnouncementDetailModal
        announcement={selectedAnnouncementForDetail}
        isOpen={Boolean(selectedAnnouncementForDetail)}
        onClose={() => setSelectedAnnouncementForDetail(null)}
      />

      <CreateMemberModal
        isOpen={isCreateMemberOpen}
        onClose={() => setIsCreateMemberOpen(false)}
        onAddMember={handleAddMember}
        departments={departmentsList}
        currentUser={currentUser}
      />

      {/* Role-Based Permissions Unauthorized Feedback Modal */}
      <UnauthorizedModal
        isOpen={unauthorizedState.isOpen}
        onClose={() =>
          setUnauthorizedState((prev) => ({ ...prev, isOpen: false }))
        }
        currentUser={currentUser}
        actionTitle={unauthorizedState.actionTitle}
        reason={unauthorizedState.reason}
        recommendedRole={unauthorizedState.recommendedRole}
        onSwitchToRecommendedRole={handleSwitchToRecommendedRole}
      />

      {/* Supabase Authentication Modal (Login / Sign Up / Password Reset) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false);
          loadDataFromSupabase();
        }}
        departments={departmentsList}
      />

      {/* Database Error Feedback Toast Banner */}
      {dbErrorToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-rose-900/95 text-white p-4 rounded-2xl shadow-2xl border border-rose-700/50 backdrop-blur-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h5 className="font-bold text-rose-100 text-sm">{dbErrorToast.title}</h5>
            <p className="mt-1 text-rose-200 leading-relaxed">{dbErrorToast.description}</p>
          </div>
          <button
            onClick={() => setDbErrorToast(null)}
            className="text-rose-300 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
