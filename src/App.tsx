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
import {
  canUserAssignTask,
  canUserCreateEvent,
  canUserManageAttendance,
  canUserManageMembers,
  canUserPostAnnouncement,
  canUserReviewTask,
  canUserVerifyHours,
} from './utils/permissions';

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
  const handleUpdateTask = (updatedTask: Task) => {
    const prevTask = tasks.find((t) => t.id === updatedTask.id);
    const wasCompleted = prevTask?.status === 'Completed' || prevTask?.status === 'Approved';
    const isNowCompleted = updatedTask.status === 'Completed' || updatedTask.status === 'Approved';

    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (updatedTask.status === 'Submitted') {
      recordActivity('Task submitted', currentUser.name, updatedTask.title, 'task');
    } else if (isNowCompleted) {
      recordActivity('Task completed', currentUser.name, updatedTask.title, 'task');
      if (!wasCompleted) {
        incrementMemberTasksCompleted(updatedTask.assignedTo);
      }
    }
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    const prevTask = tasks.find((t) => t.id === taskId);
    const wasCompleted = prevTask?.status === 'Completed' || prevTask?.status === 'Approved';
    const isNowCompleted = newStatus === 'Completed' || newStatus === 'Approved';

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const newEvent = {
            id: `act-${Date.now()}`,
            action: `Status changed to ${newStatus}`,
            actor: currentUser.name,
            timestamp: 'Just now',
          };
          if (newStatus === 'Submitted') {
            recordActivity('Task submitted', currentUser.name, t.title, 'task');
          } else if (isNowCompleted) {
            recordActivity('Task completed', currentUser.name, t.title, 'task');
            if (!wasCompleted) {
              incrementMemberTasksCompleted(t.assignedTo);
            }
          }

          // Push notifications for task approvals/rejections
          if (newStatus === 'Approved') {
            const notif: ClubNotification = {
              id: `notif-${Date.now()}`,
              title: 'Task Approved',
              message: `${currentUser.name} approved "${t.title}".`,
              timestamp: 'Just now',
              read: false,
              type: 'task',
              linkTab: 'Tasks',
              itemId: t.id,
            };
            setNotifications((prevNotifs) => [notif, ...prevNotifs]);
          } else if (newStatus === 'Rejected') {
            const notif: ClubNotification = {
              id: `notif-${Date.now()}`,
              title: 'Task Needs Revision',
              message: `"${t.title}" was marked as needing changes.`,
              timestamp: 'Just now',
              read: false,
              type: 'task',
              linkTab: 'Tasks',
              itemId: t.id,
            };
            setNotifications((prevNotifs) => [notif, ...prevNotifs]);
          }

          return {
            ...t,
            status: newStatus,
            history: [...(t.history || []), newEvent],
          };
        }
        return t;
      })
    );
  };

  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    recordActivity('Task assigned', currentUser.name, `${newTask.title} → ${newTask.assignedTo}`, 'task');
    // Also push a notification
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
  };

  const handleLogHours = (record: WorkingHourRecord) => {
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
  };

  const handleUpdateWorkingHourStatus = (recordId: string, status: 'Verified' | 'Pending Verification') => {
    const targetRecord = workingHours.find((r) => r.id === recordId);
    const perm = canUserVerifyHours(currentUser, targetRecord);
    if (!perm.allowed) {
      triggerUnauthorized('Verify Working Hours', perm.reason, 'Department Head');
      return;
    }
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
  };

  const handleUpdateAttendanceStatus = (recordId: string, newStatus: AttendanceStatus) => {
    const perm = canUserManageAttendance(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Mark Attendance Status', perm.reason, 'Department Head');
      return;
    }
    const targetRecord = attendanceRecords.find((r) => r.id === recordId);
    const updatedList = attendanceRecords.map((r) => {
      if (r.id === recordId) {
        recordActivity('Attendance marked', currentUser.name, `${r.member} marked ${newStatus} for ${r.eventName}`, 'attendance');
        return { ...r, status: newStatus };
      }
      return r;
    });
    setAttendanceRecords(updatedList);
    if (targetRecord) {
      syncMemberAttendanceRate(targetRecord.member, updatedList);
    }
  };

  const handleAddAttendanceRecord = (newRecord: AttendanceRecord) => {
    const perm = canUserManageAttendance(currentUser);
    if (!perm.allowed) {
      triggerUnauthorized('Mark Attendance Record', perm.reason, 'Department Head');
      return;
    }
    const updatedList = [newRecord, ...attendanceRecords];
    setAttendanceRecords(updatedList);
    recordActivity('Attendance marked', currentUser.name, `${newRecord.member} marked ${newRecord.status} for ${newRecord.eventName}`, 'attendance');
    syncMemberAttendanceRate(newRecord.member, updatedList);
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

  const handleUpdateClubSettings = (newSettings: ClubSettings) => {
    setClubSettings(newSettings);
    recordActivity('Club settings updated', currentUser.name, newSettings.name, 'event');
  };

  const handleUpdateMember = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
    if (currentUser.id === updatedMember.id) {
      setCurrentUser(updatedMember);
    }
    recordActivity('Member credentials updated', currentUser.name, `${updatedMember.name} (${updatedMember.hierarchyRole})`, 'event');
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

  const handleAddAnnouncement = (newAnnouncement: Announcement) => {
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

  const handleAddEvent = (newEvent: ClubEvent) => {
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
  };

  const handleUpdateEvent = (updatedEvent: ClubEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    if (selectedEventForDetail?.id === updatedEvent.id) {
      setSelectedEventForDetail(updatedEvent);
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAllNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
        onUpdateTask={(updatedTask) => {
          handleUpdateTask(updatedTask);
          setSelectedTaskForDetail(updatedTask);
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
    </div>
  );
}
