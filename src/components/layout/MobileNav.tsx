import React from 'react';
import {
  X,
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
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { Member, ClubSettings } from '../../types';
import { NavTab } from './Sidebar';
import { canAccessManagementPanel } from '../../utils/permissions';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: Member;
  pendingTasksCount: number;
  unreadAnnouncementsCount: number;
  clubSettings?: ClubSettings;
}

interface MobileNavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  tag?: string;
}

interface MobileNavGroup {
  title: string;
  items: MobileNavItem[];
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  currentUser,
  pendingTasksCount,
  unreadAnnouncementsCount,
  clubSettings,
}) => {
  if (!isOpen) return null;

  const accessCheck = canAccessManagementPanel(currentUser);
  const isManagementAuthorized = accessCheck.allowed;

  const groups: MobileNavGroup[] = [
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
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-[82vw] bg-white h-full shadow-2xl flex flex-col z-10">
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-indigo-400 font-bold text-xs shadow-xs font-mono">
              {clubSettings?.brandTag || 'CF'}
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm leading-none block truncate max-w-[140px]">
                {clubSettings?.name || 'ClubFlow'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                {clubSettings?.academicYear || 'Campus Workspace'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
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
                    onClick={() => {
                      onTabChange(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.tag && (
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase rounded ${
                            isActive
                              ? 'bg-indigo-500 text-white'
                              : 'bg-indigo-50 text-indigo-700'
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
                              : 'bg-slate-100 text-slate-600'
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

        {/* User Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={() => {
              onTabChange('Profile');
              onClose();
            }}
            className="flex items-center gap-3 w-full text-left"
          >
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {currentUser.role} · {currentUser.department}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
