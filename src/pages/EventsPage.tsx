import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Search,
  Plus,
  Clock,
  Tag,
  CheckCircle2,
  Eye,
  Filter,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { ClubEvent, DepartmentType, Member, Task, EventStatus } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventDetailModal } from '../components/modals/EventDetailModal';

interface EventsPageProps {
  events: ClubEvent[];
  onOpenCreateEvent: () => void;
  departments: DepartmentType[];
  members: Member[];
  tasks: Task[];
  currentUser: Member;
  onUpdateEvent: (updatedEvent: ClubEvent) => void;
  onSelectTask?: (task: Task) => void;
  onSelectMember?: (member: Member) => void;
  onSelectEvent?: (event: ClubEvent) => void;
  attendanceRecords?: import('../types').AttendanceRecord[];
  onUpdateAttendanceStatus?: (recordId: string, newStatus: import('../types').AttendanceStatus) => void;
  onAddAttendanceRecord?: (record: import('../types').AttendanceRecord) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  onOpenCreateEvent,
  departments,
  members,
  tasks,
  currentUser,
  onUpdateEvent,
  onSelectTask,
  onSelectMember,
  onSelectEvent,
  attendanceRecords = [],
  onUpdateAttendanceStatus,
  onAddAttendanceRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Upcoming' | 'Ongoing' | 'Past'>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);

  const allStatuses: EventStatus[] = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'];

  const filteredEvents = events.filter((evt) => {
    // Top tab filtering
    if (activeTab === 'Upcoming' && evt.status !== 'Upcoming') return false;
    if (activeTab === 'Ongoing' && evt.status !== 'Ongoing') return false;
    if (activeTab === 'Past' && evt.status !== 'Completed' && evt.status !== 'Cancelled') return false;

    // Status dropdown filter
    if (statusFilter !== 'All' && evt.status !== statusFilter) {
      return false;
    }

    // Department filter
    if (selectedDept !== 'All' && evt.department !== selectedDept) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchVenue = evt.venue.toLowerCase().includes(q);
      const matchOrg = evt.organizer.toLowerCase().includes(q);
      const matchDept = evt.department.toLowerCase().includes(q);
      const matchDesc = evt.description.toLowerCase().includes(q);
      const matchTags = evt.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchVenue && !matchOrg && !matchDept && !matchDesc && !matchTags) return false;
    }

