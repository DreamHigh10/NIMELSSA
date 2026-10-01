import React, { useState } from 'react';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Check,
  Layers,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Position, Contestant, ElectionConfig, ElectionItem, AccreditationRecord } from '../types/election';
import { electionEngine } from '../services/electionEngine';

interface Props {
  config: ElectionConfig;
  elections: ElectionItem[];
  positions: Position[];
  contestants: Contestant[];
  initialVoterCode?: string;
  onNavigateHome: () => void;
}

export const VotingBallot: React.FC<Props> = ({
  config,
  elections,
  positions,
  contestants,
  initialVoterCode = '',
  onNavigateHome,
}) => {
  const [voterIdCode, setVoterIdCode] = useState(initialVoterCode);
  const [activeAccreditation, setActiveAccreditation] = useState<AccreditationRecord | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<string>(elections[0]?.id || 'elec-general');
  const [authError, setAuthError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> contestantId
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ballotReceipt, setBallotReceipt] = useState<{
    voterIdCode: string;
    electionTitle: string;
    timestamp: string;
    positionsVoted: number;
    ballotHash: string;
  } | null>(null);

  React.useEffect(() => {
    if (initialVoterCode) {
      setVoterIdCode(initialVoterCode);
      verifyVoterCode(initialVoterCode);
    }
  }, [initialVoterCode]);

  const activeElection = elections.find((e) => e.id === selectedElectionId) || elections[0];
  const isVotingOpen = activeElection ? electionEngine.isVotingOpen(activeElection.id) : electionEngine.isVotingOpen();

  const verifyVoterCode = (code: string) => {
    setAuthError(null);
    if (!code.trim()) {
      setAuthError('Enter your Voter ID code.');
      return;
    }
    const clean = code.trim().toUpperCase();
    const acc = electionEngine.getAccreditationByVoterId(clean);

    if (!acc) {
      setAuthError('Voter ID code not found. Complete Step 2 first.');
      return;
    }

    setActiveAccreditation(acc);
    const eligibleElecs = electionEngine.getEligibleElectionsForStudent(acc.level);
    if (eligibleElecs.length > 0 && !eligibleElecs.some((e) => e.id === selectedElectionId)) {
      setSelectedElectionId(eligibleElecs[0].id);
    }
  };

  const handleSelectContestant = (positionId: string, contestantId: string) => {
    setSelections((prev) => ({
      ...prev,
      [positionId]: contestantId,
    }));
  };

  const handleFinalSubmit = () => {
    if (!activeAccreditation || !activeElection) return;
    setIsSubmitting(true);

    try {
      const res = electionEngine.submitBallot({
        voterIdCode: activeAccreditation.voterIdCode,
        electionId: activeElection.id,
        selections,
      });

      if (!res.success) {
        setAuthError(res.message);
        setIsSubmitting(false);
      } else if (res.ballotReceipt) {
        setBallotReceipt(res.ballotReceipt);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#059669', '#10b981', '#34d399', '#f59e0b'],
          });
        } catch {}
      }
    } catch (e: any) {
      setAuthError(e.message || 'Error submitting ballot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePositions = positions.filter((p) => {
    if (activeElection) {
      const matchesElection = p.electionId === activeElection.id;
      if (activeAccreditation) {
        const matchesLevel = p.scope === 'ALL' || p.scope === activeAccreditation.level;
        return matchesElection && matchesLevel;
      }
      return matchesElection;
    }
    return true;
  });

  const selectedCount = Object.keys(selections).filter((posId) => activePositions.some((p) => p.id === posId)).length;
  const totalPositions = activePositions.length;

  const eligibleElections = activeAccreditation
    ? electionEngine.getEligibleElectionsForStudent(activeAccreditation.level)
    : elections;

  const isAlreadyVoted = activeAccreditation?.votedElections?.includes(activeElection?.id || '');

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16">
      
      {/* 1. If Ballot Receipt is Done */}
      {ballotReceipt ? (
        <div className="app-card p-6 sm:p-8 text-center space-y-4 bg-white border-2 border-emerald-500 animate-in fade-in duration-150">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">Vote Cast Successfully!</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your secret ballot is sealed and counted.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-w-md mx-auto text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Election:</span>
              <span className="font-bold text-slate-900">{ballotReceipt.electionTitle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Offices Voted:</span>
              <span className="font-bold text-emerald-700">{ballotReceipt.positionsVoted}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Receipt Hash:</span>
              <span className="font-mono font-bold text-slate-700 text-[11px]">{ballotReceipt.ballotHash}</span>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="app-button px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer shadow-md"
          >
            Back to Home
          </button>
        </div>
      ) : !activeAccreditation ? (
        /* 2. Voter ID Code Auth Box */
        <div className="app-card p-5 sm:p-6 space-y-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 font-heading">Secret Voting Booth</h2>
              <p className="text-xs text-slate-500">Enter your Voter ID code to unlock ballot</p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-900 border border-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={voterIdCode}
              onChange={(e) => setVoterIdCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABSU-MLS-XXXX-XXXX"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => verifyVoterCode(voterIdCode)}
              className="app-button px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-md"
            >
              Unlock Ballot
            </button>
          </div>
        </div>
      ) : (
        /* 3. Unlocked Voting Booth */
        <div className="space-y-4">
          
          {/* Active Voter Info Pill */}
          <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 live-pulse-beacon" />
              <div>
                <p className="text-xs font-bold text-slate-900">{activeAccreditation.studentName} ({activeAccreditation.level})</p>
                <p className="text-[11px] font-mono text-slate-500">ID: {activeAccreditation.voterIdCode}</p>
              </div>
            </div>

            {/* Election Switcher Tabs */}
            <div className="flex flex-wrap gap-1">
              {eligibleElections.map((elec) => (
                <button
                  key={elec.id}
                  onClick={() => setSelectedElectionId(elec.id)}
                  className={`app-button px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    selectedElectionId === elec.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {elec.scope === 'ALL' ? 'General Election' : `${elec.scope} Election`}
                </button>
              ))}
            </div>
          </div>

          {isAlreadyVoted ? (
            <div className="app-card p-6 text-center space-y-2 bg-amber-50/70 border border-amber-200">
              <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-bold text-sm text-amber-900">Ballot Already Submitted for This Election</h3>
              <p className="text-xs text-amber-700">You have already cast your vote in {activeElection?.title}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Positions & Contestants */}
              {activePositions.map((position) => {
                const posContestants = contestants.filter((c) => c.positionId === position.id);
                const selectedCandidateId = selections[position.id];

                return (
                  <div key={position.id} className="app-card p-4 sm:p-5 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 font-heading">
                          {position.title}
                        </h3>
                        <p className="text-[11px] text-slate-500">Select 1 candidate &bull; Scope: {position.scope}</p>
                      </div>
                      {selectedCandidateId ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Selected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {posContestants.map((contestant) => {
                        const isSelected = selectedCandidateId === contestant.id;

                        return (
                          <div
                            key={contestant.id}
                            onClick={() => handleSelectContestant(position.id, contestant.id)}
                            className={`app-button p-3 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                                : 'border-slate-200/80 bg-slate-50 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <img
                              src={contestant.photoUrl}
                              alt={contestant.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {contestant.name}
                              </p>
                              <p className="text-[11px] text-emerald-700 font-medium truncate">
                                {contestant.nickname ? `"${contestant.nickname}"` : contestant.level}
                              </p>
                              {contestant.slogan && (
                                <p className="text-[10px] text-slate-500 truncate italic">
                                  "{contestant.slogan}"
                                </p>
                              )}
                            </div>

                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Floating Bottom Submission Bar */}
              <div className="sticky bottom-18 sm:bottom-4 z-40 bg-slate-950 text-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-2xl border border-emerald-500/40">
                <div>
                  <p className="font-bold text-xs sm:text-sm text-white">
                    {selectedCount} of {totalPositions} Offices Selected
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedCount === totalPositions ? 'Ready for submission' : 'Complete selections to submit'}
                  </p>
                </div>

                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || selectedCount === 0}
                  className="app-button px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span>Submit Ballot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
