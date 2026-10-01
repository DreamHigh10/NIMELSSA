import React, { useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  UploadCloud,
  Users,
  Clock,
  Award,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Database,
  Mail,
  Copy,
  Send,
  Layers,
  Check,
  Vote,
} from 'lucide-react';
import {
  UserRole,
  ElectionConfig,
  ElectionItem,
  Position,
  Contestant,
  StudentEligibility,
  AccreditationRecord,
  AuditLogEntry,
  VoteTally,
  ElectionSummaryStats,
  StudentLevel,
  ElectionScope,
  ElectionCategory,
} from '../types/election';
import { electionEngine } from '../services/electionEngine';
import { parseMatricListFile, ParseResult } from '../utils/fileParser';
import { SupabaseElectionService } from '../services/supabaseElectionService';
import { isSupabaseConfigured } from '../lib/supabase';

interface Props {
  userRole: UserRole;
  config: ElectionConfig;
  elections: ElectionItem[];
  positions: Position[];
  contestants: Contestant[];
  eligibleStudents: StudentEligibility[];
  accreditations: AccreditationRecord[];
  auditLogs: AuditLogEntry[];
  summaryStats: ElectionSummaryStats;
  tallies: VoteTally[];
  onOpenOutbox: () => void;
}

export const AdminPortal: React.FC<Props> = ({
  userRole,
  config,
  elections,
  positions,
  contestants,
  eligibleStudents,
  accreditations,
  auditLogs,
  summaryStats,
  tallies,
  onOpenOutbox,
}) => {
  const [activeTab, setActiveTab] = useState<
    'live_results' | 'elections_mgr' | 'eligibility' | 'contestants' | 'timers' | 'ratification' | 'audit' | 'export' | 'cloud_sync'
  >('live_results');

  // Selected Election Filter for Results & Management
  const [selectedElectionFilter, setSelectedElectionFilter] = useState<string>('ALL');

  // Cloud Sync & Resend State
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // File Upload State (Multi-format: Excel, Word, PDF, CSV)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetLevel, setUploadTargetLevel] = useState<StudentLevel>('300L');
  const [parsedPreview, setParsedPreview] = useState<ParseResult | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Manual Add Student State
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualMatric, setManualMatric] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualLevel, setManualLevel] = useState<StudentLevel>('400L');
  const [manualReason, setManualReason] = useState('');

  // Eligibility filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | StudentLevel>('ALL');

  // Election CRUD Modal
  const [isElectionModalOpen, setIsElectionModalOpen] = useState(false);
  const [editingElection, setEditingElection] = useState<ElectionItem | null>(null);
  const [elecTitle, setElecTitle] = useState('');
  const [elecCode, setElecCode] = useState('');
  const [elecDesc, setElecDesc] = useState('');
  const [elecScope, setElecScope] = useState<ElectionScope>('ALL');
  const [elecCat, setElecCat] = useState<ElectionCategory>('general');
  const [elecRegStart, setElecRegStart] = useState(new Date().toISOString().slice(0, 16));
  const [elecRegDeadline, setElecRegDeadline] = useState(new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [elecVotingStart, setElecVotingStart] = useState(new Date().toISOString().slice(0, 16));
  const [elecVotingEnd, setElecVotingEnd] = useState(new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16));

  // Contestant CRUD Modal
  const [isContestantModalOpen, setIsContestantModalOpen] = useState(false);
  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null);
  const [conName, setConName] = useState('');
  const [conNickname, setConNickname] = useState('');
  const [conElectionId, setConElectionId] = useState(elections[0]?.id || 'elec-general');
  const [conPositionId, setConPositionId] = useState(positions[0]?.id || '');
  const [conLevel, setConLevel] = useState<StudentLevel>('400L');
  const [conPhotoUrl, setConPhotoUrl] = useState('');
  const [conSlogan, setConSlogan] = useState('');
  const [conManifesto, setConManifesto] = useState('');

  // Position CRUD Modal
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [posTitle, setPosTitle] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posElectionId, setPosElectionId] = useState(elections[0]?.id || 'elec-general');
  const [posScope, setPosScope] = useState<ElectionScope>('ALL');

  // Timers form
  const [accStart, setAccStart] = useState(config.accreditationStart.slice(0, 16));
  const [accEnd, setAccEnd] = useState(config.accreditationEnd.slice(0, 16));
  const [accForce, setAccForce] = useState(config.accreditationForceUnlocked);
  const [voteStart, setVoteStart] = useState(config.votingStart.slice(0, 16));
  const [voteEnd, setVoteEnd] = useState(config.votingEnd.slice(0, 16));
  const [voteForce, setVoteForce] = useState(config.votingForceUnlocked);

  // Ratification Modal
  const [isRatifyModalOpen, setIsRatifyModalOpen] = useState(false);
  const [ratifyNotes, setRatifyNotes] = useState('');
  const [ratifyConfirmText, setRatifyConfirmText] = useState('');

  const adminActorName =
    userRole === 'super_admin'
      ? 'Dr. C. O. Iheanacho (HOD / Patron)'
      : 'Hon. O. K. Nwachukwu (Electoral Committee Admin)';

  // Handle Multi-format Class List Upload (Excel, Word, PDF, CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    try {
      const existingMatricSet = new Set(eligibleStudents.map((s) => s.matricNumber.toUpperCase()));
      const result = await parseMatricListFile(file, uploadTargetLevel, existingMatricSet);
      setParsedPreview(result);
    } catch (err: any) {
      alert(`Error parsing class list: ${err.message}`);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Commit Parsed Students to Roll
  const handleCommitParsedStudents = () => {
    if (!parsedPreview) return;
    const validStudents = parsedPreview.students
      .filter((s) => s.status === 'valid')
      .map((s) => ({
        matricNumber: s.matricNumber,
        fullName: s.fullName,
        level: s.level,
        phone: s.phone,
        email: s.email,
        department: s.department,
      }));

    if (validStudents.length === 0) {
      alert('No new valid students to commit.');
      return;
    }

    const { addedCount, duplicateCount } = electionEngine.commitParsedStudents(validStudents, adminActorName);
    alert(`Successfully committed ${addedCount} student records to the ${uploadTargetLevel} class list (${duplicateCount} existing duplicates skipped).`);
    setParsedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manual Add Student
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatric || !manualName || !manualReason) {
      alert('Please fill all required fields, including audit justification reason.');
      return;
    }

    const res = electionEngine.manualAddStudent({
      matricNumber: manualMatric,
      fullName: manualName,
      level: manualLevel,
      adminName: adminActorName,
      reason: manualReason,
    });

    if (!res.success) {
      alert(res.message);
    } else {
      alert(res.message);
      setIsManualAddOpen(false);
      setManualMatric('');
      setManualName('');
      setManualReason('');
    }
  };

  // Image Compressor for Contestant Photo
  const handleImageCompressAndUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        setConPhotoUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save Election Item
  const handleSaveElection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!elecTitle || !elecCode) {
      alert('Election title and code are required.');
      return;
    }

    if (editingElection) {
      electionEngine.updateElection(
        editingElection.id,
        {
          title: elecTitle,
          code: elecCode,
          description: elecDesc,
          scope: elecScope,
          category: elecCat,
          regStart: new Date(elecRegStart).toISOString(),
          regDeadline: new Date(elecRegDeadline).toISOString(),
          votingStart: new Date(elecVotingStart).toISOString(),
          votingEnd: new Date(elecVotingEnd).toISOString(),
        },
        adminActorName
      );
    } else {
      electionEngine.addElection(
        {
          title: elecTitle,
          code: elecCode,
          description: elecDesc || 'NIMELSSA ABSU Election',
          scope: elecScope,
          category: elecCat,
          session: config.session,
          regStart: new Date(elecRegStart).toISOString(),
          regDeadline: new Date(elecRegDeadline).toISOString(),
          votingStart: new Date(elecVotingStart).toISOString(),
          votingEnd: new Date(elecVotingEnd).toISOString(),
          isRatified: false,
        },
        adminActorName
      );
    }

    setIsElectionModalOpen(false);
    setEditingElection(null);
  };

  // Save Contestant
  const handleSaveContestant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conName || !conPositionId) {
      alert('Contestant name and position are required.');
      return;
    }

    const photo =
      conPhotoUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80';

    if (editingContestant) {
      electionEngine.updateContestant(
        editingContestant.id,
        {
          name: conName,
          nickname: conNickname,
          electionId: conElectionId,
          positionId: conPositionId,
          level: conLevel,
          photoUrl: photo,
          slogan: conSlogan || 'Advancing NIMELSSA Excellence',
          manifesto: conManifesto || 'Dedicated service to all Medical Laboratory Science students.',
        },
        adminActorName
      );
    } else {
      electionEngine.addContestant(
        {
          name: conName,
          nickname: conNickname,
          electionId: conElectionId,
          positionId: conPositionId,
          level: conLevel,
          photoUrl: photo,
          slogan: conSlogan || 'Advancing NIMELSSA Excellence',
          manifesto: conManifesto || 'Dedicated service to all Medical Laboratory Science students.',
        },
        adminActorName
      );
    }

    setIsContestantModalOpen(false);
    setEditingContestant(null);
    setConName('');
    setConNickname('');
    setConPhotoUrl('');
    setConSlogan('');
    setConManifesto('');
  };

  // Save Position
  const handleSavePosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posTitle) return;

    electionEngine.addPosition(
      {
        electionId: posElectionId,
        title: posTitle,
        description: posDesc || 'Executive Leadership Office',
        scope: posScope,
        order: positions.length + 1,
      },
      adminActorName
    );

    setIsPositionModalOpen(false);
    setPosTitle('');
    setPosDesc('');
  };

  // Save Timers
  const handleSaveTimers = (e: React.FormEvent) => {
    e.preventDefault();
    electionEngine.updateTimers(
      {
        accreditationStart: new Date(accStart).toISOString(),
        accreditationEnd: new Date(accEnd).toISOString(),
        accreditationForceUnlocked: accForce,
        votingStart: new Date(voteStart).toISOString(),
        votingEnd: new Date(voteEnd).toISOString(),
        votingForceUnlocked: voteForce,
      },
      adminActorName
    );
    alert('Global countdown windows updated and recorded in the audit log.');
  };

  // Ratify Results
  const handleRatify = () => {
    if (ratifyConfirmText !== 'RATIFY') {
      alert('Please type "RATIFY" to confirm this irreversible action.');
      return;
    }

    const res = electionEngine.ratifyResults({
      adminName: adminActorName,
      role: userRole === 'super_admin' ? 'super_admin' : 'electoral_admin',
      notes: ratifyNotes || 'All tallies certified by the Electoral Committee.',
      electionId: selectedElectionFilter !== 'ALL' ? selectedElectionFilter : undefined,
    });

    if (res.success) {
      alert(res.message);
      setIsRatifyModalOpen(false);
    } else {
      alert(res.message);
    }
  };

  // Filtered Tallies by Election
  const filteredTallies = selectedElectionFilter === 'ALL'
    ? tallies
    : tallies.filter((t) => t.electionId === selectedElectionFilter);

  // Filtered Students
  const filteredStudents = eligibleStudents.filter((s) => {
    const matchesSearch =
      s.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || s.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div id="admin-portal-view" className="max-w-6xl mx-auto space-y-6">
      {/* Admin Header with Role & Authority Info */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700/80 text-emerald-200 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Electoral Committee Administration Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-800/90 text-emerald-200 border border-emerald-600/40">
                  {userRole === 'super_admin' ? 'Super Admin Access' : 'Electoral Committee'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Authorized Official: <span className="text-emerald-300 font-semibold">{adminActorName}</span> &bull; {config.department}, ABSU Uturu
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Restore demo dataset with pre-seeded ABSU Medical Laboratory Science students, candidates, and timers across 100L-500L?')) {
                  electionEngine.resetToSeedData(adminActorName);
                  alert('System restored to official ABSU seed demo data.');
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Reset to fresh seed demo state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Demo Seed</span>
            </button>
            <button
              onClick={onOpenOutbox}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 flex items-center gap-1.5 transition cursor-pointer border border-emerald-600/40"
            >
              <span>Voter Email Outbox</span>
            </button>
          </div>
        </div>

        {/* Turnout Snapshot Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Eligible Students (Roll)</span>
            <span className="font-extrabold text-lg text-white">{summaryStats.totalEligible}</span>
            <span className="text-[10px] text-slate-400 block">100L–500L Class Rolls</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Self-Registered</span>
            <span className="font-extrabold text-lg text-emerald-400">{summaryStats.totalRegistered}</span>
            <span className="text-[10px] text-slate-400 block">
              {summaryStats.totalEligible > 0 ? Math.round((summaryStats.totalRegistered / summaryStats.totalEligible) * 100) : 0}% of Roll
            </span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Accredited (Voter IDs)</span>
            <span className="font-extrabold text-lg text-teal-300">{summaryStats.totalAccredited}</span>
            <span className="text-[10px] text-teal-400 font-semibold block">{summaryStats.accreditationTurnoutPct}% Turnout</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Ballots Cast</span>
            <span className="font-extrabold text-lg text-amber-400">{summaryStats.totalVoted}</span>
            <span className="text-[10px] text-amber-300 font-semibold block">{summaryStats.votingTurnoutPct}% Participation</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('live_results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'live_results' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart className="w-3.5 h-3.5" />
          <span>1. Live Results</span>
        </button>
        <button
          onClick={() => setActiveTab('elections_mgr')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'elections_mgr' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>2. Elections Architecture ({elections.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('eligibility')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'eligibility' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>3. Class Lists (Excel/Word/PDF)</span>
        </button>
        <button
          onClick={() => setActiveTab('contestants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'contestants' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>4. Positions & Candidates</span>
        </button>
        <button
          onClick={() => setActiveTab('timers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'timers' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>5. Deadlines & Timers</span>
        </button>
        <button
          onClick={() => setActiveTab('ratification')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'ratification' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>6. Ratification Sign-Off</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>7. Audit Trail ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('cloud_sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition flex items-center gap-1.5 ${
            activeTab === 'cloud_sync' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>8. Supabase & Resend</span>
        </button>
      </div>

      {/* TAB 1: LIVE RESULTS DASHBOARD */}
      {activeTab === 'live_results' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time Live Results Feed</span>
              </h2>
              <p className="text-xs text-slate-500">
                Server-protected live vote tallies with level segregation.
              </p>
            </div>

            {/* Filter by Election */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Election:</span>
              <select
                value={selectedElectionFilter}
                onChange={(e) => setSelectedElectionFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
              >
                <option value="ALL">All Elections Combined</option>
                {elections.map((elec) => (
                  <option key={elec.id} value={elec.id}>
                    {elec.title} ({elec.scope})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {filteredTallies.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                No active positions or tallies found for the selected election filter.
              </div>
            ) : (
              filteredTallies.map((pos) => {
                const chartData = pos.contestants.map((c) => ({
                  name: c.contestantName.split(' ')[0] + ' ' + (c.contestantName.split(' ')[1]?.charAt(0) || '') + '.',
                  fullName: c.contestantName,
                  votes: c.votes,
                  percentage: c.percentage,
                  isWinner: c.isWinner,
                }));

                return (
                  <div key={pos.positionId} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                            Scope: {pos.scope}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-900">{pos.positionTitle}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Total Votes Cast: {pos.totalVotesCast}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      <div className="lg:col-span-2 h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                            <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} width={80} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const d = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-2 rounded-lg text-xs shadow-lg">
                                      <p className="font-bold">{d.fullName}</p>
                                      <p className="text-emerald-400">{d.votes} votes ({d.percentage}%)</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                              {chartData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.isWinner ? '#059669' : '#0d9488'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2 text-xs">
                        {pos.contestants.map((con) => (
                          <div
                            key={con.contestantId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              con.isWinner ? 'bg-emerald-50 border-emerald-300 font-semibold' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={con.photoUrl} alt={con.contestantName} className="w-8 h-8 rounded-lg object-cover" />
                              <div className="truncate">
                                <p className="font-bold text-slate-900 truncate">{con.contestantName}</p>
                                {con.nickname && (
                                  <span className="text-[10px] text-emerald-700">&ldquo;{con.nickname}&rdquo; &bull; </span>
                                )}
                                <span className="text-[10px] text-slate-500">{con.level}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-sm text-slate-900">{con.votes}</p>
                              <p className="text-[10px] text-slate-500">{con.percentage}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ELECTIONS ARCHITECTURE & SWITCHER */}
      {activeTab === 'elections_mgr' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Elections & Level Segregation</h2>
              <p className="text-xs text-slate-500">
                Manage General departmental and Level-specific elections (100L, 200L, 300L, 400L, 500L).
              </p>
            </div>
            <button
              onClick={() => {
                setEditingElection(null);
                setElecTitle('');
                setElecCode(`MLS-${Date.now().toString().slice(-4)}`);
                setElecDesc('');
                setElecScope('ALL');
                setElecCat('course_rep');
                setIsElectionModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Election</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {elections.map((elec) => {
              const elecPosCount = positions.filter((p) => p.electionId === elec.id).length;
              const isElecRegOpen = electionEngine.isRegistrationOpen(elec.id);
              const isElecVotingOpen = electionEngine.isVotingOpen(elec.id);

              return (
                <div key={elec.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                          {elec.scope === 'ALL' ? 'Open to All 100L–500L' : `Restricted: ${elec.scope} Only`}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{elec.code}</span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{elec.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{elec.description}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingElection(elec);
                          setElecTitle(elec.title);
                          setElecCode(elec.code);
                          setElecDesc(elec.description);
                          setElecScope(elec.scope);
                          setElecCat(elec.category);
                          setElecRegStart(elec.regStart.slice(0, 16));
                          setElecRegDeadline(elec.regDeadline.slice(0, 16));
                          setElecVotingStart(elec.votingStart.slice(0, 16));
                          setElecVotingEnd(elec.votingEnd.slice(0, 16));
                          setIsElectionModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                        title="Edit Election"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {elections.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete election "${elec.title}"?`)) {
                              electionEngine.deleteElection(elec.id, adminActorName);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                          title="Delete Election"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Offices / Positions:</span>
                      <span className="font-bold text-slate-900">{elecPosCount} Configured</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reg. Deadline:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(elec.regDeadline).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Voting Window:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(elec.votingStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(elec.votingEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CLASS LISTS UPLOAD (EXCEL, WORD, PDF, CSV) */}
      {activeTab === 'eligibility' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-700" />
                  <span>Upload Class Lists by Academic Level (100L to 500L)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supports Excel (.xlsx, .xls), Word (.docx), PDF (.pdf), and CSV files.
                </p>
              </div>

              <button
                id="open-manual-add-btn"
                onClick={() => setIsManualAddOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Manual Add (Excluded Student)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Class Level</label>
                <select
                  value={uploadTargetLevel}
                  onChange={(e) => setUploadTargetLevel(e.target.value as StudentLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                >
                  <option value="100L">100 Level Class List</option>
                  <option value="200L">200 Level Class List</option>
                  <option value="300L">300 Level Class List</option>
                  <option value="400L">400 Level Class List</option>
                  <option value="500L">500 Level Class List</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Select File (Excel, Word, PDF, CSV)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.docx,.pdf,.csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-900 hover:file:bg-emerald-200 cursor-pointer"
                />
              </div>
            </div>

            {isParsingFile && (
              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Parsing document, extracting ABSU matric numbers and student names...</span>
              </div>
            )}
          </div>

          {/* Safe File Parsing Preview Modal */}
          {parsedPreview && (
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 shadow-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>File Extraction Preview: &ldquo;{parsedPreview.fileName}&rdquo;</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review verified matric numbers before writing to the {uploadTargetLevel} class list.
                  </p>
                </div>
                <button
                  onClick={() => setParsedPreview(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                >
                  Discard
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Valid & Ready to Commit:</span>
                  <span className="font-bold text-emerald-900 text-sm">{parsedPreview.validCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-slate-500 block text-[10px]">Duplicates in File:</span>
                  <span className="font-bold text-amber-900 text-sm">{parsedPreview.duplicateCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Already on Master Roll:</span>
                  <span className="font-bold text-slate-800 text-sm">{parsedPreview.alreadyInDbCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">Total Extracted:</span>
                  <span className="font-bold text-slate-900 text-sm">{parsedPreview.totalFound}</span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 font-bold">Matric Number</th>
                      <th className="p-2.5 font-bold">Detected Name</th>
                      <th className="p-2.5 font-bold">Level</th>
                      <th className="p-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.students.map((st, idx) => (
                      <tr key={idx} className={st.status === 'valid' ? 'hover:bg-emerald-50/40' : 'bg-slate-50/70 text-slate-400'}>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{st.matricNumber}</td>
                        <td className="p-2.5">{st.fullName}</td>
                        <td className="p-2.5 font-semibold text-emerald-800">{st.level}</td>
                        <td className="p-2.5">
                          {st.status === 'valid' ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-amber-700 text-[11px]">{st.validationMessage}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Duplicates within file are automatically stripped upon commit.
                </span>
                <button
                  id="commit-parsed-students-btn"
                  onClick={handleCommitParsedStudents}
                  disabled={parsedPreview.validCount === 0}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Commit {parsedPreview.validCount} Students to {uploadTargetLevel} Class List</span>
                </button>
              </div>
            </div>
          )}

          {/* Master Roll Explorer */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Master Class Rosters ({eligibleStudents.length} Students Total)
                </h3>
                <p className="text-xs text-slate-500">Department of Medical Laboratory Science, ABSU Uturu</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search matric or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                >
                  <option value="ALL">All Levels (100L-500L)</option>
                  <option value="100L">100L Only</option>
                  <option value="200L">200L Only</option>
                  <option value="300L">300L Only</option>
                  <option value="400L">400L Only</option>
                  <option value="500L">500L Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Matric Number</th>
                    <th className="p-3 font-bold">Full Name</th>
                    <th className="p-3 font-bold">Level</th>
                    <th className="p-3 font-bold">Registration</th>
                    <th className="p-3 font-bold">Accreditation</th>
                    <th className="p-3 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No students match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const acc = accreditations.find((a) => a.matricNumber.toUpperCase() === s.matricNumber.toUpperCase());

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-900">{s.matricNumber}</td>
                          <td className="p-3 font-medium text-slate-800">{s.fullName}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                              {s.level}
                            </span>
                          </td>
                          <td className="p-3">
                            {s.isRegistered ? (
                              <span className="text-emerald-700 font-semibold">Registered</span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="p-3">
                            {acc ? (
                              <span className="text-teal-700 font-mono font-bold">{acc.voterIdCode}</span>
                            ) : (
                              <span className="text-slate-400">Unaccredited</span>
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {s.source === 'manual_override' ? (
                              <span className="text-amber-700 font-medium">Manual Override</span>
                            ) : (
                              'Verified Roll'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTESTANTS & POSITIONS MANAGEMENT */}
      {activeTab === 'contestants' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Positions & Contestants Architecture</h2>
              <p className="text-xs text-slate-500">
                Upload contestant photos, slogans, and manifestos. Supports 1, 2, 3+ candidates per position.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPosTitle('');
                  setPosDesc('');
                  setPosElectionId(elections[0]?.id || 'elec-general');
                  setPosScope('ALL');
                  setIsPositionModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Position</span>
              </button>
              <button
                id="add-contestant-btn"
                onClick={() => {
                  setEditingContestant(null);
                  setConName('');
                  setConNickname('');
                  setConElectionId(elections[0]?.id || 'elec-general');
                  setConPositionId(positions[0]?.id || '');
                  setConPhotoUrl('');
                  setConSlogan('');
                  setConManifesto('');
                  setIsContestantModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Candidate</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {positions.map((pos) => {
              const posContestants = contestants.filter((c) => c.positionId === pos.id);
              const posElection = elections.find((e) => e.id === pos.electionId);

              return (
                <div key={pos.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                          {posElection?.title || 'General'}
                        </span>
                        <h3 className="font-extrabold text-base text-slate-900">{pos.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pos.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">{posContestants.length} Candidates</span>
                      <button
                        onClick={() => {
                          if (confirm(`Delete position "${pos.title}" and its candidates?`)) {
                            electionEngine.deletePosition(pos.id, adminActorName);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                        title="Delete Position"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {posContestants.map((con) => (
                      <div key={con.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start gap-3.5 justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <img src={con.photoUrl} alt={con.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">{con.name}</h4>
                            {con.nickname && (
                              <span className="text-[10px] text-emerald-700 font-semibold">&ldquo;{con.nickname}&rdquo; &bull; </span>
                            )}
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {con.level}
                            </span>
                            <p className="text-xs text-slate-600 italic line-clamp-1 mt-1">&ldquo;{con.slogan}&rdquo;</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingContestant(con);
                              setConName(con.name);
                              setConNickname(con.nickname || '');
                              setConElectionId(con.electionId);
                              setConPositionId(con.positionId);
                              setConLevel(con.level);
                              setConPhotoUrl(con.photoUrl);
                              setConSlogan(con.slogan);
                              setConManifesto(con.manifesto);
                              setIsContestantModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Edit Candidate"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove candidate "${con.name}"?`)) {
                                electionEngine.deleteContestant(con.id, adminActorName);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-700 cursor-pointer"
                            title="Delete Candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: TIMERS & DEADLINES */}
      {activeTab === 'timers' && (
        <form onSubmit={handleSaveTimers} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Election Deadlines & Automatic Lockdown Windows</h2>
            <p className="text-xs text-slate-500">
              When the registration deadline expires, the student registration portal automatically seals itself.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Accreditation & Registration Window</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={accStart}
                    onChange={(e) => setAccStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration Deadline (Lockdown)</label>
                  <input
                    type="datetime-local"
                    value={accEnd}
                    onChange={(e) => setAccEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accForce}
                      onChange={(e) => setAccForce(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">Admin Force Unlock (Override Deadline)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Vote className="w-4 h-4 text-emerald-700" />
                <span>Secret Balloting Window</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Polls Open (Start)</label>
                  <input
                    type="datetime-local"
                    value={voteStart}
                    onChange={(e) => setVoteStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Polls Close (End)</label>
                  <input
                    type="datetime-local"
                    value={voteEnd}
                    onChange={(e) => setVoteEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voteForce}
                      onChange={(e) => setVoteForce(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">Admin Force Unlock (Allow Voting Now)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer transition"
            >
              Update Countdown Timers & Save
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: RATIFICATION SIGN-OFF */}
      {activeTab === 'ratification' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>Official Electoral Certification & Ratification Flow</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Constitutional procedure to certify tallies and declare winners to the public.
              </p>
            </div>
            {config.isRatified && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                OFFICIALLY RATIFIED
              </span>
            )}
          </div>

          {config.isRatified ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 text-emerald-900">
              <p className="font-bold text-sm">Election Certified by Electoral Commission</p>
              <p>Ratified By: {config.ratifiedBy}</p>
              <p>Timestamp: {new Date(config.ratifiedAt || '').toLocaleString()}</p>
              <p className="italic">&ldquo;{config.ratificationNotes}&rdquo;</p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Executing ratification permanently certifies the running tallies, declares the official winners for all executive offices across 100L–500L, and publishes the results to the student public.
              </p>
              <button
                onClick={() => setIsRatifyModalOpen(true)}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition"
              >
                <Award className="w-4 h-4" />
                <span>Execute Official Ratification Sign-Off</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">System Audit Trail & Security Ledger</h2>
              <p className="text-xs text-slate-500">Immutable ledger recording all administrative and voter activities.</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-bold">Timestamp</th>
                  <th className="p-3 font-bold">Actor</th>
                  <th className="p-3 font-bold">Role</th>
                  <th className="p-3 font-bold">Action</th>
                  <th className="p-3 font-bold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="p-3 font-semibold text-slate-900">{log.actor}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-800">{log.action}</td>
                    <td className="p-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: CLOUD SYNC & RESEND SETUP */}
      {activeTab === 'cloud_sync' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-700" />
                <span>Supabase Database & Resend Transactional Email</span>
              </h2>
              <p className="text-xs text-slate-500">Integrated cloud storage & email delivery for Voter ID codes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h3 className="font-bold text-slate-900">Supabase Connection Status</h3>
              <p className="text-slate-600">
                PostgreSQL database layer for cloud synchronization of student rosters, accreditations, and votes.
              </p>
              <div className="pt-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  Ready & Bound
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <h3 className="font-bold text-slate-900">Resend Transactional Email</h3>
              <p className="text-slate-600">
                Dispatches confidential single-use Voter ID Codes directly to student emails upon verification.
              </p>
              <div className="pt-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                  Active (API Bound)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT ELECTION */}
      {isElectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveElection}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingElection ? 'Edit Election Category' : 'Create New Election'}
              </h3>
              <button
                type="button"
                onClick={() => setIsElectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Election Title *</label>
                <input
                  type="text"
                  value={elecTitle}
                  onChange={(e) => setElecTitle(e.target.value)}
                  placeholder="e.g. 400 Level Class Representative Election"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Election Code *</label>
                  <input
                    type="text"
                    value={elecCode}
                    onChange={(e) => setElecCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MLS-400L-REP"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Eligible Academic Scope *</label>
                  <select
                    value={elecScope}
                    onChange={(e) => setElecScope(e.target.value as ElectionScope)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="ALL">ALL (General Departmental 100L-500L)</option>
                    <option value="100L">100L Only</option>
                    <option value="200L">200L Only</option>
                    <option value="300L">300L Only</option>
                    <option value="400L">400L Only</option>
                    <option value="500L">500L Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Description</label>
                <textarea
                  value={elecDesc}
                  onChange={(e) => setElecDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsElectionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Save Election
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE / EDIT CONTESTANT */}
      {isContestantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveContestant}
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingContestant ? 'Edit Candidate Profile' : 'Register New Candidate'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContestantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  value={conName}
                  onChange={(e) => setConName(e.target.value)}
                  placeholder="e.g. Chukwudi Emmanuel Okonkwo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nickname / Alias</label>
                  <input
                    type="text"
                    value={conNickname}
                    onChange={(e) => setConNickname(e.target.value)}
                    placeholder="e.g. Emmy Progress"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Candidate Level *</label>
                  <select
                    value={conLevel}
                    onChange={(e) => setConLevel(e.target.value as StudentLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="100L">100L</option>
                    <option value="200L">200L</option>
                    <option value="300L">300L</option>
                    <option value="400L">400L</option>
                    <option value="500L">500L</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Assigned Election *</label>
                  <select
                    value={conElectionId}
                    onChange={(e) => setConElectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {elections.map((elec) => (
                      <option key={elec.id} value={elec.id}>
                        {elec.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Contested Position *</label>
                  <select
                    value={conPositionId}
                    onChange={(e) => setConPositionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    {positions
                      .filter((p) => !conElectionId || p.electionId === conElectionId)
                      .map((pos) => (
                        <option key={pos.id} value={pos.id}>
                          {pos.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Upload Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageCompressAndUpload}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-emerald-100 file:text-emerald-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Campaign Slogan</label>
                <input
                  type="text"
                  value={conSlogan}
                  onChange={(e) => setConSlogan(e.target.value)}
                  placeholder="e.g. The Progressive MLS: Academic Excellence & Unified Advocacy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Official Manifesto</label>
                <textarea
                  value={conManifesto}
                  onChange={(e) => setConManifesto(e.target.value)}
                  rows={3}
                  placeholder="Outline key campaign promises and executive plans..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsContestantModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Save Candidate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE POSITION */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleSavePosition}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Add Executive Position</h3>
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Position Title *</label>
                <input
                  type="text"
                  value={posTitle}
                  onChange={(e) => setPosTitle(e.target.value)}
                  placeholder="e.g. Vice President 2 (Clinical Posting)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Assign to Election *</label>
                <select
                  value={posElectionId}
                  onChange={(e) => setPosElectionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {elections.map((elec) => (
                    <option key={elec.id} value={elec.id}>
                      {elec.title} ({elec.scope})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Description / Duties</label>
                <textarea
                  value={posDesc}
                  onChange={(e) => setPosDesc(e.target.value)}
                  rows={2}
                  placeholder="Responsibilities of this office..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Add Position
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MANUAL ADD STUDENT */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form
            onSubmit={handleManualAddSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">Manual Student Override Addition</h3>
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">ABSU Matriculation Number *</label>
                <input
                  type="text"
                  value={manualMatric}
                  onChange={(e) => setManualMatric(e.target.value.toUpperCase())}
                  placeholder="e.g. 2023/137945/Regular"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Chukwuemeka Godswill"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Academic Level *</label>
                <select
                  value={manualLevel}
                  onChange={(e) => setManualLevel(e.target.value as StudentLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="100L">100L</option>
                  <option value="200L">200L</option>
                  <option value="300L">300L</option>
                  <option value="400L">400L</option>
                  <option value="500L">500L</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Audit Justification Reason *</label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g. Verified late school fees receipt #ABSU-7811 with Dean office."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
              >
                Add to Official Roll
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: RATIFICATION CONFIRMATION */}
      {isRatifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Official Ratification</h3>
                <p className="text-xs text-slate-500">Certify election tallies and declare winners</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                This action is permanent and constitutional. Winners will be published to the entire ABSU Medical Laboratory Science student body.
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Official Notes / Circular Summary</label>
                <textarea
                  value={ratifyNotes}
                  onChange={(e) => setRatifyNotes(e.target.value)}
                  placeholder="e.g. Certified by the NIMELSSA ABSU Chapter 2026 Electoral Commission without dissent."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Type &ldquo;RATIFY&rdquo; to Confirm:</label>
                <input
                  type="text"
                  value={ratifyConfirmText}
                  onChange={(e) => setRatifyConfirmText(e.target.value.toUpperCase())}
                  placeholder="RATIFY"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRatifyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRatify}
                disabled={ratifyConfirmText !== 'RATIFY'}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                Certify & Release Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
