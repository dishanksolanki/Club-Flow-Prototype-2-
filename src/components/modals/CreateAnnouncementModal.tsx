import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Announcement, DepartmentType, Member } from '../../types';
import { Users, Building, AlertCircle } from 'lucide-react';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAnnouncement: (announcement: Announcement) => void;
  currentUser: Member;
  departments: DepartmentType[];
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onAddAnnouncement,
  currentUser,
  departments,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Important' | 'Urgent'>('Normal');
  const [audience, setAudience] = useState<'All Members' | 'Specific Department'>('All Members');
  const [targetDepartment, setTargetDepartment] = useState<DepartmentType>('Technical');
  const [pinned, setPinned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const formattedDate = `${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newAnnouncement: Announcement = {
      id: `anc-${Date.now()}`,
      title: title.trim(),
      content: message.trim(),
      message: message.trim(),
      postedBy: currentUser.name,
      authorRole: currentUser.role,
      authorAvatar: currentUser.avatarUrl,
      department: audience === 'All Members' ? 'General' : targetDepartment,
      audience,
      targetDepartment: audience === 'Specific Department' ? targetDepartment : undefined,
      date: formattedDate,
      priority,
      pinned,
    };

    onAddAnnouncement(newAnnouncement);
    setTitle('');
    setMessage('');
    setAudience('All Members');
    setPriority('Normal');
    setPinned(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Announcement"
      description="Publish an official communication, directive, or update for club members."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Announcement Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. HackNova 2026 Logistics Standup & Check-In"
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 shadow-2xs"
          />
        </div>

        {/* Priority & Audience Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'Normal' | 'Important' | 'Urgent')}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer shadow-2xs"
            >
              <option value="Normal">Normal</option>
              <option value="Important">Important</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Audience *
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as 'All Members' | 'Specific Department')}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer shadow-2xs"
            >
              <option value="All Members">All Members</option>
              <option value="Specific Department">Specific Department</option>
            </select>
          </div>
        </div>

        {/* Conditional Department Selection */}
        {audience === 'Specific Department' && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Department *</span>
            </div>
            <select
              value={targetDepartment}
              onChange={(e) => setTargetDepartment(e.target.value as DepartmentType)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer shadow-2xs"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d} Department
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Only members belonging to this department will receive notification priority.
            </p>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Message *
          </label>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write clear instructions, operational updates, schedule adjustments, or deliverables..."
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 resize-none shadow-2xs"
          />
        </div>

        {/* Pin directive checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="pinned-checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer"
          />
          <label htmlFor="pinned-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
            Pin announcement to the top of the feed
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Publish Announcement
          </button>
        </div>
      </form>
    </Modal>
  );
};
