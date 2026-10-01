import React, { useState } from 'react';
import { X, Mail, Copy, Check, ShieldCheck, Clock } from 'lucide-react';
import { OutboxEmail } from '../services/electionEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  emails: OutboxEmail[];
}

export const EmailOutboxModal: React.FC<Props> = ({ isOpen, onClose, emails }) => {
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(emails[0] || null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-slate-800 text-emerald-400">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold text-base sm:text-lg">Student Accreditation Email Outbox</h2>
              <p className="text-xs text-slate-400">Official single-use Voter ID backup notices delivered to student inboxes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with list and preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* Email List Sidebar */}
          <div className="p-3 overflow-y-auto space-y-1.5 max-h-56 md:max-h-full bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase px-2 py-1">
              Delivered ({emails.length})
            </div>
            {emails.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 text-center">
                No accreditation emails dispatched yet. Complete an accreditation to generate one.
              </div>
            ) : (
              emails.map((eml) => (
                <div
                  key={eml.id}
                  onClick={() => setSelectedEmail(eml)}
                  className={`p-2.5 rounded-xl cursor-pointer transition text-left ${
                    selectedEmail?.id === eml.id
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'hover:bg-white border border-transparent text-slate-700'
                  }`}
                >
                  <p className="font-semibold text-xs truncate">{eml.recipientName}</p>
                  <p className="text-[11px] font-mono text-emerald-700 font-bold">{eml.voterIdCode}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate">{eml.recipientEmail}</span>
                    <span>{new Date(eml.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Email Body Preview */}
          <div className="md:col-span-2 p-6 overflow-y-auto bg-white flex flex-col justify-between">
            {selectedEmail ? (
              <div className="space-y-4">
                {/* Email Header */}
                <div className="border-b border-slate-200 pb-4 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      From: <span className="text-emerald-800 font-bold">electoral-committee@nimelssa-absu.edu.ng</span>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedEmail.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700">
                    To: <span className="font-medium text-slate-900">{selectedEmail.recipientName}</span> &lt;
                    {selectedEmail.recipientEmail}&gt; ({selectedEmail.matricNumber})
                  </p>
                  <p className="text-slate-900 font-bold text-sm pt-1">{selectedEmail.subject}</p>
                </div>

                {/* Formal Email Card */}
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 text-xs leading-relaxed space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-900 text-xs">NIMELSSA ABSU ELECTORAL COMMITTEE</span>
                    </div>
                    <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                      Official Dispatch
                    </span>
                  </div>

                  <p>
                    Dear <strong>{selectedEmail.recipientName}</strong> (Matric: {selectedEmail.matricNumber}),
                  </p>
                  <p>
                    You have successfully accredited for the <strong>NIMELSSA ABSU General Elections 2026/2027</strong>.
                    Below is your single-use, sensitive Voter Identification Code:
                  </p>

                  {/* Voter Code Highlight Box */}
                  <div className="my-3 p-4 bg-emerald-950 text-white rounded-xl text-center border-2 border-emerald-500 shadow-inner">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-1">
                      Official Confidential Voter ID Code
                    </p>
                    <p className="font-mono text-xl sm:text-2xl font-extrabold tracking-wider text-emerald-100">
                      {selectedEmail.voterIdCode}
                    </p>
                    <div className="mt-2.5 flex justify-center">
                      <button
                        onClick={() => handleCopyCode(selectedEmail.voterIdCode)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Code Copied!' : 'Copy Voter ID Code'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-1 bg-amber-50/70 p-3 rounded-lg border border-amber-200">
                    <p className="font-bold text-amber-900">SECURITY DIRECTIVES:</p>
                    <p>&bull; This Voter ID is single-use and non-transferable.</p>
                    <p>&bull; Use this code to log into the online voting booth during the active voting window.</p>
                    <p>&bull; Keep this code strictly confidential to prevent unauthorized ballot casting.</p>
                  </div>

                  <p className="text-[11px] text-slate-500 pt-2">
                    Hon. Electoral Committee, Abia State University Chapter<br />
                    Department of Medical Laboratory Science, Uturu
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Select an email from the left sidebar to read its contents.
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Close Outbox
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
