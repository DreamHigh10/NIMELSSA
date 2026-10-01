import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { AccreditationRecord, ElectionConfig } from '../types/election';
import { electionEngine } from '../services/electionEngine';

interface Props {
  config: ElectionConfig;
  initialMatric?: string;
  onProceedToVote: (voterIdCode: string) => void;
  onOpenOutbox: () => void;
}

export const VoterAccreditation: React.FC<Props> = ({
  config,
  initialMatric = '',
  onProceedToVote,
  onOpenOutbox,
}) => {
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [accreditationResult, setAccreditationResult] = useState<AccreditationRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialMatric) setMatricNumber(initialMatric);
  }, [initialMatric]);

  const handleAccredit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!matricNumber.trim()) {
      setStatusMessage({ type: 'error', text: 'Enter matric number.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = electionEngine.accreditVoter({
        matricNumber,
      });

      if (!result.success) {
        setStatusMessage({ type: 'error', text: result.message });
      } else if (result.record) {
        setAccreditationResult(result.record);
        setStatusMessage({ type: 'success', text: result.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* App Step Banner */}
      <div className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
              02
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 font-heading">
                Voter Accreditation
              </h2>
              <p className="text-xs text-slate-500">
                Generate single-use Voter ID token
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Phase 2
          </span>
        </div>
      </div>

      {accreditationResult ? (
        <div className="app-card p-6 border-2 border-teal-500 space-y-4 bg-white animate-in fade-in duration-150">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 font-mono">
              Your Secret Voter ID Code
            </span>
            <div className="bg-slate-950 text-white rounded-2xl p-5 border border-teal-500/50 my-2">
              <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-emerald-400">
                {accreditationResult.voterIdCode}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Single-use &bull; Keep confidential</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleCopyCode(accreditationResult.voterIdCode)}
              className="app-button flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Voter ID'}</span>
            </button>

            <button
              onClick={() => onProceedToVote(accreditationResult.voterIdCode)}
              className="app-button flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Go to Voting Booth</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAccredit} className="app-card p-5 sm:p-6 space-y-4 bg-white">
          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Registered Matriculation Number
            </label>
            <input
              type="text"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. 2023/137945/Regular"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !matricNumber.trim()}
            className="app-button w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {isSubmitting ? (
              <span>Verifying...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Issue My Voter ID Code</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
