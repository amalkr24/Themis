import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import { Scale, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const loginMutation = trpc.auth.login.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await loginMutation.mutateAsync({ email, password });
      onLoginSuccess(response.token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative bg-[#edf0f5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center space-y-3">
        <Link to="/" className="inline-flex items-center gap-2.5 text-2xl font-black text-[#0f172a] tracking-tight group">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_rgba(0,0,0,0.18),-2px_-2px_6px_rgba(255,255,255,0.9)] group-hover:scale-105 transition-transform">
            <Scale size={22} />
          </div>
          <span>Themis</span>
        </Link>
        <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Welcome back</h2>
        <p className="text-xs md:text-sm text-slate-500 font-semibold">
          Don't have an account?{' '}
          <Link to="/register" className="font-extrabold text-black hover:underline transition-colors">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="neo-card py-8 px-6 sm:px-10 shadow-xl space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3.5 rounded-xl neo-inset text-rose-600 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 neo-inset rounded-xl text-[#0f172a] placeholder-slate-400 focus:outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full flex justify-center py-3.5 px-4 neo-btn-black rounded-xl text-xs font-extrabold transition-all disabled:opacity-55"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  'Sign In to Workspace'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
