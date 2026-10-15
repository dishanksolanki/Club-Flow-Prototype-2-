import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DepartmentType, Member, WorkingHourRecord } from '../../types';

interface LogHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogHours: (record: WorkingHourRecord) => void;
  currentUser: Member;
  departments: DepartmentType[];
  members?: Member[];
}

export const LogHoursModal: React.FC<LogHoursModalProps> = ({
  isOpen,
  onClose,
  onLogHours,
  currentUser,
  departments,
  members = [],
}) => {
  const [selectedMember, setSelectedMember] = useState(currentUser.name);
  const [department, setDepartment] = useState<DepartmentType>(currentUser.department);
  const [project, setProject] = useState('');
  const [date, setDate] = useState('Oct 13, 2026');
  const [startTime, setStartTime] = useState('02:00 PM');
  const [endTime, setEndTime] = useState('05:30 PM');
  const [description, setDescription] = useState('');
  const [calculatedHours, setCalculatedHours] = useState(3.5);

  // Automatically calculate duration from start and end times
  useEffect(() => {
    const parseTimeToMinutes = (timeStr: string): number | null => {
      if (!timeStr) return null;
      const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (startMin !== null && endMin !== null) {
      let diff = endMin - startMin;
      if (diff < 0) diff += 24 * 60; // Crosses midnight
      const hrs = parseFloat((diff / 60).toFixed(1));
      setCalculatedHours(hrs > 0 ? hrs : 1.0);
    }
  }, [startTime, endTime]);

  // When member changes, auto-select their department
  const handleMemberChange = (name: string) => {
    setSelectedMember(name);
    const found = members.find((m) => m.name === name);
    if (found) {
      setDepartment(found.department);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim() || calculatedHours <= 0) return;

    const newRecord: WorkingHourRecord = {
      id: `wh-${Date.now()}`,
      date,
      member: selectedMember,
      department,
      project: project.trim(),
      startTime,
      endTime,
      description: description.trim() || 'Club operational project contribution.',
      hours: calculatedHours,
      verifiedBy: 'Sophia Vance (President)',
      status: 'Pending Verification',
    };

    onLogHours(newRecord);
    setProject('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Work Record"
      description="Record volunteer hours invested in development, design, and event logistics."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Member */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Member *
            </label>
            <select
              value={selectedMember}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer"
            >
              {members.length > 0 ? (
                members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.department})
                  </option>
                ))
              ) : (
                <option value={currentUser.name}>{currentUser.name}</option>
              )}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentType)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Task / Activity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Task / Activity Name *
          </label>
          <input
            type="text"
            required
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="e.g. HackNova Staging Infrastructure or Audio Calibration"
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
          />
        </div>

        {/* Date, Start Time, End Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Date *
            </label>
            <input
              type="text"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Oct 13, 2026"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Start Time *
            </label>
            <input
              type="text"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="02:00 PM"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              End Time *
            </label>
            <input
              type="text"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="05:30 PM"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Calculated Duration Banner */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            Calculated Total Duration:
          </span>
          <span className="text-sm font-bold font-mono text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
            {calculatedHours} hours
          </span>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description & Key Outcomes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what was resolved or produced during this session..."
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Record Work Hours
          </button>
        </div>
      </form>
    </Modal>
  );
};