    return true;
  });

  const toggleRSVP = (evt: ClubEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const isUserRSVPed =
      evt.participatingMembers?.some(
        (m) =>
          m.toLowerCase() === currentUser.name.toLowerCase() ||
          currentUser.name.toLowerCase().includes(m.toLowerCase())
      ) || false;

    let updatedList = [...(evt.participatingMembers || [])];
    let newCount = evt.attendeesCount;

    if (isUserRSVPed) {
      updatedList = updatedList.filter(
        (m) =>
          m.toLowerCase() !== currentUser.name.toLowerCase() &&
          !currentUser.name.toLowerCase().includes(m.toLowerCase())
      );
      newCount = Math.max(0, newCount - 1);
    } else {
      updatedList.push(currentUser.name);
      newCount += 1;
    }

    const updated: ClubEvent = {
      ...evt,
      participatingMembers: updatedList,
      attendeesCount: newCount,
    };

    onUpdateEvent(updated);
    if (selectedEvent?.id === evt.id) {
      setSelectedEvent(updated);
    }
  };

  const handleOpenEvent = (evt: ClubEvent) => {
    if (onSelectEvent) {
      onSelectEvent(evt);
    } else {
      setSelectedEvent(evt);
    }
  };

  const upcomingCount = events.filter((e) => e.status === 'Upcoming').length;
  const ongoingCount = events.filter((e) => e.status === 'Ongoing').length;
  const pastCount = events.filter((e) => e.status === 'Completed' || e.status === 'Cancelled').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Events & Workshops
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage upcoming hackathons, ongoing project demonstrations, design sprints, and past meeting sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateEvent}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Schedule Event</span>
        </button>
      </div>

      {/* Primary KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('All')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs ${
            activeTab === 'All'
              ? 'border-slate-900 ring-2 ring-slate-100 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Total Events</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {events.length}
          </p>
          <span className="text-[10px] text-slate-400">All registered</span>
        </div>

        <div
          onClick={() => setActiveTab('Ongoing')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs ${
            activeTab === 'Ongoing'
              ? 'border-emerald-600 ring-2 ring-emerald-50 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Ongoing Now</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {ongoingCount}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold font-mono">In session today</span>
        </div>

        <div
          onClick={() => setActiveTab('Upcoming')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs ${
            activeTab === 'Upcoming'
              ? 'border-blue-600 ring-2 ring-blue-50 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Upcoming</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {upcomingCount}
          </p>
          <span className="text-[10px] text-blue-600 font-semibold font-mono">Scheduled ahead</span>
        </div>

        <div
          onClick={() => setActiveTab('Past')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs ${
            activeTab === 'Past'
              ? 'border-slate-700 ring-2 ring-slate-100 shadow-xs'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">Past / Archive</span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {pastCount}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">Concluded</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Segmented Timeline Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 shrink-0">
            {(
              [
                { id: 'All', label: 'All' },
                { id: 'Upcoming', label: `Upcoming (${upcomingCount})` },
                { id: 'Ongoing', label: `Ongoing (${ongoingCount})` },
                { id: 'Past', label: `Past (${pastCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Department & Status Filters */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 max-w-xl">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 font-medium"
            >
              <option value="All">All Statuses</option>
              {allStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search event name, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(statusFilter !== 'All' || selectedDept !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {filteredEvents.length} of {events.length} events</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setSelectedDept('All');
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

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No events found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, status, or department filters, or schedule a new event for the club.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEvents.map((evt) => {
            const isUserRSVPed =
              evt.participatingMembers?.some(
                (m) =>
                  m.toLowerCase() === currentUser.name.toLowerCase() ||
                  currentUser.name.toLowerCase().includes(m.toLowerCase())
              ) || false;

            const percentCap = Math.min(
              100,
              Math.round((evt.attendeesCount / Math.max(1, evt.capacity)) * 100)
            );

            return (
              <div
                key={evt.id}
                onClick={() => handleOpenEvent(evt)}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={evt.status} size="sm" />
                      <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70">
                        {evt.department}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                        {evt.date}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                    {evt.description}
                  </p>

                  {/* Metadata: Times, Venue, Organizer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          <strong className="text-slate-800 font-semibold">{evt.startTime}</strong> – {evt.endTime}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {evt.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-700">{evt.venue}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Organized by <strong className="text-slate-800 font-semibold">{evt.organizer}</strong>
                        {evt.organizerRole && ` (${evt.organizerRole})`}
                      </span>
                    </div>
                  </div>

                  {evt.tags && evt.tags.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {evt.tags.map((t, idx) => (
                          <React.Fragment key={t}>
                            <span>{t}</span>
                            {idx < evt.tags!.length - 1 && <span aria-hidden="true">·</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer RSVP / Capacity Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {evt.attendeesCount} / {evt.capacity}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">RSVPs ({percentCap}%)</span>
                    </div>
                    <div className="w-28 sm:w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          percentCap >= 90 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${percentCap}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {evt.status !== 'Completed' && evt.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={(e) => toggleRSVP(evt, e)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                          isUserRSVPed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                        }`}
                      >
                        {isUserRSVPed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Registered</span>
                          </>
                        ) : (
                          <span>RSVP Attend</span>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEvent(evt)}
                      title="View event details"
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        members={members}
        tasks={tasks}
        currentUser={currentUser}
        attendanceRecords={attendanceRecords}
        onUpdateEvent={(updated) => {
          onUpdateEvent(updated);
          setSelectedEvent(updated);
        }}
        onUpdateAttendanceStatus={onUpdateAttendanceStatus}
        onAddAttendanceRecord={onAddAttendanceRecord}
        onSelectTask={onSelectTask}
        onSelectMember={onSelectMember}
      />
    </div>
  );
};
