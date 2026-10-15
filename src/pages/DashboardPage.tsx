import React from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  Award,
  ArrowUpRight,
  Plus,
  ChevronRight,
  MapPin,
  Sparkles,
  Users,
  Activity,
  Layers,
} from 'lucide-react';
import { Member, Task, ClubEvent, WorkingHourRecord, Announcement, AttendanceRecord, ActivityItem, ClubSettings } from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { NavTab } from '../components/layout/Sidebar';

interface DashboardPageProps {
  currentUser: Member;
  tasks: Task[];
  events: ClubEvent[];
  workingHours: WorkingHourRecord[];
  attendanceRecords: AttendanceRecord[];
  activities?: ActivityItem[];
  announcements: Announcement[];
  onNavigate: (tab: NavTab) => void;
  onOpenCreateTask: () => void;
  onOpenLogHours: () => void;
  onOpenCreateAnnouncement: () => void;
  onOpenCreateEvent: () => void;
  onSelectMember: (memberId: string) => void;
  onSelectEvent?: (event: ClubEvent) => void;
  onSelectTask?: (task: Task) => void;
  onSelectAnnouncement?: (announcement: Announcement) => void;
  clubSettings?: ClubSettings;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  tasks,
  events,
  workingHours,
  attendanceRecords,
  activities = [],
  announcements,
  onNavigate,
  onOpenCreateTask,
  onOpenLogHours,
  onOpenCreateAnnouncement,
  onOpenCreateEvent,
  onSelectMember,
  onSelectEvent,
  onSelectTask,
  onSelectAnnouncement,
  clubSettings,
}) => {
  const pendingTasks = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Submitted' || t.status === 'Rejected');
  const completedTasks = tasks.filter((t) => t.status === 'Completed' || t.status === 'Approved');

  // Real event counts from the Events section
  const totalEventsCount = events.length;
  const upcomingCount = events.filter((e) => e.status === 'Upcoming').length;
  const ongoingCount = events.filter((e) => e.status === 'Ongoing').length;
  const pastEventsCount = events.filter((e) => e.status === 'Completed' || e.status === 'Cancelled').length;

  // Real upcoming & ongoing events to display on Dashboard
  const upcomingEvents = events
    .filter((e) => e.status === 'Upcoming' || e.status === 'Ongoing')
    .slice(0, 4);

  // Dynamic user task filtering for whichever persona is active
  const myTasks = tasks.filter((t) => {
    const assignee = t.assignedTo.toLowerCase();
    const currName = currentUser.name.toLowerCase();
    const firstName = currName.split(' ')[0];
    return assignee === currName || assignee.includes(firstName);
  });

  // Dynamic pending tasks metrics
  const urgentOrDueSoonTasksCount = pendingTasks.filter((t) => {
    const d = t.deadline.toLowerCase();
    return d.includes('today') || d.includes('tomorrow') || t.priority === 'Urgent';
  }).length;
  const pendingDeptsSet = new Set(pendingTasks.map((t) => t.department));
  const pendingDeptsCount = pendingDeptsSet.size;

  // Real Attendance statistics
  const presentAttendanceRecords = attendanceRecords.filter((r) => r.status === 'Present' || r.status === 'Late');
  const totalAttendanceRecords = attendanceRecords.length;
  const overallAttendanceRate =
    totalAttendanceRecords > 0
      ? Math.round((presentAttendanceRecords.length / totalAttendanceRecords) * 100)
      : currentUser.attendanceRate;

  // Real Working Hours statistics
  const totalLoggedWorkingHours = workingHours.reduce((acc, r) => acc + r.hours, 0);

  // Department distribution calculation across all active departments
  const rawDeptBreakdown = [
    { name: 'Technical', count: tasks.filter((t) => t.department === 'Technical').length, color: 'bg-indigo-500' },
    { name: 'Design', count: tasks.filter((t) => t.department === 'Design').length, color: 'bg-violet-500' },
    { name: 'Marketing', count: tasks.filter((t) => t.department === 'Marketing').length, color: 'bg-pink-500' },
    { name: 'Events', count: tasks.filter((t) => t.department === 'Event Management').length, color: 'bg-emerald-500' },
    { name: 'Media', count: tasks.filter((t) => t.department === 'Media').length, color: 'bg-amber-500' },
    { name: 'Content', count: tasks.filter((t) => t.department === 'Content').length, color: 'bg-cyan-500' },
  ];
  const deptBreakdown = rawDeptBreakdown.filter((d) => d.count > 0 || tasks.length === 0);
  const totalTrackedDeptTasks = deptBreakdown.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Welcome Section & Quick Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="hidden sm:block shrink-0 pt-0.5">
              <Avatar
                src={currentUser.avatarUrl}
                name={currentUser.name}
                initials={currentUser.initials}
                size="lg"
                className="ring-2 ring-slate-100"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <span className="inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50/80 border border-indigo-100/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  {clubSettings?.academicYear || 'Fall Term 2026'}
                </span>
                <span>·</span>
                <span>Executive Operations Console</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back, {currentUser.name.split(' ')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Campus operations status: <strong className="text-slate-800 font-semibold">{upcomingCount} upcoming</strong> and{' '}
                <strong className="text-slate-800 font-semibold">{ongoingCount} ongoing</strong> events across departments, with{' '}
                <strong className="text-slate-800 font-semibold">{pendingTasks.length} pending deliverables</strong> under active tracking.
              </p>
            </div>
          </div>

          {/* Quick Actions (Linear/Vercel styled) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLogHours}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Log Hours</span>
            </button>
            <button
              type="button"
              onClick={onOpenCreateTask}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>New Task</span>
            </button>
            <button
              type="button"
              onClick={onOpenCreateAnnouncement}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Memo</span>
            </button>
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Schedule Event</span>
            </button>
          </div>
        </div>

        {/* Workload Distribution Mini-Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Task Distribution by Committee:</span>
          </div>
          <div className="flex-1 max-w-md mx-0 sm:mx-3">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {deptBreakdown.map((d) => (
                <div
                  key={d.name}
                  style={{ width: `${(d.count / totalTrackedDeptTasks) * 100}%` }}
                  className={`${d.color} h-full transition-all`}
                  title={`${d.name}: ${d.count} tasks`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
            {deptBreakdown.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${d.color}`} />
                <span>{d.name} ({d.count})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (4 Statistics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div
          onClick={() => onNavigate('Attendance')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold text-slate-600">Attendance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {overallAttendanceRate}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold font-mono">
              {presentAttendanceRecords.length} / {totalAttendanceRecords} records
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span>Minimum required: 75%</span>
            <span className="group-hover:text-indigo-600 font-medium flex items-center gap-0.5 transition-colors">
              View Log <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Pending Tasks */}
        <div
          onClick={() => onNavigate('Tasks')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold text-slate-600">Pending Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {pendingTasks.length}
            </span>
            <span className="text-xs text-amber-700 font-semibold font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
              {urgentOrDueSoonTasksCount > 0 ? `${urgentOrDueSoonTasksCount} due soon / urgent` : `${pendingTasks.length} active`}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span>Across {pendingDeptsCount} committee{pendingDeptsCount === 1 ? '' : 's'}</span>
            <span className="group-hover:text-indigo-600 font-medium flex items-center gap-0.5 transition-colors">
              Manage <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => onNavigate('Tasks')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold text-slate-600">Completed Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {completedTasks.length}
            </span>
            <span className="text-xs text-indigo-600 font-semibold">Verified deliverables</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span>Review board signed off</span>
            <span className="group-hover:text-indigo-600 font-medium flex items-center gap-0.5 transition-colors">
              History <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Working Hours */}
        <div
          onClick={() => onNavigate('Working Hours')}
          className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold text-slate-600">Working Hours</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalLoggedWorkingHours.toFixed(1)}h
            </span>
            <span className="text-xs text-blue-600 font-semibold font-mono">Goal: 40h/term</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            <span>{Math.min(100, Math.round((totalLoggedWorkingHours / 40) * 100))}% target attained</span>
            <span className="group-hover:text-indigo-600 font-medium flex items-center gap-0.5 transition-colors">
              Log Details <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Events Operational Overview Strip */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Events Coordination Track
            </h3>
            <p className="text-[11px] text-slate-400">
              Coordinated calendar spanning workshops, project demos, and campus meetings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 bg-slate-800 border border-slate-700/80 rounded-lg text-xs font-mono">
            <span className="text-slate-400">Total: </span>
            <strong className="text-white">{totalEventsCount}</strong>
          </div>
          <div className="px-3 py-1 bg-blue-950/80 border border-blue-800 text-blue-300 rounded-lg text-xs font-mono">
            <span>Upcoming: </span>
            <strong className="text-white">{upcomingCount}</strong>
          </div>
          <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-mono">
            <span>Ongoing: </span>
            <strong className="text-white">{ongoingCount}</strong>
          </div>
          <div className="px-3 py-1 bg-slate-800 border border-slate-700/80 text-slate-300 rounded-lg text-xs font-mono">
            <span>Past: </span>
            <strong className="text-white">{pastEventsCount}</strong>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('Events')}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ml-auto sm:ml-0 shadow-2xs"
          >
            <span>Events Board</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Upcoming Events & Task Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Events Box */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Upcoming Events</h2>
                  <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {upcomingEvents.length} active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any event card to view run of show, venue, participating members, and related tasks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('Events')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
              >
                View all ({totalEventsCount}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No upcoming events scheduled</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Schedule a new workshop or general meeting.</p>
                </div>
              ) : (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      if (onSelectEvent) {
                        onSelectEvent(evt);
                      } else {
                        onNavigate('Events');
                      }
                    }}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <StatusBadge status={evt.status} size="sm" />
                          <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                            {evt.department}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {evt.title}
                        </h3>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md font-mono inline-block">
                          {evt.date}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          {evt.startTime} – {evt.endTime}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-sm">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-700">
                          <strong>{evt.attendeesCount}</strong> / {evt.capacity} seats
                        </span>
                        <span className="text-slate-600">
                          Lead: <strong className="text-slate-800">{evt.organizer}</strong>
                        </span>
                        <span className="text-xs font-semibold text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Details <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Task Progress (Assigned to Me) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Assigned To Me</h2>
                <p className="text-xs text-slate-500">Active tasks requiring your technical review or submission</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('Tasks')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
              >
                Go to Tasks <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {myTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No active tasks assigned to you.</p>
              ) : (
                myTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (onSelectTask) {
                        onSelectTask(t);
                      } else {
                        onNavigate('Tasks');
                      }
                    }}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={t.status} size="sm" />
                        <StatusBadge status={t.priority} size="sm" />
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500 font-mono">Due {t.deadline}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {t.title}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 shrink-0">
                      Assigned by <strong className="text-slate-800 font-medium">{t.assignedBy}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Recent Activity & Latest Announcements */}
        <div className="space-y-6">
          {/* Latest Announcements */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Announcements</h2>
              <button
                type="button"
                onClick={() => onNavigate('Announcements')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                View board
              </button>
            </div>

            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No announcements posted yet.
                </div>
              ) : (
                announcements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      if (onSelectAnnouncement) {
                        onSelectAnnouncement(a);
                      } else {
                        onNavigate('Announcements');
                      }
                    }}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded border ${
                          a.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : a.priority === 'Important'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {a.priority}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200/80">
                          {a.department === 'General' ? 'All Members' : a.department}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{a.date}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {a.content || a.message}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          src={a.authorAvatar}
                          name={a.postedBy}
                          size="xs"
                        />
                        <span className="font-medium text-slate-700">{a.postedBy}</span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Details →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Club Activity Feed */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Live club log</span>
            </div>
            <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200 max-h-96 overflow-y-auto pr-1">
              {activities.length > 0 ? (
                activities.slice(0, 10).map((act) => {
                  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
                  let dotColor = 'bg-slate-900';

                  if (act.action === 'Task completed') {
                    badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    dotColor = 'bg-emerald-600';
                  } else if (act.action === 'Task submitted') {
                    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                    dotColor = 'bg-amber-600';
                  } else if (act.action === 'Task assigned') {
                    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    dotColor = 'bg-indigo-600';
                  } else if (act.action === 'Event created') {
                    badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                    dotColor = 'bg-purple-600';
                  } else if (act.action === 'Attendance marked') {
                    badgeStyle = 'bg-teal-50 text-teal-700 border-teal-200';
                    dotColor = 'bg-teal-600';
                  } else if (act.action === 'Work record added' || act.action.includes('Work')) {
                    badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                    dotColor = 'bg-blue-600';
                  } else if (act.action === 'Announcement posted' || act.action.includes('Announcement')) {
                    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                    dotColor = 'bg-amber-600';
                  }

                  return (
                    <div key={act.id} className="relative">
                      <div className={`absolute -left-5 top-1.5 w-2 h-2 rounded-full ${dotColor} ring-4 ring-white`} />
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono tracking-wider ${badgeStyle}`}>
                          {act.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{act.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-snug">
                        <strong className="text-slate-900 font-bold">{act.member}</strong>
                        <span className="text-slate-500"> · {act.relatedItem}</span>
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="relative">
                  <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 uppercase font-mono">
                    Work record added
                  </span>
                  <p className="text-xs text-slate-800 mt-1">
                    <strong className="text-slate-900 font-bold">{currentUser.name}</strong>
                    <span className="text-slate-500"> · HackNova 2026 Registration Portal (4.5h)</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">2 hours ago</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
