import React, { useState } from 'react';
import {
  Search,
  Plus,
  LayoutList,
  Kanban,
  Clock,
  User,
  ArrowUpDown,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { DepartmentType, Member, Task, TaskPriority, TaskStatus, HierarchyRole } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Avatar } from '../components/common/Avatar';
import { TaskDetailModal } from '../components/modals/TaskDetailModal';
import { canUserAssignTask, ROLE_CONFIGURATIONS } from '../utils/permissions';
import { Lock, ShieldCheck } from 'lucide-react';

interface TasksPageProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void | Promise<void>;
  onUpdateTask: (updatedTask: Task) => void | Promise<void>;
  onOpenCreateTask: () => void;
  departments: DepartmentType[];
  members: Member[];
  currentUser: Member;
  onTriggerUnauthorized?: (action: string, reason: string, recommendedRole?: HierarchyRole) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onUpdateTaskStatus,
  onUpdateTask,
  onOpenCreateTask,
  departments,
  currentUser,
  onTriggerUnauthorized,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('deadline-asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Task details modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const allStatuses: TaskStatus[] = [
    'Pending',
    'In Progress',
    'Submitted',
    'Approved',
    'Rejected',
    'Completed',
    'Overdue',
  ];

  const allPriorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

  // Priority weight for sorting
  const priorityWeight: Record<TaskPriority, number> = {
    Urgent: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  // Helper to parse dates for sorting
  const parseDeadlineToScore = (deadlineStr: string) => {
    const lower = deadlineStr.toLowerCase();
    if (lower.includes('yesterday')) return -1;
    if (lower.includes('today')) return 0;
    if (lower.includes('tomorrow')) return 1;

    const parsed = Date.parse(deadlineStr);
    if (!isNaN(parsed)) return parsed;

    const match = deadlineStr.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 999;
  };

  // Filtering
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (deptFilter !== 'All' && t.department !== deptFilter) return false;
    if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchAssignee = t.assignedTo.toLowerCase().includes(q);
      const matchAssigner = t.assignedBy.toLowerCase().includes(q);
      const matchDept = t.department.toLowerCase().includes(q);
      if (!matchTitle && !matchAssignee && !matchAssigner && !matchDept) return false;
    }
    return true;
  });

  // Sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOption === 'deadline-asc') {
      return parseDeadlineToScore(a.deadline) - parseDeadlineToScore(b.deadline);
    }
    if (sortOption === 'deadline-desc') {
      return parseDeadlineToScore(b.deadline) - parseDeadlineToScore(a.deadline);
    }
    if (sortOption === 'priority-desc') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (sortOption === 'priority-asc') {
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    }
    if (sortOption === 'created-desc') {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return 0;
  });

  const handleOpenTaskDetail = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskModalUpdate = async (updatedTask: Task) => {
    setSelectedTask(updatedTask);
    await onUpdateTask(updatedTask);
  };

  // Sync selectedTask when tasks prop changes (rollback or external update)
  React.useEffect(() => {
    if (selectedTask) {
      const match = tasks.find((t) => t.id === selectedTask.id);
      if (match) {
        setSelectedTask(match);
      }
    }
  }, [tasks]);

  // Metric counts
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const submittedCount = tasks.filter((t) => t.status === 'Submitted').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed' || t.status === 'Approved').length;
  const overdueCount = tasks.filter((t) => t.status === 'Overdue').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Department Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track club assignments, deadlines, deliverables, and submissions across committees.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Table list view"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-label="Kanban board view"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          {/* Add Task Button with Role Scope Indication */}
          {(() => {
            const assignPerm = canUserAssignTask(currentUser);
            const roleCfg = ROLE_CONFIGURATIONS[currentUser.hierarchyRole];
            const isRestricted = !assignPerm.allowed;

            return (
              <button
                type="button"
                onClick={() => {
                  if (assignPerm.allowed) {
                    onOpenCreateTask();
                  } else if (onTriggerUnauthorized) {
                    onTriggerUnauthorized(
                      'Assign / Create Task',
                      assignPerm.reason || 'You do not have permissions to create tasks.',
                      'Department Head'
                    );
                  }
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  isRestricted
                    ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                    : 'text-white bg-slate-900 hover:bg-slate-800'
                }`}
                title={
                  isRestricted
                    ? assignPerm.reason
                    : roleCfg.canAssignTasksAnyDept
                    ? 'Create task (Club-wide)'
                    : `Create task (${currentUser.department} Department)`
                }
              >
                {isRestricted ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <Plus className="w-4 h-4 text-indigo-400" />
                )}
                <span>
                  {isRestricted
                    ? 'Add Task (Leads Only)'
                    : roleCfg.canAssignTasksAnyDept
                    ? 'Add Task'
                    : `Add Task (${currentUser.department})`}
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Task Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Tasks</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider font-mono">In Progress</span>
          <p className="text-xl font-bold font-mono tabular-nums text-sky-700 mt-1">{inProgressCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider font-mono">Submitted</span>
          <p className="text-xl font-bold font-mono tabular-nums text-purple-700 mt-1">{submittedCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">Completed</span>
          <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-mono">Overdue</span>
          <p className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1">{overdueCount}</p>
        </div>
      </div>

      {/* Filter, Search, and Sort Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
              >
                <option value="All">All Statuses ({tasks.length})</option>
                {allStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st} ({tasks.filter((t) => t.status === st).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
              >
                <option value="All">All Priorities</option>
                {allPriorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by Deadline / Priority */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
              >
                <option value="deadline-asc">Sort: Deadline (Earliest)</option>
                <option value="deadline-desc">Sort: Deadline (Latest)</option>
                <option value="priority-desc">Sort: Priority (Highest)</option>
                <option value="priority-asc">Sort: Priority (Lowest)</option>
                <option value="created-desc">Sort: Recently Created</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks, title, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400"
            />
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(statusFilter !== 'All' || deptFilter !== 'All' || priorityFilter !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {sortedTasks.length} of {tasks.length} tasks</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setDeptFilter('All');
                setPriorityFilter('All');
                setSearchQuery('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Render Table List View */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] font-mono">
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No matching tasks found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try resetting or broadening your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTaskDetail(t)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Task Title & Description snippet */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {t.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {t.description}
                        </p>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {t.department}
                        </span>
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={t.assignedToAvatar}
                            name={t.assignedTo}
                            size="xs"
                          />
                          <span className="font-semibold text-slate-800">{t.assignedTo}</span>
                        </div>
                      </td>

                      {/* Assigned By */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                        {t.assignedBy}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                        {t.createdAt}
                      </td>

                      {/* Deadline */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-800 font-medium">
                        {t.deadline}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={t.priority} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={t.status} size="sm" />
                      </td>

                      {/* Action / View details */}
                      <td
                        className="py-3.5 px-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={t.status}
                            onChange={(e) =>
                              onUpdateTaskStatus(t.id, e.target.value as TaskStatus)
                            }
                            className="text-[11px] font-semibold px-2 py-1 rounded-md border border-slate-200 bg-white hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-slate-900/10 text-slate-800 cursor-pointer shadow-2xs"
                          >
                            {allStatuses.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleOpenTaskDetail(t)}
                            title="View task details"
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
      ) : (
        /* Render Kanban Board View with all 7 statuses */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5 items-start">
          {allStatuses.map((status) => {
            const columnTasks = sortedTasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="bg-slate-100/60 rounded-xl border border-slate-200/80 p-3 min-h-[380px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-slate-800">{status}</span>
                  <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-2xs">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-[11px] text-slate-400">
                      No tasks
                    </div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleOpenTaskDetail(t)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                            {t.department}
                          </span>
                          <StatusBadge status={t.priority} size="sm" />
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                          {t.title}
                        </h4>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{t.assignedTo.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[10px] shrink-0">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{t.deadline.split(',')[0]}</span>
                          </div>
                        </div>

                        {/* Quick state changer */}
                        <div
                          className="pt-1 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-slate-400">Status:</span>
                          <select
                            value={t.status}
                            onChange={(e) =>
                              onUpdateTaskStatus(t.id, e.target.value as TaskStatus)
                            }
                            className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium"
                          >
                            {allStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details Modal View */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        currentUser={currentUser}
        onUpdateTask={handleTaskModalUpdate}
        onTriggerUnauthorized={onTriggerUnauthorized}
      />
    </div>
  );
};
