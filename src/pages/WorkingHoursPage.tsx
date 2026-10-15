import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  Plus,
  RotateCcw,
  Building,
  CheckCircle2,
  FileText,
  User,
} from 'lucide-react';
import { WorkingHourRecord, Member, DepartmentType } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';

interface WorkingHoursPageProps {
  records: WorkingHourRecord[];
  members: Member[];
  currentUser: Member;
  onOpenLogHours: () => void;
  onSelectMember?: (member: Member) => void;
  onUpdateRecordStatus?: (recordId: string, newStatus: 'Verified' | 'Pending Verification') => void;
  onTriggerUnauthorized?: (action: string, reason: string) => void;
}

export const WorkingHoursPage: React.FC<WorkingHoursPageProps> = ({
  records,
  members,
  currentUser,
  onOpenLogHours,
  onSelectMember,
  onUpdateRecordStatus,
  onTriggerUnauthorized,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Verified' | 'Pending Verification'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [memberFilter, setMemberFilter] = useState<string>('All');

  // Calculations
  const totalHours = records.reduce((acc, r) => acc + r.hours, 0);

  // Helper to test if a record is from this week / recent
  const isRecordInCurrentWeek = (dateStr: string) => {
    if (!dateStr) return false;
    const lower = dateStr.toLowerCase();
    if (lower.includes('today') || lower.includes('just now') || lower.includes('yesterday')) return true;
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      const diffDays = Math.abs(Date.now() - parsed) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }
    const dayMatch = dateStr.match(/\b(0?[8-9]|[12]\d|3[01])\b/);
    return Boolean(dayMatch && dateStr.includes('Oct'));
  };

  // This week's hours (sum of records within current week or recently added)
  const thisWeekHours = records
    .filter((r) => isRecordInCurrentWeek(r.date))
    .reduce((acc, r) => acc + r.hours, 0);

  // This month's hours (sum of records in current month)
  const thisMonthHours = records
    .filter((r) => {
      const lower = r.date.toLowerCase();
      if (lower.includes('today') || lower.includes('just now')) return true;
      const parsed = Date.parse(r.date);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return r.date.includes('Oct') || r.date.includes('Nov');
    })
    .reduce((acc, r) => acc + r.hours, 0);

  // Average hours per week (estimate across the 6-week fall term so far)
  const avgHoursPerWeek = parseFloat((totalHours / 6).toFixed(1));

  // Department breakdown
  const departments: DepartmentType[] = [
    'Technical',
    'Design',
    'Marketing',
    'Event Management',
    'Media',
    'Content',
  ];

  const deptHoursMap: Record<DepartmentType, number> = {
    Technical: 0,
    Design: 0,
    Marketing: 0,
    'Event Management': 0,
    Media: 0,
    Content: 0,
  };

  records.forEach((r) => {
    if (deptHoursMap[r.department] !== undefined) {
      deptHoursMap[r.department] += r.hours;
    }
  });

  const filteredRecords = records.filter((r) => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (departmentFilter !== 'All' && r.department !== departmentFilter) return false;
    if (memberFilter !== 'All' && r.member.toLowerCase() !== memberFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchProject = r.project.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchDept = r.department.toLowerCase().includes(q);
      const matchMember = (r.member || '').toLowerCase().includes(q);
      if (!matchProject && !matchDesc && !matchDept && !matchMember) return false;
    }
    return true;
  });

  const getMemberObj = (name: string) => {
    return members.find((m) => m.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-900 text-white">
              Effort & Audit
            </span>
            <span className="text-xs text-slate-500 font-medium">Accreditation Logging</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Working Hours & Contributions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log engineering development, event staging, and logistics volunteer time for official university certification.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLogHours}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Work Record</span>
        </button>
      </div>

      {/* KPI Stat Cards (4 Statistics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Working Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Working Hours</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalHours.toFixed(1)}h
            </span>
            <span className="text-xs text-indigo-600 font-semibold font-mono">Verified + Pending</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Across {records.length} logged deliverables
          </p>
        </div>

        {/* This Week's Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">This Week's Hours</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {thisWeekHours.toFixed(1)}h
            </span>
            <span className="text-xs text-emerald-600 font-semibold font-mono">+3.5h vs last week</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Active sprints & hackathon prep
          </p>
        </div>

        {/* This Month's Hours */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">This Month's Hours</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {thisMonthHours.toFixed(1)}h
            </span>
            <span className="text-xs text-blue-600 font-semibold font-mono">October 2026</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Term threshold: 40h accreditation
          </p>
        </div>

        {/* Average Hours per Week */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Avg Hours per Week</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {avgHoursPerWeek.toFixed(1)}h
            </span>
            <span className="text-xs text-amber-700 font-semibold font-mono">Steady Pace</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
            Consistent commitment standard
          </p>
        </div>
      </div>

      {/* Working Hours by Department Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Working Hours by Department
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Total {totalHours.toFixed(1)} hours logged
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {departments.map((dept) => {
            const hrs = deptHoursMap[dept] || 0;
            const pct = totalHours > 0 ? Math.round((hrs / totalHours) * 100) : 0;
            return (
              <div
                key={dept}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-semibold text-slate-600 truncate block">
                    {dept}
                  </span>
                  <p className="text-base font-bold font-mono text-slate-900 mt-1">
                    {hrs.toFixed(1)}h
                  </p>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                    {pct}% of club total
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            {(['All', 'Verified', 'Pending Verification'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === filter
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium cursor-pointer max-w-xs truncate"
          >
            <option value="All">All Members</option>
            {members.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>

          {(statusFilter !== 'All' || departmentFilter !== 'All' || memberFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setDepartmentFilter('All');
                setMemberFilter('All');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search member, activity, task..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Work Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Activity / Task</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">End Time</th>
                <th className="py-3 px-4 text-center">Total Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No work records match the filter criteria</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting your filters or log your volunteer hours.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const memberObj = getMemberObj(r.member || '');
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Member */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div
                          onClick={() => memberObj && onSelectMember && onSelectMember(memberObj)}
                          className={`flex items-center gap-2 ${
                            memberObj && onSelectMember ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''
                          }`}
                        >
                          <Avatar
                            src={memberObj?.avatarUrl}
                            name={r.member || 'Member'}
                            size="sm"
                          />
                          <span>{r.member || 'Member'}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.department}
                        </span>
                      </td>

                      {/* Activity / Task */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <p className="font-semibold text-slate-900">{r.project}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-1">
                          {r.description}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {r.date}
                      </td>

                      {/* Start Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                        {r.startTime || '02:00 PM'}
                      </td>

                      {/* End Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                        {r.endTime || '05:30 PM'}
                      </td>

                      {/* Total Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-900 tabular-nums">
                        {r.hours.toFixed(1)}h
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} size="sm" />
                          {onUpdateRecordStatus && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateRecordStatus(
                                  r.id,
                                  r.status === 'Verified' ? 'Pending Verification' : 'Verified'
                                )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer border ${
                                r.status === 'Verified'
                                  ? 'text-slate-500 bg-slate-50 hover:bg-slate-100 border-slate-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 shadow-2xs'
                              }`}
                              title={r.status === 'Verified' ? 'Click to mark Pending' : 'Click to Verify hours'}
                            >
                              {r.status === 'Verified' ? 'Revert' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
