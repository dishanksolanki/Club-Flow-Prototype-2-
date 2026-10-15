import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  FolderKanban,
  Calendar,
  CheckSquare,
  Clock,
  Award,
  Settings,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  UserCheck,
  UserX,
  ArrowRight,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Building,
  Mail,
  GraduationCap,
  Layers,
  ChevronRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import {
  Member,
  DepartmentInfo,
  DepartmentType,
  ClubEvent,
  Task,
  AttendanceRecord,
  WorkingHourRecord,
  HierarchyRole,
  ClubSettings,
} from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { canAccessManagementPanel, ROLE_CONFIGURATIONS } from '../utils/permissions';

interface ManagementPageProps {
  currentUser: Member;
  members: Member[];
  departments: DepartmentInfo[];
  events: ClubEvent[];
  tasks: Task[];
  attendanceRecords: AttendanceRecord[];
  workingHours: WorkingHourRecord[];
  clubSettings: ClubSettings;
  onUpdateClubSettings: (settings: ClubSettings) => void;
  onUpdateMember: (updatedMember: Member) => void;
  onAddDepartment: (newDept: DepartmentInfo) => void;
  onUpdateDepartment: (updatedDept: DepartmentInfo) => void;
  onSelectMember: (member: Member) => void;
  onOpenOnboardMember: () => void;
  onTriggerUnauthorized: (action: string, reason?: string, recommendedRole?: HierarchyRole) => void;
  onSwitchPersona: (member: Member) => void;
}

