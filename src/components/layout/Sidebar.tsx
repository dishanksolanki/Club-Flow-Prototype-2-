import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Users,
  FolderKanban,
  GitFork,
  Megaphone,
  User,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Member, ClubSettings } from '../../types';
import { canAccessManagementPanel } from '../../utils/permissions';

export type NavTab =
  | 'Dashboard'
  | 'Events'
  | 'Tasks'
  | 'Attendance'
  | 'Working Hours'
  | 'Members'
  | 'Departments'
  | 'Hierarchy'
  | 'Announcements'
  | 'Management'
  | 'Profile';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: Member;
  pendingTasksCount: number;
  unreadAnnouncementsCount: number;
  clubSettings?: ClubSettings;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  tag?: string;
  locked?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  pendingTasksCount,
  unreadAnnouncementsCount,
  clubSettings,
}) => {
  const accessCheck = canAccessManagementPanel(currentUser);
  const isManagementAuthorized = accessCheck.allowed;

  const groups: NavGroup[] = [
    {
      title: 'Core Workspace',
      items: [
        { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'Events', label: 'Events & Calendar', icon: Calendar },
        { id: 'Tasks', label: 'Tasks & Deliverables', icon: CheckSquare, badge: pendingTasksCount },
      ],
    },
    {
      title: 'Operations & Roster',
      items: [
        { id: 'Attendance', label: 'Attendance Records', icon: ClipboardCheck },
        { id: 'Working Hours', label: 'Working Hours', icon: Clock },
        { id: 'Members', label: 'Members Directory', icon: Users },
        { id: 'Departments', label: 'Departments', icon: FolderKanban },
        { id: 'Hierarchy', label: 'Leadership Hierarchy', icon: GitFork },
      ],
    },
    {
      title: 'Communications',
      items: [
        { id: 'Announcements', label: 'Announcements', icon: Megaphone, badge: unreadAnnouncementsCount },
        { id: 'Profile', label: 'Personal Profile', icon: User },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          id: 'Management',
          label: 'Club Management',
          icon: ShieldCheck,
          tag: isManagementAuthorized ? 'Admin' : 'Restricted',
          locked: !isManagementAuthorized,
        },
      ],
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0 select-none z-30 shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
      {/* Brand Zone */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-xs shrink-0 ring-2 ring-slate-100 font-mono">
          {clubSettings?.brandTag || 'CF'}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 tracking-tight text-sm leading-none truncate max-w-[130px]" title={clubSettings?.name || 'ClubFlow'}>
              {clubSettings?.name || 'ClubFlow'}
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono shrink-0">
              v2.4
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
            {clubSettings?.academicYear || 'Academic Year 2026-27'}
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left group cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-indigo-400'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.tag && (
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : item.locked
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums font-semibold rounded-md ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Semester Accreditation Banner */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-50 border border-slate-200/70 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{clubSettings?.academicYear || 'Fall Term 2026'}</span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed truncate">
          {clubSettings?.name || 'Accredited ACM Student Chapter'}
        </p>
      </div>

      {/* User profile footer */}
      <div className="p-3 border-t border-slate-100 bg-white">
        <button
          type="button"
          onClick={() => onTabChange('Profile')}
          className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group border border-transparent hover:border-slate-200/60"
        >
          <div className="relative shrink-0">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              size="sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {currentUser.role}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
        </button>
      </div>
    </aside>
  );
};
