import {
  StudentEligibility,
  AccreditationRecord,
  ElectionItem,
  Position,
  Contestant,
  VoteRecord,
  ElectionConfig,
  AuditLogEntry,
  VoteTally,
  ElectionSummaryStats,
  StudentLevel,
  ElectionScope,
  UserRole,
} from '../types/election';
import {
  INITIAL_ELECTIONS,
  INITIAL_ELECTION_CONFIG,
  INITIAL_POSITIONS,
  INITIAL_CONTESTANTS,
  INITIAL_MASTER_STUDENTS,
  INITIAL_AUDIT_LOGS,
} from '../data/seedData';
import { SupabaseElectionService } from './supabaseElectionService';

const STORAGE_KEYS = {
  ELECTIONS: 'nimelssa_elections_v2',
  CONFIG: 'nimelssa_election_config_v2',
  ELIGIBILITY: 'nimelssa_eligibility_v3',
  ACCREDITATIONS: 'nimelssa_accreditations_v3',
  POSITIONS: 'nimelssa_positions_v2',
  CONTESTANTS: 'nimelssa_contestants_v2',
  VOTES: 'nimelssa_votes_v2',
  AUDIT_LOGS: 'nimelssa_audit_logs_v2',
  OUTBOX_EMAILS: 'nimelssa_outbox_emails_v2',
};

// Normalize ABSU matric number to standard "2023/137945/Regular"
export function normalizeMatricNumber(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/\s+/g, '');
  cleaned = cleaned.replace(/-/g, '/');
  // If user typed e.g. 2023/137945/regular or 2023/137945/REGULAR -> Title Case Regular
  cleaned = cleaned.replace(/\/regular$/i, '/Regular');
  return cleaned;
}

export interface OutboxEmail {
  id: string;
  recipientEmail: string;
  recipientName: string;
  matricNumber: string;
  voterIdCode: string;
  timestamp: string;
  subject: string;
  body: string;
}

// Generate cryptographically secure random alphanumeric code for Voter ID (e.g. MLS-8B31)
export function generateVoterIdCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no ambiguous 0/O, 1/I
  const randomValues = new Uint8Array(4);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < 4; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return `MLS-${code}`;
}

class ElectionEngine {
  private elections: ElectionItem[] = [];
  private config: ElectionConfig;
  private eligibility: Map<string, StudentEligibility> = new Map(); // key: clean matricNumber
  private accreditations: Map<string, AccreditationRecord> = new Map(); // key: voterIdCode
  private matricToVoterId: Map<string, string> = new Map(); // key: matric -> voterId
  private positions: Position[] = [];
  private contestants: Contestant[] = [];
  private votes: VoteRecord[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private outboxEmails: OutboxEmail[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.config = INITIAL_ELECTION_CONFIG;
    this.elections = [...INITIAL_ELECTIONS];
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const storedElections = localStorage.getItem(STORAGE_KEYS.ELECTIONS);
      this.elections = storedElections ? JSON.parse(storedElections) : [...INITIAL_ELECTIONS];

      const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      this.config = storedConfig ? JSON.parse(storedConfig) : { ...INITIAL_ELECTION_CONFIG };

      const storedElig = localStorage.getItem(STORAGE_KEYS.ELIGIBILITY);
      const eligList: StudentEligibility[] = storedElig ? JSON.parse(storedElig) : [...INITIAL_MASTER_STUDENTS];
      this.eligibility.clear();
      for (const s of eligList) {
        this.eligibility.set(s.matricNumber.toUpperCase(), s);
      }

      const storedAcc = localStorage.getItem(STORAGE_KEYS.ACCREDITATIONS);
      const accList: AccreditationRecord[] = storedAcc ? JSON.parse(storedAcc) : [];
      this.accreditations.clear();
      this.matricToVoterId.clear();
      for (const a of accList) {
        this.accreditations.set(a.voterIdCode, a);
        this.matricToVoterId.set(a.matricNumber.toUpperCase(), a.voterIdCode);
      }

      const storedPos = localStorage.getItem(STORAGE_KEYS.POSITIONS);
      this.positions = storedPos ? JSON.parse(storedPos) : [...INITIAL_POSITIONS];

      const storedCon = localStorage.getItem(STORAGE_KEYS.CONTESTANTS);
      this.contestants = storedCon ? JSON.parse(storedCon) : [...INITIAL_CONTESTANTS];

      const storedVotes = localStorage.getItem(STORAGE_KEYS.VOTES);
      this.votes = storedVotes ? JSON.parse(storedVotes) : [];

      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_AUDIT_LOGS];

      const storedEmails = localStorage.getItem(STORAGE_KEYS.OUTBOX_EMAILS);
      this.outboxEmails = storedEmails ? JSON.parse(storedEmails) : [];

      if (this.accreditations.size === 0) {
        this.seedSampleAccreditations();
      }
    } catch (e) {
      console.error('Failed to load election data from localStorage:', e);
      this.config = { ...INITIAL_ELECTION_CONFIG };
      this.elections = [...INITIAL_ELECTIONS];
      this.positions = [...INITIAL_POSITIONS];
      this.contestants = [...INITIAL_CONTESTANTS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
    }
  }

