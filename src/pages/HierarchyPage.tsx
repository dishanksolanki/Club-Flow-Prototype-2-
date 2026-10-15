import React, { useState } from 'react';
import {
  ArrowDown,
  ShieldCheck,
  Users,
  Building,
  Sparkles,
  Info,
  Check,
  X,
  UserCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Member, DepartmentType, HierarchyRole } from '../types';
import { Avatar } from '../components/common/Avatar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ROLE_CONFIGURATIONS } from '../utils/permissions';

interface HierarchyPageProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  currentUser?: Member;
  onSwitchPersona?: (member: Member) => void;
}

export const HierarchyPage: React.FC<HierarchyPageProps> = ({
  members,
  onSelectMember,
  currentUser,
  onSwitchPersona,
}) => {
  const [filterLevel, setFilterLevel] = useState<
    'All' | 'Executive' | 'Operations' | 'DepartmentLeads' | 'Members'
  >('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [showPermissionsMatrix, setShowPermissionsMatrix] = useState(false);

  // Group members into the 8 distinct hierarchy levels
  const faculty = members.filter((m) => m.hierarchyRole === 'Faculty Advisor');
  const president = members.filter((m) => m.hierarchyRole === 'President');
  const vp = members.filter((m) => m.hierarchyRole === 'Vice President');
  const overallHead = members.filter((m) => m.hierarchyRole === 'Head');
  const overallCoHead = members.filter((m) => m.hierarchyRole === 'Co-Head');

  // Filter department leads and members by selected department if applicable
  const deptHeads = members.filter(
    (m) =>
      m.hierarchyRole === 'Department Head' &&
      (departmentFilter === 'All' || m.department === departmentFilter)
  );

  const deptCoHeads = members.filter(
    (m) =>
      m.hierarchyRole === 'Department Co-Head' &&
      (departmentFilter === 'All' || m.department === departmentFilter)
  );

  const deptMembers = members.filter(
    (m) =>
      m.hierarchyRole === 'Department Member' &&
      (departmentFilter === 'All' || m.department === departmentFilter)
  );

  const departmentsList: DepartmentType[] = [
    'Technical',
    'Design',
    'Marketing',
    'Event Management',
    'Media',
    'Content',
  ];

  const getDeptColor = (dept: DepartmentType) => {
    switch (dept) {
      case 'Technical':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Design':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Marketing':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Event Management':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Media':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Content':
        return 'text-cyan-700 bg-cyan-50 border-cyan-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const MemberCard = ({
    member,
    tierRank,
    tierName,
  }: {
    member: Member;
    tierRank: number;
    tierName: string;
  }) => {
    const isCurrentActive = currentUser?.id === member.id || currentUser?.name === member.name;

    return (
      <div
        className={`bg-white rounded-2xl border p-4.5 transition-all text-left max-w-sm w-full mx-auto relative overflow-hidden group shadow-2xs hover:shadow-md ${
          isCurrentActive
            ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/10'
            : tierRank <= 3
            ? 'border-slate-300 ring-1 ring-slate-900/5 hover:border-slate-400'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Tier rank pill top right */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            Tier {tierRank} · {tierName}
          </span>
          {isCurrentActive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Active User
            </span>
          )}
        </div>

        <div className="flex items-start gap-3.5">
          <div className="relative">
            <Avatar
              src={member.avatarUrl}
              name={member.name}
              initials={member.initials}
              size="lg"
              className={isCurrentActive ? 'ring-2 ring-indigo-500' : ''}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4
                onClick={() => onSelectMember(member)}
                className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate cursor-pointer"
              >
                {member.name}
              </h4>
              <StatusBadge status={member.status} size="sm" />
            </div>

            <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
              {member.role}
            </p>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getDeptColor(
                  member.department
                )}`}
              >
                {member.department}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {member.studentId}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer: Metrics & Actions */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-mono tabular-nums text-slate-800 font-semibold">
              {member.attendanceRate}% Attn
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              {member.workingHours}h logged
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onSwitchPersona && !isCurrentActive && (
              <button
                type="button"
                onClick={() => onSwitchPersona(member)}
                title={`Switch active persona to ${member.name} (${member.hierarchyRole})`}
                className="px-2 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
              >
                Assume Role
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectMember(member)}
              title="View member dossier"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ConnectorArrow = () => (
    <div className="flex justify-center my-4">
      <div className="flex flex-col items-center">
        <div className="w-px h-6 bg-slate-300" />
        <ArrowDown className="w-4 h-4 text-slate-400 -mt-1" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-white font-mono">
              Governance
            </span>
            <span className="text-xs text-slate-500 font-medium">
              8-Tier Official Chain of Command
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Club Hierarchy & Leadership Tree
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Visual governance structure defining executive authority, departmental command lines, operational oversight, and member reporting.
          </p>
        </div>

        {/* Action Controls: Filter tabs & Matrix button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPermissionsMatrix(!showPermissionsMatrix)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showPermissionsMatrix
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{showPermissionsMatrix ? 'Hide Permission Rules' : 'View Role Permissions'}</span>
          </button>

          {/* Department Filter Dropdown */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Departments</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions Matrix Drawer/Card (Collapsible) */}
      {showPermissionsMatrix && (
        <div className="bg-white rounded-2xl border border-indigo-200/80 p-5 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Centralized Role-Based Permissions Matrix
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Configured in src/utils/permissions.ts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="p-3">Hierarchy Role</th>
                  <th className="p-3">Authority Scope</th>
                  <th className="p-3">Task Management</th>
                  <th className="p-3">Member Administration</th>
                  <th className="p-3">Events & Attendance</th>
                  <th className="p-3">Announcements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12px]">
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Faculty Advisor
                  </td>
                  <td className="p-3 text-slate-600">Advisory & Institutional Governance</td>
                  <td className="p-3 text-slate-600">Read-only oversight</td>
                  <td className="p-3 text-slate-600">Oversight</td>
                  <td className="p-3 text-slate-600">Sanction & review</td>
                  <td className="p-3 text-emerald-700 font-medium">Club-wide broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    President
                  </td>
                  <td className="p-3 text-slate-600">Club-wide Executive Administration</td>
                  <td className="p-3 text-emerald-700 font-medium">All departments assign/review</td>
                  <td className="p-3 text-emerald-700 font-medium">Full management</td>
                  <td className="p-3 text-emerald-700 font-medium">Create & verify all</td>
                  <td className="p-3 text-emerald-700 font-medium">Club-wide broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Vice President
                  </td>
                  <td className="p-3 text-slate-600">Delegated Executive Leadership</td>
                  <td className="p-3 text-emerald-700 font-medium">All departments assign/review</td>
                  <td className="p-3 text-emerald-700 font-medium">Full management</td>
                  <td className="p-3 text-emerald-700 font-medium">Create & verify all</td>
                  <td className="p-3 text-emerald-700 font-medium">Club-wide broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-600" />
                    Head
                  </td>
                  <td className="p-3 text-slate-600">Operations & Strategic Coordination</td>
                  <td className="p-3 text-emerald-700 font-medium">Cross-department assign/review</td>
                  <td className="p-3 text-emerald-700 font-medium">Manage operational roles</td>
                  <td className="p-3 text-emerald-700 font-medium">Create & verify operations</td>
                  <td className="p-3 text-emerald-700 font-medium">Club-wide broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                    Co-Head
                  </td>
                  <td className="p-3 text-slate-600">Operations Logistics & Execution</td>
                  <td className="p-3 text-emerald-700 font-medium">Cross-department assign/review</td>
                  <td className="p-3 text-slate-600">Support roster sync</td>
                  <td className="p-3 text-emerald-700 font-medium">Create & verify</td>
                  <td className="p-3 text-emerald-700 font-medium">Club-wide broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Department Head
                  </td>
                  <td className="p-3 text-slate-600">Department Deliverables & Team Lead</td>
                  <td className="p-3 text-emerald-700 font-medium">Assign/review own department</td>
                  <td className="p-3 text-slate-400">View only</td>
                  <td className="p-3 text-emerald-700 font-medium">Mark dept attendance & hours</td>
                  <td className="p-3 text-emerald-700 font-medium">Department broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-lime-600" />
                    Department Co-Head
                  </td>
                  <td className="p-3 text-slate-600">Department Execution & Mentorship</td>
                  <td className="p-3 text-emerald-700 font-medium">Assign/review own department</td>
                  <td className="p-3 text-slate-400">View only</td>
                  <td className="p-3 text-emerald-700 font-medium">Mark dept attendance & hours</td>
                  <td className="p-3 text-emerald-700 font-medium">Department broadcast</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Department Member
                  </td>
                  <td className="p-3 text-slate-600">Task Execution & Active Contribution</td>
                  <td className="p-3 text-slate-600">View & submit own assigned tasks</td>
                  <td className="p-3 text-slate-400">View only</td>
                  <td className="p-3 text-slate-600">Log own working hours</td>
                  <td className="p-3 text-slate-400">View announcements</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Tabs by Tier Category */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 overflow-x-auto">
        {(
          [
            { id: 'All', label: 'Complete 8-Tier Hierarchy' },
            { id: 'Executive', label: 'Executive Board (Tiers 1-3)' },
            { id: 'Operations', label: 'Operations Heads (Tiers 4-5)' },
            { id: 'DepartmentLeads', label: 'Department Leads (Tiers 6-7)' },
            { id: 'Members', label: 'General Committee (Tier 8)' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterLevel(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterLevel === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Visual Hierarchy Flow */}
      <div className="space-y-6 py-2">
        {/* Tier 1: Faculty Advisor */}
        {(filterLevel === 'All' || filterLevel === 'Executive') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Tier 1 · Faculty Advisor</span>
            </div>
            <div className="flex justify-center">
              {faculty.map((f) => (
                <MemberCard
                  key={f.id}
                  member={f}
                  tierRank={1}
                  tierName="Faculty Advisor"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 2: President */}
        {(filterLevel === 'All' || filterLevel === 'Executive') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-200 text-indigo-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <span>Tier 2 · President</span>
            </div>
            <div className="flex justify-center">
              {president.map((p) => (
                <MemberCard
                  key={p.id}
                  member={p}
                  tierRank={2}
                  tierName="President"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 3: Vice President */}
        {(filterLevel === 'All' || filterLevel === 'Executive') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <span>Tier 3 · Vice President</span>
            </div>
            <div className="flex justify-center">
              {vp.map((v) => (
                <MemberCard
                  key={v.id}
                  member={v}
                  tierRank={3}
                  tierName="Vice President"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 4: Head */}
        {(filterLevel === 'All' || filterLevel === 'Operations') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-cyan-200 text-cyan-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <span>Tier 4 · Head (Operations & Strategic Coordination)</span>
            </div>
            <div className="flex justify-center">
              {overallHead.map((h) => (
                <MemberCard
                  key={h.id}
                  member={h}
                  tierRank={4}
                  tierName="Head"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 5: Co-Head */}
        {(filterLevel === 'All' || filterLevel === 'Operations') && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-teal-200 text-teal-900 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
              <span>Tier 5 · Co-Head (Operations Logistics)</span>
            </div>
            <div className="flex justify-center">
              {overallCoHead.map((ch) => (
                <MemberCard
                  key={ch.id}
                  member={ch}
                  tierRank={5}
                  tierName="Co-Head"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 6: Department Head */}
        {(filterLevel === 'All' || filterLevel === 'DepartmentLeads') && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-wider shadow-2xs">
                <span>Tier 6 · Department Heads</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Overseeing technical engineering, visual design, outreach, events, media, and editorial branches
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptHeads.map((dh) => (
                <MemberCard
                  key={dh.id}
                  member={dh}
                  tierRank={6}
                  tierName="Department Head"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 7: Department Co-Head */}
        {(filterLevel === 'All' || filterLevel === 'DepartmentLeads') && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-lime-200 text-lime-900 text-xs font-bold uppercase tracking-wider shadow-2xs">
                <span>Tier 7 · Department Co-Heads</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Technical mentorship, day-to-day milestone tracking, and task delegation within committees
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptCoHeads.map((dch) => (
                <MemberCard
                  key={dch.id}
                  member={dch}
                  tierRank={7}
                  tierName="Department Co-Head"
                />
              ))}
            </div>
            <ConnectorArrow />
          </div>
        )}

        {/* Tier 8: Department Members */}
        {(filterLevel === 'All' || filterLevel === 'Members') && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider shadow-2xs">
                <Users className="w-3.5 h-3.5 text-slate-700" />
                <span>Tier 8 · Department Members</span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Active student contributors executing projects, workshops, designs, and content deliverables
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deptMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  tierRank={8}
                  tierName="Department Member"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
