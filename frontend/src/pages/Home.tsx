import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import {
  Scale, Search, ArrowRight, UserCheck,
  Lock, Mail, User, AlertTriangle, Loader2
} from 'lucide-react';

interface HomeProps {
  auth: {
    token: string | null;
    user: any;
    isAuthenticated: boolean;
    login: (token: string, user: any) => void;
    logout: () => void;
  };
}

export default function Home({ auth }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form states
  const [regRole, setRegRole] = useState<'citizen' | 'advocate'>('citizen');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [barNumber, setBarNumber] = useState('');
  const [practiceAreas, setPracticeAreas] = useState('');
  const [experience, setExperience] = useState('0');
  const [bio, setBio] = useState('');
  const [regError, setRegError] = useState('');

  // Mutations
  const loginMutation = trpc.auth.login.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      });
      auth.login(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      };

      if (regRole === 'advocate') {
        payload.advocateDetails = {
          barCouncilNumber: barNumber,
          practiceAreas,
          experienceYears: Number(experience) || 0,
          bio,
        };
      }

      const response = await signupMutation.mutateAsync(payload);
      auth.login(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 md:px-8 py-10 overflow-hidden">
      {/* Dynamic Blurred Background Shapes */}
      <div className="absolute top-10 left-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Left Column: Title, Slogan, and Search */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Scale size={14} /> Digital Legal Aid Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Themis
          </h1>
          <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300 bg-clip-text text-transparent mt-1">
            Simplifying Justice, One Step at a Time
          </p>

          <p className="text-slate-400 text-sm sm:text-base font-light max-w-xl leading-relaxed">
            A secure repository and automation wizard that helps citizens draft complaints, view bare acts, take guided assessments, and track active litigation files with certified advocates.
          </p>

          {/* Legal Search Bar */}
          <div className="max-w-xl relative pt-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 pt-4 flex items-center pointer-events-none text-slate-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search bare acts & laws (e.g. Consumer Protection, RTI)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs shadow-xl"
            />
            <Link
              to={`/search?q=${encodeURIComponent(searchQuery)}`}
              className="absolute right-1.5 top-[19px] px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs"
            >
              Search
            </Link>
          </div>
        </div>

        {/* Right Column: Tabbed Auth forms or Welcome dashboard card */}
        <div className="lg:col-span-5 w-full">
          {auth.isAuthenticated ? (
            /* Welcome / Dashboard Direct Link Card */
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <UserCheck size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Welcome back, {auth.user?.name}!</h3>
                <p className="text-xs text-slate-400">
                  You are signed in as a <span className="capitalize text-indigo-400 font-semibold">{auth.user?.role}</span>.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <Link
                  to="/dashboard"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  Go to Workspace <ArrowRight size={14} />
                </Link>
                <button
                  onClick={auth.logout}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs font-semibold transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            /* Sign In / Sign Up Forms Switcher Card */
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6 animate-fadeIn">
              
              {/* Custom Tabs */}
              <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800/80 rounded-2xl">
                <button
                  onClick={() => { setActiveTab('login'); setLoginError(''); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab('register'); setRegError(''); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form Views */}
              {activeTab === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-300">Access Your Case Workspace</h3>

                  {loginError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="amal@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginMutation.isLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-55 flex items-center justify-center"
                  >
                    {loginMutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Sign In'}
                  </button>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegister} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  <h3 className="text-sm font-bold text-slate-300">Create New Account</h3>

                  {regError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                      <AlertTriangle size={15} className="flex-shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {/* Citizen vs Advocate Selector */}
                  <div className="grid grid-cols-2 p-1 bg-slate-950/50 border border-slate-800/60 rounded-xl mb-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('citizen')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        regRole === 'citizen' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/20' : 'text-slate-500'
                      }`}
                    >
                      Citizen
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('advocate')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        regRole === 'advocate' ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/20' : 'text-slate-500'
                      }`}
                    >
                      Advocate
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-500" size={16} />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Amal"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="amal@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Advocate Credentials details */}
                  {regRole === 'advocate' && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-fadeIn">
                      <h4 className="text-xs font-bold text-amber-400">Bar Credentials</h4>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Bar Council ID</label>
                        <input
                          type="text"
                          required
                          value={barNumber}
                          onChange={(e) => setBarNumber(e.target.value)}
                          placeholder="e.g. K/124/2020"
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Experience (Years)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Practice Areas</label>
                        <input
                          type="text"
                          required
                          value={practiceAreas}
                          onChange={(e) => setPracticeAreas(e.target.value)}
                          placeholder="Consumer Law, Civil Disputes"
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Short Bio</label>
                        <textarea
                          required
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={2}
                          placeholder="Brief description..."
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={signupMutation.isLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-55 flex items-center justify-center mt-2"
                  >
                    {signupMutation.isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Create Account'}
                  </button>
                </form>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
