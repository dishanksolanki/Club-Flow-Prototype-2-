import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { DepartmentType, HierarchyRole, Member } from '../../types';
import { ShieldCheck, UserPlus } from 'lucide-react';

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (newMember: Member) => void;
  departments: DepartmentType[];
  currentUser: Member;
}

export const CreateMemberModal: React.FC<CreateMemberModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
  departments,
  currentUser,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('Technical');
  const [role, setRole] = useState('Department Member');
  const [hierarchyRole, setHierarchyRole] =
    useState<HierarchyRole>('Department Member');
  const [studentId, setStudentId] = useState('');
  const [year, setYear] = useState('Sophomore · Year 2');
  const [bio, setBio] = useState('');

  const hierarchyRoleOptions: HierarchyRole[] = [
    'Department Member',
    'Department Co-Head',
    'Department Head',
    'Co-Head',
    'Head',
    'Vice President',
    'President',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      initials: initials || 'CM',
      role: role.trim() || `${hierarchyRole} (${department})`,
      hierarchyRole,
      department,
      studentId: studentId.trim() || `STU-${Date.now().toString().slice(-4)}`,
      year,
      attendanceRate: 100,
      tasksCompleted: 0,
      workingHours: 0,
      status: 'Active',
      joinDate: 'Oct 2026',
      bio: bio.trim() || undefined,
    };

    onAddMember(newMember);
    setName('');
    setEmail('');
    setBio('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard New Club Member"
      description="Register a student into the club roster and assign their department and hierarchy role."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Executive Authority Banner */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <p className="text-indigo-900/90 leading-snug">
            Authorized by <strong>{currentUser.name}</strong> ({currentUser.hierarchyRole}). Executive administration privileges active.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Student Full Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rachel Green"
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@campus.edu"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student ID / Roll No
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. CS-2025-104"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentType)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hierarchy Role
            </label>
            <select
              value={hierarchyRole}
              onChange={(e) => setHierarchyRole(e.target.value as HierarchyRole)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer font-semibold"
            >
              {hierarchyRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Position Title / Role Tag
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Freshman · Year 1">Freshman · Year 1</option>
              <option value="Sophomore · Year 2">Sophomore · Year 2</option>
              <option value="Junior · Year 3">Junior · Year 3</option>
              <option value="Senior · Year 4">Senior · Year 4</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Short Bio / Focus Area
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Key interests, prior experience, or committee specialization..."
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member to Club</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
