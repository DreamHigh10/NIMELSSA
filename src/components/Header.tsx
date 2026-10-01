import React, { useState } from 'react';
import {
  Vote,
  ShieldCheck,
  UserCheck,
  Award,
  Settings,
  Mail,
  ChevronDown,
  Sparkles,
  Search,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { UserRole, ElectionConfig } from '../types/election';

interface Props {
  activeTab: 'home' | 'register' | 'accredit' | 'vote' | 'results' | 'admin';
  setActiveTab: (tab: 'home' | 'register' | 'accredit' | 'vote' | 'results' | 'admin') => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  config: ElectionConfig;
  onOpenOutbox: () => void;
  onOpenDemoHelper: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  config,
  onOpenOutbox,
  onOpenDemoHelper,
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* App Brand & Logo */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer select-none group app-button"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition duration-150">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 font-heading">
                  NIMELSSA
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 font-mono">
                  ABSU
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Election App
              </p>
            </div>
          </div>

          {/* Quick Actions & Role Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDemoHelper}
              className="app-button inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200/70 shadow-2xs cursor-pointer"
              title="Quick sample matric numbers"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Demo Quick-Fill</span>
              <span className="sm:hidden">Fill</span>
            </button>

            <button
              onClick={onOpenOutbox}
              className="app-button inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              title="Simulated Email Outbox"
            >
              <Mail className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Outbox</span>
            </button>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="app-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse-beacon" />
                <span className="hidden sm:inline">
                  {userRole === 'super_admin'
                    ? 'Super Admin'
                    : userRole === 'electoral_admin'
                    ? 'Admin'
                    : 'Voter'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isRoleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                    Select Mode
                  </div>
                  <button
                    onClick={() => {
                      setUserRole('student');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium flex items-center gap-2 cursor-pointer transition ${
                      userRole === 'student' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Student / Voter</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserRole('electoral_admin');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium flex items-center gap-2 cursor-pointer transition ${
                      userRole === 'electoral_admin' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Electoral Admin</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserRole('super_admin');
                      setIsRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl font-medium flex items-center gap-2 cursor-pointer transition ${
                      userRole === 'super_admin' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <span>Super Admin (HOD)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
