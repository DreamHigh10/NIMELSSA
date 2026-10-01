import React from 'react';
import { X, Sparkles, Copy, Check, ArrowRight, UserCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { StudentEligibility, AccreditationRecord } from '../types/election';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eligibleStudents: StudentEligibility[];
  accreditedRecords: AccreditationRecord[];
  onSelectRegisterMatric: (matric: string, level: string, name: string) => void;
  onSelectAccreditMatric: (matric: string) => void;
  onSelectVoterCode: (code: string) => void;
}

export const DemoHelperModal: React.FC<Props> = ({
  isOpen,
  onClose,
  eligibleStudents,
  accreditedRecords,
  onSelectRegisterMatric,
  onSelectAccreditMatric,
  onSelectVoterCode,
}) => {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const unregistered = eligibleStudents.filter((s) => !s.isRegistered).slice(0, 4);
  const registeredReadyToAccredit = eligibleStudents
    .filter((s) => s.isRegistered && !accreditedRecords.some((a) => a.matricNumber.toUpperCase() === s.matricNumber.toUpperCase()))
    .slice(0, 4);
  const readyToVote = accreditedRecords.filter((a) => !a.hasVoted).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-800 text-amber-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-lg">NIMELSSA ABSU Demo Sandbox</h2>
              <p className="text-xs text-emerald-200">Pre-seeded ABSU Medical Lab Science student records for evaluation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <span className="font-bold">Electoral Workflow: </span>
            <span>
              1. <strong>Register</strong> (check matric list) &rarr; 2. <strong>Accredit</strong> (obtain random Voter ID Code) &rarr; 3. <strong>Vote</strong> (enter Voter ID, one vote per office) &rarr; 4. <strong>Real-time Results</strong> (Electoral Committee only until official ratification).
            </span>
          </div>

          {/* Section 1: Ready to Register */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>1. Students on Master Roll (Unregistered & Ready)</span>
              </h3>
              <span className="text-xs text-slate-500">{unregistered.length} samples</span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5">
              These students exist on the official university matriculation list but have not registered yet:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unregistered.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-slate-900 text-xs">{s.matricNumber}</p>
                    <p className="text-xs text-slate-600 truncate">{s.fullName}</p>
                    <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-200 text-slate-700 mt-1">
                      {s.level}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectRegisterMatric(s.matricNumber, s.level, s.fullName);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition shrink-0 flex items-center gap-1"
                  >
                    <span>Use</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Ready to Accredit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-teal-700" />
                <span>2. Registered Students (Ready to Accredit)</span>
              </h3>
              <span className="text-xs text-slate-500">{registeredReadyToAccredit.length} samples</span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5">
              Already completed registration; can immediately accredit to generate a Voter ID:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {registeredReadyToAccredit.length > 0 ? (
                registeredReadyToAccredit.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50/60 hover:border-teal-300 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-slate-900 text-xs">{s.matricNumber}</p>
                      <p className="text-xs text-slate-600 truncate">{s.fullName}</p>
                      <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-teal-100 text-teal-800 mt-1">
                        {s.level}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectAccreditMatric(s.matricNumber);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white cursor-pointer transition shrink-0 flex items-center gap-1"
                    >
                      <span>Accredit</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                  All registered students are currently accredited. You can register a new student above or use an issued voter code below.
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Issued Voter Codes (Ready to Vote) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>3. Issued Voter ID Codes (Ready to Vote in Booth)</span>
              </h3>
              <span className="text-xs text-slate-500">{readyToVote.length} codes available</span>
            </div>
            <p className="text-xs text-slate-500 mb-2.5">
              These students are accredited. Use their sensitive Voter ID Code to open the ballot:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {readyToVote.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-amber-900 text-sm tracking-wide">
                      {a.voterIdCode}
                    </p>
                    <p className="text-xs text-slate-700 truncate">{a.studentName}</p>
                    <span className="text-[10px] text-slate-500">{a.matricNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(a.voterIdCode)}
                      className="p-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-200/60 transition cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode === a.voterIdCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        onSelectVoterCode(a.voterIdCode);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-700 hover:bg-amber-800 text-white cursor-pointer transition flex items-center gap-1"
                    >
                      <span>Vote</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">NIMELSSA ABSU Chapter Electoral System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
