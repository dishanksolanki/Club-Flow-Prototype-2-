import React from 'react';
import { TaskStatus, TaskPriority, EventStatus } from '../../types';

interface StatusBadgeProps {
  status:
    | TaskStatus
    | EventStatus
    | TaskPriority
    | 'Active'
    | 'On Leave'
    | 'Core Lead'
    | 'Probation'
    | 'Inactive'
    | 'Present'
    | 'Absent'
    | 'Late'
    | 'Excused'
    | 'Verified'
    | 'Pending Verification'
    | 'Important'
    | 'Normal';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getConfig = () => {
    switch (status) {
      // Task Statuses
      case 'Pending':
        return {
          container: 'bg-slate-100 text-slate-700 border-slate-200/80',
          dot: 'bg-slate-400',
        };
      case 'In Progress':
        return {
          container: 'bg-sky-50 text-sky-700 border-sky-200/80',
          dot: 'bg-sky-500',
        };
      case 'Submitted':
        return {
          container: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dot: 'bg-purple-500',
        };
      case 'Approved':
        return {
          container: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
          dot: 'bg-indigo-500',
        };
      case 'Completed':
      case 'Present':
      case 'Verified':
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'Rejected':
      case 'Overdue':
      case 'Absent':
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500',
        };

      // Priorities
      case 'Urgent':
        return {
          container: 'bg-red-50 text-red-700 border-red-200/80 font-semibold',
          dot: 'bg-red-500',
        };
      case 'High':
      case 'Important':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200/80 font-medium',
          dot: 'bg-amber-500',
        };
      case 'Medium':
        return {
          container: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dot: 'bg-blue-500',
        };
      case 'Low':
      case 'Normal':
        return {
          container: 'bg-slate-100 text-slate-700 border-slate-200/80',
          dot: 'bg-slate-400',
        };

      // Member Statuses
      case 'Core Lead':
        return {
          container: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold',
          dot: 'bg-indigo-600',
        };
      case 'Active':
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'On Leave':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500',
        };
      case 'Probation':
        return {
          container: 'bg-orange-50 text-orange-700 border-orange-200/80',
          dot: 'bg-orange-500',
        };
      case 'Inactive':
        return {
          container: 'bg-slate-100 text-slate-500 border-slate-200/80',
          dot: 'bg-slate-400',
        };

      // Attendance & Verification
      case 'Late':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200/80 font-medium',
          dot: 'bg-amber-500',
        };
      case 'Excused':
      case 'Pending Verification':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500',
        };

      // Event Statuses
      case 'Upcoming':
        return {
          container: 'bg-blue-50 text-blue-700 border-blue-200/80 font-medium',
          dot: 'bg-blue-500',
        };
      case 'Ongoing':
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-medium',
          dot: 'bg-emerald-500',
        };
      case 'Cancelled':
        return {
          container: 'bg-slate-100 text-slate-500 border-slate-200/80',
          dot: 'bg-slate-400',
        };

      default:
        return {
          container: 'bg-slate-100 text-slate-700 border-slate-200/80',
          dot: 'bg-slate-400',
        };
    }
  };

  const { container, dot } = getConfig();
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-md whitespace-nowrap shrink-0 transition-colors shadow-2xs ${sizeClass} ${container}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};
