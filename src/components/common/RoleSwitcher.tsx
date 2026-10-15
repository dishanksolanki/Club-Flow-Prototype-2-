import React, { useState, useRef, useEffect } from 'react';
import { Shield, ChevronDown, Check, Sparkles, UserCheck } from 'lucide-react';
import { Member, HierarchyRole } from '../../types';
import { ROLE_CONFIGURATIONS } from '../../utils/permissions';
import { Avatar } from './Avatar';

interface RoleSwitcherProps {
  currentUser: Member;
  allMembers: Member[];
  onSelectPersona: (member: Member) => void;
  compact?: boolean;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  allMembers,
  onSelectPersona,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ordered list of the 8 hierarchy roles
  const hierarchyOrder: HierarchyRole[] = [
    'Faculty Advisor',
    'President',
    'Vice President',
    'Head',
    'Co-Head',
    'Department Head',
    'Department Co-Head',
    'Department Member',
  ];

  // Pick representative members for each role
  const personaOptions = hierarchyOrder.map((role) => {
    // If the current user matches this role, we can show the current user or find the best match
    const matchingMember =
      allMembers.find((m) => m.hierarchyRole === role) || currentUser;
    return {
      role,
      config: ROLE_CONFIGURATIONS[role],
      member: matchingMember,
      isActive: currentUser.hierarchyRole === role,
    };
  });

  const currentRoleCfg = ROLE_CONFIGURATIONS[currentUser.hierarchyRole];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch demo role to test permissions"
        className={`flex items-center gap-2 rounded-xl transition-all border cursor-pointer ${
          compact
            ? 'px-2 py-1 bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-800 text-xs'
            : 'px-2.5 py-1.5 bg-white hover:bg-slate-50 border-slate-200 shadow-2xs text-xs font-semibold'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            currentUser.hierarchyRole === 'President' || currentUser.hierarchyRole === 'Vice President'
              ? 'bg-indigo-600 animate-pulse'
              : currentUser.hierarchyRole === 'Faculty Advisor'
              ? 'bg-amber-500'
              : currentUser.hierarchyRole.includes('Head')
              ? 'bg-emerald-500'
              : 'bg-slate-400'
          }`}
        />
        <div className="text-left flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hidden md:inline">
            Role:
          </span>
          <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[160px]">
            {currentUser.hierarchyRole}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-fadeIn py-2 divide-y divide-slate-100">
          {/* Header */}
          <div className="px-4 py-2.5 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Test Role-Based Permissions
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                8 Hierarchy Roles
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Select any role persona to experience how permission restrictions and controls adapt across the app.
            </p>
          </div>

          {/* List of 8 Role Personas */}
          <div className="max-h-[380px] overflow-y-auto p-1.5 space-y-1">
            {personaOptions.map(({ role, config, member, isActive }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  onSelectPersona(member);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl transition-all flex items-start gap-3 text-left cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/80 border border-indigo-200 shadow-2xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Avatar
                  src={member.avatarUrl}
                  name={member.name}
                  initials={member.initials}
                  size="sm"
                  className="mt-0.5"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{role}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold text-slate-500 bg-slate-100">
                        Tier {config.rank}
                      </span>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Active</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-medium text-slate-700 mt-0.5 truncate">
                    {member.name} ·{' '}
                    <span className="text-slate-500">{member.department}</span>
                  </p>

                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 leading-snug">
                    {config.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer explanation */}
          <div className="px-4 py-2 bg-slate-50/50 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Current persona: <strong>{currentUser.name}</strong></span>
            <span className="text-indigo-600 font-semibold">{currentUser.department}</span>
          </div>
        </div>
      )}
    </div>
  );
};
