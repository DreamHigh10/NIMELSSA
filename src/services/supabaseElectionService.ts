import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StudentEligibility, AccreditationRecord, VoteRecord, VoteTally, Position } from '../types/election';

export class SupabaseElectionService {
  public static isConnected(): boolean {
    return isSupabaseConfigured() && supabase !== null;
  }

  // Push master student list to Supabase students_master table
  public static async pushStudents(students: StudentEligibility[]): Promise<{ count: number; error?: string }> {
    if (!this.isConnected() || !supabase) {
      return { count: 0, error: 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.' };
    }

    try {
      const records = students.map((s) => ({
        matric_number: s.matricNumber,
        full_name: s.fullName,
        level: s.level,
        is_registered: s.isRegistered,
        registered_at: s.registeredAt || null,
        phone: s.phone || null,
        email: s.email || null,
        source: s.source || 'bulk_upload',
      }));

      const { data, error } = await supabase
        .from('students_master')
        .upsert(records, { onConflict: 'matric_number' })
        .select();

      if (error) throw error;
      return { count: data?.length || records.length };
    } catch (err: any) {
      console.error('[Supabase pushStudents error]', err);
      return { count: 0, error: err.message || 'Failed to sync students to Supabase' };
    }
  }

  // Pull students from Supabase
  public static async fetchStudents(): Promise<StudentEligibility[] | null> {
    if (!this.isConnected() || !supabase) return null;

    try {
      const { data, error } = await supabase.from('students_master').select('*');
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: `mat-${row.matric_number.replace(/\W/g, '')}`,
        matricNumber: row.matric_number,
        fullName: row.full_name,
        level: row.level,
        isRegistered: Boolean(row.is_registered),
        registeredAt: row.registered_at,
        addedAt: row.created_at || new Date().toISOString(),
        phone: row.phone,
        email: row.email,
        source: row.source,
      }));
    } catch (err) {
      console.warn('[Supabase fetchStudents warning]', err);
      return null;
    }
  }

  // Record accreditation in Supabase
  public static async recordAccreditation(acc: AccreditationRecord): Promise<boolean> {
    if (!this.isConnected() || !supabase) return false;

    try {
      const { error } = await supabase.from('accreditations').upsert({
        id: acc.id,
        voter_id_code: acc.voterIdCode,
        matric_number: acc.matricNumber,
        student_name: acc.studentName,
        level: acc.level,
        phone: acc.phone,
        email: acc.email,
        accredited_at: acc.accreditedAt,
        email_delivered: acc.emailDelivered,
        has_voted: acc.hasVoted,
      }, { onConflict: 'voter_id_code' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase recordAccreditation warning]', err);
      return false;
    }
  }

  // Submit cast ballot to Supabase with unique constraint protection
  public static async recordBallot(vote: VoteRecord): Promise<boolean> {
    if (!this.isConnected() || !supabase) return false;

    try {
      const { error } = await supabase.from('votes').insert({
        position_id: vote.positionId,
        contestant_id: vote.contestantId,
        voter_id_code: vote.voterIdCode,
        timestamp: vote.timestamp,
        ballot_hash: vote.ballotHash,
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Supabase recordBallot warning]', err);
      return false;
    }
  }
}
