import React, { useState } from 'react';
import {
  Megaphone,
  Pin,
  Calendar,
  Search,
  Filter,
  Plus,
  RotateCcw,
  Users,
  Building,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Announcement, DepartmentType } from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { AnnouncementDetailModal } from '../components/modals/AnnouncementDetailModal';

interface AnnouncementsPageProps {
  announcements: Announcement[];
  onOpenCreateAnnouncement?: () => void;
  departments?: DepartmentType[];
  onSelectAnnouncement?: (announcement: Announcement) => void;
}

export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({
  announcements,
  onOpenCreateAnnouncement,
  departments = [
    'Technical',
    'Design',
    'Marketing',
    'Event Management',
    'Media',
    'Content',
  ],
  onSelectAnnouncement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [selectedAnnouncementForDetail, setSelectedAnnouncementForDetail] =
    useState<Announcement | null>(null);

  const filteredAnnouncements = announcements.filter((a) => {
    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchContent = (a.content || a.message || '').toLowerCase().includes(q);
      const matchAuthor = a.postedBy.toLowerCase().includes(q);
      const matchDept = a.department.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor && !matchDept) return false;
    }

    // Department filter
    if (departmentFilter !== 'All') {
      if (departmentFilter === 'General' && a.department !== 'General') return false;
      if (departmentFilter !== 'General' && a.department !== departmentFilter) return false;
    }

    // Priority filter
    if (priorityFilter !== 'All' && a.priority !== priorityFilter) return false;

    return true;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter((a) => a.pinned);
  const regularAnnouncements = filteredAnnouncements.filter((a) => !a.pinned);

  const handleCardClick = (announcement: Announcement) => {
    if (onSelectAnnouncement) {
      onSelectAnnouncement(announcement);
    } else {
      setSelectedAnnouncementForDetail(announcement);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-slate-900 text-white font-mono">
              Official Feed
            </span>
            <span className="text-xs text-slate-500 font-medium">Broadcasts & Directives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Announcements & Memos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Campus-wide communications, leadership directives, and department operational updates.
          </p>
        </div>

        {onOpenCreateAnnouncement && (
          <button
            type="button"
            onClick={onOpenCreateAnnouncement}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search announcements by title, keywords, author, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/90 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Filters:</span>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="All">All Departments</option>
            <option value="General">General (All Members)</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Normal">Normal</option>
            <option value="Important">Important</option>
            <option value="Urgent">Urgent</option>
          </select>

          {(searchTerm || departmentFilter !== 'All' || priorityFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('All');
                setPriorityFilter('All');
              }}
              className="px-2.5 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Total Broadcasts
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {announcements.length}
          </p>
          <span className="text-[10px] text-slate-500">Official directives</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 font-mono">
            Urgent Directives
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-0.5">
            {announcements.filter((a) => a.priority === 'Urgent').length}
          </p>
          <span className="text-[10px] text-rose-600 font-medium">Immediate attention</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-mono">
            Important Notices
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">
            {announcements.filter((a) => a.priority === 'Important').length}
          </p>
          <span className="text-[10px] text-amber-600 font-medium">Key deadlines</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-mono">
            Pinned Highlights
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-indigo-700 mt-0.5">
            {announcements.filter((a) => a.pinned).length}
          </p>
          <span className="text-[10px] text-indigo-600 font-medium">Featured memos</span>
        </div>
      </div>

      {/* Pinned Section */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Pin className="w-4 h-4 text-amber-600 fill-amber-500/20" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              Pinned Directives ({pinnedAnnouncements.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((a) => (
              <div
                key={a.id}
                onClick={() => handleCardClick(a)}
                className="bg-white rounded-xl border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.priority} size="sm" />
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {a.department}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Users className="w-3 h-3" />
                        {a.audience || (a.department === 'General' ? 'All Members' : `${a.department} Dept`)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded shrink-0">
                      <Pin className="w-3 h-3 fill-amber-600/30" />
                      Pinned
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between gap-2">
                    <span>{a.title}</span>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {a.content || a.message}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={a.postedBy} size="sm" src={a.authorAvatar} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 leading-tight truncate">
                        {a.postedBy}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {a.authorRole}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-[11px] font-mono shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{a.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Feed */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono">
              All Announcements ({filteredAnnouncements.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Click any announcement to view complete details
          </span>
        </div>

        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              No announcements found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              No announcements match your filter or search criteria.
            </p>
            {(searchTerm || departmentFilter !== 'All' || priorityFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDepartmentFilter('All');
                  setPriorityFilter('All');
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {regularAnnouncements.map((a) => (
              <div
                key={a.id}
                onClick={() => handleCardClick(a)}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-xs transition-all p-5 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2.5">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={a.priority} size="sm" />
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {a.department}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Users className="w-3 h-3" />
                        {a.audience || (a.department === 'General' ? 'All Members' : `${a.department} Dept`)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors pt-0.5">
                      {a.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{a.date}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {a.content || a.message}
                </p>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Avatar name={a.postedBy} size="sm" src={a.authorAvatar} />
                    <div>
                      <span className="font-bold text-slate-900">
                        {a.postedBy}
                      </span>
                      <span className="text-slate-400 ml-1.5">
                        • {a.authorRole}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Read more <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Detail Modal (when internal selection is used) */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncementForDetail}
        isOpen={Boolean(selectedAnnouncementForDetail)}
        onClose={() => setSelectedAnnouncementForDetail(null)}
      />
    </div>
  );
};
