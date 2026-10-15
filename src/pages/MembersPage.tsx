import React, { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Mail,
  GraduationCap,
  Clock,
  CheckCircle2,
  Award,
  Users,
  ShieldCheck,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import { DepartmentType, Member, Task } from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { canUserManageMembers, ROLE_CONFIGURATIONS } from '../utils/permissions';
import { CreateMemberModal } from '../components/modals/CreateMemberModal';
import { UserPlus, Shield } from 'lucide-react';

interface MembersPageProps {
  members: Member[];
  departments: DepartmentType[];
  tasks?: Task[];
  onSelectMember: (member: Member) => void;
  currentUser?: Member;
  onAddMember?: (member: Member) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  members,
  departments,
  tasks = [],
  onSelectMember,
  currentUser,
  onAddMember,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const canManage = currentUser ? canUserManageMembers(currentUser).allowed : false;
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const statusOptions = ['All', 'Active', 'Core Lead', 'On Leave', 'Probation'];

  const filteredMembers = members.filter((m) => {
    if (selectedDept !== 'All' && m.department !== selectedDept) return false;
    if (statusFilter !== 'All' && m.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchRole = m.role.toLowerCase().includes(q);
      const matchEmail = m.email.toLowerCase().includes(q);
      const matchId = m.studentId.toLowerCase().includes(q);
      const matchDept = m.department.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchEmail && !matchId && !matchDept) return false;
    }
    return true;
  });

  // Calculate live summary statistics
  const coreLeadsCount = members.filter((m) => m.status === 'Core Lead').length;
  const activeCount = members.filter((m) => m.status === 'Active' || m.status === 'Core Lead').length;
  const avgAttendance = members.length > 0
    ? Math.round(members.reduce((acc, m) => acc + m.attendanceRate, 0) / members.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Club Members Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse registered students, committee chairs, department leads, and faculty advisors.
          </p>
        </div>

        {/* Actions Zone: Member Management & View Toggle */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Executive Control: Add Member (Only for President, VP, Operations Heads) */}
          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Onboard Member</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Roster Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Total Roster</span>
            <Users className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {members.length}
          </p>
          <span className="text-[10px] text-slate-400">Enrolled members</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono">Active Standing</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {activeCount}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold font-mono">In good standing</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Core Leads</span>
            <Award className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {coreLeadsCount}
          </p>
          <span className="text-[10px] text-slate-400">Executive board</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Avg Attendance</span>
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {avgAttendance}%
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Across all sessions</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
            >
              <option value="All">All Departments ({members.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d} ({members.filter((m) => m.department === d).length})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
            >
              <option value="All">All Statuses</option>
              {statusOptions.slice(1).map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {(selectedDept !== 'All' || statusFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDept('All');
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, role, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400"
          />
        </div>
      </div>

      {/* Grid or Table Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No members match your criteria</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try searching for a different name, department, or student ID.</p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const memberAssignedTasks = tasks.filter(
                (t) =>
                  t.assignedTo.trim().toLowerCase() === member.name.trim().toLowerCase() ||
                  t.assignedTo.toLowerCase().includes(member.name.toLowerCase())
              );

              return (
                <div
                  key={member.id}
                  onClick={() => onSelectMember(member)}
                  className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <Avatar
                        src={member.avatarUrl}
                        name={member.name}
                        initials={member.initials}
                        size="lg"
                        className="ring-2 ring-slate-100"
                      />
                      <StatusBadge status={member.status} size="sm" />
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                      {member.role}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {member.department} Department · {member.hierarchyRole}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>ID: <strong className="font-mono text-slate-700">{member.studentId}</strong> · {member.year}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics Strip */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-center bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                    <div>
                      <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px]">
                        <Award className="w-3 h-3 text-emerald-600" />
                      </div>
                      <p className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {member.attendanceRate}%
                      </p>
                      <p className="text-[10px] text-slate-400">Attendance</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      </div>
                      <p className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {member.tasksCompleted}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {memberAssignedTasks.length > 0 ? `${memberAssignedTasks.length} active` : 'Tasks'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-0.5 text-slate-400 text-[10px]">
                        <Clock className="w-3 h-3 text-blue-600" />
                      </div>
                      <p className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {member.workingHours}h
                      </p>
                      <p className="text-[10px] text-slate-400">Hours</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Department & Position</th>
                  <th className="py-3 px-4">Student ID / Year</th>
                  <th className="py-3 px-4 text-center">Attendance</th>
                  <th className="py-3 px-4 text-center">Tasks Done</th>
                  <th className="py-3 px-4 text-center">Work Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      No matching members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      onClick={() => onSelectMember(member)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.avatarUrl}
                            name={member.name}
                            initials={member.initials}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {member.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{member.role}</p>
                        <p className="text-[11px] text-slate-500">{member.department} Department</p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700">
                        {member.studentId}
                        <span className="block text-[11px] font-sans text-slate-400">{member.year}</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-900">
                        {member.attendanceRate}%
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-900">
                        {member.tasksCompleted}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-900">
                        {member.workingHours}h
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={member.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboard Member Modal (Executive Leadership) */}
      {currentUser && onAddMember && (
        <CreateMemberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddMember={onAddMember}
          departments={departments}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
