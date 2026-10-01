/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CountdownWidget } from './components/CountdownWidget';
import { PortalHome } from './components/PortalHome';
import { StudentRegistration } from './components/StudentRegistration';
import { VoterAccreditation } from './components/VoterAccreditation';
import { VotingBallot } from './components/VotingBallot';
import { PublicResults } from './components/PublicResults';
import { AdminPortal } from './components/AdminPortal';
import { DemoHelperModal } from './components/DemoHelperModal';
import { EmailOutboxModal } from './components/EmailOutboxModal';
import { electionEngine } from './services/electionEngine';
import { UserRole, StudentLevel } from './types/election';
import { Home, UserPlus, KeyRound, Vote, Award, ShieldCheck } from 'lucide-react';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'accredit' | 'vote' | 'results' | 'admin'>('home');

  // Engine state subscriptions
  const [config, setConfig] = useState(electionEngine.getConfig());
  const [elections, setElections] = useState(electionEngine.getElections());
  const [positions, setPositions] = useState(electionEngine.getPositions());
  const [contestants, setContestants] = useState(electionEngine.getContestants());
  const [eligibleStudents, setEligibleStudents] = useState(electionEngine.getAllEligibleStudents());
  const [accreditations, setAccreditations] = useState(electionEngine.getAllAccreditations());
  const [auditLogs, setAuditLogs] = useState(electionEngine.getAuditLogs());
  const [summaryStats, setSummaryStats] = useState(electionEngine.getSummaryStats());
  const [tallies, setTallies] = useState(electionEngine.getTallies(userRole));
  const [outboxEmails, setOutboxEmails] = useState(electionEngine.getOutboxEmails());

  // Modals state
  const [isDemoHelperOpen, setIsDemoHelperOpen] = useState(false);
  const [isEmailOutboxOpen, setIsEmailOutboxOpen] = useState(false);

  // Workflow Hand-offs & initial values
  const [pendingMatricForRegistration, setPendingMatricForRegistration] = useState<string>('');
  const [pendingLevelForRegistration, setPendingLevelForRegistration] = useState<StudentLevel>('300L');
  const [pendingNameForRegistration, setPendingNameForRegistration] = useState<string>('');

  const [pendingMatricForAccreditation, setPendingMatricForAccreditation] = useState<string>('');
  const [pendingVoterCodeForBooth, setPendingVoterCodeForBooth] = useState<string>('');

  // Subscribe to live updates
  useEffect(() => {
    const unsubscribe = electionEngine.subscribe(() => {
      setConfig(electionEngine.getConfig());
      setElections(electionEngine.getElections());
      setPositions(electionEngine.getPositions());
      setContestants(electionEngine.getContestants());
      setEligibleStudents(electionEngine.getAllEligibleStudents());
      setAccreditations(electionEngine.getAllAccreditations());
      setAuditLogs(electionEngine.getAuditLogs());
      setSummaryStats(electionEngine.getSummaryStats());
      setTallies(electionEngine.getTallies(userRole));
      setOutboxEmails(electionEngine.getOutboxEmails());
    });

    return () => unsubscribe();
  }, [userRole]);

  useEffect(() => {
    setTallies(electionEngine.getTallies(userRole));
  }, [userRole]);

  const handleProceedToAccreditation = (matricNumber: string) => {
    setPendingMatricForAccreditation(matricNumber);
    setActiveTab('accredit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToVote = (voterIdCode: string) => {
    setPendingVoterCodeForBooth(voterIdCode);
    setActiveTab('vote');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStudentForReg = (matric: string, level: string, name: string) => {
    setPendingMatricForRegistration(matric);
    setPendingLevelForRegistration(level as StudentLevel);
    setPendingNameForRegistration(name);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStudentForAccredit = (matric: string) => {
    setPendingMatricForAccreditation(matric);
    setActiveTab('accredit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVoterCodeForVote = (code: string) => {
    setPendingVoterCodeForBooth(code);
    setActiveTab('vote');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'register' as const, label: 'Register', icon: UserPlus },
    { id: 'accredit' as const, label: 'Accredit', icon: KeyRound },
    { id: 'vote' as const, label: 'Vote', icon: Vote },
    { id: 'results' as const, label: 'Results', icon: Award },
    { id: 'admin' as const, label: 'Admin', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans pb-24 sm:pb-12">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        config={config}
        onOpenOutbox={() => setIsEmailOutboxOpen(true)}
        onOpenDemoHelper={() => setIsDemoHelperOpen(true)}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Compact App Countdown Bar */}
        {activeTab !== 'admin' && (
          <CountdownWidget config={config} />
        )}

        {/* Dynamic App Tab Screens */}
        {activeTab === 'home' && (
          <PortalHome
            config={config}
            summaryStats={summaryStats}
            userRole={userRole}
            elections={elections}
            onNavigate={setActiveTab}
            onSelectStudentForReg={handleSelectStudentForReg}
            onSelectStudentForAccredit={handleSelectStudentForAccredit}
            onSelectVoterCodeForVote={handleSelectVoterCodeForVote}
            onOpenDemoHelper={() => setIsDemoHelperOpen(true)}
          />
        )}

        {activeTab === 'register' && (
          <StudentRegistration
            elections={elections}
            onProceedToAccreditation={handleProceedToAccreditation}
            initialMatric={pendingMatricForRegistration}
            initialLevel={pendingLevelForRegistration}
            initialName={pendingNameForRegistration}
          />
        )}

        {activeTab === 'accredit' && (
          <VoterAccreditation
            config={config}
            initialMatric={pendingMatricForAccreditation}
            onProceedToVote={handleProceedToVote}
            onOpenOutbox={() => setIsEmailOutboxOpen(true)}
          />
        )}

        {activeTab === 'vote' && (
          <VotingBallot
            config={config}
            elections={elections}
            positions={positions}
            contestants={contestants}
            initialVoterCode={pendingVoterCodeForBooth}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}

        {activeTab === 'results' && (
          <PublicResults
            config={config}
            tallies={tallies}
            onNavigateToAdmin={() => {
              setUserRole('electoral_admin');
              setActiveTab('admin');
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal
            userRole={userRole}
            config={config}
            elections={elections}
            positions={positions}
            contestants={contestants}
            eligibleStudents={eligibleStudents}
            accreditations={accreditations}
            auditLogs={auditLogs}
            summaryStats={summaryStats}
            tallies={electionEngine.getTallies(userRole) || []}
            onOpenOutbox={() => setIsEmailOutboxOpen(true)}
          />
        )}
      </main>

      {/* Floating Modern App Bottom Navigation Bar */}
      <nav className="fixed bottom-3 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto bg-slate-950/95 backdrop-blur-xl text-white rounded-3xl p-1.5 shadow-2xl border border-white/10 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`app-button flex-1 py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Helper Modals */}
      <DemoHelperModal
        isOpen={isDemoHelperOpen}
        onClose={() => setIsDemoHelperOpen(false)}
        eligibleStudents={eligibleStudents}
        accreditedRecords={accreditations}
        onSelectRegisterMatric={handleSelectStudentForReg}
        onSelectAccreditMatric={handleSelectStudentForAccredit}
        onSelectVoterCode={handleSelectVoterCodeForVote}
      />

      <EmailOutboxModal
        isOpen={isEmailOutboxOpen}
        onClose={() => setIsEmailOutboxOpen(false)}
        emails={outboxEmails}
      />
    </div>
  );
}
