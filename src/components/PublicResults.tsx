import React from 'react';
import {
  Award,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Printer,
  Sparkles,
  Users,
  Trophy,
} from 'lucide-react';
import { ElectionConfig, VoteTally } from '../types/election';

interface Props {
  config: ElectionConfig;
  tallies: VoteTally[] | null;
  onNavigateToAdmin?: () => void;
}

export const PublicResults: React.FC<Props> = ({ config, tallies, onNavigateToAdmin }) => {
  if (!config.isRatified || !tallies) {
    return (
      <div id="public-results-embargo" className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              OFFICIAL EMBARGO ACTIVE
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 pt-2">
              Election Results Confidential & Unratified
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              In accordance with Section 3.5 of the NIMELSSA ABSU Electoral Constitution, running vote tallies are strictly confidential to authorized Electoral Committee personnel during active polling.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 max-w-lg mx-auto text-left text-xs text-slate-700 space-y-2">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Ratification Protocol:</span>
            </p>
            <p className="leading-relaxed">
              1. Voting window concludes automatically across all academic levels.<br />
              2. Electoral Committee performs forensic ballot verification and audit check.<br />
              3. The Electoral Chairman and HOD Patron execute the official digital ratification.<br />
              4. The public declaration unlocks immediately with certified winners.
            </p>
          </div>

          <div className="pt-3">
            <p className="text-xs text-slate-400 italic">
              Are you an authorized Electoral Committee member?
            </p>
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Access Electoral Committee Live Results Console &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Ratified Public Results View
  return (
    <div id="public-results-view" className="max-w-4xl mx-auto space-y-8">
      {/* Official Declaration Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500/80 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-800/80 pb-4">
            <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
              <span className="p-2 rounded-xl bg-emerald-800 text-amber-300">
                <Trophy className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Official Certified Election Declaration
                </h1>
                <p className="text-xs text-emerald-300">
                  {config.chapterName} &bull; {config.department}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-800/90 text-emerald-200 border border-emerald-500/50 mx-auto sm:mx-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>OFFICIALLY RATIFIED</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
              <span className="text-emerald-400 block text-[10px] uppercase font-bold">Ratified By:</span>
              <span className="font-bold text-white text-sm">{config.ratifiedBy || 'Electoral Commission'}</span>
            </div>
            <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
              <span className="text-emerald-400 block text-[10px] uppercase font-bold">Certification Date:</span>
              <span className="font-medium text-white text-sm">
                {config.ratifiedAt ? new Date(config.ratifiedAt).toLocaleString() : 'Recent'}
              </span>
            </div>
            <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
              <span className="text-emerald-400 block text-[10px] uppercase font-bold">Academic Session:</span>
              <span className="font-medium text-white text-sm">{config.session}</span>
            </div>
          </div>

          {config.ratificationNotes && (
            <div className="p-3 bg-emerald-900/30 rounded-xl border border-emerald-800/40 text-xs text-emerald-200 italic">
              &ldquo;{config.ratificationNotes}&rdquo;
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Declaration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Position Breakdown & Winner Cards */}
      <div className="space-y-6">
        {tallies.map((pos) => {
          const winner = pos.contestants.find((c) => c.isWinner);

          return (
            <div
              key={pos.positionId}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{pos.positionTitle}</h3>
                  <p className="text-xs text-slate-500">Total Certified Votes: {pos.totalVotesCast}</p>
                </div>
                {winner && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-700" /> Winner: {winner.contestantName}
                  </span>
                )}
              </div>

              {/* Contestant results cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pos.contestants.map((con) => (
                  <div
                    key={con.contestantId}
                    className={`p-4 rounded-xl border-2 flex items-center gap-4 transition ${
                      con.isWinner
                        ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={con.photoUrl}
                        alt={con.contestantName}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      {con.isWinner && (
                        <span className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                          <Trophy className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{con.contestantName}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {con.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">&ldquo;{con.slogan}&rdquo;</p>

                      {/* Vote tally bar */}
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className={con.isWinner ? 'text-amber-900' : 'text-slate-700'}>
                            {con.votes} votes
                          </span>
                          <span className={con.isWinner ? 'text-amber-900 font-bold' : 'text-slate-500'}>
                            {con.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${con.isWinner ? 'bg-amber-500' : 'bg-slate-400'}`}
                            style={{ width: `${con.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
