import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { ElectionConfig } from '../types/election';

interface Props {
  config: ElectionConfig;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUpcoming: boolean;
}

function calculateTime(targetDateStr: string, startDateStr?: string): TimeRemaining {
  const target = new Date(targetDateStr).getTime();
  const start = startDateStr ? new Date(startDateStr).getTime() : 0;
  const now = Date.now();

  if (start && now < start) {
    const diff = Math.max(0, start - now);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isExpired: false,
      isUpcoming: true,
    };
  }

  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isExpired: diff <= 0,
    isUpcoming: false,
  };
}

export const CountdownWidget: React.FC<Props> = ({ config }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const accTime = calculateTime(config.accreditationEnd, config.accreditationStart);
  const voteTime = calculateTime(config.votingEnd, config.votingStart);

  const isAccActive = config.accreditationForceUnlocked || (!accTime.isUpcoming && !accTime.isExpired);
  const isVoteActive = config.votingForceUnlocked || (!voteTime.isUpcoming && !voteTime.isExpired);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Registration Card */}
      <div className="app-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-pulse-beacon" />
            <span className="text-xs font-bold text-slate-800">Registration Phase</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
            isAccActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {isAccActive ? 'OPEN' : 'LOCKED'}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 font-mono">
          <span className="text-[11px] font-medium text-slate-500">Closes in:</span>
          <div className="flex items-center gap-1 text-slate-900 font-bold text-xs sm:text-sm">
            <span>{accTime.days}d</span>:
            <span>{String(accTime.hours).padStart(2, '0')}h</span>:
            <span>{String(accTime.minutes).padStart(2, '0')}m</span>:
            <span className="text-emerald-700">{String(accTime.seconds).padStart(2, '0')}s</span>
          </div>
        </div>
      </div>

      {/* Voting Card */}
      <div className="app-card p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isVoteActive ? 'bg-emerald-500 live-pulse-beacon' : 'bg-slate-400'}`} />
            <span className="text-xs font-bold text-slate-800">Secret Balloting</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
            isVoteActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {isVoteActive ? 'POLLS OPEN' : 'SCHEDULED'}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 font-mono">
          <span className="text-[11px] font-medium text-slate-500">Voting Window:</span>
          <div className="flex items-center gap-1 text-slate-900 font-bold text-xs sm:text-sm">
            <span>{voteTime.days}d</span>:
            <span>{String(voteTime.hours).padStart(2, '0')}h</span>:
            <span>{String(voteTime.minutes).padStart(2, '0')}m</span>:
            <span className="text-emerald-700">{String(voteTime.seconds).padStart(2, '0')}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};
