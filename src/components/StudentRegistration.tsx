import React, { useState } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  Phone,
  Mail,
  Lock,
  Check,
} from 'lucide-react';
import { StudentLevel, StudentEligibility, ElectionItem } from '../types/election';
import { electionEngine } from '../services/electionEngine';

interface Props {
  elections: ElectionItem[];
  onProceedToAccreditation: (matricNumber: string) => void;
  initialMatric?: string;
  initialLevel?: StudentLevel;
  initialName?: string;
}

export const StudentRegistration: React.FC<Props> = ({
  elections,
  onProceedToAccreditation,
  initialMatric = '',
  initialLevel = '300L',
  initialName = '',
}) => {
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [fullName, setFullName] = useState(initialName);
  const [level, setLevel] = useState<StudentLevel>(initialLevel);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [registeredStudent, setRegisteredStudent] = useState<StudentEligibility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegOpen = electionEngine.isRegistrationOpen();

  React.useEffect(() => {
    if (initialMatric) {
      setMatricNumber(initialMatric);
      handleCheckEligibility(initialMatric);
    }
    if (initialName) setFullName(initialName);
    if (initialLevel) setLevel(initialLevel);
  }, [initialMatric, initialName, initialLevel]);

  const handleCheckEligibility = (matricToCheck?: string) => {
    const target = matricToCheck || matricNumber;
    if (!target.trim()) {
      setStatusMessage({ type: 'error', text: 'Enter matric number.' });
      return;
    }
    const record = electionEngine.getEligibilityRecord(target);

    if (!record) {
      setStatusMessage({
        type: 'error',
        text: `Matric number "${target.trim()}" not found on class rolls (100L-500L).`,
      });
      return;
    }

    setMatricNumber(record.matricNumber);
    setFullName(record.fullName);
    setLevel(record.level);

    if (record.isRegistered) {
      setStatusMessage({
        type: 'info',
        text: `Already registered as ${record.fullName} (${record.level}). Proceed to get Voter ID.`,
      });
      setRegisteredStudent(record);
      return;
    }

    setStatusMessage({
      type: 'success',
      text: `Verified: ${record.fullName} (${record.level}). Enter contact info to register.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isRegOpen) {
      setStatusMessage({ type: 'error', text: 'Registration deadline has passed.' });
      return;
    }
    if (!matricNumber.trim() || !fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Matric number and Name are required.' });
      return;
    }
    if (!phone.trim()) {
      setStatusMessage({ type: 'error', text: 'Phone number required.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Valid email required for Voter ID.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = electionEngine.registerStudent({
        matricNumber,
        fullName,
        level,
        phone,
        email,
      });

      if (!result.success) {
        setStatusMessage({ type: 'error', text: result.message });
      } else {
        setStatusMessage({ type: 'success', text: result.message });
        if (result.student) setRegisteredStudent(result.student);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Registration failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* App Step Banner */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
              01
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 font-heading">
                Voter Registration
              </h2>
              <p className="text-xs text-slate-500">
                Verify identity on ABSU 100L-500L roll
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            isRegOpen ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {isRegOpen ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>

      {registeredStudent ? (
        <div className="app-card p-6 border-2 border-emerald-500 space-y-4 bg-white animate-in fade-in duration-150">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-base text-slate-900">Registration Complete</h3>
              <p className="text-xs text-slate-500">Identity successfully enrolled.</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Name:</span>
              <span className="font-bold text-slate-900">{registeredStudent.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Matric:</span>
              <span className="font-mono font-bold text-slate-900">{registeredStudent.matricNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Level:</span>
              <span className="font-bold text-emerald-700">{registeredStudent.level}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Status:</span>
              <span className="font-bold text-emerald-700">Enrolled</span>
            </div>
          </div>

          <button
            onClick={() => onProceedToAccreditation(registeredStudent.matricNumber)}
            className="app-button w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <span>Generate Voter ID (Step 2)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="app-card p-5 sm:p-6 space-y-4 bg-white">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' || statusMessage.type === 'info' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Step 1: Matric Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Matriculation Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                placeholder="e.g. 2023/137945/Regular"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleCheckEligibility()}
                className="app-button px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Verify</span>
              </button>
            </div>
          </div>

          {/* Step 2: Auto-filled / Editable Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Student Full Name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Academic Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as StudentLevel)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="100L">100 Level</option>
                <option value="200L">200 Level</option>
                <option value="300L">300 Level</option>
                <option value="400L">400 Level</option>
                <option value="500L">500 Level</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (For Voter ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@absu.edu.ng"
                  className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="080 1234 5678"
                  className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !isRegOpen}
            className="app-button w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
          >
            {isSubmitting ? (
              <span>Registering...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Confirm Registration</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