  private seedSampleAccreditations() {
    const registered = Array.from(this.eligibility.values()).filter((s) => s.isRegistered).slice(0, 6);
    for (const student of registered) {
      const voterId = generateVoterIdCode();
      const rec: AccreditationRecord = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matricNumber: student.matricNumber,
        studentName: student.fullName,
        level: student.level,
        voterIdCode: voterId,
        accreditedAt: new Date(Date.now() - 3600000).toISOString(),
        emailDelivered: true,
        hasVoted: false,
        votedElections: [],
        phone: student.phone,
        email: student.email,
      };
      this.accreditations.set(voterId, rec);
      this.matricToVoterId.set(student.matricNumber.toUpperCase(), voterId);
    }
    this.saveAccreditations();
  }

  private saveElections() {
    localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(this.elections));
    this.notify();
  }

  private saveConfig() {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    this.notify();
  }

  private saveEligibility() {
    localStorage.setItem(STORAGE_KEYS.ELIGIBILITY, JSON.stringify(Array.from(this.eligibility.values())));
    this.notify();
  }

  private saveAccreditations() {
    localStorage.setItem(STORAGE_KEYS.ACCREDITATIONS, JSON.stringify(Array.from(this.accreditations.values())));
    this.notify();
  }

  private savePositions() {
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(this.positions));
    this.notify();
  }

  private saveContestants() {
    localStorage.setItem(STORAGE_KEYS.CONTESTANTS, JSON.stringify(this.contestants));
    this.notify();
  }

  private saveVotes() {
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(this.votes));
    this.notify();
  }

  private saveAuditLogs() {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
    this.notify();
  }

  private saveOutboxEmails() {
    localStorage.setItem(STORAGE_KEYS.OUTBOX_EMAILS, JSON.stringify(this.outboxEmails));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Audit Logging ---
  public logAction(
    actor: string,
    role: 'super_admin' | 'electoral_admin' | 'student' | 'system',
    action: string,
    details: string
  ) {
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      role,
      action,
      details,
    };
    this.auditLogs.unshift(entry);
    this.saveAuditLogs();
  }

  // --- Elections Management ---
  public getElections(): ElectionItem[] {
    return [...this.elections];
  }

  public getElectionById(id: string): ElectionItem | undefined {
    return this.elections.find((e) => e.id === id);
  }

  public addElection(election: Omit<ElectionItem, 'id'>, adminName: string): ElectionItem {
    const newElec: ElectionItem = {
      ...election,
      id: `elec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.elections.push(newElec);
    this.saveElections();
    this.logAction(adminName, 'electoral_admin', 'CREATE_ELECTION', `Created election: ${newElec.title} (${newElec.scope})`);
    return newElec;
  }

  public updateElection(id: string, updates: Partial<ElectionItem>, adminName: string) {
    this.elections = this.elections.map((e) => (e.id === id ? { ...e, ...updates } : e));
    this.saveElections();
    this.logAction(adminName, 'electoral_admin', 'UPDATE_ELECTION', `Updated configuration for election ${id}`);
  }

  public deleteElection(id: string, adminName: string) {
    const elec = this.elections.find((e) => e.id === id);
    this.elections = this.elections.filter((e) => e.id !== id);
    this.positions = this.positions.filter((p) => p.electionId !== id);
    this.contestants = this.contestants.filter((c) => c.electionId !== id);
    this.saveElections();
    this.savePositions();
    this.saveContestants();
    this.logAction(adminName, 'electoral_admin', 'DELETE_ELECTION', `Deleted election: ${elec?.title || id}`);
  }

  // Check if a student level is eligible for an election
  public isStudentEligibleForElection(studentLevel: StudentLevel, electionScope: ElectionScope): boolean {
    if (electionScope === 'ALL') return true;
    return studentLevel === electionScope;
  }

  // Get all elections a student is eligible for based on their academic level
  public getEligibleElectionsForStudent(studentLevel: StudentLevel): ElectionItem[] {
    return this.elections.filter((e) => this.isStudentEligibleForElection(studentLevel, e.scope));
  }

  // Registration Deadline Check per election or globally
  public isRegistrationOpen(electionId?: string): boolean {
    if (electionId) {
      const elec = this.getElectionById(electionId);
      if (elec) {
        if (elec.regForceUnlocked) return true;
        const now = Date.now();
        const start = new Date(elec.regStart).getTime();
        const deadline = new Date(elec.regDeadline).getTime();
        return now >= start && now <= deadline;
      }
    }
    if (this.config.accreditationForceUnlocked) return true;
    const now = Date.now();
    const end = new Date(this.config.accreditationEnd).getTime();
    return now <= end;
  }

  // Voting Window Check per election or globally
  public isVotingOpen(electionId?: string): boolean {
    if (electionId) {
      const elec = this.getElectionById(electionId);
      if (elec) {
        if (elec.votingForceUnlocked) return true;
        const now = Date.now();
        const start = new Date(elec.votingStart).getTime();
        const end = new Date(elec.votingEnd).getTime();
        return now >= start && now <= end;
      }
    }
    if (this.config.votingForceUnlocked) return true;
    const now = Date.now();
    const start = new Date(this.config.votingStart).getTime();
    const end = new Date(this.config.votingEnd).getTime();
    return now >= start && now <= end;
  }

  // --- Election Configuration & Timing ---
  public getConfig(): ElectionConfig {
    return { ...this.config };
  }

  public updateTimers(
    updates: Partial<Pick<ElectionConfig, 'accreditationStart' | 'accreditationEnd' | 'accreditationForceUnlocked' | 'votingStart' | 'votingEnd' | 'votingForceUnlocked'>>,
    adminName: string
  ) {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.logAction(
      adminName,
      'electoral_admin',
      'TIMER_UPDATE',
      `Election windows updated: Accreditation [${this.config.accreditationStart} to ${this.config.accreditationEnd}], Voting [${this.config.votingStart} to ${this.config.votingEnd}]`
    );
  }

  public isAccreditationOpen(): boolean {
    return this.isRegistrationOpen();
  }

  // --- Student Registration & Instant Search ---
  public getEligibilityRecord(matricNumber: string): StudentEligibility | undefined {
    if (!matricNumber) return undefined;
    const norm = normalizeMatricNumber(matricNumber).toUpperCase();
    
    // 1. Direct lookup
    if (this.eligibility.has(norm)) {
      return this.eligibility.get(norm);
    }

    // 2. If student typed e.g. "2023/137945" without "/Regular"
    if (!norm.includes('/REGULAR')) {
      const withRegular = `${norm}/REGULAR`;
      if (this.eligibility.has(withRegular)) {
        return this.eligibility.get(withRegular);
      }
    }

    // 3. Fallback scan across all values for case-insensitive match
    for (const [key, student] of this.eligibility.entries()) {
      if (
        key === norm ||
        key === `${norm}/REGULAR` ||
        key.replace('/REGULAR', '') === norm ||
        student.matricNumber.toUpperCase() === norm ||
        student.matricNumber.toUpperCase() === `${norm}/REGULAR`
      ) {
        return student;
      }
    }

    return undefined;
  }

  // Lookup student and return full status info
  public lookupStudent(matricNumber: string): {
    found: boolean;
    student?: StudentEligibility;
    eligibleElections?: ElectionItem[];
    accreditation?: AccreditationRecord;
    isAccredited?: boolean;
    hasVoted?: boolean;
    message?: string;
  } {
    const student = this.getEligibilityRecord(matricNumber);
    if (!student) {
      return {
        found: false,
        message: `Matriculation number "${matricNumber}" was not found in the verified ABSU Medical Laboratory Science class lists. Please verify your format (e.g. 2023/137945/Regular) or contact the Electoral Committee.`,
      };
    }

    const cleanMatric = student.matricNumber.toUpperCase();
    const voterId = this.matricToVoterId.get(cleanMatric);
    const accreditation = voterId ? this.accreditations.get(voterId) : undefined;
    const eligibleElections = this.getEligibleElectionsForStudent(student.level);

    return {
      found: true,
      student,
      eligibleElections,
      accreditation,
      isAccredited: !!accreditation,
      hasVoted: accreditation?.hasVoted || false,
    };
  }

  public getAllEligibleStudents(): StudentEligibility[] {
    return Array.from(this.eligibility.values());
  }

  public registerStudent(params: {
    matricNumber: string;
    fullName: string;
    level: StudentLevel;
    phone: string;
    email: string;
  }): { success: boolean; message: string; student?: StudentEligibility } {
    const existing = this.getEligibilityRecord(params.matricNumber);

    if (!existing) {
      return {
        success: false,
        message: 'Matric number not found in official master roll — please contact the electoral committee.',
      };
    }

    // Check registration deadline
    if (!this.isRegistrationOpen()) {
      return {
        success: false,
        message: 'Registration deadline has closed for the upcoming election. Self-registration is locked.',
      };
    }

    if (existing.isRegistered) {
      return {
        success: false,
        message: `Student with matric number ${existing.matricNumber} is already registered. Please proceed to obtain your Voter ID / Accreditation.`,
      };
    }

    if (existing.level !== params.level) {
      return {
        success: false,
        message: `Level mismatch: Official class roll records ${existing.level}, but you selected ${params.level}. Please verify with the committee.`,
      };
    }

    existing.isRegistered = true;
    existing.registeredAt = new Date().toISOString();
    existing.phone = params.phone.trim();
    existing.email = params.email.trim().toLowerCase();

    const canonicalMatric = existing.matricNumber.trim().toUpperCase();
    this.eligibility.set(canonicalMatric, existing);
    this.saveEligibility();

    this.logAction(
      `${existing.fullName} (${existing.matricNumber})`,
      'student',
      'STUDENT_REGISTERED',
      `Registered successfully for ${existing.level} elections. Contact: ${existing.email} / ${existing.phone}`
    );

    return {
      success: true,
      message: 'Registration verified and completed! You may now proceed to obtain your Voter Identification Code.',
      student: existing,
    };
  }

  // Bulk add students from parsed file
  public commitParsedStudents(
    students: { matricNumber: string; fullName: string; level: StudentLevel; department?: string; phone?: string; email?: string }[],
    adminName: string
  ): { addedCount: number; duplicateCount: number } {
    let addedCount = 0;
    let duplicateCount = 0;

    for (const item of students) {
      const cleanMatric = item.matricNumber.trim().toUpperCase();
      if (this.eligibility.has(cleanMatric)) {
        duplicateCount++;
      } else {
        const newRecord: StudentEligibility = {
          id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          matricNumber: cleanMatric.replace(/\/REGULAR$/, '/Regular'),
          fullName: item.fullName,
          level: item.level,
          department: item.department || 'Medical Laboratory Science',
          phone: item.phone,
          email: item.email,
          isRegistered: false,
          source: 'bulk_upload',
          addedBy: adminName,
          addedAt: new Date().toISOString(),
        };
        this.eligibility.set(cleanMatric, newRecord);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveEligibility();
      this.logAction(
        adminName,
        'electoral_admin',
        'UPLOAD_MATRIC_LIST',
        `Committed ${addedCount} student records to the verified master class roll (${duplicateCount} existing duplicates skipped).`
      );
    }

    return { addedCount, duplicateCount };
  }

  // Manual Add for excluded student
  public manualAddStudent(params: {
    matricNumber: string;
    fullName: string;
    level: StudentLevel;
    department?: string;
    adminName: string;
    reason: string;
  }): { success: boolean; message: string; record?: StudentEligibility } {
    const cleanMatric = params.matricNumber.trim().toUpperCase();

    if (this.eligibility.has(cleanMatric)) {
      return {
        success: false,
        message: `Matric number ${cleanMatric} already exists in the eligibility roll.`,
      };
    }

    const record: StudentEligibility = {
      id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      matricNumber: cleanMatric.replace(/\/REGULAR$/, '/Regular'),
      fullName: params.fullName.trim(),
      level: params.level,
      department: params.department || 'Medical Laboratory Science',
      isRegistered: false,
      source: 'manual_override',
      addedBy: params.adminName,
      addedAt: new Date().toISOString(),
    };

    this.eligibility.set(cleanMatric, record);
    this.saveEligibility();

    this.logAction(
      params.adminName,
      'electoral_admin',
      'MANUAL_STUDENT_ADD',
      `Manual eligibility override granted to ${params.fullName} (${cleanMatric}) [${params.level}]. Reason: ${params.reason}`
    );

    return {
      success: true,
      message: `Student ${params.fullName} successfully added to master eligibility roll.`,
      record,
    };
  }

  // --- Voter Accreditation & Token Issuance ---
  public accreditVoter(params: {
    matricNumber: string;
    confirmPhoneOrEmail?: string;
  }): {
    success: boolean;
    message: string;
    record?: AccreditationRecord;
    isExisting?: boolean;
  } {
    if (!this.isAccreditationOpen()) {
      return {
        success: false,
        message: 'Accreditation portal is currently closed. Accreditation cannot be processed at this time.',
      };
    }

    const student = this.getEligibilityRecord(params.matricNumber);

    if (!student) {
      return {
        success: false,
        message: 'Matric number not found in master eligibility roll. Contact the electoral committee.',
      };
    }

    const cleanMatric = student.matricNumber.trim().toUpperCase();

    if (!student.isRegistered) {
      return {
        success: false,
        message: 'Student has not completed initial registration. Please register your details first.',
      };
    }

    // Check if already accredited
    const existingVoterId = this.matricToVoterId.get(cleanMatric);
    if (existingVoterId) {
      const existingRecord = this.accreditations.get(existingVoterId);
      if (existingRecord) {
        return {
          success: true,
          message: 'You are already accredited! Here is your official Voter ID Code.',
          record: existingRecord,
          isExisting: true,
        };
      }
    }

    // Issue new single-use Voter ID Code
    const voterIdCode = generateVoterIdCode();
    const accreditationRecord: AccreditationRecord = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      matricNumber: student.matricNumber,
      studentName: student.fullName,
      level: student.level,
      voterIdCode,
      accreditedAt: new Date().toISOString(),
      emailDelivered: true,
      hasVoted: false,
      votedElections: [],
      phone: student.phone,
      email: student.email,
    };

    this.accreditations.set(voterIdCode, accreditationRecord);
    this.matricToVoterId.set(cleanMatric, voterIdCode);
    this.saveAccreditations();

    const emailNotice: OutboxEmail = {
      id: `eml-${Date.now()}`,
      recipientEmail: student.email || 'student@absu.edu.ng',
      recipientName: student.fullName,
      matricNumber: student.matricNumber,
      voterIdCode,
      timestamp: new Date().toISOString(),
      subject: `OFFICIAL NIMELSSA ABSU VOTER IDENTIFICATION CODE — ${voterIdCode}`,
      body: `Dear ${student.fullName} (${student.matricNumber}),\n\nYou have been successfully accredited for the NIMELSSA ABSU Elections 2026/2027 (${student.level}).\n\nYOUR OFFICIAL VOTER ID CODE:\n>>> ${voterIdCode} <<<\n\nCRITICAL INSTRUCTIONS:\n1. Keep this code confidential. It unlocks your secret electronic ballot.\n2. In accordance with strict level restrictions, you are authorized to vote in the General Departmental Election and your ${student.level} Class Election.\n3. Login to the voting booth with this Voter ID Code when voting opens.\n\nElectoral Commission, NIMELSSA ABSU Chapter`,
    };
    this.outboxEmails.unshift(emailNotice);
    this.saveOutboxEmails();

    if (student.email) {
      fetch('/api/send-voter-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: student.email,
          recipientName: student.fullName,
          matricNumber: student.matricNumber,
          voterIdCode,
          level: student.level,
        }),
      }).catch((err) => console.warn('[Resend API notice]', err));
    }

    SupabaseElectionService.recordAccreditation(accreditationRecord).catch((err) =>
      console.warn('[Supabase accreditation sync notice]', err)
    );

    this.logAction(
      `${student.fullName} (${student.matricNumber})`,
      'student',
      'VOTER_ACCREDITED',
      `Accredited for ${student.level}. Voter ID Code issued: ${voterIdCode.slice(0, 7)}***`
    );

    return {
      success: true,
      message: 'Accreditation verified! Your official single-use Voter Identification Code has been issued.',
      record: accreditationRecord,
      isExisting: false,
    };
  }

  public getAccreditationByVoterId(voterIdCode: string): AccreditationRecord | undefined {
    return this.accreditations.get(voterIdCode.trim().toUpperCase());
  }

  public getAllAccreditations(): AccreditationRecord[] {
    return Array.from(this.accreditations.values());
  }

  public getOutboxEmails(): OutboxEmail[] {
    return [...this.outboxEmails];
  }

  // --- Positions & Contestants Management ---
  public getPositions(electionId?: string): Position[] {
    let list = [...this.positions];
    if (electionId) {
      list = list.filter((p) => p.electionId === electionId);
    }
    return list.sort((a, b) => a.order - b.order);
  }

  public getPositionsForStudent(studentLevel: StudentLevel, electionId?: string): Position[] {
    let list = this.getPositions(electionId);
    return list.filter((p) => p.scope === 'ALL' || p.scope === studentLevel);
  }

  public getContestants(electionId?: string): Contestant[] {
    let list = [...this.contestants];
    if (electionId) {
      list = list.filter((c) => c.electionId === electionId);
    }
    return list;
  }

  public addPosition(position: Omit<Position, 'id'>, adminName: string): Position {
    const newPos: Position = {
      ...position,
      id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.positions.push(newPos);
    this.savePositions();
    this.logAction(adminName, 'electoral_admin', 'CREATE_POSITION', `Created position: ${newPos.title} (Scope: ${newPos.scope})`);
    return newPos;
  }

  public updatePosition(id: string, updates: Partial<Position>, adminName: string) {
    this.positions = this.positions.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.savePositions();
    this.logAction(adminName, 'electoral_admin', 'UPDATE_POSITION', `Updated position ${id}`);
  }

  public deletePosition(id: string, adminName: string) {
    const pos = this.positions.find((p) => p.id === id);
    this.positions = this.positions.filter((p) => p.id !== id);
    this.contestants = this.contestants.filter((c) => c.positionId !== id);
    this.savePositions();
    this.saveContestants();
    this.logAction(adminName, 'electoral_admin', 'DELETE_POSITION', `Removed position: ${pos?.title || id}`);
  }

  public addContestant(contestant: Omit<Contestant, 'id'>, adminName: string): Contestant {
    const newCon: Contestant = {
      ...contestant,
      id: `can-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.contestants.push(newCon);
    this.saveContestants();
    this.logAction(
      adminName,
      'electoral_admin',
      'ADD_CONTESTANT',
      `Added candidate: ${newCon.name} (${newCon.level}) for position ${newCon.positionId}`
    );
    return newCon;
  }

  public updateContestant(id: string, updates: Partial<Contestant>, adminName: string) {
    this.contestants = this.contestants.map((c) => (c.id === id ? { ...c, ...updates } : c));
    this.saveContestants();
    this.logAction(adminName, 'electoral_admin', 'UPDATE_CONTESTANT', `Updated candidate ${id}`);
  }

  public deleteContestant(id: string, adminName: string) {
    const con = this.contestants.find((c) => c.id === id);
    this.contestants = this.contestants.filter((c) => c.id !== id);
    this.saveContestants();
    this.logAction(adminName, 'electoral_admin', 'DELETE_CONTESTANT', `Removed candidate ${con?.name || id}`);
  }

  // --- Strict Level-Governed Ballot Submission ---
  public submitBallot(params: {
    voterIdCode: string;
    electionId: string;
    selections: Record<string, string>; // positionId -> contestantId
  }): {
    success: boolean;
    message: string;
    ballotReceipt?: {
      voterIdCode: string;
      electionTitle: string;
      timestamp: string;
      positionsVoted: number;
      ballotHash: string;
    };
  } {
    const cleanCode = params.voterIdCode.trim().toUpperCase();
    const accreditation = this.accreditations.get(cleanCode);

    if (!accreditation) {
      return {
        success: false,
        message: 'Invalid Voter Identification Code. You must be accredited to vote.',
      };
    }

    const election = this.getElectionById(params.electionId) || this.elections[0];

    // 1. Strict Window Check
    if (!this.isVotingOpen(election.id)) {
      return {
        success: false,
        message: `Voting window is currently closed for ${election.title}.`,
      };
    }

    // 2. Strict Level Restriction Rule Check
    // "200 level people should not be able to vote for 100 level course rep election"
    if (!this.isStudentEligibleForElection(accreditation.level, election.scope)) {
      return {
        success: false,
        message: `Level restriction violation: As a ${accreditation.level} student, you are not authorized to vote in the ${election.title} (${election.scope}).`,
      };
    }

    // 3. Prevent duplicate vote for this election
    const votedElections = accreditation.votedElections || [];
    if (votedElections.includes(election.id) || (election.scope === 'ALL' && accreditation.hasVoted)) {
      return {
        success: false,
        message: `You have already cast your ballot for ${election.title}. Voting is strictly single-use only.`,
      };
    }

    const positionsToVote = Object.keys(params.selections);
    if (positionsToVote.length === 0) {
      return {
        success: false,
        message: 'No candidates selected. Please make your selections before submitting.',
      };
    }

    const timestamp = new Date().toISOString();
    const ballotHash = `BLT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const newVotes: VoteRecord[] = [];
    for (const [posId, conId] of Object.entries(params.selections)) {
      if (!conId) continue;
      newVotes.push({
        id: `vt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        electionId: election.id,
        voterIdCode: cleanCode,
        positionId: posId,
        contestantId: conId,
        timestamp,
        ballotHash,
      });
    }

    this.votes.push(...newVotes);
    this.saveVotes();

    newVotes.forEach((v) => {
      SupabaseElectionService.recordBallot(v).catch((err) =>
        console.warn('[Supabase ballot sync warning]', err)
      );
    });

    // Update accreditation record
    if (!accreditation.votedElections) accreditation.votedElections = [];
    accreditation.votedElections.push(election.id);
    accreditation.hasVoted = true;
    accreditation.votedAt = timestamp;
    this.accreditations.set(cleanCode, accreditation);
    this.saveAccreditations();

    SupabaseElectionService.recordAccreditation(accreditation).catch((err) =>
      console.warn('[Supabase accreditation update warning]', err)
    );

    this.logAction(
      `Voter [${cleanCode.slice(0, 7)}***] (${accreditation.level})`,
      'student',
      'BALLOT_CAST',
      `Ballot cast for ${election.title} across ${newVotes.length} positions. Hash: ${ballotHash}`
    );

    return {
      success: true,
      message: `Your official ballot for ${election.title} has been cast and cryptographically sealed.`,
      ballotReceipt: {
        voterIdCode: cleanCode,
        electionTitle: election.title,
        timestamp,
        positionsVoted: newVotes.length,
        ballotHash,
      },
    };
  }

  // --- Tallies & Real-Time Results ---
  public getTallies(role: UserRole, electionId?: string): VoteTally[] | null {
    if (!this.config.isRatified && role !== 'electoral_admin' && role !== 'super_admin') {
      return null;
    }

    const tallies: VoteTally[] = [];
    const targetPositions = this.getPositions(electionId);

    for (const pos of targetPositions) {
      const posVotes = this.votes.filter((v) => v.positionId === pos.id);
      const posContestants = this.contestants.filter((c) => c.positionId === pos.id);
      const total = posVotes.length;

      let maxVotes = -1;
      const contestantResults = posContestants.map((c) => {
        const count = posVotes.filter((v) => v.contestantId === c.id).length;
        if (count > maxVotes) maxVotes = count;
        return {
          contestantId: c.id,
          contestantName: c.name,
          nickname: c.nickname,
          level: c.level,
          photoUrl: c.photoUrl,
          slogan: c.slogan,
          votes: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        };
      });

      const withWinners = contestantResults.map((c) => ({
        ...c,
        isWinner: total > 0 && c.votes === maxVotes && maxVotes > 0,
      }));

      tallies.push({
        electionId: pos.electionId,
        positionId: pos.id,
        positionTitle: pos.title,
        scope: pos.scope,
        totalVotesCast: total,
        contestants: withWinners,
      });
    }

    return tallies;
  }

  public getSummaryStats(): ElectionSummaryStats {
    const totalEligible = this.eligibility.size;
    const totalRegistered = Array.from(this.eligibility.values()).filter((s) => s.isRegistered).length;
    const totalAccredited = this.accreditations.size;
    const totalVoted = Array.from(this.accreditations.values()).filter((a) => a.hasVoted).length;

    const levels: StudentLevel[] = ['100L', '200L', '300L', '400L', '500L'];
    const levelBreakdown: Record<StudentLevel, { eligible: number; registered: number; accredited: number; voted: number }> = {
      '100L': { eligible: 0, registered: 0, accredited: 0, voted: 0 },
      '200L': { eligible: 0, registered: 0, accredited: 0, voted: 0 },
      '300L': { eligible: 0, registered: 0, accredited: 0, voted: 0 },
      '400L': { eligible: 0, registered: 0, accredited: 0, voted: 0 },
      '500L': { eligible: 0, registered: 0, accredited: 0, voted: 0 },
    };

    for (const s of this.eligibility.values()) {
      if (levelBreakdown[s.level]) {
        levelBreakdown[s.level].eligible++;
        if (s.isRegistered) levelBreakdown[s.level].registered++;
      }
    }

    for (const a of this.accreditations.values()) {
      if (levelBreakdown[a.level]) {
        levelBreakdown[a.level].accredited++;
        if (a.hasVoted) levelBreakdown[a.level].voted++;
      }
    }

    return {
      totalEligible,
      totalRegistered,
      totalAccredited,
      totalVoted,
      accreditationTurnoutPct: totalEligible > 0 ? Math.round((totalAccredited / totalEligible) * 100) : 0,
      votingTurnoutPct: totalAccredited > 0 ? Math.round((totalVoted / totalAccredited) * 100) : 0,
      levelBreakdown,
    };
  }

  // --- Official Ratification ---
  public ratifyResults(params: {
    adminName: string;
    role: 'super_admin' | 'electoral_admin';
    notes: string;
    electionId?: string;
  }): { success: boolean; message: string } {
    if (this.config.isRatified) {
      return {
        success: false,
        message: 'Election results have already been ratified.',
      };
    }

    this.config.isRatified = true;
    this.config.ratifiedBy = params.adminName;
    this.config.ratifiedAt = new Date().toISOString();
    this.config.ratificationNotes = params.notes;

    if (params.electionId) {
      this.elections = this.elections.map((e) =>
        e.id === params.electionId
          ? { ...e, isRatified: true, ratifiedBy: params.adminName, ratifiedAt: new Date().toISOString(), ratificationNotes: params.notes }
          : e
      );
      this.saveElections();
    }

    this.saveConfig();

    this.logAction(
      params.adminName,
      params.role,
      'RATIFY_RESULTS',
      `OFFICIAL RATIFICATION: Election results certified and released to public. Notes: "${params.notes}"`
    );

    return {
      success: true,
      message: 'Election results have been officially ratified! Public results portal is now unlocked.',
    };
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  // Reset to seed demo state
  public resetToSeedData(adminName: string) {
    this.elections = [...INITIAL_ELECTIONS];
    this.config = { ...INITIAL_ELECTION_CONFIG };
    this.eligibility.clear();
    for (const s of INITIAL_MASTER_STUDENTS) {
      this.eligibility.set(s.matricNumber.toUpperCase(), { ...s });
    }
    this.accreditations.clear();
    this.matricToVoterId.clear();
    this.positions = [...INITIAL_POSITIONS];
    this.contestants = [...INITIAL_CONTESTANTS];
    this.votes = [];
    this.auditLogs = [
      {
        id: `log-reset-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: adminName,
        role: 'super_admin',
        action: 'SYSTEM_RESET',
        details: 'System restored to official NIMELSSA ABSU seed demonstration state.',
      },
    ];
    this.outboxEmails = [];

    this.saveElections();
    this.saveConfig();
    this.saveEligibility();
    this.saveAccreditations();
    this.savePositions();
    this.saveContestants();
    this.saveVotes();
    this.saveAuditLogs();
    this.saveOutboxEmails();
    this.seedSampleAccreditations();
  }
}

export const electionEngine = new ElectionEngine();
