import React, { useState } from 'react';
import {
  Vote,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Award,
  ArrowRight,
  School,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Check,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { ElectionConfig, ElectionSummaryStats, ElectionItem, StudentEligibility, AccreditationRecord, UserRole } from '../types/election';
import { electionEngine } from '../services/electionEngine';

interface Props {
  config: ElectionConfig;
  summaryStats: ElectionSummaryStats;
  userRole: UserRole;
  elections: ElectionItem[];
  onNavigate: (tab: 'home' | 'register' | 'accredit' | 'vote' | 'results' | 'admin') => void;
  onSelectStudentForReg: (matric: string, level: string, name: string) => void;
  onSelectStudentForAccredit: (matric: string) => void;
  onSelectVoterCodeForVote: (code: string) => void;
  onOpenDemoHelper: () => void;
}

export const PortalHome: React.FC<Props> = ({
  config,
  summaryStats,
  userRole,
  elections,
  onNavigate,
  onSelectStudentForReg,
  onSelectStudentForAccredit,
  onSelectVoterCodeForVote,
  onOpenDemoHelper,
}) => {
  const [searchMatric, setSearchMatric] = useState('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    student?: StudentEligibility;
    eligibleElections?: ElectionItem[];
    accreditation?: AccreditationRecord;
    isAccredited?: boolean;
    hasVoted?: boolean;
    message?: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (matricToSearch?: string) => {
    const target = matricToSearch || searchMatric;
    if (!target.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      const res = electionEngine.lookupStudent(target);
      setSearchResult(res);
      setIsSearching(false);
    }, 80);
  };

  const isRegOpen = electionEngine.isRegistrationOpen();
  const isVoteOpen = electionEngine.isVotingOpen();
  const allPositions = electionEngine.getPositions();

  return (
    <div className="space-y-4">
      
      {/* App Header Hero Card */}
      <div className="app-card-dark p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 live-pulse-beacon" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              ABSU &bull; MLS Uturu
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-200/80 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-600/30">
            {config.session}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
          NIMELSSA Election Portal
        </h1>
        <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
          Verify matriculation status, register for elections, and cast your vote.
        </p>

        {/* Instant Matric Search Box */}
        <div className="mt-4 bg-white rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-lg">
          <div className="flex items-center gap-2 flex-1 px-3 py-1.5 text-slate-800">
            <Search className="w-4 h-4 text-emerald-600 shrink-0" />
            <input
              type="text"
              value={searchMatric}
              onChange={(e) => setSearchMatric(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Matric Number (e.g. 2023/137945/Regular)"
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !searchMatric.trim()}
            className="app-button px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {isSearching ? (
              <span className="animate-spin text-sm">↻</span>
            ) : (
              <>
                <span>Search Roll</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Suggestions */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-200/80">
          <span className="font-semibold text-emerald-300">Quick Test:</span>
          {['2023/137945/Regular', '2025/159820/Regular', '2021/118742/Regular'].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setSearchMatric(sample);
                handleSearch(sample);
              }}
              className="app-button px-2.5 py-0.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 font-mono text-[10px] border border-emerald-700/40 cursor-pointer"
            >
              {sample.split('/')[0]}L ({sample.slice(0, 9)}...)
            </button>
          ))}
        </div>
      </div>

      {/* VERIFIED STUDENT RESULT CARD */}
      {searchResult && (
        <div className="animate-in fade-in zoom-in-95 duration-150">
          {searchResult.found && searchResult.student ? (
            <div className="app-card p-5 sm:p-6 border-2 border-emerald-500 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-200">
                    {searchResult.student.level}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                        {searchResult.student.fullName}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                      <span className="font-mono font-semibold text-slate-800">{searchResult.student.matricNumber}</span>
                      <span>&bull;</span>
                      <span>{searchResult.student.department || 'Medical Laboratory Science'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    searchResult.student.isRegistered
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {searchResult.student.isRegistered ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {searchResult.student.isRegistered ? 'Registered' : 'Not Registered'}
                  </span>

                  {searchResult.isAccredited && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                      Voter ID Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Eligible Elections for this student */}
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Eligible Elections ({searchResult.eligibleElections?.length || 0})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {searchResult.eligibleElections?.map((elec) => {
                    const posCount = allPositions.filter((p) => p.electionId === elec.id).length;
                    return (
                      <div
                        key={elec.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{elec.title}</p>
                          <p className="text-[11px] text-slate-500">{posCount} Positions &bull; Scope: {elec.scope}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          Eligible
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instant Action CTA */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {!searchResult.student.isRegistered
                    ? 'Registration is open. Register your identity now.'
                    : !searchResult.isAccredited
                    ? 'You are registered. Proceed to generate your Voter ID code.'
                    : 'You have a valid Voter ID code. Ready for balloting.'}
                </p>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!searchResult.student.isRegistered ? (
                    <button
                      onClick={() =>
                        onSelectStudentForReg(
                          searchResult.student!.matricNumber,
                          searchResult.student!.level,
                          searchResult.student!.fullName
                        )
                      }
                      className="app-button w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register for Election</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : !searchResult.isAccredited ? (
                    <button
                      onClick={() => onSelectStudentForAccredit(searchResult.student!.matricNumber)}
                      className="app-button w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Generate Voter ID</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectVoterCodeForVote(searchResult.accreditation!.voterIdCode)}
                      className="app-button w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Vote className="w-4 h-4 text-emerald-400" />
                      <span>Cast Ballot Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="app-card p-4 bg-rose-50/80 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">Matriculation Number Not Found</h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  "{searchMatric}" is not on the active 100L-500L class rolls. Please verify format or contact the Electoral Committee.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* App Quick Stats & Flow Tabs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Step 1: Register */}
        <div
          onClick={() => onNavigate('register')}
          className="app-card p-4 cursor-pointer hover:border-emerald-500 group flex items-start justify-between bg-white"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 font-bold text-xs">
              01
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
              Registration
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {summaryStats.totalRegistered} / {summaryStats.totalEligible} Enrolled
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
        </div>

        {/* Step 2: Accreditation */}
        <div
          onClick={() => onNavigate('accredit')}
          className="app-card p-4 cursor-pointer hover:border-emerald-500 group flex items-start justify-between bg-white"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2 font-bold text-xs">
              02
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition">
              Accreditation
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {summaryStats.totalAccredited} Voter IDs Issued
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
        </div>

        {/* Step 3: Voting */}
        <div
          onClick={() => onNavigate('vote')}
          className="app-card p-4 cursor-pointer hover:border-emerald-500 group flex items-start justify-between bg-white"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 font-bold text-xs">
              03
            </div>
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
              Live Balloting
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {summaryStats.totalVoted} Cast ({summaryStats.votingTurnoutPct}%)
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
        </div>
      </div>

      {/* Active Elections Carousel / Cards */}
      <div className="app-card p-4 sm:p-5 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Elections ({elections.length})</h3>
          </div>
          <button
            onClick={() => onNavigate('results')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Live Results</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {elections.map((election) => {
            const posCount = allPositions.filter((p) => p.electionId === election.id).length;
            return (
              <div key={election.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-bold text-xs sm:text-sm text-slate-900">{election.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {posCount} Offices &bull; Scope: <span className="font-semibold text-emerald-700">{election.scope}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  election.scope === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  {election.scope === 'ALL' ? 'General' : election.scope}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
