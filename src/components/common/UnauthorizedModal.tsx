import React from 'react';
import { ShieldAlert, ArrowRight, UserCheck, X } from 'lucide-react';
import { Member, HierarchyRole } from '../../types';
import { ROLE_CONFIGURATIONS } from '../../utils/permissions';
import { Modal } from './Modal';
import { Avatar } from './Avatar';

interface UnauthorizedModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  actionTitle: string;
  reason?: string;
  recommendedRole?: HierarchyRole;
  onSwitchToRecommendedRole?: (role: HierarchyRole) => void;
}

export const UnauthorizedModal: React.FC<UnauthorizedModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  actionTitle,
  reason,
  recommendedRole = 'President',
  onSwitchToRecommendedRole,
}) => {
  const currentRoleCfg = ROLE_CONFIGURATIONS[currentUser.hierarchyRole];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Access Restricted"
      description={`Action: ${actionTitle}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Banner with icon */}
        <div className="flex items-start gap-3.5 p-4 bg-amber-50/80 border border-amber-200/90 rounded-xl">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-amber-950">
              Permission Required for this Action
            </h4>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              {reason ||
                `Your current role as ${currentUser.hierarchyRole} does not have authorization to perform "${actionTitle}".`}
            </p>
          </div>
        </div>

        {/* Current Active Persona Details */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 font-mono">
            Active Demo Persona
          </div>
          <div className="flex items-center gap-3">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name}
              initials={currentUser.initials}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 truncate">{currentUser.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${currentRoleCfg?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                  {currentUser.hierarchyRole}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {currentUser.department} Department
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-200/60 leading-relaxed">
            {currentRoleCfg?.description}
          </p>
        </div>

        {/* Quick Testing Switcher */}
        {onSwitchToRecommendedRole && (
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                Want to test this action?
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold font-mono">
                Prototype Mode
              </span>
            </div>
            <p className="text-indigo-900/80 text-[11px] mb-3 leading-relaxed">
              Switch your demo persona to <strong>{recommendedRole}</strong> to simulate executive leadership and execute this action.
            </p>
            <button
              type="button"
              onClick={() => {
                onSwitchToRecommendedRole(recommendedRole);
                onClose();
              }}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>Switch to {recommendedRole} Persona</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dismiss Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
