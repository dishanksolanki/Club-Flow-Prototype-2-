import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task, TaskStatus, TaskActivityEvent, Member, HierarchyRole } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Avatar } from '../common/Avatar';
import {
  Calendar,
  Clock,
  User,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  FileText,
  PlayCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

import { canUserReviewTask } from '../../utils/permissions';
import { Lock, ShieldAlert } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onUpdateTask: (updatedTask: Task) => void;
  onTriggerUnauthorized?: (action: string, reason: string, recommendedRole?: HierarchyRole) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  currentUser,
  onUpdateTask,
  onTriggerUnauthorized,
}) => {
  if (!task) return null;

  const [submissionLink, setSubmissionLink] = useState(task.submission?.submissionLink || '');
  const [submissionNotes, setSubmissionNotes] = useState(task.submission?.submissionNotes || '');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [newActivityNote, setNewActivityNote] = useState('');

  const allStatuses: TaskStatus[] = [
    'Pending',
    'In Progress',
    'Submitted',
    'Approved',
    'Rejected',
    'Completed',
    'Overdue',
  ];

  const handleStatusChange = (newStatus: TaskStatus) => {
    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: `Status changed to ${newStatus}`,
      actor: currentUser.name,
      timestamp: 'Just now',
      note: `Updated directly by ${currentUser.name}`,
    };

    const updated: Task = {
      ...task,
      status: newStatus,
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
  };

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionNotes.trim() && !submissionLink.trim()) return;

    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: 'Deliverable submitted',
      actor: currentUser.name,
      timestamp: 'Just now',
      note: submissionNotes.trim() || 'Work delivered for committee review',
    };

    const updated: Task = {
      ...task,
      status: 'Submitted',
      submission: {
        submittedAt: 'Just now',
        submittedBy: currentUser.name,
        submissionLink: submissionLink.trim(),
        submissionNotes: submissionNotes.trim(),
        reviewStatus: 'Pending',
      },
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
    setIsSubmittingWork(false);
  };

  const handleReviewAction = (decision: 'Approved' | 'Rejected') => {
    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: decision === 'Approved' ? 'Reviewed and Approved' : 'Reviewed and Rejected',
      actor: currentUser.name,
      timestamp: 'Just now',
      note: reviewComment.trim() || (decision === 'Approved' ? 'Quality criteria fulfilled' : 'Requires revisions'),
    };

    const updated: Task = {
      ...task,
      status: decision === 'Approved' ? 'Approved' : 'Rejected',
      submission: task.submission
        ? {
            ...task.submission,
            reviewStatus: decision,
            reviewComment: reviewComment.trim() || undefined,
          }
        : undefined,
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
    setReviewComment('');
  };

  const handleStartWork = () => {
    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: 'Work started',
      actor: currentUser.name,
      timestamp: 'Just now',
      note: 'In-progress on task deliverables',
    };

    const updated: Task = {
      ...task,
      status: 'In Progress',
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
  };

  const handleMarkComplete = () => {
    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: 'Marked Completed',
      actor: currentUser.name,
      timestamp: 'Just now',
      note: 'Task marked 100% completed and archived',
    };

    const updated: Task = {
      ...task,
      status: 'Completed',
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityNote.trim()) return;

    const newEvent: TaskActivityEvent = {
      id: `act-${Date.now()}`,
      action: 'Internal Note Added',
      actor: currentUser.name,
      timestamp: 'Just now',
      note: newActivityNote.trim(),
    };

    const updated: Task = {
      ...task,
      history: [...(task.history || []), newEvent],
    };

    onUpdateTask(updated);
    setNewActivityNote('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      description={`${task.department} Department · Created ${task.createdAt}`}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Top Badges & Quick Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} size="md" />
            <StatusBadge status={task.priority} size="md" />
            <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
              {task.department} Department
            </span>
          </div>

          {/* Inline Quick Status Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Update status:</span>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 cursor-pointer shadow-2xs"
            >
              {allStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task Metadata & Assignment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Assignment Information */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">
              Assignment Information
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned To:</span>
              <div className="flex items-center gap-2">
                <Avatar
                  src={task.assignedToAvatar}
                  name={task.assignedTo}
                  size="xs"
                />
                <span className="font-bold text-slate-900">{task.assignedTo}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned By:</span>
              <span className="font-semibold text-slate-800">{task.assignedBy}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-medium text-slate-800">{task.department}</span>
            </div>
          </div>

          {/* Timeline & Schedule Information */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] font-mono">
              Schedule & Deadlines
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Created Date:</span>
              <span className="font-mono text-slate-600">{task.createdAt}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Deadline Target:</span>
              <span className="font-mono font-bold text-slate-900">{task.deadline}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Priority Level:</span>
              <StatusBadge status={task.priority} size="sm" />
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Description & Requirements</h4>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
            {task.description}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {task.status === 'Pending' && (
            <button
              type="button"
              onClick={handleStartWork}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Start Working</span>
            </button>
          )}

          {task.status !== 'Completed' && (
            <button
              type="button"
              onClick={() => setIsSubmittingWork(!isSubmittingWork)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-slate-500" />
              <span>{task.submission ? 'Update Submission' : 'Submit Deliverable'}</span>
            </button>
          )}

          {task.status === 'Submitted' && (() => {
            const reviewPerm = canUserReviewTask(currentUser, task);
            if (reviewPerm.allowed) {
              return (
                <>
                  <button
                    type="button"
                    onClick={() => handleReviewAction('Approved')}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Submission</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewAction('Rejected')}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject & Request Changes</span>
                  </button>
                </>
              );
            }
            return (
              <div
                onClick={() =>
                  onTriggerUnauthorized &&
                  onTriggerUnauthorized('Review Task Deliverable', reviewPerm.reason || '')
                }
                className="px-3 py-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-amber-100/70 transition-colors"
                title="Click to view permission details"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium truncate max-w-xs sm:max-w-md">
                  Lead Review Restricted · {currentUser.hierarchyRole}
                </span>
                <span className="text-[10px] text-amber-900 underline font-semibold ml-1">
                  Why?
                </span>
              </div>
            );
          })()}

          {task.status === 'Approved' && (
            <button
              type="button"
              onClick={handleMarkComplete}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Completed</span>
            </button>
          )}

          {task.status === 'Rejected' && (
            <button
              type="button"
              onClick={() => setIsSubmittingWork(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Resubmit Revised Deliverable</span>
            </button>
          )}
        </div>

        {/* Submission Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Submission & Deliverable</span>
            </h4>
            {task.submission && (
              <span className="text-[11px] font-medium text-slate-500 font-mono">
                Submitted by {task.submission.submittedBy} · {task.submission.submittedAt}
              </span>
            )}
          </div>

          {/* Form to submit or update work */}
          {isSubmittingWork && (
            <form onSubmit={handleSubmitDeliverable} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                <span>Submit Deliverable for Review</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Deliverable Link / Artifact URL (GitHub PR, Figma, Drive, or docs)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://figma.com/file/..."
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  Submission Notes & Summary of Work *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Summarize what was completed, key highlights, or links to assets..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 resize-none shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSubmittingWork(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          )}

          {/* Render existing submission card if present */}
          {task.submission ? (
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2.5 shadow-2xs">
              {task.submission.submissionLink && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Artifact Link:</span>
                  <a
                    href={task.submission.submissionLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 underline truncate"
                  >
                    {task.submission.submissionLink}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}

              {task.submission.submissionNotes && (
                <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold block text-slate-800 mb-0.5">Notes:</span>
                  {task.submission.submissionNotes}
                </div>
              )}

              {task.submission.reviewComment && (
                <div className={`p-2.5 rounded-lg border text-xs ${
                  task.submission.reviewStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <span className="font-bold block mb-0.5">
                    Lead Review ({task.submission.reviewStatus}):
                  </span>
                  {task.submission.reviewComment}
                </div>
              )}
            </div>
          ) : !isSubmittingWork ? (
            <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
              <p className="text-xs text-slate-500">No deliverable has been submitted yet for this task.</p>
              <button
                type="button"
                onClick={() => setIsSubmittingWork(true)}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Submit Deliverable
              </button>
            </div>
          ) : null}
        </div>

        {/* Activity & History Timeline */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Activity & History Timeline</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {task.history?.length || 0} event records
            </span>
          </div>

          {/* Stepped visual chain */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {(task.history && task.history.length > 0) ? (
                task.history.map((h) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-slate-100" />
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">{h.action}</p>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {h.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      By <strong className="text-slate-700">{h.actor}</strong>
                    </p>
                    {h.note && (
                      <p className="text-[11px] text-slate-600 mt-1 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed shadow-2xs">
                        {h.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No activity logged yet.</div>
              )}
            </div>
          </div>

          {/* Add quick internal note form */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder="Add an internal committee note or progress update..."
              value={newActivityNote}
              onChange={(e) => setNewActivityNote(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-2xs"
            />
            <button
              type="submit"
              disabled={!newActivityNote.trim()}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-xs shrink-0"
            >
              Post Note
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
