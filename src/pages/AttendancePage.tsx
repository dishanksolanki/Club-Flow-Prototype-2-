import React, { useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  Search,
  Filter,
  Plus,
  RotateCcw,
  UserCheck,
  Award,
  ChevronRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, DepartmentType, Member, ClubEvent } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';
import { Modal } from '../components/common/Modal';
import { canUserManageAttendance } from '../utils/permissions';

interface AttendancePageProps {
  records: AttendanceRecord[];
  members: Member[];
  events: ClubEvent[];
  currentUser: Member;
  onUpdateAttendanceStatus: (recordId: string, newStatus: AttendanceStatus) => void;
  onAddAttendanceRecord: (record: AttendanceRecord) => void;
  onSelectMember?: (member: Member) => void;
  onTriggerUnauthorized?: (action: string, reason: string) => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  records,
  members,
  events,
  currentUser,
  onUpdateAttendanceStatus,
  onAddAttendanceRecord,
  onSelectMember,
  onTriggerUnauthorized,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [eventFilter, setEventFilter] = useState<string>('All');

  // Mark/Log Attendance Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalEventName, setModalEventName] = useState(events[0]?.title || 'Autonomous Rover & Microcontroller Demo Day');
  const [modalMemberName, setModalMemberName] = useState(members[0]?.name || currentUser.name);
  const [modalCheckInTime, setModalCheckInTime] = useState('02:00 PM');
  const [modalStatus, setModalStatus] = useState<AttendanceStatus>('Present');
  const [modalNotes, setModalNotes] = useState('');

  // Calculations
  const presentCount = records.filter((r) => r.status === 'Present').length;
  const absentCount = records.filter((r) => r.status === 'Absent').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const excusedCount = records.filter((r) => r.status === 'Excused').length;
  const totalRecords = records.length;

  // Unique events represented in attendance
  const uniqueEventNames = Array.from(new Set(records.map((r) => r.eventName)));
  const totalEventsCount = Math.max(events.length, uniqueEventNames.length);

  // Overall attendance percentage calculation (Present + Late count as attended)
  const attendancePercentage =
    totalRecords > 0
      ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
      : 0;

  // Filtered records
  const filteredRecords = records.filter((r) => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (departmentFilter !== 'All' && r.department !== departmentFilter) return false;
    if (eventFilter !== 'All' && r.eventName !== eventFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.eventName.toLowerCase().includes(q);
      const matchMember = r.member.toLowerCase().includes(q);
      const matchDept = r.department.toLowerCase().includes(q);
      const matchRecorder = r.recordedBy.toLowerCase().includes(q);
      if (!matchName && !matchMember && !matchDept && !matchRecorder) return false;
    }
    return true;
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMember = members.find((m) => m.name === modalMemberName);
    const targetEvent = events.find((ev) => ev.title === modalEventName);

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      eventName: modalEventName,
      eventId: targetEvent?.id,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      member: modalMemberName,
      memberAvatar: targetMember?.avatarUrl,
      department: targetMember ? targetMember.department : 'Technical',
      checkInTime: modalStatus === 'Absent' || modalStatus === 'Excused' ? '—' : modalCheckInTime,
      status: modalStatus,
      recordedBy: currentUser.name,
      verifiedBy: currentUser.name,
      notes: modalNotes.trim() || undefined,
    };

