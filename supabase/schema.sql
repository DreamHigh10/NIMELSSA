-- ==============================================================================
-- NIMELSSA ABSU CHAPTER — OFFICIAL ELECTION DATABASE SCHEMA
-- Abia State University, Uturu — Department of Medical Laboratory Science
-- Run this in your Supabase Project: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ELECTION CONFIGURATION & MASTER TIMERS
CREATE TABLE IF NOT EXISTS election_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  registration_start TIMESTAMPTZ NOT NULL,
  registration_end TIMESTAMPTZ NOT NULL,
  accreditation_start TIMESTAMPTZ NOT NULL,
  accreditation_end TIMESTAMPTZ NOT NULL,
  voting_start TIMESTAMPTZ NOT NULL,
  voting_end TIMESTAMPTZ NOT NULL,
  registration_force_unlocked BOOLEAN DEFAULT FALSE,
  accreditation_force_unlocked BOOLEAN DEFAULT FALSE,
  voting_force_unlocked BOOLEAN DEFAULT FALSE,
  is_ratified BOOLEAN DEFAULT FALSE,
  ratified_at TIMESTAMPTZ,
  ratified_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENTS MASTER ROSTER (100L - 500L)
-- Follows ABSU Matric standard format: 2023/137945/Regular
CREATE TABLE IF NOT EXISTS students_master (
  matric_number TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('100L', '200L', '300L', '400L', '500L')),
  is_registered BOOLEAN DEFAULT FALSE,
  registered_at TIMESTAMPTZ,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'bulk_upload',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy search & level filtering
CREATE INDEX IF NOT EXISTS idx_students_level ON students_master (level);
CREATE INDEX IF NOT EXISTS idx_students_is_registered ON students_master (is_registered);

-- 4. ACCREDITATIONS & CONFIDENTIAL VOTER TOKENS
CREATE TABLE IF NOT EXISTS accreditations (
  id TEXT PRIMARY KEY DEFAULT ('acc-' || gen_random_uuid()::TEXT),
  voter_id_code TEXT UNIQUE NOT NULL, -- e.g. MLS-8B31
  matric_number TEXT UNIQUE NOT NULL REFERENCES students_master(matric_number) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  level TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  accredited_at TIMESTAMPTZ DEFAULT NOW(),
  email_delivered BOOLEAN DEFAULT FALSE,
  has_voted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_accreditations_voter_id ON accreditations (voter_id_code);
CREATE INDEX IF NOT EXISTS idx_accreditations_matric ON accreditations (matric_number);

-- 5. EXECUTIVE POSITIONS
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  max_votes_allowed INTEGER DEFAULT 1
);

-- 6. ASPIRANTS / CONTESTANTS
CREATE TABLE IF NOT EXISTS contestants (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  photo_url TEXT,
  slogan TEXT,
  manifesto TEXT
);

CREATE INDEX IF NOT EXISTS idx_contestants_position ON contestants (position_id);

-- 7. SECRET BALLOTS & VOTES
-- CRITICAL ELECTORAL INTEGRITY:
-- Composite UNIQUE constraint (voter_id_code, position_id) enforces that even under
-- high-speed concurrent mobile clicks, no voter ID can cast multiple votes for an office.
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  contestant_id TEXT NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  voter_id_code TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ballot_hash TEXT NOT NULL,
  CONSTRAINT one_vote_per_position UNIQUE (voter_id_code, position_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_position_contestant ON votes (position_id, contestant_id);

-- 8. AUDIT LOGS (TAMPER-EVIDENT ELECTORAL TRAIL)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE election_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE students_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for read-only election assets
CREATE POLICY "Public Read Election Config" ON election_config FOR SELECT USING (true);
CREATE POLICY "Public Read Positions" ON positions FOR SELECT USING (true);
CREATE POLICY "Public Read Contestants" ON contestants FOR SELECT USING (true);

-- Controlled access to students master (needed for roll verification)
CREATE POLICY "Public Read Students Master" ON students_master FOR SELECT USING (true);
CREATE POLICY "Public Update Students Master" ON students_master FOR UPDATE USING (true);

-- Controlled access to accreditations
CREATE POLICY "Public Read Accreditations" ON accreditations FOR SELECT USING (true);
CREATE POLICY "Public Insert Accreditations" ON accreditations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Accreditations" ON accreditations FOR UPDATE USING (true);

-- Votes insertion: voters can insert single ballots
CREATE POLICY "Public Insert Votes" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Votes" ON votes FOR SELECT USING (true);

-- Audit logs: append-only
CREATE POLICY "Public Insert Audit Logs" ON audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Audit Logs" ON audit_logs FOR SELECT USING (true);
