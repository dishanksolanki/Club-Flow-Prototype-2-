import React from 'react';
import { Modal } from '../common/Modal';
import { Announcement } from '../../types';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { Calendar, Pin, Users, Building, ShieldCheck, Share2 } from 'lucide-react';

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  isOpen,
  onClose,
}) => {
  if (!announcement) return null;

  const isSpecificDept = announcement.audience === 'Specific Department' || (announcement.department !== 'General' && announcement.department !== undefined);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Announcement Details"
      description={`Official Directive · ${announcement.department === 'General' ? 'Campus-Wide Broadcast' : `${announcement.department} Department`}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={announcement.priority} />
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {announcement.department === 'General' ? 'Campus-Wide / All Departments' : `${announcement.department} Department`}
            </span>
            {announcement.pinned && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md">
                <Pin className="w-3.5 h-3.5 fill-amber-600/30" />
                Pinned Directive
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              Audience:{' '}
              <strong className="text-slate-800">
                {announcement.audience || (announcement.department === 'General' ? 'All Members' : `${announcement.department} Dept`)}
              </strong>
            </span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-snug">
            {announcement.title}
          </h2>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Published on <strong className="text-slate-700 font-mono">{announcement.date}</strong></span>
          </div>
        </div>

        {/* Author Card */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={announcement.authorAvatar}
              name={announcement.postedBy}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {announcement.postedBy}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {announcement.authorRole}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">
            <ShieldCheck className="w-3 h-3" />
            <span>Authorized Officer</span>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
          {announcement.message || announcement.content}
        </div>

        {/* Target Audience Notice */}
        <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
          <Building className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            {announcement.department === 'General'
              ? 'This broadcast is visible to all registered members of the club organization.'
              : `This directive applies directly to members assigned to the ${announcement.department} Department.`}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