    onAddAttendanceRecord(newRecord);
    setIsRecordModalOpen(false);
    setModalNotes('');
  };

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
              Roll Call & Audit
            </span>
            <span className="text-xs text-slate-500 font-medium">Session Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time roll call, member check-in records, excuses, and institutional attendance compliance.
          </p>
        </div>

        {(() => {
          const perm = canUserManageAttendance(currentUser);
          const isRestricted = !perm.allowed;

          return (
            <button
              type="button"
              onClick={() => {
                if (perm.allowed) {
                  setIsRecordModalOpen(true);
                } else if (onTriggerUnauthorized) {
                  onTriggerUnauthorized(
                    'Record Attendance',
                    perm.reason || 'Attendance registers are recorded by Department Leads and Executive Leadership.'
                  );
                }
              }}
              title={isRestricted ? perm.reason : 'Record session check-in and excuses'}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 shrink-0 cursor-pointer ${
                isRestricted
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isRestricted ? <Lock className="w-4 h-4 text-slate-500" /> : <Plus className="w-4 h-4" />}
              <span>{isRestricted ? 'Record Attendance (Leads Only)' : 'Record Attendance'}</span>
            </button>
          );
        })()}
      </div>

      {/* KPI Stat Cards (6 Statistics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Overall Percentage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Overall Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {attendancePercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${attendancePercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Dean threshold: 75%</p>
          </div>
        </div>

        {/* Total Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Events
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {totalEventsCount}
            </span>
            <p className="text-[10px] text-slate-400 mt-2">{uniqueEventNames.length} logged sessions</p>
          </div>
        </div>

        {/* Present */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Present
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {presentCount}
            </span>
            <p className="text-[10px] text-emerald-600 font-medium mt-2">On-time check-ins</p>
          </div>
        </div>

        {/* Late */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Late
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {lateCount}
            </span>
            <p className="text-[10px] text-amber-700 font-medium mt-2">After start time</p>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Absent
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {absentCount}
            </span>
            <p className="text-[10px] text-rose-600 font-medium mt-2">Unexcused misses</p>
          </div>
        </div>

        {/* Excused */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Excused
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {excusedCount}
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-2">Approved leave notes</p>
          </div>
        </div>
      </div>

      {/* Attendance Trend Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Attendance Distribution & Trend
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Present ({Math.round((presentCount / totalRecords) * 100 || 0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Late ({Math.round((lateCount / totalRecords) * 100 || 0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Absent ({Math.round((absentCount / totalRecords) * 100 || 0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Excused ({Math.round((excusedCount / totalRecords) * 100 || 0)}%)</span>
            </span>
          </div>
        </div>

        {/* Stacked Visual Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${(presentCount / totalRecords) * 100}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`Present: ${presentCount}`}
          />
          <div
            style={{ width: `${(lateCount / totalRecords) * 100}%` }}
            className="bg-amber-500 h-full transition-all"
            title={`Late: ${lateCount}`}
          />
          <div
            style={{ width: `${(absentCount / totalRecords) * 100}%` }}
            className="bg-rose-500 h-full transition-all"
            title={`Absent: ${absentCount}`}
          />
          <div
            style={{ width: `${(excusedCount / totalRecords) * 100}%` }}
            className="bg-slate-400 h-full transition-all"
            title={`Excused: ${excusedCount}`}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium cursor-pointer"
          >
            <option value="All">All Statuses ({records.length})</option>
            <option value="Present">Present ({presentCount})</option>
            <option value="Late">Late ({lateCount})</option>
            <option value="Absent">Absent ({absentCount})</option>
            <option value="Excused">Excused ({excusedCount})</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium cursor-pointer"
          >
            <option value="All">All Departments</option>
            <option value="Technical">Technical</option>
            <option value="Design">Design</option>
            <option value="Marketing">Marketing</option>
            <option value="Event Management">Event Management</option>
            <option value="Media">Media</option>
            <option value="Content">Content</option>
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium cursor-pointer max-w-xs truncate"
          >
            <option value="All">All Events</option>
            {uniqueEventNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {(statusFilter !== 'All' || departmentFilter !== 'All' || eventFilter !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setDepartmentFilter('All');
                setEventFilter('All');
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
            placeholder="Search member, event, recorder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4">Event Name</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <UserX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No attendance records found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try resetting your filters or record attendance.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const memberObj = getMemberObj(r.member);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Event Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 min-w-[200px]">
                        <div>
                          <span>{r.eventName}</span>
                          {r.notes && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5 max-w-xs truncate">
                              Note: {r.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {r.date}
                      </td>

                      {/* Member */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                        <div
                          onClick={() => memberObj && onSelectMember && onSelectMember(memberObj)}
                          className={`flex items-center gap-2 ${
                            memberObj && onSelectMember ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''
                          }`}
                        >
                          <Avatar
                            src={r.memberAvatar || memberObj?.avatarUrl}
                            name={r.member}
                            size="sm"
                          />
                          <span>{r.member}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.department}
                        </span>
                      </td>

                      {/* Check-In Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700 font-medium">
                        {r.checkInTime}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={r.status} size="sm" />
                      </td>

                      {/* Recorded By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {r.recordedBy}
                      </td>

                      {/* Actions: Mark Present, Absent, Late, Excused */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                          <button
                            type="button"
                            title="Mark Present"
                            onClick={() => onUpdateAttendanceStatus(r.id, 'Present')}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              r.status === 'Present'
                                ? 'bg-emerald-600 text-white'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            title="Mark Late"
                            onClick={() => onUpdateAttendanceStatus(r.id, 'Late')}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              r.status === 'Late'
                                ? 'bg-amber-600 text-white'
                                : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            L
                          </button>
                          <button
                            type="button"
                            title="Mark Absent"
                            onClick={() => onUpdateAttendanceStatus(r.id, 'Absent')}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              r.status === 'Absent'
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            title="Mark Excused"
                            onClick={() => onUpdateAttendanceStatus(r.id, 'Excused')}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                              r.status === 'Excused'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                          >
                            E
                          </button>
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

      {/* Record Attendance Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Member Attendance"
        description="Mark roll call status for an authorized club event or meeting session."
        maxWidth="md"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Club Event / Session *
            </label>
            <select
              value={modalEventName}
              onChange={(e) => setModalEventName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            >
              {events.map((e) => (
                <option key={e.id} value={e.title}>
                  {e.title} ({e.date})
                </option>
              ))}
              {uniqueEventNames
                .filter((name) => !events.some((ev) => ev.title === name))
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Member *
              </label>
              <select
                value={modalMemberName}
                onChange={(e) => setModalMemberName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status *
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
          </div>

          {modalStatus !== 'Absent' && modalStatus !== 'Excused' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Check-In Time
              </label>
              <input
                type="text"
                value={modalCheckInTime}
                onChange={(e) => setModalCheckInTime(e.target.value)}
                placeholder="e.g. 02:00 PM"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance Note / Reason (Optional)
            </label>
            <textarea
              rows={2}
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              placeholder="e.g. Early setup assistant, shuttle transit delay, or medical excuse..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
