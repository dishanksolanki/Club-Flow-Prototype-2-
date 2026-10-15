import React, { useState } from 'react';
import {
  Mail,
  GraduationCap,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Edit3,
  Shield,
  FileCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Member, Task, WorkingHourRecord, HierarchyRole } from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ROLE_CONFIGURATIONS } from '../utils/permissions';
import { ShieldCheck, Check, Lock, UserCheck, ArrowRight } from 'lucide-react';

interface ProfilePageProps {
  currentUser: Member;
  onUpdateCurrentUser: (updated: Partial<Member>) => void;
  myTasks: Task[];
  myHours: WorkingHourRecord[];
  allMembers?: Member[];
  onSelectPersona?: (member: Member) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  onUpdateCurrentUser,
  myTasks,
  myHours,
  allMembers = [],
  onSelectPersona,
}) => {
  const [activeTab, setActiveTab] = useState<
    'tasks' | 'hours' | 'badges' | 'activity'
  >('tasks');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editYear, setEditYear] = useState(currentUser.year);

  React.useEffect(() => {
    setEditName(currentUser.name);
    setEditBio(currentUser.bio || '');
    setEditYear(currentUser.year);
  }, [currentUser]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCurrentUser({
      name: editName.trim(),
      bio: editBio.trim(),
      year: editYear.trim(),
    });
    setIsEditModalOpen(false);
  };

  const clubBadges = [
    {
      title: 'Full-Stack Accelerator Lead',
      description:
        'Mentored 60 freshman developers through terminal and React bootcamp.',
      date: 'Fall 2026',
      icon: Award,
    },
    {
      title: 'HackNova Core Organizer',
      description:
        'Architect of registration gateway handling 200+ team applications.',
      date: 'Fall 2026',
      icon: Shield,
    },
    {
      title: 'Dean Service Recognition',
      description:
        'Completed 30+ verified volunteer hours in technical club operations.',
      date: 'Spring 2026',
      icon: FileCheck,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Profile Header Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {currentUser.name}
                </h1>
                <StatusBadge status={currentUser.status} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {currentUser.role}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentUser.department} Department · {currentUser.hierarchyRole}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Bio */}
        {currentUser.bio && (
          <p className="mt-4 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed pt-4 border-t border-slate-100">
            {currentUser.bio}
          </p>
        )}

        {/* Meta tags & University ID */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentUser.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Student ID:{' '}
              <strong className="font-mono text-slate-700">
                {currentUser.studentId}
              </strong>{' '}
              · {currentUser.year}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Member since {currentUser.joinDate}</span>
          </div>
        </div>
      </div>

      {/* Role & Permissions Mandate Card */}
      {(() => {
        const roleConfig = ROLE_CONFIGURATIONS[currentUser.hierarchyRole];
        return (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      Hierarchy Role & Permissions
                    </h3>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${roleConfig?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                      Tier {roleConfig?.rank} · {currentUser.hierarchyRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {roleConfig?.tagline || 'Official Role Governance Mandate'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  Affiliation:
                </span>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {currentUser.department} Department
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
              {roleConfig?.description}
            </p>

            {/* Permission Capability Badges */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 font-mono">
                System Authorizations
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {/* Task Assignment */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canAssignTasksAnyDept ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : roleConfig?.canAssignTasksDept ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canAssignTasksAnyDept
                      ? 'Task Assignment (All Departments)'
                      : roleConfig?.canAssignTasksDept
                      ? `Task Assignment (${currentUser.department} Dept Only)`
                      : 'Task Assignment (Restricted)'}
                  </span>
                </div>

                {/* Review Tasks */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canReviewTasksAnyDept || roleConfig?.canReviewTasksDept ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canReviewTasksAnyDept
                      ? 'Review & Approve (All Deliverables)'
                      : roleConfig?.canReviewTasksDept
                      ? `Review & Approve (${currentUser.department} Deliverables)`
                      : 'Deliverable Review (Leads Only)'}
                  </span>
                </div>

                {/* Member Management */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canManageMembers ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canManageMembers
                      ? 'Member Administration & Roster'
                      : 'Member Administration (Executives Only)'}
                  </span>
                </div>

                {/* Event Creation */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canCreateEvents ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canCreateEvents
                      ? 'Event Creation & Scheduling'
                      : 'Event Creation (Leads Only)'}
                  </span>
                </div>

                {/* Hours Verification */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canVerifyHours ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canVerifyHours
                      ? 'Verify Member Working Hours'
                      : 'Hours Verification (Leads Only)'}
                  </span>
                </div>

                {/* Announcements */}
                <div className="p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2 bg-slate-50/50">
                  {roleConfig?.canPostClubAnnouncements || roleConfig?.canPostDeptAnnouncements ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-700 font-medium">
                    {roleConfig?.canPostClubAnnouncements
                      ? 'Broadcast Announcements (Club-wide)'
                      : roleConfig?.canPostDeptAnnouncements
                      ? `Department Announcements (${currentUser.department})`
                      : 'Broadcast Announcements (Restricted)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Attendance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {currentUser.attendanceRate}%
          </p>
          <p className="text-[11px] text-slate-400 mt-2">14 of 16 official sessions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Tasks Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {currentUser.tasksCompleted}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">100% accepted deliverables</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Working Hours
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {currentUser.workingHours}h
          </p>
          <p className="text-[11px] text-slate-400 mt-2">Term goal: 40h accreditation</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">
              Leadership Rank
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 truncate">
            {currentUser.hierarchyRole}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">Core Organizing Committee</p>
        </div>
      </div>

      {/* Tabs and Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200/80 px-4 pt-3 bg-slate-50/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap -mb-px cursor-pointer ${
              activeTab === 'tasks'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            My Assigned Tasks ({myTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hours')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap -mb-px cursor-pointer ${
              activeTab === 'hours'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Working Hours Log ({myHours.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap -mb-px cursor-pointer ${
              activeTab === 'badges'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Club Accreditations & Badges
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap -mb-px cursor-pointer ${
              activeTab === 'activity'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Recent Activity
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="p-5">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {myTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  No assigned tasks found.
                </p>
              ) : (
                myTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <StatusBadge status={t.status} />
                        <StatusBadge status={t.priority} />
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs font-mono text-slate-500">
                          Deadline: {t.deadline}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {t.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.description}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 shrink-0">
                      Assigned by{' '}
                      <strong className="text-slate-700">{t.assignedBy}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-3">
              {myHours.slice(0, 5).map((h) => (
                <div
                  key={h.id}
                  className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition-all flex items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900">
                      {h.project}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {h.description}
                    </p>
                    <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                      {h.date}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                      {h.hours.toFixed(1)}h
                    </span>
                    <div className="mt-1">
                      <StatusBadge status={h.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'badges' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clubBadges.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5 shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-900 flex items-center justify-center shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {b.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {b.description}
                    </p>
                    <span className="text-[11px] font-mono text-slate-400 block pt-1">
                      {b.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              <div className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
                <p className="text-xs text-slate-900 font-semibold">
                  Logged 4.5 hours on Registration Portal
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Submitted code commits for participant form validation.
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  Oct 11, 2026
                </span>
              </div>
              <div className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                <p className="text-xs text-slate-900 font-semibold">
                  Marked Present at General Body Meeting
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Presented departmental tech goals to President Sophia.
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  Oct 08, 2026
                </span>
              </div>
              <div className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <p className="text-xs text-slate-900 font-semibold">
                  Trained 60 Freshman on Git & GitHub 101
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Conducted terminal lab session in CS Terminal Lab A.
                </p>
                <span className="text-[10px] text-slate-400 font-mono">
                  Sept 22, 2026
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Information"
        description="Update your bio, name, or student academic standing."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Academic Standing / Year
            </label>
            <input
              type="text"
              required
              value={editYear}
              onChange={(e) => setEditYear(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Bio Summary
            </label>
            <textarea
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell club members about your focus areas..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/90 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
