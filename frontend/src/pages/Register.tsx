import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { Scale, Lock, Mail, User, BookOpen, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface RegisterProps {
  onRegisterSuccess: (token: string, user: any) => void;
}

export default function Register({ onRegisterSuccess }: RegisterProps) {
  const [role, setRole] = useState<'citizen' | 'advocate'>('citizen');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Advocate specific states
  const [barNumber, setBarNumber] = useState('');
  const [practiceAreas, setPracticeAreas] = useState('');
  const [experience, setExperience] = useState('0');
  const [bio, setBio] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const signupMutation = trpc.auth.signup.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const payload: any = {
        name,
        email,
        password,
        role,
      };

      if (role === 'advocate') {
        payload.advocateDetails = {
          barCouncilNumber: barNumber,
          practiceAreas,
          experienceYears: Number(experience) || 0,
          bio,
        };
      }

      const response = await signupMutation.mutateAsync(payload);
      onRegisterSuccess(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check details and try again.');
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-white tracking-wide">
          <Scale size={28} className="text-indigo-400" />
          Themis
        </Link>
        <h2 className="text-3xl font-extrabold text-white">Create an account</h2>
        <p className="text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-4 border border-slate-800 shadow-2xl sm:rounded-3xl sm:px-10">
          {/* Role selection tab */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl mb-8">
            <button
              type="button"
              onClick={() => setRole('citizen')}
              className={`py-3 text-sm font-semibold rounded-xl transition-all ${
                role === 'citizen'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              I am a Citizen
            </button>
            <button
              type="button"
              onClick={() => setRole('advocate')}
              className={`py-3 text-sm font-semibold rounded-xl transition-all ${
                role === 'advocate'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              I am an Advocate
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle size={18} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Full Name</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Email Address</label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Advocate specific details form */}
            {role === 'advocate' && (
              <div className="space-y-4 border-t border-slate-800/80 pt-5 mt-5 animate-fadeIn">
                <h3 className="text-md font-bold text-amber-400">Bar Council Practice Credentials</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">Bar Council ID / Certificate Number</label>
                    <div className="mt-1.5 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Scale size={18} />
                      </div>
                      <input
                        type="text"
                        required={role === 'advocate'}
                        value={barNumber}
                        onChange={(e) => setBarNumber(e.target.value)}
                        placeholder="e.g. D/1245/2018"
                        className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">Years of Experience</label>
                    <div className="mt-1.5 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Clock size={18} />
                      </div>
                      <input
                        type="number"
                        min="0"
                        required={role === 'advocate'}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Practice Areas</label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <BookOpen size={18} />
                    </div>
                    <input
                      type="text"
                      required={role === 'advocate'}
                      value={practiceAreas}
                      onChange={(e) => setPracticeAreas(e.target.value)}
                      placeholder="e.g. Criminal Law, Consumer Protection, Labor Court"
                      className="block w-full pl-10 pr-3 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Short Bio / Professional Details</label>
                  <textarea
                    required={role === 'advocate'}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Describe your legal practice, credentials, and representation style..."
                    className="block w-full mt-1.5 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={signupMutation.isLoading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-55"
              >
                {signupMutation.isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
