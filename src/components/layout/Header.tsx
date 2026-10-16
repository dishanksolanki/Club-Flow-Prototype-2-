import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Menu,
  ChevronDown,
  Building,
  Check,
  Calendar,
  CheckSquare,
  Users,
  Megaphone,
  LogIn,
  LogOut,
  Database as DatabaseIcon,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Member, ClubNotification, ClubSettings } from '../../types';
import { NavTab } from './Sidebar';
import { RoleSwitcher } from '../common/RoleSwitcher';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenMobileMenu: () => void;
  currentUser: Member;
  notifications: ClubNotification[];
  onMarkNotificationAsRead: (id: string) => void;
  onClearAllNotifications: () => void;
  onNotificationClick?: (notification: ClubNotification) => void;
  onGlobalSearchSelect: (type: 'event' | 'task' | 'member' | 'announcement', id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  allMembers?: Member[];
  tasks?: import('../../types').Task[];
  events?: import('../../types').ClubEvent[];
  announcements?: import('../../types').Announcement[];
  onSelectPersona?: (member: Member) => void;
  clubSettings?: ClubSettings;
  onOpenAuth?: () => void;
  isSupabaseAuth?: boolean;
  onSignOut?: () => void;
  isConnectedToSupabase?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenMobileMenu,
  currentUser,
  notifications,
  onMarkNotificationAsRead,
  onClearAllNotifications,
  onNotificationClick,
  onGlobalSearchSelect,
  searchQuery,
  onSearchQueryChange,
  allMembers = [],
  tasks = [],
  events = [],
  announcements = [],
  onSelectPersona,
  clubSettings,
  onOpenAuth,
  isSupabaseAuth = false,
  onSignOut,
  isConnectedToSupabase = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedClub, setSelectedClub] = useState(clubSettings?.name || 'ACM Student Chapter');
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (clubSettings?.name) {
      setSelectedClub(clubSettings.name);
    }
  }, [clubSettings?.name]);

  const notifRef = useRef<HTMLDivElement>(null);
  const clubRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (clubRef.current && !clubRef.current.contains(event.target as Node)) {
        setShowClubDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clubsList = [
    'ACM Student Chapter',
    'Google Developer Student Club',
    'Robotics & AI Guild',
    'Product Design Society',
  ];

  const getNotifIcon = (type: ClubNotification['type']) => {
    switch (type) {
      case 'event':
        return <Calendar className="w-3.5 h-3.5 text-blue-600" />;
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />;
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-amber-600" />;
      case 'attendance':
        return <Users className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left zone: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Club Switcher dropdown */}
        <div className="relative" ref={clubRef}>
          <button
            type="button"
            onClick={() => setShowClubDropdown(!showClubDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200/90 hover:border-slate-300 bg-white text-xs font-semibold text-slate-700 transition-all shadow-2xs hover:shadow-xs"
          >
            <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[190px]">{selectedClub}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {showClubDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-40 animate-in fade-in duration-100">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Active Organization
              </div>
              {clubsList.map((club) => (
                <button
                  key={club}
                  type="button"
                  onClick={() => {
                    setSelectedClub(club);
                    setShowClubDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left transition-colors"
                >
                  <span className={club === selectedClub ? 'font-semibold text-indigo-600' : ''}>
                    {club}
                  </span>
                  {club === selectedClub && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center text-xs text-slate-400 font-medium">
          <span className="mx-2 text-slate-300">/</span>
          <span className="font-semibold text-slate-900">{activeTab}</span>
        </div>
      </div>

      {/* Middle zone: Linear-style Search Bar & Results Dropdown */}
      <div className="flex-1 max-w-md hidden md:block relative" ref={searchRef}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks, events, members, announcements..."
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setShowSearchDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowSearchDropdown(false);
                onSearchQueryChange('');
              }
            }}
            className="w-full pl-8 pr-12 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200/90 focus:border-slate-400 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/5 transition-all shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchQueryChange('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 w-4 h-4 flex items-center justify-center rounded cursor-pointer"
            >
              ×
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded shadow-2xs">
              <span>⌘</span><span>K</span>
            </div>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (() => {
          const q = searchQuery.toLowerCase().trim();
          const matchedTasks = tasks.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.department.toLowerCase().includes(q) ||
              t.assignedTo.toLowerCase().includes(q)
          ).slice(0, 3);

          const matchedEvents = events.filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.venue.toLowerCase().includes(q) ||
              e.department.toLowerCase().includes(q) ||
              e.organizer.toLowerCase().includes(q)
          ).slice(0, 3);

          const matchedMembers = allMembers.filter(
            (m) =>
              m.name.toLowerCase().includes(q) ||
              m.department.toLowerCase().includes(q) ||
              m.role.toLowerCase().includes(q) ||
              m.studentId.toLowerCase().includes(q)
          ).slice(0, 3);

          const matchedAnnouncements = announcements.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              (a.content || a.message || '').toLowerCase().includes(q) ||
              a.postedBy.toLowerCase().includes(q)
          ).slice(0, 3);

          const totalResults =
            matchedTasks.length +
            matchedEvents.length +
            matchedMembers.length +
            matchedAnnouncements.length;

          return (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto animate-in fade-in duration-100">
              <div className="px-3.5 py-2 bg-slate-50/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Search Results</span>
                <span>{totalResults} {totalResults === 1 ? 'match' : 'matches'}</span>
              </div>

              {totalResults === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matches found for "{searchQuery}". Try a different keyword or department name.
                </div>
              ) : (
                <div className="p-1.5 space-y-2">
                  {/* Tasks Group */}
                  {matchedTasks.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Tasks
                      </div>
                      {matchedTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            onGlobalSearchSelect('task', t.id);
                            setShowSearchDropdown(false);
                            onSearchQueryChange('');
                          }}
                          className="px-2.5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                                {t.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {t.department} · Assigned to {t.assignedTo}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Events Group */}
                  {matchedEvents.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Events
                      </div>
                      {matchedEvents.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => {
                            onGlobalSearchSelect('event', e.id);
                            setShowSearchDropdown(false);
                            onSearchQueryChange('');
                          }}
                          className="px-2.5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                                {e.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {e.date} · {e.venue}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                            {e.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Members Group */}
                  {matchedMembers.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Members
                      </div>
                      {matchedMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            onGlobalSearchSelect('member', m.id);
                            setShowSearchDropdown(false);
                            onSearchQueryChange('');
                          }}
                          className="px-2.5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar src={m.avatarUrl} name={m.name} initials={m.initials} size="xs" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                                {m.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {m.role} · {m.department}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                            {m.hierarchyRole}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Announcements Group */}
                  {matchedAnnouncements.length > 0 && (
                    <div>
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Announcements
                      </div>
                      {matchedAnnouncements.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            onGlobalSearchSelect('announcement', a.id);
                            setShowSearchDropdown(false);
                            onSearchQueryChange('');
                          }}
                          className="px-2.5 py-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                                {a.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                By {a.postedBy} · {a.date}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">
                            {a.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Right zone: Notifications & User profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors border border-transparent hover:border-slate-200/60 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white font-mono shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-40 animate-in fade-in duration-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-semibold bg-indigo-100 text-indigo-700 rounded-md">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllNotifications}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs: All vs Unread */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    notifFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    notifFilter === 'unread'
                      ? 'bg-white text-indigo-600 shadow-2xs font-semibold border border-indigo-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No notifications right now
                  </div>
                ) : notifFilter === 'unread' && notifications.filter((n) => !n.read).length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No unread notifications
                  </div>
                ) : (
                  (notifFilter === 'unread' ? notifications.filter((n) => !n.read) : notifications).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        onMarkNotificationAsRead(notif.id);
                        if (onNotificationClick) {
                          onNotificationClick(notif);
                        } else if (notif.linkTab) {
                          onTabChange(notif.linkTab as NavTab);
                        }
                        setShowNotifications(false);
                      }}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 text-left group ${
                        !notif.read ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkNotificationAsRead(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded transition-all shrink-0 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Supabase Connection Status Badge */}
        <div
          title={
            isConnectedToSupabase
              ? 'Connected to Supabase PostgreSQL (Row Level Security Active)'
              : 'Running in Local Demo Sandbox (Configure VITE_SUPABASE_URL to connect)'
          }
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
            isConnectedToSupabase
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnectedToSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <DatabaseIcon className="w-3 h-3" />
          <span>{isConnectedToSupabase ? 'Supabase Live' : 'Demo Sandbox'}</span>
        </div>

        {/* Authentication Button */}
        {isSupabaseAuth ? (
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out of Supabase Account"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : onOpenAuth ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        ) : null}

        {/* Role Persona Switcher for prototyping and permissions testing */}
        {onSelectPersona && (
          <RoleSwitcher
            currentUser={currentUser}
            allMembers={allMembers}
            onSelectPersona={onSelectPersona}
          />
        )}

        {/* User Pill Button */}
        <button
          type="button"
          onClick={() => onTabChange('Profile')}
          className="flex items-center gap-2.5 p-1.5 sm:px-2.5 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all shadow-2xs"
        >
          <Avatar
            src={currentUser.avatarUrl}
            name={currentUser.name}
            initials={currentUser.initials}
            size="sm"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">
              {currentUser.name.split(' ')[0]}
            </p>
            <p className="text-[10px] text-slate-400 leading-none mt-1 font-medium truncate max-w-[90px]">
              {currentUser.role.split('&')[0].trim()}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};
