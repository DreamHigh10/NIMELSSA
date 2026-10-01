export type StudentLevel = '100L' | '200L' | '300L' | '400L' | '500L';
export type ElectionScope = 'ALL' | '100L' | '200L' | '300L' | '400L' | '500L';
export type ElectionCategory = 'general' | 'course_rep' | 'nhar' | 'faculty';

export type UserRole = 'student' | 'electoral_admin' | 'super_admin';

export interface StudentEligibility {
  id: string;
  matricNumber: string; // e.g. "2023/137945/Regular"
  fullName: string;
  level: StudentLevel;
  department?: string;
  isRegistered: boolean;
  registeredAt?: string;
  registeredElections?: string[]; // Election IDs registered for
  phone?: string;
  email?: string;
  source: 'bulk_upload' | 'manual_override';
  addedBy?: string;
  addedAt: string;
}

export interface AccreditationRecord {
  id: string;
  matricNumber: string;
  studentName: string;
  level: StudentLevel;
  voterIdCode: string; // Cryptographically random, single-use, e.g. "MLS-8B31"
  accreditedAt: string;
  emailDelivered: boolean;
  hasVoted: boolean;
  votedElections?: string[]; // Election IDs voted in
  votedAt?: string;
  phone?: string;
  email?: string;
}

export interface ElectionItem {
  id: string;
  title: string;
  code: string; // e.g. "NIMELSSA-GEN-2026", "MLS-400L-REP"
  description: string;
  scope: ElectionScope; // 'ALL' = General Election for 100L-500L, or specific level
  category: ElectionCategory;
  session: string;
  regStart: string;    // ISO string
  regDeadline: string; // ISO string - registration locks automatically after this
  regForceUnlocked?: boolean;
  votingStart: string; // ISO string
  votingEnd: string;   // ISO string
  votingForceUnlocked?: boolean;
  isRatified: boolean;
  ratifiedBy?: string | null;
  ratifiedAt?: string | null;
  ratificationNotes?: string | null;
}

export interface Position {
  id: string;
  electionId: string; // Which election this position belongs to
  title: string;
  description: string;
  scope: ElectionScope; // 'ALL' for general or '100L'-'500L'
  order: number;
  maxSelections?: number; // default 1
}

export interface Contestant {
  id: string;
  electionId: string;
  positionId: string;
  name: string;
  nickname?: string;
  level: StudentLevel;
  photoUrl: string;
  slogan: string;
  manifesto: string;
}

export interface VoteRecord {
  id: string;
  electionId: string;
  voterIdCode: string;
  positionId: string;
  contestantId: string;
  timestamp: string;
  ballotHash?: string;
}

export interface ElectionConfig {
  chapterName: string;
  institution: string;
  department: string;
  session: string;
  activeElectionId: string; // Default selected election
  accreditationStart: string; // ISO string
  accreditationEnd: string;   // ISO string
  accreditationForceUnlocked: boolean;
  votingStart: string;        // ISO string
  votingEnd: string;          // ISO string
  votingForceUnlocked: boolean;
  isRatified: boolean;
  ratifiedBy: string | null;
  ratifiedAt: string | null;
  ratificationNotes: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: 'super_admin' | 'electoral_admin' | 'student' | 'system';
  action: string;
  details: string;
}

export interface VoteTally {
  electionId: string;
  positionId: string;
  positionTitle: string;
  scope: ElectionScope;
  totalVotesCast: number;
  contestants: {
    contestantId: string;
    contestantName: string;
    nickname?: string;
    level: StudentLevel;
    photoUrl: string;
    slogan: string;
    votes: number;
    percentage: number;
    isWinner?: boolean;
  }[];
}

export interface ElectionSummaryStats {
  totalEligible: number;
  totalRegistered: number;
  totalAccredited: number;
  totalVoted: number;
  accreditationTurnoutPct: number;
  votingTurnoutPct: number;
  levelBreakdown: Record<StudentLevel, {
    eligible: number;
    registered: number;
    accredited: number;
    voted: number;
  }>;
}
