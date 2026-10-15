import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Member, Task, AttendanceRecord, WorkingHourRecord, ClubEvent } from '../../types';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import {
  Mail,
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  CheckSquare,
  ChevronRight,
  UserX,
  FileText,
  CalendarCheck2,
} from 'lucide-react';

import { ROLE_CONFIGURATIONS } from '../../utils/permissions';
import { ShieldCheck } from 'lucide-react';

interface MemberDetailModalProps {
  member: Member | null;
  onClose: () => void;
  tasks?: Task[];
  attendanceRecords?: AttendanceRecord[];
  workingHours?: WorkingHourRecord[];
  events?: ClubEvent[];
  onSelectTask?: (task: Task) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  onClose,
  tasks = [],
  attendanceRecords = [],
  workingHours = [],
  events = [],
  onSelectTask,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'workRecords' | 'tasks'>('overview');

  if (!member) return null;

  // Filter tasks assigned to this member
  const memberTasks = tasks.filter(
    (t) =>
      t.assignedTo.trim().toLowerCase() === member.name.trim().toLowerCase() ||
      t.assignedTo.toLowerCase().includes(member.name.toLowerCase()) ||
      member.name.toLowerCase().includes(t.assignedTo.toLowerCase())
  );
  const tasksCompletedCount = memberTasks.filter(
    (t) => t.status === 'Completed' || t.status === 'Approved'
  ).length;

  // Filter attendance records for this member
  const memberAttendance = attendanceRecords.filter(
    (r) =>
      r.member.toLowerCase() === member.name.toLowerCase() ||
      r.member.toLowerCase().includes(member.name.toLowerCase()) ||
      member.name.toLowerCase().includes(r.member.toLowerCase())
  );

  const eventsAttended = memberAttendance.filter(
    (r) => r.status === 'Present' || r.status === 'Late'
  ).length;

  const eventsMissed = memberAttendance.filter(
    (r) => r.status === 'Absent'
  ).length;

  const totalTrackedAttendance = memberAttendance.length;

  const calculatedAttendanceRate =
    totalTrackedAttendance > 0
      ? Math.round((eventsAttended / totalTrackedAttendance) * 100)
      : member.attendanceRate;

  // Filter working hours for this member
  const memberWorkRecords = workingHours.filter(
    (r) =>
      (r.member || '').toLowerCase() === member.name.toLowerCase() ||
      (r.member || '').toLowerCase().includes(member.name.toLowerCase()) ||
      member.name.toLowerCase().includes((r.member || '').toLowerCase())
  );

  const totalWorkHours =
    memberWorkRecords.length > 0
      ? memberWorkRecords.reduce((acc, r) => acc + r.hours, 0)
      : member.workingHours;

  const weeklyWorkHours =
    memberWorkRecords
      .filter((r) => r.date.includes('Oct 10') || r.date.includes('Oct 11') || r.date.includes('Oct 12') || r.date.includes('Oct 13'))
      .reduce((acc, r) => acc + r.hours, 0) || parseFloat((totalWorkHours * 0.25).toFixed(1));

  return (
    <Modal
      isOpen={Boolean(member)}
      onClose={onClose}
      title="Member Profile"
      description={`${member.department} Department · ${member.hierarchyRole}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Profile Card Header */}
        <div className="flex items-start gap-4">
          <Avatar
            src={member.avatarUrl}
            name={member.name}
            initials={member.initials}
            size="xl"
            className="ring-4 ring-slate-100 shadow-xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-slate-900">{member.name}</h4>
              <StatusBadge status={member.status} size="sm" />
            </div>
            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
              {member.role}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                ROLE_CONFIGURATIONS[member.hierarchyRole]?.badgeColor || 'bg-slate-100 text-slate-700'
              }`}>
                Tier {ROLE_CONFIGURATIONS[member.hierarchyRole]?.rank || '-'} · {member.hierarchyRole}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {member.department} Department
              </span>
            </div>
          </div>
        </div>

        {/* Role Mandate Summary Banner */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">{member.hierarchyRole}: </span>
            <span>{ROLE_CONFIGURATIONS[member.hierarchyRole]?.description}</span>
          </div>
        </div>

        {/* Bio */}
        {member.bio && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-700 leading-relaxed shadow-2xs">
            {member.bio}
          </div>
        )}

        {/* University & Contact details */}
        <div className="space-y-2 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <a
              href={`mailto:${member.email}`}
              className="hover:text-indigo-600 transition-colors truncate"
            >
              {member.email}
            </a>
          </div>
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              ID: <strong className="font-mono text-slate-700">{member.studentId}</strong> · {member.year}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Joined Organization: <strong>{member.joinDate}</strong>
            </span>
          </div>
        </div>

        {/* Key Metrics Grid (Attendance, Work Hours, Tasks) */}
        <div>
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
            Performance & Track Record
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Overall Attendance */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {calculatedAttendanceRate}%
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Attendance</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {eventsAttended} attended · {eventsMissed} missed
              </p>
            </div>

            {/* Total Work Hours */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {totalWorkHours.toFixed(1)}h
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Total Hours</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                {weeklyWorkHours.toFixed(1)}h this week
              </p>
            </div>

            {/* Tasks Completed */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {tasksCompletedCount}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Tasks Finished</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                of {memberTasks.length} assigned
              </p>
            </div>

            {/* Events Attended */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                <CalendarCheck2 className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                {eventsAttended}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Events Attended</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {totalTrackedAttendance} sessions total
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls for Deep Dive */}
        <div className="border-b border-slate-200 flex items-center gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Assigned Tasks ({memberTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === 'attendance'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Attendance History ({memberAttendance.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workRecords')}
            className={`pb-2 transition-colors cursor-pointer ${
              activeTab === 'workRecords'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Work Records ({memberWorkRecords.length})
          </button>
        </div>

        {/* Tab 1: Assigned Tasks */}
        {activeTab === 'overview' && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {memberTasks.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                No tasks currently assigned to this member.
              </div>
            ) : (
              memberTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className={`p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3 shadow-2xs ${
                    onSelectTask ? 'cursor-pointer group' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <StatusBadge status={task.status} size="sm" />
                      <StatusBadge status={task.priority} size="sm" />
                      <span className="text-[11px] font-mono text-slate-500">
                        Due {task.deadline}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {task.title}
                    </p>
                  </div>

                  {onSelectTask && (
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 transition-colors" />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Recent Attendance History */}
        {activeTab === 'attendance' && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {memberAttendance.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                No attendance records on file for this member.
              </div>
            ) : (
              memberAttendance.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={rec.status} size="sm" />
                      <span className="text-[11px] font-mono text-slate-500">
                        {rec.date} · {rec.checkInTime}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {rec.eventName}
                    </p>
                    {rec.notes && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        Note: {rec.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono shrink-0">
                    By {rec.recordedBy}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Recent Work Records */}
        {activeTab === 'workRecords' && (
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {memberWorkRecords.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400">
                No work records logged for this member yet.
              </div>
            ) : (
              memberWorkRecords.map((wh) => (
                <div
                  key={wh.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={wh.status} size="sm" />
                      <span className="text-[11px] font-mono text-slate-500">
                        {wh.date} · {wh.startTime || '02:00 PM'} – {wh.endTime || '05:30 PM'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {wh.project}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {wh.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {wh.hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