export const ManagementPage: React.FC<ManagementPageProps> = ({
  currentUser,
  members,
  departments,
  events,
  tasks,
  attendanceRecords,
  workingHours,
  clubSettings,
  onUpdateClubSettings,
  onUpdateMember,
  onAddDepartment,
  onUpdateDepartment,
  onSelectMember,
  onOpenOnboardMember,
  onTriggerUnauthorized,
  onSwitchPersona,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'members' | 'departments' | 'settings'>('overview');

  // Check access permissions
  const accessCheck = canAccessManagementPanel(currentUser);
  const isAuthorized = accessCheck.allowed;
  const isReadOnly = accessCheck.isReadOnly ?? false;

  // Search & Filter states for Member Management
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDeptFilter, setMemberDeptFilter] = useState<string>('All');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('All');
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('All');

  // Modal states for Member Management
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState<HierarchyRole>('Department Member');
  const [editDept, setEditDept] = useState<DepartmentType>('Technical');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Leave' | 'Core Lead' | 'Probation' | 'Inactive'>('Active');

  // Department Modal states
  const [isCreateDeptModalOpen, setIsCreateDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentInfo | null>(null);
  const [viewingDeptMembers, setViewingDeptMembers] = useState<DepartmentInfo | null>(null);

  // New Department Form state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptShortDesc, setNewDeptShortDesc] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptTheme, setNewDeptTheme] = useState('indigo');
  const [newDeptTools, setNewDeptTools] = useState('Slack, Notion, Google Workspace');
  const [newDeptLead, setNewDeptLead] = useState('');
  const [newDeptCoLead, setNewDeptCoLead] = useState('');

  // Edit Department Form state
  const [editDeptShortDesc, setEditDeptShortDesc] = useState('');
  const [editDeptDesc, setEditDeptDesc] = useState('');
  const [editDeptTheme, setEditDeptTheme] = useState('');
  const [editDeptTools, setEditDeptTools] = useState('');
  const [editDeptLead, setEditDeptLead] = useState('');
  const [editDeptCoLead, setEditDeptCoLead] = useState('');

  // Club Settings Form state
  const [settingsName, setSettingsName] = useState(clubSettings.name);
  const [settingsDesc, setSettingsDesc] = useState(clubSettings.description);
  const [settingsYear, setSettingsYear] = useState(clubSettings.academicYear);
  const [settingsEmail, setSettingsEmail] = useState(clubSettings.contactEmail);
  const [settingsBrandTag, setSettingsBrandTag] = useState(clubSettings.brandTag || 'ACM');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Status notification toast
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // KPI Calculations
  const totalMembersCount = members.length;
  const activeMembersCount = members.filter((m) => m.status === 'Active' || m.status === 'Core Lead').length;
  const totalDepartmentsCount = departments.length;
  const upcomingEventsCount = events.filter((e) => e.status === 'Upcoming' || e.status === 'Ongoing').length;
  const pendingTasksCount = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Submitted').length;
  const completedTasksCount = tasks.filter((t) => t.status === 'Completed' || t.status === 'Approved').length;
  const avgAttendanceRate = members.length > 0
    ? Math.round(members.reduce((acc, m) => acc + m.attendanceRate, 0) / members.length)
    : 0;
  const totalWorkingHoursCount = workingHours.reduce((acc, r) => acc + r.hours, 0);

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    if (memberDeptFilter !== 'All' && m.department !== memberDeptFilter) return false;
    if (memberRoleFilter !== 'All' && m.hierarchyRole !== memberRoleFilter) return false;
    if (memberStatusFilter !== 'All' && m.status !== memberStatusFilter) return false;
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchEmail = m.email.toLowerCase().includes(q);
      const matchId = m.studentId.toLowerCase().includes(q);
      const matchRole = m.role.toLowerCase().includes(q);
      const matchDept = m.department.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchRole && !matchDept) return false;
    }
    return true;
  });

  // Hierarchy role options
  const allHierarchyRoles: HierarchyRole[] = [
    'Faculty Advisor',
    'President',
    'Vice President',
    'Head',
    'Co-Head',
    'Department Head',
    'Department Co-Head',
    'Department Member',
  ];

  // Open Edit Member Modal
  const handleOpenEditMember = (member: Member) => {
    if (isReadOnly) {
      onTriggerUnauthorized(
        'Modify Member Roster',
        'Faculty Advisor has read-only institutional oversight and cannot directly modify member records.',
        'President'
      );
      return;
    }
    setEditingMember(member);
    setEditRole(member.hierarchyRole);
    setEditDept(member.department);
    setEditStatus(member.status);
  };

  // Submit Edit Member
  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    const updated: Member = {
      ...editingMember,
      hierarchyRole: editRole,
      department: editDept,
      status: editStatus,
      role:
        editRole === 'Department Head'
          ? `${editDept} Department Head`
          : editRole === 'Department Co-Head'
          ? `${editDept} Co-Head`
          : editRole === 'Department Member'
          ? `${editDept} Associate`
          : editingMember.role,
    };

    onUpdateMember(updated);
    showNotice(`Updated ${updated.name}: Role set to ${editRole}, Department to ${editDept}, Status to ${editStatus}.`);
    setEditingMember(null);
  };

  // Quick toggle active/inactive status
  const handleToggleMemberStatus = (member: Member) => {
    if (isReadOnly) {
      onTriggerUnauthorized(
        'Change Member Status',
        'Faculty Advisor has read-only institutional oversight.',
        'President'
      );
      return;
    }
    const newStatus = member.status === 'Inactive' ? 'Active' : 'Inactive';
    const updated: Member = {
      ...member,
      status: newStatus,
    };
    onUpdateMember(updated);
    showNotice(`${member.name} has been marked as ${newStatus}.`);
  };

  // Open Edit Department Modal
  const handleOpenEditDept = (dept: DepartmentInfo) => {
    if (isReadOnly) {
      onTriggerUnauthorized(
        'Edit Department Details',
        'Faculty Advisor has read-only institutional oversight.',
        'President'
      );
      return;
    }
    setEditingDept(dept);
    setEditDeptShortDesc(dept.shortDesc);
    setEditDeptDesc(dept.description);
    setEditDeptTheme(dept.colorTheme);
    setEditDeptTools(dept.tools.join(', '));
    setEditDeptLead(dept.leadName);
    setEditDeptCoLead(dept.coLeadName);
  };

  // Submit Edit Department
  const handleSaveDeptEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;

    const updated: DepartmentInfo = {
      ...editingDept,
      shortDesc: editDeptShortDesc.trim(),
      description: editDeptDesc.trim(),
      colorTheme: editDeptTheme,
      tools: editDeptTools.split(',').map((t) => t.trim()).filter(Boolean),
      leadName: editDeptLead.trim() || editingDept.leadName,
      coLeadName: editDeptCoLead.trim() || editingDept.coLeadName,
    };

    onUpdateDepartment(updated);
    showNotice(`Department "${updated.name}" updated successfully.`);
    setEditingDept(null);
  };

  // Submit Create Department
  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    if (isReadOnly) {
      onTriggerUnauthorized(
        'Create New Department',
        'Faculty Advisor has read-only institutional oversight.',
        'President'
      );
      return;
    }

    const newDept: DepartmentInfo = {
      id: `dept-${Date.now()}`,
      name: newDeptName.trim() as DepartmentType,
      shortDesc: newDeptShortDesc.trim() || `${newDeptName} operations and initiatives`,
      description: newDeptDesc.trim() || `Coordinates all ${newDeptName} activities for the club.`,
      leadName: newDeptLead.trim() || 'TBD (Unassigned)',
      coLeadName: newDeptCoLead.trim() || 'TBD (Unassigned)',
      memberCount: 0,
      activeTasksCount: 0,
      upcomingEventsCount: 0,
      tools: newDeptTools.split(',').map((t) => t.trim()).filter(Boolean),
      colorTheme: newDeptTheme,
    };

    onAddDepartment(newDept);
    showNotice(`Department "${newDept.name}" created and added to club registry.`);
    setIsCreateDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptShortDesc('');
    setNewDeptDesc('');
    setNewDeptLead('');
    setNewDeptCoLead('');
  };

  // Submit Club Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onTriggerUnauthorized(
        'Modify Club Settings',
        'Faculty Advisor has read-only institutional oversight.',
        'President'
      );
      return;
    }

    const newSettings: ClubSettings = {
      name: settingsName.trim() || clubSettings.name,
      description: settingsDesc.trim() || clubSettings.description,
      academicYear: settingsYear.trim() || clubSettings.academicYear,
      contactEmail: settingsEmail.trim() || clubSettings.contactEmail,
      brandTag: settingsBrandTag.trim() || 'ACM',
    };

    onUpdateClubSettings(newSettings);
    setSettingsSavedToast(true);
    showNotice('Club settings updated! Branding and organizational profile refreshed.');
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  // Access Guardrail for Department-Level / General Members
  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fadeIn text-center">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-mono">
              Role Access Restricted
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-3">
              Club Management Panel
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
              {accessCheck.reason ||
                `Your current role as ${currentUser.hierarchyRole} does not have unrestricted club-wide management authority.`}
            </p>
          </div>

          {/* Active persona box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 max-w-md mx-auto text-left flex items-center gap-3.5">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser.role} · {currentUser.department}
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                {currentUser.hierarchyRole}
              </span>
            </div>
          </div>

          {/* Persona Switcher Quick Action */}
          <div className="pt-2 max-w-sm mx-auto">
            <p className="text-xs text-slate-500 mb-3">
              To test the Club Management Panel, switch to an executive role:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const pres = members.find((m) => m.hierarchyRole === 'President');
                  if (pres) onSwitchPersona(pres);
                }}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>As President</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const head = members.find((m) => m.hierarchyRole === 'Head');
                  if (head) onSwitchPersona(head);
                }}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>As Operations Head</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs animate-slideUp border border-slate-700 max-w-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium leading-relaxed">{actionNotice}</span>
        </div>
      )}

      {/* Header & Sub-Tab Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-600 text-white font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              Executive Admin
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Governance & Operations Console
            </span>
            {isReadOnly && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                Read-Only Advisor
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Club Management Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Centralized administration hub for organizational health metrics, member roster assignments, department structures, and club settings.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0 self-start lg:self-auto overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'members', label: 'Member Management', icon: Users },
            { id: 'departments', label: 'Departments', icon: FolderKanban },
            { id: 'settings', label: 'Club Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. MANAGEMENT OVERVIEW TAB */}
      {/* ============================================================== */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid: 7 Metrics Specified by Prompt */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {/* Total Members */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Total Members
                </span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {totalMembersCount}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-emerald-600 font-semibold">{activeMembersCount} active</span>
                <span>{totalMembersCount - activeMembersCount} inactive</span>
              </div>
            </div>

            {/* Total Departments */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Departments
                </span>
                <FolderKanban className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {totalDepartmentsCount}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>All functional committees</span>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Upcoming Events
                </span>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {upcomingEventsCount}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>{events.length} total events scheduled</span>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Pending Tasks
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {pendingTasksCount}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-amber-700 font-medium">
                <span>Awaiting delivery or review</span>
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Completed Tasks
                </span>
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {completedTasksCount}
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
                <span>Verified deliverables</span>
              </div>
            </div>

            {/* Average Attendance */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Avg Attendance
                </span>
                <Award className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {avgAttendanceRate}%
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                <span>Across all sessions</span>
              </div>
            </div>

            {/* Total Working Hours */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Total Work Hours
                </span>
                <Clock className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {totalWorkingHoursCount.toFixed(1)}h
              </p>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span>{workingHours.length} logged records</span>
              </div>
            </div>
          </div>

          {/* Quick Management Actions Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Quick Leadership Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={onOpenOnboardMember}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:scale-105 transition-transform">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Onboard New Member</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Register a student and assign hierarchy position</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateDeptModalOpen(true)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Create Department</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Form a new functional committee or branch</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('settings')}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 bg-slate-200 text-slate-800 rounded-lg group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Club Settings</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Update club name, description, and academic year</p>
                </div>
              </button>
            </div>
          </div>

          {/* Department Breakdown Mini-Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Department Overview Summary</h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('departments')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Departments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] font-mono">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Department Head</th>
                    <th className="py-2.5 px-3">Co-Head</th>
                    <th className="py-2.5 px-3 text-center">Members</th>
                    <th className="py-2.5 px-3 text-center">Active Tasks</th>
                    <th className="py-2.5 px-3 text-center">Events</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => {
                    const deptMembersCount = members.filter((m) => m.department === dept.name).length;
                    const deptTasksCount = tasks.filter((t) => t.department === dept.name && t.status !== 'Completed').length;
                    const deptEventsCount = events.filter((e) => e.department === dept.name).length;
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {dept.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{dept.leadName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{dept.coLeadName}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {deptMembersCount || dept.memberCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-indigo-600 font-semibold">
                          {deptTasksCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {deptEventsCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MEMBER MANAGEMENT TAB */}
      {/* ============================================================== */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Controls & Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search member, email, student ID, role..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Onboard Member CTA */}
              <button
                type="button"
                onClick={onOpenOnboardMember}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Onboard Member</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium">Filter by:</span>

              {/* Department */}
              <select
                value={memberDeptFilter}
                onChange={(e) => setMemberDeptFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Hierarchy Role */}
              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer"
              >
                <option value="All">All Hierarchy Roles</option>
                {allHierarchyRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {/* Status */}
              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Core Lead">Core Lead</option>
                <option value="On Leave">On Leave</option>
                <option value="Probation">Probation</option>
                <option value="Inactive">Inactive</option>
              </select>

              {(memberDeptFilter !== 'All' || memberRoleFilter !== 'All' || memberStatusFilter !== 'All' || memberSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setMemberDeptFilter('All');
                    setMemberRoleFilter('All');
                    setMemberStatusFilter('All');
                    setMemberSearch('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Hierarchy Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Attendance</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No members match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Member identity */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={member.avatarUrl}
                              name={member.name}
                              initials={member.initials}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p
                                onClick={() => onSelectMember(member)}
                                className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                              >
                                {member.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {member.email} · ID: {member.studentId}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {member.department}
                          </span>
                        </td>

                        {/* Hierarchy Role */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            ROLE_CONFIGURATIONS[member.hierarchyRole]?.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}>
                            {member.hierarchyRole}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={member.status} size="sm" />
                        </td>

                        {/* Attendance */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-900">
                          {member.attendanceRate}%
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => onSelectMember(member)}
                              title="View member profile"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Role & Department */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditMember(member)}
                              title="Change Role & Department"
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>

                            {/* Activate / Deactivate Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleMemberStatus(member)}
                              title={member.status === 'Inactive' ? 'Activate Member' : 'Deactivate Member'}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all border cursor-pointer ${
                                member.status === 'Inactive'
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              }`}
                            >
                              {member.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEPARTMENT MANAGEMENT TAB */}
      {/* ============================================================== */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Functional Committees & Departments</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create new committees, assign Department Heads and Co-Heads, or inspect roster members.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isReadOnly) {
                  onTriggerUnauthorized(
                    'Create Department',
                    'Faculty Advisor has read-only institutional oversight.',
                    'President'
                  );
                  return;
                }
                setIsCreateDeptModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => {
              const deptMembersList = members.filter((m) => m.department === dept.name);
              const deptActiveTasks = tasks.filter((t) => t.department === dept.name && t.status !== 'Completed').length;
              const deptEvents = events.filter((e) => e.department === dept.name).length;

              return (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-900">{dept.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {deptMembersList.length} Members
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {dept.shortDesc}
                    </p>

                    <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Department Head:</span>
                        <span className="font-bold text-slate-800">{dept.leadName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Co-Head:</span>
                        <span className="font-medium text-slate-700">{dept.coLeadName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Active Tasks:</span>
                        <span className="font-mono text-indigo-600 font-semibold">{deptActiveTasks} tasks</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Upcoming Events:</span>
                        <span className="font-mono text-slate-700">{deptEvents}</span>
                      </div>
                    </div>

                    {/* Tools / Stack Tags */}
                    {dept.tools && dept.tools.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                        {dept.tools.slice(0, 4).map((tool) => (
                          <span
                            key={tool}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingDeptMembers(dept)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Roster</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditDept(dept)}
                      className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. CLUB SETTINGS TAB */}
      {/* ============================================================== */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs max-w-3xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                System Configuration
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              General Club Settings
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Configure institutional metadata, university academic calendar cycle, and contact credentials. Changes apply dynamically across the application interface.
            </p>
          </div>

          {settingsSavedToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Club settings saved and updated across workspace!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Club Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Official Club Name *
              </label>
              <input
                type="text"
                required
                value={settingsName}
                onChange={(e) => setSettingsName(e.target.value)}
                placeholder="e.g. ACM Student Chapter"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Club Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Club Description / Mission Statement
              </label>
              <textarea
                rows={3}
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                placeholder="Brief summary of club objectives, department pillars, and student mission..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            {/* Grid for Academic Year & Contact Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Year Cycle
                </label>
                <input
                  type="text"
                  value={settingsYear}
                  onChange={(e) => setSettingsYear(e.target.value)}
                  placeholder="e.g. 2026 - 2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact / Secretariat Email
                </label>
                <input
                  type="email"
                  value={settingsEmail}
                  onChange={(e) => setSettingsEmail(e.target.value)}
                  placeholder="e.g. board@campus.edu"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Brand Logo Placeholder */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Brand Logo Placeholder & Tag
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-indigo-400 flex items-center justify-center font-bold text-sm shadow-xs border border-slate-800">
                  {settingsBrandTag || 'CF'}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    maxLength={6}
                    value={settingsBrandTag}
                    onChange={(e) => setSettingsBrandTag(e.target.value.toUpperCase())}
                    placeholder="Short acronym e.g. ACM or CF"
                    className="w-40 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used as the logo placeholder badge in the sidebar and top navigation.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Toolbar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSettingsName(clubSettings.name);
                  setSettingsDesc(clubSettings.description);
                  setSettingsYear(clubSettings.academicYear);
                  setSettingsEmail(clubSettings.contactEmail);
                  setSettingsBrandTag(clubSettings.brandTag || 'ACM');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
              >
                Reset Changes
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Club Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT MEMBER ROLE & DEPARTMENT MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        title="Modify Member Credentials"
        description={editingMember ? `Update ${editingMember.name}'s role and department` : ''}
        maxWidth="md"
      >
        {editingMember && (
          <form onSubmit={handleSaveMemberEdit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <Avatar
                src={editingMember.avatarUrl}
                name={editingMember.name}
                initials={editingMember.initials}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{editingMember.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{editingMember.email} · {editingMember.studentId}</p>
              </div>
            </div>

            {/* Change Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Department *
              </label>
              <select
                value={editDept}
                onChange={(e) => setEditDept(e.target.value as DepartmentType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Change Demo Hierarchy Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hierarchy Role *
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as HierarchyRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
              >
                {allHierarchyRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {ROLE_CONFIGURATIONS[editRole]?.description}
              </p>
            </div>

            {/* Member Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Status *
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Core Lead">Core Lead</option>
                <option value="On Leave">On Leave</option>
                <option value="Probation">Probation</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Save Member Credentials
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: CREATE DEPARTMENT MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCreateDeptModalOpen}
        onClose={() => setIsCreateDeptModalOpen(false)}
        title="Create New Club Department"
        description="Establish a new functional branch or committee in the club."
        maxWidth="md"
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Research & Innovation"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI research, patents & academic competitions"
              value={newDeptShortDesc}
              onChange={(e) => setNewDeptShortDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Scope & Responsibilities
            </label>
            <textarea
              rows={2}
              placeholder="Explain the committee's mission, key deliverables, and semester goals..."
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Department Head
              </label>
              <select
                value={newDeptLead}
                onChange={(e) => setNewDeptLead(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Select Member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.hierarchyRole})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Co-Head
              </label>
              <select
                value={newDeptCoLead}
                onChange={(e) => setNewDeptCoLead(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Select Member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.hierarchyRole})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tools & Software Stack (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. PyTorch, Overleaf, ArXiv, Discord"
              value={newDeptTools}
              onChange={(e) => setNewDeptTools(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateDeptModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Department</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: EDIT DEPARTMENT DETAILS & LEAD ASSIGNMENTS */}
      {/* ============================================================== */}
      <Modal
        isOpen={Boolean(editingDept)}
        onClose={() => setEditingDept(null)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : ''}
        description="Modify committee description, assign Department Head and Co-Head, and update tools."
        maxWidth="md"
      >
        {editingDept && (
          <form onSubmit={handleSaveDeptEdit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Description *
              </label>
              <input
                type="text"
                required
                value={editDeptShortDesc}
                onChange={(e) => setEditDeptShortDesc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Scope
              </label>
              <textarea
                rows={2}
                value={editDeptDesc}
                onChange={(e) => setEditDeptDesc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Department Head Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Head *
                </label>
                <select
                  value={editDeptLead}
                  onChange={(e) => setEditDeptLead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
                >
                  <option value={editingDept.leadName}>{editingDept.leadName} (Current)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} · {m.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Co-Head *
                </label>
                <select
                  value={editDeptCoLead}
                  onChange={(e) => setEditDeptCoLead(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={editingDept.coLeadName}>{editingDept.coLeadName} (Current)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} · {m.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tools & Technologies (comma-separated)
              </label>
              <input
                type="text"
                value={editDeptTools}
                onChange={(e) => setEditDeptTools(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Department Details</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: VIEW DEPARTMENT MEMBERS MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={Boolean(viewingDeptMembers)}
        onClose={() => setViewingDeptMembers(null)}
        title={viewingDeptMembers ? `${viewingDeptMembers.name} Department Roster` : ''}
        description="Assigned members and leads in this department"
        maxWidth="md"
      >
        {viewingDeptMembers && (() => {
          const deptMembersList = members.filter((m) => m.department === viewingDeptMembers.name);
          return (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
                <span>Total Assigned: <strong>{deptMembersList.length} members</strong></span>
                <span className="font-semibold text-indigo-600">Head: {viewingDeptMembers.leadName}</span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-slate-100">
                {deptMembersList.length === 0 ? (
                  <p className="py-6 text-center text-slate-400">
                    No members are currently assigned to this department.
                  </p>
                ) : (
                  deptMembersList.map((m) => (
                    <div
                      key={m.id}
                      className="pt-2 flex items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={m.avatarUrl}
                          name={m.name}
                          initials={m.initials}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{m.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          ROLE_CONFIGURATIONS[m.hierarchyRole]?.badgeColor || 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.hierarchyRole}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingDeptMembers(null);
                            onSelectMember(m);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                          title="Open profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingDeptMembers(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
